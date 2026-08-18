/**
 * @name 预置位配置模块
 */
import http from '@/api';
import { PORT_INSPECT } from '@/api/config/servicePort';

export enum pageTypeTitle {
  list = '',
  add = '新建',
  edit = '编辑',
  detail = '',
}

export type Id = string;
export type PageType = keyof typeof pageTypeTitle;

// *列表
export interface PositionListParams {
  cameraId: string;
  pageNum?: number;
  page: number;
  pageSize: number;
  presetPositionIdList: [];
  presetPositionName: string;
}
export interface AlgorithmResultBeanList {
  algorithmRecognitionResults: string;
  algorithmResults: string;
  algorithmScada?: number | null;
  id?: string;
}
export interface Position {
  top: number;
  left: number;
  width: number;
  height: number;
  imgWidth: number;
  imgHeight: number;
}
export interface PositionListRows {
  cameraId?: string;
  markId?: string;
  attachmentId?: string;
  orgCode?: string;
  orgName?: string;
  objectId: string;
  scadaCode: string;
  scadaName: string;
  id?: string;
  imgPath?: string;
  capture?: string;
  attachmentFile?: string;
  presetPositionInfo?: string;
  presetPositionName: string;
  relatedSkillsId: string;
  relatedSkillsName?: string;
  algorithmCode?: string;
  errorRange?: number;
  position?: Position;
  needBusiness?: boolean;
  algorithmResultBeanList?: AlgorithmResultBeanList[];
}

export interface ListPageProps {
  list: PositionListRows[];
  pageNum: number;
  pageSize: number;
  total: number;
}

export const getPositionListApi = (params: PositionListParams) => {
  return http.get<ListPageProps>(`${PORT_INSPECT}/presetPosition/page`, params);
};

// *新增
export interface addParams {
  id?: string;
  presetPositionInfo?: string;
  capture?: string;
  attachmentFile?: string;
  cameraId: string;
  presetPositionName: string;
  relatedSkillsId: string;
}

export const addPositionApi = (params: any) => {
  return http.post(`${PORT_INSPECT}/presetPosition/save`, params, {
    'Content-Type': 'multipart/form-data',
    timeout: 0,
  });
};
// *详情
export const detailPositionApi = (params: { id: string }) => {
  return http.get<PositionListRows>(`${PORT_INSPECT}/presetPosition/detail`, params);
};
// *删除
export const deletePositionApi = (params: { ids: string }) => {
  return http.get(`${PORT_INSPECT}/presetPosition/batchDelete`, params, { timeout: 0 });
};
// *全部预置位
export const getAllPositionApi = (params: { ids: string }) => {
  return http.get<PositionListRows[]>(`${PORT_INSPECT}/presetPosition/getAll`, params);
};
// *全部scada
export const getScadaInfoApi = () => {
  return http.get<PositionListRows[]>(`${PORT_INSPECT}/presetPosition/getScadaInfo`);
};
// *全部scada
export const getObjectsApi = (params: { cameraId: string; nodeType: number }) => {
  return http.get<PositionListRows[]>(`${PORT_INSPECT}/objects/getListByCameraId`, params);
};

export function treeFirst(arr: any[], nodeType: number[] = [3]): { id: string; nodeName: string } | void {
  for (let i = 0; i < arr.length; i++) {
    if (nodeType.includes(arr[i].nodeType)) {
      return arr[i];
    }
    if (arr[i].children?.length !== 0) {
      let a = treeFirst(arr[i].children || [], nodeType);
      if (a) {
        return a;
      }
    }
  }
}
export function treeItem(
  arr: any[],
  nodeId: string
): { id: string; nodeName: string; children: []; [x: string]: any } | void {
  for (let i = 0; i < arr.length; i++) {
    if (arr[i].id === nodeId) {
      return arr[i];
    }
    if (arr[i].children?.length !== 0) {
      let a = treeItem(arr[i].children || [], nodeId);
      if (a) {
        return a;
      }
    }
  }
}
