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
    >
      <!-- 表格 header 按钮 -->
      <template #tableHeader="{ selectedListIds }">
        <el-button icon="Delete" :disabled="!selectedListIds.length" @click="deleteList(selectedListIds)">{{
          $t('buttonName.delAll')
        }}</el-button>
        <el-button :disabled="!selectedListIds.length" @click="updateStatus(selectedListIds)">{{
          $t('worktop.messageRead')
        }}</el-button>
      </template>
      <template #messageContent="{ row }">
        <div class="messageContent" @click="rowClick(row)">{{ row.messageContent }}</div>
      </template>
    </kr-pro-table>
  </div>
</template>

<script setup name="message" lang="ts">
import { computed, reactive, ref } from 'vue';
import myTabs from '@/components/Tabs/index.vue';
import { getMessageList, getDeleteList, getUpdateList } from '@/api/modules/workstand';
import { useHandleData } from '@patrol/shared/hooks/useHandleData';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { type DefaultDict, getDict, getDictForColumnFilters } from '@/utils/serviceDict';
const { t } = useI18n();
const router = useRouter();
const proTable = ref();
const options1 = computed(() => [
  { label: t('worktop.All'), value: undefined },
  { label: t('worktop.unRead'), value: 0 },
  { label: t('worktop.read'), value: 1 },
]);

const message_type = (await getDict('message_type')) as DefaultDict;
const initParam = reactive({});
const columns = computed(() => [
  { type: 'selection', label: t('table.sort'), width: 150 },
  { type: 'index', label: t('table.sort'), width: 120 },
  {
    prop: 'messageContent',
    label: t('worktop.messageContent'),
    minWidth: 180,
  },

  {
    prop: 'readStatus',
    label: t('table.status'),
    sortable: false,
    enum: [
      { label: t('worktop.unRead'), value: 0 },
      { label: t('worktop.read'), value: 1 },
    ],
  },
  {
    prop: 'messageType',
    label: t('worktop.messageType'),
    sortable: false,
    filterMultiple: false,
    filters: getDictForColumnFilters(message_type),
    enum: message_type,
  },
  {
    prop: 'sendTime',
    label: t('worktop.sendTime'),
  },
]);
const selectProp = ref('1');
let tabItem = ref(options1.value[0]);

const deleteList = async (selectedListIds: any) => {
  try {
    await useHandleData<{ ids: string }>(getDeleteList, { ids: selectedListIds.join(',') }, t('worktop.delSelectNote'));
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
    await useHandleData<{ ids: string }>(getUpdateList, { ids: selectedListIds.join(',') }, t('worktop.selectRead'));
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
