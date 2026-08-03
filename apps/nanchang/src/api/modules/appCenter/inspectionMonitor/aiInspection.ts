import { ReqPage, ResPage } from '@/api/interface/index';
import { PORT_INSPECT } from '@/api/config/servicePort';
import http from '@/api';
/**
 * @name 智能巡检
 */
export namespace AITask {
  export interface ReqGetTotalParams {
    taskStatus?: string;
    taskType?: string;
    taskName?: string;
    areaName?: string;
    objectName?: string;
    itemName?: string;
    itemStatus?: string;
    [key: string]: any;
  }
  export interface ReqGetParams extends ReqPage {
    taskStatus?: string;
    taskType?: string;
    taskName?: string;
    areaName?: string;
    objectName?: string;
    itemName?: string;
    itemStatus?: string;
    [key: string]: any;
  }
  export interface ReqGetDetailParams {
    taskId: string;
    areaName?: string;
    objectName?: string;
    itemName?: string;
    itemStatus?: string;
    itemIdList?: string[];
    [key: string]: any;
  }
  export interface ResList {
    //区域名称
    areaName: string;
    //任务执行类型
    executeType: string;

    //任务执行类型名称
    executeTypeName: string;

    //已巡检数量
    finishNum: number;

    //唯一id
    id: string;

    //巡检任务名称
    inspectionTaskName: string;

    //巡检项数量
    itemNum: number;

    //对象名称
    objectName: string;

    //所属组织
    orgCode: string;

    //任务-巡检项列表
    taskItemMapList: { [key: string]: any }[];

    //巡检任务计划id
    taskPlanId: string;

    //任务开始时间
    taskStartTime: string;

    //任务状态，详情见数据字典task_status
    taskStatus: string;

    //任务状态名称
    taskStatusName: string;

    //任务类型
    taskType: string;

    //任务类型名称
    taskTypeName: string;

    //任务用时，单位为秒
    taskUseTime: number;
    [key: string]: any;
  }
}
// * 获取任务明细列表
export const getTotalListApi = (params: AITask.ReqGetTotalParams) => {
  return http.get<AITask.ResList[]>(PORT_INSPECT + `/task/list`, params);
};
// * 获取任务分页列表
export const getListApi = (params: AITask.ReqGetParams) => {
  return http.get<ResPage<AITask.ResList>>(PORT_INSPECT + `/task/page`, params);
};
// * 获取任务详情
export const getDetailApi = (params: AITask.ReqGetDetailParams) => {
  return http.get<AITask.ResList>(PORT_INSPECT + `/task/detail`, params);
};
// * 获取任务类型统计
export const getStatisticsApi = () => {
  return http.get(PORT_INSPECT + `/task/taskTypeStatistics`);
};
export const webSocketUrl = PORT_INSPECT + `/websocket/inspection`;
