<script setup lang="ts">
import { PlayType, Quality } from '@optCenter/videoType';
import { nextTick, onUnmounted, ref, watch } from 'vue';
import { capturePic, cameraRotate } from '@/api/modules/HKcamera';
import { useIsTask } from '@optCenter/hooks/use-video';
import { ElMessage } from 'element-plus';
import CreateHKVideo, { VideoPlayBackSettings } from '@optCenter/hooks/useHKVideo';
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

let play: CreateHKVideo;
const videoRef = ref<HTMLDivElement>();
let currentCamera = ref<string>();

async function init() {
  //
  try {
    await nextTick();
    await setPlay();
    await runPlay(props.cameraId, props.recordLocation);
  } catch (e) {}
}

async function setPlay() {
  return new Promise((resolve, reject) => {
    play = new CreateHKVideo(videoRef.value!, props.playMode, {
      scrollDom: props.scrollDom!,
      buttonType: props.buttonType,
    });
    play.on('success', () => {
      resolve('1');
    });
    play.on('error', (m: string) => {
      ElMessage.error(m);
      emit('err', m);
      reject();
    });
    play.on('message', (m: string) => {
      ElMessage.info(m);
    });
    play.on('cameraChange', (code: string) => {
      currentCamera.value = code;
    });
    play.on('cameraChangeFinl', (data: any) => {
      // data;
      if (props.playMode === 1 && recordLocationStr) {
        runPlay(data.cameraIndexCode, recordLocationStr);
      }
    });
    play.on('videoPlay', (code: string) => {
      emit('success', code);
    });
  });
}
let recordLocationStr = '';
async function runPlay(cameraId: string, recordLocation: string = '') {
  try {
    let recordLocationArr = recordLocation?.split('_') ?? [''];
    await play.startPlay({
      cameraIndexCode: cameraId,
      startTimeStamp: props.startTime,
      endTimeStamp: props.endTime,
      streamMode: 0,
      transMode: 1,
      gpuMode: 1,
      recordLocation: parseInt(recordLocationArr[0]),
    } as unknown as VideoPlayBackSettings);
    emit('loading', false);
    if (recordLocationArr[1]) {
      recordLocationStr = recordLocationArr[1];
    } else {
      recordLocationStr = '';
    }
    console.log(recordLocationStr);
  } catch (e: any) {
    emit('err', (e as TypeError).message);
    unFlv();
  }
}

//抓图
async function pic() {
  return await capturePic({ cameraIndexCode: play.cameraIndexCode || props.cameraId });
}
//转动预置位
async function rotate(presetPositionInfo: number) {
  try {
    await useIsTask(play.cameraIndexCode || props.cameraId);
    return await cameraRotate(presetPositionInfo, play.cameraIndexCode || props.cameraId);
  } catch (e: any) {
    ElMessage.warning(e as string);
  }
}

onUnmounted(() => {
  unFlv();
});
function unFlv() {
  if (play != null) {
    console.log('视频实例销毁');
    play.disconnect();
    play = {} as CreateHKVideo;
  }
}

defineExpose({
  init,
  pic,
  rotate,
  videoRef,
  runPlay,
  currentCamera,
  get play() {
    return play;
  },
});
</script>

<template>
  <div ref="videoRef" id="HKVideoControl" class="videoRef" />
  <template v-if="showControls">
    <div class="Controls">
      <!--      <videoCloud :camera-id="cameraId" :loginData="cameraData" :login-send-data="loginSendData"></videoCloud>-->
    </div>
    <div class="openScreen"></div>
  </template>
</template>

<style lang="scss" scoped>
@use '../../style/index';
.loading-rotate {
  animation: loading-rotate 2s linear infinite;
}
</style>
