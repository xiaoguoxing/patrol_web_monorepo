import { createFetch } from '@vueuse/core';
const node_env = import.meta.env.VITE_USER_NODE_ENV;
const useMyFetch = createFetch({
  baseUrl: node_env === 'development' ? `/rtspToWebrtcMediaServer` : import.meta.env.VITE_API_STREAM_URL,
});
interface AddCameraData {
  name: string;
  rtsp: string;
  id: string;
}
// 详情
export const mediaAPIDetail = (id: string) => {
  return useMyFetch('/camera/detail?id=' + id)
    .get()
    .json();
};
// 新增
export const mediaAPIAdd = (params: AddCameraData) => {
  return useMyFetch('/camera/add', { body: JSON.stringify(params), headers: { 'Content-Type': 'application/json' } })
    .post()
    .json();
};
// 修改
export const mediaAPIUpdate = (params: AddCameraData) => {
  return useMyFetch('/camera/update', { body: JSON.stringify(params), headers: { 'Content-Type': 'application/json' } })
    .post()
    .json();
};
//获取有效信息
export const mediaAPIGetRtpCapabilities = () => {
  return useMyFetch('/mediasoup/getRtpCapabilities').json();
};
// 创建webrtc传输
export const mediaAPICreateWebRTC = () => {
  return useMyFetch('/mediasoup/createWebRTC').json();
};
//连接rtc
export const mediaAPIConnectWebrtc = (params: any) => {
  return useMyFetch('/mediasoup/connectWebrtc', {
    body: JSON.stringify(params),
    headers: { 'Content-Type': 'application/json' },
  })
    .post()
    .json();
};
//创建consumer
export const mediaAPICreateConsume = (params: any) => {
  return useMyFetch('/mediasoup/createConsume', {
    body: JSON.stringify(params),
    headers: { 'Content-Type': 'application/json' },
  })
    .post()
    .json();
};
//播放
export const mediaAPIConsumerResume = (id: string, quality: string) => {
  return useMyFetch(`/mediasoup/consumerResume?rtcId=${id}&quality=${quality}`);
};
//暂停
export const mediaAPIConsumerPause = (id: string, quality: string) => {
  return useMyFetch(`/mediasoup/consumerPause?rtcId=${id}&quality=${quality}`);
};
//销毁
export const mediaAPIDisconnectWebRtc = (id: string) => {
  return useMyFetch('/mediasoup/disconnectWebRtc?rtcId=' + id);
};
//统计信息
export const mediaAPIGetRtcTransportStats = (id: string, quality: string) => {
  return useMyFetch(`/mediasoup/getRtcTransportStats?rtcId=${id}&quality=${quality}`).json();
};
//摄像头是否启动传输
export const mediaAPIHasCreatePlainTransport = (cameraId: string) => {
  return useMyFetch('/mediasoup/hasCreatePlainTransport?cameraId=' + cameraId).json();
};
