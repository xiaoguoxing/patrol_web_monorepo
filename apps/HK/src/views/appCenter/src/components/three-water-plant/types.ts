import type * as THREE from 'three';

export type DeviceType = 'pump' | 'cabinet' | 'meter' | 'light' | 'doser' | 'blower';
export type InspectionStatus = 'ok' | 'abnormal';

export interface PlantDevice {
  type: DeviceType;
  key: string;
  name: string;
  model: string;
  area: string;
  x: number;
  z: number;
  floor: number;
  alarm?: boolean;
}

export interface InspectionItem {
  name: string;
  status: '正常' | '异常';
  detail: string;
}

export interface InspectionResult {
  duration: string;
  confidence: number;
  status: InspectionStatus;
  items: InspectionItem[];
}

export interface PatrolSnapshot {
  device: PlantDevice;
  result: InspectionResult;
  completed: number;
  total: number;
  dwelling: boolean;
  paused: boolean;
  cursor: THREE.Vector3;
}

export interface DeviceSelection {
  device: PlantDevice;
  clientX: number;
  clientY: number;
}

export interface WaterPlantSceneCallbacks {
  onPatrolChange: (snapshot: PatrolSnapshot) => void;
  onDeviceSelect: (selection?: DeviceSelection) => void;
}

export interface DeviceBuildResult {
  groups: Map<string, THREE.Group>;
  rings: Map<string, THREE.Mesh>;
  pickables: THREE.Object3D[];
}
