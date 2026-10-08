<template>
  <div ref="sceneRef" class="patrol-scene" :class="{ 'is-dragging': dragState }">
    <div
      ref="viewportRef"
      class="map-viewport"
      @wheel.prevent="handleWheel"
      @pointerdown="handlePointerDown"
      @pointermove="handlePointerMove"
      @pointerup="handlePointerUp"
      @pointercancel="clearPointer"
    >
      <div class="map-layer" :style="mapStyle">
        <img class="floor-plan" :src="floorPlanUrl" alt="巡检平面图" draggable="false" />
        <svg class="route-layer" :viewBox="`0 0 ${IMAGE_WIDTH} ${IMAGE_HEIGHT}`" aria-hidden="true">
          <defs>
            <linearGradient id="routeGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stop-color="#0d60b4" stop-opacity="0.58" />
              <stop offset="0.5" stop-color="#007fff" stop-opacity="0.96" />
              <stop offset="1" stop-color="#0d60b4" stop-opacity="0.7" />
            </linearGradient>
            <filter id="routeGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <path v-if="fullRoutePath" class="route-base" :d="fullRoutePath" />
          <path v-if="finishedRoutePath" class="route-finished" :d="finishedRoutePath" />
          <path v-if="activeSegmentPath" class="route-flow" :d="activeSegmentPath" />
        </svg>
        <button
          v-for="camera in cameraMarkers"
          :key="camera.cameraId"
          type="button"
          class="camera-marker"
          :class="camera.status"
          :style="{ left: `${camera.pointX}px`, top: `${camera.pointY}px` }"
          :title="camera.cameraName || '摄像头'"
          @pointerdown.stop
          @click.stop="focusCamera(camera.cameraId)"
        >
          <span class="camera-icon" aria-hidden="true"></span>
          <span class="camera-name">{{ camera.cameraName || '摄像头' }}</span>
        </button>
      </div>
    </div>

    <aside class="task-panel" :class="{ collapsed: taskPanelCollapsed }">
      <button class="panel-toggle" type="button" @click="taskPanelCollapsed = !taskPanelCollapsed">
        <span>{{ taskPanelCollapsed ? '展开任务' : '收起' }}</span>
        <i>{{ taskPanelCollapsed ? '›' : '‹' }}</i>
      </button>
      <template v-if="!taskPanelCollapsed">
        <div class="panel-heading">
          <div>
            <span class="eyebrow">PATROL TASK</span>
            <h1>{{ activeTask?.inspectionTaskName || '图片巡检' }}</h1>
          </div>
          <span class="task-count">{{ patrolItems.length }}</span>
        </div>
        <div v-if="taskList.length > 1" class="task-selector">
          <select :value="activeTaskId" @change="changeTask">
            <option v-for="task in taskList" :key="task.id" :value="task.id">
              {{ task.inspectionTaskName }}
            </option>
          </select>
        </div>
        <div class="progress-card">
          <div class="progress-line">
            <span>本轮进度</span><strong>{{ finishedCount }} / {{ patrolItems.length }}</strong>
          </div>
          <div class="progress-track"><i :style="{ width: `${progressPercent}%` }"></i></div>
          <span class="task-state">{{ activeTask?.taskStatusName || taskStatusText }}</span>
        </div>
        <div v-if="patrolItems.length" class="task-items">
          <button
            v-for="(item, index) in patrolItems"
            :key="item.itemId"
            type="button"
            class="task-item"
            :class="[item.itemStatus, { selected: resultItem?.itemId === item.itemId }]"
            @click="selectItem(item)"
          >
            <span class="item-index">{{ item.itemStatus === 'finished' ? '✓' : padIndex(index + 1) }}</span>
            <span class="item-copy">
              <strong>{{ item.itemName || `巡检项 ${index + 1}` }}</strong>
              <small>{{ item.cameraName || item.cameraId || '未关联摄像头' }}</small>
            </span>
            <span class="item-status">{{ getItemStatusText(item) }}</span>
          </button>
        </div>
        <div v-else class="empty-list">等待巡检任务推送</div>
      </template>
    </aside>

    <div class="map-tools">
      <button type="button" title="放大" @click="zoomFromCenter(1.2)">＋</button>
      <button type="button" title="缩小" @click="zoomFromCenter(1 / 1.2)">−</button>
      <button type="button" class="text-button" @click="fitMap('contain')">全图</button>
      <button type="button" class="text-button" @click="toggleFullscreen">
        {{ isFullscreen ? '退出全屏' : '全屏' }}
      </button>
      <button type="button" class="text-button" @click="router.push('/optCenter/deviceManage/camera')">
        摄像头配置
      </button>
    </div>

    <section v-if="resultItem" class="result-card" :class="resultStateClass">
      <div class="result-heading">
        <div>
          <span class="eyebrow">AI INSPECTION RESULT</span>
          <h2>{{ resultItem.itemName }}</h2>
        </div>
        <span class="result-badge">{{ getItemStatusText(resultItem) }}</span>
      </div>
      <div class="snapshot">
        <img v-if="resultImageUrl" :src="resultImageUrl" alt="AI 巡检抓图" />
        <div v-else-if="resultItem.itemStatus === 'during'" class="recognizing-content">
          <i></i><strong>AI 巡检中</strong><span>正在等待识别结果</span>
        </div>
        <div v-else class="snapshot-empty">暂无巡检抓图</div>
        <span v-if="resultImageLoading" class="image-loading">正在加载抓图…</span>
      </div>
      <dl class="result-fields">
        <div>
          <dt>巡检结论</dt>
          <dd>{{ resultItem.inspectionResult || resultItem.itemStatusName || '--' }}</dd>
        </div>
        <div>
          <dt>识别结果</dt>
          <dd>{{ resultItem.recognitionResult || (resultItem.itemStatus === 'during' ? '识别中…' : '--') }}</dd>
        </div>
        <div>
          <dt>巡检时间</dt>
          <dd>{{ formatTime(resultItem.gatherTime) }}</dd>
        </div>
      </dl>
    </section>
    <div v-if="unlocatedCount" class="coordinate-warning">{{ unlocatedCount }} 个巡检项尚未配置图片坐标</div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { webSocketUrl } from '@/api/modules/appCenter/inspectionMonitor/aiInspection';
import floorPlanUrl from '@/assets/images/BIM_plan_view.png';
import { useWebSocket } from '@appCenter/hooks/useWebSocket';
import { useBackFileUrl } from '@optCenter/hooks/use-file-utils';
import { routePath, segmentPath } from './route';
import type { CameraPoint, ImagePoint, PatrolTarget, PatrolTask, PatrolTaskItem } from './types';

const IMAGE_WIDTH = 1920;
const IMAGE_HEIGHT = 1080;
const route = useRoute();
const router = useRouter();
const sceneRef = ref<HTMLElement>();
const viewportRef = ref<HTMLElement>();
const taskList = ref<PatrolTask[]>([]);
const activeTaskId = ref('');
const selectedItemId = ref('');
const taskPanelCollapsed = ref(false);
const isFullscreen = ref(false);
const resultImageUrl = ref('');
const resultImageLoading = ref(false);
const scale = ref(1);
const translateX = ref(0);
const translateY = ref(0);
const dragState = ref<{ pointerId: number; startX: number; startY: number; originX: number; originY: number }>();
let resizeObserver: ResizeObserver | undefined;
let resultImageRequest = 0;

const activeTask = computed(() => taskList.value.find((task) => String(task.id) === activeTaskId.value));
const patrolItems = computed<PatrolTaskItem[]>(() =>
  (activeTask.value?.taskItemMapList || [])
    .flatMap((group) => (Array.isArray(group.taskItems) ? group.taskItems : []))
    .slice()
    .sort((left, right) => Number(left.sortNo || 0) - Number(right.sortNo || 0))
);
const currentItem = computed(() => patrolItems.value.find((item) => item.itemStatus === 'during'));
const latestFinishedItem = computed(() =>
  patrolItems.value
    .filter((item) => item.itemStatus === 'finished')
    .reduce<PatrolTaskItem | undefined>(
      (latest, item) => (!latest || Number(item.sortNo) > Number(latest.sortNo) ? item : latest),
      undefined
    )
);
const resultItem = computed(
  () =>
    patrolItems.value.find((item) => String(item.itemId) === selectedItemId.value) ||
    currentItem.value ||
    latestFinishedItem.value
);
const finishedCount = computed(() => patrolItems.value.filter((item) => item.itemStatus === 'finished').length);
const progressPercent = computed(() =>
  patrolItems.value.length ? Math.round((finishedCount.value / patrolItems.value.length) * 100) : 0
);
const taskStatusText = computed(() => {
  if (currentItem.value) return 'AI 巡检中';
  if (patrolItems.value.length && finishedCount.value === patrolItems.value.length) return '本轮巡检已完成';
  return '等待巡检';
});
const mapStyle = computed(() => ({
  width: `${IMAGE_WIDTH}px`,
  height: `${IMAGE_HEIGHT}px`,
  transform: `translate(${translateX.value}px, ${translateY.value}px) scale(${scale.value})`,
}));

const routeTargets = computed<PatrolTarget[]>(() =>
  patrolItems.value.flatMap((item) => {
    const point = getItemPoint(item);
    if (!point) return [];
    return [
      {
        ...item,
        cameraId: item.cameraId ? String(item.cameraId) : `item-${item.itemId}`,
        ...point,
      },
    ];
  })
);
const unlocatedCount = computed(() => patrolItems.value.filter((item) => !getItemPoint(item)).length);
const fullRoutePath = computed(() => routePath(routeTargets.value, IMAGE_WIDTH, IMAGE_HEIGHT));
const currentTargetIndex = computed(() =>
  currentItem.value
    ? routeTargets.value.findIndex((item) => String(item.itemId) === String(currentItem.value?.itemId))
    : -1
);
const activeTargetIndex = computed(() => {
  if (currentTargetIndex.value >= 0) return currentTargetIndex.value;
  let index = -1;
  routeTargets.value.forEach((item, currentIndex) => {
    if (item.itemStatus === 'finished') index = currentIndex;
  });
  return index;
});
const finishedRoutePath = computed(() =>
  routePath(routeTargets.value, IMAGE_WIDTH, IMAGE_HEIGHT, activeTargetIndex.value)
);
const activeSegmentPath = computed(() => {
  const index = currentTargetIndex.value;
  if (index < 1) return '';
  return segmentPath(routeTargets.value[index - 1], routeTargets.value[index], index - 1, IMAGE_WIDTH, IMAGE_HEIGHT);
});

const cameraMarkers = computed(() => {
  const markers = new Map<string, CameraPoint & { status: 'todo' | 'during' | 'finished'; itemIds: string[] }>();
  routeTargets.value.forEach((item) => {
    const cameraId = String(item.cameraId);
    const current = markers.get(cameraId);
    const status = item.itemStatus === 'during' ? 'during' : item.itemStatus === 'finished' ? 'finished' : 'todo';
    if (!current) {
      markers.set(cameraId, {
        cameraId,
        cameraName: item.cameraName,
        pointX: item.pointX,
        pointY: item.pointY,
        status,
        itemIds: [String(item.itemId)],
      });
    } else {
      current.itemIds.push(String(item.itemId));
      if (status === 'during' || (status === 'finished' && current.status === 'todo')) current.status = status;
    }
  });
  return Array.from(markers.values());
});
const resultStateClass = computed(() => ({
  recognizing: resultItem.value?.itemStatus === 'during',
  abnormal: resultItem.value?.inspectionResultStatus === false || resultItem.value?.isAlarm === true,
}));

function normalizePoint(value: unknown): ImagePoint | undefined {
  let point = value;
  if (typeof point === 'string') {
    try {
      point = JSON.parse(point);
    } catch {
      return undefined;
    }
  }
  if (!point || typeof point !== 'object') return undefined;
  const source = point as Record<string, unknown>;
  const pointX = Number(source.pointX);
  const pointY = Number(source.pointY);
  if (!Number.isFinite(pointX) || !Number.isFinite(pointY)) return undefined;
  if (pointX < 0 || pointX > IMAGE_WIDTH || pointY < 0 || pointY > IMAGE_HEIGHT) return undefined;
  return { pointX, pointY };
}

function getItemPoint(item: PatrolTaskItem) {
  return normalizePoint(item.imagePoint);
}

function handleSocketMessage(response: unknown) {
  const source = response as { data?: unknown };
  const data = Array.isArray(response) ? response : source?.data;
  if (!Array.isArray(data)) return;
  taskList.value = data as PatrolTask[];
  syncActiveTask();
}

function syncActiveTask() {
  if (!taskList.value.length) {
    activeTaskId.value = '';
    selectedItemId.value = '';
    return;
  }
  const queryId = Array.isArray(route.query.id) ? route.query.id[0] : route.query.id;
  const requestedId = queryId ? String(queryId) : '';
  const activeExists = taskList.value.some((task) => String(task.id) === activeTaskId.value);
  if (requestedId && taskList.value.some((task) => String(task.id) === requestedId)) {
    activeTaskId.value = requestedId;
  } else if (!activeExists) {
    const duringTask = taskList.value.find((task) => task.taskStatus === 'during');
    activeTaskId.value = String(duringTask?.id || taskList.value[0].id);
  }
}

const socket = useWebSocket(webSocketUrl, handleSocketMessage);

function changeTask(event: Event) {
  activeTaskId.value = (event.target as HTMLSelectElement).value;
  selectedItemId.value = '';
  nextTick(() => fitMap('contain'));
}

function selectItem(item: PatrolTaskItem) {
  selectedItemId.value = String(item.itemId);
  const point = getItemPoint(item);
  if (point) focusPoint(point);
}

function focusCamera(cameraId: string) {
  const targets = routeTargets.value.filter((item) => String(item.cameraId) === cameraId);
  const target =
    targets.find((item) => item.itemStatus === 'during') ||
    targets
      .slice()
      .reverse()
      .find((item) => item.itemStatus === 'finished') ||
    targets[0];
  if (target) selectItem(target);
}

function getItemStatusText(item: PatrolTaskItem) {
  return (
    ({ todo: '待巡检', during: 'AI巡检中', finished: '已巡检', not_done: '未完成' } as Record<string, string>)[
      item.itemStatus
    ] ||
    item.itemStatusName ||
    '--'
  );
}

function padIndex(index: number) {
  return String(index).padStart(2, '0');
}

function formatTime(value: unknown) {
  if (!value) return '--';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);
}

function fitMap(mode: 'cover' | 'contain' = 'contain') {
  const viewport = viewportRef.value;
  if (!viewport?.clientWidth || !viewport.clientHeight) return;
  const horizontalScale = viewport.clientWidth / IMAGE_WIDTH;
  const verticalScale = viewport.clientHeight / IMAGE_HEIGHT;
  scale.value = mode === 'cover' ? Math.max(horizontalScale, verticalScale) : Math.min(horizontalScale, verticalScale);
  translateX.value = (viewport.clientWidth - IMAGE_WIDTH * scale.value) / 2;
  translateY.value = (viewport.clientHeight - IMAGE_HEIGHT * scale.value) / 2;
}

function zoomAt(clientX: number, clientY: number, multiplier: number) {
  const viewport = viewportRef.value;
  if (!viewport) return;
  const rect = viewport.getBoundingClientRect();
  const localX = clientX - rect.left;
  const localY = clientY - rect.top;
  const imageX = (localX - translateX.value) / scale.value;
  const imageY = (localY - translateY.value) / scale.value;
  const nextScale = Math.min(Math.max(scale.value * multiplier, 0.2), 6);
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
  if (!dragState.value || dragState.value.pointerId !== event.pointerId) return;
  translateX.value = dragState.value.originX + event.clientX - dragState.value.startX;
  translateY.value = dragState.value.originY + event.clientY - dragState.value.startY;
}

function handlePointerUp(event: PointerEvent) {
  if (dragState.value?.pointerId === event.pointerId) clearPointer();
}
function clearPointer() {
  dragState.value = undefined;
}

function focusPoint(point: ImagePoint) {
  const viewport = viewportRef.value;
  if (!viewport) return;
  const minimumScale = Math.min(viewport.clientWidth / IMAGE_WIDTH, viewport.clientHeight / IMAGE_HEIGHT);
  scale.value = Math.max(scale.value, minimumScale * 1.45);
  const panelOffset = taskPanelCollapsed.value ? 0 : Math.min(180, viewport.clientWidth * 0.12);
  translateX.value = viewport.clientWidth / 2 + panelOffset - point.pointX * scale.value;
  translateY.value = viewport.clientHeight / 2 - point.pointY * scale.value;
}

async function toggleFullscreen() {
  if (!sceneRef.value) return;
  if (document.fullscreenElement) await document.exitFullscreen();
  else await sceneRef.value.requestFullscreen();
}
function syncFullscreenState() {
  isFullscreen.value = document.fullscreenElement === sceneRef.value;
}

watch(
  () => currentItem.value?.itemId,
  (itemId, previousItemId) => {
    if (!itemId || itemId === previousItemId) return;
    selectedItemId.value = String(itemId);
    const point = currentItem.value ? getItemPoint(currentItem.value) : undefined;
    if (point) nextTick(() => focusPoint(point));
  },
  { flush: 'post' }
);

watch(
  () => resultItem.value?.gatherPic,
  async (fileId) => {
    const requestId = ++resultImageRequest;
    if (resultImageUrl.value) URL.revokeObjectURL(resultImageUrl.value);
    resultImageUrl.value = '';
    resultImageLoading.value = false;
    if (!fileId) return;
    resultImageLoading.value = true;
    const url = (await useBackFileUrl(String(fileId), undefined, true)) || '';
    if (requestId !== resultImageRequest) {
      if (url) URL.revokeObjectURL(url);
      return;
    }
    resultImageUrl.value = url;
    resultImageLoading.value = false;
  },
  { immediate: true }
);

watch(
  () => route.query.id,
  () => {
    syncActiveTask();
  }
);

onMounted(() => {
  nextTick(() => fitMap('cover'));
  if (viewportRef.value) {
    resizeObserver = new ResizeObserver(() => {
      if (!dragState.value) fitMap('cover');
    });
    resizeObserver.observe(viewportRef.value);
  }
  document.addEventListener('fullscreenchange', syncFullscreenState);
});

onBeforeUnmount(() => {
  socket.value?.close();
  resizeObserver?.disconnect();
  document.removeEventListener('fullscreenchange', syncFullscreenState);
  resultImageRequest += 1;
  if (resultImageUrl.value) URL.revokeObjectURL(resultImageUrl.value);
});
</script>

<style scoped lang="scss">
.patrol-scene {
  --cyan: #52e6e7;
  --mint: #70f2d1;

  position: relative;
  width: 100%;
  height: 100%;
  min-height: 620px;
  overflow: hidden;
  font-family: SourceHanSansCN-Regular, 'Microsoft YaHei', sans-serif;
  color: #eafaff;
  background: #071927;
}
.map-viewport {
  position: absolute;
  inset: 0;
  overflow: hidden;
  touch-action: none;
  cursor: grab;
  user-select: none;
  background: radial-gradient(circle at center, #123347, #061723 72%);
}
.is-dragging .map-viewport {
  cursor: grabbing;
}
.map-layer {
  position: absolute;
  top: 0;
  left: 0;
  transform-origin: 0 0;
  will-change: transform;
}
.floor-plan,
.route-layer {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
.floor-plan {
  pointer-events: none;
  filter: saturate(0.88) brightness(0.78) contrast(1.04);
}
.route-layer {
  overflow: visible;
  pointer-events: none;
}
.route-base,
.route-finished,
.route-flow {
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.route-base {
  stroke: rgb(80 177 188 / 38%);
  stroke-width: 6;
}
.route-finished {
  filter: url('#routeGlow');
  stroke: url('#routeGradient');
  stroke-width: 8;
}
.route-flow {
  filter: url('#routeGlow');
  stroke: rgb(139 255 227 / 72%);
  stroke-dasharray: 22 55;
  stroke-width: 10;
  animation: route-flow 2.4s linear infinite;
}
@keyframes route-flow {
  to {
    stroke-dashoffset: -77;
  }
}
.camera-marker {
  position: absolute;
  z-index: 3;
  display: flex;
  align-items: center;
  width: 46px;
  height: 34px;
  padding: 0;
  color: #c9f9ff;
  cursor: pointer;
  background: #0b2b3d;
  border: 3px solid #a4eaf0;
  border-radius: 8px;
  box-shadow: 0 0 0 6px rgb(9 29 43 / 58%), 0 8px 16px rgb(0 0 0 / 35%);
  transform: translate(-50%, -50%);
}
.camera-marker::after {
  position: absolute;
  right: -11px;
  bottom: 5px;
  width: 12px;
  height: 16px;
  clip-path: polygon(0 30%, 100% 0, 100% 100%, 0 70%);
  content: '';
  background: currentColor;
}
.camera-marker.finished {
  color: var(--mint);
  border-color: var(--mint);
}
.camera-marker.during {
  color: #71fff0;
  border-color: #71fff0;
  box-shadow: 0 0 0 9px rgb(76 230 220 / 20%), 0 0 28px rgb(64 238 221 / 88%);
  animation: camera-pulse 1.8s ease-in-out infinite;
}
.camera-icon {
  display: block;
  width: 13px;
  height: 13px;
  margin: auto;
  border: 3px solid currentColor;
  border-radius: 50%;
}
.camera-name {
  position: absolute;
  top: 42px;
  left: 50%;
  width: max-content;
  max-width: 180px;
  padding: 5px 9px;
  overflow: hidden;
  font-size: 15px;
  font-weight: 600;
  color: #efffff;
  text-overflow: ellipsis;
  white-space: nowrap;
  pointer-events: none;
  background: rgb(4 23 35 / 76%);
  border-radius: 4px;
  transform: translateX(-50%);
}
@keyframes camera-pulse {
  50% {
    box-shadow: 0 0 0 17px rgb(76 230 220 / 8%), 0 0 38px rgb(64 238 221 / 95%);
  }
}
.task-panel,
.result-card,
.map-tools,
.coordinate-warning {
  position: absolute;
  z-index: 10;
  background: linear-gradient(145deg, rgb(8 35 50 / 96%), rgb(5 27 41 / 93%));
  border: 1px solid rgb(82 213 223 / 55%);
  box-shadow: 0 18px 50px rgb(0 8 16 / 38%);
  backdrop-filter: blur(14px);
}
.task-panel {
  top: 24px;
  bottom: 24px;
  left: 24px;
  width: 360px;
  padding: 26px 18px 18px;
  border-radius: 16px;
  transition: width 0.22s ease, height 0.22s ease;
}
.task-panel.collapsed {
  bottom: auto;
  width: 116px;
  height: 46px;
  padding: 0;
}
.panel-toggle {
  position: absolute;
  top: 18px;
  right: 17px;
  display: flex;
  gap: 5px;
  align-items: center;
  padding: 5px 6px;
  font-size: 13px;
  color: var(--cyan);
  cursor: pointer;
  background: transparent;
  border: 0;
}
.collapsed .panel-toggle {
  inset: 0;
  justify-content: center;
  width: 100%;
  height: 100%;
}
.panel-toggle i {
  font-size: 22px;
  font-style: normal;
  line-height: 1;
}
.panel-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 84px 20px 6px;
}
.eyebrow {
  display: block;
  margin-bottom: 7px;
  font-size: 11px;
  font-weight: 700;
  color: #61dce4;
  letter-spacing: 0.22em;
}
.panel-heading h1,
.result-heading h2 {
  margin: 0;
  overflow: hidden;
  font-size: 22px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.task-count {
  display: grid;
  flex: none;
  place-items: center;
  width: 32px;
  height: 32px;
  margin-right: -62px;
  font-weight: 700;
  color: #bffcff;
  background: rgb(48 179 193 / 30%);
  border-radius: 50%;
}
.task-selector select {
  width: 100%;
  height: 36px;
  padding: 0 12px;
  margin-bottom: 12px;
  color: #dffbff;
  background: rgb(19 57 75 / 78%);
  border: 1px solid rgb(91 186 199 / 38%);
  border-radius: 7px;
  outline: none;
}
.progress-card {
  padding: 16px;
  margin-bottom: 14px;
  background: rgb(25 65 83 / 54%);
  border: 1px solid rgb(97 192 206 / 28%);
  border-radius: 10px;
}
.progress-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  color: #a7cad3;
}
.progress-line strong {
  font-size: 18px;
  color: #f2feff;
}
.progress-track {
  height: 7px;
  overflow: hidden;
  background: #234e61;
  border-radius: 99px;
}
.progress-track i {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, #20bbcf, #6af1cf);
  border-radius: inherit;
  transition: width 0.35s ease;
}
.task-state {
  display: block;
  margin-top: 10px;
  font-size: 12px;
  color: #78a9b6;
}
.task-items {
  height: calc(100% - 195px);
  padding-right: 4px;
  overflow-y: auto;
  scrollbar-color: rgb(82 213 223 / 40%) transparent;
}
.task-item {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  width: 100%;
  min-height: 74px;
  padding: 10px 12px;
  color: #a9c9d2;
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 9px;
}
.task-item + .task-item {
  margin-top: 5px;
}
.task-item:hover,
.task-item.selected {
  background: rgb(34 94 111 / 52%);
  border-color: rgb(73 211 219 / 52%);
}
.task-item.during {
  box-shadow: inset 4px 0 0 var(--cyan);
}
.item-index {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  color: #a4cad3;
  border: 1px solid #437789;
  border-radius: 50%;
}
.finished .item-index {
  color: #73f1ca;
  border-color: #38ae8e;
}
.during .item-index {
  color: #f2ffff;
  background: #2396a5;
  border-color: #70edf2;
}
.item-copy {
  min-width: 0;
}
.item-copy strong,
.item-copy small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.item-copy strong {
  margin-bottom: 5px;
  font-size: 15px;
  color: #dff7fa;
}
.item-copy small {
  color: #77a5b2;
}
.item-status {
  font-size: 12px;
  color: #86abb5;
  white-space: nowrap;
}
.finished .item-status,
.during .item-status {
  color: #65e4c6;
}
.empty-list {
  display: grid;
  place-items: center;
  height: 180px;
  color: #7799a3;
}
.map-tools {
  top: 24px;
  right: 24px;
  display: flex;
  overflow: hidden;
  border-radius: 11px;
}
.map-tools button {
  min-width: 50px;
  height: 48px;
  padding: 0 16px;
  font-size: 23px;
  color: #e9fdff;
  cursor: pointer;
  background: transparent;
  border: 0;
}
.map-tools button + button {
  border-left: 1px solid rgb(101 193 204 / 30%);
}
.map-tools button:hover {
  color: #65f2df;
  background: rgb(72 181 190 / 13%);
}
.map-tools .text-button {
  font-size: 14px;
}
.result-card {
  right: 24px;
  bottom: 24px;
  width: min(460px, calc(100% - 48px));
  padding: 20px;
  border-radius: 14px;
}
.result-card.abnormal {
  border-color: rgb(255 162 91 / 75%);
}
.result-heading {
  display: flex;
  gap: 18px;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}
.result-heading > div {
  min-width: 0;
}
.result-heading h2 {
  font-size: 18px;
}
.result-badge {
  flex: none;
  padding: 7px 11px;
  font-size: 12px;
  color: #68edcd;
  background: rgb(37 177 148 / 15%);
  border: 1px solid rgb(76 219 185 / 55%);
  border-radius: 6px;
}
.recognizing .result-badge {
  color: #ffd285;
  background: rgb(205 139 34 / 20%);
  border-color: rgb(233 172 77 / 58%);
}
.snapshot {
  position: relative;
  display: grid;
  place-items: center;
  height: 190px;
  overflow: hidden;
  color: #759ca8;
  background: #0a1f2d;
  border: 1px solid rgb(80 161 176 / 35%);
  border-radius: 8px;
}
.snapshot img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.recognizing-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
}
.recognizing-content i {
  width: 40px;
  height: 40px;
  border: 3px solid rgb(90 227 221 / 18%);
  border-top-color: #65e9dd;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}
.recognizing-content strong {
  color: #dffffc;
}
.recognizing-content span {
  font-size: 12px;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
.image-loading {
  position: absolute;
  right: 8px;
  bottom: 8px;
  padding: 4px 7px;
  font-size: 11px;
  color: #d4faff;
  background: rgb(3 19 29 / 78%);
  border-radius: 4px;
}
.result-fields {
  display: grid;
  gap: 9px;
  margin: 14px 0 0;
}
.result-fields div {
  display: grid;
  grid-template-columns: 82px minmax(0, 1fr);
  gap: 10px;
  font-size: 13px;
}
.result-fields dt {
  color: #779da9;
}
.result-fields dd {
  margin: 0;
  overflow: hidden;
  color: #ddf3f5;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.coordinate-warning {
  right: 24px;
  bottom: 24px;
  padding: 9px 13px;
  font-size: 12px;
  color: #ffd49a;
  border-color: rgb(219 160 75 / 45%);
  border-radius: 7px;
}
.result-card + .coordinate-warning {
  bottom: 452px;
}

@media (max-width: 900px) {
  .task-panel {
    top: 14px;
    bottom: 14px;
    left: 14px;
    width: min(330px, calc(100% - 28px));
  }
  .map-tools {
    top: 14px;
    right: 14px;
  }
  .result-card {
    right: 14px;
    bottom: 14px;
    width: min(420px, calc(100% - 28px));
  }
}
@media (max-height: 760px) {
  .result-card {
    width: 390px;
  }
  .snapshot {
    height: 125px;
  }
  .result-fields {
    grid-template-columns: 1fr 1fr;
  }
  .task-panel {
    top: 14px;
    bottom: 14px;
  }
}
</style>

<style scoped lang="scss" src="./theme.scss"></style>
