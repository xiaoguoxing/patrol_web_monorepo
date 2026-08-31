import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { PatrolController } from './patrolController';
import type { WaterPlantSceneCallbacks } from './types';

/** 模型标识：facade 外立面 / interior 内部结构 */
type ModelKey = 'facade' | 'interior';

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
  /** 外立面是否已隐藏 */
  private facadeHidden = false;
  /** 全局人眼观察高度（整体模型中部的 y），镜头全程保持该高度水平平移，不做拉升动作 */
  private globalLookY = 0;
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
  private followView = true;
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

  /** 切换外立面显示/隐藏（隐藏后可直接看清内部设备），返回当前是否已隐藏 */
  public toggleFacade() {
    const facade = this.modelRoot.getObjectByName('glb-facade');
    if (!facade) return this.facadeHidden;
    this.facadeHidden = !this.facadeHidden;
    facade.visible = !this.facadeHidden;
    return this.facadeHidden;
  }

  public toggleFollowView() {
    this.followView = !this.followView;
    return this.followView;
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
    this.scene.fog = null;
    this.renderer.renderLists.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    canvas.remove();
    this.scene.clear();
  }

  /**
   * 灯光布置（保证内部结构明亮、地面不过曝）：
   * - 主光：太阳光（暖白方向光，带阴影）
   * - 环境光/半球光：保持较低强度，避免地面被全局光糊成白色
   * - 多方向方向光补光（不投阴影，穿透半透明外壳）：从正面/背面/侧面/底部/顶部照亮内部结构
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
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.4));
    this.scene.add(new THREE.HemisphereLight(0xddeeff, 0x3a4a5a, 0.9));
    // 多方向补光（无阴影，穿透外壳照亮内部）
    this.scene.add(new THREE.DirectionalLight(0xa8d4ff, 1.2));
    const back = new THREE.DirectionalLight(0xa8d4ff, 0.7);
    back.position.set(-600, 300, -600);
    this.scene.add(back);
    const side = new THREE.DirectionalLight(0xffeedd, 0.7);
    side.position.set(600, 200, -600);
    this.scene.add(side);
    const bottom = new THREE.DirectionalLight(0xffffff, 0.8);
    bottom.position.set(0, -400, 0);
    this.scene.add(bottom);
    const top = new THREE.DirectionalLight(0xffffff, 0.6);
    top.position.set(0, 1000, 0);
    this.scene.add(top);
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
    // 全局人眼观察高度：整体模型中部的 y，镜头全程保持该高度水平平移
    this.globalLookY = new THREE.Box3().setFromObject(this.modelRoot).getCenter(new THREE.Vector3()).y;
    this.initPatrol();
    this.fitAll();
    this.callbacks.onModelLoaded?.();
  }

  /** 基于模型 id 列表创建巡检控制器（模型加载完成后调用） */
  private initPatrol() {
    this.patrol = new PatrolController({
      scene: this.scene,
      root: this.modelRoot,
      ids: PATROL_IDS,
      onChange: (snapshot) => this.callbacks.onPatrolChange(snapshot),
    });
    // 巡检开始后默认开启视角跟随；未配置巡检对象时保持自由视角
    this.followView = this.patrol.getTargetCount() > 0;
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

  /** 自由视角键盘行走：W/S 前进后退、A/D 左右平移、Q/E 升降、方向键旋转与前进后退 */
  private updateFreeMove(delta: number) {
    if (this.followView || this.keys.size === 0) return;
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
    if (this.followView && (this.patrol?.getTargetCount() ?? 0) > 0) {
      // 跟随模式：滚轮调整观察距离
      this.followDist = THREE.MathUtils.clamp(this.followDist * (event.deltaY > 0 ? 1.09 : 0.92), 40, 900);
    } else {
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
    // 跟随模式：以固定人眼高度、平滑平移的方式跟随巡检位置，不自动旋转、不晃动
    const dwelling = this.patrol?.isDwelling() ?? false;
    const aim = dwelling ? this.patrol?.getFocusedTargetPosition() : this.patrol?.getPathPosition();
    if (this.followView && aim) {
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
    // 自由视角：球坐标手动旋转/平移
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
    this.updateFreeMove(delta);
    this.updateCamera();
    this.renderer.render(this.scene, this.camera);
  };
}
