import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { PatrolController } from './patrolController';
import type { WaterPlantSceneCallbacks } from './types';
import {
  TARGET_SIZE,
  PATROL_IDS,
  WATER_PLANT_MODELS as MODELS,
  SCENE_CONFIG,
  type PatrolViewpoint,
  type WaterPlantModelKey as ModelKey,
  type WaterPlantModelSource as ModelSource,
} from '../shared/constants';
import { addSceneLights, addSceneEnvironment } from '../shared/environment';
import { disposeObject, isVisible, isObjectOrChildOf } from '../shared/utils';

/**
 * 相机模式：
 * - orbit  自由观察：球坐标环绕（左键旋转 / 右键平移 / 滚轮缩放）
 * - patrol 自动巡检：跟随巡检目标，镜头平滑平移、被遮挡自动拉近
 */
export type CameraMode = 'orbit' | 'patrol';

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
  private readonly camera = new THREE.PerspectiveCamera(
    SCENE_CONFIG.cameraFov,
    1,
    SCENE_CONFIG.cameraNear,
    SCENE_CONFIG.cameraFar
  );
  private readonly renderer: THREE.WebGLRenderer;
  private readonly viewTarget = new THREE.Vector3();
  /** 跟随模式的平滑相机位置/注视点（避免镜头晃动） */
  private readonly camPos = new THREE.Vector3();
  private readonly camLook = new THREE.Vector3();
  private readonly followPos = new THREE.Vector3();
  /** 遮挡检测：目标 -> 相机的射线与解析出的无遮挡相机位置 */
  private readonly raycaster = new THREE.Raycaster();
  private readonly resolvedCamPos = new THREE.Vector3();
  /** 巡检预设视角的注视点（复用临时向量） */
  private readonly presetLook = new THREE.Vector3();
  /** 巡航平移跟随：路径侧向向量 / 路径前方注视点 / 世界向上（复用临时向量） */
  private readonly cruiseRight = new THREE.Vector3();
  private readonly cruiseAhead = new THREE.Vector3();
  private readonly upVec = new THREE.Vector3(0, 1, 0);
  /** 跟随模式下的观察距离（滚轮可调，默认贴近设备） */
  private followDist = 75;
  private occlusionAccum = 0;
  /** 当前相机模式（默认自由观察，加载完成后若有巡检对象则自动开始巡检） */
  private cameraMode: CameraMode = 'orbit';
  /** 外立面显示模式（默认半透明透视，兼顾整体观感与内部可见性） */
  private facadeMode: FacadeMode = 'transparent';
  /** 视口尺寸（CSS 像素，用于世界坐标 -> 屏幕坐标投影） */
  private readonly viewportRect = { width: 1, height: 1 };
  /** 屏幕投影复用的临时向量 */
  private readonly projPoint = new THREE.Vector3();
  /** 视角飞行动画状态（easeOutCubic 插值 theta/phi/radius/viewTarget） */
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

  constructor(container: HTMLElement, callbacks: WaterPlantSceneCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    // Windows 下 ANGLE/D3D 后端会对 three 内置 shader 报 X4122 浮点精度警告
    // （Program Info Log: sum of ... cannot be represented accurately in double precision），
    // 该警告无害，关闭 shader 日志检查以静默，避免控制台刷屏
    this.renderer.debug.checkShaderErrors = false;
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

  /** 切换相机模式（orbit 自由观察 / patrol 自动巡检），切换前结束飞行避免状态残留 */
  public setCameraMode(mode: CameraMode) {
    if (mode === this.cameraMode) return this.cameraMode;
    this.flyActive = false;
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
    this.initPatrol();
    this.fitAll();
    this.callbacks.onModelLoaded?.();
  }

  /** 驱动相机视角飞行动画（恢复保存的视角等）：easeOutCubic 插值 theta/phi/radius/viewTarget */
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
    // 有巡检对象时默认进入自动巡检跟随；未配置巡检对象时保持自由观察（orbit）
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
    if (this.cameraMode === 'patrol' && (this.patrol?.getTargetCount() ?? 0) > 0) {
      // 自动巡检：滚轮调整观察距离
      this.followDist = THREE.MathUtils.clamp(this.followDist * (event.deltaY > 0 ? 1.09 : 0.92), 40, 900);
    } else {
      // 自由观察：滚轮缩放
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
    // 自动巡检（patrol）：镜头平滑跟随巡检目标，注视点锁定设备本体
    const dwelling = this.patrol?.isDwelling() ?? false;
    const aim = dwelling ? this.patrol?.getFocusedTargetPosition() : this.patrol?.getPathPosition();
    if (this.cameraMode === 'patrol' && aim) {
      // fov 统一做平滑过渡，避免切换目标或 dwelling 状态时视角一跳一跳
      this.smoothPatrolFov();
      // 该点位配置了预设视角（配置视角页保存）：停留时相机直接采用预设机位（位置/注视点/fov）
      const viewpoint = this.patrol?.getFocusedViewpoint();
      if (dwelling && viewpoint?.position && viewpoint.target) {
        this.resolvedCamPos.fromArray(viewpoint.position);
        this.presetLook.fromArray(viewpoint.target);
        this.camPos.lerp(this.resolvedCamPos, 0.12);
        this.camLook.lerp(this.presetLook, 0.15);
        this.camera.position.copy(this.camPos);
        this.camera.lookAt(this.camLook);
        return;
      }
      // 停留且未配置预设视角：自动跟随算法（注视点锁定设备中心，相机保持一定观察距离）
      if (dwelling) {
        this.updatePatrolFollow(aim);
        return;
      }
      // 设备间巡航：相机沿路径切线平移跟随，避免镜头大角度转动
      this.updatePatrolCruise(aim);
      return;
    }
    // 自由观察（orbit）：球坐标手动旋转/平移
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

  /** 巡检视角：fov 每帧平滑过渡到目标值，避免切换点位或 dwelling 状态时视角突变 */
  private smoothPatrolFov() {
    const viewpoint = this.patrol?.getFocusedViewpoint();
    const desiredFov = viewpoint?.fov && viewpoint.fov > 0 ? viewpoint.fov : SCENE_CONFIG.cameraFov;
    if (Math.abs(this.camera.fov - desiredFov) > 0.01) {
      this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, desiredFov, 0.08);
      this.camera.updateProjectionMatrix();
    }
  }

  /** 停留阶段自动跟随：注视点锁定设备中心，相机保持一定观察距离形成轻微俯视 */
  private updatePatrolFollow(lookTarget: THREE.Vector3) {
    const radius = this.patrol?.getFocusedTargetRadius() ?? 30;
    // 相机略高于设备中心形成轻微俯视（高度随设备大小适当调整）
    const height = THREE.MathUtils.clamp(radius * 0.5, 20, 55);
    // 保证设备整体入画：相机到设备中心的直线距离需使包围球张角不超过 85% FOV
    const fovHalf = THREE.MathUtils.degToRad(this.camera.fov / 2);
    const minDist = (radius + 8) / Math.tan(fovHalf * 0.85);
    // 观察距离：贴近设备，不低于整体入画所需距离
    const dist3 = Math.max(Math.min(this.followDist, 42), minDist, height + 1);
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
  }

  /**
   * 设备间巡航：相机置于路径侧上方，朝向沿路径切线方向（看前进方向）。
   * 直线段相机纯平移不转动，转弯处随路径平缓转向，避免设备之间镜头大角度转动。
   */
  private updatePatrolCruise(pathPos: THREE.Vector3) {
    const tangent = this.patrol?.getPathTangent();
    if (!tangent) {
      // 兜底：取不到切线时直接看路径点
      this.camLook.lerp(pathPos, 0.15);
      this.camera.position.copy(this.camPos);
      this.camera.lookAt(this.camLook);
      return;
    }
    // 侧向单位向量（路径切线 × 上），相机始终位于路径侧方，直线段即纯平移
    this.cruiseRight.crossVectors(tangent, this.upVec).normalize();
    if (this.cruiseRight.lengthSq() < 1e-6) this.cruiseRight.set(1, 0, 0);
    const side = 34;
    const camHeight = 22;
    const desired = this.followPos.set(
      pathPos.x + this.cruiseRight.x * side,
      pathPos.y + camHeight,
      pathPos.z + this.cruiseRight.z * side
    );
    // 注视点：路径前方一段距离（沿切线方向），朝向始终与前进方向一致
    this.cruiseAhead.copy(pathPos).addScaledVector(tangent, 70);
    this.cruiseAhead.y += 8;
    // 遮挡检测（每 4 帧一次）：被遮挡时仅沿视线拉近（保持高度），不做抬升
    this.occlusionAccum += 1;
    if (this.occlusionAccum % 4 === 1) {
      this.resolvedCamPos.copy(this.resolveClearCamera(this.cruiseAhead, desired));
    }
    // 位置/注视点平滑插值，形成平稳的平移跟随
    this.camPos.lerp(this.resolvedCamPos, 0.1);
    this.camLook.lerp(this.cruiseAhead, 0.12);
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camLook);
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
    // 投影点取设备顶部偏下一点，让卡片覆盖部分模型，避免离设备太远
    const radius = this.patrol?.getFocusedTargetRadius() ?? 30;
    const proj = this.projPoint.set(aim.x, aim.y + radius * 0.35, aim.z).project(this.camera);
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
