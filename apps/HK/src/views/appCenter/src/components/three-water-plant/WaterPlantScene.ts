import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { PatrolController } from './patrolController';
import type { WaterPlantSceneCallbacks } from './types';
import {
  TARGET_SIZE,
  PATROL_IDS,
  WATER_PLANT_MODELS as MODELS,
  SCENE_CONFIG,
  type WaterPlantModelKey as ModelKey,
  type WaterPlantModelSource as ModelSource,
} from '../shared/constants';
import { addSceneLights, addSceneEnvironment } from '../shared/environment';
import { disposeObject, isVisible, isObjectOrChildOf } from '../shared/utils';

/**
 * 相机模式（设计文档明确拆分的三套相机）：
 * - orbit  全景浏览：球坐标环绕（左键旋转 / 右键平移 / 滚轮缩放 / 预设视角）
 * - walk   厂房漫游：第一人称，camera.position 即玩家位置，WASD 移动 + 鼠标转动视角
 * - patrol 自动巡检：跟随巡检目标，镜头平滑平移、被遮挡自动拉近
 */
export type CameraMode = 'orbit' | 'walk' | 'patrol';

/** 外立面显示模式：show 显示 / transparent 透视 / hidden 隐藏 */
export type FacadeMode = 'show' | 'transparent' | 'hidden';

interface ModelLoadingState {
  loaded: number;
  total: number;
}

/**
 * 水厂三维模型巡检场景
 * - 展示真实 GLB 模型：外立面 + 内部结构同时加载、一起展示（外立面半透明）
 * - 灯光：太阳光（主方向光）+ 天光/环境光/补光，保证内部结构明亮
 * - 巡检：基于模型 id 列表定位模型节点，依次巡检并高亮
 */
export class WaterPlantScene {
  private readonly container: HTMLElement;
  private readonly callbacks: WaterPlantSceneCallbacks;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(46, 1, SCENE_CONFIG.cameraNear, SCENE_CONFIG.cameraFar);
  private readonly renderer: THREE.WebGLRenderer;
  private readonly viewTarget = new THREE.Vector3();
  /** 跟随模式的平滑相机位置/注视点（避免镜头晃动） */
  private readonly camPos = new THREE.Vector3();
  private readonly camLook = new THREE.Vector3();
  private readonly followPos = new THREE.Vector3();
  /** 遮挡检测：目标 -> 相机的射线与解析出的无遮挡相机位置 */
  private readonly raycaster = new THREE.Raycaster();
  private readonly resolvedCamPos = new THREE.Vector3();
  /** 跟随模式下的观察距离（滚轮可调，默认贴近设备） */
  private followDist = 75;
  private occlusionAccum = 0;
  /** 当前相机模式（默认全景浏览，加载完成后若有巡检对象则切到自动巡检） */
  private cameraMode: CameraMode = 'orbit';
  /** 外立面显示模式（默认半透明透视，兼顾整体观感与内部可见性） */
  private facadeMode: FacadeMode = 'transparent';
  /** walk 漫游：玩家位置（camera.position 即玩家位置） */
  private readonly playerPos = new THREE.Vector3();
  /** walk 漫游：水平朝向 / 俯仰角（弧度） */
  private walkYaw = 0;
  private walkPitch = 0;
  /** walk 漫游人眼高度（世界单位，相对模型归一化尺寸） */
  private readonly walkEyeHeight = 160;
  /** walk 漫游：鼠标转视角灵敏度（弧度/像素） */
  private readonly walkLookSpeed = 0.003;
  /** 视口尺寸（CSS 像素，用于世界坐标 -> 屏幕坐标投影） */
  private readonly viewportRect = { width: 1, height: 1 };
  /** 屏幕投影复用的临时向量 */
  private readonly projPoint = new THREE.Vector3();
  /** 模型整体包围信息（加载完成后缓存，用于预设视角） */
  private readonly modelCenter = new THREE.Vector3();
  private readonly modelSphere = new THREE.Sphere();
  /** 预设视角飞行动画状态（easeOutCubic 插值 theta/phi/radius/viewTarget） */
  private flyActive = false;
  private flyTime = 0;
  private flyDuration = 0;
  private readonly flyFromTarget = new THREE.Vector3();
  private readonly flyToTarget = new THREE.Vector3();
  private flyFromTheta = 0;
  private flyToTheta = 0;
  private flyFromPhi = 0;
  private flyToPhi = 0;
  private flyFromRadius = 0;
  private flyToRadius = 0;
  /** 真实 GLB 模型容器（外立面 + 内部结构） */
  private readonly modelRoot = new THREE.Group();
  private readonly modelLoading = new Map<ModelKey, ModelLoadingState>();
  private readonly glbLoader = new GLTFLoader();
  private patrol: PatrolController | undefined;
  private modelReady = false;
  private lastTime = performance.now() / 1000;
  private theta = -55;
  private phi = 45;
  private radius = 1200;
  private dragging = false;
  private dragButton = 0;
  private lastPointer = { x: 0, y: 0 };
  private disposed = false;
  /** 自由视角键盘行走：当前按下的按键集合（WASD / 方向键 / QE） */
  private readonly keys = new Set<string>();
  /** 自由视角行走速度（世界单位/秒） */
  private readonly walkSpeed = 150;

  constructor(container: HTMLElement, callbacks: WaterPlantSceneCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    // PCFSoftShadowMap 在 r155+ 已弃用，弃用路径会导致 shadow 采样器格式不匹配（地面消失）
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    // 不用 ACESFilmic，改用 Reinhard；曝光 2.0 保证内部明亮同时避免地面过曝发白
    this.renderer.toneMapping = THREE.ReinhardToneMapping;
    this.renderer.toneMappingExposure = 2.0;
    this.renderer.domElement.className = 'three-water-plant__canvas';
    container.appendChild(this.renderer.domElement);
    addSceneLights(this.scene);
    addSceneEnvironment(this.scene, this.renderer);
    this.scene.add(this.modelRoot);
    this.bindEvents();
    this.resize();
    this.renderer.setAnimationLoop(this.animate);
    this.loadRealModels();
  }

  public resize() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    if (!width || !height) return;
    this.viewportRect.width = width;
    this.viewportRect.height = height;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  public advanceToNextTarget() {
    this.patrol?.advanceToNextTarget();
  }

  /** 跳转到指定巡检任务（点击任务列表项时定位对应设备），自动进入自动巡检模式 */
  public jumpToTarget(index: number) {
    if (this.cameraMode !== 'patrol') this.setCameraMode('patrol');
    this.patrol?.jumpToTarget(index);
  }

  /** 全部巡检任务列表（任务标题 = 巡检点位，按巡检顺序） */
  public getPatrolTargets() {
    return this.patrol?.getTargets() ?? [];
  }

  /** 当前巡检任务索引（未开始时为 -1） */
  public getPatrolIndex() {
    return this.patrol?.getCurrentIndex() ?? -1;
  }

  /**
   * 设置外立面显示模式（三态）：
   * - show        完整显示（不透明）
   * - transparent 半透明透视（默认，内部设备隐约可见）
   * - hidden      隐藏（内部设备完全可见）
   */
  public setFacadeMode(mode: FacadeMode) {
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

  /**
   * 切换相机模式（orbit 全景浏览 / walk 厂房漫游 / patrol 自动巡检）。
   * 切换时保持相机位置/朝向连续，避免镜头跳变。
   */
  public setCameraMode(mode: CameraMode) {
    if (mode === this.cameraMode) return this.cameraMode;
    // 切换前结束预设飞行，避免飞行状态残留
    this.flyActive = false;
    if (mode === 'walk') {
      // 从当前相机朝向初始化第一人称朝向
      const dir = new THREE.Vector3();
      this.camera.getWorldDirection(dir);
      this.walkYaw = Math.atan2(-dir.x, -dir.z);
      this.walkPitch = THREE.MathUtils.clamp(Math.asin(THREE.MathUtils.clamp(dir.y, -1, 1)), -0.9, 0.9);
      // 玩家位置 = 当前相机位置（高度会在漫游过程中快速回落到人眼高度）
      this.playerPos.copy(this.camera.position);
    } else if (mode === 'orbit' && this.cameraMode === 'walk') {
      // 从第一人称位置/朝向反推球坐标，保证进入全景浏览后相机连续
      const forward = new THREE.Vector3(-Math.sin(this.walkYaw), 0, -Math.cos(this.walkYaw));
      this.viewTarget.copy(this.playerPos).addScaledVector(forward, 250);
      const dx = this.playerPos.x - this.viewTarget.x;
      const dy = this.playerPos.y - this.viewTarget.y;
      const dz = this.playerPos.z - this.viewTarget.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      this.radius = THREE.MathUtils.clamp(dist, 200, 4000);
      this.phi = THREE.MathUtils.clamp(
        THREE.MathUtils.radToDeg(Math.acos(THREE.MathUtils.clamp(dy / Math.max(dist, 1e-6), -1, 1))),
        10,
        84
      );
      this.theta = THREE.MathUtils.radToDeg(Math.atan2(dx, dz));
    }
    this.cameraMode = mode;
    return this.cameraMode;
  }

  public getCameraMode() {
    return this.cameraMode;
  }

  /**
   * 飞行到指定视角（巡检对象"配置视角"功能：巡视时恢复保存的角度）。
   * @param position 相机位置 [x, y, z]（与配置页同一 GLB 归一化坐标系）
   * @param target   注视点 [x, y, z]
   * 自动反推球坐标（theta/phi/radius）并用 easeOutCubic 平滑过渡。
   */
  public flyToViewpoint(position: number[], target: number[]) {
    if (!this.modelReady) return;
    // 恢复视角属于自由观察能力，先切到 orbit 模式再飞行
    this.setCameraMode('orbit');
    const pos = new THREE.Vector3(position[0], position[1], position[2]);
    const tgt = new THREE.Vector3(target[0], target[1], target[2]);
    const dx = pos.x - tgt.x;
    const dy = pos.y - tgt.y;
    const dz = pos.z - tgt.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (dist < 1e-4) return;
    this.flyFromTarget.copy(this.viewTarget);
    this.flyToTarget.copy(tgt);
    this.flyFromTheta = this.theta;
    // 球坐标约定：position = target + radius*sin(phi)*sin(theta), y + radius*cos(phi), z + radius*sin(phi)*cos(theta)
    this.flyToTheta = THREE.MathUtils.radToDeg(Math.atan2(dx, dz));
    this.flyFromPhi = this.phi;
    this.flyToPhi = THREE.MathUtils.clamp(
      THREE.MathUtils.radToDeg(Math.acos(THREE.MathUtils.clamp(dy / dist, -1, 1))),
      10,
      84
    );
    this.flyFromRadius = this.radius;
    this.flyToRadius = THREE.MathUtils.clamp(dist, 200, 4000);
    this.flyActive = true;
    this.flyTime = 0;
    this.flyDuration = 1.2;
  }

  /** 获取当前相机视角（配置页保存视角用）：position + target */
  public getViewpoint() {
    return {
      position: this.camera.position.toArray().map((v) => parseFloat(v.toFixed(2))),
      target: this.viewTarget.toArray().map((v) => parseFloat(v.toFixed(2))),
    };
  }

  /** 重新加载真实模型（加载失败后重试） */
  public reloadModels() {
    if (this.disposed) return;
    this.modelReady = false;
    this.clearModelRoot();
    // 重置整体归一化状态，避免重载后缩放/位移叠加
    this.modelRoot.scale.set(1, 1, 1);
    this.modelRoot.position.set(0, 0, 0);
    MODELS.forEach((model) => this.modelLoading.set(model.key, { loaded: 0, total: 0 }));
    MODELS.forEach((model) => this.loadModel(model));
  }

  public dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.renderer.setAnimationLoop(null);
    const canvas = this.renderer.domElement;
    canvas.removeEventListener('mousedown', this.handlePointerDown);
    canvas.removeEventListener('wheel', this.handleWheel);
    canvas.removeEventListener('contextmenu', this.handleContextMenu);
    window.removeEventListener('mousemove', this.handlePointerMove);
    window.removeEventListener('mouseup', this.handlePointerUp);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
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
    canvas.remove();
    this.scene.clear();
  }

  // 灯光与环境（蓝天白云 / 雾 / 地面 / PMREM 环境反射）见 ../shared/environment.ts，与配置视角页共用

  /** 加载真实 GLB 模型：外立面 + 内部结构，两者同时展示 */
  private loadRealModels() {
    MODELS.forEach((model) => this.modelLoading.set(model.key, { loaded: 0, total: 0 }));
    MODELS.forEach((model) => this.loadModel(model));
  }

  private loadModel(model: ModelSource) {
    // 项目使用 hash 路由且 vite base 为 './'，基于当前地址解析即可兼容开发与部署子路径
    const url = new URL(`GLB/${model.file}`, window.location.href).href;
    this.glbLoader.load(
      url,
      (gltf) => {
        if (this.disposed) return;
        const group = this.normalizeModel(gltf.scene, model.facade);
        group.name = `glb-${model.key}`;
        this.modelRoot.add(group);
        const state = this.modelLoading.get(model.key);
        if (state) {
          state.loaded = 1;
          state.total = 1;
        }
        this.reportModelProgress(model.key);
        const allLoaded = MODELS.every((item) => this.modelRoot.getObjectByName(`glb-${item.key}`) != null);
        if (allLoaded) this.onModelsReady();
      },
      (event) => {
        if (this.disposed) return;
        const state = this.modelLoading.get(model.key);
        if (!state) return;
        state.loaded = event.loaded;
        if (event.total > 0) state.total = event.total;
        this.reportModelProgress(model.key);
      },
      (error) => {
        if (this.disposed) return;
        const detail =
          error && typeof error === 'object' && 'message' in error
            ? String((error as { message?: unknown }).message)
            : String(error);
        this.callbacks.onModelError?.(detail || '未知错误');
      }
    );
  }

  /**
   * 模型预处理：只处理材质与阴影，不做缩放/平移。
   * 缩放与对齐在全部模型加载完成后统一进行（见 alignModels），
   * 避免外立面与内部结构各自居中导致相对位置错位。
   */
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
            // depthWrite 保持 true，避免内部结构因深度排序异常而变暗
            material.side = THREE.DoubleSide;
          });
        }
      }
    });
    return root;
  }

  /**
   * 全部模型加载后统一归一化（在 modelRoot 整体上执行）：
   * 1. 统一缩放到 TARGET_SIZE
   * 2. 整体水平居中到原点、底面贴到 y=0
   * 整体平移不会改变内外模型的相对位置，保证外立面与内部结构严格对齐。
   */
  private alignModels() {
    if (this.modelRoot.children.length === 0) return;
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
  }

  /** 全部模型加载完成：统一对齐、初始化巡检、相机对准整体模型 */
  private onModelsReady() {
    if (this.modelReady || this.disposed) return;
    this.modelReady = true;
    this.alignModels();
    // 缓存整体包围信息（预设视角使用）
    const box = new THREE.Box3().setFromObject(this.modelRoot);
    box.getCenter(this.modelCenter);
    box.getBoundingSphere(this.modelSphere);
    this.initPatrol();
    this.fitAll();
    this.callbacks.onModelLoaded?.();
  }

  /**
   * 预设视角飞行：镜头丝滑过渡到目标视角（整体 / 正面 / 侧面 / 内部）。
   * 属于自由观察能力，调用后会退出跟随模式。
   */
  public flyToPreset(name: 'overall' | 'front' | 'side' | 'inside') {
    if (!this.modelReady) return;
    // 预设视角属于全景浏览能力，先切到 orbit 模式再飞行
    this.setCameraMode('orbit');
    const center = this.modelCenter;
    const radius = this.modelSphere.radius;
    let toTarget = center.clone();
    let toTheta = this.theta;
    let toPhi = this.phi;
    let toRadius = this.radius;
    switch (name) {
      case 'overall':
        // 整体：从斜上方俯瞰全厂（同 fitAll 的初始视角）
        toTheta = -55;
        toPhi = 45;
        toRadius = Math.max(radius * 1.25, 200);
        break;
      case 'front':
        // 正面：正对厂房
        toTheta = 0;
        toPhi = 40;
        toRadius = Math.max(radius * 1.45, 300);
        break;
      case 'side':
        // 侧面：从侧向看厂房
        toTheta = 90;
        toPhi = 40;
        toRadius = Math.max(radius * 1.45, 300);
        break;
      case 'inside': {
        // 内部：进入厂房中部，贴近设备的高度平视内部
        toTarget = new THREE.Vector3(center.x, Math.max(center.y * 0.35, 60), center.z);
        toTheta = -55;
        toPhi = 68;
        toRadius = Math.max(radius * 0.45, 140);
        break;
      }
    }
    this.flyFromTarget.copy(this.viewTarget);
    this.flyToTarget.copy(toTarget);
    this.flyFromTheta = this.theta;
    this.flyToTheta = toTheta;
    this.flyFromPhi = this.phi;
    this.flyToPhi = toPhi;
    this.flyFromRadius = this.radius;
    this.flyToRadius = toRadius;
    this.flyActive = true;
    this.flyTime = 0;
    this.flyDuration = 1.4;
  }

  /** 驱动预设视角动画：easeOutCubic 插值 theta/phi/radius/viewTarget */
  private updateFly(delta: number) {
    if (!this.flyActive) return;
    this.flyTime += delta;
    const t = Math.min(1, this.flyTime / this.flyDuration);
    const ease = 1 - Math.pow(1 - t, 3);
    this.viewTarget.lerpVectors(this.flyFromTarget, this.flyToTarget, ease);
    this.theta = this.flyFromTheta + (this.flyToTheta - this.flyFromTheta) * ease;
    this.phi = this.flyFromPhi + (this.flyToPhi - this.flyFromPhi) * ease;
    this.radius = this.flyFromRadius + (this.flyToRadius - this.flyFromRadius) * ease;
    // 飞行期间同步平滑状态，避免结束后跳变
    this.camPos.copy(this.camera.position);
    this.camLook.copy(this.viewTarget);
    if (t >= 1) this.flyActive = false;
  }

  /** 基于模型 id 列表创建巡检控制器（模型加载完成后调用） */
  private initPatrol() {
    this.patrol = new PatrolController({
      scene: this.scene,
      root: this.modelRoot,
      ids: PATROL_IDS,
      onChange: (snapshot) => this.callbacks.onPatrolChange(snapshot),
    });
    // 有巡检对象时默认进入自动巡检跟随；未配置巡检对象时保持全景浏览
    this.cameraMode = this.patrol.getTargetCount() > 0 ? 'patrol' : 'orbit';
  }

  /** 相机对准全部模型的整体包围范围 */
  private fitAll() {
    if (this.modelRoot.children.length === 0) return;
    this.modelRoot.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(this.modelRoot);
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    const center = box.getCenter(new THREE.Vector3());
    const fov = THREE.MathUtils.degToRad(this.camera.fov);
    const distance = Math.max(sphere.radius, 1) / Math.sin(fov / 2);
    this.viewTarget.copy(center);
    this.radius = THREE.MathUtils.clamp(distance * 1.2, 200, 4000);
    this.theta = -55;
    this.phi = 45;
    // 初始化相机与跟随平滑状态（加载完成后直接定位整体视图）
    const theta = THREE.MathUtils.degToRad(this.theta);
    const phi = THREE.MathUtils.degToRad(this.phi);
    this.camera.position.set(
      this.viewTarget.x + this.radius * Math.sin(phi) * Math.sin(theta),
      this.viewTarget.y + this.radius * Math.cos(phi),
      this.viewTarget.z + this.radius * Math.sin(phi) * Math.cos(theta)
    );
    this.camera.lookAt(this.viewTarget);
    this.camPos.copy(this.camera.position);
    this.camLook.copy(this.viewTarget);
  }

  /** 汇总多个模型的加载进度 */
  private reportModelProgress(current: ModelKey) {
    let loaded = 0;
    let total = 0;
    MODELS.forEach((model) => {
      const state = this.modelLoading.get(model.key);
      if (state) {
        loaded += state.loaded;
        total += state.total;
      }
    });
    const percent = total > 0 ? Math.min(100, (loaded / total) * 100) : 0;
    const label = MODELS.find((model) => model.key === current)?.label ?? '';
    this.callbacks.onModelLoadProgress?.({ percent, label });
  }

  private clearModelRoot() {
    while (this.modelRoot.children.length > 0) {
      const child = this.modelRoot.children[0];
      this.modelRoot.remove(child);
      disposeObject(child);
    }
  }

  private bindEvents() {
    const canvas = this.renderer.domElement;
    canvas.addEventListener('mousedown', this.handlePointerDown);
    canvas.addEventListener('wheel', this.handleWheel, { passive: false });
    canvas.addEventListener('contextmenu', this.handleContextMenu);
    window.addEventListener('mousemove', this.handlePointerMove);
    window.addEventListener('mouseup', this.handlePointerUp);
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
  }

  private readonly handleKeyDown = (event: KeyboardEvent) => {
    // 输入框/可编辑区域内不响应键盘行走
    const target = event.target as HTMLElement | null;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) event.preventDefault();
    this.keys.add(event.code);
  };

  private readonly handleKeyUp = (event: KeyboardEvent) => {
    this.keys.delete(event.code);
  };

  /** 全景浏览（orbit）键盘辅助：W/S 前后移动观察中心、A/D 左右平移、Q/E 升降、方向键旋转 */
  private updateOrbitMove(delta: number) {
    if (this.cameraMode !== 'orbit' || this.flyActive || this.keys.size === 0) return;
    // 相机前视方向（水平分量）与右方向
    const forward = new THREE.Vector3().subVectors(this.viewTarget, this.camera.position);
    forward.y = 0;
    if (forward.lengthSq() < 1e-6) return;
    forward.normalize();
    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
    const move = new THREE.Vector3();
    if (this.keys.has('KeyW')) move.add(forward);
    if (this.keys.has('KeyS')) move.sub(forward);
    if (this.keys.has('KeyD')) move.add(right);
    if (this.keys.has('KeyA')) move.sub(right);
    if (this.keys.has('ArrowUp')) move.add(forward);
    if (this.keys.has('ArrowDown')) move.sub(forward);
    if (move.lengthSq() > 0) {
      move.normalize().multiplyScalar(this.walkSpeed * delta);
      this.viewTarget.add(move);
      // 约束在模型水平范围与高度范围内
      this.viewTarget.x = THREE.MathUtils.clamp(this.viewTarget.x, -2000, 2000);
      this.viewTarget.z = THREE.MathUtils.clamp(this.viewTarget.z, -2000, 2000);
    }
    // 升降：E 上 / Q 下
    if (this.keys.has('KeyE')) this.viewTarget.y += this.walkSpeed * 0.5 * delta;
    if (this.keys.has('KeyQ')) this.viewTarget.y -= this.walkSpeed * 0.5 * delta;
    this.viewTarget.y = THREE.MathUtils.clamp(this.viewTarget.y, 0, 1000);
    // 方向键左右旋转视角
    if (this.keys.has('ArrowLeft')) this.theta -= 90 * delta;
    if (this.keys.has('ArrowRight')) this.theta += 90 * delta;
  }

  /**
   * 厂房漫游（walk）第一人称移动：
   * camera.position 即玩家位置，W/S 前后、A/D 左右、方向键旋转；
   * 高度从进入时快速回落到人眼高度，之后保持贴地行走，并限制在模型水平范围内。
   */
  private updateWalkMove(delta: number) {
    if (this.cameraMode !== 'walk') return;
    const forward = new THREE.Vector3(-Math.sin(this.walkYaw), 0, -Math.cos(this.walkYaw));
    const right = new THREE.Vector3(Math.cos(this.walkYaw), 0, -Math.sin(this.walkYaw));
    const move = new THREE.Vector3();
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) move.add(forward);
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) move.sub(forward);
    if (this.keys.has('KeyD')) move.add(right);
    if (this.keys.has('KeyA')) move.sub(right);
    if (move.lengthSq() > 0) {
      move.normalize().multiplyScalar(this.walkSpeed * delta);
      this.playerPos.add(move);
    }
    // 方向键左右旋转朝向
    if (this.keys.has('ArrowLeft')) this.walkYaw -= 1.6 * delta;
    if (this.keys.has('ArrowRight')) this.walkYaw += 1.6 * delta;
    // 高度：从高空进入时快速回落到人眼高度，之后保持贴地
    this.playerPos.y += (this.walkEyeHeight - this.playerPos.y) * Math.min(1, delta * 5);
    // 水平范围限制在模型周围（避免走出场景）
    const limit = this.modelReady ? this.modelSphere.radius + 200 : 1500;
    this.playerPos.x = THREE.MathUtils.clamp(this.playerPos.x, -limit, limit);
    this.playerPos.z = THREE.MathUtils.clamp(this.playerPos.z, -limit, limit);
  }

  private readonly handlePointerDown = (event: MouseEvent) => {
    this.dragging = true;
    this.dragButton = event.button;
    this.lastPointer = { x: event.clientX, y: event.clientY };
  };

  private readonly handlePointerMove = (event: MouseEvent) => {
    if (!this.dragging) return;
    const dx = event.clientX - this.lastPointer.x;
    const dy = event.clientY - this.lastPointer.y;
    this.lastPointer = { x: event.clientX, y: event.clientY };
    // 厂房漫游：按住左键拖动转动视角（第一人称）
    if (this.cameraMode === 'walk') {
      if (this.dragButton === 0) {
        this.walkYaw -= dx * this.walkLookSpeed;
        this.walkPitch = THREE.MathUtils.clamp(this.walkPitch - dy * this.walkLookSpeed, -0.9, 0.9);
      }
      return;
    }
    if (this.dragButton === 0) {
      this.theta -= dx * 0.3;
      this.phi = THREE.MathUtils.clamp(this.phi + dy * 0.25, 10, 84);
    } else if (this.dragButton === 2) {
      this.panCamera(dx, dy);
    }
  };

  private readonly handlePointerUp = () => {
    this.dragging = false;
  };

  private readonly handleWheel = (event: WheelEvent) => {
    event.preventDefault();
    // 厂房漫游：滚轮不缩放，保持第一人称距离感
    if (this.cameraMode === 'walk') return;
    if (this.cameraMode === 'patrol' && (this.patrol?.getTargetCount() ?? 0) > 0) {
      // 自动巡检：滚轮调整观察距离
      this.followDist = THREE.MathUtils.clamp(this.followDist * (event.deltaY > 0 ? 1.09 : 0.92), 40, 900);
    } else {
      // 全景浏览：滚轮缩放
      this.radius = THREE.MathUtils.clamp(this.radius * (event.deltaY > 0 ? 1.09 : 0.92), 200, 4000);
    }
  };

  private readonly handleContextMenu = (event: MouseEvent) => event.preventDefault();

  private panCamera(dx: number, dy: number) {
    const theta = THREE.MathUtils.degToRad(this.theta);
    const phi = THREE.MathUtils.degToRad(this.phi);
    const forward = new THREE.Vector3(
      -Math.sin(phi) * Math.sin(theta),
      -Math.cos(phi),
      -Math.sin(phi) * Math.cos(theta)
    );
    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
    const up = new THREE.Vector3().crossVectors(right, forward).normalize();
    const scale = this.radius * 0.0012;
    this.viewTarget.addScaledVector(right, -dx * scale);
    this.viewTarget.addScaledVector(up, dy * scale);
    this.viewTarget.x = THREE.MathUtils.clamp(this.viewTarget.x, -2000, 2000);
    this.viewTarget.z = THREE.MathUtils.clamp(this.viewTarget.z, -2000, 2000);
    // 贴近视角时目标点带高度，平移保留高度（限制在模型高度范围内），避免视角跳变
    this.viewTarget.y = THREE.MathUtils.clamp(this.viewTarget.y, 0, 1000);
  }

  private updateCamera() {
    // 厂房漫游（walk）：第一人称，相机位置即玩家位置，朝向由 yaw/pitch 决定
    if (this.cameraMode === 'walk') {
      const cp = Math.cos(this.walkPitch);
      const dir = new THREE.Vector3(
        -Math.sin(this.walkYaw) * cp,
        Math.sin(this.walkPitch),
        -Math.cos(this.walkYaw) * cp
      );
      this.camera.position.copy(this.playerPos);
      this.camera.lookAt(this.playerPos.clone().add(dir));
      // 同步平滑状态，便于切换回自动巡检时镜头连续
      this.camPos.copy(this.camera.position);
      this.camLook.copy(this.playerPos).addScaledVector(dir, 50);
      return;
    }
    // 自动巡检（patrol）：镜头平滑跟随巡检目标，注视点锁定设备本体
    const dwelling = this.patrol?.isDwelling() ?? false;
    const aim = dwelling ? this.patrol?.getFocusedTargetPosition() : this.patrol?.getPathPosition();
    if (this.cameraMode === 'patrol' && aim) {
      // 注视点锁定巡检目标设备中心，保证设备始终位于画面正中
      const lookTarget = aim.clone();
      const radius = this.patrol?.getFocusedTargetRadius() ?? 30;
      // 相机略高于设备中心形成轻微俯视（高度随设备大小适当调整）
      const height = THREE.MathUtils.clamp(radius * 0.5, 20, 55);
      // 保证设备整体入画：相机到设备中心的直线距离需使包围球张角不超过 85% FOV
      const fovHalf = THREE.MathUtils.degToRad(this.camera.fov / 2);
      const minDist = (radius + 8) / Math.tan(fovHalf * 0.85);
      // 观察距离：停留时贴近设备，巡航时保持近中距（默认 75，滚轮可调）；均不低于整体入画所需距离
      const base = dwelling ? Math.min(this.followDist, 42) : this.followDist;
      const dist3 = Math.max(base, minDist, height + 1);
      const flat = Math.sqrt(dist3 * dist3 - height * height);
      const theta = THREE.MathUtils.degToRad(this.theta);
      const desired = this.followPos.set(
        lookTarget.x + flat * Math.sin(theta),
        lookTarget.y + height,
        lookTarget.z + flat * Math.cos(theta)
      );
      // 遮挡检测（每 4 帧一次）：被遮挡时仅沿视线拉近（保持高度），不做抬升
      this.occlusionAccum += 1;
      if (this.occlusionAccum % 4 === 1) {
        this.resolvedCamPos.copy(this.resolveClearCamera(lookTarget, desired));
      }
      // 相机位置与注视点均做平滑插值，形成平稳的水平平移跟随
      this.camPos.lerp(this.resolvedCamPos, 0.12);
      this.camLook.lerp(lookTarget, 0.15);
      this.camera.position.copy(this.camPos);
      this.camera.lookAt(this.camLook);
      return;
    }
    // 全景浏览（orbit）：球坐标手动旋转/平移
    const theta = THREE.MathUtils.degToRad(this.theta);
    const phi = THREE.MathUtils.degToRad(this.phi);
    this.camera.position.set(
      this.viewTarget.x + this.radius * Math.sin(phi) * Math.sin(theta),
      this.viewTarget.y + this.radius * Math.cos(phi),
      this.viewTarget.z + this.radius * Math.sin(phi) * Math.cos(theta)
    );
    this.camera.lookAt(this.viewTarget);
    // 同步跟随平滑状态，避免切换模式时跳变
    this.camPos.copy(this.camera.position);
    this.camLook.copy(this.viewTarget);
  }

  /**
   * 找到能看见目标主体的相机位置：
   * 保持同一高度水平视角，被遮挡时仅沿视线方向拉近（不做抬升/俯视动作），
   * 保证镜头始终水平平移、直接到达目标附近。
   */
  private resolveClearCamera(target: THREE.Vector3, desired: THREE.Vector3) {
    if (this.modelRoot.children.length === 0) return desired;
    const dir = desired.clone().sub(target);
    const dist = dir.length();
    if (dist < 1) return desired;
    dir.normalize();
    for (const factor of [1, 0.7, 0.5, 0.35]) {
      const candidate = target.clone().addScaledVector(dir, dist * factor);
      if (!this.isCameraBlocked(target, candidate)) return candidate;
    }
    return desired;
  }

  /** 目标 -> 相机方向上是否有遮挡物（排除当前巡检目标自身） */
  private isCameraBlocked(from: THREE.Vector3, to: THREE.Vector3) {
    const dir = to.clone().sub(from);
    const dist = dir.length();
    if (dist < 1) return false;
    dir.normalize();
    this.raycaster.set(from, dir);
    this.raycaster.far = dist;
    const hits = this.raycaster.intersectObjects(this.modelRoot.children, true);
    if (hits.length === 0) return false;
    const focused = this.patrol?.getFocusedObject();
    for (const hit of hits) {
      // 跳过不可见对象（例如被隐藏的外立面）
      if (!isVisible(hit.object)) continue;
      // 跳过当前巡检目标自身
      if (focused && isObjectOrChildOf(focused, hit.object)) continue;
      return true;
    }
    return false;
  }

  private readonly animate = () => {
    if (this.disposed) return;
    const now = performance.now() / 1000;
    const delta = Math.min(0.1, now - this.lastTime);
    this.lastTime = now;
    this.patrol?.tick(delta, now);
    this.updateFly(delta);
    this.updateOrbitMove(delta);
    this.updateWalkMove(delta);
    this.updateCamera();
    this.emitTargetScreenPos();
    this.renderer.render(this.scene, this.camera);
  };

  /**
   * 每帧上报当前巡检目标在屏幕上的投影位置（设备上方一点），
   * 供外部把"巡检结果卡片"锚定到设备上方。非巡检模式或无目标时上报 null。
   */
  private emitTargetScreenPos() {
    const cb = this.callbacks.onTargetScreenPosition;
    if (!cb) return;
    if (this.cameraMode !== 'patrol') {
      cb(null);
      return;
    }
    const aim = this.patrol?.getFocusedTargetPosition();
    if (!aim) {
      cb(null);
      return;
    }
    // 投影点取设备包围球顶部上方，卡片悬浮在设备上面
    const radius = this.patrol?.getFocusedTargetRadius() ?? 30;
    const proj = this.projPoint.set(aim.x, aim.y + radius + 24, aim.z).project(this.camera);
    if (proj.z > 1 || proj.z < -1) {
      cb(null);
      return;
    }
    cb({
      x: ((proj.x + 1) / 2) * this.viewportRect.width,
      y: ((-proj.y + 1) / 2) * this.viewportRect.height,
    });
  }
}
