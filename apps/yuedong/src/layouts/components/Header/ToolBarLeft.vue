<template>
  <div class="tool-bar-lf">
    <Breadcrumb id="breadcrumb" v-if="themeConfig.breadcrumb" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { GlobalStore } from '@/stores';
import Breadcrumb from './components/Breadcrumb.vue';

const globalStore = GlobalStore();
const themeConfig = computed(() => globalStore.themeConfig);
</script>

<style scoped lang="scss">
.tool-bar-lf {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
