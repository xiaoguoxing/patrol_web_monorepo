import http from '@/api';
import { PORT_INSPECT } from '@/api/config/servicePort';
export const getConfigDetailList = (params: any) => {
  // `${PORT_INSPECT}/eam-service-system/sys/ConfigDetail/getList`
  return http.get('/eam-service-system/sys/ConfigDetail/getList', params);
};

export const getConfigDetailHTML = (params: any) => {
  // `${PORT_INSPECT}/eam-service-system/sys/ConfigDetail/getList`
  return http.get(`${PORT_INSPECT}/operation/manuals/index`, params, {
    headers: { noLoading: true },
    responseType: 'blob',
    timeout: 0,
  });
};
