<template>
  <kr-public-dialog
    v-model="visible"
    :title="`${objectName ? `【${objectName}】` : ''}配置巡检对象视角`"
    width="1280px"
    appendTobody
    destroyOnClose
    customClass="vp-dialog"
    @doClose="visible = false"
  >
    <div v-loading="!pickerReady" class="vp-dialog__body">
      <div ref="canvasRef" class="vp-dialog__canvas"></div>
      <aside class="vp-dialog__side">
        <div class="vp-dialog__tip">
          <p class="vp-dialog__tip-title">操作方式</p>
          <p>1. 外立面支持 显示/透视/隐藏（隐藏后可清晰看到内部设备）</p>
          <p>2. 点击模型中的内部设备，相机自动聚焦</p>
          <p>3. 左键旋转 · 右键平移 · 滚轮缩放，微调角度</p>
          <p>4. 调整满意后点击"保存视角"</p>
        </div>
        <div class="vp-dialog__status" :class="{ 'is-empty': !selectedName }">
          <template v-if="selectedName">
            <i class="vp-dialog__dot"></i>
            已选中：<b>{{ selectedName }}</b>
          </template>
          <template v-else>请点击模型中的物体</template>
        </div>
        <div class="vp-dialog__facade">
          <span class="vp-dialog__facade-label">外立面</span>
          <div class="vp-dialog__facade-opts">
            <button
              v-for="opt in facadeOptions"
              :key="opt.value"
              type="button"
              class="vp-dialog__facade-btn"
              :class="{ active: facadeMode === opt.value }"
              @click="setFacadeMode(opt.value)"
            >
              {{ opt.label }}
            </button>
          </div>
        </div>
        <el-button class="vp-dialog__btn" :disabled="!selectedName" @click="picker?.focusSelected()">
          重新聚焦
        </el-button>
        <el-button class="vp-dialog__btn" @click="picker?.resetView()">重置视角</el-button>
      </aside>
    </div>
    <template #footer>
      <el-button class="dialog-footer__btn" @click="visible = false">取 消</el-button>
      <el-button class="dialog-footer__btn" type="primary" :disabled="!selectedName" @click="handleSave">
        保存视角
      </el-button>
    </template>
  </kr-public-dialog>
</template>

<script setup lang="ts" name="ViewpointDialog">
import { computed, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { ViewpointPicker } from './ViewpointPicker';
import type { FacadeMode, ViewpointData } from './ViewpointPicker';

const props = defineProps<{
  modelValue: boolean;
  objectName?: string;
  /** 编辑回显：传入已保存的视角数据（含 position/target/fov/distance/modelId） */
  viewPoint?: ViewpointData | null;
}>();
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'saved', viewpoint: ViewpointData): void;
}>();

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});

const canvasRef = ref<HTMLElement>();
const pickerReady = ref(false);
const selectedName = ref<string | null>(null);
/** 外立面显示模式（仅影响预览，不写入保存的视角；默认与巡检场景一致为透视） */
const facadeMode = ref<FacadeMode>('transparent');
const facadeOptions: { value: FacadeMode; label: string }[] = [
  { value: 'show', label: '显示' },
  { value: 'transparent', label: '透视' },
  { value: 'hidden', label: '隐藏' },
];
/** 切换外立面显示：完整显示 / 半透明透视 / 隐藏（隐藏后内部设备完全可见，便于点击选中） */
const setFacadeMode = (mode: FacadeMode) => {
  facadeMode.value = picker?.setFacadeMode(mode) ?? mode;
};
let picker: ViewpointPicker | undefined;

/** 弹窗打开且容器就绪后创建 3D 场景 */
const initPicker = async () => {
  await new Promise((resolve) => setTimeout(resolve, 30));
  const container = canvasRef.value;
  if (!container || picker) return;
  picker = new ViewpointPicker(container, { facadeMode: facadeMode.value });
  picker.onSelect = (id) => {
    selectedName.value = id;
  };
  picker.onReady = () => {
    pickerReady.value = true;
    // 编辑回显：应用已保存的视角（position/target/fov/distance/modelId）
    if (props.viewPoint) {
      picker?.applyViewpoint(props.viewPoint);
    }
  };
  picker.onError = (message) => {
    ElMessage.error(`模型加载失败：${message}`);
  };
  picker.resize();
};

const disposePicker = () => {
  picker?.dispose();
  picker = undefined;
  pickerReady.value = false;
  selectedName.value = null;
};

watch(visible, (val) => {
  if (val) {
    initPicker();
  } else {
    disposePicker();
  }
});

/** 保存当前视角并回传给父组件，成功后关闭弹窗 */
const handleSave = () => {
  const viewpoint = picker?.getViewpoint();
  if (!viewpoint) {
    ElMessage.warning('请先点击选中一个设备');
    return;
  }
  console.log(viewpoint);
  emit('saved', viewpoint);
  ElMessage.success('视角保存成功，提交表单后生效');
  visible.value = false;
};
</script>

<style scoped lang="scss">
.vp-dialog {
  :deep(.el-dialog__body) {
    padding: 0;
    overflow: hidden;
  }
  &__body {
    display: flex;
    height: 560px;
    overflow: hidden;
  }
  &__canvas {
    position: relative;
    flex: 1;
    min-width: 0;
    height: 100%;
    :deep(.vp-picker__canvas) {
      display: block;
      width: 100%;
      height: 100%;
      cursor: grab;
      &:active {
        cursor: grabbing;
      }
    }
  }
  &__side {
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    gap: 12px;
    width: 220px;
    padding: 16px 14px;
    background: var(--el-bg-color);
    border-left: 1px solid var(--el-border-color-lighter);
  }
  &__tip {
    padding: 10px 12px;
    font-size: 12px;
    line-height: 1.9;
    color: var(--el-text-color-regular);
    background: var(--el-fill-color-light);
    border-radius: 4px;
    &-title {
      margin-bottom: 4px;
      font-weight: 600;
      color: var(--el-text-color-primary);
    }
    p {
      margin: 0;
    }
  }
  &__status {
    display: flex;
    gap: 6px;
    align-items: center;
    min-height: 32px;
    padding: 6px 10px;
    font-size: 13px;
    color: var(--el-color-success);
    word-break: break-all;
    background: var(--el-color-success-light-9);
    border: 1px solid var(--el-color-success-light-7);
    border-radius: 4px;
    &.is-empty {
      color: var(--el-text-color-secondary);
      background: var(--el-fill-color-light);
      border-color: var(--el-border-color-lighter);
    }
  }
  &__dot {
    flex: none;
    width: 8px;
    height: 8px;
    background: var(--el-color-success);
    border-radius: 50%;
  }
  &__btn {
    width: 100%;
    margin: 0;
  }
  &__facade {
    padding: 10px 12px;
    background: var(--el-fill-color-light);
    border-radius: 4px;
    &-label {
      display: block;
      margin-bottom: 8px;
      font-size: 12px;
      color: var(--el-text-color-regular);
    }
    &-opts {
      display: flex;
      gap: 2px;
      padding: 2px;
      background: var(--el-bg-color);
      border: 1px solid var(--el-border-color-lighter);
      border-radius: 4px;
    }
    &-btn {
      flex: 1;
      padding: 4px 0;
      font-size: 12px;
      line-height: 1.2;
      color: var(--el-text-color-secondary);
      cursor: pointer;
      background: transparent;
      border: none;
      border-radius: 3px;
      &.active {
        font-weight: 600;
        color: var(--el-color-primary);
        background: var(--el-color-primary-light-9);
      }
    }
  }
}
</style>
