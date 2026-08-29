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
      tree-label="name"
      label="name"
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
import { ref, computed, onUnmounted, onMounted, onBeforeMount } from 'vue';
import { ColumnProps } from '@patrol/ui';
import { orgTree, OrgTree, orgTreeList } from '@/api/modules/optCenter/aiPatrolManage/task';
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
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
const dataSource = ref<OrgTree[]>([]);
const defaultValue = ref<string>();
const getTreeList = async () => {
  let { data } = await orgTree();
  dataSource.value = data;
  defaultValue.value = data[0]?.id || '';
};

//表格
const getTList = async (params: any) => {
  let { pageNum, pageSize, treeId, keyWords, ...searchData } = params;
  searchData.parent = treeId;
  searchData.name = keyWords;
  let res = await orgTreeList(searchData);
  return res;
};
const column = computed<ColumnProps[]>(() => [
  {
    prop: 'name',
    label: t('common.name'),
  },
]);
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
