<template>
  <div class="mb20 two-col-page">
    <div class="flx-align-center">
      <Tabs :options="taboptions2" buttonType="bottom-line" @change="changeTab"></Tabs>
    </div>

    <div class="two-col-page-rt flx-justify-end">
      <slot></slot>
    </div>
  </div>
  <kr-pro-table
    ref="proTable"
    :columns="columns"
    :requestApi="getTableList"
    :initParam="initParam"
    :dataCallback="dataCallback"
    :searchCol="{ xs: 1, sm: 1, md: 3, lg: 3, xl: 3 }"
    :operationBtn="false"
  >
    <!-- 表格操作 -->
    <template #operation="scope">
      <el-button type="primary" link @click="goDetail(scope.row)">{{ $t('buttonName.detail') }}</el-button>
    </template>
  </kr-pro-table>
</template>
<script setup lang="tsx">
import { ref, reactive, watch, computed } from 'vue';
import { KeepAliveStore } from '@/stores/modules/keepAlive';
import { ColumnProps } from '@patrol/ui';
import { getDict, getDictForColumnFilters as dictForFilters } from '@/utils/serviceDict';
import type { DefaultDict, FilterDict } from '@/utils/serviceDict';
import { getListApi, getStatisticsApi } from '@/api/modules/appCenter/linkage/index';
import type { AILinkageTask } from '@/api/modules/appCenter/linkage/index';
import Tabs from '@/components/Tabs/index.vue';
import { useRouter, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
const router = useRouter();
const route = useRoute();
const keepAliveStore = KeepAliveStore();

//联动状态数据字典
const statusDictlist = [...((await getDict('task_status')) as DefaultDict)];
let allCount = 0;
const getTabOptions = async () => {
  let taskNumObj = (await getStatisticsApi()).data;
  allCount = taskNumObj['total'];
  return statusDictlist.map((item) => {
    let obj = { ...item };
    obj.label = `${item.label}(${taskNumObj[item.value]})`;
    return obj;
  });
};
const tabOptions = ref(await getTabOptions());
const taboptions2 = computed(() => [...tabOptions.value, { label: t('worktop.All') + `(${allCount})`, value: 'all' }]);
const proTable = ref();
const searchProp = ref('linkageSignalName');
const initParam = reactive({
  taskType: statusDictlist[0]!.value,
});
const changeTab = (tab) => {
  if (tab.value == 'total') {
    initParam.taskType = '';
  } else {
    initParam.taskType = tab.value;
  }
};
const dataCallback = (data: any) => {
  return {
    datalist: data.list,
    total: data.total,
    pageNum: data.page,
    pageSize: data.pageSize,
  };
};

// 表格配置项
const columns = computed<ColumnProps[]>(() => [
  { type: 'selection', width: 60 },

  { type: 'index', label: t('table.sort'), width: 60 },

  {
    prop: 'linkageSignalCode',
    label: t('aiInspection.linkageSignalCode'),
    minWidth: 150,
    search: {
      el: 'input',
      key: 'searchValue',
      render(attr) {
        return (
          <el-input {...attr}>
            {{
              prepend: () => {
                return (
                  <el-select
                    v-model={searchProp.value}
                    placeholder={t('inputPlaceholder.placeholderSelect')}
                    style={'width: 140px'}
                  >
                    <el-option label={t('aiInspection.linkageSignalName')} value={'linkageSignalName'} />
                    <el-option label={t('aiInspection.linkageSignalCode')} value={'linkageSignalCode'} />
                    <el-option label={t('aiInspection.cameraName')} value={'cameraName'} />
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
    prop: 'linkageSignalName',
    label: t('aiInspection.linkageSignalName'),
    minWidth: 150,
  },
  {
    prop: 'cameraName',
    label: t('aiInspection.cameraName'),
    minWidth: 150,
  },
  {
    prop: 'linkageStatus',
    label: t('aiInspection.linkageStatus'),
    minWidth: 120,
    filters: dictForFilters(statusDictlist),
    enum: statusDictlist,
  },
  {
    prop: 'abnormalNum',
    label: t('aiInspection.abnormalNum'),
    minWidth: 120,
  },

  {
    prop: 'executionTime',
    label: t('aiInspection.executionTime'),
    minWidth: 150,
    isShowInputLabel: true,
    search: {
      el: 'date-picker',
      props: {
        type: 'datetimerange',
        valueFormat: 'YYYY-MM-DD HH:mm:ss',
      },
    },
  },
  {
    prop: 'linkageSource',
    label: t('aiInspection.linkageSource'),
    minWidth: 120,
  },
  { prop: 'operation', label: t('table.operation'), width: 200, fixed: 'right' },
]);

// 获取表格数据
const getTableList = async (params: any) => {
  let newParams = { ...params };
  if (newParams.searchValue) {
    newParams[searchProp.value] = newParams.searchValue;
    delete newParams.searchValue;
  }
  if (newParams.executionTime) {
    newParams.timeStart = newParams.executionTime[0];
    newParams.timeEnd = newParams.executionTime[1];
    delete newParams.executionTime;
  }
  newParams.page = newParams.pageNum;
  delete newParams.pageNum;
  tabOptions.value = await getTabOptions();
  return getListApi(newParams);
};
//详情
const goDetail = (row) => {
  keepAliveStore.addKeepLiveName('linkage');
  router.push(`${route.path}/linkageDetail?id=${row.id}`);
};
</script>
<style scoped lang="scss"></style>
