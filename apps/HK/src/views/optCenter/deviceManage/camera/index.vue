<template>
  <div class="flex-1">
    <kr-card class="flex-1 two-col-page" :header="cardTitle" header-border>
      <kr-filter-tree
        class="two-col-page-lf"
        ref="leftTree"
        v-dragLine
        label="areaName"
        :requestApi="getAreaListApi"
        :defaultValue="defaultValue"
        @change="clickTreeNode"
      >
      </kr-filter-tree>
      <kr-pro-table
        ref="proTable"
        :columns="columns"
        :requestApi="getTableList"
        :initParam="initParam"
        :dataCallback="dataCallback"
        :searchCol="{ xs: 1, sm: 1, md: 3, lg: 3, xl: 3 }"
        selectId="id"
        colSetAble
      >
        <!-- 表格 header 按钮 -->
        <template #tableHeader="scope">
          <el-button
            v-auth="'add'"
            :title="syncData ? $t('buttonName.syncData') : ''"
            icon="CirclePlus"
            :disabled="syncData"
            type="primary"
            @click="openForm($t('buttonName.add'))"
            >{{ $t('camera.addCamera') }}</el-button
          >
          <el-button
            v-auth="'batchDelete'"
            icon="Delete"
            :title="syncData ? $t('buttonName.syncData') : ''"
            @click="batchDelete(scope.selectedListIds)"
            :disabled="syncData || !scope.isSelected"
            >{{ $t('ui.delete') }}</el-button
          >
        </template>
        <template #setPreset="{ row }">
          {{ row.setPreset ? $t('common.s') : $t('common.f') }}
        </template>
        <!-- 表格操作 -->
        <template #operation="scope">
          <el-button
            v-auth="'edit'"
            :disabled="scope.row.syncData"
            type="primary"
            link
            :title="scope.row.syncData ? $t('buttonName.syncData') : ''"
            @click="openForm($t('buttonName.edit'), scope.row)"
            >{{ $t('buttonName.edit') }}</el-button
          >
          <el-button
            v-auth="'delete'"
            :title="scope.row.syncData ? $t('buttonName.syncData') : ''"
            :disabled="scope.row.syncData"
            type="primary"
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
<script setup lang="tsx">
import { ref, reactive, ComputedRef, computed } from 'vue';
import { ElMessage } from 'element-plus';
import { ColumnProps } from '@patrol/ui';
import { useHandleData } from '@patrol/shared/hooks/useHandleData';
import { getDict, getDictForColumnFilters as dictForFilters } from '@/utils/serviceDict';
import type { DefaultDict } from '@/utils/serviceDict';

import formDialog from './formDialog.vue';
import { getListApi, deleteApi, editApi, addApi, Camera } from '@/api/modules/optCenter/deviceManage/camera';
import { getAreaListApi } from '@/api/modules/optCenter/inspectionSet/area';
import { cameraInfoApi } from '@/api/modules/camera';
import { decryptPassword, encryptPassword } from '@/views/optCenter/deviceManage/camera/usePWA';
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
import { useRoute } from 'vue-router';
const route = useRoute();
let cardTitle: ComputedRef<any> = computed(() => route.meta?.title!);
/*
 **数据字典
 */
//监控设备类型
defineOptions({
  name: 'cameraManage',
});
const typeDictlist = (await getDict('camera_type')) as DefaultDict;
const statusDictlist = (await getDict('device_online_status')) as DefaultDict;
/*
  巡检区域树列表
*/
const defaultValue = ref();
const leftTree = ref();
//请求获取区域树数据
const getTreeList = async () => {
  let { data } = await getAreaListApi();
  if (data.length > 0) {
    defaultValue.value = data[0].id;
  }
};
await getTreeList();
/*
摄像头树表 选择器

*/
/*
  摄像头功能

*/
const proTable = ref();
const initParam = reactive({
  areaId: defaultValue.value,
});
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
  {
    type: 'selection',
    width: 60,
    selectable(e) {
      return !e.syncData;
    },
  },

  { type: 'index', label: t('table.sort'), width: 60 },
  {
    prop: 'cameraName',
    label: t('camera.cameraName'),
    minWidth: 120,
    search: {
      el: 'input',
      props: {
        placeholder: t('inputPlaceholder.placeholderEnter2'),
      },
    },
  },
  {
    prop: 'cameraType',
    label: t('camera.cameraType'),
    minWidth: 150,
    filters: dictForFilters(typeDictlist),
    enum: typeDictlist,
  },
  {
    prop: 'cameraStatus',
    label: t('table.status'),
    minWidth: 120,
    filters: dictForFilters(statusDictlist),
    enum: statusDictlist,
  },
  {
    prop: 'areaName',
    label: t('overHaulArea.areaName'),
    minWidth: 120,
  },
  {
    prop: 'cameraHost',
    label: t('common.ip'),
    minWidth: 120,
  },
  {
    prop: 'cameraPort',
    label: t('common.port'),
  },
  {
    prop: 'cameraAccount',
    label: t('inputPlaceholder.username'),
  },
  {
    prop: 'channelNum',
    label: t('camera.channelNum'),
    minWidth: 120,
  },
  {
    prop: 'setPreset',
    label: t('camera.setPreset'),
    minWidth: 120,
  },
  { prop: 'operation', label: t('table.operation'), width: 200, fixed: 'right' },
]);
// 点击树节点
let syncData = ref();
const clickTreeNode = (val: string, data: any) => {
  //判断 当前节点是否已被选中
  proTable.value.pageable.pageNum = 1;
  initParam.areaId = val;
  syncData.value = data.syncData;
};

// 获取表格数据
const getTableList = (params: any) => {
  let newParams = { ...params };
  newParams.page = newParams.pageNum;
  delete newParams.pageNum;
  return getListApi(newParams);
  /*   return new Promise((resolve) => {
    let resultData = [...tableSource];
    if (params.cameraName) {
      resultData = tableSource.filter((item) => item.cameraName.includes(params.cameraName));
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
// 新增摄像头
const formDialogRef = ref();

const openForm = async (title: string, rowData: Partial<Camera.ResList> = {}) => {
  let nodeData = leftTree.value.element.getCurrentNode();
  if (title === t('buttonName.add')) {
    if (nodeData) {
      /* if (nodeData.areaType == 2) { */
      let params = {
        title,
        areaData: nodeData,
        rowData: { setPreset: true },
        isView: false,
        api: addApi,
        getTableList: proTable.value.getTableList,
      };
      formDialogRef.value.acceptParams(params);
    } else {
      ElMessage.warning(t('camera.tip1'));
    }
    /* } else {
      ElMessage.warning('请选择巡检区域！');
    } */
  } else {
    let params = {
      title,
      areaData: nodeData,
      isView: title == t('buttonName.detail'),
      api: title == t('buttonName.edit') ? editApi : '',
      getTableList: proTable.value.getTableList,
      rowData: await getCameraId(rowData.id!),
    };
    formDialogRef.value.acceptParams(params);
  }
};
async function getCameraId(id: string) {
  const { data } = await cameraInfoApi({ id });
  return {
    ...data,
    cameraPassword: await decryptPassword(data.cameraPassword),
    cameraHost: await decryptPassword(data.cameraHost),
    cameraAccount: await decryptPassword(data.cameraAccount),
  };
}
// 批量删除表格数据
const batchDelete = async (id: string[]) => {
  await useHandleData(deleteApi, { ids: id.join() }, t('camera.tip2'));
  proTable.value.clearSelection();
  proTable.value.getTableList();
};
//删除表格数据
const deleteData = async (row: any) => {
  await useHandleData(deleteApi, { ids: row.id }, t('camera.tip3'));
  proTable.value.getTableList();
};
</script>
<style lang="scss" scoped>
.custom-tree-node {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: space-between;
  .custom-tree-node-btns {
    display: flex;
    align-items: center;
    a {
      display: inline-flex;
      align-items: center;
      font-size: var(--el-font-size-large);
      &:hover {
        color: var(--el-color-primary);
      }
    }
  }
}
</style>
