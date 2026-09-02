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
 * 巡检对象模型 id 列表（对应 GLB 内的节点名 / 对象名）。
 * 由业务侧提供（从 Babylon 场景调试中导出）：
 *   Line009 / Line012 / Line013 / Line019 / Line020 / Line021 / Line023 / Line024
 *   Rectangle008 / Rectangle019 ~ Rectangle028
 * 巡检会依次定位到这些节点。
 */
export const PATROL_IDS: string[] = [
  'Line009',
  'Line012',
  'Line013',
  'Object011',
  'Line019',
  'Line021',
  'Rectangle008',
  'Line023',
  'Line024',
  'Rectangle004',
  'Object023',
  'Object022',
  'Object021',
  'Object020',
  'Object019',
  'Object018',
  'Object017',
  'Object016',
  'Rectangle027',
  'Rectangle026',
  'Rectangle025',
  'Rectangle024',
  'Rectangle023',
  'Rectangle022',
  'Rectangle021',
  'Rectangle020',
  'Rectangle019',
];

/** 场景公共参数（相机裁剪 / 雾 / 地面） */
export const SCENE_CONFIG = {
  /** 相机近裁剪面 */
  cameraNear: 1,
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
