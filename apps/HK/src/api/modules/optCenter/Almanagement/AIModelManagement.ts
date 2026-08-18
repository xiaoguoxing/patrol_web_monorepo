import http from '@/api';
import { PORT_INSPECT } from '@/api/config/servicePort';
export enum PageTypeTitle {
  list = '',
  add = '新建模型',
  edit = '编辑模型',
  detail = '模型详情',
}
export type PageType = keyof typeof PageTypeTitle;
export interface Row {
  id: string;
  algorithmCode: string;
  algorithmName: string;
  algorithmPort: string;
  algorithmUrl: string;
  algorithmSkill: string;
  algorithmVersion: string;
  authenticationUrl: string;
  runtimeEnvironment: string;
  identifyType: string;
  needBusiness: boolean;
  needMarked: boolean;
}
export interface Search {
  algorithmName: string;
  pageSize: number;
  page: number;
  [key: string]: any;
}
// * 列表
export const algorithmList = (params: Search) => {
  return http.get<Row>(PORT_INSPECT + `/algorithm/list`, params);
};
// * 所有列表
export const algorithmGetAll = (params: { identifyType: 'inspection' | 'monitor' }) => {
  return http.get<Row[]>(PORT_INSPECT + `/algorithm/all`, params);
};
// * 详情
export const algorithmDetail = (params: { id: string }) => {
  return http.get<Row>(PORT_INSPECT + `/algorithm/detail`, params);
};
// * 新增
export const algorithmAdd = (params: Row) => {
  return http.post(PORT_INSPECT + `/algorithm/add`, params);
};
// * 修改
export const algorithmUpdate = (params: Row) => {
  return http.post(PORT_INSPECT + `/algorithm/update`, params);
};
// * 删除
export const algorithmDelete = (params: { ids: string }) => {
  return http.delete(PORT_INSPECT + `/algorithm/delete`, params);
};
// * 导入
export const algorithmImport = (params: FormData) => {
  return http.post(PORT_INSPECT + `/algorithm/import`, params, { timeout: 0 });
};
// * 下载模板
export const algorithmTemplate = () => {
  return http.get(PORT_INSPECT + `/algorithm/template`, {}, { responseType: 'blob', timeout: 0 });
};
