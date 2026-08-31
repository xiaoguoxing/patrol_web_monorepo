<template>
  <section ref="containerRef" class="three-water-plant" aria-label="水厂三维巡检场景">
    <div class="three-water-plant__viewport"></div>
    <div class="three-water-plant__tools">
      <button type="button" :class="{ active: facadeHidden }" @click="toggleFacade">
        {{ facadeHidden ? '🏭 显示外立面' : '🎭 隐藏外立面' }}
      </button>
      <button type="button" :class="{ active: followView }" @click="toggleFollow">
        {{ followView ? '🎥 视角跟随' : '🖐 自由视角' }}
      </button>
    </div>
    <div class="three-water-plant__hint">左键旋转 · 右键平移 · 滚轮缩放 · WASD 移动</div>

    <div v-if="patrolState" class="three-water-plant__status">
      <span>AI 巡检</span>
      <strong>{{ patrolState.target?.id ?? (patrolState.total === 0 ? '待配置' : '') }}</strong>
      <span>{{ patrolState.total === 0 ? '巡检对象待配置' : patrolState.target?.name }}</span>
      <div class="three-water-plant__progress"><i :style="{ width: `${progress}%` }"></i></div>
    </div>

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
import type { ModelPatrolSnapshot } from './three-water-plant/types';
import { WaterPlantScene } from './three-water-plant/WaterPlantScene';

const props = defineProps<{ activeItem?: Record<string, unknown> }>();
const containerRef = ref<HTMLElement>();
const patrolState = ref<ModelPatrolSnapshot>();
const facadeHidden = ref(false);
const followView = ref(true);
const modelLoadingPercent = ref(0);
const modelLoadingLabel = ref('');
const modelError = ref('');
const modelReady = ref(false);
let waterPlantScene: WaterPlantScene | undefined;
let resizeObserver: ResizeObserver | undefined;

const progress = computed(() =>
  patrolState.value && patrolState.value.total > 0 ? (patrolState.value.completed / patrolState.value.total) * 100 : 0
);

const toggleFacade = () => {
  facadeHidden.value = waterPlantScene?.toggleFacade() ?? facadeHidden.value;
};
const toggleFollow = () => {
  followView.value = waterPlantScene?.toggleFollowView() ?? followView.value;
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
    },
    onModelLoadProgress: ({ percent, label }) => {
      modelLoadingPercent.value = percent;
      modelLoadingLabel.value = label;
    },
    onModelLoaded: () => {
      modelReady.value = true;
    },
    onModelError: (message) => {
      modelError.value = message;
    },
  });
  resizeObserver = new ResizeObserver(() => waterPlantScene?.resize());
  resizeObserver.observe(container);
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  resizeObserver = undefined;
  waterPlantScene?.dispose();
  waterPlantScene = undefined;
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
  gap: 6px;
}
.three-water-plant__tools button {
  padding: 5px 9px;
  font-size: 11px;
}
.three-water-plant__hint {
  position: absolute;
  top: 14px;
  right: 12px;
  z-index: 2;
  font-size: 11px;
  color: #7aa7c4;
  pointer-events: none;
}
.three-water-plant__status {
  position: absolute;
  bottom: 10px;
  left: 50%;
  z-index: 3;
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 7px 12px;
  font-size: 11px;
  white-space: nowrap;
  background: rgb(6 18 42 / 90%);
  border: 1px solid rgb(0 212 255 / 45%);
  border-radius: 4px;
  transform: translateX(-50%);
}
.three-water-plant__status > span:first-child {
  color: #00d4ff;
}
.three-water-plant__status strong {
  color: #2ee6a8;
}
.three-water-plant__progress {
  width: clamp(60px, 8vw, 110px);
  height: 5px;
  overflow: hidden;
  background: rgb(0 212 255 / 15%);
  border-radius: 3px;
}
.three-water-plant__progress i {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, #00d4ff, #2ee6a8);
  transition: width 0.4s;
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
  .three-water-plant__hint {
    display: none;
  }
}
</style>
