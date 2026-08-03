import { PORT_INSPECT } from '@/api/config/servicePort';
import http from '@/api';
// * 获取列表
export const getListApi = (params: { dimension: string; startTime: string; endTime: string }) => {
  // return http.get<ResPage<Camera.ResList>>(PORT_INSPECT + `/camera/list`, params);
  return http.get<any>(PORT_INSPECT + `/statisticAnalysis/alarmOverview`, params);
};
// * 获取列表
export const getChartApi = (params: { dimension: string }) => {
  // return http.get<ResPage<Camera.ResList>>(PORT_INSPECT + `/camera/list`, params);
  return http.get<any>(PORT_INSPECT + `/statisticAnalysis/alarmTrendStateStatistics`, params);
};
