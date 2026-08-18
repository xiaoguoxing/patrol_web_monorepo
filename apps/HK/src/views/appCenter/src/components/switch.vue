<template>
  <el-radio-group :model-value="listType" @change="onChange">
    <el-radio-button :value="1"
      ><el-icon> <svg-icon name="a-2kapianbuju"></svg-icon> </el-icon
    ></el-radio-button>
    <el-radio-button :value="2"
      ><el-icon> <svg-icon name="a-3liebiaobuju"></svg-icon> </el-icon
    ></el-radio-button>
  </el-radio-group>
</template>
<script setup lang="ts">
import { ref, reactive, watch } from 'vue';
import SvgIcon from '@/components/SvgIcon/index.vue';

//切换列表形式
enum ListType {
  Grid = 1,
  Table = 2,
}
const listType = ref<ListType>(1);
interface Props {
  modelValue?: ListType;
}
// 接受父组件参数，配置默认值
const props = withDefaults(defineProps<Props>(), {
  modelValue: 1,
});
const emit = defineEmits(['update:modelValue']);

watch(
  () => props.modelValue,
  (val) => {
    listType.value = val;
  },
  {
    immediate: true,
  }
);
const onChange = (val) => {
  emit('update:modelValue', val);
};
</script>
<style scoped lang="scss">
.el-radio-button {
  --el-radio-button-checked-bg-color: var(--el-color-primary-light-9);
  --el-radio-button-checked-text-color: var(--el-color-primary);
  :deep(.el-radio-button__inner) {
    height: 36px;
    padding: 8px;
    font-size: 18px;
  }
}
</style>
