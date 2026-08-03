<script setup lang="ts">
import baseCloud from './HkVideoComp/index.vue';
interface Props {
  cameraId: string;
}
const props = defineProps<Props>();
</script>

<template>
  <baseCloud v-bind="props"></baseCloud>
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
