import http from '@/api';
import { PORT_INSPECT } from '@/api/config/servicePort';
export enum PageTypeTitle {
  list = '',
  add = '新建',
  edit = '编辑',
  detail = '详情',
}
export type PageType = keyof typeof PageTypeTitle;
export interface Row {
  id: string;
  droneType: string;
  droneStatus: string;
  dronePassword: string;
  droneName: string;
  droneHost: string;
  droneAccount: string;
  deviceId: string;
  areaName: string;
  areaId: boolean;
}
export interface Search {
  sensorName: string;
  sensorStatus: string;
  sensorType: string;
  pageSize: number;
  page: number;
  [key: string]: any;
}
// * 列表
export const droneList = (params: Search) => {
  return http.get<Row>(PORT_INSPECT + `/inspection/drone/list`, params);
};
// * 详情
export const droneDetail = (params: { id: string }) => {
  return http.get<Row>(PORT_INSPECT + `/inspection/drone/detail`, params);
};
// * 新增
export const droneAdd = (params: Row) => {
  return http.post(PORT_INSPECT + `/inspection/drone/add`, params);
};
// * 修改
export const droneUpdate = (params: Row) => {
  return http.post(PORT_INSPECT + `/inspection/drone/update`, params);
};
// * 删除
export const droneDelete = (params: { ids: string }) => {
  return http.delete(PORT_INSPECT + `/inspection/drone/delete`, params);
};
