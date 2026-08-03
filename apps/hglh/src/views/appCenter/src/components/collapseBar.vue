<script setup lang="ts">
import { ModelRef } from 'vue';
interface props {
  treeWidth: string;
}
withDefaults(defineProps<props>(), { treeWidth: '' });
let isCollapse = defineModel<boolean>();
let { change: collapseChange } = useCollapse(isCollapse);
function useCollapse(is: ModelRef<boolean | undefined>) {
  function change() {
    is.value = !is.value;
  }
  return {
    change,
  };
}
</script>

<template>
  <div class="collapseBar" :class="isCollapse ? 'expand' : 'collapse'" @click="collapseChange">
    <el-icon size="14" v-if="isCollapse"><ArrowLeft /></el-icon>
    <el-icon size="14" v-else><ArrowRight /></el-icon>
  </div>
</template>

<style scoped lang="scss">
.collapseBar {
  position: absolute;
  top: calc(50% - (40px / 2));
  display: flex;
  place-content: center;
  place-items: center;
  width: 15px;
  height: 40px;
  color: var(--el-text-color-secondary);
  cursor: pointer;
  border: 1px solid var(--el-border-color-light2);
  transition: 500ms bottom;
  &:hover {
    color: var(--el-color-primary);
  }
  &.expand {
    left: calc(v-bind(treeWidth) + 40px);
    border-right: none;
    border-top-left-radius: 5px;
    border-bottom-left-radius: 5px;
  }
  &.collapse {
    left: 0;
    border-top-right-radius: 5px;
    border-bottom-right-radius: 5px;
  }
}
</style>
