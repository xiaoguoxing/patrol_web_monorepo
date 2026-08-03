<template>
  <kr-tree-list-select
    ref="treeListSel"
    :dialog-title="`${props.title}巡检对象`"
    v-model:visible="show"
    :getTreeApi="getSelTreeApi"
    :getListApi="getTableList"
    :defaultValue="defaultValue"
    :column="column"
    tree-title="生产设备台账"
    table-title="生产设备列表"
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
import { ref } from 'vue';
import { ElMessage } from 'element-plus';
import { ColumnProps } from '@/components/znxj-components/znxj-ui';
import { getSelTreeApi, getSelListApi } from '@/api/modules/optCenter/inspectionSet/area';

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
const column: ColumnProps[] = [
  {
    type: 'selection',
    width: 60,
    selectable: (row, index) => {
      return row.isSelect == false;
    },
  },
  {
    prop: 'code',
    label: '生产设备编号',
  },
  {
    prop: 'name',
    label: '生产设备名称',
  },
];

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

  ElMessage.success({ message: `${props.value.title}成功！` });
  props.value.getTableList!();
  show.value = false;
};

defineExpose({
  acceptParams,
});
await getTreeList();
</script>
