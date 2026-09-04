<template>
  <kr-tree-list-select
    ref="treeListSel"
    :dialog-title="`${props.title}${$t('overHaulArea.object')}`"
    v-model:visible="show"
    :getTreeApi="getSelTreeApi"
    :getListApi="getTableList"
    :defaultValue="defaultValue"
    :column="column"
    :tree-title="$t('overHaulArea.title1')"
    :table-title="$t('overHaulArea.title2')"
    tree-label="name"
    tree-id="id"
    label="name"
    id="code"
    :multiple="true"
    :pagination="false"
    @confirm="onConfirm"
  ></kr-tree-list-select>
</template>

<script setup lang="ts" name="areaSeldialog">
import { ref, computed } from 'vue';
import { ElMessage } from 'element-plus';
import { ColumnProps } from '@patrol/ui';
import { getSelTreeApi, getSelListApi } from '@/api/modules/optCenter/inspectionSet/area';
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
// 弹窗状态
const show = ref(false);
//树数据
const treeListSel = ref();
const defaultValue = ref();

//请求获取树数据
const getTreeList = async () => {
  let { data } = await getSelTreeApi();
  defaultValue.value = data[0]?.id;
};

// 获取表格数据
const getTableList = async (params: any) => {
  let newParams = { ...params };
  newParams.parentId = params.treeId;
  let searchName = params.keyWords;
  delete newParams.treeId;
  delete newParams.keyWords;
  let { data } = await getSelListApi(newParams);
  return new Promise((resolve) => {
    let resultData = [...data];
    if (searchName) {
      resultData = resultData.filter((item) => item.name.includes(searchName));
    }
    resolve({ data: resultData });
  });
};
// 表格配置项
const column = computed<ColumnProps[]>(() => [
  {
    type: 'selection',
    width: 60,
    selectable: (row, index) => {
      return row.isSelect == false;
    },
  },
  {
    prop: 'code',
    label: t('overHaulArea.code'),
  },
  {
    prop: 'name',
    label: t('overHaulArea.name'),
  },
]);

interface DialogProps {
  title: string;
  isView: boolean;
  areaData?: any;
  rowData?: any;
  api?: (params: any) => Promise<any>;
  getTableList?: () => Promise<any>;
}

const props = ref<DialogProps>({
  title: '',
  isView: false,
});

// 接收父组件传过来的参数
const acceptParams = (params: DialogProps): void => {
  props.value = params;
  show.value = true;
};

// 提交数据（新增/编辑）
const onConfirm = async (ids: string[], arr: any[]) => {
  let postParams = {
    areaId: props.value.rowData.areaId,
    objectList: arr.map((item) => {
      return { objectCode: item.code, objectName: item.name };
    }),
  };
  await props.value.api!(postParams);

  ElMessage.success({ message: `${props.value.title}${t('buttonName.success')}！` });
  props.value.getTableList!();
  show.value = false;
};

defineExpose({
  acceptParams,
});
try {
  await getTreeList();
} catch (e) {}
</script>
