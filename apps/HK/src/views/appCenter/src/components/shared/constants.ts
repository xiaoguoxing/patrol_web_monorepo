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
  FACADE: 'TWFWPS-S-0-00.glb',
  /** 内部结构（巡检对象所在） */
  INTERIOR: 'TWFWPS-M-0-00-optimized.glb',
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
  /** 展示名称（巡检点位名称，如 "1#输水管道"） */
  name: string;
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
    name: '1#水泵',
    modelId: '3R1EPrY2P9EfP9TdHJ1ZmQ',
    position: [139.81, 822.17, 418.55],
    target: [151.81, 787.41, 373.22],
    fov: 46,
    distance: 58.37,
  },
  {
    name: '2#水泵',
    modelId: '3R1EPrY2P9EfP9TdHJ1Zmp',
    position: [131.01, 829.35, 376.02],
    target: [132.67, 787.41, 326.82],
    fov: 46,
    distance: 64.67,
  },
  {
    name: '3#水泵',
    modelId: '3R1EPrY2P9EfP9TdHJ1ZpT',
    position: [108.92, 836.74, 343],
    target: [113.8, 787.33, 281.05],
    fov: 46,
    distance: 79.39,
  },
  {
    name: '4#水泵',
    modelId: '34BFx_WWXB5xhjTsLYOlsi',
    position: [89.17, 825.48, 289.81],
    target: [94.23, 787.41, 233.6],
    fov: 46,
    distance: 68.07,
  },
  {
    name: '5#水泵',
    modelId: '3R1EPrY2P9EfP9TdHJ1YuR',
    position: [78.73, 824.41, 248.56],
    target: [75.31, 787.05, 187.5],
    fov: 46,
    distance: 71.66,
  },
  {
    name: '6#水泵',
    modelId: '3R1EPrY2P9EfP9TdHJ1YcL',
    position: [55.88, 822.13, 203.28],
    target: [56.02, 787.05, 140.79],
    fov: 46,
    distance: 71.66,
  },
  {
    name: '7#水泵',
    modelId: '3R1EPrY2P9EfP9TdHJ1Y70',
    position: [35.21, 830.38, 147.56],
    target: [36.99, 787.41, 94.79],
    fov: 46,
    distance: 68.07,
  },
  {
    name: '8#水泵',
    modelId: '3R1EPrY2P9EfP9TdHJ1ZhY',
    position: [-20.06, 815.74, 18.32],
    target: [17.37, 787.74, 50.29],
    fov: 46,
    distance: 56.63,
  },
  {
    name: '9#水泵',
    modelId: '1WnSI0cPD3WQAd6jzpJsxI',
    position: [-36.64, 824.98, -35.98],
    target: [-0.74, 788.23, 3.3],
    fov: 46,
    distance: 64.67,
  },
  {
    name: '9#电机',
    modelId: '1k8BiWDrT8yxKOkCncowOz',
    position: [5.33, 1021.03, 91.05],
    target: [0.01, 953.91, -3.68],
    fov: 46,
    distance: 116.22,
  },
  {
    name: '8#电机',
    modelId: '1k8BiWDrT8yxKOkCncowVd',
    position: [17.06, 1003.06, 129.35],
    target: [19.13, 953.91, 42.7],
    fov: 46,
    distance: 99.64,
  },
  {
    name: '7#电机',
    modelId: '3R1EPrY2P9EfP9TdHJ1ZbQ',
    position: [21.21, 977.29, 161.44],
    target: [38.08, 948.82, 94.51],
    fov: 46,
    distance: 74.66,
  },
  {
    name: '6#电机',
    modelId: '3R1EPrY2P9EfP9TdHJ1ZbL',
    position: [35.11, 978.99, 224.6],
    target: [57.21, 948.82, 140.91],
    fov: 46,
    distance: 91.67,
  },
  {
    name: '5#电机',
    modelId: '3R1EPrY2P9EfP9TdHJ1ZbK',
    position: [50.25, 992.76, 247.36],
    target: [76.52, 948.82, 187.74],
    fov: 46,
    distance: 78.58,
  },
  {
    name: '4#电机',
    modelId: '1k8BiWDrT8yxKOkCncowIH',
    position: [92.19, 998.66, 309.99],
    target: [94.98, 953.91, 226.62],
    fov: 46,
    distance: 94.66,
  },
  {
    name: '5#电机',
    modelId: '3R1EPrY2P9EfP9TdHJ1Y2l',
    position: [93.07, 978.29, 340.07],
    target: [113.01, 949.96, 278.73],
    fov: 46,
    distance: 70.45,
  },
  {
    name: '4#电机',
    modelId: '3R1EPrY2P9EfP9TdHJ1Y2k',
    position: [118.18, 977.47, 387.57],
    target: [131.75, 949.96, 324.16],
    fov: 46,
    distance: 70.44,
  },
  {
    name: '3#电机',
    modelId: '3R1EPrY2P9EfP9TdHJ1Y2f',
    position: [121.65, 991.97, 430.16],
    target: [151.23, 949.96, 371.4],
    fov: 46,
    distance: 78.06,
  },
  {
    name: '1#水阀',
    modelId: '3R1EPrY2P9EfP9TdHJ1YjS',
    position: [321.74, 912.15, 508.91],
    target: [340.66, 906.45, 492.38],
    fov: 46,
    distance: 25.76,
  },
  {
    name: '2#水阀',
    modelId: '3R1EPrY2P9EfP9TdHJ1YjY',
    position: [302.99, 917.98, 466.35],
    target: [317.7, 906.45, 436.7],
    fov: 46,
    distance: 35.05,
  },
  {
    name: '3#水阀',
    modelId: '3R1EPrY2P9EfP9TdHJ1YjW',
    position: [257.12, 910.32, 346.29],
    target: [274.04, 906.45, 330.82],
    fov: 46,
    distance: 23.25,
  },
  {
    name: '3#水阀',
    modelId: '3R1EPrY2P9EfP9TdHJ1Yjc',
    position: [238.45, 914.89, 305.59],
    target: [254.55, 906.45, 283.58],
    fov: 46,
    distance: 28.55,
  },
  {
    name: '4#水阀',
    modelId: '3R1EPrY2P9EfP9TdHJ1Yja',
    position: [211.82, 916.18, 253.17],
    target: [233.33, 906.45, 232.12],
    fov: 46,
    distance: 31.63,
  },
  {
    name: '5#水阀',
    modelId: '3R1EPrY2P9EfP9TdHJ1Yjg',
    position: [194.05, 918.46, 207.68],
    target: [213.15, 906.45, 183.18],
    fov: 46,
    distance: 33.31,
  },
  {
    name: '6#水阀',
    modelId: '3R1EPrY2P9EfP9TdHJ1Yje',
    position: [110.69, 917.61, -14.38],
    target: [118.35, 906.45, -46.71],
    fov: 46,
    distance: 35.05,
  },
  {
    name: '7#水阀',
    modelId: '3R1EPrY2P9EfP9TdHJ1Yjh',
    position: [114.32, 913.82, -46.93],
    target: [84.61, 906.45, -60.03],
    fov: 46,
    distance: 33.3,
  },
  {
    name: '8#水阀',
    modelId: '3R1EPrY2P9EfP9TdHJ1ZyO',
    position: [95.26, 915.03, -98.33],
    target: [59.56, 906.45, -120.77],
    fov: 46,
    distance: 43.03,
  },
  /*{
    name: '1#水泵',
    modelId: 'Line009',
    position: [462.92, 104.29, 110.19],
    target: [376.73, 65.86, 67.48],
    fov: 46,
    distance: 103.58,
  },
  {
    name: '2#水泵',
    modelId: 'Line012',
    position: [402.57, 92.2, 113.11],
    target: [325.08, 64.49, 69.14],
    fov: 46,
    distance: 93.31,
  },
  {
    name: '3#水泵',
    modelId: 'Line013',
    position: [350.64, 113.91, 111.77],
    target: [269.41, 62.92, 72.65],
    fov: 46,
    distance: 103.58,
  },
  {
    name: '4#水泵',
    modelId: 'Object011',
    position: [299.08, 111.75, 110.39],
    target: [213.86, 63.81, 76.21],
    fov: 46,
    distance: 103.58,
  },
  {
    name: '5#水泵',
    modelId: 'Line019',
    position: [249.02, 115.15, 98.72],
    target: [164.55, 62.24, 71.27],
    fov: 46,
    distance: 103.39,
  },
  {
    name: '6#水泵',
    modelId: 'Line021',
    position: [203.03, 102.56, 107.28],
    target: [115.57, 60.98, 71.06],
    fov: 46,
    distance: 103.39,
  },
  {
    name: '7#水泵',
    modelId: 'Rectangle008',
    position: [147.93, 102.7, 107.35],
    target: [57.61, 52.33, 73.46],
    fov: 46,
    distance: 108.83,
  },
  {
    name: '8#水泵',
    modelId: 'Line023',
    position: [89.45, 115.68, 100.6],
    target: [6.96, 47.88, 66.44],
    fov: 46,
    distance: 112.1,
  },
  {
    name: '9#水泵',
    modelId: 'Line024',
    position: [49.69, 111.69, 99.04],
    target: [-46.08, 46.52, 65.53],
    fov: 46,
    distance: 120.59,
  },
  {
    name: '9#电机',
    modelId: 'Rectangle004',
    position: [52.31, 285.38, 117.6],
    target: [-54.15, 224.89, 80.36],
    fov: 46,
    distance: 127.98,
  },
  {
    name: '8#电机',
    modelId: 'Object023',
    position: [99.62, 279.16, 114.62],
    target: [1.44, 233.91, 73.96],
    fov: 46,
    distance: 115.5,
  },
  {
    name: '7#电机',
    modelId: 'Object022',
    position: [136.39, 266.54, 111.36],
    target: [58.47, 219.14, 74.91],
    fov: 46,
    distance: 98.22,
  },
  {
    name: '6#电机',
    modelId: 'Object021',
    position: [186.57, 269.41, 113.22],
    target: [111.39, 219.14, 74.91],
    fov: 46,
    distance: 98.22,
  },
  {
    name: '5#电机',
    modelId: 'Object020',
    position: [232.73, 274.97, 118.67],
    target: [164.8, 219.14, 74.91],
    fov: 46,
    distance: 98.22,
  },
  {
    name: '4#电机',
    modelId: 'Object019',
    position: [276.48, 275.53, 131.22],
    target: [208.88, 235.71, 70.8],
    fov: 46,
    distance: 99.02,
  },
  {
    name: '3#电机',
    modelId: 'Object018',
    position: [334.05, 271.26, 139.17],
    target: [270.42, 220.35, 75.54],
    fov: 46,
    distance: 103.39,
  },
  {
    name: '2#电机',
    modelId: 'Object017',
    position: [379.97, 273.43, 134.63],
    target: [322.19, 220.35, 75.54],
    fov: 46,
    distance: 98.22,
  },
  {
    name: '1#电机',
    modelId: 'Object016',
    position: [430.94, 275.48, 128.23],
    target: [373.51, 229.53, 70.81],
    fov: 46,
    distance: 93.31,
  },
  {
    name: '1#水阀',
    modelId: 'Rectangle027',
    position: [-39.41, 183.43, -56.08],
    target: [-63.84, 178.3, -41.48],
    fov: 46,
    distance: 28.92,
  },
  {
    name: '2#水阀',
    modelId: 'Rectangle028',
    position: [-113.69, 188.22, -53.06],
    target: [-142.7, 175.92, -32.96],
    fov: 46,
    distance: 37.38,
  },
  {
    name: '3#水阀',
    modelId: 'Rectangle026',
    position: [-22.56, 195.29, -36.14],
    target: [-46.78, 175.92, -60.36],
    fov: 46,
    distance: 39.34,
  },
  {
    name: '4#水阀',
    modelId: 'Rectangle025',
    position: [70.32, 191.74, -24.92],
    target: [63.89, 175.92, -60.36],
    fov: 46,
    distance: 39.34,
  },
  {
    name: '5#水阀',
    modelId: 'Rectangle024',
    position: [229.81, 183.78, -26.76],
    target: [215.45, 175.92, -60.36],
    fov: 46,
    distance: 37.38,
  },
  {
    name: '6#水阀',
    modelId: 'Rectangle023',
    position: [276.44, 184.19, -22.25],
    target: [271.27, 175.92, -60.36],
    fov: 46,
    distance: 39.34,
  },
  {
    name: '7#水阀',
    modelId: 'Rectangle022',
    position: [333.76, 186.51, -18.24],
    target: [329.97, 175.92, -60.36],
    fov: 46,
    distance: 43.59,
  },
  {
    name: '8#水阀',
    modelId: 'Rectangle021',
    position: [389.97, 181.15, -21.85],
    target: [383.86, 175.92, -60.36],
    fov: 46,
    distance: 39.34,
  },
  {
    name: '9#水阀',
    modelId: 'Rectangle020',
    position: [502.06, 185.48, -22.28],
    target: [504.63, 175.92, -60.36],
    fov: 46,
    distance: 39.34,
  },
  {
    name: '10#水阀',
    modelId: 'Rectangle019',
    position: [545.83, 179.85, -33.02],
    target: [568.14, 175.92, -60.36],
    fov: 46,
    distance: 35.51,
  },*/
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

/** 巡检控制器配置 */
export const PATROL_CONFIG = {
  /** 点位停留时长（秒） */
  DWELL_DURATION: 3.4,
  /** 高亮闪烁频率（Hz） */
  FLICKER_FREQUENCY: 7,
  /** 高亮不透明度范围 [min, max] */
  FLICKER_OPACITY_RANGE: [0.4, 0.9] as const,
  /** 高亮材质颜色 */
  FLICKER_COLOR: 0x00d4ff,
} as const;

/** 相机控制配置 */
export const CAMERA_CONTROL_CONFIG = {
  /** 自动跟随默认观察距离 */
  DEFAULT_FOLLOW_DISTANCE: 75,
  /** 自动跟随距离调整范围 [min, max] */
  FOLLOW_DISTANCE_RANGE: [40, 900] as const,
  /** 相机高度系数（相对设备包围球半径） */
  CAMERA_HEIGHT_FACTOR: 0.5,
  /** 相机高度范围 [min, max]（世界单位） */
  CAMERA_HEIGHT_RANGE: [20, 55] as const,
  /** FOV 张角系数（用于计算"设备整体入画"最小距离） */
  FOV_COVERAGE_FACTOR: 0.85,
  /** 遮挡检测频率（每 N 帧执行一次） */
  OCCLUSION_CHECK_INTERVAL: 8,
  /** orbit 模式半径范围 [min, max] */
  ORBIT_RADIUS_RANGE: [200, 4000] as const,
  /** orbit 模式俯仰角范围 [min, max]（度） */
  ORBIT_PHI_RANGE: [10, 84] as const,
  /** orbit 模式视角限制范围 [x_min, x_max, z_min, z_max, y_min, y_max] */
  ORBIT_TARGET_CLAMP: [-2000, 2000, -2000, 2000, 0, 1000] as const,
  /** 鼠标拖拽灵敏度 */
  DRAG_SENSITIVITY: {
    rotation: 0.3,
    tilt: 0.25,
    pan: 0.0012,
  },
  /** 滚轮缩放系数 */
  WHEEL_ZOOM_FACTOR: 1.09,
  /** 相机平滑插值系数 [position, lookAt] */
  CAMERA_LERP_FACTORS: [0.12, 0.15] as const,
  /** GSAP 运镜时长系数（距离 / 速度） */
  FLIGHT_DURATION_FACTOR: 180,
  /** GSAP 运镜时长范围 [min, max]（秒） */
  FLIGHT_DURATION_RANGE: [1.8, 5] as const,
  /** GSAP 注视点时长系数（相对位置时长） */
  FLIGHT_LOOK_DURATION_FACTOR: 0.8,
  /** GSAP FOV 时长系数（相对位置时长） */
  FLIGHT_FOV_DURATION_FACTOR: 0.7,
  /** 注视起点距离（视线前方远点，避免起飞转动生硬） */
  FLIGHT_LOOK_START_DISTANCE: 400,
  /** 运镜到位判定距离阈值（世界单位） */
  FLIGHT_ARRIVAL_THRESHOLD: 2,
} as const;

/** UI 配置（结果卡片、任务面板） */
export const UI_CONFIG = {
  /** 智能巡检结果卡片显示时长（毫秒） */
  RESULT_CARD_DURATION: 15000,
  /** 结果卡片宽度（CSS 像素） */
  RESULT_CARD_WIDTH: 420,
  /** 任务面板宽度（含左边距，CSS 像素） */
  TASK_PANEL_WIDTH_WITH_MARGIN: 276,
  /** 卡片边界保护：上下留白（CSS 像素） */
  CARD_BOUNDARY_PADDING_Y: [150, 60] as const,
  /** 卡片锚点高度系数（相对设备包围球半径，让卡片覆盖部分模型） */
  CARD_ANCHOR_HEIGHT_FACTOR: 0.35,
} as const;

/** 配置视角选择器配置 */
export const VIEWPOINT_PICKER_CONFIG = {
  /** 相机最小距离（允许贴近设备细节观察） */
  MIN_DISTANCE: 20,
  /** 相机最大距离 */
  MAX_DISTANCE: 4000,
  /** 最大俯仰角（弧度） */
  MAX_POLAR_ANGLE: Math.PI * 0.9,
  /** OrbitControls 阻尼系数 */
  DAMPING_FACTOR: 0.08,
  /** 自动聚焦飞行时长（秒） */
  FOCUS_FLIGHT_DURATION: 0.8,
  /** 自动聚焦机位距离系数（相对设备最大边长） */
  AUTO_VIEWPOINT_DISTANCE_FACTOR: 2.2,
  /** 自动聚焦机位方向（右前上方 45°） */
  AUTO_VIEWPOINT_OFFSET: [1, 0.8, 1] as const,
  /** 拖拽判定阈值（像素） */
  DRAG_THRESHOLD: 5,
} as const;
