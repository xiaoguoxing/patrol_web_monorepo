<template>
  <div class="flex-1 two-col-page">
    <div class="two-col-page-lf flex-column">
      <div class="mb20 flx-justify-between">
        <span class="list-title">执行中联动列表</span>
      </div>
      <el-scrollbar class="flex-1-column list-scroll">
        <el-collapse v-if="dataSource?.length > 0" accordion :model-value="activeTask.id" @change="onChange">
          <el-collapse-item v-for="task in dataSource" :name="task.id" :key="task.id">
            <template #title>
              <div class="flex-1-column mr20 task-header">
                <div class="task-title mb12">{{ task.linkageSignalName }}</div>
                <div class="task-code mb12">{{ task.linkageSignalCode }}</div>
                <el-progress :percentage="getPercentNum(task.finishNum, task.itemNum)">
                  <span class="item-num finished-num">{{ task.finishNum }}</span
                  ><span class="item-num">/{{ task.itemNum }}</span>
                </el-progress>
              </div>
            </template>
            <!-- 巡检对象box -->
            <template v-for="(taskObject, index) in task.itemMapList" :key="index">
              <ListObj
                :task-object="taskObject"
                :task="task"
                :active-item-id="activeItemId"
                :active-task-id="activeTaskId"
                @click-item="onClickItem"
              />
            </template>
          </el-collapse-item>
        </el-collapse>
        <div v-else class="list-empty">暂无数据</div>
      </el-scrollbar>
    </div>
    <div class="two-col-page-rt flex-1-column">
      <PicRes :active-item="activeItem"> </PicRes>
    </div>

    <kr-public-dialog
      class="picVidoDialog"
      v-model="show"
      title="巡检项结果详情"
      :singleClose="true"
      width="942"
      @doClose="show = false"
    >
      <div class="targetitem-name">
        {{ targetTask.linkageSignalName }}<span class="txt-secondary">></span>{{ targetItem.areaName
        }}<span class="txt-secondary">></span>{{ targetItem.itemName }}
      </div>
      <PicVideo v-if="show" :active-item="targetItem"> </PicVideo>
    </kr-public-dialog>
  </div>
</template>
<script setup lang="ts">
import { ref, reactive, computed, nextTick, onUnmounted } from 'vue';
// import { WarnTriangleFilled } from '@element-plus/icons-vue';
import { maxBy } from 'lodash';

import { webSocketUrl } from '@/api/modules/appCenter/linkage/index';
import type { AILinkageTask } from '@/api/modules/appCenter/linkage/index';

import ListObj from '@appCenter/components/listObj.vue';
import PicVideo from '@appCenter/components/picVideo.vue';
import { getPercentNum } from '@/utils/util';
import { useWebSocket } from '@appCenter/hooks/useWebSocket';
import PicRes from '@appCenter/components/picRes.vue';

//信号列表数据
const dataSource = ref<AILinkageTask.ResList[]>([]);
const activeItem = ref({} as { [key: string]: any });
const activeTask = ref({} as AILinkageTask.ResList);
const activeItemId = computed(() => activeItem.value.itemId);
const activeTaskId = computed(() => activeTask.value.id);

const getTotalList = (res) => {
  let { data } = res;
  dataSource.value = data;
  if (data.length > 0) {
    activeTask.value = dataSource.value.find((task) => task.id == activeTask.value.id) || ({} as AILinkageTask.ResList);

    if (!activeTask.value.itemMapList) {
      activeTask.value = dataSource.value[0];
    }
    getActiveItem();
  } else {
    activeItem.value = {};
    activeTask.value = {} as AILinkageTask.ResList;
  }
};
const getActiveItem = () => {
  //集中所有巡检项
  let taskItems = activeTask.value.itemMapList
    .map((obj) => {
      return obj.taskItems;
    })
    .flat()
    .filter((item) => item.itemStatus == 'finished');
  //取巡检项中排序SortNo最大的
  if (taskItems.length > 0) {
    activeItem.value = maxBy(taskItems, (item) => item.sortNo);
  } else {
    activeItem.value = {};
  }
  nextTick(() => {
    document.getElementById(activeTaskId.value + '_' + activeItemId.value).scrollIntoView();
  });
};
let socket = useWebSocket(webSocketUrl, getTotalList);
onUnmounted(() => {
  socket.value?.close();
});
// 点击巡检项弹窗展示要查看的巡检项
const targetItem = ref({} as { [key: string]: any });
const targetTask = ref({} as AITask.ResList);
const show = ref(false);
const onClickItem = (item: any, task: any) => {
  targetItem.value = item;

  targetTask.value = task;
  show.value = true;
};
// 切换当前活动面板
const onChange = (taskId: string) => {
  let collapseTask = dataSource.value.find((task) => task.id == taskId);
  if (collapseTask) {
    activeTask.value = collapseTask;
    getActiveItem();
  }
};
</script>
<style scoped lang="scss">
.list-title {
  font-family: SourceHanSansCN-Medium;
  font-size: 18px;
}
.list-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 70px;
  font-size: var(--el-font-size-base);
  color: var(--el-text-color-secondary);
  border-top: 1px solid var(--el-border-color-lighter);
  border-bottom: 1px solid var(--el-border-color-lighter);
}
:deep(.el-collapse-item__header) {
  align-items: end;
  height: unset;
  padding: 16px var(--list-padding-horizen) 12px;
  line-height: unset;
  &.is-active {
    background-color: var(--el-fill-color-light);
  }

  // 折叠面板右侧小图标
  .el-collapse-item__arrow {
    &::before {
      font-size: var(--el-font-size-base);
      font-style: normal;
      content: '详情';
    }

    width: auto;
    height: auto;
    margin-right: 0;
    color: var(--el-text-color-secondary);
    svg {
      transform: rotate(90deg);
    }
    &.is-active {
      transform: rotate(0);
      svg {
        transform: rotate(-90deg);
      }
    }
  }

  // 标题
  .task-title {
    overflow: hidden;
    font-size: var(--el-font-size-medium);
    text-align: left;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .task-code {
    font-size: var(--el-font-size-base);
    color: var(--el-text-color-secondary);
    text-align: left;
  }
}
:deep(.picVidoDialog) {
  .video-box {
    height: 503px;
  }
  .targetitem-name {
    margin-bottom: 20px;
    font-size: var(--el-font-size-medium);
    color: var(--el-text-color-regular);
    .txt-secondary {
      margin: 0 12px;
      color: var(--el-text-color-secondary);
    }
  }
}
</style>
