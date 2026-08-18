<template>
  <div class="mb20 two-col-page">
    <div class="flx-align-center">
      <Tabs :options="tabOptions" buttonType="bottom-line" @change="changeTab"></Tabs>
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
      <el-button type="primary" link @click="goDetail(scope.row)">详情</el-button>
    </template>
  </kr-pro-table>
</template>
<script setup lang="tsx">
import { ref, reactive } from 'vue';
import { KeepAliveStore } from '@/stores/modules/keepAlive';
import { ColumnProps } from '@patrol/ui';
import { getDict, getDictForColumnFilters as dictForFilters } from '@/utils/serviceDict';
import type { DefaultDict } from '@/utils/serviceDict';
import { getListApi, getStatisticsApi } from '@/api/modules/appCenter/inspectionMonitor/aiInspection';
import { getAllListApi as getTaskTypeList } from '@/api/modules/optCenter/inspectionSet/taskType';

import Tabs from '@/components/Tabs/index.vue';
import { useRouter, useRoute } from 'vue-router';
const router = useRouter();
const route = useRoute();
const keepAliveStore = KeepAliveStore();

//任务状态数据字典
// const taskNumObj = (await getStatisticsApi()).data;
const statusDictlist = [...((await getDict('task_status')) as DefaultDict), { label: '全部', value: 'all' }];
const getTabOptions = async () => {
  let taskNumObj = (await getStatisticsApi()).data;
  return statusDictlist.map((item) => {
    let obj = { ...item };
    obj.label = `${item.label}(${taskNumObj[item.value]})`;
    return obj;
  });
};
const tabOptions = ref(await getTabOptions());

//任务执行类型
const taskExecuteTypeDict = (await getDict('task_execute_type')) as DefaultDict;
// 获取任务类型列表
const taskTypeList = (await getTaskTypeList()).data.map((item) => {
  return { label: item.taskType, value: item.id as string };
});
const proTable = ref();
const searchProp = ref('taskName');
const initParam = reactive({
  taskStatus: statusDictlist[0]!.value,
});
const changeTab = (tab) => {
  if (tab.value == 'all') {
    initParam.taskStatus = '';
  } else {
    initParam.taskStatus = tab.value;
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
const columns: ColumnProps[] = [
  { type: 'selection', width: 60 },

  { type: 'index', label: '序号', width: 60 },

  {
    prop: 'inspectionTaskName',
    label: '任务名称',
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
                  <el-select v-model={searchProp.value} placeholder="请选择" style={'width: 140px'}>
                    <el-option label="巡检任务名称" value={'taskName'} />
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
    prop: 'taskType', //TODO:该属性名称未知，问后端
    label: '任务类型',
    minWidth: 120,
    filters: dictForFilters(taskTypeList),
    enum: taskTypeList,
  },
  {
    prop: 'areaName',
    label: '巡检区域',
    minWidth: 150,
  },
  {
    prop: 'objectName',
    label: '巡检对象名称',
    minWidth: 120,
  },
  {
    prop: 'itemNum',
    label: '巡检项数量',
    minWidth: 100,
  },
  {
    prop: 'executeType',
    label: '任务执行类型',
    minWidth: 120,
    filters: dictForFilters(taskExecuteTypeDict),
    enum: taskExecuteTypeDict,
  },
  {
    prop: 'taskStartTime',
    label: '任务开始时间',
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
  { prop: 'operation', label: '操作', width: 200, fixed: 'right' },
];

// 获取表格数据
const getTableList = async (params: any) => {
  //TODO:是否需要判断有无联动信号id才决定请求不请求联动内容
  let newParams = { ...params };
  if (newParams.searchValue) {
    newParams[searchProp.value] = newParams.searchValue;
    delete newParams.searchValue;
  }
  if (newParams.taskStartTime) {
    newParams.startTime = newParams.taskStartTime[0];
    newParams.endTime = newParams.taskStartTime[1];
    delete newParams.taskStartTime;
  }
  newParams.page = newParams.pageNum;
  delete newParams.pageNum;
  tabOptions.value = await getTabOptions();
  return getListApi(newParams);
};
//详情
const goDetail = (row) => {
  keepAliveStore.addKeepLiveName('aiInspection');
  router.push(`${route.path}/aiInspectionDetail?id=${row.id}`);

  // router.push(`/patrolInspection/appCenter/inspectionMonitor/trackInspection?id=${row.id}`);
};
</script>
<style scoped lang="scss"></style>
