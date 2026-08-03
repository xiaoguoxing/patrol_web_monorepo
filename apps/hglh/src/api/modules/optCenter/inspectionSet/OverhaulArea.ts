import { PORT_INSPECT } from '@/api/config/servicePort';
import http from '@/api';

export const getListApi = (params: any) => {
  return http.get<any>(PORT_INSPECT + `/maintenance/area/page`, params);
};
export const addApi = (params: any) => {
  return http.post(PORT_INSPECT + `/maintenance/area`, params);
};
export const editApi = (params: any) => {
  return http.put(PORT_INSPECT + `/maintenance/area`, params);
};
export const detailApi = (params: { ids: string }) => {
  return http.delete(PORT_INSPECT + `/maintenance/area/detail`, params);
};
export const deleteApi = (params: { ids: string }) => {
  return http.delete(PORT_INSPECT + `/maintenance/area/detele`, params);
};
export const getObjectTreeApi = (params: { areaId: string }) => {
  return http.get<any[]>(PORT_INSPECT + `/maintenance/area/tree`, params);
};
