import { getDataURLOp2 } from '@/utils/util';
import { useWebSocket, UseWebSocketReturn, useIntervalFn, Pausable } from '@vueuse/core';

function Utf8ArrayToStr(array: Uint8Array) {
  let out, i, len, c;
  let char2, char3;
  out = '';
  len = array.length;
  i = 0;
  while (i < len) {
    c = array[i++];
    switch (c >> 4) {
      case 7:
        out += String.fromCharCode(c);
        break;
      case 13:
        char2 = array[i++];
        out += String.fromCharCode(((c & 0x1f) << 6) | (char2 & 0x3f));
        break;
      case 14:
        char2 = array[i++];
        char3 = array[i++];
        out += String.fromCharCode(((c & 0x0f) << 12) | ((char2 & 0x3f) << 6) | ((char3 & 0x3f) << 0));
        break;
    }
  }
  return out;
}
const node_env = import.meta.env.VITE_USER_NODE_ENV;
type MyFn = { (x: any): void; once?: boolean };
export class RtcEvent {
  handler: { [k: string]: any[] } = {};
  constructor() {}
  on(type: string, handler: MyFn, once: boolean = false) {
    if (!this.handler[type]) {
      this.handler[type] = [];
    }
    if (!this.handler[type].includes(handler)) {
      this.handler[type].push(handler);
      if (once) {
        //@ts-ignore
        handler.once = true;
      }
    }
  }
  trigger(type: string, eventData: {} = {}, _this: {} = this) {
    this.handler[type]?.forEach((fn: MyFn) => {
      fn.call(_this, eventData);
      if (fn.once) {
        this.off(type, fn);
      }
    });
  }
  off(type: string, handler?: MyFn) {
    if (!handler) {
      this.handler[type] = [];
      return false;
    }
    this.handler[type] = this.handler[type].filter((fn) => handler != fn);
  }
  offAll() {
    this.handler = {};
  }
  once(type: string, fn: MyFn) {
    this.on(type, fn, true);
  }
}
class Webrtc extends RtcEvent {
  videoEl: HTMLVideoElement;
  webrtc: RTCPeerConnection;
  id: string;
  serverUrl: string = '';
  streamUrl: string = '';
  cameraName: string = '';
  num: number = 0;
  header: Headers;
  timer: Pausable;
  lastReport: Record<string, any>;
  isRestartUrl?: boolean;
  getUrl?: () => Promise<string>;
  constructor(
    videoEl: HTMLVideoElement,
    streamId: string,
    url: string,
    iceServer: any[],
    isRestartUrl?: boolean,
    getUrl?: () => Promise<string>
  ) {
    super();
    this.videoEl = videoEl;
    this.isRestartUrl = isRestartUrl;
    this.getUrl = getUrl;
    this.id = streamId.split('_')[0];
    this.cameraName = streamId.split('_')[1];
    this.webrtc = new RTCPeerConnection({
      iceServers: [
        {
          urls: ['stun:stun.l.google.com:19302'],
        },
        /* {
          credential: '123',
          urls: ['turn:10.11.3.123:3478?transport=udp', 'turn:10.11.3.123:3478?transport=tcp'],
          username: 'root',
        },*/
        ...iceServer,
      ],
      // @ts-ignore
      sdpSemantics: 'unified-plan',
    });
    this.webrtc.addEventListener('iceconnectionstatechange', this.stateChange.bind(this));
    this.webrtc.addEventListener('connectionstatechange', this.stateChange2.bind(this));
    this.webrtc.addEventListener('icecandidateerror', (e) => {
      console.warn('ICE candidate error:', e);
    });
    this.header = new Headers([['Authorization', `Basic ${btoa('demo:demo')}`]]);
    this.serverUrl = serviceConfig[node_env].VITE_API_STREAM_URL;
    this.lastReport = {};
    this.timer = useIntervalFn(this.adjustResolutionBasedOnNetwork.bind(this), 1000);
    if (!serviceConfig[node_env].VITE_API_STREAM_URL) console.warn('媒体服务器地址未给！');
    if (!iceServer.length) console.warn('媒体服务器ice候选地址未给！');
    // window.addEventListener('beforeunload', this.disconnect.bind(this));
  }
  async getPlay() {
    let data = await fetch(`${this.serverUrl}/stream/${this.id}/info`, { method: 'get', headers: this.header });
    let data2 = (await data.json()) as { status: 0 | 1; payload: { channels: { url: string }[] } };
    if (data2.status === 0) {
      return true;
    } else if (data2.status === 1) {
      this.streamUrl = data2.payload.channels[0].url;
      return false;
    }
  }
  async addPlay(url: string) {
    try {
      let isTrue = await this.getPlay();
      let bodyData = JSON.stringify({
        uuid: this.id,
        name: `${this.cameraName}`,
        channels: {
          '0': {
            url: url,
            on_demand: true,
            debug: false,
          },
        },
      });
      if (isTrue) {
        await this.addCamera(bodyData);
      } else if (url !== this.streamUrl) {
        await this.editCamera(bodyData);
      }
      await this.startPlay();
    } catch (e: any) {
      throw new TypeError(e || '媒体服务器异常');
    }
  }
  async addCamera(bodyData: string) {
    await fetch(`${this.serverUrl}/stream/${this.id}/add`, {
      method: 'post',
      body: bodyData,
      headers: this.header,
    });
  }
  async editCamera(bodyData: string) {
    await fetch(`${this.serverUrl}/stream/${this.id}/edit`, {
      method: 'post',
      body: bodyData,
      headers: this.header,
    });
  }
  startPlay() {
    return new Promise((resolve, reject) => {
      this.webrtc.ontrack = (event) => {
        console.log(event.streams.length + ' track is delivered');
        event.track.onunmute = () => {
          this.videoEl.pause();
          if (this.videoEl) {
            this.videoEl.srcObject = event.streams[0];
            this.videoEl.play().then(() => resolve('start'));
          }
        };
      };
      this.webrtc.addTransceiver('video', { direction: 'sendrecv' });
      this.webrtc.addEventListener('negotiationneeded', async () => {
        this.connectRtc().catch((e) => reject(e));
      });
    });
  }
  delPlay() {
    fetch(`${this.serverUrl}/stream/${this.id}/delete`, {
      method: 'get',
      headers: this.header,
    }).then((data) => {
      try {
        // console.log(data);
      } catch (e) {
        console.warn(e);
      }
    });
  }
  disconnect() {
    if (this.videoEl?.srcObject) {
      for (const track of (this.videoEl.srcObject as MediaStream).getTracks()) {
        track.stop();
        (this.videoEl.srcObject as MediaStream).removeTrack(track);
      }
    }
    this.offAll();
    this.num = 0;
    this.webrtc.close();
    this.timer?.pause();
    // window.removeEventListener('beforeunload', this.disconnect.bind(this));
  }
  stateChange(e: Event) {
    // @ts-ignore
    if (this.webrtc.iceConnectionState === 'failed') this.reconnectPc();
    // if (!this.haveStream && this.webrtc.iceConnectionState === 'disconnected') this.trigger('streamError', {}, this);
  }
  stateChange2(e: Event) {
    // @ts-ignore
    if (this.webrtc.connectionState === 'failed') this.reconnectPc();
  }
  reconnectPc() {
    this.num++;
    this.trigger('reconnect', `重新连接......${this.num ? this.num : ''}`, this);
    if (!this.isRestartUrl) {
      this.connectRtc(true)
        .then(() => {
          this.trigger('connectSuccess', `重新连接成功`, this);
        })
        .catch((e) => {
          this.trigger('connectError', '重新连接失败', this);
        });
    } else {
      this.getUrl?.().then((res) => {
        this.editCamera(
          JSON.stringify({
            uuid: this.id,
            name: `${this.cameraName}`,
            channels: {
              '0': {
                url: res,
                on_demand: true,
                debug: false,
              },
            },
          })
        ).then((res) => {
          this.connectRtc(true)
            .then(() => {
              this.trigger('connectSuccess', `重新连接成功`, this);
            })
            .catch((e) => {
              this.trigger('connectError', '重新连接失败', this);
            });
        });
      });
    }
  }
  async connectRtc(restart: boolean = false) {
    const offer = await this.webrtc.createOffer({ iceRestart: restart });
    offer.sdp?.replace(/b=AS:\d+/g, 'b=AS:500');
    await this.webrtc.setLocalDescription(offer);
    try {
      let response = await fetch(`${this.serverUrl}/stream/${this.id}/channel/0/webrtc`, {
        method: 'POST',
        headers: this.header,
        // @ts-ignore
        body: new URLSearchParams({ data: btoa(this.webrtc.localDescription.sdp) }),
      });
      if (response.ok) {
        try {
          let data = await response.text();
          await this.webrtc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: atob(data) }));
        } catch (e) {
          return Promise.reject(e);
        }
      } else {
        return Promise.reject('获取视频流失败');
      }
    } catch (e) {
      return Promise.reject(e);
    }
  }
  getStats() {
    this.webrtc.getStats().then((res) => {
      res.forEach((report) => {
        if (report.type === 'inbound-rtp' && report.mediaType === 'video') {
          // 总带宽
          const videoBitrate = Math.round((report.bytesReceived * 8) / (report.timestamp - this.lastReport?.timestamp));
          // 视频丢包率
          const videoPacketLoss = (report.packetsLost / report.packetsReceived) * 100;
          // 视频帧速率
          const videoFrameRate = report.framesPerSecond;
          // 视频延时
          const videoDelay = report.totalProcessingDelay - this.lastReport?.totalProcessingDelay;
          // 视频宽度
          const videoWidth = report.frameWidth;
          // 视频高度
          const videoHeight = report.frameHeight;

          const durtion = report.timestamp - this.lastReport?.timestamp;
          if (0 >= durtion) {
            return 0;
          }
          let a =
            (1000 *
              8 *
              (report.bytesReceived +
                report.headerBytesReceived -
                this.lastReport?.bytesReceived +
                this.lastReport?.headerBytesReceived)) /
            durtion;

          console.log('Video resolution: ' + videoWidth + 'x' + videoHeight);
          console.log('Video frame rate: ' + videoFrameRate + ' fps');
          console.log('Video delay: ' + videoDelay + ' ms');
          console.log('Video packet loss: ' + videoPacketLoss + '%');
          console.log('Video bitrate: ' + videoBitrate + ' kbps');
          console.log('a: ' + a / 1024 / 1024 + 'Kbps');

          // Video resolution: 2560x1440
          // Video frame rate: 24 fps
          // Video delay: 0.286003 ms
          // Video packet loss: 0%
          // Video bitrate: 2739 kbps

          this.lastReport = report;
        }
      });
    });
  }
  async adjustResolutionBasedOnNetwork(pc = this.webrtc) {}
}
class webSocketVideoOp1 {
  mseQueue: BufferSource[] = [];
  // @ts-ignore
  mseSourceBuffer: SourceBuffer;
  mseStreamingStarted = false;
  videoEl: HTMLVideoElement;
  mseUrl: string;
  // @ts-ignore
  ws: WebSocket;
  constructor(videoEl: HTMLVideoElement, mseUrl: string) {
    this.videoEl = videoEl;
    this.mseUrl = `ws://10.11.3.123:30010/stream/${mseUrl}/channel/0/mse?uuid=${mseUrl}&channel=0`;
    this.videoEl.addEventListener('pause', () => {
      if (this.videoEl.currentTime > this.videoEl.buffered.end(this.videoEl.buffered.length - 1)) {
        this.videoEl.currentTime = this.videoEl.buffered.end(this.videoEl.buffered.length - 1) - 0.1;
        this.videoEl.play();
      }
    });
  }

  startPlay(url: string) {
    const mse = new MediaSource();
    this.videoEl.src = window.URL.createObjectURL(mse);
    mse.addEventListener(
      'sourceopen',
      () => {
        this.ws = new WebSocket(this.mseUrl);
        this.ws.binaryType = 'arraybuffer';
        this.ws.onopen = function (event) {
          console.log('Connect to ws');
        };
        this.ws.onmessage = (event) => {
          const data = new Uint8Array(event.data);
          if (data[0] === 9) {
            let mimeCodec;
            const decodedArr = data.slice(1);
            if (window.TextDecoder) {
              mimeCodec = new TextDecoder('utf-8').decode(decodedArr);
            } else {
              mimeCodec = Utf8ArrayToStr(decodedArr);
            }
            this.mseSourceBuffer = mse.addSourceBuffer('video/mp4; codecs="' + mimeCodec + '"');
            this.mseSourceBuffer.mode = 'segments';
            this.mseSourceBuffer.addEventListener('updateend', this.pushPacket.bind(this));
          } else {
            this.readPacket(event.data);
          }
        };
      },
      false
    );
  }

  pushPacket() {
    let packet: BufferSource | undefined;
    if (!this.mseSourceBuffer?.updating) {
      if (this.mseQueue.length > 0) {
        packet = this.mseQueue.shift();
        this.mseSourceBuffer.appendBuffer(packet!);
      } else {
        this.mseStreamingStarted = false;
      }
    }
    if (this.videoEl.buffered.length > 0) {
      // no sound, browser paused video without sound in background
      this.videoEl.currentTime = this.videoEl.buffered.end(this.videoEl.buffered.length - 1) - 0.5;
    }
  }

  readPacket(packet: BufferSource) {
    if (!this.mseStreamingStarted) {
      this.mseSourceBuffer.appendBuffer(packet);
      this.mseStreamingStarted = true;
      return;
    }
    this.mseQueue.push(packet);
    if (!this.mseSourceBuffer.updating) {
      this.pushPacket();
    }
  }

  disconnect() {
    this.ws.close();
  }
}
class webSocketVideo extends RtcEvent {
  videoEl: HTMLCanvasElement;
  url: string;
  videoCtx: CanvasRenderingContext2D;
  mseUrl: string;
  params: string;
  // @ts-ignore
  ws: UseWebSocketReturn<Blob>;
  constructor(videoEl: HTMLCanvasElement, params: string) {
    super();
    this.videoEl = videoEl;
    this.videoCtx = this.videoEl.getContext('2d')!;
    this.url = '';
    this.mseUrl = `${serviceConfig[node_env].VITE_API_AI_STREAM_URL}`;
    this.ws = useWebSocket(this.mseUrl, {
      onConnected: () => {
        this.trigger('wsOpen');
      },
      onMessage: (ws, event) => {
        this.wsMessage(event);
      },
      onError: () => {
        this.trigger('wsError');
      },
    });
    this.params = params;
  }
  addPlay(url: string) {
    this.videoCtx = this.videoEl.getContext('2d')!;
    this.ws.send(this.params);
  }
  wsMessage(event: MessageEvent) {
    if (event.data) {
      getDataURLOp2(event.data).then((blobUrl) => {
        if (this.url) window.URL.revokeObjectURL(this.url);
        this.url = blobUrl;
        let img = new Image();
        img.addEventListener('load', () => {
          this.videoCtx.clearRect(0, 0, this.videoEl.width, this.videoEl.height);
          this.videoCtx.drawImage(img, 0, 0, this.videoEl.width, this.videoEl.height);
        });
        img.src = this.url;
      });
    }
  }
  disconnect() {
    if (this.url) window.URL.revokeObjectURL(this.url);
    this.ws.close();
    this.offAll();
  }
}
export { webSocketVideo };
export default Webrtc;
