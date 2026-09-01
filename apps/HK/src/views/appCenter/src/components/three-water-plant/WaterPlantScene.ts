import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { PatrolController } from './patrolController';
import type { WaterPlantSceneCallbacks } from './types';

/** 模型标识：facade 外立面 / interior 内部结构 */
type ModelKey = 'facade' | 'interior';

/**
 * 相机模式（设计文档明确拆分的三套相机）：
 * - orbit  全景浏览：球坐标环绕（左键旋转 / 右键平移 / 滚轮缩放 / 预设视角）
 * - walk   厂房漫游：第一人称，camera.position 即玩家位置，WASD 移动 + 鼠标转动视角
 * - patrol 自动巡检：跟随巡检目标，镜头平滑平移、被遮挡自动拉近
 */
export type CameraMode = 'orbit' | 'walk' | 'patrol';

/** 外立面显示模式：show 显示 / transparent 透视 / hidden 隐藏 */
export type FacadeMode = 'show' | 'transparent' | 'hidden';

interface ModelSource {
  key: ModelKey;
  label: string;
  file: string;
  facade: boolean;
}

interface ModelLoadingState {
  loaded: number;
  total: number;
}

/** 模型归一化后的最大边长（世界单位） */
const TARGET_SIZE = 1200;

const MODELS: ModelSource[] = [
  { key: 'facade', label: '外立面', file: 'TWFWPS_WLM.glb', facade: true },
  { key: 'interior', label: '内部结构', file: 'TWFWPS_SNSB.glb', facade: false },
];

/**
 * 巡检对象模型 id 列表（对应 GLB 内的节点名 / 对象名）。
 * 由业务侧提供（从 Babylon 场景调试中导出）：
 *   Line009 / Line012 / Line013 / Line019 / Line020 / Line021 / Line023 / Line024
 *   Rectangle008 / Rectangle019 ~ Rectangle028
 * 巡检会依次定位到这些节点。
 */
const PATROL_IDS: string[] = [
  'Line009',
  'Line012',
  'Line013',
  'Line020',
  'Line019',
  'Line021',
  'Rectangle008',
  'Line023',
  'Line024',
  'Rectangle019',
  'Rectangle020',
  'Rectangle021',
  'Rectangle022',
  'Rectangle023',
  'Rectangle024',
  'Rectangle025',
  'Rectangle026',
  'Rectangle027',
  'Rectangle028',
];

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
  private readonly camera = new THREE.PerspectiveCamera(46, 1, 1, 9000);
  private readonly renderer: THREE.WebGLRenderer;
  private readonly viewTarget = new THREE.Vector3();
  /** 跟随模式的平滑相机位置/注视点（避免镜头晃动） */
  private readonly camPos = new THREE.Vector3();
  private readonly camLook = new THREE.Vector3();
  private readonly followPos = new THREE.Vector3();
  /** 遮挡检测：目标 -> 相机的射线与解析出的无遮挡相机位置 */
  private readonly raycaster = new THREE.Raycaster();
  private readonly resolvedCamPos = new THREE.Vector3();
  /** 跟随模式下的观察距离（滚轮可调） */
  private followDist = 110;
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
  /** 全局人眼观察高度（整体模型中部的 y），镜头全程保持该高度水平平移，不做拉升动作 */
  private globalLookY = 0;
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
    this.addLights();
    this.addEnvironment();
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
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  public advanceToNextTarget() {
    this.patrol?.advanceToNextTarget();
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
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.LineSegments) {
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => {
          Object.values(material).forEach((value: unknown) => {
            if (value instanceof THREE.Texture) value.dispose();
          });
          material.dispose();
        });
      }
    });
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

  /**
   * 灯光布置（少而精，突出立体感）：
   * - 主光：太阳光（暖白方向光，带阴影，提供主体积感）
   * - 环境光/半球光：低强度，仅防止纯黑
   * - 内部补光（无阴影，穿透半透明外壳照亮内部设备）：仅正面方向光 + 顶部柔光，
   *   避免多方向直射导致模型整体过亮、阴影变弱、失去工业层次。
   */
  private addLights() {
    const sun = new THREE.DirectionalLight(0xfff3de, 2.8);
    sun.position.set(500, 900, 300);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -1800;
    sun.shadow.camera.right = 1800;
    sun.shadow.camera.top = 1800;
    sun.shadow.camera.bottom = -1800;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 4000;
    sun.shadow.bias = -0.0006;
    sun.shadow.normalBias = 0.6;
    this.scene.add(sun);
    // 基础环境光：低强度，仅防止纯黑
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.35));
    this.scene.add(new THREE.HemisphereLight(0xddeeff, 0x3a4a5a, 0.85));
    // 内部补光：正面方向光 + 顶部柔光
    const fill = new THREE.DirectionalLight(0xa8d4ff, 0.9);
    fill.position.set(0, 300, 600);
    this.scene.add(fill);
    const topFill = new THREE.DirectionalLight(0xffffff, 0.5);
    topFill.position.set(0, 800, 0);
    this.scene.add(topFill);
  }

  /**
   * 场景环境：
   * - 蓝天白云全景背景（Canvas 程序化生成，随视角旋转）
   * - 雾效：远处地面融入天空，增强纵深
   * - 水泥地面：程序化生成水泥纹理，接收模型阴影
   */
  private addEnvironment() {
    const skyTexture = this.createSkyTexture();
    skyTexture.mapping = THREE.EquirectangularReflectionMapping;
    this.scene.background = skyTexture;
    // 雾色取天空地平线附近的灰蓝色，让远处地面自然融入背景
    this.scene.fog = new THREE.Fog(0xbfd5e4, 3200, 8500);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(9000, 9000),
      new THREE.MeshStandardMaterial({
        map: this.createGroundTexture(),
        color: 0xb9b9b2,
        roughness: 0.95,
        metalness: 0,
      })
    );
    ground.rotation.x = -Math.PI / 2;
    // 略低于模型底面，避免与模型底部 z-fighting
    ground.position.y = -1;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // 环境反射（HDR 的替代实现）：程序生成的柔和工业环境经 PMREM 烘焙后赋给
    // scene.environment，让金属/设备材质获得自然的环境反射与补光；
    // 背景仍用上面的天空纹理，避免环境贴图过于抢眼。
    const envTexture = this.createEnvTexture();
    envTexture.mapping = THREE.EquirectangularReflectionMapping;
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const envRT = pmrem.fromEquirectangular(envTexture);
    this.scene.environment = envRT.texture;
    pmrem.dispose();
    envTexture.dispose();
  }

  /**
   * 生成用于环境反射的工业风环境纹理（上天空 / 下灰地面）。
   * 亮度保持柔和，避免 Reinhard 曝光下金属设备过曝。
   */
  private createEnvTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return new THREE.CanvasTexture(canvas);
    // 上方柔和天空渐变，下方灰水泥地面（形成明暗层次，反射更有立体感）
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#3f7fbf');
    gradient.addColorStop(0.5, '#9cc4e4');
    gradient.addColorStop(0.58, '#77848a');
    gradient.addColorStop(1, '#394248');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const texture = new THREE.CanvasTexture(canvas);
    texture.format = THREE.RGBAFormat;
    texture.type = THREE.UnsignedByteType;
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  /** 用 Canvas 生成蓝天白云全景纹理（宽高比 2:1，适配 Equirectangular 背景） */
  private createSkyTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    if (!ctx) return new THREE.CanvasTexture(canvas);
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#2f6fc0');
    gradient.addColorStop(0.45, '#6ea8de');
    gradient.addColorStop(0.72, '#bcdcf2');
    gradient.addColorStop(0.9, '#e8f5fe');
    gradient.addColorStop(1, '#eef8ff');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // 散落的云朵（上半天空域）
    this.drawCloud(ctx, 420, 300, 90);
    this.drawCloud(ctx, 1000, 210, 70);
    this.drawCloud(ctx, 1560, 330, 100);
    this.drawCloud(ctx, 1850, 190, 60);
    this.drawCloud(ctx, 720, 450, 55);
    this.drawCloud(ctx, 1300, 470, 45);
    const texture = new THREE.CanvasTexture(canvas);
    texture.format = THREE.RGBAFormat;
    texture.type = THREE.UnsignedByteType;
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  /** 画一朵由多个椭圆拼成的蓬松白云 */
  private drawCloud(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
    const blobs: Array<[number, number, number]> = [
      [-1.5, 0.25, 0.95],
      [-0.85, -0.35, 0.85],
      [0, -0.6, 1.05],
      [0.85, -0.3, 0.9],
      [1.5, 0.15, 0.75],
      [0.1, 0.15, 0.8],
    ];
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
    blobs.forEach(([dx, dy, dr]) => {
      ctx.beginPath();
      ctx.ellipse(x + dx * r, y + dy * r, r * dr, r * dr * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
    });
    // 底部轻微阴影，让云更有体积感
    ctx.fillStyle = 'rgba(210, 228, 242, 0.5)';
    ctx.beginPath();
    ctx.ellipse(x, y + r * 0.55, r * 1.6, r * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /** 用 Canvas 生成水泥地面纹理（灰底 + 颗粒噪点 + 分割缝） */
  private createGroundTexture(): THREE.CanvasTexture {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return new THREE.CanvasTexture(canvas);
    // 灰底（带轻微明暗变化）
    const base = ctx.createLinearGradient(0, 0, size, size);
    base.addColorStop(0, '#8d8d86');
    base.addColorStop(1, '#7b7b74');
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, size, size);
    // 颗粒噪点
    for (let i = 0; i < 6000; i++) {
      const v = Math.floor(90 + Math.random() * 55);
      ctx.fillStyle = `rgba(${v}, ${v}, ${v - 8}, ${0.12 + Math.random() * 0.18})`;
      ctx.fillRect(Math.random() * size, Math.random() * size, 1.5 + Math.random() * 1.5, 1.5 + Math.random() * 1.5);
    }
    // 水泥分割缝（十字网格，加粗加深，保证可见）
    ctx.strokeStyle = 'rgba(60, 60, 54, 0.55)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(size / 2, 0);
    ctx.lineTo(size / 2, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, size / 2);
    ctx.lineTo(size, size / 2);
    ctx.stroke();
    // 细缝线
    ctx.strokeStyle = 'rgba(70, 70, 64, 0.35)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(size / 4, 0);
    ctx.lineTo(size / 4, size);
    ctx.moveTo(size * 0.75, 0);
    ctx.lineTo(size * 0.75, size);
    ctx.moveTo(0, size / 4);
    ctx.lineTo(size, size / 4);
    ctx.moveTo(0, size * 0.75);
    ctx.lineTo(size, size * 0.75);
    ctx.stroke();
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(16, 16);
    texture.anisotropy = 8;
    texture.format = THREE.RGBAFormat;
    texture.type = THREE.UnsignedByteType;
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

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
    // 全局人眼观察高度：整体模型中部的 y，镜头全程保持该高度水平平移
    this.globalLookY = this.modelCenter.y;
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
      this.disposeObject(child);
    }
  }

  private disposeObject(root: THREE.Object3D) {
    root.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.LineSegments) {
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => {
          Object.values(material).forEach((value) => {
            if (value instanceof THREE.Texture) value.dispose();
          });
          material.dispose();
        });
      }
    });
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
    // 自动巡检（patrol）：以固定人眼高度、平滑平移的方式跟随巡检位置，不自动旋转、不晃动
    const dwelling = this.patrol?.isDwelling() ?? false;
    const aim = dwelling ? this.patrol?.getFocusedTargetPosition() : this.patrol?.getPathPosition();
    if (this.cameraMode === 'patrol' && aim) {
      // 注视点固定在全局人眼观察高度：镜头只做水平平移，直接到达下一个点，不做拉升/俯冲动作
      const lookY = this.globalLookY > 0 ? this.globalLookY : aim.y;
      const lookTarget = new THREE.Vector3(aim.x, lookY, aim.z);
      // 人眼高度由 phi（用户俯仰控制）决定，默认约 66，接近人在设备间行走的视线高度
      const height = 30 + this.phi * 0.8;
      // 观察距离：停留时贴近目标（不超过用户滚轮设定的距离），巡航时保持中距
      const dist = dwelling ? Math.min(this.followDist, 60) : this.followDist;
      const theta = THREE.MathUtils.degToRad(this.theta);
      const desired = this.followPos.set(
        lookTarget.x + dist * Math.sin(theta),
        lookTarget.y + height,
        lookTarget.z + dist * Math.cos(theta)
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
      if (!this.isRaycastVisible(hit.object)) continue;
      // 跳过当前巡检目标自身
      if (focused && this.isObjectOrChildOf(focused, hit.object)) continue;
      return true;
    }
    return false;
  }

  /** 判断对象在场景中是否可见（自身及祖先链上的 visible 都为 true） */
  private isRaycastVisible(object: THREE.Object3D) {
    let node: THREE.Object3D | null = object;
    while (node) {
      if (!node.visible) return false;
      node = node.parent;
    }
    return true;
  }

  /** 判断 object 是否为 root 自身或其子孙节点（兼容旧版本 three，替代 Object3D.contains） */
  private isObjectOrChildOf(root: THREE.Object3D, object: THREE.Object3D) {
    let node: THREE.Object3D | null = object;
    while (node) {
      if (node === root) return true;
      node = node.parent;
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
    this.renderer.render(this.scene, this.camera);
  };
}
