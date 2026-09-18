import http from '@/api';
import { PORT_INSPECT } from '@/api/config/servicePort';
export interface Row {
  [key: string]: any;
}

export const alarmWebSocketUrl = `${PORT_INSPECT}/websocket/alarm`;

export const getAlarmListApi = (params: { [k: string]: string | undefined }) => {
  return http.get(`${PORT_INSPECT}/alarm/record/getPopupAlarm`, params);
};
