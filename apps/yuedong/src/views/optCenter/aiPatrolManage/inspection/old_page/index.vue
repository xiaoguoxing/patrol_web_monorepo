<template>
  <div class="flex-1">
    <kr-card class="flex-1 two-col-page" header="巡检项配置" header-border>
      <kr-filter-tree
        class="two-col-page-lf"
        label="nodeName"
        v-dragLine
        :data="dataSource"
        placeholder="请输入您想搜索的巡检对象名称"
        @change="changeTreeFilter"
        :defaultValue="defaultValue"
      />
      <kr-pro-table
        ref="proTable"
        :columns="columns"
        :requestApi="getTableList"
        :dataCallback="dataCallback"
        :initParam="initParam"
        :searchCol="{ xs: 1, sm: 1, md: 2, lg: 3, xl: 3 }"
        selectId="id"
        title="预置位配置"
        titleBorder
        :outBorder="false"
        colSetAble
      >
        <!-- 表格 header 按钮 -->
        <template #tableHeader="{ selectedListIds }">
          <el-button
            v-auth="'add'"
            icon="CirclePlus"
            :disabled="currentCameraTreeNode?.nodeType !== 3"
            type="primary"
            @click="openDialogChange('add')"
            >新建巡检项</el-button
          >
          <el-button
            icon="Delete"
            v-auth="'delete'"
            :disabled="!selectedListIds.length"
            @click="deleteList(selectedListIds)"
            >删除</el-button
          >
        </template>
        <!-- 表格操作 -->
        <template #operation="{ row }">
          <el-button type="primary" link @click="openDialogChange('detail', row)">查看</el-button>
          <el-button type="primary" link v-auth="'edit'" @click="openDialogChange('edit', row)">编辑</el-button>
          <el-button type="primary" link v-auth="'delete'" @click="deleteList([row['id']])">删除</el-button>
        </template>
      </kr-pro-table>
      <addPage
        ref="addPageRef"
        :objectId="currentCameraTreeNode?.id!"
        :id="id"
        @openDialogChange="openDialogChange"
        :pageType="pageType!"
      />
    </kr-card>
  </div>
</template>
<script setup lang="ts">
import { ref, reactive } from 'vue';
import addPage from './add.vue';
import { useHandleData } from '@/hooks/useHandleData';
import {
  deleteInspectionApi,
  getInspectionListApi,
  getTreeApi,
} from '@/api/modules/optCenter/aiPatrolManage/inspection';
import type {
  Tree,
  Id,
  PageType,
  rows,
  searchParams,
  tableProps,
} from '@/api/modules/optCenter/aiPatrolManage/inspection';
import { getDict, getDictForColumnFilters } from '@/utils/serviceDict';
import { treeFirst } from '@/api/modules/optCenter/aiPatrolManage/position';
// 树操作
const dataSource = ref<Tree[]>([]);
const currentCameraTreeNode = ref<Tree>();
const defaultValue = ref<string>();
const getTreeList = async () => {
  let { data } = await getTreeApi();
  dataSource.value = data;
  defaultValue.value = treeFirst(data)?.id || '';
  currentCameraTreeNode.value = treeFirst(data) as Tree;
};
await getTreeList();
const changeTreeFilter = (val: string, node: Tree) => {
  proTable.value.pageable.pageNum = 1;
  initParam.objectId = val;
  currentCameraTreeNode.value = node;
};
const cameraTypeNames = (await getDict('camera_type')) as { label: string; value: string; remark: string }[];
// 表格配置项
const proTable = ref();
const initParam = reactive<Partial<searchParams>>({ objectId: defaultValue.value });
const dataCallback = (data: any) => {
  return {
    datalist: data.list,
    total: data.total,
    pageNum: data.page,
    pageSize: data.pageSize,
  };
};
const columns: tableProps<rows>[] = [
  { type: 'selection', label: '序号', width: 70 },
  { type: 'index', label: '序号', width: 70 },
  {
    prop: 'itemName',
    label: '巡检项名称',
    isShowInputLabel: false,
    search: {
      el: 'input',
      props: { placeholder: '请输入您想搜索的巡检项名称' },
    },
    minWidth: 200,
  },
  {
    prop: 'cameraName',
    label: '监控设备名称',
    minWidth: 200,
  },
  {
    prop: 'cameraType',
    label: '监控设备类型',
    filters: getDictForColumnFilters(cameraTypeNames),
    enum: cameraTypeNames,
    minWidth: 200,
  },
  {
    prop: 'presetPositionName',
    label: '关联预置位名称',
    minWidth: 200,
  },
  {
    prop: 'relatedSkillsName',
    label: '关联技能',
    minWidth: 200,
  },
  { prop: 'operation', align: 'right', label: '操作', width: 180, fixed: 'right' },
];
const getTableList = async (params: any) => {
  let { pageNum, ...searchData } = params;
  searchData.page = pageNum;
  return getInspectionListApi(searchData);
};
const deleteList = async (selectedListIds: string[]) => {
  try {
    await useHandleData<{ ids: string }>(deleteInspectionApi, { ids: selectedListIds.toString() }, '删除');
    proTable.value.getTableList();
  } catch (e) {}
};
// 弹框
const addPageRef = ref();
const id = ref<Id>();
const pageType = ref<PageType>();
function openDialogChange(page: PageType, row?: rows) {
  if (page !== 'list') id.value = row ? row.id : '';
  pageType.value = page;
  if (page === 'list') {
    proTable.value.getTableList();
  } else {
    addPageRef.value.openDialog();
  }
}
</script>
<style scoped></style>
