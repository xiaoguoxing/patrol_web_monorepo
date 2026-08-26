import http from '@/api';
import { PORT_INSPECT } from '@/api/config/servicePort';
import { ReqPage, ResPage } from '@/api/interface/index';
export enum PageTypeTitle {
  list = '',
  add = 'model.addPrint',
  edit = 'model.dataPrint',
  detail = 'model.printDetail',
}
export type RowState = 'todo' | 'finish';
export type PageType = keyof typeof PageTypeTitle;
export type ArcType = 'arcCenter' | 'arc' | 'default' | 'position';
export interface ArcRow {
  type: ArcType;
  x: number;
  y: number;
  value: string;
  isConfirm: boolean;
}
export interface Row {
  id: string;
  presetPositionName: string;
  presetPositionId: string;
  algorithmName: string;
  createTime: string;
  markStatus: RowState;
  markImage: string;
  markType?: '1' | '2' | '3';
  pointNum?: number;
  threshold?: number;
  imgPath?: string;
  imageWidth?: number;
  imageHigh?: number;
  markId: string;
  circle: string;
  points: string;
  position: string;
}
export interface UpdateRow {
  pointNum: number;
  threshold: number;
  circle: string;
  id: string;
  points: string;
  imageWidth: string;
  imageHigh: string;
}
export interface Search {
  algorithmName: string;
  pageSize: number;
  page: number;
  [key: string]: any;
}
// * 列表
export const algorithmList = (params: Search) => {
  return http.get<Row>(PORT_INSPECT + `/algorithm/mark/list`, params);
};
// * 所有列表
export const algorithmGetAll = () => {
  return http.get<ResPage<Row>>(PORT_INSPECT + `/algorithm/mark/all`);
};
// * 详情
export const algorithmDetail = (params: { id: string; markId?: string }) => {
  return http.get<Row>(PORT_INSPECT + `/algorithm/mark/detail`, params);
};
// * 修改
export const algorithmUpdate = (params: UpdateRow) => {
  return http.post(PORT_INSPECT + `/algorithm/mark/update`, params);
};
