import { PORT_INSPECT } from '@/api/config/servicePort';
import http from '@/api';
export interface TaskDetail {
  id: string;
  areaName: string;
  inspectionTaskName: string;
  taskPlanId: string;
  taskReportId: string;
  taskStartTime: string;
  taskStatus: string;
  taskId: string;
  taskStatusName: string;
  syncData: boolean;
  taskItemMapList: {
    areaName: string;
    taskItems: { areaName: string; itemName: string }[];
  }[];
}
export interface TaskList {
  [key: number]: TaskDetail[];
}
// * 获取列表
export const getListApi = (params: { time: string }) => {
  // return http.get<ResPage<Camera.ResList>>(PORT_INSPECT + `/camera/list`, params);
  return http.get<TaskList>(PORT_INSPECT + `/taskSchedule`, params);
};
// * 获取列表
export const getItemDetailApi = (params: { id: string; syncData: boolean; taskStatus: string }) => {
  // return http.get<ResPage<Camera.ResList>>(PORT_INSPECT + `/camera/list`, params);
  return http.get<any[]>(PORT_INSPECT + `/taskSchedule/detail`, params, { headers: { noLoading: true } });
};
