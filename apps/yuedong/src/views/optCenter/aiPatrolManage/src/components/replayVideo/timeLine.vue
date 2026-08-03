<script setup lang="ts">
import { useElementSize } from '@vueuse/core';
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import timeLine from './timeLine';
let TimelineGroup = ref();
let canvasRect = useElementSize(TimelineGroup);
let timeLineRef = ref<HTMLCanvasElement>();
const model = defineModel<number>();
const emits = defineEmits(['change', 'move']);
let { initCanvasCtx, setTime } = timeLine(emitChange, canvasRect, timeLineRef, move);
onMounted(() => {
  initCanvasCtx();
});
onUnmounted(() => {
  canvasRect.stop();
});
watch([canvasRect.height, canvasRect.width], () => {
  nextTick(() => {
    setTime(model.value!);
  });
});
watch(model, () => {
  nextTick(() => {
    setTime(model.value!);
  });
});
function emitChange(time: number) {
  emits('change', time);
  model.value = time;
}
function move(time: number) {
  emits('move', time);
}
</script>
<template>
  <div class="timeline-group" ref="TimelineGroup">
    <canvas
      :width="canvasRect.width.value"
      class="timeline-canvas"
      :height="canvasRect.height.value"
      ref="timeLineRef"
    ></canvas>
  </div>
</template>
<style scoped lang="scss">
.timeline-group {
  width: 100%;
  height: 100%;
  .timeline-canvas {
    cursor: grab;
  }
}
</style>
