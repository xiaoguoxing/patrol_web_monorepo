<script setup lang="ts">
defineProps({
  node: {
    type: Object,
    default() {
      return {};
    },
  },
  data: {
    type: Object,
    default() {
      return {};
    },
  },
});
</script>

<template>
  <span class="custom-tree-node">
    <img
      v-if="[3].includes(data.nodeType) && data.deviceStatus === 'offline'"
      src="@/assets/images/cameraoffline.svg"
      width="25"
      height="auto"
    />
    <img
      v-if="[3].includes(data.nodeType) && data.deviceStatus === 'online'"
      src="@/assets/images/cameraonline.svg"
      width="25"
      height="auto"
    />
    <span>
      {{ node.label }}
      {{ [1, 2].includes(data.nodeType) ? `(${data.onlineNum ?? '0'}/${data.totalNum ?? '0'})` : `` }}
    </span>
  </span>
</template>

<style scoped lang="scss">
.custom-tree-node {
  display: flex;
  flex: 1;
  gap: 10px;
  align-items: center;
  padding-right: 10px;
  user-select: none;
  &.move {
    cursor: grab;
    &:active {
      cursor: grabbing;
    }
  }
}
</style>
