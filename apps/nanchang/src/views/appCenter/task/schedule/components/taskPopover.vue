<template>
  <div>
    <div :class="`${taskStatus}-status ${isFocus ? 'isFocus' : ''}`" class="info">
      <span class="text">{{ inspectionTaskName }}</span>
      <img :src="icon1" alt="" v-if="taskStatus === 'during'" />
    </div>
  </div>
</template>
<script lang="ts" setup>
import icon1 from '@/assets/images/schedule/doing.png';
interface Props {
  taskStatus: string;
  inspectionTaskName: string;
  isFocus: boolean;
}
withDefaults(defineProps<Props>(), {
  taskStatus: '',
  inspectionTaskName: '',
  isFocus: false,
});
</script>
<style lang="scss" scoped>
.info {
  position: relative;
  align-items: center;
  height: 100%;
  font-size: 14px;
  &::before {
    position: absolute;
    top: 0;
    left: 0;
    width: 2px;
    height: 100%;
    content: ' ';
  }
  .text {
    margin-left: 5px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    cursor: pointer;
  }
}
.no_execute-status:focus,
.no_execute-status.isFocus {
  border: 1px solid #0d60b4;
}
.during-status:focus,
.during-status.isFocus {
  border: 1px solid #0d60b4;
}
.finished-status:focus,
.finished-status.isFocus {
  border: 1px solid #cccccc;
}
.no_execute-status {
  display: flex;
  color: #666666;
  background: #dfeffd;
  &::before {
    background: #0d60b4;
  }
}
.during-status {
  position: relative;
  display: flex;
  color: #0d60b4;
  background: #dfeffd;
  &::before {
    background: #0d60b4;
  }
  img {
    width: 15px;
    height: 15px;
    margin-right: 5px;
  }
}
.finished-status {
  display: flex;
  color: #666666;
  background: #efefef;
  &::before {
    background: #cccccc;
  }
}
</style>
