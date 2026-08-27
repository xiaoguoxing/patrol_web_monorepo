<script setup lang="ts">
import { PlayType, Quality } from '@optCenter/videoType';
import { computed, onUnmounted, ref } from 'vue';
import { cameraInfoApi, UserApi2 } from '@/api/modules/camera';
import { getDict } from '@/utils/serviceDict';
import WebRtcStreamer from '@/assets/js/webrtc';
import { detailApi as videoStorageDetail, VideoStorage } from '@/api/modules/optCenter/deviceManage/videoStorage';
import { useDateFormat } from '@vueuse/core';
import replayVideo from '../../components/replayVideo/replayVideo.vue';
import { decryptPassword } from '@/views/optCenter/deviceManage/camera/usePWA';
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
interface props {
  playType: PlayType;
  cameraId: string;
  showControls?: boolean;
  isCanvas?: boolean;
  dataIndex?: string | number;
  startTime?: number | string;
  endTime?: string;
  businessId?: string;
  quality?: Quality;
}
const props = withDefaults(defineProps<props>(), {
  playType: 1,
  showControls: true,
});

interface Emit {
  (e: 'err', str: string): void;
  (e: 'success'): void;
  (e: 'loading', isLoading: boolean): void;
  (e: 'toggle'): void;
}
const emit = defineEmits<Emit>();

let play: any = null;
const videoRef = ref<HTMLVideoElement>();
const cameraData = ref<Partial<UserApi2>>({
  cameraType: 'tube',
});
type SendData = { ip: string; port: string; userName: string; password: string; channelNum: number };
const StorageData = ref<Partial<VideoStorage.ResList>>({});
const StorageLoginSendData = computed<Partial<SendData>>(() => {
  return {
    // ip: StorageData.value.storageHost!,
    port: StorageData.value.storagePort!,
    // userName: StorageData.value.storageAccount!,
    // password: StorageData.value.storagePassword!,
    channelNum: StorageData.value.dwChannel!,
  };
});
let iceServer = ref<{ [p: string]: any; remark: any }[]>([]);
let replayVideoRef = ref();
let isTimeNumber = computed({
  get() {
    return typeof props.startTime === 'string' ? new Date(props.startTime).getTime() : props.startTime;
  },
  set() {
    return true;
  },
});
let currentStartTime = isTimeNumber.value;

async function init() {
  try {
    let { data } = await cameraInfoApi({ id: props.cameraId });
    let resIceServer = await getDict('streamIceServer');
    cameraData.value = data;
    iceServer.value = resIceServer;
    unFlv();
    if (data.storageId) {
      try {
        let { data: sd } = await videoStorageDetail({ id: data.storageId });
        StorageData.value = sd;
        StorageData.value.dwChannel = data.dwChannel;
        currentStartTime = isTimeNumber.value;
        replayVideoRef.value?.setTime(currentStartTime);
        setPlay().then(() => runPlay());
      } catch (e) {
        emit('err', t('camera.err1'));
      }
    } else {
      emit('err', t('camera.err2'));
    }
  } catch (e) {
    emit('err', t('camera.err3'));
  }
}

async function setPlay() {
  return new Promise((resolve, reject) => {
    let streamId = getStreamID();
    play = new WebRtcStreamer(
      videoRef.value!,
      streamId,
      '',
      iceServer.value.map((i) => {
        let iceUser = JSON.parse(i?.remark ?? '{}');
        return {
          urls: i.value,
          ...iceUser,
        };
      })
    );
    play.on('connectSuccess', () => {
      emit('success');
    });
    play.on('connectError', () => {
      emit('err', '');
    });
    play.on('streamError', () => {
      emit('err', t('camera.getStreamSb'));
      unFlv();
    });
    resolve('1');
  });
}

async function runPlay() {
  try {
    let last_url = await getUrl();
    await play.addPlay(last_url);
    emit('loading', false);
    emit('success');
  } catch (e: any) {
    emit('err', (e as TypeError).message);
    unFlv();
  }
}

async function getUrl() {
  let res = ``;

  let st = useDateFormat(currentStartTime, 'YYYYMMDDtHHmmssz');
  res = `rtsp://${await decryptPassword(StorageData.value.storageAccount!)}:${await decryptPassword(
    StorageData.value.storagePassword!
  )}@${await decryptPassword(StorageData.value.storageHost!)}:554/Streaming/tracks/${
    StorageLoginSendData.value.channelNum || 1
  }01?starttime=${st.value}`;

  return res;
}

function getStreamID() {
  let res = '';
  res = cameraData.value.id + StorageData.value.id! + '_' + cameraData.value.cameraName + '回放';
  return res;
}

onUnmounted(() => {
  unFlv();
});
function unFlv() {
  if (play != null) {
    console.log('视频实例销毁');
    play.disconnect();
    play = null;
  }
}

function videoChange(time: number) {
  currentStartTime = time;
  unFlv();
  setPlay().then(() => runPlay());
}
defineExpose({
  init,
  unFlv,
  videoRef,
});
</script>

<template>
  <video muted ref="videoRef" class="videoRef hc" />
  <replayVideo class="replayVideo" ref="replayVideoRef" :videoRef="videoRef" @change="videoChange"></replayVideo>
</template>

<style lang="scss" scoped>
@use '../../style/index';
.replayVideo {
  position: absolute;
  bottom: 0;
  z-index: 2;
  height: 72px;
}
</style>
