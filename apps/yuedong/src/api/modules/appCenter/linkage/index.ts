import { ReqPage, ResPage } from '@/api/interface/index';
import { PORT_INSPECT } from '@/api/config/servicePort';
import http from '@/api';
/**
 * @name 智能联动
 */
export namespace AILinkageTask {
  export interface ReqGetTotalParams {
    id?: string;

    [key: string]: any;
  }
  export interface ReqGetParams extends ReqPage {
    id?: string;

    [key: string]: any;
  }
  export interface ReqGetDetailParams {
    id: string;

    [key: string]: any;
  }
  export interface ResList {
    //任务-巡检项列表
    itemMapList: { [key: string]: any }[];

    [key: string]: any;
  }
}
// * 获取任务明细列表
export const getTotalListApi = (params: AILinkageTask.ReqGetTotalParams) => {
  return http.get<AILinkageTask.ResList[]>(PORT_INSPECT + `/linkage/record/list`, params);
};
// * 获取任务分页列表
export const getListApi = (params: AILinkageTask.ReqGetParams) => {
  return http.get<ResPage<AILinkageTask.ResList>>(PORT_INSPECT + `/linkage/record/page`, params);
};
// * 获取任务详情
export const getDetailApi = (params: AILinkageTask.ReqGetDetailParams) => {
  return http.get<AILinkageTask.ResList>(PORT_INSPECT + `/linkage/record/detail`, params);
};
// * 获取任务数量
export const getStatisticsApi = () => {
  return http.get(PORT_INSPECT + `/linkage/record/get/num`);
};
export const webSocketUrl = PORT_INSPECT + `/websocket/linkage`;
