<template>
  <div class="kr-table-search" v-if="columns.length">
    <el-form ref="formRef" :model="searchParam" label-width="auto">
      <kr-grid class="grid" ref="gridRef" :collapsed="collapsed" :gap="[16, 0]" :cols="searchCol">
        <kr-grid-item v-for="(item, index) in columns" :key="item.prop" v-bind="getResponsive(item)" :index="index">
          <el-form-item :class="{ labelHide: !item.isShowInputLabel }" :label="`${item.label} :`">
            <SearchFormItem :column="item" :searchParam="searchParam" :clearMethod="clearMethod" />
          </el-form-item>
        </kr-grid-item>
        <kr-grid-item>
          <div class="operation">
            <el-button type="primary" :icon="Search" @click="search">查询</el-button>
            <el-button :icon="Delete" v-if="showReset" @click="reset">重置</el-button>
            <el-popover
              v-if="showMicrophone"
              placement="bottom"
              popper-class="microphoneClassPopper"
              @before-enter="mpShow = true"
              @after-leave="mpShow = false"
              ref="popoverRef"
              :width="260"
              trigger="click"
            >
              <template #reference>
                <el-button type="primary" circle title="语音查询" :icon="Microphone" v-if="showMicrophone"></el-button>
              </template>
              <!--          voiceInput-->
              <microphone v-if="mpShow" v-model="searchParam.voiceInput" @close="mpClose"></microphone>
            </el-popover>
            <el-button v-if="showCollapse" type="primary" link class="search-isOpen" @click="collapsed = !collapsed">
              {{ collapsed ? '展开' : '合并' }}
              <el-icon class="el-icon--right">
                <component :is="collapsed ? ArrowDown : ArrowUp"></component>
              </el-icon>
            </el-button>
          </div>
        </kr-grid-item>
      </kr-grid>
    </el-form>
    <div class="el-overlay" v-if="mpShow"></div>
  </div>
</template>
<script setup lang="ts" name="SearchForm">
import '../../style/index.scss';
import '../style/index.scss';
import microphone from './microphone.vue';
import { computed, nextTick, ref } from 'vue';
import type { ColumnProps } from '../../pro-table';
import type { BreakPoint } from '../../';
import { Delete, Search, ArrowDown, ArrowUp, Microphone } from '@element-plus/icons-vue';
import SearchFormItem from './search-form-item.vue';
import { KrGrid, KrGridItem } from '../../';

interface SearchFormProps {
  columns?: ColumnProps[]; // 搜索配置列
  showReset?: boolean; // 搜索配置列
  showMicrophone?: boolean; // 搜索配置列
  searchParam?: { [key: string]: any }; // 搜索参数
  searchCol: number | Record<BreakPoint, number>;
  search: (params: any) => void; // 搜索方法
  clearMethod: (params: any) => void; // 清除方法
  reset: (params: any) => void; // 重置方法
}

// 默认值
const props = withDefaults(defineProps<SearchFormProps>(), {
  columns: () => [],
  searchParam: () => ({}),
  showReset: false,
  showMicrophone: false,
});

// 获取响应式设置
const getResponsive = (item: ColumnProps) => {
  return {
    span: item.search?.span,
    offset: item.search?.offset ?? 0,
    xs: item.search?.xs,
    sm: item.search?.sm,
    md: item.search?.md,
    lg: item.search?.lg,
    xl: item.search?.xl,
  };
};

// 是否默认折叠搜索项
const collapsed = ref(true);

// 获取响应式断点
const gridRef = ref();
const breakPoint = computed<BreakPoint>(() => gridRef.value?.breakPoint);

// 判断是否显示 展开/合并 按钮
const showCollapse = computed(() => {
  let show = false;
  props.columns.reduce((prev, current) => {
    prev +=
      (current.search![breakPoint.value]?.span ?? current.search?.span ?? 1) +
      (current.search![breakPoint.value]?.offset ?? current.search?.offset ?? 0);
    if (typeof props.searchCol !== 'number') {
      if (prev >= props.searchCol[breakPoint.value]) show = true;
    } else {
      if (prev > props.searchCol) show = true;
    }
    return prev;
  }, 0);
  return show;
});

let mpShow = ref(false);
let popoverRef = ref();
function mpClose() {
  popoverRef.value.hide();
  nextTick(() => {
    props.search({});
  });
}
</script>
