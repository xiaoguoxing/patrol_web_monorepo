import { ReqPage, ResPage } from '@/api/interface/index';
import { PORT_SYSTEM, PORT_COMMON, PORT_INSPECT } from '@/api/config/servicePort';
import http from '@/api';
/**
 * @name 数据字典
 */
export namespace Dict {
  export interface ReqGetParams {
    code: string;
    classifyId: string;
  }
  export interface itemObj {
    value: string;
    key: string;
    [key: string]: any;
  }
  export interface ResObj {
    sysDataDictDetailList: itemObj[];
    [key: string]: any;
  }
}
export namespace NeedBusiness {
  export interface ReqGetParams {
    code: string;
    classifyCode: string;
  }
  export interface itemObj {
    value: string;
    key: string;
    [key: string]: any;
  }
  export interface ResObj {
    configDetailList: itemObj[];
    [key: string]: any;
  }
}
// * 获取数据字典
export const getDictApi = (params: Dict.ReqGetParams) => {
  return http.get<Dict.ResObj>(PORT_SYSTEM + `/sys/DataDict/getByClassifyIdAndCode`, params);
};
// * 获取业务配置
export const getNeedBusinessApi = (params: NeedBusiness.ReqGetParams) => {
  return http.get<NeedBusiness.ResObj>(PORT_SYSTEM + `/sys/ConfigType/getByClassifyCodeAndCode`, params);
};
export interface SetTableCol {
  page?: string | symbol;
  userId?: string;
  config?: string;
  type?: string;
  id?: string;
}
// 获取tableColSet
export const getTableCol = (params: SetTableCol) => {
  return http.get<SetTableCol[]>(`${PORT_COMMON}/personalizedConfiguration/getList`, params);
};
// 设置tableColSet
export const setTableCol = (params: SetTableCol) => {
  return http.post(`${PORT_COMMON}/personalizedConfiguration/save`, params);
};
// 删除tableColSet
export const delTableCol = (params: SetTableCol) => {
  return http.get(`${PORT_COMMON}/personalizedConfiguration/deleteById`, params);
};
// 下载视频插件
export const downPlugin = () => {
  return http.get(`${PORT_INSPECT}/isc/video/plugin/download`);
};
