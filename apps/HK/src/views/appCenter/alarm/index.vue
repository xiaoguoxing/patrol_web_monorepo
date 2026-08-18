<template>
  <kr-card class="flex-1 two-col-page alarm-card-main" header-border>
    <template #header>
      <div>
        <el-icon @click="toDetailPage('list', {})" v-if="pageType === 'detail'" class="mr8 page-back"><Back /></el-icon>
        <span class="title kr-font-medium">{{ cardTitle }}</span>
      </div>
      <div v-if="id" :title="`${globalIndex + 1}/${proTable.pageable.total}`">
        <el-button :disabled="isFirstItem" link type="primary" @click="prev">上一项</el-button>
        <el-button :disabled="isLastItem" link type="primary" @click="next">下一项</el-button>
      </div>
    </template>
    <kr-filter-tree
      v-show="pageType === 'list'"
      class="two-col-page-lf"
      v-dragLine
      placeholder="请输入您想搜索的巡检对象名称"
      :data="dataSource"
      label="nodeName"
      :dea="false"
      @change="changeTreeFilter"
      :defaultValue="defaultValue"
    />
    <kr-pro-table
      v-show="pageType === 'list'"
      ref="proTable"
      :columns="columns"
      :dataCallback="dataCallback"
      :requestApi="getTableList"
      :initParam="initParam"
      :searchCol="{ xs: 1, sm: 1, md: 2, lg: 3, xl: 3 }"
      selectId="id"
      title="预置位配置"
      titleBorder
      showReset
      :outBorder="false"
      :colSetAble="true"
      :operationBtn="true"
      @resetFn="resetFn"
    >
      <template #tableHeader="{ selectedListIds }">
        <!--   v-auth="'export'"     -->
        <el-button icon="Download" v-auth="'export'" @click="exportList(selectedListIds)">导出</el-button>
        <el-button icon="" type="primary" v-auth="'yjxj'" @click="yjxjList">一键消警</el-button>
      </template>
      <!-- 表格操作 -->
      <template #operation="{ row }">
        <el-button type="primary" link @click="toDetailPage('detail', row)">详情</el-button>
        <el-button
          v-if="!row.isReport"
          type="primary"
          :disabled="row.syncData"
          :title="row.syncData ? '同步的数据不支持此操作' : ''"
          v-auth="'reportingDeficiencies'"
          link
          @click="openUploadDialog(row)"
          >报缺</el-button
        >
      </template>
      <template #orgNameHeader>
        <OrgNameHeaderSearch
          ref="OrgNameHeaderSearchRef"
          v-model="checkListCode"
          @search="proTable.getTableList()"
        ></OrgNameHeaderSearch>
      </template>
    </kr-pro-table>
    <template v-if="pageType === 'detail'">
      <detailPage
        :id="id ?? ''"
        v-model:pageType="pageType"
        :alarm_level="alarm_level"
        :alarm_type="alarm_type"
        :alarm_status="alarm_status"
        :inspection_conclusion="inspection_conclusion"
        :alarm_source="alarm_source"
      ></detailPage>
    </template>
    <template v-else-if="pageType === 'reportingDeficiencies'">
      <reportingDeficienciesPage
        :id="id ?? ''"
        v-model:pageType="pageType"
        @close="toDetailPage('list', {})"
        :object-id="initParam.objectId"
      ></reportingDeficienciesPage>
    </template>
  </kr-card>
</template>
<script setup lang="tsx">
import { computed, ComputedRef, onMounted, reactive, ref, watch } from 'vue';
import {
  addDefectStockToEAMApi,
  AlarmListRows,
  Dict,
  exportExcel,
  getAlarmListApi,
  id,
  PageType,
  PageTypeTitle,
  Tree,
  yjxjApi,
} from '@/api/modules/appCenter/alarm';
import { getTreeApi, tableProps } from '@/api/modules/optCenter/aiPatrolManage/inspection';
import detailPage from './detail.vue';
import reportingDeficienciesPage from './reportingDeficienciesPage.vue';
import { useRoute, useRouter } from 'vue-router';
import { getDict, getDictForColumnFilters } from '@/utils/serviceDict';
import { ReportListRows } from '@/api/modules/appCenter/task/report';
import { useHandleData } from '@patrol/shared/hooks/useHandleData';
import OrgNameHeaderSearch from '@/views/appCenter/alarm/orgNameHeaderSearch.vue';
import { getTodayRange } from '@/utils/util';
import { useDebounceFn } from '@vueuse/core';
import { useDownload } from '@patrol/shared/hooks/useDownload';
import { ElMessage } from 'element-plus';

let alarm_level: Dict = [];
let alarm_type: Dict = [];
let alarm_status: Dict = [];
let inspection_conclusion: Dict = [];
let alarm_source: Dict = [];
async function getD() {
  [alarm_level, alarm_type, alarm_status, inspection_conclusion, alarm_source] = await Promise.all([
    getDict('alarm_level') as unknown as Dict,
    getDict('alarm_type') as unknown as Dict,
    getDict('alarm_status') as unknown as Dict,
    getDict('inspection_conclusion') as unknown as Dict,
    getDict('alarm_source') as unknown as Dict,
  ]);
}
await getD();
const route = useRoute();
const router = useRouter();
let cardTitle: ComputedRef<any> = computed(() =>
  pageType.value === 'list' ? route.meta?.title! : PageTypeTitle[pageType.value]
);
let pageType = ref<PageType>('list');
//树操作
let currentCameraTreeNode = ref<Tree | undefined>(undefined);
const dataSource = ref<Tree[]>([]);
const defaultValue = ref<string>();
const getTreeList = async () => {
  let { data } = await getTreeApi();
  dataSource.value = data;
  defaultValue.value = data[0]?.id || '';
  currentCameraTreeNode.value = data[0] as Tree;
};
await getTreeList();

const changeTreeFilter = (val: string, node: Tree) => {
  proTable.value.pageable.pageNum = 1;
  initParam.objectId = val;
  currentCameraTreeNode.value = node;
};
// 表格配置项
onMounted(() => {
  goDetail();
});
watch(
  () => route.query,
  (v: any) => {
    goDetail();
  }
);
function goDetail() {
  if (route.query.pageType) {
    toDetailPage(route.query.pageType as PageType, route.query as unknown as ReportListRows);
  }
}
const proTable = ref();
const range = getTodayRange();
const initParam = reactive({ objectId: defaultValue.value, selectProp: 'alarmObjectName' });
const columns: tableProps<AlarmListRows>[] = [
  {
    type: 'index',
    label: '序号',
    selectable(e) {
      return !e.syncData;
    },
    width: 60,
  },
  {
    prop: 'orgName',
    label: '所属组织',
    width: 150,
  },
  {
    prop: 'alarmAreaName',
    label: '告警区域',
    width: 200,
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
                    <el-option label="告警区域" value={'alarmAreaName'} />
                    <el-option label="告警对象" value={'alarmObjectName'} />
                    <el-option label="告警点位" value={'cameraName'} />
                    <el-option label="告警项" value={'alarmItemName'} />
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
    prop: 'alarmObjectName',
    label: '告警对象',
    width: 150,
  },
  {
    prop: 'alarmItemName',
    label: '告警项',
    width: 150,
  },
  {
    prop: 'alarmTime',
    label: '告警时间',
    width: 160,
    sortable: true,
    isShowInputLabel: true,
    search: {
      el: 'date-picker',
      defaultValue: ['1', '2', '3'].includes(route.query.fromRoute as string) ? [range.startTime, range.endTime] : [],
      props: {
        clearable: true,
        type: 'datetimerange',
        'value-format': 'YYYY-MM-DD HH:mm',
        format: 'YYYY-MM-DD HH:mm',
        timeFormat: 'HH:mm',
      },
    },
  },
  {
    prop: 'recognitionResult',
    label: '识别结果',
    width: 150,
  },
  {
    prop: 'alarmRules',
    label: '告警规则',
    width: 150,
  },
  {
    prop: 'alarmGrade',
    label: '告警等级',
    width: 150,
    filters: getDictForColumnFilters(alarm_level),
    enum: alarm_level,
    render(scope) {
      let obj = alarm_level.find((i) => i.value === scope.row.alarmGrade);
      let label = obj?.label;
      let value = obj?.value;
      let style = obj?.remark as string;
      let styleStr = '';
      if (style !== undefined) {
        let styleObj = JSON.parse(style ?? '{}');
        for (let item of Object.keys(styleObj)) {
          styleStr += item + ':' + styleObj[item] + ';';
        }
      }
      return (
        <div class="alarm-tab-main">
          {/* {`alarm-tag tag1type${value}`} */}
          {label ? (
            <span class="alarm-tag" style={`${styleStr}`}>
              {label}
            </span>
          ) : (
            '--'
          )}
        </div>
      );
    },
  },

  {
    prop: 'isReport',
    label: '报缺状态',
    width: 150,
    filterMultiple: false,
    filters: [
      { text: '已报缺', value: true },
      { text: '未报缺', value: false },
    ],
    enum: [
      { label: '已报缺', value: true },
      { label: '未报缺', value: false },
    ],
  },
  {
    prop: 'reportId',
    label: '报缺工单号',
    width: 150,
  },
  {
    prop: 'alarmSource',
    label: '告警来源',
    width: 150,
    filters: getDictForColumnFilters(alarm_source),
    enum: alarm_source,
    filteredValue: route.query.fromRoute === '2' ? ['linkage_alarm'] : [],
  },
  {
    prop: 'cameraName',
    label: '告警点位',
    width: 150,
  },
  /*  {
    prop: 'alarmName',
    label: '告警名称',
    width: 150,
  },
  {
    prop: 'alarmType',
    label: '告警类型',
    width: 150,
    filters: getDictForColumnFilters(alarm_type),
    enum: alarm_type,
  },*/
  {
    prop: 'alarmStatus',
    label: '告警状态',
    fixed: 'right',
    width: 120,
    filters: getDictForColumnFilters(alarm_status),
    enum: alarm_status,
    filteredValue: route.query.fromRoute ? [] : ['in_alert'],
    render(scope) {
      let obj = alarm_status.find((i) => i.value === scope.row.alarmStatus);
      let label = obj?.label;
      return (
        <div class="alarm-tab-main">
          <span class={['alarm-tag-line', label === '告警中' ? 'tag2type1' : 'tag2type2']}>{label ?? '--'}</span>
        </div>
      );
    },
  },
  {
    prop: 'sendQywx',
    label: '推送状态',
    width: 120,
    fixed: 'right',
    filterMultiple: false,
    filteredValue: (route.query.fromRoute === '3' ? [true] : []) as unknown as string[],
    filters: [
      { text: '已推送', value: true },
      { text: '未推送', value: false },
    ],
    enum: [
      { label: '已推送', value: true },
      { label: '未推送', value: false },
    ],
  },
  { prop: 'operation', align: 'right', label: '操作', width: 120, fixed: 'right' },
];
const dataCallback = (data: any) => {
  return {
    datalist: data.list,
    total: data.total,
    pageNum: data.page,
    pageSize: data.pageSize,
  };
};
let checkListCode = ref('');
const getTableList = async (params: any) => {
  const searchData = formatSearchData(params);
  return getAlarmListApi(searchData);
};
const yjxjList = async (selectedListIds: string[]) => {
  try {
    const { total, ...par } = getTableSearchData();
    await useHandleData<{ ids: string }>(yjxjApi, par, '一键消警');
    proTable.value.getTableList();
  } catch (e) {
    proTable.value.getTableList();
  }
};
// 弹框
const id = ref<id | undefined>('');
const ids = computed(() => proTable.value.tableData.map((i: AlarmListRows) => i.id));
const localIndex = computed(() => ids.value.indexOf(id.value));
const globalIndex = computed(() => {
  if (localIndex.value === -1) return 0;
  return (proTable.value.pageable.pageNum - 1) * proTable.value.pageable.pageSize + localIndex.value;
});
const isFirstItem = computed(() => globalIndex.value === 0);
const isLastItem = computed(() => globalIndex.value === proTable.value.pageable.total - 1);
function toDetailPage(page: PageType, row?: AlarmListRows) {
  pageType.value = page;
  id.value = row?.id || undefined;
  if (initParam.objectId) defaultValue.value = initParam.objectId;
  if (route.query.id) {
    router.push({
      path: route.path,
      query: {},
    });
  }
}
const prev = useDebounceFn(() => {
  if (isFirstItem.value) return;
  if (localIndex.value > 0) {
    id.value = ids.value[localIndex.value - 1];
  } else {
    proTable.value.pageable.pageNum = proTable.value.pageable.pageNum - 1;
    proTable.value.getTableList().then(() => {
      id.value = ids.value.at(-1);
    });
  }
}, 500);
const next = useDebounceFn(() => {
  if (isLastItem.value) return;
  if (localIndex.value < ids.value.length - 1) {
    id.value = ids.value[localIndex.value + 1];
  } else {
    proTable.value.pageable.pageNum = proTable.value.pageable.pageNum + 1;
    proTable.value.getTableList().then(() => {
      id.value = ids.value.at(0);
    });
  }
}, 500);

async function openUploadDialog(row: AlarmListRows) {
  try {
    await useHandleData<{ id: string }>(
      addDefectStockToEAMApi,
      { id: row.id! },
      '上报成功',
      '确认将本条告警提交到EAM系统缺陷工单?'
    );
  } catch (e) {}
}
const OrgNameHeaderSearchRef = ref<{ resetOrgData?: (is: boolean) => void }>({});
function resetFn() {
  OrgNameHeaderSearchRef.value?.resetOrgData?.(false);
}

function exportList() {
  const { total, ...par } = getTableSearchData();
  if (total > 500) {
    return ElMessage.warning(`导出最多不超过500条`);
  } else if (total === 0) {
    return ElMessage.warning(`当前搜索结果为0条`);
  }
  useDownload(exportExcel, `告警管理`, par);
}
function getTableSearchData() {
  return formatSearchData({
    ...proTable.value.searchParam,
    ...proTable.value.pageable,
    ...initParam,
  });
}
function formatSearchData(params: any) {
  let { pageNum, alarmTime, def, selectProp, sendQywx, ...searchData } = params;
  searchData.page = pageNum;
  if (alarmTime[0]) searchData.alarmTimeStart = alarmTime[0];
  if (alarmTime[1]) searchData.alarmTimeEnd = alarmTime[1];
  if (def) searchData[selectProp] = def;
  if (checkListCode.value) searchData.orgCodes = checkListCode.value;
  if (sendQywx) searchData.sendQywx = sendQywx;
  return searchData;
}
</script>
<style scoped lang="scss">
.alarm-card-main {
  :deep(.alarm-tab-main) {
    display: flex;
    align-items: center;
    .alarm-tag {
      padding: 2px 6px;
      color: #ffffff;
      cursor: pointer;
      background: indianred;
      border: 1px solid transparent;
      border-radius: 4px;

      //   &.tag1type1 {
      //     color: #e3007b;
      //     background: #fcdeee;
      //     border-color: transparent;
      //   }
      //   &.tag1type2 {
      //     color: #ea3939;
      //     background: #ffe2e2;
      //     border-color: transparent;
      //   }
      //   &.tag1type3 {
      //     color: #fa802f;
      //     background: #ffebde;
      //     border-color: transparent;
      //   }
      //   &.tag1type4 {
      //     color: #f1b000;
      //     background: #fcf4de;
      //     border-color: transparent;
      //   }
    }
    .alarm-tag-line {
      padding: 2px 6px;
      cursor: pointer;
      border: 1px solid;
      border-radius: 4px;
      &.tag2type1 {
        color: var(--el-color-error);
        border-color: var(--el-color-error);
      }
      &.tag2type2 {
        color: var(--el-text-color-regular);
        border-color: var(--el-text-color-regular);
      }
    }
  }
  :deep(.kr-protable-header) {
    .header-button-ri {
      /* margin-top: calc(0px - (var(--el-component-size) + 18px)); */
    }
  }
}
</style>
