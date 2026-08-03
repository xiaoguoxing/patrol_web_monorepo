<template>
  <component
    v-if="column.search?.el"
    @clear="clearMethod"
    :is="props.column.search?.render ?? `el-${column.search?.el}`"
    :class="{ 'input-with-select': isPrependInput }"
    v-bind="column.search.props"
    v-model="searchParam[column.search.key ?? handleProp(column.prop!)]"
    :data="column.search?.el === 'tree-select' ? columnEnum : []"
    :options="column.search?.el === 'cascader' ? columnEnum : []"
    :placeholder="placeholder(column)"
    :clearable="clearable(column)"
    range-separator="至"
    start-placeholder="开始时间"
    end-placeholder="结束时间"
  >
    <template #prepend v-if="isPrependInput">
      <search-form-item :column="prependOption" style="width: 140px" :searchParam="searchParam"></search-form-item>
    </template>
    <template #default="{ data }" v-if="column.search.el === 'cascader'">
      <span>{{ data[fieldNames().label] }}</span>
    </template>
    <template v-if="column.search.el === 'select'">
      <component
        :is="`el-option`"
        v-for="(col, index) in columnEnum"
        :key="index"
        :label="col[fieldNames().label]"
        :value="col[fieldNames().value]"
      ></component>
    </template>
    <slot v-else></slot>
  </component>
</template>

<script setup lang="ts" name="searchFormItem">
import { computed, inject, ref } from 'vue';
import { handleProp } from '@/components/znxj-components/utils';
import type { ColumnProps } from '@/components/znxj-components/components/pro-table';

interface SearchFormItem {
  column: ColumnProps; // 具体每一个搜索项的配置
  searchParam: { [key: string]: any }; // 搜索参数
  clearMethod: () => void;
}

const props = withDefaults(defineProps<SearchFormItem>(), {
  searchParam: () => ({}),
});

// 接受 enumMap
const enumMap = inject('enumMap', ref(new Map()));

const columnEnum = computed(() => {
  if (!enumMap.value.get(props.column.prop)) return [];
  return enumMap.value.get(props.column.prop);
});

// 判断 fieldNames 设置 label && value 的 key 值
const fieldNames = () => {
  return {
    label: props.column.fieldNames?.label ?? 'label',
    value: props.column.fieldNames?.value ?? 'value',
  };
};

// 判断 placeholder
const placeholder = (column: ColumnProps) => {
  return column.search?.props?.placeholder ?? (column.search?.el === 'input' ? '请输入' : '请选择');
};

// 是否有清除按钮 (当搜索项有默认值时，清除按钮不显示)
const clearable = (column: ColumnProps) => {
  return (
    column.search?.props?.clearable ?? (column.search?.defaultValue == null || column.search?.defaultValue == undefined)
  );
};

// 是否selectInput
const isPrependInput = computed(() => props.column.search?.isPrependInput && props.column.search?.el === 'input');

const prependOption = computed(() => {
  enumMap.value.set(props.column.search?.PrependOption?.PrependProp, props.column.search?.PrependOption?.enum);
  return {
    search: props.column.search?.PrependOption,
    prop: props.column.search?.PrependOption?.PrependProp,
    enum: props.column.search?.PrependOption?.enum,
  };
});
</script>
