import { computed, ref, watch } from 'vue';
import { useElementBounding, useElementSize, useFullscreen } from '@vueuse/core';
import type { ImagePoint } from './types';

export const IMAGE_WIDTH = 1920;
export const IMAGE_HEIGHT = 1080;

export function usePatrolMap() {
  const sceneRef = ref<HTMLElement>();
  const viewportRef = ref<HTMLElement>();
  const { width, height } = useElementSize(viewportRef);
  const { left, top } = useElementBounding(viewportRef);
  const { isFullscreen, toggle: toggleFullscreen } = useFullscreen(sceneRef);
  const scale = ref(1);
  const translateX = ref(0);
  const translateY = ref(0);
  const dragState = ref<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  }>();

  const mapStyle = computed(() => ({
    width: `${IMAGE_WIDTH}px`,
    height: `${IMAGE_HEIGHT}px`,
    transform: `translate(${translateX.value}px, ${translateY.value}px) scale(${scale.value})`,
  }));

  function fitMap(mode: 'cover' | 'contain' = 'contain') {
    if (!width.value || !height.value) return;
    const scales = [width.value / IMAGE_WIDTH, height.value / IMAGE_HEIGHT];
    scale.value = mode === 'cover' ? Math.max(...scales) : Math.min(...scales);
    translateX.value = (width.value - IMAGE_WIDTH * scale.value) / 2;
    translateY.value = (height.value - IMAGE_HEIGHT * scale.value) / 2;
  }

  function zoomAt(x: number, y: number, multiplier: number) {
    const imageX = (x - translateX.value) / scale.value;
    const imageY = (y - translateY.value) / scale.value;
    const nextScale = Math.min(Math.max(scale.value * multiplier, 0.2), 6);
    translateX.value = x - imageX * nextScale;
    translateY.value = y - imageY * nextScale;
    scale.value = nextScale;
  }

  function zoomFromCenter(multiplier: number) {
    zoomAt(width.value / 2, height.value / 2, multiplier);
  }

  function handleWheel(event: WheelEvent) {
    zoomAt(event.clientX - left.value, event.clientY - top.value, event.deltaY < 0 ? 1.12 : 1 / 1.12);
  }

  function handlePointerDown(event: PointerEvent) {
    if (event.button !== 0 || !viewportRef.value) return;
    dragState.value = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: translateX.value,
      originY: translateY.value,
    };
    viewportRef.value.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: PointerEvent) {
    const drag = dragState.value;
    if (!drag || drag.pointerId !== event.pointerId) return;
    translateX.value = drag.originX + event.clientX - drag.startX;
    translateY.value = drag.originY + event.clientY - drag.startY;
  }

  function clearPointer() {
    const pointerId = dragState.value?.pointerId;
    if (pointerId !== undefined && viewportRef.value?.hasPointerCapture(pointerId)) {
      viewportRef.value.releasePointerCapture(pointerId);
    }
    dragState.value = undefined;
  }

  function handlePointerUp(event: PointerEvent) {
    if (dragState.value?.pointerId === event.pointerId) clearPointer();
  }

  function focusPoint(point: ImagePoint, x = width.value / 2) {
    if (!width.value || !height.value) return;
    const minimumScale = Math.min(width.value / IMAGE_WIDTH, height.value / IMAGE_HEIGHT);
    scale.value = Math.max(scale.value, minimumScale * 1.45);
    translateX.value = x - point.pointX * scale.value;
    translateY.value = height.value / 2 - point.pointY * scale.value;
  }

  watch([width, height], () => fitMap('cover'), { flush: 'post' });

  return {
    sceneRef,
    viewportRef,
    width,
    height,
    scale,
    translateX,
    translateY,
    dragState,
    mapStyle,
    isFullscreen,
    toggleFullscreen,
    fitMap,
    zoomFromCenter,
    handleWheel,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    clearPointer,
    focusPoint,
  };
}
