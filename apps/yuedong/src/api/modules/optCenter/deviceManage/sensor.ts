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
  sensorType: string;
  sensorStatus: string;
  sensorPassword: string;
  sensorName: string;
  sensorHost: string;
  sensorAccount: string;
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
export const sensorList = (params: Search) => {
  return http.get<Row>(PORT_INSPECT + `/sensor/page`, params);
};
// * 详情
export const sensorDetail = (params: { id: string }) => {
  return http.get<Row>(PORT_INSPECT + `/sensor/detail`, params);
};
// * 新增
export const sensorAdd = (params: Row) => {
  return http.post(PORT_INSPECT + `/sensor/save`, params);
};
// * 修改
export const sensorUpdate = (params: Row) => {
  return http.post(PORT_INSPECT + `/sensor/save`, params);
};
// * 删除
export const sensorDelete = (params: { ids: string }) => {
  return http.delete(PORT_INSPECT + `/sensor/batchDelete`, params);
};
