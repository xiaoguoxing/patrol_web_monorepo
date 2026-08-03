import { RtcEvent } from '@/assets/js/webrtc';

const node_env = import.meta.env.VITE_USER_NODE_ENV;
import { detectDeviceAsync, Device, types as mediaSoupTypes } from 'mediasoup-client';
import {
  mediaAPIAdd,
  mediaAPIConnectWebrtc,
  mediaAPIConsumerPause,
  mediaAPIConsumerResume,
  mediaAPICreateConsume,
  mediaAPICreateWebRTC,
  mediaAPIDetail,
  mediaAPIDisconnectWebRtc,
  mediaAPIGetRtcTransportStats,
  mediaAPIGetRtpCapabilities,
  mediaAPIHasCreatePlainTransport,
  mediaAPIUpdate,
} from '@/api/modules/mediasoupAPI';

class ConnectCamera {
  device?: mediaSoupTypes.Device;
  webRtcPort?: mediaSoupTypes.Transport<any>;
  webRtcPortConsumers?: {
    [key in string]: mediaSoupTypes.Consumer<any>;
  } = {};
  videoDom: HTMLAudioElement;
  cameraId: string;
  quality?: string;

  constructor(cameraId: string, videoDom: HTMLAudioElement) {
    this.videoDom = videoDom;
    this.cameraId = cameraId;
  }

  async init() {
    await this.isDevice();
    await this.getRouter();
    await this.createWebRTC();
  }

  async getRouter() {
    const { data } = await mediaAPIGetRtpCapabilities();
    let { data: routerRtpCapabilities, code, msg } = data.value;
    if (code !== 0) {
      this.device = new Device();
      await this.device.load({ routerRtpCapabilities });
    } else {
      return Promise.reject(msg);
    }
  }

  async createWebRTC() {
    const { data: res1 } = await mediaAPIHasCreatePlainTransport(this.cameraId);
    const {
      data: { start },
      code,
      msg,
    } = await res1.value;
    if (code !== 0) {
      if (start) {
        const { data: resTransport } = await mediaAPICreateWebRTC();
        const { data: transportOptions, code, msg } = await resTransport.value;
        if (code !== 0) {
          this.webRtcPort = this.device!.createRecvTransport(transportOptions);
          this.webRtcPort.on('connect', this.connectWebRTC.bind(this));
        } else {
          return Promise.reject(msg);
        }
      } else {
        return Promise.reject(msg);
      }
    } else {
      return Promise.reject(msg);
    }
  }

  async connectWebRTC(
    { dtlsParameters }: { dtlsParameters: mediaSoupTypes.DtlsParameters },
    callback: () => void,
    errorBack: (err: Error) => void
  ) {
    try {
      // 发请求告诉后端要连接 transport，附带 dtlsParameters
      await mediaAPIConnectWebrtc({
        rtcId: this.webRtcPort!.id,
        dtlsParameters,
      });
      callback();
    } catch (error) {
      errorBack(error as Error);
    }
  }

  async createWebRTCConsume() {
    const { data: res2 } = await mediaAPICreateConsume({
      cameraId: this.cameraId,
      rtcId: this.webRtcPort!.id,
      rtpCapabilities: this.device!.rtpCapabilities,
    });
    let { data: consume, code, msg } = await res2.value;
    if (code !== 0) {
      for (const [key, value] of Object.entries(consume)) {
        let webRtcPortConsumer = await this.webRtcPort!.consume(
          value as mediaSoupTypes.ConsumerOptions<mediaSoupTypes.AppData>
        );
        webRtcPortConsumer.on('trackended', () => {
          console.log('意外停止1');
          this.disconnect();
        });
        webRtcPortConsumer.observer.on('trackended', () => {
          console.log('意外停止2');
          this.disconnect();
        });
        this.webRtcPortConsumers![key] = webRtcPortConsumer;
      }

      /*const stream = new MediaStream();
      stream.addTrack(this.webRtcPortConsumer.track);
      this.videoDom.srcObject = stream;
      await this.videoDom.play();*/
    } else {
      return Promise.reject(msg);
    }
  }

  async isDevice() {
    const handlerName = await detectDeviceAsync();

    if (handlerName) {
      return Promise.resolve(handlerName);
    } else {
      return Promise.reject(false);
    }
  }

  async switchQuality(quality: string) {
    const consumer = this.webRtcPortConsumers![quality];
    this.quality = quality;
    await this.resume();
    consumer.resume();
    let stream = await this.isTrackReady(consumer);
    this.videoDom.srcObject = stream;
    await this.videoDom.play();
    await Promise.all(
      Object.keys(this.webRtcPortConsumers!)
        .filter((key) => key !== quality)
        .map(async (key) => {
          this.webRtcPortConsumers![key].pause();
          await this.pause(key);
        })
    );
  }

  async isTrackReady(consumer: mediaSoupTypes.Consumer) {
    const previewVideo = document.createElement('video');
    previewVideo.muted = true;
    previewVideo.playsInline = true;
    previewVideo.style.display = 'none';
    let stream = new MediaStream();
    stream.addTrack(consumer.track);
    previewVideo.srcObject = stream;
    document.body.appendChild(previewVideo);
    await previewVideo.play().catch(() => {});
    document.body.removeChild(previewVideo);
    return stream;
  }

  async resume() {
    await mediaAPIConsumerResume(this.webRtcPort!.id, this.quality!);
  }

  async pause(quality: string) {
    await mediaAPIConsumerPause(this.webRtcPort!.id, quality!);
  }

  async disconnect() {
    for (const [key, value] of Object.entries(this.webRtcPortConsumers!)) {
      value?.close();
    }
    this.webRtcPort?.close();
    if (this.webRtcPort?.id) await mediaAPIDisconnectWebRtc(this.webRtcPort.id);
    this.webRtcPort = undefined;
    this.webRtcPortConsumers = {};
  }

  setCameraId(id: string) {
    this.cameraId = id;
  }

  async getRtcTransportStats() {
    let { data: response } = await mediaAPIGetRtcTransportStats(this.webRtcPort!.id, this.quality!);
    try {
      let { data } = await response.value;
      return data;
    } catch (e) {
      return Promise.reject(e);
    }
  }

  detectWeakNetwork(transportStats: any, rtpStatsList: any[]) {
    const warnings = [];

    // 1. Transport 层分析
    const rtt = transportStats.roundTripTime ?? 0;
    const sendBitrate = transportStats.sendBitrate ?? 0;
    const availableOutgoingBitrate = transportStats.availableOutgoingBitrate ?? 0;

    if (rtt > 0.3) {
      warnings.push(`RTT 高 (${(rtt * 1000).toFixed(0)}ms)，可能存在延迟`);
    }

    if (availableOutgoingBitrate < sendBitrate * 0.6) {
      warnings.push(
        `可用发送带宽 (${(availableOutgoingBitrate / 1000).toFixed(0)}kbps) 明显低于当前发送码率 (${(
          sendBitrate / 1000
        ).toFixed(0)}kbps)，可能存在带宽瓶颈`
      );
    }

    // 2. RTP 层分析（逐个流判断）
    for (const rtp of rtpStatsList) {
      const { type, packetsLost, fractionLost, jitter, nackCount, pliCount, firCount, score, roundTripTime, bitrate } =
        rtp;

      if (type === 'inbound-rtp') {
        if (jitter > 100) {
          warnings.push(`视频流 jitter 高 (${jitter}ms)，可能导致卡顿`);
        }
        if (fractionLost > 0.05) {
          warnings.push(`视频流丢包率高 (${(fractionLost * 100).toFixed(2)}%)`);
        }
      }

      if (type === 'outbound-rtp') {
        if (roundTripTime > 0.3) {
          warnings.push(`上行 RTT 高 (${(roundTripTime * 1000).toFixed(0)}ms)`);
        }
      }

      if ((nackCount ?? 0) > 10) {
        warnings.push(`NACK 请求频繁 (${nackCount} 次)，说明接收端经常丢包`);
      }

      if ((pliCount ?? 0) > 5 || (firCount ?? 0) > 3) {
        warnings.push(`PLI/FIR 请求频繁 (PLI: ${pliCount}, FIR: ${firCount})，可能视频卡顿`);
      }

      if (score !== undefined && score < 7) {
        warnings.push(`mediasoup score 较低（${score}/10），流质量差`);
      }
    }

    const isWeakNetwork = warnings.length > 0;
    return { isWeakNetwork, warnings };
  }
}

class Webrtc extends RtcEvent {
  videoEl: HTMLVideoElement;
  webrtc: ConnectCamera;
  id: string;
  streamUrl: string = '';
  cameraName: string = '';
  num: number = 0;
  constructor(videoEl: HTMLVideoElement, streamId: string, url: string, iceServer: any[]) {
    super();
    this.videoEl = videoEl;
    this.id = streamId.split('_')[0];
    this.cameraName = streamId.split('_')[1];
    this.webrtc = new ConnectCamera(this.id, videoEl);
  }
  async getIsPlayDetail() {
    let { data } = await mediaAPIDetail(this.id);
    let { data: res } = data.value;
    this.streamUrl = res?.rtsp || undefined;
    return !!res;
  }
  async addPlay(url: string) {
    try {
      let isTrue = await this.getIsPlayDetail();
      if (!isTrue) {
        await this.addUrl(url);
      } else if (url !== this.streamUrl) {
        await this.updateUrl(url);
      }
      await this.InitPlay();
    } catch (e: any) {
      throw new TypeError(e || '媒体服务器异常');
    }
  }
  async addUrl(url: string) {
    let bodyData = {
      name: `${this.cameraName}`,
      rtsp: url,
      id: this.id,
    };
    await mediaAPIAdd(bodyData);
  }
  async updateUrl(url: string) {
    let bodyData = {
      name: `${this.cameraName}`,
      rtsp: url,
      id: this.id,
    };
    await mediaAPIUpdate(bodyData);
  }
  async InitPlay() {
    await this.webrtc.init();
    await this.webrtc.createWebRTCConsume();
  }
  async switchQuality(quality: string) {
    return this.webrtc.switchQuality(quality);
  }
  disconnect() {
    if (this.videoEl?.srcObject) {
      for (const track of (this.videoEl.srcObject as MediaStream).getTracks()) {
        track.stop();
        (this.videoEl.srcObject as MediaStream).removeTrack(track);
      }
    }
    this.offAll();
    this.webrtc.disconnect().then(() => {});
  }
}

export default Webrtc;
