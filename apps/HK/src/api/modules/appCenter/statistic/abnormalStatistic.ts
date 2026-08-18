import { PORT_INSPECT } from '@/api/config/servicePort';
import http from '@/api';
// * 获取列表
export const getListApi = (params: { dimension: string; startDate: string; endDate: string }) => {
  // return http.get<ResPage<Camera.ResList>>(PORT_INSPECT + `/camera/list`, params);
  return http.get<any>(PORT_INSPECT + `/statisticAnalysis/abnormalObjectStatistics`, params);
};
// * 获取列表
export const getChartApi = (params: { dimension: string }) => {
  // return http.get<ResPage<Camera.ResList>>(PORT_INSPECT + `/camera/list`, params);
  return http.get<any>(PORT_INSPECT + `/statisticAnalysis/abnormalItemTrendStatistics`, params);
};
