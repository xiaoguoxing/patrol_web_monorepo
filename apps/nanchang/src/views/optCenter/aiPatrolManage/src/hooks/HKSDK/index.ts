export type HikProtocol = 1 | 2;
export type HikStreamType = 1 | 2 | 3;

export interface HikLoginOptions {
  ip: string;
  port: number;
  username: string;
  password: string;
  protocol?: HikProtocol;
}

export interface HikChannel {
  id: number;
  name: string;
  kind: 'analog' | 'digital' | 'zero';
  online: boolean;
  zeroChannel: boolean;
}

export interface HikPreviewOptions {
  deviceIdentify: string;
  channelId: number;
  streamType?: HikStreamType;
  rtspPort?: number;
  zeroChannel?: boolean;
  proxy?: boolean;
  windowIndex?: number;
}

export interface HikPlaybackOptions {
  deviceIdentify: string;
  channelId: number;
  startTime: Date | string;
  endTime?: Date | string;
  streamType?: 1 | 2;
  rtspPort?: number;
  proxy?: boolean;
  windowIndex?: number;
}

export interface HikWebSdkOptions {
  assetBaseUrl?: string;
  width?: number | string;
  height?: number | string;
  onWindowSelected?: (windowIndex: number) => void;
  onPlaybackEnded?: (windowIndex: number) => void;
  onError?: (error: Error) => void;
}

type XmlElementLike = Element;

interface HikWindowStatus {
  szDeviceIdentify: string;
}

interface HikDevicePort {
  iDevicePort: number;
  iRtspPort: number;
}

interface HikCallbackOptions {
  async?: boolean;
  success?: (xml?: XMLDocument) => void;
  error?: (status?: number, xml?: XMLDocument) => void;
}

interface WebVideoCtrlApi {
  I_SupportNoPlugin(): boolean;
  I_InitPlugin(width: number | string, height: number | string, options: Record<string, unknown>): void;
  I_InsertOBJECTPlugin(containerId: string): number;
  I_Login(
    ip: string,
    protocol: number,
    port: number,
    username: string,
    password: string,
    options: HikCallbackOptions
  ): number;
  I_Logout(deviceIdentify: string): number;
  I_GetAnalogChannelInfo(deviceIdentify: string, options: HikCallbackOptions): void;
  I_GetDigitalChannelInfo(deviceIdentify: string, options: HikCallbackOptions): void;
  I_GetZeroChannelInfo(deviceIdentify: string, options: HikCallbackOptions): void;
  I_GetDevicePort(deviceIdentify: string): HikDevicePort | null;
  I_GetWindowStatus(windowIndex?: number): HikWindowStatus | null;
  I_StartRealPlay(deviceIdentify: string, options: Record<string, unknown>): void;
  I_StartPlayback(deviceIdentify: string, options: Record<string, unknown>): void;
  I_Stop(options: HikCallbackOptions & { iWndIndex?: number }): void;
  I_Resume(options: HikCallbackOptions & { iWndIndex?: number }): void;
  I_ChangeWndNum(iWndType: number): void;
  I_StopAll(): Promise<void>;
  I_PTZControl(
    iPTZIndex: number,
    bStop: boolean,
    options: HikCallbackOptions & { iPTZSpeed: number; iWndIndex: number }
  ): Promise<void>;
  I_Resize(width: number, height: number): void;
  I_DestroyWorker?(): void;
}

declare global {
  interface Window {
    WebVideoCtrl?: WebVideoCtrlApi;
    jQuery?: unknown;
    $?: unknown;
  }
}

const scriptLoads = new Map<string, Promise<void>>();

export class HikvisionWebSdk {
  private readonly options: Required<Pick<HikWebSdkOptions, 'width' | 'height'>> & HikWebSdkOptions;
  private selectedWindowIndex = 0;
  private containerId = '';
  private initialized = false;
  private readonly loggedDevices = new Set<string>();
  // 仅记录当前实例创建的运行时脚本，避免误删宿主页面已有依赖。
  private readonly runtimeScriptUrls = new Set<string>();

  constructor(options: HikWebSdkOptions = {}) {
    this.options = {
      ...options,
      assetBaseUrl: (options.assetBaseUrl ?? '/webs/codebase').replace(/\/$/, ''),
      width: options.width ?? '100%',
      height: options.height ?? '100%',
    };
  }

  async init(container: string | HTMLElement): Promise<void> {
    if (this.initialized) return;
    // 每次重新初始化都从第一个窗口开始，避免沿用上次组件的选窗状态。
    this.selectedWindowIndex = 0;
    this.containerId = this.resolveContainerId(container);
    await this.loadRuntime();

    const api = this.api;
    if (!api.I_SupportNoPlugin()) {
      throw new Error('当前浏览器不支持海康无插件播放器，请升级浏览器');
    }

    await new Promise<void>((resolve, reject) => {
      api.I_InitPlugin(this.options.width, this.options.height, {
        bWndFull: true,
        iPackageType: 2,
        iWndowType: 1,
        bNoPlugin: true,
        cbSelWnd: (xml: XMLDocument) => {
          const value = xml.querySelector('SelectWnd')?.textContent;
          this.selectedWindowIndex = Number.parseInt(value ?? '0', 10);
          this.options.onWindowSelected?.(this.selectedWindowIndex);
        },
        cbEvent: (eventType: number, windowIndex: number) => {
          if (eventType === 2) this.options.onPlaybackEnded?.(windowIndex);
        },
        cbPluginErrorHandler: (windowIndex: number, errorCode: number) => {
          const error = new Error(`窗口 ${windowIndex} 播放异常，错误码：${errorCode}`);
          this.options.onError?.(error);
        },
        cbInitPluginComplete: () => {
          const result = api.I_InsertOBJECTPlugin(this.containerId);
          if (result === -1) {
            reject(new Error('播放器插入页面失败'));
            return;
          }
          this.initialized = true;
          resolve();
        },
      });
    });
  }

  async login(options: HikLoginOptions): Promise<string> {
    this.assertInitialized();
    if (!options.ip || !options.port || !options.username) {
      throw new Error('IP、端口和用户名不能为空');
    }

    const deviceIdentify = `${options.ip}_${options.port}`;
    const result = await new Promise<number>((resolve, reject) => {
      const code = this.api.I_Login(
        options.ip,
        options.protocol ?? 1,
        options.port,
        options.username,
        options.password,
        {
          success: () => resolve(0),
          error: (status, xml) => reject(this.createSdkError('登录失败', status, xml)),
        }
      );
      if (code === -1) resolve(-1);
    });

    this.loggedDevices.add(deviceIdentify);
    if (result === -1) return deviceIdentify;
    return deviceIdentify;
  }

  async getChannels(deviceIdentify: string): Promise<HikChannel[]> {
    this.assertLoggedIn(deviceIdentify);
    const [analog, digital, zero] = await Promise.all([
      this.requestChannels(deviceIdentify, 'analog'),
      this.requestChannels(deviceIdentify, 'digital'),
      this.requestChannels(deviceIdentify, 'zero'),
    ]);
    return [...analog, ...digital, ...zero];
  }

  getDevicePorts(deviceIdentify: string): HikDevicePort {
    this.assertLoggedIn(deviceIdentify);
    const ports = this.api.I_GetDevicePort(deviceIdentify);
    if (!ports) throw new Error('获取设备端口失败');
    return ports;
  }

  async startPreview(options: HikPreviewOptions): Promise<void> {
    this.assertLoggedIn(options.deviceIdentify);
    const windowIndex = options.windowIndex ?? 0;
    await this.stopIfPlaying(windowIndex);
    await this.invokePlayback('I_StartRealPlay', options.deviceIdentify, {
      iWndIndex: windowIndex,
      iRtspPort: options.rtspPort,
      iStreamType: options.streamType ?? 1,
      iChannelID: options.channelId,
      bZeroChannel: options.zeroChannel ?? false,
      bProxy: options.proxy ?? false,
    });
  }

  async startPlayback(options: HikPlaybackOptions): Promise<void> {
    this.assertLoggedIn(options.deviceIdentify);
    const windowIndex = options.windowIndex ?? 0;
    const startTime = this.formatTime(options.startTime);
    // const endTime = this.formatTime(options.endTime);
    // if (startTime >= endTime) throw new Error('回放结束时间必须晚于开始时间');

    await this.stopIfPlaying(windowIndex);
    await this.invokePlayback('I_StartPlayback', options.deviceIdentify, {
      iWndIndex: windowIndex,
      iRtspPort: options.rtspPort,
      iStreamType: options.streamType ?? 1,
      iChannelID: options.channelId,
      szStartTime: startTime,
      // szEndTime: endTime,
      bProxy: options.proxy ?? false,
    });
  }

  async stop(windowIndex = this.selectedWindowIndex): Promise<void> {
    if (!this.initialized || !this.api.I_GetWindowStatus(windowIndex)) return;
    await new Promise<void>((resolve, reject) => {
      this.api.I_Stop({
        iWndIndex: windowIndex,
        success: () => resolve(),
        error: (status, xml) => reject(this.createSdkError('停止播放失败', status, xml)),
      });
    });
  }
  async stopAll(): Promise<void> {
    await this.api.I_StopAll();
  }

  async resume(windowIndex = this.selectedWindowIndex): Promise<void> {
    if (!this.initialized || !this.api.I_GetWindowStatus(windowIndex)) return;
    await new Promise<void>((resolve, reject) => {
      this.api.I_Resume({
        iWndIndex: windowIndex,
        success: () => resolve(),
        error: (status, xml) => reject(this.createSdkError('停止播放失败', status, xml)),
      });
    });
  }

  async PTZControl(
    iPTZIndexb: number,
    Stop: boolean,
    iPTZSpeed: number,
    windowIndex = this.selectedWindowIndex
  ): Promise<void> {
    if (!this.initialized || !this.api.I_GetWindowStatus(windowIndex)) return;
    await new Promise<void>((resolve, reject) => {
      this.api.I_PTZControl(iPTZIndexb, Stop, {
        iWndIndex: windowIndex,
        iPTZSpeed: iPTZSpeed,
        success: () => resolve(),
        error: (status, xml) => reject(this.createSdkError('停止播放失败', status, xml)),
      });
    });
  }

  async changeWindowLayout(iWndType: number): Promise<void> {
    this.api.I_ChangeWndNum(iWndType);
  }

  resize(width: number, height: number): void {
    if (this.initialized && width > 0 && height > 0) this.api.I_Resize(width, height);
  }

  async destroy(): Promise<void> {
    if (this.initialized) {
      try {
        await this.api.I_StopAll();
      } finally {
        for (const deviceIdentify of this.loggedDevices) this.api.I_Logout(deviceIdentify);
        this.loggedDevices.clear();
        this.api.I_DestroyWorker?.();
        document.getElementById(this.containerId)?.replaceChildren();
        this.initialized = false;
      }
    }

    // 即使初始化中途失败，SDK 也可能已经动态插入插件脚本。
    this.selectedWindowIndex = 0;
    this.removeHikPlugin();
    this.removeRuntimeScripts();
  }

  private removeHikPlugin() {
    // 匹配 exact src 或者模糊匹配（防带 query 参数的情况）
    const scripts = document.querySelectorAll(`script[src*="jsPlugin-3.0.0.min.js"]`);
    scripts.forEach((script) => {
      script.remove(); // 直接从父节点中移除该元素
    });
  }

  private removeRuntimeScripts(): void {
    const webVideoCtrlUrl = new URL(`${this.options.assetBaseUrl}/webVideoCtrl.js`, document.baseURI).href;

    Array.from(document.scripts)
      .filter((script) => script.src === webVideoCtrlUrl)
      .forEach((script) => script.remove());

    // 只卸载有选窗状态的 SDK 主脚本；jQuery 和加密脚本继续常驻。
    scriptLoads.delete(webVideoCtrlUrl);
    this.runtimeScriptUrls.delete(webVideoCtrlUrl);

    // webVideoCtrl.js 通过全局单例保护初始化，必须删除后才能重新加载。
    delete window.WebVideoCtrl;
  }

  private get api(): WebVideoCtrlApi {
    if (!window.WebVideoCtrl) throw new Error('海康 WebVideoCtrl SDK 尚未加载');
    return window.WebVideoCtrl;
  }

  private async loadRuntime(): Promise<void> {
    const base = this.options.assetBaseUrl!;
    await this.loadScript(`${base}/jsPlugin/jquery.min.js`);
    await this.loadScript(`${base}/encryption/AES.js`);
    await this.loadScript(`${base}/encryption/cryptico.min.js`);
    await this.loadScript(`${base}/encryption/crypto-3.1.2.min.js`);
    await this.loadScript(`${base}/webVideoCtrl.js`, 'videonode');
  }

  private loadScript(src: string, id?: string): Promise<void> {
    const absoluteSrc = new URL(src, document.baseURI).href;
    const existing = scriptLoads.get(absoluteSrc);
    if (existing) return existing;

    const promise = new Promise<void>((resolve, reject) => {
      const loaded = Array.from(document.scripts).find((item) => item.src === absoluteSrc);
      if (loaded) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      if (id) script.id = id;
      script.src = absoluteSrc;
      script.async = false;
      script.onload = () => {
        script.dataset.loaded = 'true';
        resolve();
      };
      script.onerror = () => {
        script.remove();
        this.runtimeScriptUrls.delete(absoluteSrc);
        scriptLoads.delete(absoluteSrc);
        reject(new Error(`SDK 脚本加载失败：${src}`));
      };
      this.runtimeScriptUrls.add(absoluteSrc);
      document.head.appendChild(script);
    });
    scriptLoads.set(absoluteSrc, promise);
    return promise;
  }

  private resolveContainerId(container: string | HTMLElement): string {
    const element = typeof container === 'string' ? document.getElementById(container) : container;
    if (!element) throw new Error('播放器容器不存在');
    if (!element.id) element.id = `hik-player-${crypto.randomUUID?.() ?? Date.now()}`;
    return element.id;
  }

  private requestChannels(deviceIdentify: string, kind: HikChannel['kind']): Promise<HikChannel[]> {
    const apiName =
      kind === 'analog'
        ? 'I_GetAnalogChannelInfo'
        : kind === 'digital'
        ? 'I_GetDigitalChannelInfo'
        : 'I_GetZeroChannelInfo';

    return new Promise((resolve) => {
      this.api[apiName](deviceIdentify, {
        async: false,
        success: (xml) => resolve(xml ? this.parseChannels(xml, kind) : []),
        // 部分设备没有某类通道，这是正常情况。
        error: () => resolve([]),
      });
    });
  }

  private parseChannels(xml: XMLDocument, kind: HikChannel['kind']): HikChannel[] {
    const selector =
      kind === 'analog' ? 'VideoInputChannel' : kind === 'digital' ? 'InputProxyChannelStatus' : 'ZeroVideoChannel';

    return Array.from(xml.querySelectorAll(selector)).flatMap((node, index) => {
      const id = Number.parseInt(this.xmlText(node, 'id'), 10);
      const online = kind !== 'digital' || this.xmlText(node, 'online') !== 'false';
      const enabled = kind !== 'zero' || this.xmlText(node, 'enabled') === 'true';
      if (!Number.isFinite(id) || !online || !enabled) return [];

      const prefix = kind === 'analog' ? 'Camera' : kind === 'digital' ? 'IPCamera' : 'Zero Channel';
      return [
        {
          id,
          name: this.xmlText(node, 'name') || `${prefix} ${String(index + 1).padStart(2, '0')}`,
          kind,
          online,
          zeroChannel: kind === 'zero',
        },
      ];
    });
  }

  private xmlText(node: XmlElementLike, selector: string): string {
    return node.querySelector(selector)?.textContent?.trim() ?? '';
  }

  private async stopIfPlaying(windowIndex = this.selectedWindowIndex): Promise<void> {
    if (this.api.I_GetWindowStatus(windowIndex)) await this.stop(windowIndex);
  }

  private invokePlayback(
    method: 'I_StartRealPlay' | 'I_StartPlayback',
    deviceIdentify: string,
    options: Record<string, unknown>
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      this.api[method](deviceIdentify, {
        ...options,
        success: () => resolve(),
        error: (status: number, xml: XMLDocument) => {
          const message = status === 403 ? '设备不支持当前 WebSocket 取流方式' : '播放失败';
          reject(this.createSdkError(message, status, xml));
        },
      });
    });
  }

  private createSdkError(message: string, status?: number, xml?: XMLDocument): Error {
    const detail = xml?.querySelector('subStatusCode, statusString')?.textContent?.trim();
    return new Error([message, status, detail].filter(Boolean).join('：'));
  }

  private formatTime(value: Date | string): string {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) throw new Error('回放时间格式无效');
    const pad = (part: number) => String(part).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(
      date.getMinutes()
    )}:${pad(date.getSeconds())}`;
  }

  private assertInitialized(): void {
    if (!this.initialized) throw new Error('请先初始化播放器');
  }

  private assertLoggedIn(deviceIdentify: string): void {
    this.assertInitialized();
    if (!this.loggedDevices.has(deviceIdentify)) throw new Error('设备尚未登录');
  }
}
