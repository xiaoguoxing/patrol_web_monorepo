import http from '@/api';
import { PORT_INSPECT } from '@/api/config/servicePort';
import { ResPage } from '@/api/interface';
import { ContentTypeEnum } from '@/enums/httpEnum';
export enum PageTypeTitle {
  list = '',
  detail = '告警详情',
  reportingDeficiencies = '缺陷上报',
}
export type PageType = keyof typeof PageTypeTitle;
export interface Tree {
  id: string;
  nodeName: string;
  nodeType: number;
  children?: Tree[];
}
export interface DictOptions {
  label: string;
  value: string;
  remark: string;
}
export type Dict = DictOptions[];
export interface AlarmListParams {}
export interface AlarmListRows {
  id?: string;
  alarmTime?: string;
  orgName?: string;
  alarmSource?: string;
  alarmAreaName?: string;
  alarmObjectName?: string;
  cameraName?: string;
  cameraId?: string;
  alarmItemName?: string;
  alarmItem?: string;
  itemId?: string;
  alarmName?: string;
  alarmType?: string;
  alarmGrade?: string;
  alarmStatus?: string;
  syncData?: boolean;
  isReport?: string;
  playbackStartTime?: string;
  playbackEndTime?: string;
  reportId?: string;
  alarmPic?: string;
  imgPath?: string;
  recognitionResult?: string;
  alarmRules?: string;
}
export type id = string;
export const getAlarmListApi = (params: AlarmListParams) => {
  return http.get<ResPage<AlarmListRows>>(`${PORT_INSPECT}/alarm/record/list`, params);
};
export const getAlarmListApiV2 = (params: AlarmListParams) => {
  return http.get<ResPage<AlarmListRows>>(`${PORT_INSPECT}/alarm/record/home/page`, params);
};
export const getAlarmDetailApi = (params: { id: string }) => {
  return http.get<AlarmListRows>(`${PORT_INSPECT}/alarm/record/detail`, params);
};
export const getAlarmCheckApi = (params: { id: string; erasingExplain: string }) => {
  return http.get(`${PORT_INSPECT}/alarm/record/check`, params);
};
export const addDefectStockToEAMApi = (params: { id: string }) => {
  return http.post(`${PORT_INSPECT}/alarm/record/addDefectStockToEAM?id=${params.id}`);
};
