<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import timeLine from './timeLine.vue';
import { VideoPlay, VideoPause } from '@element-plus/icons-vue';
import { useDateFormat, useIntervalFn, useDebounceFn, useEventListener } from '@vueuse/core';
import { ElMessage } from 'element-plus';
import { HikvisionWebSdk } from '@optCenter/hooks/HKSDK';
interface props {
  videoRef: HikvisionWebSdk | undefined;
}
const { pause, resume, isActive } = useIntervalFn(
  () => {
    /* your function */
    startTime.value += 1000;
    realTime.value += 1000;
  },
  1000,
  { immediate: false }
);
const props = withDefaults(defineProps<props>(), {});
const emits = defineEmits(['change']);
let startTime = ref(new Date(new Date().toLocaleDateString()).getTime());
let realTime = ref<number>(new Date(new Date().toLocaleDateString()).getTime());
let realTimeFormat = useDateFormat(realTime, 'YYYY-MM-DD HH:mm:ss');
let setStartTime = ref<number>();
let addTimeDe = useDebounceFn(() => {
  if (startTime.value < new Date().getTime()) {
    emits('change', startTime.value);
  } else {
    // startTime.value = new Date(new Date().toLocaleDateString()).getTime();
    ElMessage.error(`无效时间`);
  }
}, 1000);
function timeChange() {
  videoPause();
  addTimeDe();
}

function moveTime(time: number) {
  realTime.value = time;
  videoPause();
}
let isPlay = ref(false);
let ms = 30 * 1000;

function videoPlay() {
  // addTimeDe();
  props.videoRef?.resume();
  isPlay.value = true;
  resume();
}
function videoPause() {
  props.videoRef?.stop();
  isPlay.value = false;
  pause();
}
function incrementTime() {
  startTime.value += ms;
  realTime.value = startTime.value;
  videoPause();
  addTimeDe();
}
function decrementTime() {
  startTime.value -= ms;
  realTime.value = startTime.value;
  videoPause();
  addTimeDe();
}

function setStartChange(time: number) {
  if (time) {
    startTime.value = time;
    realTime.value = time;
    emits('change', time);
    videoPause();
  }
}
function disabledDate(date: Date) {
  return new Date().getTime() < date.getTime();
}
defineExpose({
  setTime(time: number) {
    startTime.value = time;
    realTime.value = time;
    videoPause();
  },
  playChange(type: string) {
    if (type === 'play') {
      isPlay.value = true;
      resume();
    } else if (type === 'pause') {
      isPlay.value = false;
      pause();
    }
  },
});
</script>

<template>
  <div class="replayControls">
    <div class="timeLine">
      <timeLine v-model="startTime" @change="timeChange" @move="moveTime"></timeLine>
      <div class="small_tooltip">{{ realTimeFormat }}</div>
    </div>
    <div class="videoControls">
      <div class="left-button">
        <div class="baseButton mr8">
          <el-icon size="24" v-if="isPlay" @click="videoPause"><VideoPause /></el-icon>
          <el-icon size="24" v-else @click="videoPlay"><VideoPlay /></el-icon>
        </div>
        <div class="baseButton mr10" @click="decrementTime">
          <span>30</span>
          <el-icon><DArrowLeft /></el-icon>
        </div>
        <div class="baseButton" @click="incrementTime">
          <el-icon><DArrowRight /></el-icon>
          <span>30</span>
        </div>
      </div>
      <div class="right-time">
        <el-date-picker
          class="dark"
          v-model="setStartTime"
          style="height: 100%"
          value-format="x"
          :disabled-date="disabledDate"
          format="YYYY-MM-DD HH:mm:ss"
          time-format="HH:mm:ss"
          type="datetime"
          :placeholder="realTimeFormat"
          @change="setStartChange"
        />
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.replayControls {
  width: 100%;
  height: 100%;
  .timeLine {
    position: relative;
    width: 100%;
    height: 30px;
    .small_tooltip {
      position: absolute;
      top: -34px;
      left: calc(50% - 60px);
      box-sizing: border-box;
      padding: 5px;
      font-size: 12px;
      color: #ffffff;
      user-select: none;
      background: var(--el-color-primary);
      border-radius: 4px;
    }
  }
  .videoControls {
    box-sizing: border-box;
    display: flex;
    justify-content: space-between;
    height: calc(100% - 30px);
    padding: 2px 8px 8px;
    background: #333333;
    .left-button {
      display: flex;
      flex: 1;
      user-select: none;
    }
    .right-time {
      flex-basis: 178px;
      :deep(.el-input__wrapper) {
        background: #484848;
        box-shadow: none;
        &:focus,
        &:hover {
          background: #555555;
        }
        .el-input__inner,
        .el-input__prefix,
        .el-input__suffix {
          color: #ffffff;
          &::placeholder {
            color: #ffffff;
          }
        }
      }
    }
    .baseButton {
      display: flex;
      place-content: center;
      place-items: center;
      width: 48px;
      height: 100%;
      color: #ffffff;
      cursor: pointer;
      background: #484848;
      border-radius: 4px;
      &:hover {
        background: #555555;
      }
    }
  }
}
</style>
