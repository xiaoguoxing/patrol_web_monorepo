import { computed, reactive, ref, watch } from 'vue';
import { useDevicesList, useTimeoutFn, useUserMedia, useWebSocket, UseWebSocketReturn } from '@vueuse/core';
import { UiEvent } from '../../../utils/event';
import Recorder from 'recorder-core';
function IIRFilter_DigitalAudio(useLowPass: boolean, sampleRate: number, freq: number) {
  let Q = 1;
  let ov = (2 * Math.PI * freq) / sampleRate;
  let sn = Math.sin(ov);
  let cs = Math.cos(ov);
  let alpha = sn / (2 * Q);

  let a0 = 1 + alpha;
  let a1 = (-2 * cs) / a0;
  let a2 = (1 - alpha) / a0;

  let b0: number;
  let b1: number;
  let b2: number;
  if (useLowPass) {
    b0 = (1 - cs) / 2 / a0;
    b1 = (1 - cs) / a0;
    b2 = (1 - cs) / 2 / a0;
  } else {
    b0 = (1 + cs) / 2 / a0;
    b1 = -(1 + cs) / a0;
    b2 = (1 + cs) / 2 / a0;
  }

  let x1 = 0,
    x2 = 0,
    y = 0,
    y1 = 0,
    y2 = 0;
  return function (x: number) {
    y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1;
    x1 = x;
    y2 = y1;
    y1 = y;
    return y;
  };
}
type SpeechRecognitionErrorCode =
  | 'aborted'
  | 'audio-capture'
  | 'bad-grammar'
  | 'language-not-supported'
  | 'network'
  | 'no-speech'
  | 'not-allowed'
  | 'service-not-allowed';
export function useListenMp(wss: Wss) {
  const circleSize = ref(1);
  let audioContext: AudioContext;
  let analyser: AnalyserNode;
  let microphone: MediaStreamAudioSourceNode;
  let dataArray: Uint8Array;
  let animationFrameId: number;
  let rec: any;
  let sendBuf: Int16Array;
  let sampleBuf = new Int16Array();
  const { audioInputs: microphones } = useDevicesList({
    requestPermissions: true,
    constraints: {
      audio: true,
    },
  });

  const currentMicrophone = computed(() => microphones.value[0]?.deviceId);
  const {
    stream,
    start: aStart,
    enabled,
    stop: aStop,
    isSupported,
  } = useUserMedia({
    constraints: reactive({
      audio: {
        deviceId: currentMicrophone,
        noiseSuppression: true, // 启用降噪
        echoCancellation: true, // 启用回声消除
        autoGainControl: true, // 自动增益
      },
    }),
  });
  watch(stream, async (value) => {
    if (value) {
      listen();
      pcm();
    }
  });
  function pcm() {
    rec = Recorder({
      type: 'pcm',
      bitRate: 16,
      sampleRate: 16000,
      sourceStream: stream.value!,
      onProcess: (buffer: BufferSource[], a: number, bufferDuration: number, bufferSampleRate: number) => {
        let data_48k = buffer[buffer.length - 1];
        let abc = IIRFilter_DigitalAudio(false, bufferSampleRate, 5000);
        let array_48k = new Array(data_48k);

        let data_16k = Recorder.SampleData(array_48k, bufferSampleRate, 16000).data;
        let pcm1 = new Int16Array(data_16k.length);
        for (let i = 0; i < pcm1.length; i++) {
          let v = data_16k[i];
          data_16k[i] = abc(v);
        }
        sampleBuf = Int16Array.from([...sampleBuf, ...data_16k]);
        let chunk_size = 960; // for asr chunk_size [5, 10, 5]
        while (sampleBuf.length >= chunk_size) {
          sendBuf = sampleBuf.slice(0, chunk_size);
          sampleBuf = sampleBuf.slice(chunk_size, sampleBuf.length);

          wss.send(sendBuf, true);
        }
      },
    });
    console.log(rec);
    rec.open(() => {
      rec.start();
    });
  }
  function listen() {
    audioContext = new AudioContext();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 256; // 频率分辨率，值越小越敏感
    microphone = audioContext.createMediaStreamSource(stream.value!);
    microphone.connect(analyser);
    dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyzeAudio();
  }
  const analyzeAudio = () => {
    analyser.getByteFrequencyData(dataArray);
    let sum = dataArray.reduce((a, b) => a + b, 0);
    let volume = sum / dataArray.length / 255; // 计算音量大小（归一化）
    circleSize.value = volume * 50; // 放大1.5倍，但不超过1
    animationFrameId = requestAnimationFrame(analyzeAudio);
  };
  function audioClear() {
    circleSize.value = 0; // 复位
    if (audioContext) {
      audioContext
        ?.close()
        .then(() => {})
        .catch(() => {});
    }
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    aStop();
    rec?.close();
    sampleBuf = new Int16Array();
  }
  return {
    circleSize,
    audioClear,
    isSupported,
    aStart,
    enabled,
  };
}
export class Wss extends UiEvent {
  wsUrl: string = '';
  ws: UseWebSocketReturn<any>;
  offline_text: string = '';
  rec_text: string = '';
  stateStr: string = '';
  constructor(url: string) {
    super();
    this.wsUrl = url;
    this.ws = useWebSocket(this.wsUrl, {
      onConnected: () => {
        this.getConnState('请说出内容');
        this.trigger('first');
      },
      onDisconnected: () => {
        this.getConnState('ASR连接关闭');
        this.trigger('error');
      },
      onError: (ws, event) => {
        this.getConnState(`连接失败,请检查ASR地址和端口`);
        this.trigger('error');
      },
      onMessage: (ws, event) => {
        this.getResult(event);
      },
      immediate: false,
    });
  }
  openWss() {
    try {
      this.ws.open();
    } catch (e) {
      console.log(e);
    }
  }
  stopWss() {
    this.ws.close();
    this.offAll();
  }
  async startOne() {
    this.clearText();
    // online offline 2pass
    let request = {
      chunk_size: [5, 10, 5],
      wav_name: 'h5',
      is_speaking: true,
      chunk_interval: 10,
      itn: false,
      mode: '2pass',
      hotwords: this.getHotWords() || '',
    };
    await this.send(JSON.stringify(request));
  }
  async endOne() {
    let request = {
      chunk_size: [5, 10, 5],
      wav_name: 'h5',
      is_speaking: false,
      chunk_interval: 10,
      mode: '2pass',
    };
    await this.send(JSON.stringify(request));
    this.clearText();
  }
  async send(request: any, buffer = false) {
    let resSend = this.ws.send(request, buffer);
    return resSend ? Promise.resolve(resSend) : Promise.reject(resSend);
  }
  getResult(jsonMsg: MessageEvent) {
    let rectxt = '' + JSON.parse(jsonMsg.data)['text'];
    let asrmodel = JSON.parse(jsonMsg.data)['mode'];
    let is_final = JSON.parse(jsonMsg.data)['is_final'];
    let timestamp = JSON.parse(jsonMsg.data)['timestamp'];
    if (asrmodel == '2pass-offline' || asrmodel == 'offline') {
      this.offline_text = this.offline_text + this.handleWithTimestamp(rectxt, timestamp); //rectxt; //.replace(/ +/g,"");
      this.rec_text = this.offline_text;
    } else {
      this.rec_text = this.rec_text + rectxt; //.replace(/ +/g,"");
    }
    this.trigger('result', this.rec_text);
    this.trigger('final', is_final);
  }
  handleWithTimestamp(tmptext: string, tmptime: string) {
    if (tmptime == null || tmptime == 'undefined' || tmptext.length <= 0) {
      return tmptext;
    }
    tmptext = tmptext.replace(/。|？|，|、|\?|\.|\ /g, ','); // in case there are a lot of "。"
    let words = tmptext.split(','); // split to chinese sentence or english words
    let jsontime = JSON.parse(tmptime); //JSON.parse(tmptime.replace(/\]\]\[\[/g, "],[")); // in case there are a lot segments by VAD
    let char_index = 0; // index for timestamp
    let text_withtime = '';
    for (let i = 0; i < words.length; i++) {
      if (words[i] == 'undefined' || words[i].length <= 0) {
        continue;
      }
      console.log('words===', words[i]);
      console.log('words: ' + words[i] + ',time=' + jsontime[char_index][0] / 1000);
      if (/^[a-zA-Z]+$/.test(words[i])) {
        // if it is english
        text_withtime = text_withtime + jsontime[char_index][0] / 1000 + ':' + words[i] + '\n';
        char_index = char_index + 1; //for english, timestamp unit is about a word
      } else {
        // if it is chinese
        text_withtime = text_withtime + jsontime[char_index][0] / 1000 + ':' + words[i] + '\n';
        char_index = char_index + words[i].length; //for chinese, timestamp unit is about a char
      }
    }
    return text_withtime;
  }
  clearText() {
    this.rec_text = '';
    this.offline_text = '';
  }
  getConnState(connState: string) {
    this.stateStr = connState;
    this.trigger('stateChange', this.stateStr);
  }
  getHotWords() {
    type a = {
      [p: string]: number;
    };
    let val = `阿里巴巴 20\rhello world 40`;
    let items = val.split(/[(\r\n)\r\n]+/); //split by \r\n
    let jsonresult: a = {};
    const regexNum = /^[0-9]*$/; // test number
    for (let item of items) {
      let result = item.split(' ');
      if (result.length >= 2 && regexNum.test(result[result.length - 1])) {
        let wordstr = '';
        for (let i = 0; i < result.length - 1; i++) wordstr = wordstr + result[i] + ' ';
        jsonresult[wordstr.trim()] = parseInt(result[result.length - 1]);
      }
    }
    return JSON.stringify({ 智能巡检: 20, 黄阁水厂: 20, 榄核水厂: 20, 巡检报告: 20 });
  }
  get wsState() {
    return this.ws.status;
  }
}
export function AudioError(type: SpeechRecognitionErrorCode): string {
  let str = '';
  switch (type) {
    case 'aborted':
      str = '识别中止';
      break;
    case 'audio-capture':
      str = '无法获取麦克风音频';
      break;
    case 'bad-grammar':
      str = '语法错误';
      break;
    case 'language-not-supported':
      str = '语音识别不支持该语言';
      break;
    case 'network':
      str = '网络错误（无法连接到服务器）';
      break;
    case 'no-speech':
      str = '没有检测到语音';
      break;
    case 'not-allowed':
      str = '浏览器不支持语音识别功能';
      break;
    case 'service-not-allowed':
      str = '服务器不允许访问此服务';
      break;
  }
  return str;
}
