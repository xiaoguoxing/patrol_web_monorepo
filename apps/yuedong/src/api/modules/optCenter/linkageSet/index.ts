import { ReqPage, ResPage } from '@/api/interface/index';
import { PORT_INSPECT } from '@/api/config/servicePort';
import http from '@/api';
export namespace Signal {
  export interface ReqPostParams {
    id?: string;
    // linkageSignalCode: string;
    // linkageSignalName: string;
    searchValue: string;
    [key: string]: any;
  }
  export interface ResList {
    id: string;
    linkageSignalCode: string;
    linkageSignalName: string;
    [key: string]: any;
  }
}

/**
 * @name 联动信号管理模块
 */
// * 获取联动信号列表
export const getSignalListApi = () => {
  return http.get<Signal.ResList[]>(PORT_INSPECT + `/link/getLinkageSignals`);
};

// * 新建联动信号
export const addSignalApi = (params: Signal.ReqPostParams) => {
  return http.post(PORT_INSPECT + `/link/addLinkageSignal`, params);
};

// * 编辑联动信号
export const editSignalApi = (params: Signal.ReqPostParams) => {
  return http.post(PORT_INSPECT + `/link/updateLinkageSignal`, params);
};

// * 删除联动信号
export const deleteSignalApi = (params: { ids: string }) => {
  return http.delete(PORT_INSPECT + `/link/deleteLinkageSignal`, params);
};
// * 导入联动信号配置
export const uploadSignalApi = (params: FormData) => {
  return http.post(PORT_INSPECT + `/link/importLinkageSignal`, params, { timeout: 0 });
};
// * 下载模板
export const downloadTemplateApi = () => {
  return http.get(PORT_INSPECT + `/link/template`, {}, { responseType: 'blob', timeout: 0 });
};

/**
 * @name 联动内容
 */
export namespace linkObj {
  export interface ReqGetParams extends ReqPage {
    itemName?: string; //巡检项名称
    areaName?: string; //巡检区域
    objectName?: string; //巡检对象名称
    cameraName?: string; //监控设备名称
    linkageSignalId?: string; //联动信号id
    presetPositionName?: string; //预置位名称
    relatedSkills?: string; //关联技能
    id?: string; //联动内容id
  }
  export interface ReqPostParams {
    itemIds: string[];
    linkageSignalId: string;
  }
  export interface ReqSortParams {
    list: { id: string; sortNo: number }[];
    linkageSignalId: string;
  }
  export interface ResList {
    id: string;
    itemName?: string; //巡检项名称
    areaName?: string; //巡检区域
    objectName?: string; //巡检对象名称
    cameraName?: string; //监控设备名称
    linkageSignalId?: string; //联动信号id
    presetPositionName?: string; //预置位名称
    relatedSkills?: string; //关联技能
    [key: string]: any;
  }
}
// * 获取联动内容列表
export const getListApi = (params: linkObj.ReqGetParams) => {
  return http.get<ResPage<linkObj.ResList>>(PORT_INSPECT + `/link/getList`, params);
};

// * 新增联动内容
export const addApi = (params: linkObj.ReqPostParams) => {
  return http.post(PORT_INSPECT + `/link/saveLinkageItems`, params);
};

// * 编辑联动内容
export const editApi = (params: linkObj.ReqPostParams) => {
  return http.post(PORT_INSPECT + `/link/saveLinkageItems`, params);
};

// * 删除联动内容
export const deleteApi = (params: { ids: string }) => {
  return http.delete(PORT_INSPECT + `/link/deleteLinkageItems`, params);
};
// * 排序联动内容
export const sortApi = (params: linkObj.ReqSortParams) => {
  return http.post(PORT_INSPECT + `/link/moveLinkageItem`, params);
};
