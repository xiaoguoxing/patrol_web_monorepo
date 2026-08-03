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
          <el-button v-if="pageType === 'detail'" icon="EditPen" @click="$refs.detailRef?.openDialogChange()"
            >编辑</el-button
          >
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
          colSetAble
        >
          <!-- 表格 header 按钮 -->
          <template #tableHeader="{ selectedListIds }">
            <el-button icon="CirclePlus" type="primary" v-auth="'add'" @click="openDialogChange('add')"
              >新建巡检任务</el-button
            >
            <el-button
              v-auth="'enableStop'"
              :disabled="!selectedListIds.length"
              @click="swEnableChange(selectedListIds)"
              >启用</el-button
            >
            <el-button v-auth="'enableStop'" :disabled="!selectedListIds.length" @click="swStopChange(selectedListIds)"
              >禁用</el-button
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
            <el-button type="primary" v-auth="'edit'" link @click="openDialogChange('edit', row)">编辑</el-button>
            <el-button type="primary" v-auth="'delete'" link @click="deleteList(row['id'] ? [row['id']] : [])"
              >删除</el-button
            >
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
import { useHandleData } from '@/hooks/useHandleData';
import { tableProps } from '@/api/modules/optCenter/aiPatrolManage/inspection';
import { getDict, getDictForColumnFilters } from '@/utils/serviceDict';
import { ElMessage } from 'element-plus';
import { useRoute } from 'vue-router';
import { AuthStore } from '@/stores/modules/auth';
const authStore = AuthStore();
const currentPageRoles = authStore.authButtonListGet[authStore.routeName] ?? [];
const swAuth: string = 'enableStop';
const swAuthShow = ref<boolean>(false);
if (!currentPageRoles.includes(swAuth)) {
  swAuthShow.value = true;
}
let cardTitle = computed(() => (pageType.value === 'list' ? useRoute().meta?.title! : PageTypeTitle[pageType.value]));
const executeNames = (await getDict('task_execute_type')) as { label: string; value: string; remark: string }[];
const taskTypeSelectNames = ((await taskTypeSelectApi()).data as any[]).map((i: any) => ({
  label: i.taskType,
  value: i.id,
  remark: '',
}));
let pageType = ref<PageType>('list');
const proTable = ref();
const initParam = reactive<Partial<searchForm>>({ taskStatus: 'bc', selectProp: 'taskPlanName' });
const columns: tableProps<rows>[] = [
  { type: 'selection', label: '序号', width: 70 },
  { type: 'index', label: '序号', width: 70 },
  {
    prop: 'taskPlanName',
    label: '任务名称',
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
                    <el-option label="任务名称" value={'taskPlanName'} />
                    <el-option label="巡检区域" value={'areaName'} />
                    <el-option label="巡检对象名称" value={'objectName'} />
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
    label: '任务类型',
    filterMultiple: false,
    filters: getDictForColumnFilters(taskTypeSelectNames),
    enum: taskTypeSelectNames,
    minWidth: 100,
  },
  {
    prop: 'areaName',
    label: '巡检区域',
    minWidth: 200,
  },
  {
    prop: 'objectName',
    label: '巡检对象名称',
    minWidth: 200,
  },
  {
    prop: 'orgName',
    label: '所属组织',
  },
  {
    prop: 'executeType',
    label: '任务执行类型',
    filters: getDictForColumnFilters(executeNames),
    enum: executeNames,
  },
  {
    prop: 'taskStartTime',
    label: '任务发布时间',
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
    label: '任务状态',
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
    await useHandleData<{ ids: string }>(deleteTaskApi, { ids: selectedListIds.toString() }, '删除');
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
  { label: '全部', value: 'bc' },
  { label: '启用', value: '1' },
  { label: '禁用', value: '0' },
];
</script>
<style scoped lang="scss">
.task {
  :deep(.kr-card__header) {
    height: 57px;
  }
}
</style>
