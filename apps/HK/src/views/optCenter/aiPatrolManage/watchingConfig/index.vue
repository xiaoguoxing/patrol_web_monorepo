<template>
  <kr-card class="flex-1 two-col-page" :header="cardTitle" header-border>
    <kr-filter-tree
      v-show="pageType === 'list'"
      class="two-col-page-lf"
      label="nodeName"
      v-dragLine
      :data="dataSource"
      :placeholder="$t('alarm.placeholder')"
      @change="changeTreeFilter"
      :defaultValue="defaultValue"
    />
    <kr-pro-table
      v-show="pageType === 'list'"
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
      @resetFn="resetFn"
    >
      <!-- 表格 header 按钮 -->
      <template #tableHeader="{ selectedListIds }">
        <el-button
          icon="CirclePlus"
          v-auth="'add'"
          :disabled="currentCameraTreeNode?.nodeType !== 3"
          type="primary"
          @click="openDialogChange('add')"
          >{{ $t('linkageSet.relatedSkills') }}</el-button
        >
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
        <!--        <el-button type="primary" link @click="openDialogChange('detail', row)">查看</el-button>-->
        <el-button v-auth="'edit'" type="primary" link @click="openDialogChange('edit', row)">{{
          $t('buttonName.edit')
        }}</el-button>
        <el-button v-auth="'delete'" type="primary" link @click="deleteList([row['id']])">{{
          $t('ui.delete')
        }}</el-button>
      </template>
      <template #monitorStatus="{ row }">
        <el-switch
          v-model="row.monitorStatus"
          :active-value="1"
          :inactive-value="0"
          @change="() => switchChange(row.id)"
        />
      </template>
      <template #orgNameHeader>
        <OrgNameHeaderSearch
          ref="OrgNameHeaderSearchRef"
          v-model="checkListCode"
          @search="proTable.getTableList()"
        ></OrgNameHeaderSearch>
      </template>
    </kr-pro-table>
    <addPage
      v-if="['add', 'edit', 'detail'].includes(pageType)"
      ref="addPageRef"
      :id="id"
      @pageChange="openDialogChange"
      @reSearch="reSearch"
      :camera-id="cameraId ?? ''"
      :pageType="pageType"
    />
  </kr-card>
</template>
<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import addPage from './add.vue';
import {
  Id,
  PageType,
  searchForm,
  rows,
  PageTypeTitle,
  getWatchingListApi,
  deleteWatchingApi,
  editStatusTaskApi,
} from '@/api/modules/optCenter/aiPatrolManage/watching';
import { useHandleData } from '@patrol/shared/hooks/useHandleData';
import { tableProps } from '@/api/modules/optCenter/aiPatrolManage/inspection';
import { treeFirst } from '@/api/modules/optCenter/aiPatrolManage/position';
import { getCameraTreeApi, Tree } from '@/api/modules/camera';
import { useRoute } from 'vue-router';
import { ElMessage } from 'element-plus';
import OrgNameHeaderSearch from '@/views/appCenter/alarm/orgNameHeaderSearch.vue';
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
const route = useRoute();
let cardTitle = computed(() => (pageType.value === 'list' ? route.meta?.title! : t(PageTypeTitle[pageType.value])));
// 树操作
const dataSource = ref<Tree[]>([]);
const currentCameraTreeNode = ref<Tree>();
const defaultValue = ref<string>();
const getTreeList = async () => {
  let { data } = await getCameraTreeApi();
  dataSource.value = data;
  defaultValue.value = treeFirst(data)?.id || '';
  currentCameraTreeNode.value = treeFirst(data) as Tree;
};
await getTreeList();
const changeTreeFilter = (val: string, node: Tree) => {
  proTable.value.pageable.pageNum = 1;
  initParam.cameraId = val;
  currentCameraTreeNode.value = node;
};

// 表格配置项
const proTable = ref();
const initParam = reactive<Partial<searchForm>>({ cameraId: defaultValue.value });
const columns: tableProps<rows>[] = [
  { type: 'selection', label: t('table.sort'), width: 70 },
  { type: 'index', label: t('table.sort'), width: 70 },
  {
    prop: 'orgName',
    label: t('common.orgName'),
    minWidth: 100,
  },
  {
    prop: 'areaName',
    label: t('aiInspection.areaName'),
    minWidth: 100,
  },
  {
    prop: 'cameraName',
    label: t('linkageSet.cameraName'),
    minWidth: 100,
  },
  {
    prop: 'relatedSkillsName',
    label: t('model.algorithmName2'),
    isShowInputLabel: false,
    search: {
      el: 'input',
      props: { placeholder: t('model.exportModelPlaceholder2') },
    },
    minWidth: 200,
  },
  {
    prop: 'alarmStatusName',
    label: t('alarm.alarmRules'),
    minWidth: 200,
  },
  {
    prop: 'monitorStatus',
    label: t('camera.monitorStatus'),
    showOverflowTooltip: false,
    minWidth: 200,
  },
  { prop: 'operation', align: 'right', label: t('table.operation'), width: 150, fixed: 'right' },
];
let checkListCode = ref('');
const dataCallback = (data: any) => {
  return {
    datalist: data.list,
    total: data.total,
    pageNum: data.page,
    pageSize: data.pageSize,
  };
};
const getTableList = async (params: any) => {
  let { pageNum, ...searchData } = params;
  searchData.page = pageNum;
  if (checkListCode.value) searchData.orgCodes = checkListCode.value;
  return getWatchingListApi(searchData);
};
const deleteList = async (selectedListIds: string[]) => {
  try {
    await useHandleData<{ ids: string }>(deleteWatchingApi, { ids: selectedListIds.toString() }, t('ui.delete'));
    proTable.value.clearSelection();
    proTable.value.getTableList();
  } catch (e) {
    proTable.value.clearSelection();
    proTable.value.getTableList();
  }
};
async function switchChange(id: string) {
  try {
    if (id) {
      let { description } = await editStatusTaskApi({ id });
      ElMessage.success(description);
      proTable.value.getTableList();
    }
  } catch (e) {}
}
// 弹框
const id = ref<Id>();
const cameraId = ref<Id>();
const pageType = ref<PageType>('list');
const addPageRef = ref();
function reSearch() {
  proTable.value.getTableList();
}
function openDialogChange(page: PageType, row?: rows) {
  id.value = row ? row.id : '';
  cameraId.value = row ? row.cameraId : currentCameraTreeNode.value?.id;
  pageType.value = page;
}

const OrgNameHeaderSearchRef = ref();
const resetFn = () => {
  OrgNameHeaderSearchRef.value?.resetOrgData(false);
};
</script>
<style scoped></style>
