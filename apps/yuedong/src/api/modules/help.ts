import http from '@/api';
import { PORT_SYSTEM } from '@/api/config/servicePort';
export const getConfigDetailList = (params: any) => {
  // `${PORT_INSPECT}/eam-service-system/sys/ConfigDetail/getList`
  return http.get(`${PORT_SYSTEM}/sys/ConfigDetail/getList`, params);
};
