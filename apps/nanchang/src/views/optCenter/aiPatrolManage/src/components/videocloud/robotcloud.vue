<script setup lang="ts">
import { ref } from 'vue';
import myTabs from '@/components/Tabs/index.vue';
import basePopover from './baseComp/basePopover.vue';
import baseRobotCloud from './robotComp/baserobotcloud.vue';
import baseCloud from './robotComp/basecloud.vue';
import { CloudCommand } from '@/api/modules/robotTrack';
interface Props {
  loginData?: Partial<CloudCommand>;
  cameraId: string;
}
const props = defineProps<Props>();
//显隐
const cloudRef = ref();
function close() {
  cloudRef.value.hide();
}

let robot = ref('1');
const options1 = [
  { label: '摄像机', value: '1' },
  { label: '轨道机', value: '2' },
];
</script>

<template>
  <basePopover ref="cloudRef">
    <div class="cloud-content">
      <el-icon class="closeRight" size="20" @click="close">
        <Close />
      </el-icon>
      <myTabs class="jcc" v-model="robot" button-type="background" :options="options1"></myTabs>
      <baseCloud v-show="robot === '1'" v-bind="props"></baseCloud>
      <baseRobotCloud v-show="robot === '2'" v-bind="props"></baseRobotCloud>
    </div>
  </basePopover>
</template>
<style scoped lang="scss">
.cloud-content {
  position: relative;
  min-height: 220px;
  .closeRight {
    position: absolute;
    top: 3px;
    right: 0;
    cursor: pointer;
  }
  .jcc {
    justify-content: center;
    height: 28px;
    :deep(.tabs-item) {
      width: 66px !important;
      height: 28px !important;
      padding: 0;
    }
  }
}
</style>
