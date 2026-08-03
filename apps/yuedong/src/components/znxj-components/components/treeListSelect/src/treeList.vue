<template>
  <el-row :gutter="12" class="h100">
    <el-col :span="selectable ? 6 : 12" class="h100">
      <kr-card class="kr-filter-list" :header="treeTitle" header-border border>
        <slot name="treeHeader"></slot>
        <kr-filter-tree
          :label="treeLabel"
          :id="treeId"
          outBorder
          :requestApi="getTreeApi"
          :data="treeData"
          :defaultValue="defaultValue"
          @change="changeTreeFilter"
        >
          <template #default="{ node, data }">
            <slot name="tree" :node="node" :data="data"></slot>
          </template>
        </kr-filter-tree>
      </kr-card>
    </el-col>
    <el-col :span="9" class="h100">
      <kr-card class="kr-filter-list" :header="tableTitle" border header-border>
        <kr-pro-table
          ref="proTable"
          :columns="columns"
          :requestApi="getListApi"
          :initParam="initParam"
          :dataCallback="dataCallback"
          :selectId="id"
          :selectData="selectData"
          :pagination="pagination"
          @select="selectionChange"
          @radioSelect="selectionChange"
          :border="false"
        >
          <template #tableHeader>
            <el-input
              v-model="filterText"
              placeholder="输入关键字过滤"
              suffix-icon="el-icon-search"
              clearable
              style="margin-bottom: 10px"
              @change="search"
            ></el-input>
          </template>
        </kr-pro-table>
      </kr-card>
    </el-col>
    <el-col v-if="selectable" :span="9" class="h100">
      <kr-filter-list
        componentsType="tableList"
        header="已选"
        :label="label"
        filterable
        headerBorder
        outBorder
        :id="id"
        :columns="restColumn"
        :value="selectData"
        @change="filterListChange"
      ></kr-filter-list>
    </el-col>
  </el-row>
</template>
<script setup lang="ts" name="KrTreeList">
import { ref, reactive, watch, onMounted, nextTick } from 'vue';
import { ColumnProps } from '@/components/znxj-components/components';
import { isArray } from '@/components/znxj-components/utils';
import '../style/index.scss';
import KrCard from '../../card';
defineOptions({
  name: 'KrTreeList',

  inheritAttrs: false,
});
// 接收父组件参数并设置默认值
interface TreeListProps {
  treeTitle?: string; // 树标题 ==> 非必传，默认为 节点树
  tableTitle?: string; //表格标题 ==> 非必传，默认为 列表
  getListApi: (data?: any) => Promise<any>; // 请求table数据的 api ==> 非必传
  getTreeApi?: (data?: any) => Promise<any>; // 请求树数据的 api ==> 非必传
  defaultValue: string;
  initTableParam?: any;
  dataCallback?: (data: any) => any;
  treeData?: { [key: string]: any }[]; //组织树数据
  treeId?: string; // 选择的id ==> 非必传，默认为 “id”
  treeLabel?: string; // 显示的label ==> 非必传，默认为 “label”
  id?: string; // 选择的id ==> 非必传，默认为 “id”
  label?: string; // 显示的label ==> 非必传，默认为 “label”
  column?: ColumnProps[];
  selectable?: boolean;
  pagination?: boolean;
  multiple?: boolean; // 是否为多选 ==> 非必传，默认为 false
  value?: { [key: string]: any }[] | { [key: string]: any }; // 默认选中的值 ==> 非必传
}
const props = withDefaults(defineProps<TreeListProps>(), {
  treeTitle: '节点树',
  tableTitle: '列表',
  initTableParam: {},
  id: 'id',
  label: 'label',
  treeId: 'id',
  treeLabel: 'label',
  selectable: false,
  pagination: true,
  multiple: false,
  defaultValue: '',
});
//change事件：勾选的数据变化时触发
const emit = defineEmits(['clickTree', 'tableSearch', 'change']);

// 获取 ProTable 元素，调用其获取刷新数据方法（还能获取到当前查询参数，方便导出携带参数）
const tree = ref();
const proTable = ref();
// 表格配置项
const restColumn: ColumnProps[] = props.column ? [...props.column] : [{ prop: props.label, label: '名称' }];
const selectionCol = restColumn.find((item) => {
  return item.type == 'selection';
}) || { type: 'selection', width: 60 };
const selectionColIndex = restColumn.findIndex((item) => {
  return item.type == 'selection';
});
if (selectionColIndex != -1) {
  restColumn.splice(selectionColIndex, 1);
}
//|| { type: 'selection', width: 60 }

const radioCol = restColumn.find((item) => {
  item.type == 'radio';
}) || { type: 'radio', width: 60 };
// || { type: 'radio', width: 60 }
const radioColIndex = restColumn.findIndex((item) => {
  return item.type == 'radio';
});
if (radioColIndex != -1) {
  restColumn.splice(radioColIndex, 1);
}
const columns: ColumnProps[] = props.selectable
  ? [props.multiple ? selectionCol : radioCol, ...restColumn]
  : [...restColumn];

//选中数据
const selectData = ref<{ [key: string]: any }[]>([]);
if (!props.value || !props.value.length) {
  selectData.value = [];
} else {
  selectData.value = isArray(props?.value) ? props?.value : [props?.value];
}

const filterText = ref<string>('');
const initParam = reactive({
  treeId: props.defaultValue,
  keyWords: '',
});
// 监听页面 initParam 改化，重新获取表格数据
watch(
  () => props.initTableParam,
  () => {
    Object.assign(initParam, props.initTableParam);
  },
  { deep: true }
);
watch(
  () => props.defaultValue,
  () => {
    changeTreeFilter(props.defaultValue);
  },
  { deep: true }
);
// 树形筛选切换
const changeTreeFilter = (val: string) => {
  proTable.value.pageable.pageNum = 1;
  filterText.value = '';
  //开发者在这里使用触发事件去改变initTableParam;
  initParam.treeId = val;
  emit('clickTree', val);
};
// 树形筛选切换
const search = (val: string) => {
  proTable.value.pageable.pageNum = 1;
  //开发者在这里使用触发事件去改变initTableParam;
  initParam.keyWords = val;
  emit('tableSearch', val);
};
onMounted(() => {
  if (isArray(props?.value)) abc();
});
const abc = async () => {
  await nextTick();
  props?.value?.forEach((row: any) => {
    proTable.value.element!.toggleRowSelection(row, true);
  });
};
const selectionChange = (selList: []) => {
  // choosedData.value = selList;
  selectData.value = selList;
  emit('change', selectData.value);
};
const filterListChange = (filterList: []) => {
  selectData.value = filterList;
  emit('change', selectData.value);
};
defineExpose({
  selectData,
});
</script>
