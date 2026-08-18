<script setup lang="ts">
import { Item } from '@/api/modules/workstand';
import icon2 from '@/assets/images/schedule/doing2.png';
import { computed } from 'vue';

interface Props {
  itemData: Item;
}
const props = withDefaults(defineProps<Props>(), {});
function formatTime(seconds: number) {
  const hours = Math.floor(seconds / 3600); // 获取小时
  const minutes = Math.floor((seconds % 3600) / 60); // 获取分钟
  const remainingSeconds = seconds % 60; // 获取剩余的秒数

  if (hours > 0) {
    return `${hours}小时${minutes}分${remainingSeconds}秒`;
  } else {
    return `${minutes}分${remainingSeconds}秒`;
  }
}
let taskUseTime = computed(() => formatTime(props.itemData.taskUseTime));
</script>

<template>
  <div
    class="task-item-contents"
    :class="{
      bg1: itemData.taskStatus === 'finished',
      bg2: itemData.taskStatus === 'no_execute',
      bg3: itemData.taskStatus === 'during',
    }"
  >
    <div class="task-item-title pl12 pr8">
      <el-tooltip
        effect="customized"
        :disabled="(itemData.inspectionTaskName?.split(' ')[1]).length < 30"
        :content="itemData.inspectionTaskName"
      >
        <div class="task-item-title-l">{{ itemData.inspectionTaskName?.split(' ')[1] }}</div>
      </el-tooltip>
      <div class="task-item-title-r flx-center">
        <img :src="icon2" alt="" class="mr2" width="12" height="12" v-if="itemData.taskStatus === 'during'" />
        {{ itemData.taskStatusName }}
      </div>
    </div>
    <div class="task-item-time pl12 pr12 mt2">
      <div class="l-time flx-align-center">
        <div>{{ itemData.taskStartTime?.split(' ')[1] }}</div>
        <div class="arrow">
          <div class="arrow-left"></div>
        </div>
        <div class="gang" v-if="!itemData.taskEndTime"></div>
        <div>{{ itemData.taskEndTime?.split(' ')[1] }}</div>
      </div>
      <div class="r-time flx-align-center" v-show="itemData.taskStatus === 'finished'">{{ taskUseTime }}</div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.task-item-contents {
  position: relative;
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  padding: 8px 0;
  cursor: pointer;
  border-radius: 0 20px 0 0;
  &.bg1 {
    background: linear-gradient(135deg, #efefef 0%, #f8f8f8 100%);
    .task-item-title {
      color: var(--el-text-color-regular);
      .task-item-title-r {
        color: var(--el-text-color-regular);
      }
    }
    .task-item-time {
      .l-time {
        color: var(--el-text-color-regular);
      }
      .r-time {
        color: var(--el-text-color-secondary);
      }
    }
  }
  &.bg2 {
    background: linear-gradient(135deg, #dfeffd 0%, #f0f8ff 100%);
    .task-item-title {
      color: var(--el-color-primary);
      .task-item-title-r {
        color: var(--el-color-primary);
      }
    }
    .task-item-time {
      .l-time {
        color: var(--el-color-primary);
      }
      .r-time {
        color: var(--el-color-primary);
      }
    }
  }
  &.bg3 {
    background: linear-gradient(135deg, #dfeffd 0%, #f0f8ff 100%);
    .task-item-title {
      color: var(--el-color-primary);
      .task-item-title-r {
        color: #ffffff;
        background: var(--el-color-primary);
      }
    }
    .task-item-time {
      .l-time {
        color: var(--el-color-primary);
      }
      .r-time {
        color: var(--el-color-primary);
      }
    }
  }
  .task-item-title {
    display: flex;
    gap: 8px;
    align-items: flex-start;
    justify-content: space-between;
    .task-item-title-l {
      display: -webkit-box;
      flex: 1;
      overflow: hidden;
      font-size: 14px;
      text-overflow: ellipsis;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }
    .task-item-title-r {
      height: 24px;
      padding: 0 9px;
      font-size: 12px;
      background: #ffffff;
      border-radius: 12px;
    }
  }
  .task-item-time {
    display: flex;
    justify-content: space-between;
    height: 24px;
    background: linear-gradient(90deg, rgb(255 255 255 / 60%) 0%, rgb(255 255 255 / 0%) 100%);
    .l-time {
      flex: 1;
      gap: 10px;
      font-size: 18px;
      .arrow {
        width: 22px;
        .arrow-left {
          position: relative;
          width: calc(100%);
          height: 2px;
          background: var(--el-border-color);
          &::after {
            position: absolute;
            top: 0;
            right: 0;
            width: 8px;
            height: 2px;
            content: '';
            background: var(--el-border-color);
            transform: rotate(40deg);
            transform-origin: right top;
          }
        }
      }
      .gang {
        width: 8px;
        height: 2px;
        background: var(--el-color-primary);
      }
    }
    .r-time {
      height: 100%;
      font-size: 12px;
    }
  }
}
</style>
<style lang="scss">
.el-popper.is-customized {
  /* Set padding to ensure the height is 32px */
  width: 200px;
  padding: 6px 12px;
  background: linear-gradient(135deg, #dfeffd 0%, #f0f8ff 100%);
}
.el-popper.is-customized .el-popper__arrow::before {
  right: 0;
  background: linear-gradient(135deg, #dfeffd 0%, #f0f8ff 100%);
}
</style>
