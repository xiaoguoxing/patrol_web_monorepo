import type * as THREE from 'three';
import type { PatrolViewpoint } from '../shared/constants';

export interface ModelLoadProgress {
  percent: number;
  label: string;
}

/** 巡检目标：真实模型中的某个节点 */
export interface PatrolTargetInfo {
  /** 模型节点 id（对应 GLB 中的对象名），由业务侧配置 */
  id: string;
  /** 展示名称 */
  name: string;
  /** 目标巡检点（世界坐标，取节点包围盒中心，作为镜头注视点） */
  position: THREE.Vector3;
  /** 设备包围球半径（世界坐标），用于计算"设备整体入画"所需的最小观察距离 */
  radius: number;
  /** 该点位预设视角（配置视角页保存），未配置时为 undefined */
  viewpoint?: PatrolViewpoint;
}

export interface ModelPatrolSnapshot {
  /** 当前巡检目标；未配置巡检对象（total 为 0）时为 undefined */
  target: PatrolTargetInfo | undefined;
  completed: number;
  total: number;
  dwelling: boolean;
}

/** 巡检目标在屏幕上的投影位置（结果卡片跟随设备定位用） */
export interface TargetScreenPos {
  /** 相对视口容器的 CSS 像素坐标 */
  x: number;
  y: number;
}

export interface WaterPlantSceneCallbacks {
  onPatrolChange: (snapshot: ModelPatrolSnapshot) => void;
  /** 每帧上报当前巡检目标在屏幕上的投影位置；非巡检模式或无目标时回调 null */
  onTargetScreenPosition?: (screen: TargetScreenPos | null) => void;
  /** 真实 GLB 模型加载进度 */
  onModelLoadProgress?: (progress: ModelLoadProgress) => void;
  /** 全部模型加载完成（外立面 + 内部结构） */
  onModelLoaded?: () => void;
  /** 模型加载失败 */
  onModelError?: (message: string) => void;
}
