<template>
  <div class="mb20 flx-justify-between">
    <div>
      <Tabs :options="tabsOption" v-model="activeTab"></Tabs>
    </div>
    <slot name="headerRt"></slot>
  </div>

  <div class="flex-1-column video-box">
    <template v-if="activeTab == 'picture'">
      <PicRes :activeItem="activeItem" />
    </template>
    <VideoControls v-if="activeTab == 'watching'" :cameraId="activeItem.cameraId" :play-type="1" />
    <template v-if="activeTab == 'video'">
      <VideoControls
        v-if="activeItem.itemStatus == 'finished'"
        :cameraId="activeItem.cameraId"
        :play-type="2"
        :start-time="activeItem.playbackStartTime"
        :end-time="activeItem.playbackEndTime"
        :show-controls="false"
        :business-id="activeItem.id!"
      />
      <el-empty class="flex-1 video-empty" v-else :description="$t('aiInspection.videoEmpty')" />
    </template>
  </div>
</template>
<script setup lang="ts">
import { ref, reactive, watch, computed } from 'vue';
import Tabs from '@/components/Tabs/index.vue';
import PicRes from './picRes.vue';
import VideoControls from '@optCenter/videoRealTime.vue';
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
interface Props {
  activeItem: { [key: string]: any };
}
// 接受父组件参数，配置默认值
const props = withDefaults(defineProps<Props>(), {});
const tabsOption = computed(() => [
  { label: t('aiInspection.picture'), value: 'picture' },
  { label: t('aiInspection.watching'), value: 'watching' },
  { label: t('aiInspection.playBackVideo'), value: 'video' },
]);

const activeTab = ref(tabsOption.value[0]!.value);

watch(
  () => props.activeItem,
  (val) => {
    activeTab.value = 'picture';
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
  }
  &-success {
    color: var(--el-color-success);
  }
  &-error {
    color: var(--el-color-danger);
  }
}
</style>
