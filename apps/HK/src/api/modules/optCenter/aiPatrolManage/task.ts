import http from '@/api';
import { PORT_INSPECT, PORT_SYSTEM } from '@/api/config/servicePort';
import { addRows as InspectionAdd } from './inspection';
export interface listProp {
  id: string;
  label: string;
  version: string;
  version2: string;
  version3: string;
  version4: string;
  abc?: string;
}
export enum PageTypeTitle {
  list = '',
  add = '新建巡检任务',
  edit = '编辑巡检任务',
  detail = '巡检任务详情',
}
export type Id = string;
export type PageType = keyof typeof PageTypeTitle;

/**
 * @name 任务
 */
// *
export interface searchForm {
  publishEndTime: string;
  publishStartTime: string;
  areaName: string;
  objectName: string;
  taskPlanName: string;
  taskStatus: string;
  selectProp?: string;
}
export interface rows {
  id?: string;
  areaId?: string;
  cron?: string;
  executeCycle: string;
  executeFrequency?: string;
  executeType?: string;
  inspectionWay?: string;
  inspectionWayName?: string;
  objectId?: string;
  orgCode?: string;
  taskType?: string;

  taskTypeName: string;
  areaName: string;
  taskPlanName: string;
  objectName: string;
  orgName: string;
  executeTypeName: string;
  taskStartTime: string;
  taskStatus: 1 | 0;
}
export const getTaskListApi = (params: searchForm) => {
  return http.get(`${PORT_INSPECT}/taskPlan/page`, params);
};
// *
export interface addRows {
  id?: string;
  objectId?: string;
  executeCycle: string;
  executeFrequency: string;
  orgName: string;
  executeType: string;
  inspectionWay: string;
  taskType: string;
  taskStartTime: string;
  executeMode: string;
  taskEndTime: string;

  cron?: string;
  inspectionWayName?: string;
  taskTypeName?: string;
  areaName?: string;
  taskPlanName?: string;
  objectName?: string;
  orgCode?: string;
  executeTypeName?: string;
  taskStatus?: 1 | 0;
  taskPlanItemList?: InspectionAdd[];
}
export type Cron = { label: string; value: string; method?: () => Cron[] };
export const addTaskApi = (params: {}) => {
  return http.post(`${PORT_INSPECT}/taskPlan/save`, params);
};

// *
export const detailTaskApi = (params: { id: string }) => {
  return http.get<addRows>(`${PORT_INSPECT}/taskPlan/detail`, params);
};

// *
export const deleteTaskApi = (params: { ids: string }) => {
  return http.delete(`${PORT_INSPECT}/taskPlan/batchDelete`, params);
};

// *
export const stopTaskApi = (params: { ids: string }) => {
  return http.get(`${PORT_INSPECT}/taskPlan/stop`, params);
};

// *
export const enableTaskApi = (params: { ids: string }) => {
  return http.get(`${PORT_INSPECT}/taskPlan/enable`, params);
};

// *
export const editStatusTaskApi = (params: { id: string }) => {
  return http.get(`${PORT_INSPECT}/taskPlan/editStatus`, params);
};

// *
export const taskTypeSelectApi = () => {
  return http.get(`${PORT_INSPECT}/taskType/select`);
};
export interface OrgTree {
  name: string;
  id: string;
  children: OrgTree[];
}
export const orgTree = () => {
  return http.get<OrgTree[]>(`${PORT_SYSTEM}/system/org/queryOrgTree`, { permission: true });
};
export const orgTreeList = (params: {}) => {
  return http.get<OrgTree[]>(`${PORT_SYSTEM}/system/org/queryNextOrgList`, { permission: true, ...params });
};
