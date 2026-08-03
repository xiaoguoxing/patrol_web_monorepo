import http from '@/api';
import { PORT_INSPECT } from '@/api/config/servicePort';
export interface Tree {
  id: string;
  pid: string;
  nodeType: number;
  nodeName: string;
  children?: Tree[];
}
export enum pageTypeTitle {
  list = '',
  add = '新建',
  edit = '编辑',
  detail = '查看',
}
export type Id = string;
export type PageType = keyof typeof pageTypeTitle;
import type { ColumnProps } from '@patrol/ui';
/**
 * @name 巡检项配置
 */
// *
export interface searchParams {
  itemName?: string;
  objectId?: string;
  presetPositionIdList?: string;
  itemIdList?: string;
}
export interface rows {
  id?: string;
  itemName: string;
  cameraName: string;
  cameraTypeName?: string;
  cameraType: string;
  presetPositionName: string;
  relatedSkillsName: string;
  isPopup: string;
}
export type tableProps<T> = Omit<ColumnProps, 'prop'> & { prop?: keyof T | 'operation' };
export const getInspectionListApi = (params: searchParams) => {
  return http.get<rows>(`${PORT_INSPECT}/item/page`, params);
};
export const getInspectionListAllApi = (params: searchParams) => {
  return http.get<rows>(`${PORT_INSPECT}/item/getAll`, params);
};
// *
export interface addRows {
  id?: string;
  alarmId: string;
  alarmName: string;
  isStatus?: 1 | 0;
  itemName: string;
  itemRules: ItemRules[];
  objectId: string;
  relatedSkillsId?: string;
  relatedSkillsName?: string;
  presetPositionId: string;
  presetPositionName?: string;
  ruleCondition: 1 | 0;
  itemAttribute: string | 'state' | 'param';
  needAlarm: boolean;
  indexId?: string;
  alarmLevel?: string;
  isPopup?: boolean;
}
export interface ItemRules {
  id?: string;
  itemId?: string;
  isStatus?: 1 | 0;
  alarmIndexUnit?: string;
  ruleCondition?: 1 | 0;
  alarmIndexName?: string;
  alarmIndex: string;
  alarmRule: string;
  ruleValue: string;
}
export const addInspectionApi = (params: addRows) => {
  return http.post(`${PORT_INSPECT}/item/save`, params);
};
// *
export const detailInspectionApi = (params: { id: string }) => {
  return http.get<addRows>(`${PORT_INSPECT}/item/detail`, params);
};
// *
export const deleteInspectionApi = (params: { ids: string }) => {
  return http.delete(`${PORT_INSPECT}/item/batchDelete`, params);
};

export const getTreeApi = () => {
  return http.get<Tree[]>(PORT_INSPECT + `/objects/tree`);
};

export const getAlarmAllListApi = () => {
  return http.get<any[]>(PORT_INSPECT + `/alarm/select`);
};

// * 批量开启/关闭弹窗提醒
export const turnApi = (params: { ids: string; isPopup: boolean }) => {
  return http.post(PORT_INSPECT + `/item/turnOnOrOff`, params);
};
