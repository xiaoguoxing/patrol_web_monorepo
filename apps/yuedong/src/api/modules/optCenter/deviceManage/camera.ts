import { ReqPage, ResPage } from '@/api/interface/index';
import { PORT_INSPECT } from '@/api/config/servicePort';
import http from '@/api';

/**
 * @name 摄像头
 */
export namespace Camera {
  export interface ReqGetParams extends ReqPage {
    areaId?: string; //区域Id
    cameraName?: string; //摄像头名称
    cameraStatus?: string; //状态
    cameraType?: string; //摄像头类型
    relatedSkills?: string; //关联技能
  }
  export interface ReqPostParams {
    areaId: string; //区域Id
    cameraAccount: string;
    cameraHost: string;
    cameraName: string;
    cameraPassword: string;
    cameraPort: string;
    cameraStatus: string;
    cameraType: string;
    relatedSkills: string;
    storageId: string;
    id?: string;
  }
  export interface ResList {
    areaId: string; //区域Id
    cameraAccount: string;
    cameraHost: string;
    cameraName: string;
    cameraPassword: string;
    cameraPort: string;
    cameraStatus: string;
    cameraType: string;
    relatedSkills: string;
    id: string;
    storageId: string;
    [key: string]: any;
  }
}
// * 获取摄像头列表
export const getListApi = (params: Camera.ReqGetParams) => {
  return http.get<ResPage<Camera.ResList>>(PORT_INSPECT + `/camera/list`, params);
};
// *获取巡检设备树
export const getTreeApi = () => {
  //TODO：树的结构还不清晰
  return http.get<Camera.ResList[]>(PORT_INSPECT + `/camera/tree`);
};

// * 新增摄像头
export const addApi = (params: Camera.ReqPostParams) => {
  return http.post(PORT_INSPECT + `/camera/add`, params);
};

// * 编辑摄像头
export const editApi = (params: Camera.ReqPostParams) => {
  return http.post(PORT_INSPECT + `/camera/update`, params);
};

// * 删除摄像头
export const deleteApi = (params: { ids: string }) => {
  return http.delete(PORT_INSPECT + `/camera/delete`, params);
};
