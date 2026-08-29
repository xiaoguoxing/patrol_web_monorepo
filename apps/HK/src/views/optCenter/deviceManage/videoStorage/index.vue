<template>
  <div class="flex-1">
    <kr-card class="flex-1" :header="cardTitle" header-border>
      <kr-pro-table
        ref="proTable"
        :columns="columns"
        :requestApi="getTableList"
        :dataCallback="dataCallback"
        :searchCol="{ xs: 1, sm: 1, md: 3, lg: 3, xl: 3 }"
        selectId="id"
        colSetAble
      >
        <!-- 表格 header 按钮 -->
        <template #tableHeader="scope">
          <el-button v-auth="'add'" icon="CirclePlus" type="primary" @click="openForm($t('buttonName.add'))"
            >{{ $t('buttonName.add') }}{{ $t('camera.storageName') }}</el-button
          >
          <el-button
            v-auth="'batchDelete'"
            icon="Delete"
            @click="batchDelete(scope.selectedListIds)"
            :disabled="!scope.isSelected"
            >{{ $t('ui.delete') }}</el-button
          >
        </template>
        <!-- 表格操作 -->
        <template #operation="scope">
          <el-button
            v-auth="'edit'"
            type="primary"
            :disabled="scope.row.syncData"
            :title="scope.row.syncData ? $t('buttonName.syncData') : ''"
            link
            @click="openForm($t('buttonName.edit'), scope.row)"
            >{{ $t('buttonName.edit') }}</el-button
          >
          <el-button
            v-auth="'delete'"
            type="primary"
            :disabled="scope.row.syncData"
            :title="scope.row.syncData ? $t('buttonName.syncData') : ''"
            link
            @click="deleteData(scope.row)"
            >{{ $t('ui.delete') }}</el-button
          >
          <el-button
            v-auth="'delete'"
            v-show="scope.row.syncData"
            type="primary"
            link
            @click="openForm($t('buttonName.detail'), scope.row)"
            >{{ $t('buttonName.detail') }}</el-button
          >
        </template>
      </kr-pro-table>
    </kr-card>
    <formDialog ref="formDialogRef" :typeDictlist="typeDictlist" />
  </div>
</template>
<script setup lang="tsx" name="VideoStorage">
import { ref, reactive, ComputedRef, computed } from 'vue';
import { getDict, getDictForColumnFilters as dictForFilters } from '@/utils/serviceDict';
import type { DefaultDict, FilterDict } from '@/utils/serviceDict';
import { ColumnProps } from '@patrol/ui';
import { useHandleData } from '@patrol/shared/hooks/useHandleData';
import formDialog from './formDialog.vue';
import {
  getListApi,
  deleteApi,
  editApi,
  addApi,
  detailApi,
  VideoStorage,
} from '@/api/modules/optCenter/deviceManage/videoStorage';
import { decryptPassword } from '@/views/optCenter/deviceManage/camera/usePWA';
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
import { useRoute } from 'vue-router';
const route = useRoute();
let cardTitle: ComputedRef<any> = computed(() => route.meta?.title!);
/*
 **数据字典
 */
//设备类型

const typeDictlist = (await getDict('video_storage_type')) as DefaultDict;

/*
  存储设备功能

*/
const proTable = ref();
const dataCallback = (data: any) => {
  return {
    datalist: data.list,
    total: data.total,
    pageNum: data.page,
    pageSize: data.pageSize,
  };
};
// 表格测试数据
const tableSource = [
  {
    id: '1',
    storageName: '测试',
    storageType: '1',
    storageHost: 'http:1234567',
    storagePort: '8080',
    storageAccount: 'lhua',
    storagePassword: '密码',
  },
  {
    id: '2',
    storageName: '测试',
    storageType: '1',
    storageHost: 'http:1234567',
    storagePort: '8080',
    storageAccount: 'lhua',
    storagePassword: '密码',
  },
  {
    id: '3',
    storageName: '测试',
    storageType: '1',
    storageHost: 'http:1234567',
    storagePort: '8080',
    storageAccount: 'lhua',
    storagePassword: '密码',
  },
  {
    id: '4',
    storageName: '测试',
    storageType: '1',
    storageHost: 'http:1234567',
    storagePort: '8080',
    storageAccount: 'lhua',
    storagePassword: '密码',
  },
  {
    id: '5',
    storageName: '测试',
    storageType: '1',
    storageHost: 'http:1234567',
    storagePort: '8080',
    storageAccount: 'lhua',
    storagePassword: '密码',
  },
  {
    id: '6',
    storageName: '测试',
    storageType: '1',
    storageHost: 'http:1234567',
    storagePort: '8080',
    storageAccount: 'lhua',
    storagePassword: '密码',
  },
];
// 表格配置项
const columns = computed<ColumnProps[]>(() => [
  {
    type: 'selection',
    width: 60,
    selectable(e) {
      return !e.syncData;
    },
  },

  { type: 'index', label: t('table.sort'), width: 60 },
  {
    prop: 'storageName',
    label: t('camera.storageName'),
    search: {
      el: 'input',
      props: {
        placeholder: t('inputPlaceholder.placeholderEnter2'),
      },
    },
  },
  {
    prop: 'storageType', //TODO:该属性名称未知，问后端
    label: t('camera.storageType'),
    minWidth: 120,
    width: 120,
    filters: dictForFilters(typeDictlist),
    enum: typeDictlist,
  },
  {
    prop: 'storageHost',
    label: t('common.ip'),
  },
  {
    prop: 'storagePort',
    label: t('common.port'),
  },
  {
    prop: 'storageAccount',
    label: t('inputPlaceholder.username'),
  },
  // {
  //   prop: 'storagePassword',
  //   label: '密码',
  // },
  { prop: 'operation', label: t('table.operation'), width: 200, fixed: 'right' },
]);

// 获取表格数据
const getTableList = (params: any) => {
  let newParams = { ...params };
  newParams.page = newParams.pageNum;
  delete newParams.pageNum;
  return getListApi(newParams);
  /* return new Promise((resolve) => {
    let resultData = [...tableSource];
    if (params.storageName) {
      resultData = tableSource.filter((item) => item.storageName.includes(params.storageName));
    }
    resolve({
      data: {
        list: resultData,
        total: resultData.length,
        page: 1,
        pageSize: 10,
      },
    });
  }); */
};
// 新增存储设备
const formDialogRef = ref();
const openForm = async (title: string, rowData: Partial<VideoStorage.ResList> = {}) => {
  let params = {
    title,
    rowData: rowData.id ? await getVideoSId(rowData.id) : { ...rowData },
    isView: title === t('buttonName.detail'),
    api: title === t('buttonName.add') ? addApi : title === t('buttonName.edit') ? editApi : '',
    getTableList: proTable.value.getTableList,
  };
  formDialogRef.value.acceptParams(params);
};
async function getVideoSId(id: string) {
  let { data } = await detailApi({ id });
  return {
    ...data,
    storagePassword: await decryptPassword(data.storagePassword),
    storageHost: await decryptPassword(data.storageHost),
    storageAccount: await decryptPassword(data.storageAccount),
  };
}
// 批量删除表格数据
const batchDelete = async (id: string[]) => {
  await useHandleData(deleteApi, { ids: id.join() }, t('camera.tip14'));
  proTable.value.clearSelection();
  proTable.value.getTableList();
};
//删除表格数据
const deleteData = async (row: any) => {
  await useHandleData(deleteApi, { ids: row.id }, t('camera.tip14'));
  proTable.value.getTableList();
};
</script>
<style lang="scss" scoped></style>
