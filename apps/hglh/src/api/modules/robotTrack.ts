import http from '@/api';
import { PORT_INSPECT } from '@/api/config/servicePort';
//云台
export enum btnType {
  '上' = 21,
  '下',
  '左',
  '右',
  '上左',
  '上右',
  '下左',
  '下右',
  '自动转圈',
}

export enum btnType2 {
  '焦距大' = 11,
  '焦距小',
  '焦点前',
  '焦点后',
  '光圈大',
  '光圈小',
}
export type btnStr = keyof typeof btnType;
export type btnStr2 = keyof typeof btnType2;
export interface CloudCommand {
  orbitalIndexCode?: string;
  cameraIndexCode?: string;
  command?: btnType | btnType2;
  action?: number;
  speed?: number;
  appKey?: string;
  appSecret?: string;
  host?: string;
}
//抓图
export const capturePic = (params: CloudCommand) => {
  return http.post(`${PORT_INSPECT}/robot/manualCapture`, params, {
    responseType: 'blob',
  });
};
// 转动详情
export const cameraRotate = (params: any) => {
  return http.post(`${PORT_INSPECT}/robot/gotoPoint`, params, { headers: { noLoading: true } });
};
//
export const getStreamRTSP = (params: CloudCommand) => {
  return http.post<{ url: string }>(`${PORT_INSPECT}/robot/getPreviewURLs`, params, { headers: { noLoading: true } });
};
// 转动详情
export const ptzcontrolApi = (params: CloudCommand) => {
  return http.post<{ url: string }>(`${PORT_INSPECT}/robot/orbitalControl`, params, { headers: { noLoading: true } });
};
