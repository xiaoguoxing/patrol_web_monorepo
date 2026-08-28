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
      :placeholder="$t('alarm.placeholder')"
      :data="dataSource"
      label="nodeName"
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
      :operationBtn="true"
      @resetFn="resetFn"
    >
      <template #tableHeader="{ selectedListIds }">
        <!--   v-auth="'export'"     -->
        <el-button icon="Download" v-auth="'export'" @click="exportList(selectedListIds)">{{
          $t('buttonName.exportFile')
        }}</el-button>
      </template>
      <!-- 表格操作 -->
      <template #operation="{ row }">
        <el-button type="primary" link @click="toDetailPage('detail', row)">{{ $t('buttonName.detail') }}</el-button>
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
      <detailPage :id="id ?? ''" v-model:pageType="pageType"></detailPage>
    </template>
  </kr-card>
</template>
<script setup lang="tsx">
import { ref, reactive, computed, ComputedRef, onMounted } from 'vue';
import {
  Tree,
  AlarmListRows,
  id,
  PageType,
  PageTypeTitle,
  exportExcel,
  getAlarmListApi,
} from '@/api/modules/appCenter/task/abnormal';
import { tableProps } from '@/api/modules/optCenter/aiPatrolManage/inspection';
import detailPage from './detail.vue';
import { useRoute, useRouter } from 'vue-router';
import { getTreeApi } from '@/api/modules/optCenter/aiPatrolManage/inspection';
import OrgNameHeaderSearch from '@/views/appCenter/alarm/orgNameHeaderSearch.vue';
import { GlobalStore } from '@/stores';
import { getTodayRange } from '@/utils/util';
import { useDownload } from '@patrol/shared/hooks/useDownload';
import { ElMessage } from 'element-plus';
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
const globalStore = GlobalStore();
const route = useRoute();
const router = useRouter();
let cardTitle: ComputedRef<any> = computed(() =>
  pageType.value === 'list' ? route.meta?.title! : t(PageTypeTitle[pageType.value])
);
let pageType = ref<PageType>('list');
onMounted(() => {
  if (route.query.id) {
    route.query.syncData = eval(route.query.syncData as string);
    toDetailPage('detail', route.query as unknown as AlarmListRows);
  }
});
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

const proTable = ref();
const range = getTodayRange();
const OrgNameHeaderSearchRef = ref();
const initParam = reactive({ objectId: defaultValue.value, selectProp: 'objectName' });
const columns = computed<tableProps<AlarmListRows>[]>(() => [
  {
    type: 'index',
    label: t('table.sort'),
    selectable(e) {
      return !e.syncData;
    },
    width: 60,
  },
  {
    prop: 'orgName',
    label: t('common.orgName'),
    width: 150,
  },
  {
    prop: 'areaName',
    label: t('aiInspection.areaName'),
    width: 200,
    isShowInputLabel: false,
    search: {
      el: 'input',
      key: 'def',
      render(attr) {
        // <el-option label="巡检点位" value={'cameraName'} />
        // console.log(searchData);
        return (
          <el-input {...attr}>
            {{
              prepend: () => {
                return (
                  <el-select class={'input-prepend-select'} v-model={initParam.selectProp} style={'width: 140px'}>
                    <el-option label={t('aiInspection.objectName')} value={'objectName'} />
                    <el-option label={t('task.itemName')} value={'itemName'} />
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
    prop: 'objectName',
    label: t('aiInspection.objectName'),
    width: 150,
  },
  {
    prop: 'itemName',
    label: t('task.itemName'),
    width: 150,
  },
  {
    prop: 'executeTime',
    label: t('alarm.executeTime'),
    width: 160,
    sortable: true,
    isShowInputLabel: true,
    search: {
      el: 'date-picker',
      defaultValue: route.query.fromRoute === '1' ? [range.startTime, range.endTime] : [],
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
    label: t('alarm.recognitionResult2'),
    filterMultiple: false,
    filters: [
      { text: t('statistic.alarmItemNum1'), value: 1 },
      { text: t('statistic.alarmItemNum2'), value: 2 },
      { text: t('statistic.alarmItemNum3'), value: 3 },
      { text: t('statistic.alarmItemNum4'), value: 4 },
    ],
  },
  { prop: 'operation', align: 'right', label: t('table.operation'), width: 120, fixed: 'right' },
]);
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

// 弹框
const id = ref<id | undefined>('');
function toDetailPage(page: PageType, row?: AlarmListRows) {
  id.value = row?.id || undefined;
  if (row?.syncData) {
    // if (false) {
    let baseUrl = import.meta.env.VITE_SYS_URL;
    window.open(
      `${baseUrl}/#/patrolInspection/appCenter/appCenterTask/abnormal?token=${globalStore.token}&id=${id.value}`,
      '_blank'
    );
  } else {
    pageType.value = page;
    if (initParam.objectId) defaultValue.value = initParam.objectId;
  }
  if (route.query.id) {
    router.push({
      path: route.path,
      query: {},
    });
  }
}
const resetFn = () => {
  OrgNameHeaderSearchRef.value?.resetOrgData(false);
};

function exportList() {
  const { total, ...pageable } = proTable.value.pageable;
  if (total > 500) {
    return ElMessage.warning(t('alarm.msg1'));
  } else if (total === 0) {
    return ElMessage.warning('alarm.msg2');
  }
  const par = formatSearchData({
    ...proTable.value.searchParam,
    ...pageable,
    ...initParam,
  });
  useDownload(exportExcel, t('alarm.msg4'), par);
}
function formatSearchData(params: any) {
  let { pageNum, executeTime, def, selectProp, ...searchData } = params;
  searchData.page = pageNum;
  if (executeTime) searchData.startTime = executeTime[0];
  if (executeTime) searchData.endTime = executeTime[1];
  if (def) searchData[selectProp] = def;
  if (checkListCode.value) searchData.orgCodes = checkListCode.value;
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
