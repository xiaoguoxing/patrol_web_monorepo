<template>
  <section ref="containerRef" class="three-water-plant" aria-label="水厂三维巡检场景">
    <div class="three-water-plant__viewport"></div>
    <div class="three-water-plant__tools">
      <button type="button" @click="togglePatrol">{{ patrolPaused ? '▶ 继续巡检' : '⏸ 暂停巡检' }}</button>
      <button type="button" :class="{ active: pathVisible }" @click="togglePath">巡检路径</button>
      <button type="button" :class="{ active: followView }" @click="toggleFollow">
        {{ followView ? '🎥 视角跟随' : '🖐 自由视角' }}
      </button>
    </div>
    <div class="three-water-plant__hint">左键旋转 · 右键平移 · 滚轮缩放 · 点击设备</div>

    <div v-if="patrolState" class="three-water-plant__status">
      <span>AI 巡检</span>
      <strong>{{ patrolState.device.key }}</strong>
      <span>{{ patrolState.device.area }}</span>
      <div class="three-water-plant__progress"><i :style="{ width: `${progress}%` }"></i></div>
    </div>

    <article v-if="patrolState?.dwelling" class="three-water-plant__result">
      <header>
        <strong>{{ patrolState.device.name }} · {{ patrolState.device.area }}</strong>
        <span>用时 {{ patrolState.result.duration }}</span>
        <b :class="{ abnormal: patrolState.result.status === 'abnormal' }">
          {{ patrolState.result.status === 'ok' ? '✓ 正常' : '⚠ 异常' }}
        </b>
      </header>
      <div v-for="item in patrolState.result.items" :key="item.name" class="three-water-plant__result-row">
        <span>{{ item.name }}</span
        ><b :class="{ abnormal: item.status === '异常' }">{{ item.status }}</b
        ><em>{{ item.detail }}</em>
      </div>
      <footer>
        AI 识别置信度 <strong>{{ patrolState.result.confidence }}%</strong>
      </footer>
    </article>

    <article v-if="selectedDevice" class="three-water-plant__device" :style="deviceCardStyle">
      <header>
        <strong>{{ selectedDevice.name }}</strong
        ><b :class="{ alarm: selectedDevice.alarm }">{{ selectedDevice.alarm ? '告警中' : '运行正常' }}</b>
      </header>
      <div><span>设备类型</span>{{ DEVICE_TYPE_NAMES[selectedDevice.type] }}</div>
      <div><span>所在区域</span>{{ selectedDevice.area }}</div>
      <div><span>规格型号</span>{{ selectedDevice.model }}</div>
      <div><span>设备编号</span>{{ selectedDevice.key }}</div>
      <button type="button" @click="selectedDevice = undefined">关闭</button>
    </article>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { DEVICE_TYPE_NAMES } from './three-water-plant/mockData';
import type { PatrolSnapshot, PlantDevice } from './three-water-plant/types';
import { WaterPlantScene } from './three-water-plant/WaterPlantScene';

const props = defineProps<{ activeItem?: Record<string, unknown> }>();
const containerRef = ref<HTMLElement>();
const patrolState = ref<PatrolSnapshot>();
const selectedDevice = ref<PlantDevice>();
const devicePosition = ref({ x: 12, y: 72 });
const patrolPaused = ref(false);
const pathVisible = ref(true);
const followView = ref(true);
let waterPlantScene: WaterPlantScene | undefined;
let resizeObserver: ResizeObserver | undefined;

const progress = computed(() =>
  patrolState.value ? (patrolState.value.completed / patrolState.value.total) * 100 : 0
);
const deviceCardStyle = computed(() => ({ left: `${devicePosition.value.x}px`, top: `${devicePosition.value.y}px` }));

const togglePatrol = () => {
  patrolPaused.value = waterPlantScene?.togglePaused() ?? patrolPaused.value;
};
const togglePath = () => {
  pathVisible.value = waterPlantScene?.togglePath() ?? pathVisible.value;
};
const toggleFollow = () => {
  followView.value = waterPlantScene?.toggleFollowView() ?? followView.value;
};

watch(
  () => props.activeItem?.itemId,
  (itemId, previousItemId) => {
    if (itemId !== undefined && itemId !== null && itemId !== '' && itemId !== previousItemId) {
      waterPlantScene?.advanceToNextDevice();
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
      patrolPaused.value = snapshot.paused;
    },
    onDeviceSelect: (selection) => {
      selectedDevice.value = selection?.device;
      if (selection) {
        devicePosition.value = {
          x: Math.max(8, Math.min(container.clientWidth - 238, selection.clientX)),
          y: Math.max(52, Math.min(container.clientHeight - 210, selection.clientY - 80)),
        };
      }
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
.three-water-plant__result,
.three-water-plant__device {
  position: absolute;
  z-index: 4;
  background: rgb(6 18 42 / 95%);
  border: 1px solid #00d4ff;
  border-radius: 5px;
  box-shadow: 0 0 24px rgb(0 212 255 / 22%);
}
.three-water-plant__result {
  bottom: 48px;
  left: 50%;
  width: min(360px, calc(100% - 24px));
  padding: 8px 10px;
  transform: translateX(-50%);
}
.three-water-plant__result header {
  display: flex;
  gap: 7px;
  align-items: center;
  padding-bottom: 6px;
  font-size: 11px;
  border-bottom: 1px solid rgb(0 212 255 / 16%);
}
.three-water-plant__result header strong {
  flex: 1;
  font-size: 12px;
}
.three-water-plant__result header span {
  color: #7aa7c4;
}
.three-water-plant__result b {
  color: #2ee6a8;
}
.three-water-plant__result b.abnormal {
  color: #ff4d5e;
}
.three-water-plant__result-row {
  display: grid;
  grid-template-columns: 72px 38px 1fr;
  gap: 6px;
  padding: 4px 0;
  font-size: 11px;
  border-bottom: 1px dashed rgb(0 212 255 / 12%);
}
.three-water-plant__result-row span {
  color: #7aa7c4;
}
.three-water-plant__result-row em {
  overflow: hidden;
  font-style: normal;
  text-align: right;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.three-water-plant__result footer {
  margin-top: 6px;
  font-size: 10px;
  color: #7aa7c4;
}
.three-water-plant__result footer strong {
  color: #00d4ff;
}
.three-water-plant__device {
  width: 230px;
  padding: 9px 11px;
  font-size: 11px;
}
.three-water-plant__device header {
  display: flex;
  justify-content: space-between;
  padding-bottom: 7px;
  margin-bottom: 5px;
  border-bottom: 1px solid rgb(0 212 255 / 18%);
}
.three-water-plant__device header b {
  color: #2ee6a8;
}
.three-water-plant__device header b.alarm {
  color: #ff4d5e;
}
.three-water-plant__device div {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
}
.three-water-plant__device div span {
  color: #7aa7c4;
}
.three-water-plant__device button {
  width: 100%;
  padding: 4px;
  margin-top: 6px;
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
  .three-water-plant__result {
    bottom: 46px;
  }
}
</style>
