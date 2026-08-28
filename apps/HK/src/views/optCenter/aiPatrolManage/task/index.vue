<template>
  <div class="flex-1 task">
    <kr-card class="flex-1" header-border>
      <template #header>
        <div>
          <el-icon @click="openDialogChange('list')" v-if="pageType === 'detail'" class="mr8 page-back">
            <Back />
          </el-icon>
          <span class="title kr-font-medium">{{ cardTitle }}</span>
        </div>
        <div v-auth="'edit'">
          <el-button v-if="pageType === 'detail'" icon="EditPen" @click="$refs.detailRef?.openDialogChange()">{{
            $t('buttonName.edit')
          }}</el-button>
        </div>
      </template>
      <template v-if="pageType === 'list'">
        <myTabs
          style="margin-bottom: 20px"
          v-model="initParam.taskStatus"
          :options="options1"
          buttonType="bottom-line"
        ></myTabs>
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
          showReset
          :outBorder="false"
        >
          <!-- 表格 header 按钮 -->
          <template #tableHeader="{ selectedListIds }">
            <el-button icon="CirclePlus" type="primary" v-auth="'add'" @click="openDialogChange('add')">{{
              $t('inspection.AddInspectionTask')
            }}</el-button>
            <el-button
              v-auth="'enableStop'"
              :disabled="!selectedListIds.length"
              @click="swEnableChange(selectedListIds)"
              >{{ $t('buttonName.on') }}</el-button
            >
            <el-button
              v-auth="'enableStop'"
              :disabled="!selectedListIds.length"
              @click="swStopChange(selectedListIds)"
              >{{ $t('buttonName.off') }}</el-button
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
            <el-button type="primary" link @click="openDialogChange('detail', row)">{{
              $t('buttonName.check')
            }}</el-button>
            <el-button type="primary" v-auth="'edit'" link @click="openDialogChange('edit', row)">{{
              $t('buttonName.edit')
            }}</el-button>
            <el-button type="primary" v-auth="'delete'" link @click="deleteList(row['id'] ? [row['id']] : [])">{{
              $t('ui.delete')
            }}</el-button>
          </template>
        </kr-pro-table>
      </template>
      <detail
        v-else-if="pageType === 'detail'"
        :id="id"
        ref="detailRef"
        :pageType="pageType"
        @openDialogChange="openDialogChange"
      ></detail>
      <addPage
        v-else-if="['add', 'edit'].includes(pageType)"
        ref="addPageRef"
        :id="id"
        :pageType="pageType"
        @openDialogChange="openDialogChange"
      />
    </kr-card>
  </div>
</template>
<script setup lang="tsx">
import { ref, reactive, computed } from 'vue';
import addPage from './add/add.vue';
import myTabs from '@/components/Tabs/index.vue';
import detail from './detail/detail.vue';
import {
  PageType,
  Id,
  searchForm,
  rows,
  stopTaskApi,
  enableTaskApi,
  getTaskListApi,
  deleteTaskApi,
  editStatusTaskApi,
  taskTypeSelectApi,
  PageTypeTitle,
} from '@/api/modules/optCenter/aiPatrolManage/task';
import { useHandleData } from '@patrol/shared/hooks/useHandleData';
import { tableProps } from '@/api/modules/optCenter/aiPatrolManage/inspection';
import { getDict, getDictForColumnFilters } from '@/utils/serviceDict';
import { ElMessage } from 'element-plus';
import { useRoute } from 'vue-router';
import { AuthStore } from '@/stores/modules/auth';
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
const authStore = AuthStore();
const currentPageRoles = authStore.authButtonListGet[authStore.routeName] ?? [];
const swAuth: string = 'enableStop';
const swAuthShow = ref<boolean>(false);
if (!currentPageRoles.includes(swAuth)) {
  swAuthShow.value = true;
}
let cardTitle = computed(() =>
  pageType.value === 'list' ? useRoute().meta?.title! : t(PageTypeTitle[pageType.value])
);
const executeNames = (await getDict('task_execute_type')) as { label: string; value: string; remark: string }[];
const taskTypeSelectNames = ((await taskTypeSelectApi()).data as any[]).map((i: any) => ({
  label: i.taskType,
  value: i.id,
  remark: '',
}));
let pageType = ref<PageType>('list');
const proTable = ref();
const initParam = reactive<Partial<searchForm>>({ taskStatus: 'bc', selectProp: 'taskPlanName' });
const columns = computed<tableProps<rows>[]>(() => [
  { type: 'selection', label: t('table.sort'), width: 70 },
  { type: 'index', label: t('table.sort'), width: 70 },
  {
    prop: 'taskPlanName',
    label: t('aiInspection.inspectionTaskName'),
    isShowInputLabel: false,
    search: {
      el: 'input',
      key: 'def',
      render(attr) {
        // console.log(searchData);
        return (
          <el-input {...attr}>
            {{
              prepend: () => {
                return (
                  <el-select class={'input-prepend-select'} v-model={initParam.selectProp} style={'width: 140px'}>
                    <el-option label={t('aiInspection.inspectionTaskName')} value={'taskPlanName'} />
                    <el-option label={t('aiInspection.areaName')} value={'areaName'} />
                    <el-option label={t('aiInspection.objectName')} value={'objectName'} />
                  </el-select>
                );
              },
            }}
          </el-input>
        );
      },
    },
  },
  {
    prop: 'taskType',
    label: t('aiInspection.taskTypeName'),
    filterMultiple: false,
    filters: getDictForColumnFilters(taskTypeSelectNames),
    enum: taskTypeSelectNames,
    minWidth: 100,
  },
  {
    prop: 'areaName',
    label: t('aiInspection.areaName'),
    minWidth: 200,
  },
  {
    prop: 'objectName',
    label: t('aiInspection.objectName'),
    minWidth: 200,
  },
  {
    prop: 'orgName',
    label: t('common.orgName'),
  },
  {
    prop: 'executeType',
    label: t('aiInspection.executeTypeName'),
    filters: getDictForColumnFilters(executeNames),
    enum: executeNames,
  },
  {
    prop: 'taskStartTime',
    label: t('aiInspection.taskStartTime2'),
    isShowInputLabel: true,
    search: {
      el: 'date-picker',
      props: {
        type: 'datetimerange',
        valueFormat: 'YYYY-MM-DD HH:mm',
        format: 'YYYY-MM-DD HH:mm',
        timeFormat: 'HH:mm',
      },
    },
  },
  {
    prop: 'taskStatus',
    label: t('aiInspection.taskStatus'),
    render(scope) {
      return (
        <>
          <el-switch
            v-auth={'enableStop'}
            v-model={scope.row.taskStatus}
            active-value={1}
            inactive-value={0}
            onChange={() => switchChange(scope.row.id)}
          />
          {swAuthShow.value ? (
            <el-switch
              disabled={swAuthShow.value}
              v-model={scope.row.taskStatus}
              active-value={1}
              inactive-value={0}
              onChange={() => switchChange(scope.row.id)}
            />
          ) : (
            <span></span>
          )}
        </>
      );
    },
  },
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
const getTableList = async (params: any) => {
  let { pageNum, taskStartTime, def, selectProp, taskStatus, ...searchData } = params;
  searchData.page = pageNum;
  if (taskStartTime) searchData.publishStartTime = taskStartTime[0];
  if (taskStartTime) searchData.publishEndTime = taskStartTime[1];
  if (def) searchData[selectProp] = def;
  searchData.taskStatus = taskStatus !== 'bc' ? taskStatus : undefined;
  return getTaskListApi(searchData);
};
const deleteList = async (selectedListIds: string[]) => {
  try {
    await useHandleData<{ ids: string }>(deleteTaskApi, { ids: selectedListIds.toString() }, t('ui.delete'));
    proTable.value.getTableList();
    proTable.value.clearSelection();
  } catch (e) {}
};
const swStopChange = async (selectedListIds: string[]) => {
  try {
    let { description } = await stopTaskApi({ ids: selectedListIds.toString() });
    proTable.value.getTableList();
    proTable.value.clearSelection();
    ElMessage.success(description);
  } catch (e) {}
};
const swEnableChange = async (selectedListIds: string[]) => {
  try {
    let { description } = await enableTaskApi({ ids: selectedListIds.toString() });
    proTable.value.getTableList();
    proTable.value.clearSelection();
    ElMessage.success(description);
  } catch (e) {}
};
const switchChange = async (id: string) => {
  try {
    if (id) {
      await editStatusTaskApi({ id: id });
      proTable.value.getTableList();
    }
  } catch (e) {}
};
// 新增
const addPageRef = ref();
let id = ref<Id>();
function openDialogChange(page: PageType, row?: rows) {
  pageType.value = page;
  if (page !== 'add') id.value = row ? row.id : '';
}
// tabs
const options1 = [
  { label: t('worktop.All'), value: 'bc' },
  { label: t('buttonName.on'), value: '1' },
  { label: t('buttonName.off'), value: '0' },
];
</script>
<style scoped lang="scss">
.task {
  :deep(.kr-card__header) {
    height: 57px;
  }
}
</style>
