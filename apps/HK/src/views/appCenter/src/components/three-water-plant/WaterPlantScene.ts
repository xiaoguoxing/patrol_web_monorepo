import * as THREE from 'three';
import { gsap } from 'gsap';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { PatrolController } from './patrolController';
import type { WaterPlantSceneCallbacks } from './types';
import {
  TARGET_SIZE,
  PATROL_IDS,
  WATER_PLANT_MODELS as MODELS,
  SCENE_CONFIG,
  CAMERA_CONTROL_CONFIG,
  UI_CONFIG,
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

/** 巡检点位机位：预设视角（配置视角页保存）解析后的相机姿态 */
interface PatrolCamPose {
  position: THREE.Vector3;
  target: THREE.Vector3;
  fov: number;
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
  /** 巡检点位机位缓存（index -> 机位；未配置预设视角的点位为 undefined） */
  private poseCache: (PatrolCamPose | undefined)[] | undefined;
  /** GSAP 运镜补间代理：镜头位置 / 注视点 / fov 分开补间，可配不同缓动与时长 */
  private readonly flightPos = { x: 0, y: 0, z: 0 };
  private readonly flightLook = { x: 0, y: 0, z: 0 };
  private readonly flightFov = { v: SCENE_CONFIG.cameraFov };
  /** 当前进行中的 GSAP 运镜时间轴 */
  private flightTimeline: gsap.core.Timeline | undefined;
  /** 运镜起点朝向（计算注视起点时复用） */
  private readonly camDir = new THREE.Vector3();
  /** 跟随模式下的观察距离（滚轮可调，默认贴近设备） */
  private followDist = CAMERA_CONTROL_CONFIG.DEFAULT_FOLLOW_DISTANCE;
  private occlusionAccum = 0;
  /** 当前相机模式（默认自由观察，加载完成后若有巡检对象则自动开始巡检） */
  private cameraMode: CameraMode = 'orbit';
  /** 外立面显示模式（默认半透明透视，兼顾整体观感与内部可见性） */
  private facadeMode: FacadeMode = 'transparent';
  /** 视口尺寸（CSS 像素，用于世界坐标 -> 屏幕坐标投影） */
  private readonly viewportRect = { width: 1, height: 1 };
  /** 屏幕投影复用的临时向量 */
  private readonly projPoint = new THREE.Vector3();
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

  /** 切换相机模式（orbit 自由观察 / patrol 自动巡检） */
  public setCameraMode(mode: CameraMode) {
    if (mode === this.cameraMode) return this.cameraMode;
    if (mode !== 'patrol') {
      // 离开巡检模式：终止进行中的运镜（巡检阶段逻辑保留，切回时会从当前镜头继续）
      this.flightTimeline?.kill();
      this.flightTimeline = undefined;
    }
    this.cameraMode = mode;
    return this.cameraMode;
  }

  public getCameraMode() {
    return this.cameraMode;
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

    // 停止 GSAP 运镜动画
    try {
      this.flightTimeline?.kill();
    } catch (error) {
      console.warn('[WaterPlantScene] GSAP timeline kill 失败:', error);
    } finally {
      this.flightTimeline = undefined;
    }

    // 停止渲染循环
    this.renderer.setAnimationLoop(null);

    const canvas = this.renderer.domElement;

    // 移除事件监听器（使用 try-catch 防止移除失败阻塞后续清理）
    try {
      canvas.removeEventListener('mousedown', this.handlePointerDown);
      canvas.removeEventListener('wheel', this.handleWheel);
      canvas.removeEventListener('contextmenu', this.handleContextMenu);
      window.removeEventListener('mousemove', this.handlePointerMove);
      window.removeEventListener('mouseup', this.handlePointerUp);
    } catch (error) {
      console.warn('[WaterPlantScene] 事件监听器移除失败:', error);
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
      console.error('[WaterPlantScene] Three.js 资源释放失败:', error);
    }

    // 移除 canvas（使用 try-catch 防止 DOM 操作失败）
    try {
      canvas.remove();
    } catch (error) {
      console.warn('[WaterPlantScene] Canvas 移除失败:', error);
    }
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
    this.snapToFirstPatrolTarget();
    this.callbacks.onModelLoaded?.();
  }

  /**
   * 自动巡检启动时若首个巡检点位已配置预设机位，相机直接定格在该机位并进入停留，
   * 跳过"整体鸟瞰 -> 首个点位"的长距离 GSAP 运镜，
   * 避免页面加载完成后镜头从高空晃入目标设备的观感。
   * 首个点位无预设视角时不做处理，沿用停留阶段的自动跟随平滑就位。
   */
  private snapToFirstPatrolTarget() {
    const patrol = this.patrol;
    if (!patrol || this.cameraMode !== 'patrol') return;
    const index = patrol.getCurrentIndex() >= 0 ? patrol.getCurrentIndex() : patrol.getPendingIndex();
    const pose = this.getTargetPose(index);
    if (!pose) return;
    this.camera.position.copy(pose.position);
    this.camera.lookAt(pose.target);
    this.camera.fov = pose.fov;
    this.camera.updateProjectionMatrix();
    // 同步跟随平滑状态，避免停留阶段首帧从旧位置插值产生镜头滑动
    this.camPos.copy(pose.position);
    this.camLook.copy(pose.target);
    // 多巡检对象：transit -> dwell 直接开始首点位停留；
    // 单个巡检对象：构造时已进入 dwell，此调用为无副作用的空操作
    patrol.completeTransit();
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
      this.theta -= dx * CAMERA_CONTROL_CONFIG.DRAG_SENSITIVITY.rotation;
      this.phi = THREE.MathUtils.clamp(
        this.phi + dy * CAMERA_CONTROL_CONFIG.DRAG_SENSITIVITY.tilt,
        CAMERA_CONTROL_CONFIG.ORBIT_PHI_RANGE[0],
        CAMERA_CONTROL_CONFIG.ORBIT_PHI_RANGE[1]
      );
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
      const factor =
        event.deltaY > 0 ? CAMERA_CONTROL_CONFIG.WHEEL_ZOOM_FACTOR : 1 / CAMERA_CONTROL_CONFIG.WHEEL_ZOOM_FACTOR;
      this.followDist = THREE.MathUtils.clamp(
        this.followDist * factor,
        CAMERA_CONTROL_CONFIG.FOLLOW_DISTANCE_RANGE[0],
        CAMERA_CONTROL_CONFIG.FOLLOW_DISTANCE_RANGE[1]
      );
    } else {
      // 自由观察：滚轮缩放
      const factor =
        event.deltaY > 0 ? CAMERA_CONTROL_CONFIG.WHEEL_ZOOM_FACTOR : 1 / CAMERA_CONTROL_CONFIG.WHEEL_ZOOM_FACTOR;
      this.radius = THREE.MathUtils.clamp(
        this.radius * factor,
        CAMERA_CONTROL_CONFIG.ORBIT_RADIUS_RANGE[0],
        CAMERA_CONTROL_CONFIG.ORBIT_RADIUS_RANGE[1]
      );
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
    const scale = this.radius * CAMERA_CONTROL_CONFIG.DRAG_SENSITIVITY.pan;
    this.viewTarget.addScaledVector(right, -dx * scale);
    this.viewTarget.addScaledVector(up, dy * scale);

    const clamp = CAMERA_CONTROL_CONFIG.ORBIT_TARGET_CLAMP;
    this.viewTarget.x = THREE.MathUtils.clamp(this.viewTarget.x, clamp[0], clamp[1]);
    this.viewTarget.z = THREE.MathUtils.clamp(this.viewTarget.z, clamp[2], clamp[3]);
    // 贴近视角时目标点带高度，平移保留高度（限制在模型高度范围内），避免视角跳变
    this.viewTarget.y = THREE.MathUtils.clamp(this.viewTarget.y, clamp[4], clamp[5]);
  }

  private updateCamera() {
    // 自动巡检（patrol）：点位间镜头由 GSAP 运镜，停留时锁定预设机位 / 自动跟随
    if (this.cameraMode === 'patrol' && (this.patrol?.getTargetCount() ?? 0) > 0) {
      if (this.patrol?.getPhase() === 'transit') {
        // transit：镜头完全由 GSAP 时间轴写入（位置/注视点/fov），这里避免覆盖
        this.ensurePatrolFlight();
        return;
      }
      this.updateDwellCamera();
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

  /** 停留阶段自动跟随：注视点锁定设备中心，相机保持一定观察距离形成轻微俯视 */
  private updatePatrolFollow(lookTarget: THREE.Vector3) {
    const radius = this.patrol?.getFocusedTargetRadius() ?? 30;
    // 相机略高于设备中心形成轻微俯视（高度随设备大小适当调整）
    const height = THREE.MathUtils.clamp(
      radius * CAMERA_CONTROL_CONFIG.CAMERA_HEIGHT_FACTOR,
      CAMERA_CONTROL_CONFIG.CAMERA_HEIGHT_RANGE[0],
      CAMERA_CONTROL_CONFIG.CAMERA_HEIGHT_RANGE[1]
    );
    // 保证设备整体入画：相机到设备中心的直线距离需使包围球张角不超过 85% FOV
    const fovHalf = THREE.MathUtils.degToRad(this.camera.fov / 2);
    const minDist = (radius + 8) / Math.tan(fovHalf * CAMERA_CONTROL_CONFIG.FOV_COVERAGE_FACTOR);
    // 观察距离：贴近设备，不低于整体入画所需距离
    const dist3 = Math.max(Math.min(this.followDist, 42), minDist, height + 1);
    const flat = Math.sqrt(dist3 * dist3 - height * height);
    const theta = THREE.MathUtils.degToRad(this.theta);
    const desired = this.followPos.set(
      lookTarget.x + flat * Math.sin(theta),
      lookTarget.y + height,
      lookTarget.z + flat * Math.cos(theta)
    );

    // 遮挡检测优化：降低频率到每 8 帧一次，减少射线投射开销
    this.occlusionAccum += 1;
    if (this.occlusionAccum % CAMERA_CONTROL_CONFIG.OCCLUSION_CHECK_INTERVAL === 1) {
      this.resolvedCamPos.copy(this.resolveClearCamera(lookTarget, desired));
    }

    // 相机位置与注视点均做平滑插值，形成平稳的水平平移跟随
    this.camPos.lerp(this.resolvedCamPos, CAMERA_CONTROL_CONFIG.CAMERA_LERP_FACTORS[0]);
    this.camLook.lerp(lookTarget, CAMERA_CONTROL_CONFIG.CAMERA_LERP_FACTORS[1]);
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camLook);
  }

  /** 巡检停留阶段相机：预设机位锁定（未就位时 GSAP 补一次运镜）；未配置预设视角时自动跟随 */
  private updateDwellCamera() {
    const patrol = this.patrol;
    if (!patrol) return;
    const index = patrol.getCurrentIndex();
    if (index < 0) return;
    const pose = this.getTargetPose(index);
    if (pose) {
      // 镜头已在位则直接锁定；尚未就位（如从 orbit 切回）则用 GSAP 补一次运镜
      if (
        !this.flightTimeline?.isActive() &&
        this.camera.position.distanceTo(pose.position) > CAMERA_CONTROL_CONFIG.FLIGHT_ARRIVAL_THRESHOLD
      ) {
        this.flyCameraTo(pose, undefined);
        return;
      }
      this.camera.position.copy(pose.position);
      this.camera.lookAt(pose.target);
      if (Math.abs(this.camera.fov - pose.fov) > 0.01) {
        this.camera.fov = pose.fov;
        this.camera.updateProjectionMatrix();
      }
      this.camPos.copy(this.camera.position);
      this.camLook.copy(pose.target);
      return;
    }
    const aim = patrol.getFocusedTargetPosition();
    if (aim) this.updatePatrolFollow(aim);
  }

  /** 运镜阶段：确保存在一次朝向 pending 点位的 GSAP 运镜；该点位无预设视角时直接进入停留 */
  private ensurePatrolFlight() {
    const patrol = this.patrol;
    if (!patrol || patrol.getPhase() !== 'transit') return;
    if (this.flightTimeline && this.flightTimeline.isActive()) return;
    const pending = patrol.getPendingIndex();
    const pose = this.getTargetPose(pending);
    if (!pose) {
      // 点位未配置预设视角：无明确机位，由停留阶段的自动跟随算法平滑就位
      patrol.completeTransit();
      return;
    }
    this.flyCameraTo(pose, () => patrol.completeTransit());
  }

  /**
   * GSAP 运镜：从当前镜头平滑飞到目标机位。
   * 位置 / 注视点 / fov 分别补间并采用不同缓动：注视点先转向目标（先看清下一个设备），
   * 镜头随后平移推进，fov 同步过渡，形成"关注点切换 -> 运镜到达"的镜头语言。
   */
  private flyCameraTo(pose: PatrolCamPose, onComplete: (() => void) | undefined) {
    // 起点 = 当前相机位姿；注视起点取视线前方远点，避免起飞瞬间镜头转动生硬
    const from = this.camera.position;
    this.camera.getWorldDirection(this.camDir);
    this.flightPos.x = from.x;
    this.flightPos.y = from.y;
    this.flightPos.z = from.z;
    const lookStartDist = CAMERA_CONTROL_CONFIG.FLIGHT_LOOK_START_DISTANCE;
    this.flightLook.x = from.x + this.camDir.x * lookStartDist;
    this.flightLook.y = from.y + this.camDir.y * lookStartDist;
    this.flightLook.z = from.z + this.camDir.z * lookStartDist;
    this.flightFov.v = this.camera.fov;

    const distance = from.distanceTo(pose.position);
    // 运镜时长随距离缩放：保持较长的缓行区间，到达前减速滑入，避免镜头"冲"到目标
    const duration = THREE.MathUtils.clamp(
      distance / CAMERA_CONTROL_CONFIG.FLIGHT_DURATION_FACTOR,
      CAMERA_CONTROL_CONFIG.FLIGHT_DURATION_RANGE[0],
      CAMERA_CONTROL_CONFIG.FLIGHT_DURATION_RANGE[1]
    );

    const apply = () => {
      this.camera.position.set(this.flightPos.x, this.flightPos.y, this.flightPos.z);
      this.camera.lookAt(this.flightLook.x, this.flightLook.y, this.flightLook.z);
      if (Math.abs(this.camera.fov - this.flightFov.v) > 0.01) {
        this.camera.fov = this.flightFov.v;
        this.camera.updateProjectionMatrix();
      }
    };

    this.flightTimeline?.kill();
    this.flightTimeline = undefined;
    const tl = gsap.timeline({
      onComplete: () => {
        this.flightTimeline = undefined;
        apply();
        onComplete?.();
      },
    });
    // 三轨交错：注视点先转过去（0.8 倍时长，先看清目标），镜头随后跟进，fov 平滑过渡。
    // 位置与注视点均用 power2.inOut 三次缓入缓出：出发缓慢、中段推进、临近目标明显减速滑入，
    // 到点瞬间速度趋零，避免"快速冲到设备前戛然而止"的生硬感
    tl.to(
      this.flightPos,
      {
        x: pose.position.x,
        y: pose.position.y,
        z: pose.position.z,
        duration,
        ease: 'power2.inOut',
        onUpdate: apply,
      },
      0
    );
    tl.to(
      this.flightLook,
      {
        x: pose.target.x,
        y: pose.target.y,
        z: pose.target.z,
        duration: duration * CAMERA_CONTROL_CONFIG.FLIGHT_LOOK_DURATION_FACTOR,
        ease: 'power2.inOut',
        onUpdate: apply,
      },
      0
    );
    tl.to(
      this.flightFov,
      {
        v: pose.fov,
        duration: duration * CAMERA_CONTROL_CONFIG.FLIGHT_FOV_DURATION_FACTOR,
        ease: 'sine.inOut',
        onUpdate: apply,
      },
      0
    );
    this.flightTimeline = tl;
    apply();
  }

  /** 点位预设机位（未配置预设视角的点位返回 undefined）；解析结果惰性缓存 */
  private getTargetPose(index: number): PatrolCamPose | undefined {
    if (this.poseCache) return this.poseCache[index];
    const targets = this.patrol?.getTargets();
    if (!targets || targets.length === 0) return undefined;
    this.poseCache = targets.map((target) => {
      const viewpoint = target.viewpoint;
      if (!viewpoint?.position || !viewpoint.target) return undefined;
      return {
        position: new THREE.Vector3().fromArray(viewpoint.position),
        target: new THREE.Vector3().fromArray(viewpoint.target),
        fov: viewpoint.fov && viewpoint.fov > 0 ? viewpoint.fov : SCENE_CONFIG.cameraFov,
      };
    });
    return this.poseCache[index];
  }

  /**
   * 找到能看见目标主体的相机位置：
   * 保持同一高度水平视角，被遮挡时仅沿视线方向拉近（不做抬升/俯视动作），
   * 保证镜头始终水平平移、直接到达目标附近。
   *
   * 性能优化：限制射线投射递归深度为 false（只检测顶层模型容器），
   * 避免遍历所有子节点，显著降低复杂场景开销。
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

  /**
   * 目标 -> 相机方向上是否有遮挡物（排除当前巡检目标自身）
   *
   * 性能优化：不递归检查所有子节点（recursive = false），
   * 只检测模型根节点的直接子级（glb-facade / glb-interior 容器），
   * 大幅减少射线投射的计算量。
   */
  private isCameraBlocked(from: THREE.Vector3, to: THREE.Vector3) {
    const dir = to.clone().sub(from);
    const dist = dir.length();
    if (dist < 1) return false;
    dir.normalize();
    this.raycaster.set(from, dir);
    this.raycaster.far = dist;

    // 性能优化：不递归检查所有子节点，只检测顶层容器
    // 足以判断是否被外立面或主要结构遮挡，无需精确到细小部件
    const hits = this.raycaster.intersectObjects(this.modelRoot.children, false);

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
    this.updateCamera();
    this.emitTargetScreenPos();
    this.renderer.render(this.scene, this.camera);
  };

  /**
   * 每帧上报当前巡检目标在屏幕上的投影位置（设备上方一点），
   * 供外部把"巡检结果卡片"锚定到设备上方。非巡检模式或无目标时上报 null。
   *
   * 性能优化：仅在 patrol 模式且 dwelling 状态时才计算投影，避免无效计算。
   */
  private emitTargetScreenPos() {
    const cb = this.callbacks.onTargetScreenPosition;
    if (!cb) return;

    // 优化：仅在自动巡检模式且停留阶段时才计算屏幕投影
    // 避免在 orbit 模式、transit 阶段或无巡检对象时的每帧无效计算
    if (this.cameraMode !== 'patrol' || !this.patrol?.isDwelling()) {
      cb(null);
      return;
    }

    const aim = this.patrol.getFocusedTargetPosition();
    if (!aim) {
      cb(null);
      return;
    }

    // 投影点取设备顶部偏下一点，让卡片覆盖部分模型，避免离设备太远
    const radius = this.patrol.getFocusedTargetRadius() ?? 30;
    const proj = this.projPoint
      .set(aim.x, aim.y + radius * UI_CONFIG.CARD_ANCHOR_HEIGHT_FACTOR, aim.z)
      .project(this.camera);

    // 检查投影点是否在视锥体内（z 在 [-1, 1] 范围）
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
