import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TARGET_SIZE, WATER_PLANT_GLB_FILES, SCENE_CONFIG } from '../shared/constants';
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

export interface PickOptions {
  /** 选中对象变化回调（对象名，空表示取消选中） */
  onSelect?: (modelId: string | null) => void;
  /** 模型加载完成回调 */
  onReady?: () => void;
  /** 模型加载失败回调 */
  onError?: (message: string) => void;
}

/**
 * 巡检对象"配置视角"专用 3D 场景：
 * - 加载与巡检场景相同的内部 GLB 模型（不含外墙），归一化参数一致
 * - OrbitControls 自由观察（左键旋转 / 右键平移 / 滚轮缩放）
 * - 点击模型中的任意物体 → BoxHelper 高亮选中 + 自动计算最佳机位并平滑飞行（聚焦）
 * - 点击空白处取消选中；鼠标悬停物体显示手型
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
  private lastTime = performance.now() / 1000;
  /** 自动聚焦飞行动画状态 */
  private flyActive = false;
  private flyTime = 0;
  private flyDuration = 0;
  private readonly flyFromPos = new THREE.Vector3();
  private readonly flyToPos = new THREE.Vector3();
  private readonly flyFromTarget = new THREE.Vector3();
  private readonly flyToTarget = new THREE.Vector3();
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
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 80;
    this.controls.maxDistance = 4000;
    this.controls.maxPolarAngle = Math.PI * 0.9;
    addSceneLights(this.scene);
    addSceneEnvironment(this.scene, this.renderer);
    this.scene.add(this.modelRoot);
    this.bindEvents();
    this.resize();
    this.renderer.setAnimationLoop(this.animate);
    this.loadModel();
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
      this.flyActive = false;
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
    this.renderer.setAnimationLoop(null);
    const canvas = this.renderer.domElement;
    canvas.removeEventListener('pointerdown', this.handlePointerDown);
    canvas.removeEventListener('pointerup', this.handlePointerUp);
    canvas.removeEventListener('click', this.handleClick);
    canvas.removeEventListener('mousemove', this.handleMouseMove);
    this.clearHighlight();
    disposeObject(this.scene);
    if (this.scene.background instanceof THREE.Texture) this.scene.background.dispose();
    this.scene.background = null;
    if (this.scene.environment instanceof THREE.Texture) this.scene.environment.dispose();
    this.scene.environment = null;
    this.scene.fog = null;
    this.renderer.renderLists.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    canvas.remove();
    this.scene.clear();
    this.controls.dispose();
  }

  // ---------------- 模型加载（仅内部设备，去掉外墙） ----------------

  private loadModel() {
    const url = new URL(`GLB/${WATER_PLANT_GLB_FILES.INTERIOR}`, window.location.href).href;
    new GLTFLoader().load(
      url,
      (gltf) => {
        if (this.disposed) return;
        const group = gltf.scene;
        group.name = 'glb-interior';
        group.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            object.castShadow = true;
            object.receiveShadow = true;
          }
        });
        this.modelRoot.add(group);
        this.tryModelReady();
      },
      undefined,
      (error) => {
        const detail =
          error && typeof error === 'object' && 'message' in error
            ? String((error as { message?: unknown }).message)
            : String(error);
        this.onError?.(detail || '未知错误');
      }
    );
  }

  /** 模型加载后统一归一化：缩放到 TARGET_SIZE、水平居中、底面贴到 y=0（与巡检场景一致） */
  private tryModelReady() {
    if (this.modelReady) return;
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
    if (Math.hypot(dx, dy) > 5) this.dragging = true;
  };

  private readonly handleClick = (event: MouseEvent) => {
    if (this.dragging) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.modelRoot.children, true);
    for (const hit of hits) {
      if (!isVisible(hit.object)) continue;
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
      if (isVisible(hit.object) && this.findPickableRoot(hit.object)) {
        hover = true;
        break;
      }
    }
    this.renderer.domElement.style.cursor = hover ? 'pointer' : 'grab';
  };

  /** 向上遍历找到最近的有名字的节点作为选中目标（模型任意物体均可选中） */
  private findPickableRoot(object: THREE.Object3D): THREE.Object3D | null {
    let node: THREE.Object3D | null = object;
    while (node && node !== this.modelRoot) {
      // 跳过无名字的子 mesh 和 'glb-interior' 容器组，取最近的有名字的构件
      if (node.name && node.name !== 'glb-interior') return node;
      node = node.parent;
    }
    return null;
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
    const distance = maxDim * 2.2;
    const offset = new THREE.Vector3(1, 0.8, 1).normalize().multiplyScalar(distance);
    return {
      modelId: target.name,
      position: center.clone().add(offset).toArray().map(round2),
      target: center.toArray().map(round2),
    };
  }

  // ---------------- 飞行动画 ----------------

  private flyToViewpoint(viewpoint: ViewpointPos) {
    this.flyFromPos.copy(this.camera.position);
    this.flyFromTarget.copy(this.controls.target);
    this.flyToPos.set(viewpoint.position[0], viewpoint.position[1], viewpoint.position[2]);
    this.flyToTarget.set(viewpoint.target[0], viewpoint.target[1], viewpoint.target[2]);
    this.flyActive = true;
    this.flyTime = 0;
    this.flyDuration = 0.8;
  }

  private updateFly(delta: number) {
    if (!this.flyActive) return;
    this.flyTime += delta;
    const t = Math.min(1, this.flyTime / this.flyDuration);
    // power2.inOut 缓动
    const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    this.camera.position.lerpVectors(this.flyFromPos, this.flyToPos, ease);
    this.controls.target.lerpVectors(this.flyFromTarget, this.flyToTarget, ease);
    if (t >= 1) this.flyActive = false;
  }

  // ---------------- 渲染循环 ----------------

  private readonly animate = () => {
    if (this.disposed) return;
    const now = performance.now() / 1000;
    const delta = Math.min(0.1, now - this.lastTime);
    this.lastTime = now;
    this.updateFly(delta);
    this.controls.update();
    // BoxHelper 自动跟随目标对象更新
    this.highlightBox?.update();
    this.renderer.render(this.scene, this.camera);
  };
}
