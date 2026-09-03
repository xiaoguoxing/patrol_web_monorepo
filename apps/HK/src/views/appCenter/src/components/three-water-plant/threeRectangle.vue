<template>
  <section ref="containerRef" class="three-water-plant" aria-label="水厂三维巡检场景">
    <div class="three-water-plant__viewport"></div>
    <div class="three-water-plant__tools">
      <button type="button" :class="{ active: cameraMode === 'patrol' }" @click="setCameraMode('patrol')">
        🤖 自动巡检
      </button>
      <span class="three-water-plant__toolbar-sep"></span>
      <button type="button" :class="{ active: facadeMode === 'show' }" @click="setFacadeMode('show')">外立面</button>
      <button type="button" :class="{ active: facadeMode === 'transparent' }" @click="setFacadeMode('transparent')">
        透视
      </button>
      <button type="button" :class="{ active: facadeMode === 'hidden' }" @click="setFacadeMode('hidden')">隐藏</button>
      <span class="three-water-plant__toolbar-sep"></span>
      <button type="button" @click="toggleFullscreen">{{ isFullscreen ? '退出全屏' : '全屏' }}</button>
    </div>

    <!-- 左侧任务列表面板（巡检点位 = 任务，可显隐；仅展示巡检进度与状态，不支持点击跳转） -->
    <aside class="patrol-tasks" :class="{ 'patrol-tasks--collapsed': !taskPanelVisible }">
      <header class="patrol-tasks__header">
        <span class="patrol-tasks__title">巡检任务</span>
        <span class="patrol-tasks__count" v-if="patrolTasks.length">{{ patrolTasks.length }}</span>
        <button type="button" class="patrol-tasks__toggle" @click="toggleTaskPanel">
          {{ taskPanelVisible ? '收起' : '展开' }}
        </button>
      </header>
      <template v-if="taskPanelVisible">
        <div v-if="patrolTasks.length" class="patrol-tasks__progress">
          <div class="patrol-tasks__progress-bar"><i :style="{ width: `${progress}%` }"></i></div>
          <div class="patrol-tasks__progress-meta">
            <span>已巡检 {{ completedCount }} / {{ patrolTasks.length }}</span>
            <span>{{ Math.round(progress) }}%</span>
          </div>
        </div>
        <ul class="patrol-tasks__list">
          <li
            v-for="(task, index) in patrolTasks"
            :key="task.id"
            class="patrol-tasks__item"
            :class="`is-${task.state}`"
            :title="task.name"
          >
            <span class="patrol-tasks__index">{{ index + 1 }}</span>
            <span class="patrol-tasks__name">{{ task.name }}</span>
            <span class="patrol-tasks__badge">
              {{ task.state === 'done' ? '已巡检' : task.state === 'current' ? '巡检中' : '待巡检' }}
            </span>
          </li>
        </ul>
      </template>
    </aside>

    <!-- 智能巡检结果卡片：直接采用"智能巡检结果面板"样式，锚定在设备上方 -->
    <Transition name="card-fade">
      <div
        v-if="resultCard.visible && cardPos"
        class="patrol-result-card"
        :class="{ 'patrol-result-card--idle': resultCard.taskId === '' }"
        :style="{
          '--card-x': `${cardPos.x}px`,
          '--card-y': `${cardPos.y}px`,
        }"
      >
        <header class="patrol-result-card__header">
          <span>智能巡检结果</span>
          <span v-if="resultCard.taskId" class="patrol-result-card__target">{{
            resultCard.taskName || resultCard.taskId
          }}</span>
        </header>
        <div class="patrol-result-card__body">
          <div class="patrol-result-card__row">
            <span class="patrol-result-card__label">巡检结论</span>
            <span class="patrol-result-card__conclusion" :class="conclusionClass">{{ conclusionText }}</span>
          </div>
          <div class="patrol-result-card__row">
            <span class="patrol-result-card__label">识别结果</span>
            <div class="patrol-result-card__result">
              <span v-if="resultCard.status === 'loading'" class="patrol-result-card__loader" aria-hidden="true"></span>
              <img
                v-else-if="resultCard.status === 'success' && resultCard.image"
                class="patrol-result-card__thumb"
                :src="resultCard.image"
                :alt="resultCard.taskName || resultCard.taskId"
              />
              <span class="patrol-result-card__text" :class="{ 'is-loading': resultCard.status === 'loading' }">
                {{ resultText }}
              </span>
            </div>
          </div>
          <div class="patrol-result-card__row">
            <span class="patrol-result-card__label">巡检时间</span>
            <span class="patrol-result-card__time">{{ resultCard.time || '--' }}</span>
          </div>
        </div>
      </div>
    </Transition>

    <Transition name="glb-fade">
      <div v-if="!modelReady" class="three-water-plant__loading">
        <div class="three-water-plant__loading-ring" aria-hidden="true"></div>
        <p class="three-water-plant__loading-title">
          {{ modelError ? '三维模型加载失败' : '三维模型加载中' }}
        </p>
        <div v-if="!modelError" class="three-water-plant__loading-bar">
          <i :style="{ width: `${Math.round(modelLoadingPercent)}%` }"></i>
        </div>
        <span v-if="!modelError" class="three-water-plant__loading-meta">
          {{ Math.round(modelLoadingPercent) }}% · {{ modelLoadingLabel || '正在解析模型' }}
        </span>
        <p v-else class="three-water-plant__loading-error">{{ modelError }}</p>
        <button v-if="modelError" type="button" class="three-water-plant__retry" @click="retryModel">重新加载</button>
      </div>
    </Transition>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useFullscreen } from '@vueuse/core';
import type { ModelPatrolSnapshot, TargetScreenPos } from './types';
import { requestPatrolResult } from './patrolResult';
import { WaterPlantScene } from './WaterPlantScene';
import { UI_CONFIG } from '../shared/constants';

/** 任务列表项：巡检点位 = 任务 */
interface PatrolTaskItem {
  id: string;
  name: string;
  state: 'done' | 'current' | 'pending';
}

/** 巡检结果卡片状态（悬浮卡片与底部结果面板共用） */
interface PatrolResultCardState {
  visible: boolean;
  /** 任务 id（模型节点 id，请求识别结果用） */
  taskId: string;
  /** 展示名称（巡检点位名称） */
  taskName: string;
  status: 'loading' | 'success' | 'error';
  image?: string;
  title?: string;
  detail?: string;
  confidence?: number;
  /** 识别完成时间（yyyy-MM-dd HH:mm:ss），loading 时为空 */
  time?: string;
}

const props = defineProps<{
  id?: string;
}>();
const containerRef = ref<HTMLElement>();
/** 全屏：以场景容器为目标，进入/退出全屏（ResizeObserver 会自动触发渲染尺寸更新） */
const { isFullscreen, toggle: toggleFullscreen } = useFullscreen(containerRef);
const patrolState = ref<ModelPatrolSnapshot>();
const cameraMode = ref<'orbit' | 'patrol'>('orbit');
const facadeMode = ref<'show' | 'transparent' | 'hidden'>('transparent');
const modelLoadingPercent = ref(0);
const modelLoadingLabel = ref('');
const modelError = ref('');
const modelReady = ref(false);
/** 左侧任务列表面板显隐 */
const taskPanelVisible = ref(true);
const patrolTasks = ref<PatrolTaskItem[]>([]);
/** 巡检结果卡片（跟随设备屏幕投影） */
const resultCard = ref<PatrolResultCardState>({ visible: false, taskId: '', taskName: '', status: 'loading' });
const cardPos = ref<TargetScreenPos | null>(null);
let waterPlantScene: WaterPlantScene | undefined;
let resizeObserver: ResizeObserver | undefined;
/** 结果请求的取消控制器（切换任务时中止上一次请求） */
let resultAbort: AbortController | undefined;
/** 结果卡片自动淡出定时器 */
let resultHideTimer: number | undefined;

const progress = computed(() =>
  patrolState.value && patrolState.value.total > 0 ? (patrolState.value.completed / patrolState.value.total) * 100 : 0
);
/** 已巡检数量（进度区展示用） */
const completedCount = computed(() => patrolState.value?.completed ?? 0);
/** 底部结果面板：巡检结论样式（正常绿 / 异常橙 / 失败红） */
const conclusionClass = computed(() => {
  if (resultCard.value.status === 'loading') return '';
  if (resultCard.value.status === 'error') return 'is-error';
  return resultCard.value.title === '设备运行正常' ? 'is-ok' : 'is-warn';
});
/** 底部结果面板：巡检结论文案 */
const conclusionText = computed(() => {
  if (resultCard.value.status === 'loading') return 'AI 识别中…';
  if (resultCard.value.status === 'error') return '识别失败';
  return resultCard.value.title || '--';
});
/** 智能巡检结果卡片：识别结果文案（附置信度） */
const resultText = computed(() => {
  if (resultCard.value.status === 'loading') return '正在获取识别结果…';
  if (resultCard.value.status === 'error') return '未获取到识别结果，请稍后重试';
  const confidence =
    resultCard.value.confidence != null ? `（置信度 ${Math.round(resultCard.value.confidence * 100)}%）` : '';
  return `${resultCard.value.detail || '--'}${confidence}`;
});
/** 格式化巡检时间（yyyy-MM-dd HH:mm:ss） */
const formatTime = (date: Date) => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(
    date.getMinutes()
  )}:${pad(date.getSeconds())}`;
};

/** 从巡检控制器拉取任务列表并计算各任务状态 */
const refreshPatrolTasks = () => {
  const targets = waterPlantScene?.getPatrolTargets() ?? [];
  const currentIndex = waterPlantScene?.getPatrolIndex() ?? -1;
  patrolTasks.value = targets.map((target, index) => ({
    id: target.id,
    name: target.name,
    state:
      currentIndex < 0 ? 'pending' : index < currentIndex ? 'done' : index === currentIndex ? 'current' : 'pending',
  }));
};

/** 切换左侧任务列表面板显隐 */
const toggleTaskPanel = () => {
  taskPanelVisible.value = !taskPanelVisible.value;
};

/**
 * 巡检状态变化：刷新任务列表；到达目标停留时弹出结果卡片并拉取识别结果。
 * 后端接入 WebSocket 后，结果数据源从 requestPatrolResult 替换即可，此处逻辑不变。
 */
const handlePatrolChange = (snapshot: ModelPatrolSnapshot) => {
  refreshPatrolTasks();
  if (snapshot.dwelling && snapshot.target) {
    showResultCard(snapshot.target.id, snapshot.target.name);
  }
};

/** 展示巡检结果卡片：loading -> 识别结果 -> 自动淡出 */
const showResultCard = (taskId: string, taskName: string) => {
  // 中止上一次请求，避免竞态
  resultAbort?.abort();
  resultAbort = new AbortController();
  window.clearTimeout(resultHideTimer);
  resultCard.value = { visible: true, taskId, taskName, status: 'loading', time: '' };

  requestPatrolResult(taskId, resultAbort.signal, taskName)
    .then((payload) => {
      // 仅当仍为当前任务时更新结果，防止快速切换导致旧结果覆盖新卡片
      if (resultCard.value.taskId !== payload.taskId) return;
      resultCard.value = {
        visible: true,
        taskId: payload.taskId,
        taskName,
        status: payload.status,
        image: payload.image,
        title: payload.title,
        detail: payload.detail,
        confidence: payload.confidence,
        time: formatTime(new Date()),
      };
    })
    .catch(() => {
      if (resultCard.value.taskId !== taskId) return;
      resultCard.value = { visible: true, taskId, taskName, status: 'error', time: formatTime(new Date()) };
    });

  // 结果卡片展示一段时间后自动淡出（镜头继续巡航时不会一直遮挡画面）
  resultHideTimer = window.setTimeout(() => {
    resultCard.value.visible = false;
  }, UI_CONFIG.RESULT_CARD_DURATION);
};

const setCameraMode = (mode: 'orbit' | 'patrol') => {
  cameraMode.value = waterPlantScene?.setCameraMode(mode) ?? mode;
};
const setFacadeMode = (mode: 'show' | 'transparent' | 'hidden') => {
  facadeMode.value = waterPlantScene?.setFacadeMode(mode) ?? mode;
};
const retryModel = () => {
  modelError.value = '';
  waterPlantScene?.reloadModels();
};

watch(
  () => props.activeItem?.itemId,
  (itemId, previousItemId) => {
    if (itemId !== undefined && itemId !== null && itemId !== '' && itemId !== previousItemId) {
      waterPlantScene?.advanceToNextTarget();
    }
  }
);

onMounted(() => {
  const container = containerRef.value;
  const viewport = container?.querySelector<HTMLElement>('.three-water-plant__viewport');
  if (!container || !viewport) return;
  waterPlantScene = new WaterPlantScene(viewport, {
    onPatrolChange: (snapshot) => {
      patrolState.value = snapshot;
      handlePatrolChange(snapshot);
    },
    // 每帧上报巡检目标屏幕投影，结果卡片跟随设备悬浮（并做边界保护避免出屏）
    onTargetScreenPosition: (screen) => {
      if (!screen) {
        cardPos.value = null;
        return;
      }
      const width = containerRef.value?.clientWidth ?? 0;
      const height = containerRef.value?.clientHeight ?? 0;
      // 卡片较宽（420px，translateX(-50%) 居中），左右留半宽边界；
      // 左侧还需避开任务面板（约 260px），卡片中心点整体右移
      const cardHalf = UI_CONFIG.RESULT_CARD_WIDTH / 2;
      const panelLeft = UI_CONFIG.TASK_PANEL_WIDTH_WITH_MARGIN;
      const [paddingTop, paddingBottom] = UI_CONFIG.CARD_BOUNDARY_PADDING_Y;
      cardPos.value = {
        x: Math.min(Math.max(screen.x, panelLeft + cardHalf), Math.max(width - cardHalf, panelLeft + cardHalf)),
        y: Math.min(Math.max(screen.y, paddingTop), Math.max(height - paddingBottom, paddingTop)),
      };
    },
    onModelLoadProgress: ({ percent, label }) => {
      modelLoadingPercent.value = percent;
      modelLoadingLabel.value = label;
    },
    onModelLoaded: () => {
      modelReady.value = true;
      // 模型加载完成后可能自动进入巡检跟随，同步 UI 上的模式高亮
      cameraMode.value = waterPlantScene?.getCameraMode() ?? 'orbit';
      refreshPatrolTasks();
    },
    onModelError: (message) => {
      modelError.value = message;
    },
  });
  resizeObserver = new ResizeObserver(() => waterPlantScene?.resize());
  resizeObserver.observe(container);
});

onBeforeUnmount(() => {
  // 中止结果请求
  resultAbort?.abort();
  resultAbort = undefined;

  // 清理定时器
  window.clearTimeout(resultHideTimer);
  resultHideTimer = undefined;

  // 使用 try-finally 保证资源清理，防止异常导致泄漏
  try {
    waterPlantScene?.dispose();
  } catch (error) {
    console.error('[threeRectangle] 场景释放失败:', error);
  } finally {
    waterPlantScene = undefined;
  }

  try {
    resizeObserver?.disconnect();
  } catch (error) {
    console.error('[threeRectangle] ResizeObserver 断开失败:', error);
  } finally {
    resizeObserver = undefined;
  }
});
</script>

<style scoped lang="scss">
.three-water-plant {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 360px;
  overflow: hidden;
  color: #d8f3ff;
  background: radial-gradient(ellipse at 50% 30%, rgb(0 60 130 / 35%), #030c1e 88%);
  border: 1px solid rgb(0 212 255 / 28%);
  border-radius: 6px;
  box-shadow: inset 0 0 28px rgb(0 120 220 / 12%);

  // 全屏时撑满视口，去掉圆角与边框
  &:fullscreen {
    width: 100vw;
    height: 100vh;
    border: none;
    border-radius: 0;
  }
  button {
    color: #00d4ff;
    cursor: pointer;
    background: rgb(0 30 70 / 78%);
    border: 1px solid rgb(0 212 255 / 40%);
    border-radius: 3px;
    &.active,
    &:hover {
      color: #ffffff;
      background: rgb(0 212 255 / 28%);
    }
  }
}
.three-water-plant__viewport {
  position: absolute;
  inset: 0;
}
.three-water-plant__tools {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 3;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  max-width: calc(100% - 24px);
}
.three-water-plant__tools button {
  padding: 5px 9px;
  font-size: 11px;
}
.three-water-plant__toolbar-sep {
  width: 1px;
  margin: 0 2px;
  background: rgb(0 212 255 / 25%);
}

// 智能巡检结果卡片：面板样式 + 锚定在设备上方
.patrol-result-card {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 5;
  width: 420px;
  font-size: 11px;
  color: #9fd8ff;
  pointer-events: none;
  background: rgb(6 18 42 / 94%);
  border: 1px solid rgb(0 212 255 / 55%);
  border-radius: 6px;
  box-shadow: 0 6px 24px rgb(0 0 0 / 45%), 0 0 18px rgb(0 212 255 / 18%);

  // 使用 transform 替代 left/top，提升性能，减少重排重绘
  // --card-x 和 --card-y 由 Vue 响应式更新
  transform: translate(calc(var(--card-x) - 50%), calc(var(--card-y) - 100%));

  // 使用 GPU 加速
  will-change: transform;
  backdrop-filter: blur(4px);
  &::after {
    position: absolute;
    bottom: -7px;
    left: 50%;
    width: 12px;
    height: 12px;
    content: '';
    background: rgb(6 18 42 / 94%);
    border-right: 1px solid rgb(0 212 255 / 55%);
    border-bottom: 1px solid rgb(0 212 255 / 55%);
    transform: translateX(-50%) rotate(45deg);
  }
  &.patrol-result-card--idle {
    .patrol-result-card__conclusion,
    .patrol-result-card__time {
      color: #7aa7c4;
    }
  }
}
.patrol-result-card__header {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 6px 10px;
  font-size: 11px;
  color: #00d4ff;
  letter-spacing: 1px;
  background: rgb(0 212 255 / 10%);
  border-bottom: 1px solid rgb(0 212 255 / 22%);
  border-radius: 6px 6px 0 0;
}
.patrol-result-card__target {
  overflow: hidden;
  font-size: 10px;
  color: #7aa7c4;
  text-overflow: ellipsis;
  letter-spacing: 0;
  white-space: nowrap;
}
.patrol-result-card__body {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 10px;
}
.patrol-result-card__row {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  line-height: 1.6;
}
.patrol-result-card__label {
  flex: none;
  width: 56px;
  color: #7aa7c4;
}
.patrol-result-card__conclusion {
  &.is-ok {
    color: #2ee6a8;
  }
  &.is-warn {
    color: #ffb84d;
  }
  &.is-error {
    color: #ff4d5e;
  }
}
.patrol-result-card__result {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  min-width: 0;
}
.patrol-result-card__loader {
  flex: none;
  width: 20px;
  height: 20px;
  border: 2px solid rgb(0 212 255 / 20%);
  border-top-color: #00d4ff;
  border-radius: 50%;
  animation: glb-spin 0.8s linear infinite;
}
.patrol-result-card__thumb {
  flex: none;
  order: 2;
  width: 140px;
  height: 79px;
  object-fit: cover;
  background: #071a33;
  border: 1px solid rgb(0 212 255 / 35%);
  border-radius: 4px;
}
.patrol-result-card__text {
  display: -webkit-box;
  flex: 1;
  order: 1;
  overflow: hidden;
  color: #9fd8ff;
  text-overflow: ellipsis;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 4;
  &.is-loading {
    color: #7aa7c4;
  }
}
.patrol-result-card__time {
  color: #9fd8ff;
}

// 左侧任务列表面板（巡检点位 = 任务，可显隐；仅展示巡检状态，不支持点击跳转）
.patrol-tasks {
  position: absolute;
  top: 54px;
  left: 12px;
  z-index: 4;
  width: 268px;
  overflow: hidden;
  font-size: 11px;
  color: #9fd8ff;
  background: rgb(6 18 42 / 88%);
  border: 1px solid rgb(0 212 255 / 35%);
  border-radius: 6px;
  box-shadow: 0 6px 24px rgb(0 0 0 / 40%);
  backdrop-filter: blur(4px);
  transition: width 0.2s ease;
}
.patrol-tasks--collapsed {
  width: 96px;
}
.patrol-tasks__header {
  display: flex;
  gap: 6px;
  align-items: center;
  padding: 8px 10px;
  background: rgb(0 212 255 / 10%);
  border-bottom: 1px solid rgb(0 212 255 / 22%);
}
.patrol-tasks__title {
  font-size: 12px;
  color: #00d4ff;
  letter-spacing: 1px;
}
.patrol-tasks__count {
  padding: 0 6px;
  font-size: 10px;
  color: #2ee6a8;
  background: rgb(46 230 168 / 12%);
  border-radius: 8px;
}
.patrol-tasks__toggle {
  padding: 2px 8px;
  margin-left: auto;
  font-size: 10px;
}
.patrol-tasks__progress {
  padding: 8px 10px;
  background: rgb(0 212 255 / 5%);
  border-bottom: 1px solid rgb(0 212 255 / 15%);
}
.patrol-tasks__progress-bar {
  height: 5px;
  overflow: hidden;
  background: rgb(0 212 255 / 15%);
  border-radius: 3px;
}
.patrol-tasks__progress-bar i {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, #00d4ff, #2ee6a8);
  transition: width 0.4s;
}
.patrol-tasks__progress-meta {
  display: flex;
  justify-content: space-between;
  margin-top: 5px;
  font-size: 10px;
  color: #7aa7c4;
}
.patrol-tasks__list {
  max-height: 44vh;
  padding: 6px;
  margin: 0;
  overflow-y: auto;
  list-style: none;
}
.patrol-tasks__item {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 6px 8px;
  border: 1px solid transparent;
  border-radius: 4px;
}
.patrol-tasks__item + .patrol-tasks__item {
  margin-top: 2px;
}
.patrol-tasks__item.is-current {
  background: rgb(0 212 255 / 14%);
  border-color: rgb(0 212 255 / 45%);
}
.patrol-tasks__item.is-done {
  opacity: 0.75;
}
.patrol-tasks__index {
  flex: none;
  width: 20px;
  height: 20px;
  font-size: 10px;
  font-variant-numeric: tabular-nums;
  line-height: 18px;
  color: #5d8fb0;
  text-align: center;
  border: 1px solid rgb(0 212 255 / 30%);
  border-radius: 50%;
}
.patrol-tasks__item.is-done .patrol-tasks__index {
  color: #2ee6a8;
  background: rgb(46 230 168 / 10%);
  border-color: rgb(46 230 168 / 40%);
}
.patrol-tasks__item.is-current .patrol-tasks__index {
  color: #ffffff;
  background: rgb(0 212 255 / 30%);
  border-color: #00d4ff;
}
.patrol-tasks__name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.patrol-tasks__item.is-current .patrol-tasks__name {
  font-weight: 600;
  color: #00d4ff;
}
.patrol-tasks__badge {
  flex: none;
  padding: 1px 6px;
  font-size: 10px;
  border-radius: 8px;
}
.patrol-tasks__item.is-done .patrol-tasks__badge {
  color: #2ee6a8;
  background: rgb(46 230 168 / 12%);
}
.patrol-tasks__item.is-current .patrol-tasks__badge {
  color: #ffffff;
  background: rgb(0 212 255 / 30%);
}
.patrol-tasks__item.is-pending .patrol-tasks__badge {
  color: #7aa7c4;
  background: rgb(122 167 196 / 12%);
}

// 智能巡检结果卡片淡入淡出
.card-fade-enter-active,
.card-fade-leave-active {
  transition: opacity 0.35s ease, transform 0.35s ease;
}
.card-fade-enter-from,
.card-fade-leave-to {
  opacity: 0;

  // 淡入时从稍下方出现（-94% 而非 -100%），营造轻微上浮感
  transform: translate(calc(var(--card-x) - 50%), calc(var(--card-y) - 94%));
}

// 真实模型加载遮罩
.three-water-plant__loading {
  position: absolute;
  inset: 0;
  z-index: 10;
  display: flex;
  flex-direction: column;
  gap: 14px;
  align-items: center;
  justify-content: center;
  background: radial-gradient(ellipse at 50% 42%, rgb(0 60 130 / 42%), #030c1e 86%);
}
.three-water-plant__loading-ring {
  position: relative;
  width: 54px;
  height: 54px;
  border: 3px solid rgb(0 212 255 / 16%);
  border-top-color: #00d4ff;
  border-radius: 50%;
  animation: glb-spin 0.9s linear infinite;
  &::after {
    position: absolute;
    inset: 9px;
    content: '';
    border: 2px solid rgb(46 230 168 / 14%);
    border-bottom-color: #2ee6a8;
    border-radius: 50%;
    animation: glb-spin 1.35s linear infinite reverse;
  }
}
@keyframes glb-spin {
  to {
    transform: rotate(360deg);
  }
}
.three-water-plant__loading-title {
  margin: 0;
  font-size: 13px;
  color: #9fd8ff;
  letter-spacing: 2px;
}
.three-water-plant__loading-bar {
  width: clamp(160px, 24vw, 260px);
  height: 6px;
  overflow: hidden;
  background: rgb(0 212 255 / 14%);
  border: 1px solid rgb(0 212 255 / 28%);
  border-radius: 4px;
  i {
    position: relative;
    display: block;
    height: 100%;
    background: linear-gradient(90deg, #00d4ff, #2ee6a8);
    border-radius: 4px;
    transition: width 0.3s ease;
    &::after {
      position: absolute;
      inset: 0;
      content: '';
      background: linear-gradient(105deg, transparent 40%, rgb(255 255 255 / 45%) 50%, transparent 60%);
      animation: glb-shimmer 1.1s linear infinite;
    }
  }
}
@keyframes glb-shimmer {
  from {
    transform: translateX(-100%);
  }
  to {
    transform: translateX(100%);
  }
}
.three-water-plant__loading-meta {
  font-size: 11px;
  color: #7aa7c4;
}
.three-water-plant__loading-error {
  max-width: 78%;
  margin: 0;
  overflow: hidden;
  font-size: 11px;
  color: #ff4d5e;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.three-water-plant__retry {
  padding: 5px 16px;
  font-size: 11px;
}
.glb-fade-leave-active {
  transition: opacity 0.5s ease;
}
.glb-fade-leave-to {
  opacity: 0;
}
:deep(.three-water-plant__canvas) {
  display: block;
  width: 100%;
  height: 100%;
  cursor: grab;
}
:deep(.three-water-plant__canvas:active) {
  cursor: grabbing;
}

@media (max-width: 720px) {
  .patrol-tasks {
    width: 200px;
  }
  .patrol-result-card {
    width: 300px;
  }
  .patrol-result-card__thumb {
    width: 90px;
    height: 51px;
  }
  .patrol-result-card__text {
    -webkit-line-clamp: 3;
  }
}
</style>
