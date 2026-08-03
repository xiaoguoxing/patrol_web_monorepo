<!-- 💥 这里是异步加载 LayoutComponents -->
<template>
  <suspense>
    <template #default>
      <component :is="LayoutComponents[themeConfig.layout]" />
    </template>
    <template #fallback>
      <Loading />
    </template>
  </suspense>
  <ThemeDrawer />
</template>

<script setup lang="ts" name="layout">
import { computed, defineAsyncComponent } from 'vue';
import { GlobalStore } from '@/stores';
import Loading from '@/components/Loading/index.vue';
import ThemeDrawer from './components/ThemeDrawer/index.vue';

const LayoutComponents: { [key: string]: any } = {
  transverse: defineAsyncComponent(() => import('./LayoutTransverse/index.vue')),
};

const globalStore = GlobalStore();
const themeConfig = computed(() => globalStore.themeConfig);
</script>

<style scoped lang="scss">
.layout {
  min-width: 740px;
}
</style>
