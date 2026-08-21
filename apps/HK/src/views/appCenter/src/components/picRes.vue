<template>
  <template v-if="activeItem.gatherPic">
    <el-image class="flex-1" :src="url" fit="fill" />
    <div class="mt20 result-title">{{ $t('aiInspection.inspectionRes') }}:</div>
    <div class="mt10">
      <span class="result-label mr12">{{ $t('aiInspection.inspectionResult') }}:</span>
      <span
        class="result-result mr28"
        :class="
          activeItem.inspectionResultStatus === false
            ? 'result-error'
            : activeItem.inspectionResultStatus === true
            ? 'result-success'
            : ''
        "
        >{{ activeItem.inspectionResult || '--' }}</span
      >
      <span class="result-label mr12">{{ $t('aiInspection.recognitionResult') }}:</span>
      <span
        class="result-result mr28"
        :class="
          activeItem.inspectionResultStatus === false
            ? 'result-error'
            : activeItem.inspectionResultStatus === true
            ? 'result-success'
            : ''
        "
        >{{ activeItem.recognitionResult || '--' }}</span
      >
      <span class="result-label mr12">{{ $t('aiInspection.gatherTime') }}:</span>
      <span class="result-time">{{ gatherTime }}</span>
    </div>
  </template>
  <el-empty class="flex-1 video-empty" v-else :description="$t('aiInspection.ImgEmpty')" />
</template>
<script setup lang="ts">
import { ref, reactive, watch, computed } from 'vue';
import { downCVRFile } from '@/api/modules/download';
import imgUrl from '@/assets/images/403.png';
import { useDateFormat } from '@vueuse/core';
import { useRemoveURLObject, useBackFileUrl } from '@optCenter/hooks/use-file-utils';
interface Props {
  activeItem: { [key: string]: any };
}
// 接受父组件参数，配置默认值
const props = withDefaults(defineProps<Props>(), {});

const url = ref();
const gatherTime = computed(() => {
  if (props.activeItem.gatherTime) {
    let str = useDateFormat(props.activeItem.gatherTime, 'YYYY-MM-DD HH:mm:ss');
    let res = str.value.replace(/["']/g, '');
    return res;
  } else {
    return '--';
  }
});
let urlArr = useRemoveURLObject();
const getImg = async () => {
  if (props.activeItem.gatherPic) {
    url.value = await useBackFileUrl(props.activeItem.gatherPic, undefined, true);
    urlArr.add(url.value);
  } else {
    url.value = '';
  }
};
watch(
  () => props.activeItem,
  (val) => {
    getImg();
  },
  {
    immediate: true,
  }
);
</script>
<style scoped lang="scss">
.video-empty {
  background: var(--el-fill-color-light);
}
.result {
  &-title {
    font-size: var(--el-font-size-base);
    color: var(--el-text-color-regular);
  }
  &-label {
    font-size: var(--el-font-size-base);
    color: var(--el-text-color-secondary);
  }
  &-result {
    font-family: SourceHanSansCN-Medium;
    font-size: var(--el-font-size-medium);
    color: var(--el-text-color-primary);
  }
  &-time {
    font-size: var(--el-font-size-base);
    color: var(--el-text-color-regular);
  }
  &-success {
    color: var(--el-color-primary);
  }
  &-error {
    color: var(--el-color-danger);
  }
}
</style>
