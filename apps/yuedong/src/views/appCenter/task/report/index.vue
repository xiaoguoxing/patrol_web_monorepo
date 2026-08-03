<template>
  <kr-card class="flex-1" header-border>
    <template #header>
      <div>
        <el-icon @click="toDetailPage('list')" v-if="pageType === 'detail'" class="mr8 page-back">
          <Back />
        </el-icon>
        <span class="title kr-font-medium">{{ cardTitle }}</span>
      </div>
      <el-button v-if="pageType === 'detail'" id="Box" @click="exportFile">导出报告</el-button>
    </template>
    <div v-show="pageType === 'list'" class="flex-1">
      <kr-pro-table
        ref="proTable"
        :columns="columns"
        :requestApi="getTableList"
        :dataCallback="dataCallback"
        :initParam="initParam"
        :searchCol="{ xs: 1, sm: 1, md: 2, lg: 3, xl: 3 }"
        selectId="code"
        titleBorder
        :outBorder="false"
        :showMicrophone="false"
        :showReset="true"
        :colSetAble="false"
        :operationBtn="false"
      >
        <!-- 表格操作 -->
        <template #operation="{ row }">
          <el-button type="primary" link @click="toDetailPage('detail', row)">详情</el-button>
        </template>
        <template #orgNameHeader>
          <span class="kr-font-medium" style="font-size: 16px" :class="!checkListCode ? '' : 'checkColor'"
            >所属组织</span
          >
          <el-popover
            ref="orgPopover"
            placement="bottom"
            popper-class="is-pure el-table-filter"
            trigger="click"
            :offset="2"
            :show-arrow="false"
            @before-leave="showOrg = false"
          >
            <template #reference>
              <span
                class="el-table__column-filter-trigger el-none-outline el-tooltip__trigger el-tooltip__trigger"
                @click="showOrg = !showOrg"
              >
                <el-icon v-if="showOrg"><ArrowUp /></el-icon>
                <el-icon v-else><ArrowDown /></el-icon>
              </span>
            </template>
            <template #default>
              <div>
                <div class="orgTree el-table-filter__content">
                  <el-scrollbar wrap-class="el-table-filter__wrap" view-class="pt10 pb10">
                    <el-tree
                      ref="treeRef"
                      node-key="id"
                      :data="orgList"
                      :show-checkbox="true"
                      :check-strictly="true"
                      :highlight-current="true"
                      :props="defaultProps"
                      :expand-on-click-node="false"
                      :check-on-click-node="true"
                      @check="handleCheckChange"
                    ></el-tree>
                  </el-scrollbar>
                </div>
                <div class="orgBtn el-table-filter__bottom">
                  <el-button link :disabled="!checkListCode" @click="searchOrg">筛选</el-button>
                  <el-button link @click="resetOrgData">重置</el-button>
                </div>
              </div>
            </template>
          </el-popover>
        </template>
      </kr-pro-table>
    </div>
    <addPage
      v-if="pageType === 'detail'"
      ref="addPageRef"
      :id="id"
      v-model:pageType="pageType"
      :taskTypeSelectNames="taskTypeSelectNames"
      :inspection_conclusion="inspection_conclusion"
      @toDetailPage="toDetailPage"
    />
  </kr-card>
</template>
<script setup lang="tsx">
import { ref, reactive, computed, onMounted } from 'vue';
import addPage from './detail.vue';
import {
  PageType,
  id,
  ReportListParams,
  ReportListRows,
  getReportListApi,
  PageTypeTitle,
  getReportExportApi,
} from '@/api/modules/appCenter/task/report';
import { tableProps } from '@/api/modules/optCenter/aiPatrolManage/inspection';
import { useRoute, useRouter } from 'vue-router';
import { orgTree, taskTypeSelectApi, OrgTree } from '@/api/modules/optCenter/aiPatrolManage/task';
import { getDict, getDictForColumnFilters } from '@/utils/serviceDict';
import { getDataURL } from '@/utils/util';
import { useRemoveURLObject } from '@optCenter/hooks/use-file-utils';
import { GlobalStore } from '@/stores';
const globalStore = GlobalStore();
const node_env = import.meta.env.VITE_USER_NODE_ENV;
type Option = {
  label: string;
  value: string;
  remark: string;
};
const taskTypeSelectNames = ((await taskTypeSelectApi()).data as any[]).map((i: any) => ({
  label: i.taskType,
  value: i.id,
  remark: '',
}));
const inspectionNames = (await getDict('inspection_way')) as Option[];
const inspection_conclusion = (await getDict('inspection_conclusion')) as Option[];
const orgList = (await orgTree()).data;
// 列查询
let treeRef = ref();
let orgPopover = ref();
const defaultProps = {
  children: 'children',
  label: 'name',
};
let showOrg = ref(false);
let checkList = ref<string[]>([]);
let checkListCode = computed(() => checkList.value.toString());
function handleCheckChange(node: OrgTree, checkData: { checkedKeys: string[] }) {
  checkList.value = checkData.checkedKeys;
}
function searchOrg() {
  proTable.value.getTableList();
  orgPopover.value.hide();
}
function resetOrgData() {
  treeRef.value.setCheckedKeys([], false);
  checkList.value = [];
  proTable.value.getTableList();
  orgPopover.value.hide();
}

const route = useRoute();
const router = useRouter();
let pageType = ref<PageType>('list');
let cardTitle = computed(() => (pageType.value === 'list' ? route.meta?.title! : PageTypeTitle[pageType.value]));

onMounted(() => {
  if (route.query.id) {
    route.query.syncData = eval(route.query.syncData as string);
    toDetailPage('detail', route.query as unknown as ReportListRows);
  }
});

const proTable = ref();
const initParam = reactive<Partial<ReportListParams>>({ selectProp: 'taskName' });
const columns: tableProps<ReportListRows>[] = [
  { type: 'index', label: '序号', width: 70 },
  {
    prop: 'inspectionTaskName',
    label: '任务名称',
    isShowInputLabel: false,
    width: 250,
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
                    <el-option label="巡检任务名称" value={'taskName'} />
                    <el-option label="所属组织" value={'orgName'} />
                    <el-option label="巡检区域" value={'areaName'} />
                    <el-option label="巡检对象" value={'objectName'} />
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
    prop: 'orgName',
    label: '所属组织',
  },
  {
    prop: 'taskType',
    label: '任务类型',
    filters: getDictForColumnFilters(taskTypeSelectNames),
    enum: taskTypeSelectNames,
  },
  {
    prop: 'inspectionModel',
    label: '巡检模式',
    filters: getDictForColumnFilters(inspectionNames),
    enum: inspectionNames,
  },
  {
    prop: 'areaName',
    label: '巡检区域',
  },
  {
    prop: 'objectName',
    label: '巡检对象名称',
  },
  {
    prop: 'itemNum',
    label: '巡检项数量',
  },
  {
    prop: 'abnormalNum',
    label: '告警项数量',
  },
  {
    prop: 'taskStartTime',
    label: '任务开始时间',
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
    prop: 'taskUseTime',
    label: '任务执行时长',
  },
  { prop: 'operation', align: 'right', label: '操作', width: 180, fixed: 'right' },
];
const dataCallback = (data: any) => {
  return {
    datalist: data.list.map((i: ReportListRows) => {
      i.taskUseTime = ((i.taskUseTime as unknown as number) / 60).toFixed(2) + '分钟';
      return i;
    }),
    total: data.total,
    pageNum: data.page,
    pageSize: data.pageSize,
  };
};
const getTableList = (params: any) => {
  let { pageNum, selectProp, taskStartTime, def, ...searchData } = params;
  searchData.page = pageNum;
  if (taskStartTime) searchData.startTime = taskStartTime[0];
  if (taskStartTime) searchData.endTime = taskStartTime[1];
  if (def) searchData[selectProp] = def;
  if (checkListCode.value) searchData.orgCodes = checkListCode.value;
  return getReportListApi(searchData, !!route.query.id);
};
// 新增
const addPageRef = ref();
const itemName = ref('');
let id = ref<id>('');
function toDetailPage(page: PageType, row?: ReportListRows) {
  id.value = row?.id!;
  if (row?.syncData) {
    // if (false) {
    let baseUrl = serviceConfig[node_env].VITE_SYS_URL;
    window.open(
      `${baseUrl}/#/patrolInspection/appCenter/appCenterTask/taskReport?token=${globalStore.token}&id=${id.value}`,
      '_blank'
    );
  } else {
    pageType.value = page;
    itemName.value = row?.inspectionTaskName!;
  }
  if (route.query.id) {
    router.push({
      path: route.path,
      query: {},
    });
  }
}
let urls = useRemoveURLObject();
async function exportFile() {
  let res = await getReportExportApi(id.value!);
  let { blobUrl: res1 } = await getDataURL(res as unknown as Blob, 'application/pdf');
  let a = document.createElement('a');
  a.href = res1;
  urls.add(res1);
  a.download = addPageRef.value.formData.inspectionTaskName || '任务报告';
  a.click();
}
</script>
<style scoped lang="scss">
:deep(.kr-card__header) {
  height: 57px;
}
:deep(.kr-card__body) {
  overflow: auto;
  scroll-behavior: smooth;
}
.checkColor {
  color: var(--el-color-primary);
}
</style>
