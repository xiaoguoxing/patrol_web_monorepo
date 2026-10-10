<template>
  <div class="result-content" aria-live="polite">
    <div class="result-heading">
      <div>
        <span class="eyebrow">AI INSPECTION RESULT</span>
        <h2>智能巡检结果</h2>
      </div>
      <el-tag :type="isRecognizing ? 'warning' : isAbnormal ? 'danger' : 'success'">
        {{ resultState }}
      </el-tag>
    </div>
    <div class="result-device">
      <strong>{{ item.itemName }}</strong>
    </div>
    <div v-loading="imageLoading" class="snapshot">
      <el-image v-if="imageUrl" :src="imageUrl" fit="cover" alt="AI 识别快照">
        <template #error><span>抓图加载失败</span></template>
      </el-image>
      <div v-else-if="isRecognizing" class="recognizing-content">
        <el-icon class="is-loading" :size="30"><Loading /></el-icon>
        <strong>AI 巡检中</strong>
        <span>正在等待识别结果</span>
      </div>
      <span v-else>暂无巡检抓图</span>
      <span class="snapshot-label">AI 识别快照</span>
    </div>
    <el-descriptions class="result-fields" :column="1" :border="false">
      <el-descriptions-item label="所属区域">{{ item.areaName }}</el-descriptions-item>
      <el-descriptions-item label="巡检结论">
        <span :class="{ abnormal: isAbnormal }">{{
          item.inspectionResult || (isRecognizing ? 'AI 识别中…' : '')
        }}</span>
      </el-descriptions-item>
      <el-descriptions-item label="设备健康度" />
      <el-descriptions-item label="识别结果">
        {{ item.recognitionResult || (isRecognizing ? '正在获取识别结果…' : '') }}
      </el-descriptions-item>
      <el-descriptions-item label="DCS 数据" />
      <el-descriptions-item label="巡检时间">{{ gatherTime }}</el-descriptions-item>
    </el-descriptions>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useDateFormat } from '@vueuse/core';
import { Loading } from '@element-plus/icons-vue';
import { useBackFileUrl } from '@optCenter/hooks/use-file-utils';
import type { PatrolTaskItem } from './types';

const props = defineProps<{ item: PatrolTaskItem }>();
const imageUrl = ref('');
const imageLoading = ref(false);
const isRecognizing = computed(() => props.item.itemStatus === 'during');
const isAbnormal = computed(() => props.item.inspectionResultStatus === false || props.item.isAlarm === true);
const resultState = computed(() => {
  if (isRecognizing.value) return '识别中';
  if (isAbnormal.value) return '需要关注';
  return props.item.itemStatus === 'finished' ? '巡检完成' : props.item.itemStatusName || '待巡检';
});
const date = computed(() => props.item.gatherTime || '');
const formattedDate = useDateFormat(date, 'YYYY-MM-DD HH:mm:ss');
const gatherTime = computed(() => (date.value ? formattedDate.value : ''));

watch(
  () => props.item.gatherPic,
  async (fileId, _previous, onCleanup) => {
    let cancelled = false;
    let objectUrl = '';
    onCleanup(() => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    });
    imageUrl.value = '';
    imageLoading.value = !!fileId;
    if (!fileId) return;
    objectUrl = (await useBackFileUrl(String(fileId), undefined, true)) || '';
    if (cancelled) {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      return;
    }
    imageUrl.value = objectUrl;
    imageLoading.value = false;
  },
  { immediate: true }
);
</script>

<style scoped lang="scss">
.result-content {
  padding: 16px;
}
.result-heading {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--divider-color);
  h2 {
    margin: 6px 0 0;
    font-size: 18px;
    font-weight: 500;
    color: var(--title-color);
  }
}
.eyebrow {
  font-size: 11px;
  color: var(--primary);
  letter-spacing: 0.12em;
}
.result-device {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 14px 0;
  strong {
    font-size: 14px;
    font-weight: 500;
    color: var(--title-color);
    overflow-wrap: anywhere;
  }
}
.snapshot {
  position: relative;
  display: grid;
  place-items: center;
  height: 150px;
  overflow: hidden;
  font-size: 12px;
  color: var(--secondary-text);
  background: #f4f4f4;
  border: 1px solid var(--divider-color);
  border-radius: 4px;
  .el-image {
    width: 100%;
    height: 100%;
  }
}
.snapshot-label {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  padding: 5px 9px;
  font-size: 11px;
  color: #ffffff;
  background: rgb(51 51 51 / 65%);
}
.recognizing-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
  padding-bottom: 20px;
  .el-icon {
    color: var(--secondary);
  }
  strong {
    color: var(--title-color);
  }
}
.result-fields {
  margin-top: 14px;
  :deep(.el-descriptions__body) {
    background: transparent;
  }
  :deep(.el-descriptions__label) {
    display: inline-block;
    width: 78px;
    margin-right: 8px;
    color: var(--secondary-text);
    vertical-align: top;
  }
  :deep(.el-descriptions__content) {
    color: var(--text-color);
    overflow-wrap: anywhere;
  }
  :deep(.el-descriptions__cell) {
    padding-bottom: 10px;
    font-size: 13px;
    line-height: 1.6;
  }
  .abnormal {
    color: var(--el-color-danger);
  }
}
@media (max-height: 760px) {
  .snapshot {
    height: 120px;
  }
}
</style>
