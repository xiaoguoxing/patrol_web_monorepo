import { ReqPage, ResPage } from '@/api/interface/index';
import { PORT_INSPECT } from '@/api/config/servicePort';
import http from '@/api';

/**
 * @name 视频存储器
 */
export namespace VideoStorage {
  export interface ReqGetParams extends ReqPage {
    storageName?: string; //视频存储器名称
    storageType?: string; //视频存储器类型
  }
  export interface ReqPostParams {
    storageAccount: string;
    storageHost: string;
    storageName: string;
    storagePassword: string;
    storagePort: string;
    storageType: string;
    id?: string;
  }
  export interface ResList {
    storageAccount: string;
    storageHost: string;
    storageName: string;
    storagePassword: string;
    storagePort: string;
    storageType: string;
    id: string;
    [key: string]: any;
  }
}
// * 获取视频存储器列表
export const getListApi = (params: VideoStorage.ReqGetParams) => {
  return http.get<ResPage<VideoStorage.ResList>>(PORT_INSPECT + `/storage/list`, params);
};
// * 获取摄像头列表
export const getAllListApi = () => {
  return http.get<VideoStorage.ResList[]>(PORT_INSPECT + `/storage/getAll`);
};
// * 新增视频存储器
export const addApi = (params: VideoStorage.ReqPostParams) => {
  return http.post(PORT_INSPECT + `/storage/add`, params);
};

// * 编辑视频存储器
export const editApi = (params: VideoStorage.ReqPostParams) => {
  return http.post(PORT_INSPECT + `/storage/update`, params);
};

// * 删除视频存储器
export const deleteApi = (params: { ids: string }) => {
  return http.delete(PORT_INSPECT + `/storage/delete`, params);
};
// * 详情视频存储器
export const detailApi = (params: { id: string }) => {
  return http.get<VideoStorage.ResList>(PORT_INSPECT + `/storage/getOne`, params);
};
