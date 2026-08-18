<script setup lang="ts">
import { ref } from 'vue';
import { UserApi2 } from '@/api/modules/camera';
import baseCloud from './videoComp/basecloud.vue';
import basePopover from './baseComp/basePopover.vue';
interface Props {
  loginData?: Partial<UserApi2>;
  cameraId: string;
  loginSendData: { ip: string; port: string; userName: string; password: string; channelNum: number };
}
const props = defineProps<Props>();
//显隐
const cloudRef = ref();
function close() {
  cloudRef.value.hide();
}
</script>

<template>
  <basePopover ref="cloudRef">
    <div class="cloud-content">
      <el-icon class="closeRight" size="20" @click="close">
        <Close />
      </el-icon>
      <baseCloud v-bind="props"></baseCloud>
    </div>
  </basePopover>
</template>

<style scoped lang="scss">
.cloud-content {
  position: relative;
  .closeRight {
    position: absolute;
    top: 0;
    right: 0;
    cursor: pointer;
  }
}
</style>
