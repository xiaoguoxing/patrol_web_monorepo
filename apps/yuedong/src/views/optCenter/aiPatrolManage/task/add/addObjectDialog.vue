<template>
  <div>
    <kr-tree-list-select
      :dialog-title="props.title"
      v-model:visible="show"
      v-model:value="abc"
      :treeData="dataSource"
      :getListApi="getTList"
      :column="column"
      :tree-title="props.treeTitle"
      :table-title="props.tableTitle"
      tree-label="nodeName"
      label="itemName"
      id="itemId"
      :multiple="true"
      @confirm="onConfirm"
      @close="onClose"
      :pagination="false"
      :dataCallback="dataCallback"
      :defaultValue="defaultValue"
    ></kr-tree-list-select>
  </div>
</template>
<script setup lang="ts" name="UserDialog">
import { ref, computed, onUnmounted, onMounted, onBeforeMount } from 'vue';
import { ColumnProps } from '@patrol/ui';
import { treeFirst } from '@/api/modules/optCenter/aiPatrolManage/position';
import {
  getTreeApi,
  Tree,
  getInspectionListApi,
  getInspectionListAllApi,
} from '@/api/modules/optCenter/aiPatrolManage/inspection';
interface DialogProps {
  title: string;
  treeTitle: string;
  tableTitle: string;
  api?: (params: any) => Promise<any>;
  getTableList?: () => Promise<any>;
  list?: any[];
}
const props = withDefaults(defineProps<DialogProps>(), { list: () => [] });
//
const showDialog = () => {
  show.value = true;
};
defineExpose({
  showDialog,
});
//emit
interface Emit {
  (e: 'confirm', ids: string[], arr: any[]): void;
}
const emit = defineEmits<Emit>();

onUnmounted(() => {});
onBeforeMount(() => {
  getTreeList();
});
// 弹窗状态
const show = ref(false);
//树数据
const dataSource = ref<Tree[]>([]);
const defaultValue = ref<string>();
const getTreeList = async () => {
  let { data } = await getTreeApi();
  dataSource.value = data;
  defaultValue.value = treeFirst(data)?.id || '';
};

//表格
const dataCallback = (data: any) => {
  return data.list.map((i: any) => {
    i.itemId = i.id;
    return i;
  });
};
const getTList = async (params: any) => {
  let { pageNum, treeId, keyWords, ...searchData } = params;
  searchData.page = pageNum;
  searchData.objectId = treeId;
  searchData.itemName = keyWords;
  let { data } = await getInspectionListAllApi(searchData);
  return { data: { list: data } };
};
const column: ColumnProps[] = [
  {
    prop: 'objectName',
    label: '巡检对象名称',
  },
  {
    prop: 'itemName',
    label: '巡检项名称',
  },
];
const onClose = () => {
  show.value = false;
};
// 提交数据（新增/编辑）
const abc = computed(() => [...props.list]);
const onConfirm = (ids: string[], arr: any) => {
  emit('confirm', ids, arr);
  show.value = false;
};
</script>
