<script setup lang="ts">
import { ref } from 'vue';
const cloudRef = ref();
const isControls = ref(false);
function showCloud() {
  isControls.value = true;
}
function close() {
  cloudRef.value.hide();
}
function hideCloud() {
  isControls.value = false;
}
defineExpose({
  hide: close,
});
</script>

<template>
  <el-popover
    placement="top-start"
    :width="220"
    trigger="click"
    popper-class="cloud-content-popper"
    :show-arrow="false"
    :offset="2"
    :teleported="false"
    @show="showCloud"
    @hide="hideCloud"
    ref="cloudRef"
  >
    <template #reference>
      <div class="Controls-button">
        <span>{{ $t('camera.cloud') }}</span>
        <el-icon>
          <component :is="isControls ? 'ArrowDown' : 'ArrowUp'" />
        </el-icon>
      </div>
    </template>
    <slot></slot>
  </el-popover>
</template>
<style lang="scss">
.el-popper.cloud-content-popper {
  background: #efefef;
}
</style>
<style scoped lang="scss">
.Controls-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 96px;
  height: 36px;
  font-size: 14px;
  cursor: pointer;
  background: var(--el-color-white);
  border-radius: 4px;
  span {
    margin-right: 5px;
  }
}
</style>
