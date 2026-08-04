import { WebControl } from '../../../../../../public/web-control.esm.min';
import { useEventListener, useElementSize, UseElementSizeReturn, Fn } from '@vueuse/core';
import { watch, WatchHandle } from 'vue';
import { JSEncrypt } from 'jsencrypt';
import { RtcEvent } from '@/assets/js/webrtc';
import { getDict } from '@/utils/serviceDict';
import { getOS } from './useAFWsVideo';
type playMode = 1 | 0;
interface VideoSettings {
  appkey: string;
  secret: string;
  ip: string;
  port: number;
}
interface VideoPreViewSettings {
  cameraIndexCode: string; //监控点编号
  streamMode?: 0 | 1; //0-主码流，1-子码流
  transMode: 0 | 1; //0-UDP，1-TCP
  gpuMode: 0 | 1; //0-不启用，1-启用
  wndId: number; //可指定播放窗口（在2x2以上布局下可指定播放窗口）
}
export interface VideoPlayBackSettings extends VideoPreViewSettings {
  startTimeStamp: number; //回放开始时间戳，必填
  endTimeStamp: number; //回放结束时间戳，必填
  recordLocation: 0 | 1; //录像存储位置：0-中心存储，1-设备存储
}
interface HKControlConfig {
  scrollDom: HTMLDivElement | HTMLElement;
  buttonType: 1 | 2 | 3 | 4;
}
class CreateHKVideo extends RtcEvent {
  oWebControl: any;
  pubKey: string = '';
  initCount: number;
  playMode: number;
  Dom: HTMLDivElement;
  DomRect: UseElementSizeReturn;
  watchStop: WatchHandle;
  wndId: number = 1;
  cameraIndexCode: string = '';
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
    this.initPlugin();
  }
  //注册服务
  initPlugin() {
    this.oWebControl = new WebControl({
      szPluginContainer: this.Dom.id, // 指定容器id
      iServicePortStart: 15900, // 指定起止端口号，建议使用该值
      iServicePortEnd: 15900,
      szClassId: '23BF3B0A-2C56-4D97-9C03-0CB103AA8F11', // 用于IE10使用ActiveX的clsid
      cbConnectSuccess: async () => {
        try {
          this.initEvent();
          await this.startService();
          this.trigger('success');
        } catch (e) {
          console.log(e);
          this.trigger('error', JSON.stringify(e));
        }
      },
      cbConnectError: () => {
        // 创建WebControl实例失败
        this.oWebControl = null;
        this.restartWebControl();
      },
      cbConnectClose: (bNormalClose: boolean) => {
        // 异常断开：bNormalClose = false
        // JS_Disconnect正常断开：bNormalClose = true
        this.oWebControl = null;
        if (!bNormalClose) {
          this.restartWebControl();
        }
      },
    });
  }
  //注册事件
  initEvent() {
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
  //重启
  restartWebControl() {
    this.trigger('message', '插件未启动，正在尝试启动，请稍候...');
    WebControl.JS_WakeUp('VideoWebPlugin://');
    this.initCount++;
    if (this.initCount < 3) {
      setTimeout(() => {
        this.initPlugin();
      }, 3000);
    } else {
      this.trigger('error', '插件启动失败，请检查插件是否安装！');
    }
  }
  //启动服务
  async startService() {
    let osName = getOS();
    // 创建WebControl实例成功
    await this.oWebControl.JS_StartService('window', {
      // WebControl实例创建成功后需要启动服务
      dllPath: osName.startsWith('Win') ? './VideoPluginConnect.dll' : './libVideoPluginConnect.so', // 值"./VideoPluginConnect.dll"写死
    });
    // 启动插件服务成功
    this.oWebControl.JS_SetWindowControlCallback({
      // 设置消息回调
      cbIntegrationCallBack: (obj: { responseMsg: string }) => this.cbIntegrationCallBack(obj),
    });
    //
    await this.oWebControl.JS_CreateWnd(this.Dom.id, this.DomRect.width.value, this.DomRect.height.value);
    //JS_CreateWnd创建视频播放窗口，宽高可设定
    // 创建播放实例成功后初始化
    await this.getPubKey();

    await this.initVideo();
  }
  //获取密钥
  async getPubKey() {
    let oData = await this.requestInterface('getRSAPubKey', {
      keyLength: 1024,
    });
    if (oData.responseMsg.data) {
      this.pubKey = oData.responseMsg.data;
    }
  }
  //RSA加密
  setEncrypt(value: string) {
    const encrypt = new JSEncrypt();
    encrypt.setPublicKey(this.pubKey);
    return encrypt.encrypt(value);
  }
  //视频配置
  videoSetting({ appkey, secret, ip, port }: VideoSettings) {
    let { buttonType } = this.config;
    let toolBarButtonIDs = '4096,4097,4098';
    switch (buttonType) {
      case 1:
        toolBarButtonIDs = '4098';
        break;
      case 2:
        toolBarButtonIDs = '4096,4097,4098';
        break;
      case 3:
        // 0,16,256,257,258,259,260,512,513,514,515,516,517,768,769
        toolBarButtonIDs = '2304,2305,2307,2306,2308,2309,4096,4097,4098';
        break;
      case 4:
        // 0,16,256,257,258,259,260,512,513,514,515,516,517,768,769
        toolBarButtonIDs = '2304,2305,2307,2306,2308,2309,4098';
        break;
    }
    return {
      appkey: appkey, //综合安防管理平台提供的appkey，必填
      secret: this.setEncrypt(secret), //综合安防管理平台提供的secret，必填
      ip: ip, //综合安防管理平台IP地址，必填
      playMode: this.playMode, //初始播放模式：0-预览，1-回放
      port: port, //综合安防管理平台端口，若启用HTTPS协议，默认443
      snapDir: 'D:\\SnapDir', //抓图存储路径
      videoDir: 'D:\\VideoDir', //紧急录像或录像剪辑存储路径
      layout: '1x1', //playMode指定模式的布局
      enableHTTPS: 1, //是否启用HTTPS协议与综合安防管理平台交互，这里总是填1
      encryptedFields: 'secret', //加密字段，默认加密领域为secret
      showToolbar: 1, //是否显示工具栏，0-不显示，非0-显示
      showSmart: 1, //是否显示智能信息（如配置移动侦测后画面上的线框），0-不显示，非0-显示
      buttonIDs: '0,16,257,515,516', //自定义工具条按钮
      toolBarButtonIDs,
    };
  }
  async initVideo() {
    let resIceServer = await getDict('isc_config');
    let obj = Object.fromEntries(resIceServer.map((i) => [i.value, i.label]));
    obj.port = parseInt(obj.port);
    await this.requestInterface('init', this.videoSetting(obj));
    this.setControlRect();
  }

  async startPlay(obj: VideoPlayBackSettings) {
    await this.requestInterface(this.playMode === 0 ? 'startPreview' : 'startPlayback', { ...obj, wndId: this.wndId });
  }
  async stopPlay() {
    await this.requestInterface(this.playMode === 0 ? 'stopAllPreview' : 'stopAllPlayback');
  }

  async requestInterface(funcName: string, obj?: { [x: string]: any }) {
    return await this.oWebControl.JS_RequestInterface({
      funcName,
      argument: JSON.stringify(obj),
    });
  }
  cbIntegrationCallBack(oData: { responseMsg: string }) {
    let res = oData.responseMsg as unknown as { type: number; msg: { [x: string]: any } };
    let data = res.msg;
    switch (res.type) {
      case 1:
        //选中哪个框
        console.log(`选中哪个框:`, data);
        this.wndId = data.wndId;
        if (data.result === 256) {
          this.cameraIndexCode = data.cameraIndexCode;
          this.trigger('cameraChange', data.cameraIndexCode);
        } else {
          this.trigger('cameraChange', data.cameraIndexCode);
        }
        break;
      case 2:
        // 预览/回放播放消息
        console.log(`播放消息:`, res);
        if (data.result === 768) {
          this.cameraIndexCode = data.cameraIndexCode;
          this.trigger('cameraChange', data.cameraIndexCode);
          this.trigger('videoPlay', data.cameraIndexCode);
        } else if (data.result === 769) {
          this.trigger('cameraChange', '');
          this.trigger('cameraChangeFinl', data);
        }
        break;
      case 5:
        // 进入全屏
        break;
      case 6:
        // 切换布局
        break;
      case 11:
        // 移入
        break;
      case 12:
        // 移出
        break;
      case 13:
        // 选中某个框
        break;
      case 14:
        // 清除全部
        break;
      default:
        console.log(res.type);
        console.log(res);
        return;
    }
  }
  hideControl() {
    this.oWebControl.JS_HideWnd();
  }
  showControl() {
    this.oWebControl.JS_ShowWnd();
  }
  //
  setControlRect() {
    this.oWebControl.JS_Resize(this.DomRect.width.value, this.DomRect.height.value);
    this.setWndCover();
    this.setOuterRect();
  }
  setWndCover() {
    let { scrollDom = document.documentElement } = this.config;
    let iWidth = scrollDom.getBoundingClientRect().width;
    let iHeight = scrollDom.getBoundingClientRect().height;
    let oDivRect = this.Dom.getBoundingClientRect();
    let iCoverLeft = oDivRect.left < 0 ? Math.abs(oDivRect.left) : 0;
    let iCoverTop = oDivRect.top < 0 ? Math.abs(oDivRect.top) : 0;
    let iCoverRight = oDivRect.right - iWidth > 0 ? Math.round(oDivRect.right - iWidth) : 0;
    let iCoverBottom = oDivRect.bottom - iHeight > 0 ? Math.round(oDivRect.bottom - iHeight) : 0;

    iCoverLeft = iCoverLeft > 1000 ? 1000 : iCoverLeft;
    iCoverTop = iCoverTop > 600 ? 600 : iCoverTop;
    iCoverRight = iCoverRight > 1000 ? 1000 : iCoverRight;
    iCoverBottom = iCoverBottom > 600 ? 600 : iCoverBottom;

    try {
      this.setRepairPartWindow(0, 0, 1001, 600); // 多1个像素点防止还原后边界缺失一个像素条
      if (iCoverLeft != 0) {
        this.setCuttingPartWindow(0, 0, iCoverLeft, 600);
      }
      if (iCoverTop != 0) {
        this.setCuttingPartWindow(0, 0, 1001, iCoverTop); // 多剪掉一个像素条，防止出现剪掉一部分窗口后出现一个像素条
      }
      if (iCoverRight != 0) {
        this.setCuttingPartWindow(1000 - iCoverRight, 0, iCoverRight, 600);
      }
      if (iCoverBottom != 0) {
        this.setCuttingPartWindow(0, 600 - iCoverBottom, 1000, iCoverBottom);
      }
    } catch (e) {
      console.log(e);
    }
  }
  setRepairPartWindow(...args: number[]) {
    this.oWebControl.JS_RepairPartWindow(...args);
  }
  setCuttingPartWindow(...args: number[]) {
    this.oWebControl.JS_CuttingPartWindow(...args);
  }
  setOuterRect() {
    let d = document.querySelector('.transverse-menu-pop.el-popper[aria-hidden="false"]');
    if (!d) return;
    let obj = this.getOverlapRect(d.getBoundingClientRect(), this.Dom.getBoundingClientRect());
    if (obj) {
      this.setCuttingPartWindow(
        obj.left - this.Dom.getBoundingClientRect().left,
        obj.top - this.Dom.getBoundingClientRect().top,
        obj.width,
        obj.height
      );
    }
  }
  resetRect() {
    this.setRepairPartWindow(0, 0, 1001, 600);
  }
  getOverlapRect(a: DOMRect, b: DOMRect) {
    const left = Math.max(a.left, b.left);
    const top = Math.max(a.top, b.top);
    const right = Math.min(a.left + a.width, b.left + b.width);
    const bottom = Math.min(a.top + a.height, b.top + b.height);

    const width = right - left;
    const height = bottom - top;

    if (width > 0 && height > 0) {
      return { left, top, width, height };
    } else {
      return null; // 不重叠
    }
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
    this.oWebControl.JS_HideWnd();
    this.oWebControl.JS_Disconnect();
  }
}
export default CreateHKVideo;
