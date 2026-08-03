import http from '@/api';
import { PORT_INSPECT } from '@/api/config/servicePort';

export enum btnType {
  '上' = 'UP',
  '下' = 'DOWN',
  '左' = 'LEFT',
  '右' = 'RIGHT',
  '上左' = 'LEFT_UP',
  '下左' = 'LEFT_DOWN',
  '上右' = 'RIGHT_UP',
  '下右' = 'RIGHT_DOWN',
  '自动转圈' = '111',
}
export enum btnType2 {
  '焦距大' = 'ZOOM_IN',
  '焦距小' = 'ZOOM_OUT',
  '焦点前' = 'FOCUS_NEAR',
  '焦点后' = 'FOCUS_FAR',
  '光圈大' = 'IRIS_ENLARGE',
  '光圈小' = 'IRIS_REDUCE',
}
export type btnStr = keyof typeof btnType;
export type btnStr2 = keyof typeof btnType2;
export interface ptzcontrol {
  command: btnType | btnType2;
  action: 0 | 1;
  cameraIndexCode: string;
  speed: number;
}

//云台控制
export const ptzcontrolApi = (params: ptzcontrol) => {
  return http.post(`${PORT_INSPECT}/isc/controlling`, params, { headers: { noLoading: true } });
};
//抓图
export const capturePic = (params: { cameraIndexCode: string }) => {
  return http.post(`${PORT_INSPECT}/isc/manualCapture`, params, {
    responseType: 'blob',
  });
};

export const cameraRotate = (presetIndex: number, cameraIndexCode: string) => {
  return http.post(
    `${PORT_INSPECT}/isc/controlling`,
    { presetIndex, command: 'GOTO_PRESET', action: 1, speed: 50, cameraIndexCode },
    { headers: { noLoading: true } }
  );
};
