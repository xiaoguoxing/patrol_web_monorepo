export interface ImagePoint {
  pointX: number;
  pointY: number;
}

export interface PatrolTaskItem {
  itemId: string | number;
  itemName: string;
  sortNo: number;
  itemStatus: 'todo' | 'during' | 'finished' | 'not_done' | string;
  itemStatusName?: string;
  cameraId?: string | number;
  cameraName?: string;
  imagePoint?: ImagePoint | string | null;
  gatherPic?: string;
  gatherTime?: string;
  inspectionResult?: string;
  recognitionResult?: string;
  inspectionResultStatus?: boolean;
  isAlarm?: boolean;
  [key: string]: unknown;
}

export interface PatrolTaskGroup {
  areaName?: string;
  finishNum?: number;
  itemNum?: number;
  taskItems?: PatrolTaskItem[];
  [key: string]: unknown;
}

export interface PatrolTask {
  id: string | number;
  inspectionTaskName: string;
  finishNum?: number;
  itemNum?: number;
  taskStatus?: string;
  taskStatusName?: string;
  taskItemMapList?: PatrolTaskGroup[];
  [key: string]: unknown;
}

export interface CameraPoint extends ImagePoint {
  cameraId: string;
  cameraName?: string;
}

export interface PatrolTarget extends PatrolTaskItem, ImagePoint {
  cameraId: string;
}
