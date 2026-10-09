<template>
  <kr-public-dialog
    v-model="visible"
    title="巡检图坐标配置"
    width="min(1100px, calc(100vw - 32px))"
    appendTobody
    destroyOnClose
    :btnText="['取消', '保存坐标']"
    @doSubmit="confirmPoint"
    @doClose="closeDialog"
  >
    <template #dialog-title>巡检图坐标配置</template>
    <div class="point-dialog-toolbar">
      <div>
        <strong>选择摄像头位置</strong>
        <span>单击巡检图完成选点，支持滚轮缩放和拖动查看。</span>
      </div>
      <div class="zoom-actions">
        <el-button @click="zoomFromCenter(1.2)">放大</el-button>
        <el-button @click="zoomFromCenter(1 / 1.2)">缩小</el-button>
        <el-button @click="fitImage">全图</el-button>
      </div>
    </div>

    <div
      ref="viewportRef"
      class="point-viewport"
      @wheel.prevent="handleWheel"
      @pointerdown="handlePointerDown"
      @pointermove="handlePointerMove"
      @pointerup="handlePointerUp"
      @pointercancel="clearPointer"
    >
      <div class="point-canvas" :style="canvasStyle">
        <img ref="imageRef" :src="imageUrl" alt="巡检图" draggable="false" @load="handleImageLoad" />
        <div v-if="draftPoint" class="camera-point" :style="pointStyle" aria-hidden="true">
          <span></span>
        </div>
      </div>
      <div v-if="!draftPoint" class="empty-tip">请在巡检图上单击选择摄像头位置</div>
    </div>

    <div class="coordinate-bar">
      <span>图片尺寸：{{ imageWidth }} × {{ imageHeight }}</span>
      <strong v-if="draftPoint">X：{{ draftPoint.pointX }}&nbsp;&nbsp; Y：{{ draftPoint.pointY }}</strong>
      <strong v-else>尚未选择坐标</strong>
    </div>
  </kr-public-dialog>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import patrolFloorPlanUrl from '@/assets/images/BIM_plan_view_theme.png';

interface ImagePoint {
  pointX: number;
  pointY: number;
}

interface PointDialogProps {
  imageUrl?: string;
}

withDefaults(defineProps<PointDialogProps>(), {
  imageUrl: patrolFloorPlanUrl,
});
const emit = defineEmits<{
  (event: 'confirm', point: ImagePoint): void;
}>();

const visible = ref(false);
const viewportRef = ref<HTMLElement>();
const imageRef = ref<HTMLImageElement>();
const imageWidth = ref(1920);
const imageHeight = ref(1080);
const scale = ref(1);
const translateX = ref(0);
const translateY = ref(0);
const draftPoint = ref<ImagePoint>();
const pointer = ref<{
  pointerId: number;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
  moved: boolean;
}>();

const canvasStyle = computed(() => ({
  width: `${imageWidth.value}px`,
  height: `${imageHeight.value}px`,
  transform: `translate(${translateX.value}px, ${translateY.value}px) scale(${scale.value})`,
}));
const pointStyle = computed(() => ({
  left: `${draftPoint.value?.pointX ?? 0}px`,
  top: `${draftPoint.value?.pointY ?? 0}px`,
}));

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

function openDialog(point?: ImagePoint) {
  draftPoint.value = point ? { pointX: Number(point.pointX), pointY: Number(point.pointY) } : undefined;
  visible.value = true;
}

function handleImageLoad() {
  if (!imageRef.value) return;
  imageWidth.value = imageRef.value.naturalWidth || 1920;
  imageHeight.value = imageRef.value.naturalHeight || 1080;
  if (visible.value) nextTick(fitImage);
}

function fitImage() {
  const viewport = viewportRef.value;
  if (!viewport?.clientWidth || !viewport.clientHeight) return;
  scale.value = Math.min(
    (viewport.clientWidth - 32) / imageWidth.value,
    (viewport.clientHeight - 32) / imageHeight.value
  );
  translateX.value = (viewport.clientWidth - imageWidth.value * scale.value) / 2;
  translateY.value = (viewport.clientHeight - imageHeight.value * scale.value) / 2;
}

function zoomAt(clientX: number, clientY: number, multiplier: number) {
  const viewport = viewportRef.value;
  if (!viewport) return;
  const rect = viewport.getBoundingClientRect();
  const localX = clientX - rect.left;
  const localY = clientY - rect.top;
  const imageX = (localX - translateX.value) / scale.value;
  const imageY = (localY - translateY.value) / scale.value;
  const nextScale = clamp(scale.value * multiplier, 0.15, 6);
  translateX.value = localX - imageX * nextScale;
  translateY.value = localY - imageY * nextScale;
  scale.value = nextScale;
}

function zoomFromCenter(multiplier: number) {
  const viewport = viewportRef.value;
  if (!viewport) return;
  const rect = viewport.getBoundingClientRect();
  zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, multiplier);
}

function handleWheel(event: WheelEvent) {
  zoomAt(event.clientX, event.clientY, event.deltaY < 0 ? 1.12 : 1 / 1.12);
}

function handlePointerDown(event: PointerEvent) {
  if (event.button !== 0 || !viewportRef.value) return;
  pointer.value = {
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    originX: translateX.value,
    originY: translateY.value,
    moved: false,
  };
  viewportRef.value.setPointerCapture(event.pointerId);
}

function handlePointerMove(event: PointerEvent) {
  if (!pointer.value || pointer.value.pointerId !== event.pointerId) return;
  const deltaX = event.clientX - pointer.value.startX;
  const deltaY = event.clientY - pointer.value.startY;
  if (Math.hypot(deltaX, deltaY) > 4) pointer.value.moved = true;
  if (!pointer.value.moved) return;
  translateX.value = pointer.value.originX + deltaX;
  translateY.value = pointer.value.originY + deltaY;
}

function handlePointerUp(event: PointerEvent) {
  if (!pointer.value || pointer.value.pointerId !== event.pointerId) return;
  const shouldSelect = !pointer.value.moved;
  clearPointer();
  if (!shouldSelect) return;
  const viewport = viewportRef.value;
  if (!viewport) return;
  const rect = viewport.getBoundingClientRect();
  const pointX = (event.clientX - rect.left - translateX.value) / scale.value;
  const pointY = (event.clientY - rect.top - translateY.value) / scale.value;
  if (pointX < 0 || pointX > imageWidth.value || pointY < 0 || pointY > imageHeight.value) return;
  draftPoint.value = {
    pointX: Number(pointX.toFixed(1)),
    pointY: Number(pointY.toFixed(1)),
  };
}

function clearPointer() {
  pointer.value = undefined;
}

function closeDialog() {
  visible.value = false;
  clearPointer();
}

function confirmPoint() {
  if (!draftPoint.value) {
    ElMessage.warning('请先在巡检图上选择摄像头位置');
    return;
  }
  emit('confirm', { ...draftPoint.value });
  visible.value = false;
}

watch(visible, (value) => {
  if (!value) return;
  nextTick(() => {
    requestAnimationFrame(() => requestAnimationFrame(fitImage));
  });
});

defineExpose({ openDialog });
</script>

<style scoped lang="scss">
.point-dialog-toolbar {
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  > div:first-child {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  strong {
    color: var(--el-text-color-primary);
  }
  span {
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }
}
.zoom-actions {
  display: flex;
  flex: none;
}
.point-viewport {
  position: relative;
  height: min(560px, calc(100vh - 260px));
  min-height: 360px;
  overflow: hidden;
  touch-action: none;
  cursor: crosshair;
  user-select: none;
  background-color: #071827;
  background-image: linear-gradient(rgb(70 157 184 / 8%) 1px, transparent 1px),
    linear-gradient(90deg, rgb(70 157 184 / 8%) 1px, transparent 1px);
  background-size: 24px 24px;
  border: 1px solid var(--el-border-color);
  border-radius: 6px;
}
.point-canvas {
  position: absolute;
  top: 0;
  left: 0;
  transform-origin: 0 0;
  will-change: transform;
  img {
    display: block;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }
}
.camera-point {
  position: absolute;
  width: 34px;
  height: 34px;
  pointer-events: none;
  background: #19b8c7;
  border: 3px solid #ffffff;
  border-radius: 50%;
  box-shadow: 0 0 0 7px rgb(25 184 199 / 28%), 0 0 20px rgb(57 235 222 / 90%);
  transform: translate(-50%, -50%);
  &::before,
  &::after {
    position: absolute;
    top: 50%;
    left: 50%;
    content: '';
    background: #ffffff;
    transform: translate(-50%, -50%);
  }
  &::before {
    width: 16px;
    height: 2px;
  }
  &::after {
    width: 2px;
    height: 16px;
  }
  span {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 6px;
    height: 6px;
    background: #072333;
    border-radius: 50%;
    transform: translate(-50%, -50%);
  }
}
.empty-tip {
  position: absolute;
  bottom: 18px;
  left: 50%;
  padding: 8px 14px;
  font-size: 12px;
  color: #b7e9eb;
  pointer-events: none;
  background: rgb(6 31 47 / 88%);
  border: 1px solid rgb(96 210 218 / 35%);
  border-radius: 4px;
  transform: translateX(-50%);
}
.coordinate-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 10px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  strong {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    color: var(--el-color-primary);
  }
}

@media (max-width: 720px) {
  .point-dialog-toolbar {
    flex-direction: column;
    align-items: flex-start;
  }
  .point-viewport {
    min-height: 300px;
  }
}
</style>
