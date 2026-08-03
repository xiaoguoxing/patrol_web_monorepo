<template>
  <kr-card class="flex-1 two-col-page alarm-card-main" header-border>
    <template #header>
      <div>
        <el-icon @click="toDetailPage('list', {})" v-if="pageType === 'detail'" class="mr8 page-back"><Back /></el-icon>
        <span class="title kr-font-medium">{{ cardTitle }}</span>
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
import { ref, reactive, onMounted, computed, watch, ComputedRef } from 'vue';
import {
  Tree,
  AlarmListRows,
  id,
  PageType,
  PageTypeTitle,
  getAlarmListApi,
  Dict,
  addDefectStockToEAMApi,
} from '@/api/modules/appCenter/alarm';
import { tableProps } from '@/api/modules/optCenter/aiPatrolManage/inspection';
import detailPage from './detail.vue';
import reportingDeficienciesPage from './reportingDeficienciesPage.vue';
import { useRoute, useRouter } from 'vue-router';
import { getTreeApi } from '@/api/modules/optCenter/aiPatrolManage/inspection';
import { getDict, getDictForColumnFilters } from '@/utils/serviceDict';
import { ReportListRows } from '@/api/modules/appCenter/task/report';
import { useHandleData } from '@/hooks/useHandleData';
import OrgNameHeaderSearch from '@/views/appCenter/alarm/orgNameHeaderSearch.vue';
import selectHeaderSearch from '@/views/appCenter/alarm/selectHeaderSearch.vue';
import { getTodayRange } from '@/utils/util';
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
  let { pageNum, alarmTime, def, selectProp, sendQywx, ...searchData } = params;
  searchData.page = pageNum;
  if (alarmTime) searchData.alarmTimeStart = alarmTime[0];
  if (alarmTime) searchData.alarmTimeEnd = alarmTime[1];
  if (def) searchData[selectProp] = def;
  if (checkListCode.value) searchData.orgCodes = checkListCode.value;
  if (sendQywx) searchData.sendQywx = sendQywx;
  return getAlarmListApi(searchData);
};

// 弹框
const id = ref<id | undefined>('');
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
    margin-bottom: 0;
    .header-button-ri {
      margin-top: calc(0px - (var(--el-component-size) + 18px));
    }
  }
}
</style>
