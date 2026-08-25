<script setup lang="ts">
import { TaskDetail } from '@/api/modules/appCenter/task/schedule';
interface Props {
  itemDate: TaskDetail;
}
withDefaults(defineProps<Props>(), {
  itemDate: () => ({} as TaskDetail),
});
const emit = defineEmits(['gotoOther']);
function gotoOther(item: TaskDetail) {
  emit('gotoOther', item);
}
</script>

<template>
  <div>
    <div class="div-title" :class="{ 'div-end-title': itemDate.taskStatus == 'finished' }" @click="gotoOther(itemDate)">
      <div class="title-1">
        <span>{{ itemDate.taskStartTime }}</span
        ><span>{{ $t('table.status') }}：{{ itemDate.taskStatusName }}</span>
      </div>
      <div class="title-2">
        <span> {{ itemDate.inspectionTaskName?.split(' ')[1] }}</span
        ><el-icon><ArrowRight /></el-icon>
      </div>
    </div>
    <div class="div-content">
      <div class="item-div" v-for="(item2, index2) in itemDate.taskItemMapList" :key="index2">
        <div class="item-title">
          {{ item2.areaName }}
        </div>
        <div class="item-content" v-for="(item3, index3) in item2.taskItems" :key="index3">
          {{ item3.itemName }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss"></style>
