<template>
  <div class="flex-1 app-inspection">
    <kr-card class="flex-1" header-border>
      <template #header>
        <div>
          <el-icon @click="goBack" class="mr8 page-back"><Back /></el-icon>

          <span class="title kr-font-medium">查看巡检详情</span>
        </div>
      </template>
      <div class="flex-1 two-col-page">
        <div class="two-col-page-lf flex-column">
          <div class="task-header">
            <div class="mb15 flx-justify-between">
              <div class="flex-1-column">
                <el-tooltip effect="dark" :content="task.inspectionTaskName" placement="top">
                  <div class="task-title">{{ task.inspectionTaskName || '-' }}</div>
                </el-tooltip>
              </div>
              <SearchPop :searchParam="searchParam" :search="search" :reset="reset" />
            </div>
            <el-progress :percentage="percentNum">
              <span class="item-num finished-num">{{ task.finishNum }}</span
              ><span class="item-num">/{{ task.itemNum }}</span>
            </el-progress>
            <div class="flx-justify-between mt24 attr-box">
              <div>
                <div class="mb16">
                  <span class="attr-label">任务状态：</span>
                  <span class="attr-value" :class="task.taskStatus == 'during' ? 'attr-value-primary' : ''">{{
                    task.taskStatusName || '-'
                  }}</span>
                </div>
                <div>
                  <span class="attr-label">任务类型：</span>
                  <span class="attr-value">{{ task.taskTypeName || '-' }}</span>
                </div>
              </div>
              <div>
                <div class="mb16">
                  <span class="attr-label">任务执行类型：</span>
                  <span class="attr-value">{{ task.executeTypeName || '-' }}</span>
                </div>
                <div>
                  <span class="attr-label">任务开始时间：</span>
                  <span class="attr-value">{{ task.taskStartTime || '-' }}</span>
                </div>
              </div>
            </div>
          </div>
          <el-scrollbar class="flex-1-column">
            <!-- 巡检对象box -->
            <template v-for="(taskObject, index) in task.taskItemMapList" :key="index">
              <ListObj
                :task-object="taskObject"
                :task="task"
                :active-item-id="activeItemId"
                :active-task-id="activeTaskId"
                @click-item="onClickItem"
              />
            </template>
          </el-scrollbar>
        </div>
        <div class="two-col-page-rt flex-1-column">
          <PicVideo :active-item="activeItem">
            <template #headerRt>
              <slot name="headerRt"></slot>
            </template>
          </PicVideo>
        </div>
      </div>
    </kr-card>
  </div>
</template>
<script setup lang="ts" name="inspectionDetail">
import { ref, reactive, watch, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import ListObj from '@appCenter/components/listObj.vue';
import PicVideo from '@appCenter/components/picVideo.vue';
import SearchPop from '@appCenter/components/searchPop.vue';
import '@appCenter/styles/inspection.scss';
import { getDetailApi, AITask } from '@/api/modules/appCenter/inspectionMonitor/aiInspection';
import { getPercentNum } from '@/utils/util';
import { useSearch } from '@appCenter/hooks/useSearch';

const route = useRoute();
const router = useRouter();
const id = route.query.id;
const task = ref<AITask.ResList>({});
const percentNum = computed(() => getPercentNum(task.value.finishNum, task.value.itemNum));
const { searchParam, reset, search, resultData } = useSearch(getDetailApi, { taskId: id });

const activeItem = ref({} as { [key: string]: any });
const activeTask = ref({} as AITask.ResList);
const activeItemId = computed(() => activeItem.value.itemId);
const activeTaskId = computed(() => activeTask.value.id);
// 点击巡检项
const onClickItem = (item: any, task: any) => {
  activeItem.value = item;

  activeTask.value = task;
};

watch(
  () => resultData.value,
  (val) => {
    task.value = val || {};
    let items = task.value?.taskItemMapList?.[0]?.taskItems || [];
    if (items.length > 0) {
      activeItem.value = items[0];
    } else {
      activeItem.value = {};
    }
    activeTask.value = task.value;
  }
);

function goBack() {
  router.replace(`/patrolInspection/appCenter/inspectionMonitor/aiInspection?detail=`);
}
</script>
<style lang="scss" scoped>
.task-title {
  overflow: hidden;
  font-family: SourceHanSansCN-Medium;
  font-size: var(--el-font-size-medium);
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.task-header {
  padding: 16px var(--list-padding-horizen) 20px;
  background-color: var(--el-fill-color-light);
}
.attr-box {
  line-height: 28px;
}
.attr-label {
  // margin-right: 10px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
.attr-value {
  font-size: 12px;
  color: var(--el-text-color-regular);
}
.attr-value-primary {
  color: var(--el-color-primary);
}
</style>
