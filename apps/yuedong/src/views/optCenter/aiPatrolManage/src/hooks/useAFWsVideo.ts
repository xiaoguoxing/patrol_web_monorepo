import { useEventListener, useElementSize, UseElementSizeReturn, Fn } from '@vueuse/core';
import { watch, WatchHandle } from 'vue';
import { JSEncrypt } from 'jsencrypt';
import { RtcEvent } from '@/assets/js/webrtc';
import { getDict } from '@/utils/serviceDict';
type playMode = 1 | 0;
interface VideoSettings {
  appkey: string;
  secret: string;
  ip: string;
  port: number;
}
interface VideoPreViewSettings {
  url: string; //监控点编号
  config: {
    playURL: string; // 流媒体播放时必传
    mode: 0 | 1; // 解码类型：0=普通模式; 1=高级模式 默认为0
    PlayBackMode: 1 | 3; //1：绝对时间正放; 3 绝对时间倒放 默认为1
    keepDecoder: 0 | 1; // 0:回收解码资源; 1:不回收解码资源。为1时相同的编码格式，通过直接调用js_play接口切换点位不黑屏。默认0
    token: string; //开启安全认证使用的token，在后端开启安全认证时使用
  };
  windowIndex?: number; //可指定播放窗口（在2x2以上布局下可指定播放窗口）
}
export interface VideoPlayBackSettings extends VideoPreViewSettings {
  startTime?: number; //回放开始时间戳，必填
  endTime?: number; //回放结束时间戳，必填
}
interface HKControlConfig {
  scrollDom: HTMLDivElement | HTMLElement;
  buttonType: 1 | 2;
}
const IS_MOVE_DEVICE = document.body.clientWidth < 992;
class CreateHKWsVideo extends RtcEvent {
  oWebControl: any;
  initCount: number;
  playMode: number;
  Dom: HTMLDivElement;
  DomRect: UseElementSizeReturn;
  watchStop: WatchHandle;
  wndId: number = 1;
  config: HKControlConfig;
  stopScrollDom: Fn = () => {};
  stopScroll: Fn = () => {};
  stopResize: Fn = () => {};
  stopUnload: Fn = () => {};
  constructor(dom: HTMLDivElement, playMode: playMode = 0, config: HKControlConfig) {
    super();
    this.Dom = dom;
    this.initCount = 0;
    this.playMode = playMode;
    this.DomRect = useElementSize(this.Dom);
    this.config = Object.assign({ scrollDom: document.documentElement, buttonType: 1 }, config);
    this.watchStop = watch(this.DomRect.width, () => {
      this.setControlRect();
    });
    this.initPlugin().then((r) => {});
  }
  //注册服务
  async initPlugin() {
    try {
      this.oWebControl = new JSPlugin({
        szId: this.Dom.id, // 指定容器id
        szBasePath: './',
        iMaxSplit: 4,
        iCurrentSplit: IS_MOVE_DEVICE ? 1 : 2,
        openDebug: false,
        mseWorkerEnable: false, //是否开启多线程解码，分辨率大于1080P建议开启，否则可能卡顿
        bSupporDoubleClickFull: true, //是否支持双击全屏，true-双击是全屏；false-双击无响应
        oStyle: {
          borderSelect: IS_MOVE_DEVICE ? '#000' : '#FFCC00',
        },
      });
      this.initEvent();
      setTimeout(() => {
        this.trigger('success');
      }, 500);
    } catch (e) {
      this.trigger('error', JSON.stringify(e));
    }
  }
  //注册事件
  initEvent() {
    this.cbIntegrationCallBack();
    this.stopScrollDom = useEventListener(this.config.scrollDom, 'scroll', (e) => {
      this.setControlRect();
    });
    this.stopScroll = useEventListener('scroll', () => {
      this.setControlRect();
    });
    this.stopResize = useEventListener('resize', () => {
      this.setControlRect();
    });
    this.stopUnload = useEventListener('unload', () => {
      this.disconnect();
    });
  }
  //设置窗口
  async setArrangeWindow(index: number) {
    await this.oWebControl.JS_ArrangeWindow(index);
  }

  async startPlay(obj: VideoPlayBackSettings) {
    await this.oWebControl.JS_Play(obj.url, obj.config, this.wndId, obj.startTime, obj.endTime);
  }
  async stopPlay(windowIndex: number) {
    await this.oWebControl.JS_Stop(windowIndex);
  }
  async getVideoInfo() {
    return await this.oWebControl.JS_GetVideoInfo(this.wndId);
  }
  async getVideoId() {
    return await this.oWebControl.JS_GetTraceId(this.wndId);
  }

  cbIntegrationCallBack() {
    this.oWebControl.JS_SetWindowControlCallback({
      windowEventSelect: (iWndIndex: number) => {
        //插件选中窗口回调
        console.log(`选中哪个框:`, iWndIndex);
        this.wndId = iWndIndex;
      },
      pluginErrorHandler: (iWndIndex: number, iErrorCode: string, oError: string) => {
        //插件错误回调
        console.log('pluginError callback: ', iWndIndex, iErrorCode, oError);
      },
      windowEventUp: (index: number) => {
        //鼠标mouseup事件回调
        // do you want...
      },
    });
  }
  //
  setControlRect() {
    this.oWebControl.JS_Resize(this.DomRect.width.value, this.DomRect.height.value);
  }
  //
  disconnect() {
    this.stopScrollDom();
    this.stopScroll();
    this.stopResize();
    this.stopUnload();
    this.offAll();
    this.DomRect.stop();
    this.watchStop.stop();
    this.oWebControl.JS_StopRealPlayAll();
  }
}
export function getOS() {
  const userAgent = navigator.userAgent;
  const platform = navigator.platform;

  if (platform.indexOf('Win') > -1) return 'Windows';
  if (platform.indexOf('Mac') > -1) return 'macOS';
  if (platform.indexOf('X11') > -1) return 'Linux';
  if (platform.indexOf('Linux') > -1) return 'Linux';
  if (platform.indexOf('Android') > -1) return 'Android';
  if (platform.indexOf('iPhone') > -1) return 'iOS';
  if (platform.indexOf('iPad') > -1) return 'iOS';
  if (platform.indexOf('iPod') > -1) return 'iOS';

  // 如果以上都不匹配，尝试从 UserAgent 进一步判断
  if (userAgent.indexOf('Windows NT 10.0') > -1) return 'Windows 10/11';
  if (userAgent.indexOf('Windows NT 6.1') > -1) return 'Windows 7';
  if (userAgent.indexOf('Windows NT 6.0') > -1) return 'Windows Vista';
  if (userAgent.indexOf('Windows NT 5.1') > -1) return 'Windows XP';

  return 'Unknown';
}

export default CreateHKWsVideo;
