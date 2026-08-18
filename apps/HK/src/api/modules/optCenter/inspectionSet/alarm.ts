import { ReqPage, ResPage } from '@/api/interface/index';
import { PORT_INSPECT } from '@/api/config/servicePort';
import http from '@/api';

/**
 * @name 告警配置
 */
export namespace Alarm {
  export enum AlarmAttributeEnum {
    STATUS = 1,
    NUMBER = 2,
  }
  export interface AlarmStatus {
    alarmId?: string;
    alarmMent: string;
    id?: string;
  }
  export interface ReqGetParams extends ReqPage {
    alarmAttribute?: AlarmAttributeEnum; //告警属性，1表示状态类报警，2表示参数类报警
    alarmLevel?: string; //告警等级
    alarmName?: string; //告警名称
    alarmType?: string; //告警类型
  }
  export interface ReqPostParams {
    alarmAttribute: AlarmAttributeEnum; //告警属性，1表示状态类报警，2表示参数类报警
    alarmIndexId?: string; //告警指标
    alarmLevel: string; //告警等级--数据字典，数据字典要有配置颜色功能，列表根据颜色显示
    alarmMentList?: AlarmStatus[]; //	告警状态集合
    alarmName: string; //告警名称
    alarmType: string; //告警 类型--数据字典
    isPopup: boolean; //是否弹窗
    id?: string;
    [key: string]: any;
  }
  export interface ResList {
    alarmAttribute: AlarmAttributeEnum; //告警属性，1表示状态类报警，2表示参数类报警
    alarmIndexId?: string; //告警指标
    alarmLevel: string; //告警等级--数据字典，数据字典要有配置颜色功能，列表根据颜色显示
    alarmMentList?: AlarmStatus[]; //	告警状态集合
    alarmName: string; //告警名称
    alarmType: string; //告警 类型--数据字典
    isPopup: boolean; //是否弹窗
    id: string;
    [key: string]: any;
  }
}
// * 获取告警配置列表
export const getListApi = (params: Alarm.ReqGetParams) => {
  return http.get<ResPage<Alarm.ResList>>(PORT_INSPECT + `/alarm/getList`, params);
};
// * 获取告警配置详情
export const getDetailApi = (params: { id: string }) => {
  return http.get<Alarm.ResList>(PORT_INSPECT + `/alarm/detail`, params);
};

// * 新增告警配置
export const addApi = (params: Alarm.ReqPostParams) => {
  return http.post(PORT_INSPECT + `/alarm/add`, params);
};

// * 编辑告警配置
export const editApi = (params: Alarm.ReqPostParams) => {
  return http.post(PORT_INSPECT + `/alarm/update`, params);
};

// * 删除告警配置
export const deleteApi = (params: { ids: string }) => {
  return http.delete(PORT_INSPECT + `/alarm/delete`, params);
};
// * 批量开启/关闭弹窗提醒
export const turnApi = (params: { ids: string; isPopup: boolean }) => {
  return http.post(PORT_INSPECT + `/alarm/turnOnOrOff`, params);
};
/**
 * @name 告警指标设置
 */
export namespace AlarmIndex {
  export interface ReqPostParams {
    indexName: string; //指标名称
    indexUnit: string; //指标单位
    id?: string;
  }
  export interface ResList {
    indexName: string; //指标名称
    indexUnit: string; //指标单位
    id: string;
    [key: string]: any;
  }
}
// * 获取告警指标列表
export const getIndexListApi = () => {
  return http.get<AlarmIndex.ResList[]>(PORT_INSPECT + `/alarm/getIndex`);
};

// * 新增告警指标
export const addIndexApi = (params: AlarmIndex.ReqPostParams) => {
  return http.post(PORT_INSPECT + `/alarm/addIndex`, params);
};

// * 编辑告警指标
export const editIndexApi = (params: AlarmIndex.ReqPostParams) => {
  return http.post(PORT_INSPECT + `/alarm/updateIndex`, params);
};

// * 删除告警指标
export const deleteIndexApi = (params: { id: string }) => {
  return http.delete(PORT_INSPECT + `/alarm/deleteIndex`, params);
};
