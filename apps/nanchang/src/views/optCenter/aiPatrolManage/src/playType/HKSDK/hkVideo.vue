<script setup lang="ts">
import { PlayType, Quality } from '@optCenter/videoType';
import videoCloud from '@optCenter/components/videocloud/videocloud.vue';
import { computed, onUnmounted, ref, watch } from 'vue';
import { HikvisionWebSdk } from '@optCenter/hooks/HKSDK';
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

interface PreviewSession {
  deviceIdentify: string;
  channelId: number;
  rtspPort?: number;
  proxy: boolean;
  streamType: 1 | 2;
  isPlaying: boolean;
}

const busy = ref(false);
async function run(action: () => Promise<void>, successMessage: string): Promise<void> {
  busy.value = true;
  try {
    await action();
    message.value = successMessage;
  } catch (error) {
    message.value = error instanceof Error ? error.message : String(error);
    throw error;
  } finally {
    busy.value = false;
  }
}

let sdk: HikvisionWebSdk | undefined;
const videoRef = ref<HTMLDivElement>();
const selectedWindowIndex = ref(0);
let resizeObserver: ResizeObserver | undefined;
let layoutQueue: Promise<void> = Promise.resolve();
let currentLayout = 1;
const message = ref('正在初始化播放器…');
const cameraList = ref<{ [key: number]: Partial<UserApi2> }>({});
const previewSessions = new Map<number, PreviewSession>();
const cameraData = computed<Partial<UserApi2>>(
  () => cameraList.value[selectedWindowIndex.value] ?? { cameraType: 'tube' }
);
const cameraDataId = computed<string>(() => cameraData.value.id ?? '');
type SendData = { ip: string; port: string; userName: string; password: string; channelNum: number };
const loginSendData = computed<SendData>(() => ({
  id: cameraDataId.value,
  ip: '1',
  userName: '1',
  password: '1',
  port: cameraData.value.cameraPort!,
  channelNum: cameraData.value.channelNum!,
}));

async function init() {
  try {
    await run(initialize, '播放器已就绪');
    await setCamera(props.cameraId);
  } catch {
    emit('err', message.value);
  }
}

async function initialize(): Promise<void> {
  if (!videoRef.value) return;
  sdk = new HikvisionWebSdk({
    assetBaseUrl: 'hik',
    onPlaybackEnded: () => {
      message.value = '回放结束';
    },
    onWindowSelected: (windowIndex: number) => {
      selectedWindowIndex.value = windowIndex;
    },
    onError: (error: Error) => {
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
  const windowIndex = selectedWindowIndex.value;
  const { data } = await cameraInfoApi({ id });
  cameraList.value[windowIndex] = data;

  let session: PreviewSession | undefined;
  await run(async () => {
    session = await createPreviewSession(data);
    previewSessions.set(windowIndex, session);
  }, '登录成功，通道已加载');
  await run(() => runPlay(windowIndex, session), '预览已开始');
}

async function createPreviewSession(camera: Partial<UserApi2>): Promise<PreviewSession> {
  if (!sdk) throw new Error('播放器尚未初始化');
  if (camera.channelNum == null) throw new Error('摄像头通道号不存在');
  const [username, ip, password] = await Promise.all([
    decryptPassword(camera.cameraAccount!),
    decryptPassword(camera.cameraHost!),
    decryptPassword(camera.cameraPassword!),
  ]);
  const deviceIdentify = await sdk.login({
    username: username as string,
    ip: ip as string,
    password: password as string,
    port: 80,
    protocol: 1,
  });
  const { iRtspPort } = sdk.getDevicePorts(deviceIdentify);
  await sdk.getChannels(deviceIdentify);
  return {
    deviceIdentify,
    channelId: camera.channelNum,
    rtspPort: iRtspPort,
    proxy: import.meta.env.VITE_SYS_DIST_NAME !== 'DEV',
    streamType: getLayoutStreamType(currentLayout),
    isPlaying: false,
  };
}

function getLayoutStreamType(layout: number): PreviewSession['streamType'] {
  return layout <= 2 ? 1 : 2;
}

async function runPlay(
  windowIndex: number,
  session = previewSessions.get(windowIndex),
  streamType = getLayoutStreamType(currentLayout)
) {
  if (!sdk) throw new Error('播放器尚未初始化');
  if (!session) throw new Error(`窗口 ${windowIndex} 尚未加载摄像头`);

  await sdk.startPreview({
    windowIndex,
    deviceIdentify: session.deviceIdentify,
    channelId: session.channelId,
    zeroChannel: false,
    rtspPort: session.rtspPort,
    streamType,
    proxy: session.proxy,
  });
  session.streamType = streamType;
  session.isPlaying = true;
  emit('loading', false);
  emit('success', message.value);
}

function changeWindowLayout(layout: number): Promise<void> {
  const next = layoutQueue.catch(() => undefined).then(() => applyWindowLayout(layout));
  layoutQueue = next;
  return next;
}

async function applyWindowLayout(layout: number): Promise<void> {
  if (!sdk) throw new Error('播放器尚未初始化');
  if (!Number.isInteger(layout) || layout < 1 || layout > 4) {
    throw new Error('画面分割类型只支持 1、2、3、4');
  }

  const visibleWindowCount = layout * layout;
  const hiddenSessions = [...previewSessions.entries()].filter(([windowIndex]) => windowIndex >= visibleWindowCount);
  const deleteResults = await Promise.allSettled(
    hiddenSessions.map(async ([windowIndex, session]) => {
      if (session.isPlaying) await sdk!.stop(windowIndex);
      previewSessions.delete(windowIndex);
      delete cameraList.value[windowIndex];
    })
  );

  await sdk.changeWindowLayout(layout);
  currentLayout = layout;
  if (selectedWindowIndex.value >= visibleWindowCount) selectedWindowIndex.value = 0;

  const failedResult = deleteResults.find((result): result is PromiseRejectedResult => result.status === 'rejected');
  if (failedResult) throw failedResult.reason;
}

// 抓图
async function pic() {
  return await capturePic({
    ...loginSendData.value,
  });
}

// 转动预置位
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

async function close() {
  const windowIndex = selectedWindowIndex.value;
  await sdk?.stop(windowIndex);
  const session = previewSessions.get(windowIndex);
  if (session) session.isPlaying = false;
}

async function closeAll() {
  await sdk?.stopAll();
  previewSessions.forEach((session) => {
    session.isPlaying = false;
  });
}

onUnmounted(() => {
  resizeObserver?.disconnect();
  previewSessions.clear();
  void sdk?.destroy();
});
watch(message, (value) => {
  console.log(value);
});
defineExpose({
  init,
  pic,
  rotate,
  videoRef,
  changeWindowLayout,
  setCamera,
  close,
  closeAll,
});
</script>

<template>
  <div ref="videoRef" class="videoRef" id="HKSDK" />
  <template v-if="showControls">
    <div class="Controls">
      <videoCloud :camera-id="cameraDataId" :loginData="cameraData" :login-send-data="loginSendData"></videoCloud>
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
