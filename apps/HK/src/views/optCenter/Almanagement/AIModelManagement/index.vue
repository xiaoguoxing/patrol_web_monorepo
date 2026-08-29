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
          <el-button icon="CirclePlus" type="primary" v-auth="'import'" @click="pageChange('add')">{{
            $t('buttonName.add')
          }}</el-button>
          <el-button icon="Upload" type="primary" v-auth="'import'" @click="handleHttpUpload">{{
            $t('model.exportModel')
          }}</el-button>
          <el-button
            icon="Delete"
            v-auth="'delete'"
            :disabled="!selectedListIds.length"
            @click="deleteList(selectedListIds)"
            >{{ $t('ui.delete') }}</el-button
          >
        </template>
        <!-- 表格操作 -->
        <template #operation="{ row }">
          <el-button type="primary" v-auth="'edit'" link @click="pageChange('edit', row)">{{
            $t('buttonName.edit')
          }}</el-button>
          <el-button type="primary" v-auth="'delete'" link @click="deleteList(row['id'] ? [row['id']] : [])">{{
            $t('ui.delete')
          }}</el-button>
        </template>
      </kr-pro-table>
      <ImportExcel ref="importRef"></ImportExcel>
      <addPage :id="id!" :pageType="pageType!" ref="addPageRef" @get-list="() => proTable.getTableList()"></addPage>
    </kr-card>
  </div>
</template>
<script setup lang="ts">
import { ref, reactive, computed, nextTick } from 'vue';
import { useHandleData } from '@patrol/shared/hooks/useHandleData';
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
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
const proTable = ref();
const initParam = reactive<Partial<Search>>({});
const columns = computed<tableProps<Row>[]>(() => [
  { type: 'selection', label: t('table.sort'), width: 70 },
  { type: 'index', label: t('table.sort'), width: 70 },
  {
    prop: 'algorithmName',
    label: t('model.algorithmName'),
    isShowInputLabel: false,
    search: {
      el: 'input',
      props: { placeholder: t('model.exportModelPlaceholder') },
    },
  },
  {
    prop: 'algorithmCode',
    label: t('model.algorithmCode'),
  },
  /* {
    prop: 'algorithmSkill',
    label: '状态',
  },*/
  {
    prop: 'algorithmVersion',
    label: t('model.algorithmVersion'),
  },
  {
    prop: 'algorithmSkill',
    label: t('linkageSet.relatedSkills'),
  },
  {
    prop: 'runtimeEnvironment',
    label: t('model.runtimeEnvironment'),
  },
  {
    prop: 'algorithmUrl',
    label: t('model.algorithmUrl'),
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
  { prop: 'operation', align: 'right', label: t('table.operation'), width: 180, fixed: 'right' },
]);
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
    await useHandleData<{ ids: string }>(algorithmDelete, { ids: selectedListIds.toString() }, t('ui.delete'));
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
    title: t('linkageSet.data'),
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
