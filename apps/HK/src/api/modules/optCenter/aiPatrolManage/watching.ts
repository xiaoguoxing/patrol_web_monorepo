import http from '@/api';
import { PORT_INSPECT } from '@/api/config/servicePort';
export enum PageTypeTitle {
  list = '',
  add = 'buttonName.add',
  edit = 'buttonName.edit',
  detail = 'buttonName.detail',
}
export type Id = string;
export type PageType = keyof typeof PageTypeTitle;

/**
 * @name 实时监控配置
 */
// *
export interface searchForm {
  cameraId: string;
  relatedSkills: string;
}
export interface rows {
  id?: string;
  relatedSkillsId?: string;
  alarmId?: string;
  presetPositionInfo?: string;
  cameraId?: string;
  imgPath?: string;
  list?: any[];
  alarmName: string;
  monitorStatus: 1 | 0;
  relatedSkillsName: string;
  monitorPic: string;
  runtime: string;
  alarmStatusName: string;
}
export const getWatchingListApi = (params: searchForm) => {
  return http.get<rows>(`${PORT_INSPECT}/realtimeMonitor/page`, params);
};
// *
export interface addRows {
  id?: string;
  alarmName?: string;
  cameraId?: string;
  isStatus?: 1 | 0;
  ruleCondition?: 1 | 0;
  monitorStatus?: 1 | 0;
  presetPositionInfo?: string;
  relatedSkills?: string;
  relatedSkillsName?: string;
  monitorPic?: string;
  alarmIndex?: string;
  alarmLevel?: string;
  alarmStatus?: string;
  alarmStatusName?: string;
  alarmType?: string;
  alarmId?: string;
  relatedSkillsId: string;
  isPopup: 1 | 0;
  capture?: string;
}
export interface ItemRules {
  id?: string;
  monitorId?: string;

  alarmIndex: string;
  alarmRules: string;
  rulesValue: string;
  alarmIndexUnit?: string;
}
export interface ItemRunTime {
  id?: string;
  monitorId?: string;
  times: string[];
  runtimeEnd: string;
  runtimeStart: string;
}
export const addWatchingApi = (params: {}) => {
  return http.post(`${PORT_INSPECT}/realtimeMonitor/save`, params);
};
// *
export const detailWatchingApi = (params: { id: string }) => {
  return http.get<addRows>(`${PORT_INSPECT}/realtimeMonitor/detail`, params);
};
// *
export const deleteWatchingApi = (params: { ids: string }) => {
  return http.delete(`${PORT_INSPECT}/realtimeMonitor/batchDelete`, params);
};

export const editStatusTaskApi = (params: { id: string }) => {
  return http.get<addRows>(`${PORT_INSPECT}/realtimeMonitor/updateStatus`, params);
};
