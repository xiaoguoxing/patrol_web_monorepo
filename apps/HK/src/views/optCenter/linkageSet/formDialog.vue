<template>
  <kr-tree-list-select
    ref="treeListSel"
    :dialog-title="props.title"
    v-model:visible="show"
    :getTreeApi="getObjTreeApi"
    :getListApi="getTableList"
    :defaultValue="defaultValue"
    :column="column"
    :tree-title="$t('linkageSet.objectNameList')"
    :table-title="$t('linkageSet.itemList')"
    tree-label="nodeName"
    label="itemName"
    id="id"
    :multiple="true"
    :pagination="false"
    @confirm="onConfirm"
  ></kr-tree-list-select>
</template>

<script setup lang="ts" name="LinkageDialog">
import { ref, reactive, nextTick, onMounted,computed } from 'vue';
import { ElMessage, FormInstance } from 'element-plus';
import { ColumnProps } from '@patrol/ui';
import { getObjTreeApi } from '@/api/modules/optCenter/inspectionSet/area';
import type { InspectionObj } from '@/api/modules/optCenter/inspectionSet/area';
import { getInspectionListAllApi } from '@/api/modules/optCenter/aiPatrolManage/inspection';
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
// 弹窗状态
const show = ref(false);
//树数据
const treeListSel = ref();
const defaultValue = ref();

//请求获取树数据
const getTreeList = async () => {
  let { data } = await getObjTreeApi();
  defaultValue.value = data[0].id;
};

// 获取表格数据
const getTableList = (params: any) => {
  let newParams = { ...params };
  // newParams.page = newParams.pageNum;
  newParams.objectId = params.treeId;
  newParams.itemName = params.keyWords;
  // delete newParams.pageNum;
  delete newParams.treeId;
  delete newParams.keyWords;
  return getInspectionListAllApi(newParams);
};
// const dataCallback = (data: any) => {
//   return {
//     datalist: data.list,
//     total: data.total,
//     pageNum: data.page,
//     pageSize: data.pageSize,
//   };
// };
// 表格配置项
const column = computed<ColumnProps[]>(() => [
  {
    prop: 'itemName',
    label: t('task.itemName'),
  },
]);

interface DialogProps {
  title: string;
  linkageSignalId?: string;
  api?: (params: any) => Promise<any>;
  getTableList?: () => Promise<any>;
}

const props = ref<DialogProps>({
  title: '',
});

// 接收父组件传过来的参数
const acceptParams = (params: DialogProps): void => {
  props.value = params;
  show.value = true;
};

// 提交数据（新增/编辑）
const onConfirm = async (ids: string[], arr: any[]) => {
  console.log('ids:', ids);
  let postParams = {
    linkageSignalId: props.value.linkageSignalId,
    itemIds: ids,
  };
  await props.value.api!(postParams);

  ElMessage.success({ message: `${props.value.title}${t('buttonName.success')}！` });
  props.value.getTableList!();
  show.value = false;
};

defineExpose({
  acceptParams,
});
await getTreeList();
</script>
