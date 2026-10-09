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

    <aside ref="taskPanelRef" class="task-panel" :class="{ collapsed: taskPanelCollapsed }">
      <el-button class="panel-toggle" text @click="taskPanelCollapsed = !taskPanelCollapsed">
        {{ taskPanelCollapsed ? '展开任务' : '收起' }}
        <el-icon><ArrowRight v-if="taskPanelCollapsed" /><ArrowLeft v-else /></el-icon>
      </el-button>
      <template v-if="!taskPanelCollapsed">
        <div class="panel-heading">
          <div>
            <span class="eyebrow">PATROL TASK</span>
            <h1>{{ activeTask?.inspectionTaskName || '图片巡检' }}</h1>
          </div>
          <span class="task-count">{{ patrolItems.length }}</span>
        </div>
        <div v-if="taskList.length > 1" class="task-selector">
          <el-select v-model="activeTaskId" :teleported="false" @change="changeTask">
            <el-option
              v-for="task in taskList"
              :key="task.id"
              :value="String(task.id)"
              :label="task.inspectionTaskName"
            />
          </el-select>
        </div>
        <div class="progress-card">
          <div class="progress-line">
            <span>本轮进度</span><strong>{{ finishedCount }} / {{ patrolItems.length }}</strong>
          </div>
          <el-progress :percentage="progressPercent" :show-text="false" :stroke-width="6" />
          <span class="task-state">{{ activeTask?.taskStatusName || taskStatusText }}</span>
        </div>
        <el-scrollbar v-if="patrolItems.length" class="task-items">
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
        </el-scrollbar>
        <el-empty v-else class="empty-list" description="等待巡检任务推送" :image-size="60" />
      </template>
    </aside>

    <div class="map-tools">
      <el-button-group>
        <el-button :icon="Plus" aria-label="放大" title="放大" @click="zoomFromCenter(1.2)" />
        <el-button :icon="Minus" aria-label="缩小" title="缩小" @click="zoomFromCenter(1 / 1.2)" />
        <el-button @click="fitMap('contain')">全图</el-button>
        <el-button @click="toggleFullscreen">{{ isFullscreen ? '退出全屏' : '全屏' }}</el-button>
      </el-button-group>
    </div>

    <section
      v-if="resultItem"
      ref="resultCardRef"
      class="result-card"
      :class="resultStateClass"
      :style="resultCardStyle"
    >
      <PatrolResultCard :item="resultItem" />
    </section>
    <div v-if="unlocatedCount" class="coordinate-warning">{{ unlocatedCount }} 个巡检项尚未配置图片坐标</div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { useElementSize } from '@vueuse/core';
import { ArrowLeft, ArrowRight, Minus, Plus } from '@element-plus/icons-vue';
import { useRoute } from 'vue-router';
import { webSocketUrl } from '@/api/modules/appCenter/inspectionMonitor/aiInspection';
import floorPlanUrl from '@/assets/images/BIM_plan_view_theme_transparent.png';
import { useWebSocket } from '@appCenter/hooks/useWebSocket';
import PatrolResultCard from './PatrolResultCard.vue';
import { getCardPosition } from './cardPosition';
import { IMAGE_WIDTH, IMAGE_HEIGHT, usePatrolMap } from './usePatrolMap';
import { routePath, segmentPath } from './route';
import type { CameraPoint, ImagePoint, PatrolTarget, PatrolTask, PatrolTaskItem } from './types';

/**
 * 图片巡检展示页：后端通过 WebSocket 推送完整任务列表，执行状态和结果均以后端数据为准。
 * 点位直接读取任务项的 imagePoint，使用原图 1920 × 1080 坐标，不额外查询摄像头详情。
 * 地图交互、卡片定位和结果展示分别封装，便于后续按正式 UI 调整。
 */
const route = useRoute();
const taskList = ref<PatrolTask[]>([]);
const activeTaskId = ref('');
const selectedItemId = ref('');
// 默认收起任务列表，优先展示地图；用户可手动展开查看任务进度和历史结果。
const taskPanelCollapsed = ref(true);
const taskPanelRef = ref<HTMLElement>();
const resultCardRef = ref<HTMLElement>();
const { width: panelWidth } = useElementSize(taskPanelRef, { width: 0, height: 0 }, { box: 'border-box' });
const { width: cardWidth, height: cardHeight } = useElementSize(
  resultCardRef,
  { width: 0, height: 0 },
  { box: 'border-box' }
);
const {
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
} = usePatrolMap();

const activeTask = computed(() => taskList.value.find((task) => String(task.id) === activeTaskId.value));
// 展开当前任务下的分组，并按 sortNo 排序；任务项保留各自身份，允许重复关联同一摄像头。
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
// 优先展示手动选中的任务项，否则展示正在巡检的任务项或最近完成的结果。
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
// 缺少有效坐标的任务项仍保留在列表中，仅不参与地图点位和路线绘制。
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
// 流光仅展示在通往当前巡检点的路段上，不用于判断巡检是否完成。
const activeSegmentPath = computed(() => {
  const index = currentTargetIndex.value;
  if (index < 1) return '';
  return segmentPath(routeTargets.value[index - 1], routeTargets.value[index], index - 1, IMAGE_WIDTH, IMAGE_HEIGHT);
});

// 地图按摄像头合并展示标记，列表和结果卡仍按任务项分别展示。
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

// 将原图坐标转换为当前地图显示坐标；拖动、缩放和收起列表时，结果卡同步重新定位。
const resultCardStyle = computed(() => {
  const point = resultItem.value ? getItemPoint(resultItem.value) : undefined;
  const position = getCardPosition({
    viewportWidth: width.value,
    viewportHeight: height.value,
    cardWidth: cardWidth.value || 370,
    cardHeight: cardHeight.value || 440,
    panelRight: taskPanelCollapsed.value ? 16 : panelWidth.value + 36,
    point: point
      ? {
          x: translateX.value + point.pointX * scale.value,
          y: translateY.value + point.pointY * scale.value,
        }
      : undefined,
  });
  return { left: `${position.left}px`, top: `${position.top}px` };
});

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

// 每次推送都是完整快照，直接替换列表，避免将同一批任务重复追加。
function handleSocketMessage(response: unknown) {
  const source = response as { data?: unknown };
  const data = Array.isArray(response) ? response : source?.data;
  if (!Array.isArray(data)) return;
  taskList.value = data as PatrolTask[];
  syncActiveTask();
}

// 优先展示地址栏指定的任务；未指定时保留当前任务，任务消失后再选择正在执行的任务。
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

function changeTask() {
  selectedItemId.value = '';
  nextTick(() => fitMap('contain'));
}

// 聚焦点位时为旁边的结果卡预留空间，尽量避免遮挡摄像头和左侧任务列表。
function focusResultPoint(point: ImagePoint) {
  const panelRight = taskPanelCollapsed.value ? 16 : panelWidth.value + 36;
  const availableWidth = width.value - panelRight;
  const resultWidth = cardWidth.value || 370;
  const x = availableWidth > resultWidth + 96 ? panelRight + (availableWidth - resultWidth - 32) / 2 : width.value / 2;
  focusPoint(point, x);
}

function selectItem(item: PatrolTaskItem) {
  selectedItemId.value = String(item.itemId);
  const point = getItemPoint(item);
  if (point) focusResultPoint(point);
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

// 仅在当前巡检项变化时自动聚焦，重复快照不会反复打断用户拖动、缩放地图。
watch(
  () => currentItem.value?.itemId,
  (itemId, previousItemId) => {
    if (!itemId || itemId === previousItemId) return;
    selectedItemId.value = String(itemId);
    nextTick(() => {
      const point = currentItem.value ? getItemPoint(currentItem.value) : undefined;
      if (point) focusResultPoint(point);
    });
  },
  { flush: 'post' }
);

watch(
  () => route.query.id,
  () => {
    syncActiveTask();
  }
);

onBeforeUnmount(() => socket.value?.close());
</script>

<style scoped lang="scss" src="./theme.scss"></style>
