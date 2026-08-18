<template>
  <div class="pop-box">
    <ElOverlay v-if="visible" @click="visible = false"></ElOverlay>
    <el-popover
      :visible="visible"
      placement="bottom-end"
      width="300"
      popper-class="search-form-poper"
      popper-style="min-width:50px"
      :teleported="false"
    >
      <template #reference>
        <el-icon class="ml20" @click="visible = !visible"><Filter /></el-icon>
      </template>
      <SearchForm v-bind="$attrs" :search="formSearch" :reset="formReset" />
    </el-popover>
  </div>
</template>
<script setup lang="ts">
import { ref } from 'vue';
import SearchForm from './searchForm.vue';
import { ElOverlay } from 'element-plus';
interface Props {
  search: () => void; // 搜索方法
  reset: () => void; // 重置方法
}
// 接受父组件参数，配置默认值
const props = withDefaults(defineProps<Props>(), {});
const visible = ref(false);
const formSearch = () => {
  props.search();
  visible.value = false;
};
const formReset = () => {
  props.reset();
  visible.value = false;
};
</script>
<style scoped lang="scss">
.pop-box {
  position: relative;
}
:deep(.el-popper.search-form-poper) {
  left: -230px !important;
  padding: 24px;
  .el-popper__arrow {
    left: 252px !important;
  }
}
</style>
