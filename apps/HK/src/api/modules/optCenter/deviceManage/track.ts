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
  channelIndexCode?: string;
  channelIndexName?: string;
  orbitalIndexCode?: string;
  orbitalIndexName?: string;
  robotStatus: string;
  robotName: string;
  robotHost: string;
  host: string;
  areaName: string;
  areaId: boolean;
  appKey: string;
  appSecret: string;
  robotId: string;
}
export interface Search {
  robotName: string;
  robotStatus: string;
  pageSize: number;
  page: number;
  [key: string]: any;
}
// * 列表
export const trackList = (params: Search) => {
  return http.get<Row>(PORT_INSPECT + `/railMountedRobot/page`, params);
};
// * 详情
export const trackDetail = (params: { id: string }) => {
  return http.get<Row>(PORT_INSPECT + `/railMountedRobot/detail`, params);
};
// * 详情
export const trackDetails = (params: { id: string }) => {
  return http.get<Row>(PORT_INSPECT + `/railMountedRobot/details`, params);
};
// * 新增
export const trackAdd = (params: Row) => {
  return http.post(PORT_INSPECT + `/railMountedRobot/save`, params);
};
// * 修改
export const trackUpdate = (params: Row) => {
  return http.post(PORT_INSPECT + `/railMountedRobot/save`, params);
};
// * 删除
export const trackDelete = (params: { ids: string }) => {
  return http.delete(PORT_INSPECT + `/railMountedRobot/batchDelete`, params);
};
