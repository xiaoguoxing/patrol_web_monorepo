import http from '@/api';
import { PORT_INSPECT, PORT_HIKVISION } from '@/api/config/servicePort';
export interface Tree {
  id: string;
  nodeName: string;
  nodeType: number;
  relatedAlgorithm: boolean;
  syncData: boolean;
  children?: Tree[];
}
export interface UserApi {
  ip: string;
  url?: string;
  port: string;
  userName: string;
  password: string;
}
export interface UserApi2 {
  cameraHost: string;
  cameraPort: string;
  cameraAccount: string;
  modelList: string;
  id: string;
  cameraId: string;
  presetPositionInfo: string;
  cameraPassword: string;
  cameraName: string;
  storageId: string;
  channelNum: number;
  dwChannel: number;
  cameraType: string;
  inTask: boolean;
}
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
export interface RealVideo {
  ip: string;
  port: string;
  userName: string;
  password: string;
  dwChannel: number;
  startTime: string;
  stopTime: string;
  businessId: string;
}
export type btnStr = keyof typeof btnType;
export type btnStr2 = keyof typeof btnType2;
export interface ptzcontrol {
  channelNum: number;
  command: btnType | btnType2;
  start: boolean;
  url?: string;
  speed: number;
}
//登陆
export const getUserApi = (params: UserApi) => {
  return http.get<ptzcontrol>(`${PORT_HIKVISION}/hikvision/retrieveCamera`, params, { headers: { noLoading: true } });
};
//云台控制
export const ptzcontrolApi = (params: ptzcontrol) => {
  return http.get(`${PORT_HIKVISION}/hikvision/ptzcontrol`, params, { headers: { noLoading: true } });
};
//抓图
export const capturePic = (params: { channelNum: number } | UserApi) => {
  return http.get(`${PORT_HIKVISION}/hikvision/capturePic`, params, {
    responseType: 'blob',
  });
};
//是否在线
export const online = (params: { channelNum: number } | UserApi) => {
  return http.get(`${PORT_HIKVISION}/hikvision/online`, params, { headers: { noLoading: true } });
};
//预置位操作
export const preset = (params: { channelNum: number } | UserApi) => {
  return http.get(`${PORT_HIKVISION}/hikvision/preset`, params, { headers: { noLoading: true } });
};
//视频回放
export const realVideo = (params: RealVideo) => {
  return http.get<string>(`${PORT_HIKVISION}/hikvision/playBackByTime`, params, { headers: { noLoading: true } });
};
//视频预览
// export const CameraUrl = `/abc/hikvision/video/rtspReal.flv`;
// 实时视频地址
export const CameraUrl = `${import.meta.env.VITE_API_URL}${PORT_HIKVISION}/hikvision/video/rtspReal.flv`;
// 录像视频地址
export const VideoUrl = `${import.meta.env.VITE_API_URL}${PORT_HIKVISION}/hikvision/video/rtspBack.flv`;
// export const CameraUrl = `/api/hikvision/video/rtspReal.flv`;
// 摄像头树
export const getCameraTreeApi = () => {
  return http.get<Tree[]>(`${PORT_INSPECT}/camera/tree`);
};
// 摄像头详情
export const cameraInfoApi = (params: { id: string }) => {
  return http.get<UserApi2>(`${PORT_INSPECT}/camera/detail`, params, { headers: { noLoading: true } });
};
// 摄像头详情
export const cameraInTask = (params: { itemId: string }) => {
  return http.get<UserApi2>(`${PORT_INSPECT}/presetPosition/gotoOne`, params, { headers: { noLoading: true } });
};
// 转动详情
export const cameraRotate = (params: { presetIndex: number; command: number } | UserApi) => {
  return http.get<UserApi2>(`${PORT_HIKVISION}/hikvision/preset`, params, { headers: { noLoading: true } });
};
