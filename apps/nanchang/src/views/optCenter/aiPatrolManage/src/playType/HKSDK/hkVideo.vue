<script setup lang="ts">
import { PlayType, Quality } from '@optCenter/videoType';
import videoCloud from '@optCenter/components/videocloud/HKSDKvideocloud.vue';
import { computed, nextTick, onUnmounted, ref, watch } from 'vue';
import { HikvisionWebSdk, type HikChannel, type HikProtocol } from '@optCenter/hooks/HKSDK';
import { ElMessage } from 'element-plus';
import { cameraInfoApi, cameraRotate, capturePic, UserApi2 } from '@/api/modules/camera';
import { useIsTask } from '@optCenter/hooks/use-video';
import { decryptPassword } from '@/views/optCenter/deviceManage/camera/usePWA';
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
  scrollDom?: HTMLDivElement;
  buttonType?: 1 | 2;
  playMode?: 1 | 0;
  recordLocation?: '1' | '0' | '0_1';
}
const props = withDefaults(defineProps<props>(), {
  playType: 1,
  showControls: true,
  buttonType: 1,
  playMode: 0,
  recordLocation: '0',
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
const videoRef = ref<HTMLDivElement>();
const selectedWindowIndex = ref<number>(0);
let resizeObserver: ResizeObserver | undefined;
const message = ref('正在初始化播放器…');
const cameraList = ref<{ [key: number]: Partial<UserApi2> }>({});
const cameraData = computed<Partial<UserApi2>>(
  () => cameraList.value[selectedWindowIndex.value] ?? { cameraType: 'tube' }
);
type SendData = { ip: string; port: string; userName: string; password: string; channelNum: number };
const loginSendData = computed<Partial<SendData>>(() => {
  return {
    id: props.cameraId,
    port: cameraData.value.cameraPort!,
    channelNum: cameraData.value.channelNum!,
  };
});
async function init() {
  try {
    await run(initialize, '播放器已就绪');
    await setCamera(props.cameraId);
  } catch (e) {
    emit('err', message.value);
  }
}
async function initialize(): Promise<void> {
  if (!videoRef.value) return;
  sdk = new HikvisionWebSdk({
    assetBaseUrl: '/hik',
    onPlaybackEnded: () => {
      message.value = '回放结束';
    },
    onWindowSelected: (sWindowIndex) => {
      selectedWindowIndex.value = sWindowIndex;
    },
    onError: (error) => {
      message.value = error.message;
    },
  });
  await sdk.init(videoRef.value);
  resizeObserver = new ResizeObserver(([entry]) => {
    sdk?.resize(Math.floor(entry.contentRect.width), Math.floor(entry.contentRect.height));
  });
  resizeObserver.observe(videoRef.value);
  message.value = '播放器已就绪';
}

async function setCamera(id: string) {
  let { data } = await cameraInfoApi({ id });
  cameraList.value[selectedWindowIndex.value] = data;
  await run(onLogin, '登录成功，通道已加载');
  await run(runPlay, '预览已开始');
}

const currentDevice = ref('');
const rtspPort = ref<number>();
const channels = ref<HikChannel[]>([]);
async function onLogin() {
  if (!sdk) throw new Error('播放器尚未初始化');
  currentDevice.value = await sdk.login({
    username: (await decryptPassword(cameraData.value.cameraAccount!)) as string,
    ip: (await decryptPassword(cameraData.value.cameraHost!)) as string,
    password: (await decryptPassword(cameraData.value.cameraPassword!)) as string,
    port: 80 || cameraData.value.cameraPort!,
    protocol: 1,
  });
  const ports = sdk.getDevicePorts(currentDevice.value);
  rtspPort.value = ports.iRtspPort;
  channels.value = await sdk.getChannels(currentDevice.value);
  // selectedChannelId.value = channels.value[0]?.id;
  // if (!channels.value.length) throw new Error('登录成功，但未发现在线通道');
}

async function runPlay() {
  await sdk!.startPreview({
    windowIndex: selectedWindowIndex.value,
    deviceIdentify: currentDevice.value,
    channelId: cameraData.value.channelNum!,
    zeroChannel: false,
    rtspPort: rtspPort.value,
    streamType: 1,
    proxy: true,
  });
  emit('loading', false);
  emit('success', message.value);
}
//抓图
async function pic() {
  return await capturePic({
    ...loginSendData.value,
  });
}
//转动预置位
async function rotate(presetPositionInfo: number) {
  try {
    await useIsTask(props.cameraId);
    return await cameraRotate({
      ...loginSendData.value,
      presetIndex: presetPositionInfo,
      command: 39,
    });
  } catch (e: any) {
    ElMessage.warning(e as string);
  }
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
  pic,
  rotate,
  videoRef,
  changeWindowLayout(i: number) {
    sdk?.changeWindowLayout(i);
  },
  setCamera,
  close() {
    sdk?.stop();
  },
  closeAll() {
    sdk?.api.I_StopAll();
  },
});
</script>

<template>
  <div ref="videoRef" class="videoRef" id="HKSDK" />
  <template v-if="showControls">
    <div class="Controls">
      <videoCloud
        :camera-id="cameraId"
        :loginData="cameraData"
        :sdk="sdk"
        :login-send-data="loginSendData"
      ></videoCloud>
    </div>
    <div class="openScreen">
      <!--      <el-icon @click="emit('toggle')" size="18" title="全屏"><FullScreen /></el-icon>
      <el-icon @click="init" size="18" title="重新加载">
        <Refresh />
      </el-icon>-->
    </div>
  </template>
</template>

<style lang="scss" scoped>
@use '../../style/index';
.loading-rotate {
  animation: loading-rotate 2s linear infinite;
}
</style>
