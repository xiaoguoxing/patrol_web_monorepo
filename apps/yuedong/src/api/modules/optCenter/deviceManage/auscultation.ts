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
  stethoscopeType: string;
  stethoscopeStatus: string;
  stethoscopePassword: string;
  stethoscopeName: string;
  stethoscopeHost: string;
  stethoscopeAccount: string;
  stethoscopePort: string;
  deviceId: number;
  areaName: string;
  channelNum: number;
  areaId: boolean;
}
export interface Search {
  stethoscopeName: string;
  stethoscopeStatus: string;
  stethoscopeType: string;
  pageSize: number;
  page: number;
  [key: string]: any;
}
// * 列表
export const stethoscopeList = (params: Search) => {
  return http.get<Row>(PORT_INSPECT + `/stethoscope/page`, params);
};
// * 详情
export const stethoscopeDetail = (params: { id: string }) => {
  return http.get<Row>(PORT_INSPECT + `/stethoscope/detail`, params);
};
// * 新增
export const stethoscopeAdd = (params: Row) => {
  return http.post(PORT_INSPECT + `/stethoscope/save`, params);
};
// * 修改
export const stethoscopeUpdate = (params: Row) => {
  return http.post(PORT_INSPECT + `/stethoscope/save`, params);
};
// * 删除
export const stethoscopeDelete = (params: { ids: string }) => {
  return http.delete(PORT_INSPECT + `/stethoscope/batchDelete`, params);
};
