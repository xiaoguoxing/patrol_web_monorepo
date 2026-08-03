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
      tree-label="areaName"
      label="objectName"
      id="id"
      :multiple="false"
      :pagination="false"
      @confirm="onConfirm"
      @close="onClose"
      :defaultValue="defaultValue"
    ></kr-tree-list-select>
  </div>
</template>
<script setup lang="ts" name="UserDialog">
import { ref, computed, onUnmounted, onBeforeMount } from 'vue';
import { ColumnProps } from '@/components/znxj-components/znxj-ui';
import { getAreaListApi, getListApi, Area } from '@/api/modules/optCenter/inspectionSet/area';

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
const dataSource = ref<Area.ResList[]>([]);
const defaultValue = ref<string>();
const getTreeList = async () => {
  let { data } = await getAreaListApi();
  dataSource.value = data;
  defaultValue.value = data[0]?.id || '';
};

//表格
const getTList = async (params: any) => {
  let { pageNum, pageSize, treeId, keyWords, ...searchData } = params;
  searchData.areaId = treeId;
  searchData.objectName = keyWords;
  let res = await getListApi(searchData);
  return {
    data: res.data.list,
  };
};
const column: ColumnProps[] = [
  {
    prop: 'objectName',
    label: '名称',
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
