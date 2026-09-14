import * as THREE from 'three';
import { SCENE_CONFIG } from './constants';
import { createCanvasTexture } from './utils';

/**
 * 水厂场景公共环境（配置视角页与巡视页共用，保证视觉一致）：
 * - 灯光：太阳光（主方向光，带阴影）+ 环境光/半球光 + 内部补光
 * - 环境：蓝天白云全景背景 + 雾效 + 水泥地面 + PMREM 环境反射
 */

/**
 * 灯光布置（与巡视场景完全一致）：
 * - 主光：太阳光（暖白方向光，带阴影，提供主体积感）
 * - 环境光/半球光：低强度，仅防止纯黑
 * - 内部补光（无阴影，穿透照亮内部设备）：正面方向光 + 顶部柔光
 */
export function addSceneLights(scene: THREE.Scene): void {
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
  scene.add(sun);
  // 基础环境光：低强度，仅防止纯黑
  scene.add(new THREE.AmbientLight(0xffffff, 0.35));
  scene.add(new THREE.HemisphereLight(0xddeeff, 0x3a4a5a, 0.85));
  // 内部补光：正面方向光 + 顶部柔光
  const fill = new THREE.DirectionalLight(0xa8d4ff, 0.9);
  fill.position.set(0, 300, 600);
  scene.add(fill);
  const topFill = new THREE.DirectionalLight(0xffffff, 0.5);
  topFill.position.set(0, 800, 0);
  scene.add(topFill);
}

/**
 * 场景环境（与巡视场景完全一致）：
 * - 蓝天白云全景背景（Canvas 程序化生成，随视角旋转）
 * - 雾效：远处地面融入天空，增强纵深
 * - 水泥地面：程序化生成水泥纹理，接收模型阴影
 * - 环境反射：工业风环境经 PMREM 烘焙后赋给 scene.environment
 */
export function addSceneEnvironment(scene: THREE.Scene, renderer: THREE.WebGLRenderer): void {
  const skyTexture = createSkyTexture();
  skyTexture.mapping = THREE.EquirectangularReflectionMapping;
  scene.background = skyTexture;
  // 雾色取天空地平线附近的灰蓝色，让远处地面自然融入背景
  scene.fog = new THREE.Fog(SCENE_CONFIG.fogColor, SCENE_CONFIG.fogNear, SCENE_CONFIG.fogFar);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(SCENE_CONFIG.groundSize, SCENE_CONFIG.groundSize),
    new THREE.MeshStandardMaterial({
      map: createGroundTexture(),
      color: SCENE_CONFIG.groundColor,
      roughness: 0.95,
      metalness: 0,
    })
  );
  ground.rotation.x = -Math.PI / 2;
  // 略低于模型底面，避免与模型底部 z-fighting
  ground.position.y = -1;
  ground.receiveShadow = true;
  scene.add(ground);

  // 环境反射（HDR 的替代实现）：程序生成的柔和工业环境经 PMREM 烘焙后赋给
  // scene.environment，让金属/设备材质获得自然的环境反射与补光；
  // 背景仍用上面的天空纹理，避免环境贴图过于抢眼。
  const envTexture = createEnvTexture();
  envTexture.mapping = THREE.EquirectangularReflectionMapping;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envRT = pmrem.fromEquirectangular(envTexture);
  scene.environment = envRT.texture;
  pmrem.dispose();
  envTexture.dispose();
}

/**
 * 生成用于环境反射的工业风环境纹理（上天空 / 下灰地面）。
 * 亮度保持柔和，避免 Reinhard 曝光下金属设备过曝。
 */
function createEnvTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return createCanvasTexture(canvas);
  // 上方柔和天空渐变，下方灰水泥地面（形成明暗层次，反射更有立体感）
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, '#3f7fbf');
  gradient.addColorStop(0.5, '#9cc4e4');
  gradient.addColorStop(0.58, '#77848a');
  gradient.addColorStop(1, '#394248');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  return createCanvasTexture(canvas);
}

/** 用 Canvas 生成蓝天白云全景纹理（宽高比 2:1，适配 Equirectangular 背景） */
function createSkyTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  if (!ctx) return createCanvasTexture(canvas);
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, '#2f6fc0');
  gradient.addColorStop(0.45, '#6ea8de');
  gradient.addColorStop(0.72, '#bcdcf2');
  gradient.addColorStop(0.9, '#e8f5fe');
  gradient.addColorStop(1, '#eef8ff');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  // 散落的云朵（上半天空域）
  drawCloud(ctx, 420, 300, 90);
  drawCloud(ctx, 1000, 210, 70);
  drawCloud(ctx, 1560, 330, 100);
  drawCloud(ctx, 1850, 190, 60);
  drawCloud(ctx, 720, 450, 55);
  drawCloud(ctx, 1300, 470, 45);
  return createCanvasTexture(canvas);
}

/** 画一朵由多个椭圆拼成的蓬松白云 */
function drawCloud(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
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
function createGroundTexture(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return createCanvasTexture(canvas);
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
  const texture = createCanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(SCENE_CONFIG.groundRepeat, SCENE_CONFIG.groundRepeat);
  texture.anisotropy = 8;
  return texture;
}
