<script setup lang="ts">
import RealtimeVideo from '@optCenter/playType/realtime/RealtimeVideo.vue';
import PlaybackVideo from '@optCenter/playType/realtime/PlaybackVideo.vue';
import AlarmVideo from '@optCenter/playType/realtime/AlarmVideo.vue';
import RobotVideo from '@optCenter/playType/robot/RobotVideo.vue';
import AFRealtime from '@optCenter/playType/AF/RealtimeVideo.vue';
import AFWsRealtime from '@optCenter/playType/AF/RealtimeWsVideo.vue';

import { computed, DefineComponent, onMounted, onUnmounted, ref, watch } from 'vue';
import { PlayType, Quality } from './videoType';
import type { PlayKey } from './videoType';
import { useFullscreen } from '@vueuse/core';
//
export interface Props {
  playType?: PlayType;
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
const props = withDefaults(defineProps<Props>(), {
  playType: 1,
  showControls: true,
  isCanvas: false,
  quality: '原画',
  startTime: new Date(new Date().toLocaleDateString()).getTime(),
  buttonType: 1,
  playMode: 0,
  recordLocation: '0',
});
//组件相关
const componentMap: { [key in PlayKey]?: DefineComponent<{}, {}, any> } = {
  realtime: RealtimeVideo,
  playback: PlaybackVideo,
  alarm: AlarmVideo,
  robot: RobotVideo,
  AFRealtime: AFRealtime,
  AFWsRealtime: AFWsRealtime,
};
const currentComponent = computed(() => componentMap[PlayType[props.playType] as PlayKey]);
const passThroughProps = computed(() => ({ ...props }));

let videoControlsRef = ref<HTMLDivElement>();
const { toggle } = useFullscreen(videoControlsRef);

interface Emit {
  (e: 'err'): void;
  (e: 'success', str: string): void;
}
const emit = defineEmits<Emit>();

let currentComponentName = ref();
onMounted(() => {
  props.cameraId && init();
});
onUnmounted(() => {});

watch(
  () => props.cameraId,
  (value) => {
    value && init();
  }
);
//
async function init() {
  loading.value = true;
  isOnline.value = true;
  setLoadingAttr();
  currentComponentName.value.init();
}

function setLoadingAttr() {
  let loadingDom = videoControlsRef.value?.querySelector('.el-loading-mask');
  let loadingChildDom = loadingDom?.querySelector('.el-loading-spinner');
  loadingDom?.setAttribute('data-index', props.dataIndex as string);
  loadingChildDom?.setAttribute('data-index', props.dataIndex as string);
}

const description = ref<string>('');
const loading = ref(false);
const isOnline = ref(true);
function err(desc: string) {
  loading.value = false;
  isOnline.value = false;
  description.value = desc;
  emit('err');
}

defineExpose({
  pic() {
    return currentComponentName.value?.pic();
  },
  init() {
    return currentComponentName.value?.init();
  },
  rotate(index: number) {
    return currentComponentName.value?.rotate(index);
  },
  videoRef() {
    return currentComponentName.value?.videoRef;
  },
  runPlay(cameraId: string) {
    return currentComponentName.value?.runPlay(cameraId);
  },
  get currentCamera() {
    return currentComponentName.value?.currentCamera;
  },
  get currentComponentName() {
    return currentComponentName.value;
  },
});
</script>

<template>
  <div class="videoControls" v-loading="loading" ref="videoControlsRef">
    <component
      v-if="isOnline"
      :is="currentComponent"
      ref="currentComponentName"
      v-bind="passThroughProps"
      @err="err"
      @success="emit('success', $event)"
      @loading="loading = $event"
      @toggle="toggle"
    />
    <el-empty class="pic-empty" :data-index="dataIndex" v-else :description="description">
      <template #image>
        <img src="@/assets/images/notData.png" :data-index="dataIndex" />
      </template>
    </el-empty>
  </div>
</template>

<style scoped lang="scss">
.videoControls {
  position: relative;
  width: 100%;
  height: 100%;
  .pic-empty {
    width: 100%;
    height: 100%;
    background: var(--el-fill-color-light);
    :deep(.el-empty__image) {
      width: 15%;
    }
    :deep(.el-empty__description) {
      margin-top: 1%;
    }
  }
  :deep(.el-loading-mask) {
    z-index: 2;
  }
}
</style>
