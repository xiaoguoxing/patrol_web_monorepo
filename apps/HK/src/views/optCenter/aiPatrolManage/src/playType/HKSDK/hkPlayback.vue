<script setup lang="ts">
import { PlayType, Quality } from '@optCenter/videoType';
import { computed, nextTick, onUnmounted, ref, watch } from 'vue';
import { HikvisionWebSdk, type HikChannel, type HikProtocol } from '@optCenter/hooks/HKSDK';
import { ElMessage } from 'element-plus';
import { cameraInfoApi, cameraRotate, capturePic, UserApi2 } from '@/api/modules/camera';
import { decryptPassword } from '@/views/optCenter/deviceManage/camera/usePWA';
// import HKreplayVideo from '@optCenter/components/replayVideo/HKreplayVideo.vue';
import replayVideo from '@optCenter/components/replayVideo/replayVideo.vue';
import { useDateFormat } from '@vueuse/core';
import { detailApi as videoStorageDetail, VideoStorage } from '@/api/modules/optCenter/deviceManage/videoStorage';
interface props {
  playType: PlayType;
  cameraId: string;
  showControls?: boolean;
  isCanvas?: boolean;
  dataIndex?: string | number;
  startTime?: number | string;
  endTime?: number | string;
  businessId?: string;
  quality?: Quality;
}
const props = withDefaults(defineProps<props>(), {
  playType: 1,
  showControls: true,
});

interface Emit {
  (e: 'err', str: string): void;
  (e: 'success', str: string): void;
  (e: 'loading', isLoading: boolean): void;
  (e: 'toggle'): void;
}
const emit = defineEmits<Emit>();

const busy = ref(false);
async function run(action: () => Promise<void>, successMessage: string): Promise<void> {
  busy.value = true;
  try {
    await action();
    message.value = successMessage;
  } catch (error) {
    message.value = error instanceof Error ? error.message : String(error);
  } finally {
    busy.value = false;
  }
}

let sdk: HikvisionWebSdk | undefined;
const HKVideoControl = ref<HTMLDivElement>();
const videoRef = ref<HTMLVideoElement>();
let resizeObserver: ResizeObserver | undefined;
const message = ref('正在初始化播放器…');
let replayVideoRef = ref();
let isTimeNumber = computed({
  get() {
    return typeof props.startTime === 'string' ? new Date(props.startTime).getTime() : props.startTime;
  },
  set() {
    return true;
  },
});
let currentStartTime = 10;
const cameraData = ref<Partial<UserApi2>>({});
const cameraStorageData = ref<Partial<VideoStorage.ResList>>({});
async function init() {
  try {
    await run(initialize, '播放器已就绪');
    await setCamera(props.cameraId);
  } catch (e) {
    emit('err', message.value);
  }
}
async function initialize(): Promise<void> {
  if (!HKVideoControl.value) return;
  sdk = new HikvisionWebSdk({
    assetBaseUrl: '/hik',
    onPlaybackEnded: () => {
      message.value = '回放结束';
      replayVideoRef.value?.stopTime();
      ElMessage.success(message.value);
    },
    onError: (error) => {
      message.value = error.message;
    },
  });
  await sdk.init(HKVideoControl.value);
  resizeObserver = new ResizeObserver(([entry]) => {
    sdk?.resize(Math.floor(entry.contentRect.width), Math.floor(entry.contentRect.height));
  });
  resizeObserver.observe(HKVideoControl.value);
  message.value = '播放器已就绪';
}
async function setCamera(id: string) {
  currentStartTime = isTimeNumber.value!;
  replayVideoRef.value?.setTime(currentStartTime);
  let { data } = await cameraInfoApi({ id });
  let { data: sd } = await videoStorageDetail({ id: data.storageId });
  cameraData.value = data;
  cameraStorageData.value = sd;
  await run(onLogin, '登录成功，通道已加载');
  await run(runPlay, '预览已开始');
}

const currentDevice = ref('');
const rtspPort = ref<number>();
const channels = ref<HikChannel[]>([]);
async function onLogin() {
  if (!sdk) throw new Error('播放器尚未初始化');
  currentDevice.value = await sdk.login({
    username: (await decryptPassword(cameraStorageData.value.storageAccount!)) as string,
    ip: (await decryptPassword(cameraStorageData.value.storageHost!)) as string,
    password: (await decryptPassword(cameraStorageData.value.storagePassword!)) as string,
    port: 80 || cameraStorageData.value.storagePort!,
    protocol: 1,
  });
  const ports = sdk.getDevicePorts(currentDevice.value);
  rtspPort.value = ports.iRtspPort;
  channels.value = await sdk.getChannels(currentDevice.value);
}

async function runPlay() {
  const now = new Date(currentStartTime!);
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);
  await sdk!.startPlayback({
    deviceIdentify: currentDevice.value,
    channelId: cameraData.value.dwChannel!,
    rtspPort: rtspPort.value,
    streamType: 1,
    proxy: import.meta.env.VITE_SYS_DIST_NAME !== 'DEV',
    startTime: currentStartTime!,
    endTime: endOfDay.getTime(),
  });
  emit('loading', false);
  emit('success', message.value);
  videoRef.value = HKVideoControl.value?.querySelector('#HKVideoControl_playWindow0')!;
}

function videoChange(time: number) {
  currentStartTime = time;
  runPlay();
}

onUnmounted(() => {
  unFlv();
});
function unFlv() {
  resizeObserver?.disconnect();
  void sdk?.destroy();
}

defineExpose({
  init,
  unFlv,
  videoRef,
  close() {
    sdk?.stop();
  },
  setCamera,
});
</script>

<template>
  <div ref="HKVideoControl" id="HKVideoControl" class="videoRef hc" :title="message" />
  <!--  <HKreplayVideo class="replayVideo" ref="replayVideoRef" :videoRef="sdk" @change="videoChange"></HKreplayVideo>-->
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
