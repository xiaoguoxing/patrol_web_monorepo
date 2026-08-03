export enum PlayType {
  realtime = 1, //实时监控
  playback = 2, //回放
  alarm = 3, //实时监控报警
  robot = 4, //轨道机器人
  HKRealtime = 5, //海康的实时监控
  HKWsRealtime = 6, //海康的实时监控ws
}
export type PlayKey = keyof typeof PlayType;
export type Quality = '原画' | '720P' | '360P';
