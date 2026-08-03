<script setup lang="ts">
import { computed, nextTick, onBeforeMount, onMounted, ref, watch } from 'vue';
import { useEventListener, useElementBounding, useElementSize } from '@vueuse/core';
import { ArcRow, ArcType } from '@/api/modules/optCenter/Almanagement/AIDimension';
import { Canvas } from 'fabric/fabric-impl';
interface Props {
  picUrl: string;
  arcType: ArcType;
  disabled?: boolean;
  arcList?: ArcRow[];
  arcRadius?: number;
  arcColor?: string;
}
interface Emit {
  (e: 'delArc', p: ArcRow): any;
  (e: 'addArc', p: ArcRow): any;
  (e: 'moveArc', p: ArcRow, index: number): any;
  (e: 'leaveArc'): any;
}
const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  arcList: () => [],
  arcRadius: 10,
  arcColor: '#007FFF',
});
const emit = defineEmits<Emit>();
//背景层
const background = ref<HTMLCanvasElement>();
const containerCanvasRef = ref<HTMLDivElement>();
const backgroundX = ref(0);
const backgroundY = ref(0);
const { width: containerW, height: containerH } = useElementSize(containerCanvasRef);
let backgroundCtx: CanvasRenderingContext2D;
let bgImage = new Image();
let offset = ref(0);
let resClientRect = ref({ width: 0, height: 0 });
onMounted(async () => {
  backgroundCtx = background.value?.getContext('2d')!;
  arcCtx = arc.value?.getContext('2d')!;
  eventCtx = event.value?.getContext('2d')!;
  await loadBgImage();
  canvasClientRect();
});
function loadBgImage() {
  return new Promise((resolve, reject) => {
    bgImage.src = props.picUrl;
    bgImage.addEventListener('load', (img) => {
      resolve(img);
    });
  });
}
watch([containerW, containerH], () => {
  canvasClientRect();
});
function canvasClientRect() {
  let width = 0;
  let height = 0;
  // 计算缩放比例
  let scale = Math.min(containerW.value / bgImage.width, containerH.value / bgImage.height);
  // 计算新的宽高度
  width = bgImage.width * scale;
  height = bgImage.height * scale;
  offset.value = scale;
  resClientRect.value = {
    width,
    height,
  };
  nextTick(() => {
    let { x, y } = background.value?.getBoundingClientRect()!;
    backgroundX.value = x;
    backgroundY.value = y;
    backgroundCtx?.clearRect(0, 0, width, height);
    backgroundCtx?.drawImage(bgImage, 0, 0, width, height);
    initDrawArc();
  });
}
function initDrawArc() {
  arcCtx?.clearRect(0, 0, resClientRect.value.width, resClientRect.value.height);
  props.arcList.forEach((i) => {
    setDrawArc(i.x * offset.value, i.y * offset.value, i.type, i.isConfirm);
  });
}
//标记层
const arc = ref<HTMLCanvasElement>();
let arcCtx: CanvasRenderingContext2D;
let confirmWidthIcon = 36;
let confirmIcon = confirmWidthIcon / 2;
useEventListener(arc, 'mousemove', handleArcMove);
watch(
  () => props.arcList,
  () => {
    initDrawArc();
  },
  { deep: true }
);

function setDrawArc(x: number, y: number, type: ArcType, isConfirm: boolean) {
  if (isConfirm) {
    drawArcHover(x, y, type);
  } else {
    drawArc(x, y, type);
  }
}

let startDraw = false;
let mouseFrom = { x: 0, y: 0 };
let mouseTo = { x: 0, y: 0 };
function handleDown(e: MouseEvent) {
  let { x, y } = arc.value!.getBoundingClientRect();
  let offsetX = e.clientX - x;
  let offsetY = e.clientY - y;
  mouseTo = { x: 0, y: 0 };
  mouseFrom = { x: offsetX, y: offsetY };
  startDraw = true;
}
function handleMove(e: MouseEvent) {
  let { x, y } = arc.value!.getBoundingClientRect();
  let offsetX = e.clientX - x;
  let offsetY = e.clientY - y;
  mouseTo = { x: offsetX, y: offsetY };
  if (startDraw) {
    drawRect();
  }
}
function handleUp(e: MouseEvent) {
  let { x, y } = arc.value!.getBoundingClientRect();
  let offsetX = e.clientX - x;
  let offsetY = e.clientY - y;
  mouseTo = { x: offsetX, y: offsetY };
  startDraw = false;
}
function drawRect(ctx: CanvasRenderingContext2D = arcCtx) {
  ctx?.clearRect(0, 0, resClientRect.value.width, resClientRect.value.height);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.rect(
    Math.min(mouseFrom.x, mouseTo.x),
    Math.min(mouseFrom.y, mouseTo.y),
    Math.abs(mouseFrom.x - mouseTo.x),
    Math.abs(mouseFrom.y - mouseTo.y)
  );
  ctx.strokeStyle = props.arcColor;
  ctx.lineJoin = 'round';
  ctx.stroke();
}

function handleArcMove(e: MouseEvent) {
  let { x, y } = arc.value!.getBoundingClientRect();
  let offsetX = e.clientX - x;
  let offsetY = e.clientY - y;
  let obj: ArcRow;
  for (let i = props.arcList.length; i--; ) {
    if (
      props.arcList[i].x * offset.value >= offsetX - confirmIcon &&
      props.arcList[i].x * offset.value <= offsetX + confirmIcon &&
      props.arcList[i].y * offset.value >= offsetY - confirmIcon &&
      props.arcList[i].y * offset.value <= offsetY + confirmIcon
    ) {
      emit('moveArc', props.arcList[i], i);
      obj = props.arcList[i];
      drawArcHover(obj.x * offset.value, obj.y * offset.value, obj.type, 0.7);
      setCursorCss(arc.value!, 'pointer');
      break;
    } else {
      obj = props.arcList[i];
      drawArcHover(obj.x * offset.value, obj.y * offset.value, obj.type);
      setCursorCss(arc.value!, 'initial');
      emit('leaveArc');
    }
  }
}
//未确定状态
function drawArc(x: number, y: number, type: ArcType) {
  switch (type) {
    case 'arc':
      DrawArc(x, y);
      break;
    case 'arcCenter':
      DrawArcCenter(x, y);
      break;
  }
}
function DrawArcCenter(x: number, y: number) {
  arcCtx.lineWidth = 5;
  arcCtx.beginPath();
  arcCtx.arc(x, y, props.arcRadius, 0, Math.PI * 2, true);
  arcCtx.fillStyle = props.arcColor;
  arcCtx.strokeStyle = '#fff';
  arcCtx.stroke();
  arcCtx.fill();
}
function DrawArc(x: number, y: number) {
  arcCtx.save();
  arcCtx.lineWidth = 3;
  arcCtx.beginPath();
  arcCtx.translate(x, y);
  arcCtx.rotate((45 * Math.PI) / 180);
  arcCtx.rect(-10, -10, 20, 20);
  arcCtx.fillStyle = props.arcColor;
  arcCtx.strokeStyle = '#fff';
  arcCtx.lineJoin = 'round';
  arcCtx.fill();
  arcCtx.stroke();
  arcCtx.restore();
}
//确定状态
function drawArcHover(x: number, y: number, type: ArcType, opacity: number = 0.5) {
  switch (type) {
    case 'arc':
      arcCtx.clearRect(x - confirmIcon, y - confirmIcon, confirmWidthIcon, confirmWidthIcon);
      confirmBg(x, y, opacity);
      DrawArcConfirm(x, y);
      break;
    case 'arcCenter':
      arcCtx.clearRect(x - confirmIcon, y - confirmIcon, confirmWidthIcon, confirmWidthIcon);
      confirmBg(x, y, opacity);
      DrawArcCenterConfirm(x, y);
      break;
  }
}
function confirmBg(x: number, y: number, opacity: number) {
  arcCtx.beginPath();
  arcCtx.arc(x, y, confirmIcon, 0, Math.PI * 2, true);
  arcCtx.fillStyle = `rgba(0, 127, 255,${opacity})`;
  arcCtx.fill();
}
function DrawArcCenterConfirm(x: number, y: number) {
  arcCtx.lineWidth = 5;
  arcCtx.beginPath();
  arcCtx.arc(x, y, 5, 0, Math.PI * 2, true);
  arcCtx.fillStyle = props.arcColor;
  arcCtx.strokeStyle = '#fff';
  arcCtx.stroke();
  arcCtx.fill();
}
function DrawArcConfirm(x: number, y: number) {
  arcCtx.save();
  arcCtx.lineWidth = 2;
  arcCtx.beginPath();
  arcCtx.translate(x, y);
  arcCtx.rotate((45 * Math.PI) / 180);
  arcCtx.rect(-5, -5, 10, 10);
  arcCtx.fillStyle = props.arcColor;
  arcCtx.strokeStyle = '#fff';
  arcCtx.lineJoin = 'round';
  arcCtx.fill();
  arcCtx.stroke();
  arcCtx.restore();
}
//事件层
const event = ref<HTMLCanvasElement>();
let eventCtx: CanvasRenderingContext2D;
useEventListener(event, 'mousemove', handleMouseMove);
useEventListener(event, 'mousedown', handleDown);
useEventListener(event, 'mouseup', handleUp);
useEventListener(event, 'mousemove', handleMove);
useEventListener(event, 'mouseleave', handleMouseLeave);
function handleMouseMove(e: MouseEvent) {
  let { x, y } = event.value!.getBoundingClientRect();
  let offsetX = e.clientX - x;
  let offsetY = e.clientY - y;
  drawLine(offsetX, offsetY);
}
function drawLine(x: number, y: number) {
  eventCtx.clearRect(0, 0, event.value!.width, event.value!.height);
  eventCtx.lineWidth = 1;
  eventCtx.beginPath();
  eventCtx.moveTo(x, 0);
  eventCtx.lineTo(x, event.value!.height);
  eventCtx.stroke();
  eventCtx.lineWidth = 1;
  eventCtx.beginPath();
  eventCtx.moveTo(0, y);
  eventCtx.lineTo(event.value!.width, y);
  eventCtx.stroke();
}
function handleMouseLeave() {
  eventCtx.clearRect(0, 0, event.value!.width, event.value!.height);
}
defineExpose({
  canvasClientRect: {
    x: backgroundX,
    y: backgroundY,
    offset: offset,
  },
  backgroundCanvas: background,
  initDrawArc: initDrawArc,
});
function setCursorCss(Canvas: HTMLCanvasElement, type: string) {
  Canvas.style.cursor = type;
}
</script>

<template>
  <div class="containerCanvas" ref="containerCanvasRef">
    <canvas
      ref="background"
      class="canvasCss1 canvasCss"
      :width="resClientRect.width"
      :height="resClientRect.height"
    ></canvas>
    <canvas ref="arc" class="canvasCss2 canvasCss" :width="resClientRect.width" :height="resClientRect.height"></canvas>
    <canvas
      ref="event"
      v-show="!disabled"
      class="canvasCss3 canvasCss"
      :width="resClientRect.width"
      :height="resClientRect.height"
    ></canvas>
    <!--    <el-button style="z-index: 4" @click="exportImg">下载图片</el-button>-->
  </div>
</template>

<style scoped lang="scss">
.containerCanvas {
  position: relative;
}
.canvasCss {
  &.canvasCss1 {
    position: absolute;
    z-index: 1;
  }
  &.canvasCss2 {
    position: absolute;
    z-index: 2;
  }
  &.canvasCss3 {
    position: absolute;
    z-index: 3;
    cursor: none;
  }
}
</style>
