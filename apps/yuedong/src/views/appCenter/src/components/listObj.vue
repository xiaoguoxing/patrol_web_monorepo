<template>
  <div class="task-object flx-justify-between">
    <div class="task-object-title">{{ taskObject.areaName }}</div>
    <div>
      <span class="item-num finished-num">{{ taskObject.finishNum }}</span
      ><span class="item-num">/{{ taskObject.itemNum }}</span>
    </div>
  </div>
  <template v-if="show">
    <div
      v-for="taskItem in taskObject.taskItems"
      class="task-item"
      :class="isActive(taskItem) ? 'is-active' : ''"
      :key="taskItem.itemId"
      :id="task.id + '_' + taskItem.itemId"
      @click="onClickItem(taskItem)"
    >
      <div class="task-item-no-box">
        <span class="task-item-no">{{ taskItem.sortNo }}</span>
      </div>

      <el-tag
        class="task-item-tag mr10"
        :effect="isActive(taskItem) ? 'dark' : 'light'"
        :type="itemStatusObj[taskItem.itemStatus]"
        >{{ taskItem.itemStatusName }}</el-tag
      >
      <!-- <el-icon><WarnTriangleFilled /></el-icon> -->
      <span class="task-item-itemName">
        <el-icon v-if="taskItem.isAlarm"><WarningFilled /></el-icon>
        {{ taskItem.itemName }}
      </span>
    </div>
  </template>
</template>
<script setup lang="ts">
import { watch, ref, nextTick } from 'vue';
//巡检项状态数据字典
// const itemDictlist = (await getDict('item_status')) as DefaultDict;
const itemStatusObj = {
  todo: 'warning',
  during: 'primary',
  finished: 'info',
  not_done: 'warning',
};
interface Props {
  taskObject: { [key: string]: any };
  task: { [key: string]: any };
  activeItemId?: string;
  activeTaskId?: string;
}

const show = ref(true);
// 接受父组件参数，配置默认值
const props = withDefaults(defineProps<Props>(), {});
watch(
  () => props.activeItemId,
  (val) => {
    show.value = false;
    show.value = true;
  },
  {
    immediate: true,
  }
);
const isActive = (taskItem) => {
  return taskItem.itemId == props.activeItemId && props.task.id == props.activeTaskId;
};
const emit = defineEmits(['clickItem']);
// 点击巡检项
const onClickItem = (item: any) => {
  emit('clickItem', item, props.task);
};
</script>
<style scoped lang="scss">
.task-object {
  align-items: flex-start;
  padding: 18px var(--list-padding-horizen) 12px;
}
.task-object-title {
  font-size: var(--el-font-size-base);
  font-style: oblique;
  line-height: 1.2;
}
.task-item {
  display: flex;
  align-items: flex-start;
  padding: 8px var(--list-padding-horizen);
  font-size: var(--el-font-size-base);
  color: var(--el-text-color-regular);
  cursor: pointer;
  &-no-box {
    display: flex;
    align-items: center;
    width: 30px;
    height: 24px;
  }
  &-no {
    padding: 2px 5px 3px 4px;
    font-size: 12px;
    color: #ffffff;
    background: #666666;
    border-radius: 8px;
  }
  &-itemName {
    flex: 1;
    padding-top: 2px;
    line-height: 20px;
  }
  .el-icon {
    color: var(--el-color-danger);
  }
  &:hover {
    background-color: var(--el-fill-color-light);
  }
  &.is-active {
    color: var(--el-color-primary);
    background-color: var(--kr-color-primary-lighter);
  }
}
</style>
