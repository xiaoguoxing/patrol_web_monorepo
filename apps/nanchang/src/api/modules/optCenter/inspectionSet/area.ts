import { ReqPage, ResPage } from '@/api/interface/index';
import { PORT_INSPECT } from '@/api/config/servicePort';
import http from '@/api';
import qs from 'qs';

export namespace Area {
  //1表示组织，2表示区域
  export enum NodeType {
    ORG = 1,
    AREA = 2,
    OBJ = 3,
  }
  // export interface ReqGetParams extends ReqPage {
  //   name?: string;
  //   status?: number;
  //   code?: string;
  // }
  export interface ReqPostParams {
    id?: string;
    areaExplain: string;
    areaName: string;
    pid: string;
    pidSource: NodeType;
    sortNo?: number;
    [key: string]: any;
  }
  export interface ResList {
    id: string;
    areaName: string;
    areaPath: string;
    areaExplain: string | null;
    areaType: NodeType;
    pid: string;
    syncData: boolean;
    pidSource: NodeType;
    sortNo: number;
    children: ResList[];
    [key: string]: any;
  }
}

/**
 * @name 巡检区域管理模块
 */
// * 获取巡检区域列表
export const getAreaListApi = () => {
  return http.get<Area.ResList[]>(PORT_INSPECT + `/area/tree`);
};

// * 新建巡检区域
export const addAreaApi = (params: Area.ReqPostParams) => {
  return http.post(PORT_INSPECT + `/area/add`, params);
};

// * 编辑巡检区域
export const editAreaApi = (params: Area.ReqPostParams) => {
  return http.post(PORT_INSPECT + `/area/update`, params);
};

// * 删除巡检区域
export const deleteAreaApi = (params: { id: string }) => {
  return http.delete(PORT_INSPECT + `/area/delete`, params);
};

/**
 * @name 巡检对象
 */
export namespace InspectionObj {
  export interface ReqGetParams extends ReqPage {
    areaId: string;
    objectName?: string;
    objectCode?: string;
  }
  export interface ReqPostSeledParams {
    areaId: string;
    objectList: {
      id: string;
      objectCode: string;
      objectName: string;
    }[];

    [key: string]: any;
  }
  export interface ReqPostParams {
    areaId: string;
    id?: string;
    objectCode: string;
    objectName: string;
    [key: string]: any;
  }
  export interface ResList {
    id: string;
    objectCode: string;
    objectName: string;
    areaName: string;
    objectSource: string;
    [key: string]: any;
  }
  export interface ObjTree {
    id: string;
    nodeName: string;
    nodePath: string;
    nodeType: Area.NodeType;
    pid: string;
    children: ObjTree[];
  }
}
// * 获取巡检对象列表
export const getListApi = (params: InspectionObj.ReqGetParams) => {
  return http.get<ResPage<InspectionObj.ResList>>(PORT_INSPECT + `/objects/list`, params);
};
// * 获取巡检对象树
export const getObjTreeApi = () => {
  return http.get<InspectionObj.ObjTree[]>(PORT_INSPECT + `/objects/tree`);
};
// *获取巡检对象选择树，eam同步数据，返回整颗树
export const getSelTreeApi = () => {
  return http.get(PORT_INSPECT + `/objects/selectByTree`);
};
// * 获取巡检对象选择列表，eam同步数据，需要一级一级调接口获取.parentId不传时，默认获取顶级
export const getSelListApi = (params: { parentId: string }) => {
  return http.get(PORT_INSPECT + `/objects/selectList`, params);
};

// * 添加巡检对象---从eam选择同步新增
export const addSeledApi = (params: InspectionObj.ReqPostSeledParams) => {
  return http.post(PORT_INSPECT + `/objects/save`, params);
};
// * 新增巡检对象---手动新增巡检对象
export const addApi = (params: InspectionObj.ReqPostParams) => {
  return http.post(PORT_INSPECT + `/objects/add`, params);
};

// * 编辑巡检对象
export const editApi = (params: InspectionObj.ReqPostParams) => {
  return http.post(PORT_INSPECT + `/objects/update`, params);
};

// * 删除巡检对象
export const deleteApi = (params: { ids: string }) => {
  return http.delete(PORT_INSPECT + `/objects/delete`, params);
};
