export enum PlayType {
  realtime = 1, //实时监控
  playback = 2, //回放
  alarm = 3, //实时监控报警
  robot = 4, //轨道机器人
  HKSDKVideo = 7, //海康摄像头SDK实时视频
  HKSDKPlayback = 8, //海康摄像头SDK视频回放
}
export type PlayKey = keyof typeof PlayType;
export type Quality = '原画' | '720P' | '360P';
