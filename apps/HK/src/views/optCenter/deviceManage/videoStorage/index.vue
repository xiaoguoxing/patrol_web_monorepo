<template>
  <div class="flex-1">
    <kr-card class="flex-1" header="视频存储设备" header-border>
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
          <el-button v-auth="'add'" icon="CirclePlus" type="primary" @click="openForm('添加')">添加存储设备</el-button>
          <el-button
            v-auth="'batchDelete'"
            icon="Delete"
            @click="batchDelete(scope.selectedListIds)"
            :disabled="!scope.isSelected"
            >删除</el-button
          >
        </template>
        <!-- 表格操作 -->
        <template #operation="scope">
          <el-button
            v-auth="'edit'"
            type="primary"
            :disabled="scope.row.syncData"
            :title="scope.row.syncData ? '同步的数据不支持此操作' : ''"
            link
            @click="openForm('编辑', scope.row)"
            >编辑</el-button
          >
          <el-button
            v-auth="'delete'"
            type="primary"
            :disabled="scope.row.syncData"
            :title="scope.row.syncData ? '同步的数据不支持此操作' : ''"
            link
            @click="deleteData(scope.row)"
            >删除</el-button
          >
          <el-button
            v-auth="'delete'"
            v-show="scope.row.syncData"
            type="primary"
            link
            @click="openForm('详情', scope.row)"
            >详情</el-button
          >
        </template>
      </kr-pro-table>
    </kr-card>
    <formDialog ref="formDialogRef" :typeDictlist="typeDictlist" />
  </div>
</template>
<script setup lang="tsx" name="VideoStorage">
import { ref, reactive } from 'vue';
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
const columns: ColumnProps[] = [
  {
    type: 'selection',
    width: 60,
    selectable(e) {
      return !e.syncData;
    },
  },

  { type: 'index', label: '序号', width: 60 },
  {
    prop: 'storageName',
    label: '存储设备名称',
    search: {
      el: 'input',
      props: {
        placeholder: '请输入您需要搜索的设备名称',
      },
    },
  },
  {
    prop: 'storageType', //TODO:该属性名称未知，问后端
    label: '设备类型',
    minWidth: 120,
    width: 120,
    filters: dictForFilters(typeDictlist),
    enum: typeDictlist,
  },
  {
    prop: 'storageHost',
    label: 'IP地址',
  },
  {
    prop: 'storagePort',
    label: '端口号',
  },
  {
    prop: 'storageAccount',
    label: '用户名',
  },
  // {
  //   prop: 'storagePassword',
  //   label: '密码',
  // },
  { prop: 'operation', label: '操作', width: 200, fixed: 'right' },
];

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
    isView: title === '详情',
    api: title === '添加' ? addApi : title === '编辑' ? editApi : '',
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
  await useHandleData(deleteApi, { ids: id.join() }, '删除所选存储设备');
  proTable.value.clearSelection();
  proTable.value.getTableList();
};
//删除表格数据
const deleteData = async (row: any) => {
  await useHandleData(deleteApi, { ids: row.id }, `删除该存储设备`);
  proTable.value.getTableList();
};
</script>
<style lang="scss" scoped></style>
