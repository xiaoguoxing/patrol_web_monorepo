/**
 * 水厂三维巡检场景公共常量
 *
 * 配置视角页（viewpoint/ViewpointPicker）与巡视页（three-water-plant/WaterPlantScene）
 * 共用同一套 GLB 模型与归一化参数，保证保存的视角坐标在两侧可直接互通。
 */

/** 模型归一化后的最大边长（世界单位），两侧必须保持一致 */
export const TARGET_SIZE = 1200;

/** GLB 模型文件名 */
export const WATER_PLANT_GLB_FILES = {
  /** 外立面 */
  FACADE: 'TWFWPS_WLM.glb',
  /** 内部结构（巡检对象所在） */
  INTERIOR: 'TWFWPS_SNSB.glb',
} as const;

/** 模型标识：facade 外立面 / interior 内部结构 */
export type WaterPlantModelKey = 'facade' | 'interior';

/** 模型源配置 */
export interface WaterPlantModelSource {
  key: WaterPlantModelKey;
  label: string;
  file: string;
  /** 是否为外立面（需半透明处理） */
  facade: boolean;
}

/** 水厂模型源列表（外立面 + 内部结构） */
export const WATER_PLANT_MODELS: WaterPlantModelSource[] = [
  { key: 'facade', label: '外立面', file: WATER_PLANT_GLB_FILES.FACADE, facade: true },
  { key: 'interior', label: '内部结构', file: WATER_PLANT_GLB_FILES.INTERIOR, facade: false },
];

/**
 * 巡检点位配置：modelId 用于定位设备；
 * position/target/fov/distance 为可选预设视角，由"配置视角"页保存（viewpoint/ViewpointPicker）。
 * 巡检停留在该点位时，若配置了预设视角则相机直接采用该视角，否则使用自动跟随算法。
 */
export interface PatrolViewpoint {
  /** 模型节点 id（对应 GLB 内的对象名，如 Line009 / Rectangle004） */
  modelId: string;
  /** 预设相机位置 [x, y, z] */
  position?: number[];
  /** 预设相机注视点 [x, y, z] */
  target?: number[];
  /** 预设视野角度（默认取 SCENE_CONFIG.cameraFov） */
  fov?: number;
  /** 相机到注视点的距离（辅助校验） */
  distance?: number;
}

/**
 * 巡检点位列表（对应 GLB 内的节点名 / 对象名）。
 * 由业务侧提供（从 Babylon 场景调试中导出）：
 *   Line009 / Line012 / Line013 / Line019 / Line020 / Line021 / Line023 / Line024
 *   Rectangle008 / Rectangle019 ~ Rectangle028
 * 巡检会依次定位到这些节点；配置了 position/target 的点位在停留时使用预设视角。
 */
export const PATROL_IDS: PatrolViewpoint[] = [
  {
    modelId: 'Line009',
    position: [490.48, 103.67, 99.13],
    target: [397.94, 72.97, 78.01],
    fov: 46,
    distance: 99.75,
  },
  {
    modelId: 'Line012',
    position: [425.71, 105.79, 110.43],
    target: [335.71, 69.02, 70.76],
    fov: 46,
    distance: 105,
  },
  {
    modelId: 'Line013',
    position: [389, 104.07, 112.2],
    target: [268.29, 76.96, 75.95],
    fov: 46,
    distance: 128.92,
  },
  {
    modelId: 'Object011',
    position: [314.05, 104.77, 109.82],
    target: [234.51, 71.59, 70.41],
    fov: 46,
    distance: 94.77,
  },
  {
    modelId: 'Line019',
    position: [264.4, 102.7, 106.41],
    target: [190.57, 76.38, 90.42],
    fov: 46,
    distance: 80,
  },
  {
    modelId: 'Line021',
    position: [218.31, 108.27, 112.54],
    target: [132.31, 75.5, 83.53],
    fov: 46,
    distance: 96.5,
  },
  {
    modelId: 'Rectangle008',
    position: [157.94, 99.13, 108.86],
    target: [62.54, 73.07, 81.38],
    fov: 46,
    distance: 102.65,
  },
  {
    modelId: 'Line023',
    position: [98.24, 104.83, 102.7],
    target: [26.32, 72.66, 88.82],
    fov: 46,
    distance: 80,
  },
  {
    modelId: 'Line024',
    position: [61.63, 99.15, 104.36],
    target: [-44.61, 67.84, 78.86],
    fov: 46,
    distance: 113.65,
  },
  {
    modelId: 'Rectangle004',
    position: [33.1, 303.85, 149.47],
    target: [-46.76, 239.95, 69.61],
    fov: 46,
    distance: 129.76,
  },
  {
    modelId: 'Object023',
    position: [72.22, 295.69, 140.44],
    target: [3.76, 240.91, 71.98],
    fov: 46,
    distance: 111.25,
  },
  {
    modelId: 'Object022',
    position: [122.91, 284.66, 130.15],
    target: [62.47, 236.3, 69.69],
    fov: 46,
    distance: 98.22,
  },
  {
    modelId: 'Object021',
    position: [175.5, 283.74, 131.95],
    target: [115.06, 235.38, 71.49],
    fov: 46,
    distance: 98.22,
  },
  {
    modelId: 'Object020',
    position: [227.69, 279.8, 129.09],
    target: [170.26, 233.85, 71.66],
    fov: 46,
    distance: 93.31,
  },
  {
    modelId: 'Object019',
    position: [277.88, 287.01, 136.77],
    target: [216.1, 237.57, 74.98],
    fov: 46,
    distance: 100.4,
  },
  {
    modelId: 'Object018',
    position: [332.68, 284.46, 129.05],
    target: [275.26, 238.52, 71.62],
    fov: 46,
    distance: 93.31,
  },
  {
    modelId: 'Object017',
    position: [390.49, 279.65, 135.55],
    target: [330.04, 231.29, 75.1],
    fov: 46,
    distance: 98.22,
  },
  {
    modelId: 'Object016',
    position: [436.88, 277.55, 129.96],
    target: [382.32, 233.91, 75.41],
    fov: 46,
    distance: 88.64,
  },
  {
    modelId: 'Rectangle027',
    position: [-98.2, 229.41, -88.6],
    target: [-62.53, 187.71, -30.4],
    fov: 46,
    distance: 80,
  },
  {
    modelId: 'Rectangle028',
    position: [-164.45, 228.28, -113.78],
    target: [-135.95, 194.47, -47.11],
    fov: 46,
    distance: 80,
  },
  {
    modelId: 'Rectangle026',
    position: [-81.07, 216.53, -121.7],
    target: [-37.35, 190.21, -60.1],
    fov: 46,
    distance: 80,
  },
  {
    modelId: 'Rectangle025',
    position: [27.64, 226.67, -106.53],
    target: [73.94, 184.2, -57.02],
    fov: 46,
    distance: 80,
  },
  {
    modelId: 'Rectangle024',
    position: [169.43, 228.55, -117.33],
    target: [216.87, 193.92, -63.01],
    fov: 46,
    distance: 80,
  },
  {
    modelId: 'Rectangle023',
    position: [242.16, 221.49, -115.56],
    target: [286.1, 187.68, -57.88],
    fov: 46,
    distance: 80,
  },
  {
    modelId: 'Rectangle022',
    position: [303.91, 225.34, -113.9],
    target: [343.17, 186.73, -55.87],
    fov: 46,
    distance: 80,
  },
  {
    modelId: 'Rectangle021',
    position: [352.08, 228.39, -104.71],
    target: [400.91, 184.41, -59.08],
    fov: 46,
    distance: 80,
  },
  {
    modelId: 'Rectangle020',
    position: [482.23, 223.54, -117.96],
    target: [516.59, 184.15, -57.4],
    fov: 46,
    distance: 80,
  },
  {
    modelId: 'Rectangle019',
    position: [553.81, 219.84, -123.19],
    target: [581.57, 186.03, -56.21],
    fov: 46,
    distance: 80,
  },
];

/** 场景公共参数（相机裁剪 / 视野 / 雾 / 地面） */
export const SCENE_CONFIG = {
  /** 相机近裁剪面 */
  cameraNear: 1,
  /** 相机默认视野角度 */
  cameraFov: 46,
  /** 相机远裁剪面 */
  cameraFar: 9000,
  /** 雾色：天空地平线附近的灰蓝色，让远处地面自然融入背景 */
  fogColor: 0xbfd5e4,
  fogNear: 3200,
  fogFar: 8500,
  /** 水泥地面边长（世界单位） */
  groundSize: 9000,
  /** 地面基色 */
  groundColor: 0xb9b9b2,
  /** 地面纹理重复次数 */
  groundRepeat: 16,
} as const;
