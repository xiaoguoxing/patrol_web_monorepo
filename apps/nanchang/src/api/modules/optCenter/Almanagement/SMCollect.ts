import http from '@/api';
import { PORT_INSPECT } from '@/api/config/servicePort';
import { ReqPage, ResPage } from '@/api/interface/index';
export interface List {
  id: string;
  algorithmName: string;
  attachmentImage: string;
  realityResult: string;
  recognitionResult: string;
  collectionStatus: 'todo' | 'finish';
  recoveryTime: string;
  imgPath: string;
  stateClassName: string;
  stateLabel: string;
}
export interface Search {
  algorithmName: string;
  collectionStatus: string;
}
// * 列表
export const SMCollectList = (params: Search) => {
  return http.post<ResPage<List>>(PORT_INSPECT + `/image/collection/page`, params);
};
// * 下载
export const SMCollectDownload = (params: { ids: string }) => {
  return http.post<Blob>(PORT_INSPECT + `/image/collection/export`, params, { responseType: 'blob', timeout: 0 });
};
// * 删除
export const SMCollectDel = (params: { ids: string }) => {
  return http.delete<ResPage<any>>(PORT_INSPECT + `/image/collection/batchDelete`, params);
};
