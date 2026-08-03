<template>
  <div class="flex-1">
    <kr-card class="flex-1" :header="cardTitle" header-border>
      <kr-pro-table
        style=""
        ref="proTable"
        :columns="columns"
        :requestApi="getTableList"
        :initParam="initParam"
        :dataCallback="dataCallback"
        :searchCol="{ xs: 1, sm: 1, md: 2, lg: 3, xl: 3 }"
        selectId="id"
        title="预置位配置"
        titleBorder
        :outBorder="false"
        colSetAble
      >
        <!-- 表格 header 按钮 -->
        <template #tableHeader="{ selectedListIds }">
          <el-button icon="CirclePlus" type="primary" v-auth="'import'" @click="pageChange('add')">新建</el-button>
          <el-button icon="Upload" type="primary" v-auth="'import'" @click="handleHttpUpload">导入模型</el-button>
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
          <el-button type="primary" v-auth="'edit'" link @click="pageChange('edit', row)">编辑</el-button>
          <el-button type="primary" v-auth="'delete'" link @click="deleteList(row['id'] ? [row['id']] : [])"
            >删除</el-button
          >
        </template>
      </kr-pro-table>
      <ImportExcel ref="importRef"></ImportExcel>
      <addPage :id="id!" :pageType="pageType!" ref="addPageRef" @get-list="() => proTable.getTableList()"></addPage>
    </kr-card>
  </div>
</template>
<script setup lang="ts">
import { ref, reactive, computed, nextTick } from 'vue';
import { useHandleData } from '@/hooks/useHandleData';
import { tableProps } from '@/api/modules/optCenter/aiPatrolManage/inspection';
import { useRoute } from 'vue-router';
import ImportExcel from '@/components/ImportExcel/index.vue';
import {
  Row,
  Search,
  PageType,
  algorithmList,
  algorithmImport,
  algorithmTemplate,
  algorithmDelete,
} from '@/api/modules/optCenter/Almanagement/AIModelManagement';
import addPage from './add.vue';
let cardTitle = computed(() => useRoute().meta?.title!);

const proTable = ref();
const initParam = reactive<Partial<Search>>({});
const columns: tableProps<Row>[] = [
  { type: 'selection', label: '序号', width: 70 },
  { type: 'index', label: '序号', width: 70 },
  {
    prop: 'algorithmName',
    label: '模型名称',
    isShowInputLabel: false,
    search: {
      el: 'input',
      props: { placeholder: '请输入您想搜索的模型名称' },
    },
  },
  {
    prop: 'algorithmCode',
    label: '模型ID',
  },
  /* {
    prop: 'algorithmSkill',
    label: '状态',
  },*/
  {
    prop: 'algorithmVersion',
    label: '版本',
  },
  {
    prop: 'algorithmSkill',
    label: '关联技能',
  },
  {
    prop: 'runtimeEnvironment',
    label: '运行环境',
  },
  {
    prop: 'algorithmUrl',
    label: '算法URL',
  },
  /*{
    prop: 'algorithmPort',
    label: '端口',
  },
   {
    prop: 'executeType',
    label: '创建人',
    filters: getDictForColumnFilters(executeNames),
    enum: executeNames,
  },
  {
    prop: 'taskStartTime',
    label: '创建时间',
    isShowInputLabel: true,
  },*/
  { prop: 'operation', align: 'right', label: '操作', width: 180, fixed: 'right' },
];
const dataCallback = (data: any) => {
  return {
    datalist: data.list,
    total: data.total,
    pageNum: data.page,
    pageSize: data.pageSize,
  };
};
const getTableList = async (params: Search) => {
  let { pageNum, ...searchData } = params;
  searchData.page = pageNum;
  return algorithmList(searchData);
};
const deleteList = async (selectedListIds: string[]) => {
  try {
    await useHandleData<{ ids: string }>(algorithmDelete, { ids: selectedListIds.toString() }, '删除');
    proTable.value.getTableList();
    proTable.value.clearSelection();
  } catch (e) {
    proTable.value.getTableList();
    proTable.value.clearSelection();
  }
};
// tabs
const importRef = ref();
const handleHttpUpload = () => {
  let params = {
    title: '数据',
    tempApi: algorithmTemplate,
    importApi: algorithmImport,
    getTableList: () => {
      proTable.value.getTableList;
    },
  };
  importRef.value.acceptParams(params);
};
//add
let addPageRef = ref();
let id = ref<string>();
let pageType = ref<PageType>();
async function pageChange(pt: PageType, row?: Row) {
  id.value = row?.id;
  pageType.value = pt;
  await nextTick();
  addPageRef.value.openDialog();
}
</script>
<style scoped lang="scss"></style>
