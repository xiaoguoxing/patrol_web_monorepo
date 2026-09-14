import * as THREE from 'three';
import { gsap } from 'gsap';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  TARGET_SIZE,
  SCENE_CONFIG,
  WATER_PLANT_MODELS as MODELS,
  VIEWPOINT_PICKER_CONFIG,
  type WaterPlantModelSource as ModelSource,
} from '../shared/constants';
import { addSceneLights, addSceneEnvironment } from '../shared/environment';
import { round2, isVisible, disposeObject } from '../shared/utils';

/** 视角坐标数据（与巡检场景坐标系一致） */
export interface ViewpointPos {
  /** 相机位置 [x, y, z] */
  position: number[];
  /** 相机注视点 [x, y, z] */
  target: number[];
  /** 视野角度（默认 45） */
  fov?: number;
  /** 相机到注视点的距离（辅助校验） */
  distance?: number;
}

/** 保存的视角数据 */
export interface ViewpointData extends ViewpointPos {
  /** 模型节点名（GLB 内的对象名，如 Line009 / Rectangle008） */
  modelId: string;
}

/** 外立面显示模式：show 完整显示 / transparent 半透明透视（默认） / hidden 隐藏 */
export type FacadeMode = 'show' | 'transparent' | 'hidden';

export interface PickOptions {
  /** 选中对象变化回调（对象名，空表示取消选中） */
  onSelect?: (modelId: string | null) => void;
  /** 模型加载完成回调 */
  onReady?: () => void;
  /** 模型加载失败回调 */
  onError?: (message: string) => void;
  /** 外立面初始显示模式（默认 transparent，与巡检场景一致） */
  facadeMode?: FacadeMode;
}

/**
 * 巡检对象"配置视角"专用 3D 场景：
 * - 加载与巡检场景相同的外立面 + 内部结构 GLB，归一化参数一致，支持外立面 显示/透视/隐藏
 * - OrbitControls 自由观察（左键旋转 / 右键平移 / 滚轮缩放）
 * - 点击内部结构中的任意物体 → BoxHelper 高亮选中 + 自动计算最佳机位并平滑飞行（聚焦）
 * - 外立面构件不可选中（点击外墙时会穿透选择其背后的内部设备）
 * - 点击空白处取消选中；鼠标悬停内部物体显示手型
 */
export class ViewpointPicker {
  private readonly container: HTMLElement;
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly controls: OrbitControls;
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2();
  private readonly modelRoot = new THREE.Group();
  private selected: THREE.Object3D | null = null;
  /** BoxHelper 高亮边框（不修改 mesh 材质，避免材质替换 bug） */
  private highlightBox: THREE.BoxHelper | null = null;
  private disposed = false;
  private modelReady = false;
  /** 外立面显示模式（默认半透明透视，与巡检场景一致） */
  private facadeMode: FacadeMode = 'transparent';
  /** 自动聚焦运镜 timeline（重复聚焦 / dispose 时打断） */
  private flightTween: gsap.core.Timeline | null = null;
  /** 拖拽判定：记录按下位置，位移过小视为点击 */
  private downPos = { x: 0, y: 0 };
  private dragging = false;

  /** 选中对象变化回调（对象名，空表示取消选中） */
  onSelect?: (modelId: string | null) => void;
  /** 模型加载完成回调 */
  onReady?: () => void;
  /** 模型加载失败回调 */
  onError?: (message: string) => void;

  constructor(container: HTMLElement, options: PickOptions = {}) {
    this.container = container;
    this.onSelect = options.onSelect;
    this.onReady = options.onReady;
    this.onError = options.onError;
    this.facadeMode = options.facadeMode ?? 'transparent';
    this.camera = new THREE.PerspectiveCamera(46, 1, SCENE_CONFIG.cameraNear, SCENE_CONFIG.cameraFar);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ReinhardToneMapping;
    this.renderer.toneMappingExposure = 1.8;
    this.renderer.domElement.className = 'vp-picker__canvas';
    container.appendChild(this.renderer.domElement);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = VIEWPOINT_PICKER_CONFIG.DAMPING_FACTOR;
    // 拉近下限取较小值：配置视角允许贴近设备细节观察（近裁剪面 1，可安全近距离查看）
    this.controls.minDistance = VIEWPOINT_PICKER_CONFIG.MIN_DISTANCE;
    this.controls.maxDistance = VIEWPOINT_PICKER_CONFIG.MAX_DISTANCE;
    this.controls.maxPolarAngle = VIEWPOINT_PICKER_CONFIG.MAX_POLAR_ANGLE;
    addSceneLights(this.scene);
    addSceneEnvironment(this.scene, this.renderer);
    this.scene.add(this.modelRoot);
    this.bindEvents();
    this.resize();
    this.renderer.setAnimationLoop(this.animate);
    this.loadModels();
  }

  public resize() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    if (!width || !height) return;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  /** 重置视角：相机对准全部模型 */
  public resetView() {
    if (!this.modelReady) return;
    const box = new THREE.Box3().setFromObject(this.modelRoot);
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    const center = box.getCenter(new THREE.Vector3());
    const fov = THREE.MathUtils.degToRad(this.camera.fov);
    const distance = Math.max(sphere.radius, 1) / Math.sin(fov / 2);
    this.flyToViewpoint({
      position: [
        round2(
          center.x + distance * 1.1 * Math.sin(THREE.MathUtils.degToRad(-55)) * Math.sin(THREE.MathUtils.degToRad(45))
        ),
        round2(center.y + distance * 1.1 * Math.cos(THREE.MathUtils.degToRad(45))),
        round2(
          center.z + distance * 1.1 * Math.sin(THREE.MathUtils.degToRad(45)) * Math.cos(THREE.MathUtils.degToRad(-55))
        ),
      ],
      target: [round2(center.x), round2(center.y), round2(center.z)],
    });
  }

  /**
   * 设置外立面显示模式（三态，逻辑与巡检场景 WaterPlantScene.setFacadeMode 一致）：
   * - show        完整显示（不透明）
   * - transparent 半透明透视（默认，可隐约看到内部设备）
   * - hidden      隐藏（内部设备完全可见，便于点击选中）
   */
  public setFacadeMode(mode: FacadeMode): FacadeMode {
    const facade = this.modelRoot.getObjectByName('glb-facade');
    if (facade) {
      if (mode === 'hidden') {
        facade.visible = false;
      } else {
        facade.visible = true;
        const opacity = mode === 'show' ? 1 : 0.45;
        facade.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            const materials = Array.isArray(object.material) ? object.material : [object.material];
            materials.forEach((material) => {
              material.transparent = opacity < 1;
              material.opacity = opacity;
            });
          }
        });
      }
    }
    this.facadeMode = mode;
    return this.facadeMode;
  }

  public getFacadeMode() {
    return this.facadeMode;
  }

  /** 应用已有视角（编辑回显：直接定位相机，无动画） */
  public applyViewpoint(viewpoint: ViewpointData | null | undefined) {
    if (!viewpoint || !Array.isArray(viewpoint.position) || !Array.isArray(viewpoint.target)) return;
    const obj = this.modelRoot.getObjectByName(viewpoint.modelId);
    if (obj) {
      this.selectObject(obj);
    }
    const position = new THREE.Vector3(viewpoint.position[0], viewpoint.position[1], viewpoint.position[2]);
    const lookAt = new THREE.Vector3(viewpoint.target[0], viewpoint.target[1], viewpoint.target[2]);
    if (position.lengthSq() > 0 && lookAt.lengthSq() > 0) {
      this.flightTween?.kill();
      this.flightTween = null;
      this.camera.position.copy(position);
      this.controls.target.copy(lookAt);
      this.controls.update();
    }
    // 编辑回显：若后端存有 fov（如 45），则恢复视野角度
    if (typeof viewpoint.fov === 'number' && viewpoint.fov > 0) {
      this.camera.fov = viewpoint.fov;
      this.camera.updateProjectionMatrix();
    }
  }

  /** 获取当前选中物体的视角数据（未选中返回 null） */
  public getViewpoint(): ViewpointData | null {
    if (!this.selected) return null;
    const position = this.camera.position.clone();
    const target = this.controls.target.clone();
    return {
      modelId: this.selected.name,
      position: position.toArray().map(round2),
      target: target.toArray().map(round2),
      fov: round2(this.camera.fov),
      distance: round2(position.distanceTo(target)),
    };
  }

  /** 聚焦当前选中物体（重新计算最佳机位并飞行） */
  public focusSelected() {
    if (!this.selected) return;
    const viewpoint = this.computeViewpoint(this.selected);
    if (viewpoint) this.flyToViewpoint(viewpoint);
  }

  public dispose() {
    if (this.disposed) return;
    this.disposed = true;

    // 停止渲染循环
    this.renderer.setAnimationLoop(null);

    // 打断进行中的聚焦运镜
    this.flightTween?.kill();
    this.flightTween = null;

    const canvas = this.renderer.domElement;

    // 移除事件监听器（使用 try-catch 防止移除失败阻塞后续清理）
    try {
      canvas.removeEventListener('pointerdown', this.handlePointerDown);
      canvas.removeEventListener('pointerup', this.handlePointerUp);
      canvas.removeEventListener('click', this.handleClick);
      canvas.removeEventListener('mousemove', this.handleMouseMove);
    } catch (error) {
      console.warn('[ViewpointPicker] 事件监听器移除失败:', error);
    }

    // 清理高亮
    try {
      this.clearHighlight();
    } catch (error) {
      console.warn('[ViewpointPicker] 高亮清理失败:', error);
    }

    // 释放 Three.js 资源
    try {
      disposeObject(this.scene);

      if (this.scene.background instanceof THREE.Texture) {
        this.scene.background.dispose();
      }
      this.scene.background = null;

      if (this.scene.environment instanceof THREE.Texture) {
        this.scene.environment.dispose();
      }
      this.scene.environment = null;

      this.scene.fog = null;

      this.renderer.renderLists.dispose();
      this.renderer.dispose();
      this.renderer.forceContextLoss();

      this.scene.clear();
    } catch (error) {
      console.error('[ViewpointPicker] Three.js 资源释放失败:', error);
    }

    // 移除 canvas（使用 try-catch 防止 DOM 操作失败）
    try {
      canvas.remove();
    } catch (error) {
      console.warn('[ViewpointPicker] Canvas 移除失败:', error);
    }

    // 释放 OrbitControls
    try {
      this.controls.dispose();
    } catch (error) {
      console.warn('[ViewpointPicker] OrbitControls 释放失败:', error);
    }
  }

  // ---------------- 模型加载（外立面 + 内部结构，与巡检场景一致） ----------------

  private loadModels() {
    MODELS.forEach((model) => this.loadModel(model));
  }

  private loadModel(model: ModelSource) {
    // 项目使用 hash 路由且 vite base 为 './'，基于当前地址解析即可兼容开发与部署子路径
    const url = new URL(`GLB/${model.file}`, window.location.href).href;
    new GLTFLoader().load(
      url,
      (gltf) => {
        if (this.disposed) return;
        const group = this.normalizeModel(gltf.scene, model.facade);
        group.name = `glb-${model.key}`;
        this.modelRoot.add(group);
        const allLoaded = MODELS.every((item) => this.modelRoot.getObjectByName(`glb-${item.key}`) != null);
        if (allLoaded) this.onModelsReady();
      },
      undefined,
      (error) => {
        if (this.disposed) return;
        const detail =
          error && typeof error === 'object' && 'message' in error
            ? String((error as { message?: unknown }).message)
            : String(error);
        console.error(`[ViewpointPicker] 模型 ${model.label} 加载失败:`, detail);
        this.onError?.(detail || '未知错误');
      }
    );
  }

  /** 模型预处理：设置阴影；外立面统一半透明（与巡检场景 normalizeModel 一致），不做缩放/平移 */
  private normalizeModel(root: THREE.Object3D, isFacade: boolean): THREE.Object3D {
    root.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.castShadow = true;
        object.receiveShadow = true;
        if (isFacade) {
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => {
            material.transparent = true;
            material.opacity = 0.45;
            // depthWrite 保持默认 true，避免内部结构因深度排序异常而变暗
            material.side = THREE.DoubleSide;
          });
        }
      }
    });
    return root;
  }

  /**
   * 全部模型加载完成后统一归一化：在 modelRoot 整体上缩放到 TARGET_SIZE、水平居中、底面贴到 y=0。
   * 整体变换不改变内外模型相对位置，保证与巡检场景的视角坐标严格一致。
   */
  private onModelsReady() {
    if (this.modelReady || this.disposed) return;
    this.modelReady = true;
    const box = new THREE.Box3().setFromObject(this.modelRoot);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z, 1e-6);
    const scale = TARGET_SIZE / maxDim;
    this.modelRoot.scale.setScalar(scale);
    this.modelRoot.updateWorldMatrix(true, true);
    const scaledBox = new THREE.Box3().setFromObject(this.modelRoot);
    const center = scaledBox.getCenter(new THREE.Vector3());
    const minY = scaledBox.min.y;
    this.modelRoot.position.set(-center.x, -minY, -center.z);
    // 应用构造时传入的外立面显示模式（默认半透明透视）
    this.setFacadeMode(this.facadeMode);
    this.resetView();
    this.onReady?.();
  }

  // ---------------- 交互：点击拾取 / 悬停 ----------------

  private bindEvents() {
    const canvas = this.renderer.domElement;
    canvas.addEventListener('pointerdown', this.handlePointerDown);
    canvas.addEventListener('pointerup', this.handlePointerUp);
    canvas.addEventListener('click', this.handleClick);
    canvas.addEventListener('mousemove', this.handleMouseMove);
  }

  private readonly handlePointerDown = (event: PointerEvent) => {
    this.downPos = { x: event.clientX, y: event.clientY };
    this.dragging = false;
  };

  private readonly handlePointerUp = (event: PointerEvent) => {
    const dx = event.clientX - this.downPos.x;
    const dy = event.clientY - this.downPos.y;
    if (Math.hypot(dx, dy) > VIEWPOINT_PICKER_CONFIG.DRAG_THRESHOLD) this.dragging = true;
  };

  private readonly handleClick = (event: MouseEvent) => {
    if (this.dragging) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.modelRoot.children, true);
    for (const hit of hits) {
      // 外立面不可作为巡检对象：点击外墙时跳过该命中，继续选中其背后的内部设备
      if (!isVisible(hit.object) || this.isInFacade(hit.object)) continue;
      const target = this.findPickableRoot(hit.object);
      if (target) {
        this.selectObject(target, true);
        return;
      }
    }
    // 点击空白处取消选中
    this.selectObject(null);
  };

  private readonly handleMouseMove = (event: MouseEvent) => {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.modelRoot.children, true);
    let hover = false;
    for (const hit of hits) {
      // 外立面构件悬停时不显示手型（不可选中）
      if (isVisible(hit.object) && !this.isInFacade(hit.object) && this.findPickableRoot(hit.object)) {
        hover = true;
        break;
      }
    }
    this.renderer.domElement.style.cursor = hover ? 'pointer' : 'grab';
  };

  /** 向上遍历找到最近的有名字的内部构件作为选中目标（模型任意内部物体均可选中） */
  private findPickableRoot(object: THREE.Object3D): THREE.Object3D | null {
    let node: THREE.Object3D | null = object;
    while (node && node !== this.modelRoot) {
      // 跳过无名字的子 mesh 与 'glb-interior'/'glb-facade' 容器组，取最近的有名字的构件
      if (node.name && node.name !== 'glb-interior' && node.name !== 'glb-facade') return node;
      node = node.parent;
    }
    return null;
  }

  /** 是否位于外立面（'glb-facade'）子树内：外墙构件不可作为巡检对象 */
  private isInFacade(object: THREE.Object3D): boolean {
    let node: THREE.Object3D | null = object;
    while (node && node !== this.modelRoot) {
      if (node.name === 'glb-facade') return true;
      node = node.parent;
    }
    return false;
  }

  private selectObject(target: THREE.Object3D | null, autoFocus = false) {
    if (this.selected === target) {
      if (autoFocus) this.focusSelected();
      return;
    }
    this.clearHighlight();
    this.selected = target;
    if (target) {
      this.applyHighlight(target);
      if (autoFocus) {
        const viewpoint = this.computeViewpoint(target);
        if (viewpoint) this.flyToViewpoint(viewpoint);
      }
    }
    this.onSelect?.(target?.name ?? null);
  }

  // ---------------- 高亮（BoxHelper，不修改材质） ----------------

  private applyHighlight(target: THREE.Object3D) {
    this.clearHighlight();
    this.highlightBox = new THREE.BoxHelper(target, 0x00d4ff);
    this.scene.add(this.highlightBox);
  }

  private clearHighlight() {
    if (this.highlightBox) {
      this.scene.remove(this.highlightBox);
      // BoxHelper 内部使用 LineSegments，dispose 几何体和材质
      this.highlightBox.traverse((child) => {
        if (child instanceof THREE.LineSegments) {
          child.geometry.dispose();
          const mat = child.material;
          if (Array.isArray(mat)) {
            mat.forEach((m) => m.dispose());
          } else {
            mat.dispose();
          }
        }
      });
      this.highlightBox = null;
    }
  }

  // ---------------- 自动聚焦机位 ----------------

  /** 根据物体包围盒计算最佳观察视角（右前上方 45°，距离 = 最大边长 * 2.2） */
  private computeViewpoint(target: THREE.Object3D): ViewpointData | null {
    const box = new THREE.Box3().setFromObject(target);
    if (box.isEmpty()) return null;
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z, 1e-4);
    const distance = maxDim * VIEWPOINT_PICKER_CONFIG.AUTO_VIEWPOINT_DISTANCE_FACTOR;
    const offset = new THREE.Vector3(...VIEWPOINT_PICKER_CONFIG.AUTO_VIEWPOINT_OFFSET)
      .normalize()
      .multiplyScalar(distance);
    return {
      modelId: target.name,
      position: center.clone().add(offset).toArray().map(round2),
      target: center.toArray().map(round2),
    };
  }

  // ---------------- 飞行动画（GSAP timeline，与巡检场景运镜观感一致） ----------------

  private flyToViewpoint(viewpoint: ViewpointPos) {
    const { FOCUS_FLIGHT_DURATION } = VIEWPOINT_PICKER_CONFIG;
    this.flightTween?.kill();
    // 相机位置与注视点同步缓入缓出（power2.inOut：出发平稳、到位减速滑入）。
    // OrbitControls 每帧 update() 会重读 camera.position/controls.target，
    // 无用户输入时不会覆盖 GSAP 写入的值，并据 target 自动 lookAt，故可直接补间两者
    const tl = gsap.timeline({
      onComplete: () => {
        this.flightTween = null;
      },
    });
    tl.to(
      this.camera.position,
      {
        x: viewpoint.position[0],
        y: viewpoint.position[1],
        z: viewpoint.position[2],
        duration: FOCUS_FLIGHT_DURATION,
        ease: 'power2.inOut',
      },
      0
    );
    tl.to(
      this.controls.target,
      {
        x: viewpoint.target[0],
        y: viewpoint.target[1],
        z: viewpoint.target[2],
        duration: FOCUS_FLIGHT_DURATION,
        ease: 'power2.inOut',
      },
      0
    );
    this.flightTween = tl;
  }

  // ---------------- 渲染循环 ----------------

  private readonly animate = () => {
    if (this.disposed) return;
    this.controls.update();
    // BoxHelper 自动跟随目标对象更新
    this.highlightBox?.update();
    this.renderer.render(this.scene, this.camera);
  };
}
