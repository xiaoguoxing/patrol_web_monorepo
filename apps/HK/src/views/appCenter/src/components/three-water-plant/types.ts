import type * as THREE from 'three';

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
  /** 目标巡检点（世界坐标，取节点包围盒上方） */
  position: THREE.Vector3;
}

export interface ModelPatrolSnapshot {
  /** 当前巡检目标；未配置巡检对象（total 为 0）时为 undefined */
  target: PatrolTargetInfo | undefined;
  completed: number;
  total: number;
  dwelling: boolean;
}

export interface WaterPlantSceneCallbacks {
  onPatrolChange: (snapshot: ModelPatrolSnapshot) => void;
  /** 真实 GLB 模型加载进度 */
  onModelLoadProgress?: (progress: ModelLoadProgress) => void;
  /** 全部模型加载完成（外立面 + 内部结构） */
  onModelLoaded?: () => void;
  /** 模型加载失败 */
  onModelError?: (message: string) => void;
}
