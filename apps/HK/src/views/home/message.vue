<template>
  <div class="message-page">
    <myTabs :options="options1" style="margin-bottom: 20px" buttonType="bottom-line" @change="tabChange"></myTabs>
    <kr-pro-table
      ref="proTable"
      :columns="columns"
      :requestApi="getTableList"
      :initParam="initParam"
      :dataCallback="dataCallback"
      :searchCol="{ xs: 1, sm: 1, md: 2, lg: 3, xl: 3 }"
      selectId="id"
      title="通知消息"
      titleBorder
      :outBorder="false"
      colSetAble
    >
      <!-- 表格 header 按钮 -->
      <template #tableHeader="{ selectedListIds }">
        <el-button icon="Delete" :disabled="!selectedListIds.length" @click="deleteList(selectedListIds)"
          >批量删除</el-button
        >
        <el-button :disabled="!selectedListIds.length" @click="updateStatus(selectedListIds)">标记已读</el-button>
      </template>
      <template #messageContent="{ row }">
        <div class="messageContent" @click="rowClick(row)">{{ row.messageContent }}</div>
      </template>
    </kr-pro-table>
  </div>
</template>

<script setup name="message" lang="ts">
import { reactive, ref } from 'vue';
import myTabs from '@/components/Tabs/index.vue';
import { getMessageList, getDeleteList, getUpdateList } from '@/api/modules/workstand';
import { useHandleData } from '@patrol/shared/hooks/useHandleData';
import { useRouter } from 'vue-router';
const router = useRouter();
const proTable = ref();
const options1 = [
  { label: '全部', value: undefined },
  { label: '未读', value: 0 },
  { label: '已读', value: 1 },
];
const initParam = reactive({});
const columns = [
  { type: 'selection', label: '序号', width: 150 },
  { type: 'index', label: '序号', width: 120 },
  {
    prop: 'messageContent',
    label: '消息内容',
  },

  {
    prop: 'readStatus',
    label: '状态',
    sortable: false,
    filterMultiple: false,
    filters: [
      { text: '未读', value: 0 },
      { text: '已读', value: 1 },
    ],
    enum: [
      { label: '未读', value: 0 },
      { label: '已读', value: 1 },
    ],
    width: 120,
  },
  {
    prop: 'messageType',
    label: '消息类型',
    sortable: false,
    filterMultiple: false,
    filters: [
      { text: '业务消息', value: '业务消息' },
      { text: '系统消息', value: '系统消息' },
    ],
    enum: [
      { label: '业务消息', value: '业务消息' },
      { label: '系统消息', value: '系统消息' },
    ],
    width: 120,
  },
  {
    prop: 'sendTime',
    label: '接收时间',
    width: 160,
  },
];
const selectProp = ref('1');
let tabItem = ref(options1[0]);

const deleteList = async (selectedListIds: any) => {
  try {
    await useHandleData<{ ids: string }>(getDeleteList, { ids: selectedListIds.join(',') }, '删除所选消息');
    proTable.value.getTableList();
    proTable.value.clearSelection();
  } catch (e) {}
};
const getTableList = async (params: any) => {
  // getMessageList
  //param:pageNum,在这里可以根据后端需要的参数从 params 拿到想要的参数值
  let res = {
    data: { list: [], pageNum: 1, pageSize: 10, total: 0, pages: 1 },
  };
  let { pageNum, ...searchData } = params;
  searchData.page = pageNum;
  searchData.status = tabItem.value.value;
  res = await getMessageList(searchData);
  let { list, ...pageInfo } = res.data;

  return {
    data: {
      list: list,
      ...pageInfo,
    },
  };
};
const updateStatus = async (selectedListIds: any) => {
  try {
    await useHandleData<{ ids: string }>(getUpdateList, { ids: selectedListIds.join(',') }, '标记为已读');
    proTable.value.clearSelection();
    proTable.value.getTableList();
  } catch (e) {}
};

const dataCallback = (data: any) => {
  return {
    datalist: data.list,
    total: data.total,
    pageNum: data.pageNum,
    pageSize: data.pageSize,
  };
};
const tabChange = (item: any) => {
  tabItem.value = item;
  proTable.value.getTableList();
};

async function rowClick(item: { taskType: 'InspectionTask' | 'LinkageTask'; taskId: string; id: string }) {
  if (['InspectionTask', 'LinkageTask'].includes(item.taskType)) {
    await getUpdateList({ ids: item.id });
    let route = {
      InspectionTask: '/patrolInspection/appCenter/appCenterTask/taskReport',
      LinkageTask: '/patrolInspection/appCenter/linkage/linkageDetail',
    };
    router.push(`${route[item.taskType]}?id=${item.taskId}`);
  }
}
</script>

<style scoped lang="scss">
// @import './index.scss';
.message-page {
  box-sizing: border-box;
  height: 100%;
  padding: 20px;
  background: #ffffff;
  .kr-protable {
    height: calc(100% - 56px) !important;
  }
  .messageContent {
    cursor: pointer;
    &:hover {
      color: #0d60b4;
    }
  }
}
</style>
