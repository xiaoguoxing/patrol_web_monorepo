import { ReqPage, ResPage } from '@/api/interface/index';
import { PORT_INSPECT } from '@/api/config/servicePort';
import http from '@/api';
/**
 * @name 任务类型
 */
export namespace TaskType {
  export interface ReqGetParams extends ReqPage {
    taskType?: string;
  }
  export interface ReqPostParams {
    taskType: string;
    priorityLevel: number;
    [key: string]: any;
  }
  export interface ResList {
    id: string;
    taskType: string;
    priorityLevel: number;
    [key: string]: any;
  }
}
// * 获取任务类型列表
export const getListApi = (params: TaskType.ReqGetParams) => {
  return http.get<ResPage<TaskType.ResList>>(PORT_INSPECT + `/taskType/list`, params);
};
// * 获取任务类型全部列表
export const getAllListApi = () => {
  return http.get<TaskType.ResList[]>(`${PORT_INSPECT}/taskType/select`);
};

// * 新增任务类型
export const addApi = (params: TaskType.ReqPostParams) => {
  return http.post(PORT_INSPECT + `/taskType/add`, params);
};

// * 编辑任务类型
export const editApi = (params: TaskType.ReqPostParams) => {
  return http.post(PORT_INSPECT + `/taskType/update`, params);
};

// * 删除任务类型
export const deleteApi = (params: { ids: string }) => {
  return http.delete(PORT_INSPECT + `/taskType/delete`, params);
};
