import { PORT_INSPECT } from '@/api/config/servicePort';
import http from '@/api';
// * 巡检设备总揽
export const getStatistics = (params: any) => {
  return http.get<any>(PORT_INSPECT + `/workbenches/device/statistics`, params);
};
//   // * 告警列表
export const getAlarmStatistics = (params: any) => {
  return http.get<any>(PORT_INSPECT + `/workbenches/alarm/statistics`, params);
};
// 智能联动概况
export const getlinkageStatistics = (params: any) => {
  return http.get<any>(PORT_INSPECT + `/workbenches/linkage/statistics`, params);
};
// 巡检任务统计
export const getTaskStatistics = (params: { startTime: any; endTime: any }) => {
  return http.get<any>(PORT_INSPECT + `/workbenches/task/statistics`, params);
};
//   获取常用应用
export const getApp = (params: any) => {
  return http.get<any>(PORT_INSPECT + `/workbenches/get/common/app`, params);
};
// 记录用户访问的应用
export const postUsageApp = (params: any) => {
  return http.post<any>(PORT_INSPECT + `/workbenches/app/usage`, params, {
    headers: { noLoading: true },
  });
};

//   消息
export const getMessage = (params: any) => {
  return http.get<any>(PORT_INSPECT + `/workbenches/get/message`, params);
};
//   消息列表
export const getMessageList = (params: any) => {
  return http.get<any>(PORT_INSPECT + `/inspection/message/get/list`, params);
};
//   消息列表
export const getDeleteList = (params: any) => {
  return http.delete<any>(PORT_INSPECT + `/inspection/message/delete/status`, params);
};
export const getUpdateList = (params: any) => {
  return http.post<any>(PORT_INSPECT + `/inspection/message/update/status`, params);
};
export interface Item {
  id: string;
  taskStatus: string;
  taskStartTime: string;
  inspectionTaskName: string;
  taskUseTime: number;
}
export const getTaskDay = (params: { time: string }) => {
  return http.get<{ list: Item[]; no_execute: number; finished: number; during: number }>(
    PORT_INSPECT + `/taskSchedule/day`,
    params
  );
};
