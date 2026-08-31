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
      >
        <!-- 表格 header 按钮 -->
        <template #tableHeader="scope">
          <el-button
            v-auth="'add'"
            :title="syncData ? $t('buttonName.syncData') : ''"
            :disabled="syncData"
            icon="CirclePlus"
            type="primary"
            @click="openForm($t('buttonName.add'))"
            >{{ $t('camera.addDrone') }}</el-button
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
            type="primary"
            :disabled="scope.row.syncData"
            :title="scope.row.syncData ? $t('buttonName.syncData') : ''"
            link
            @click="openForm($t('buttonName.edit'), scope.row)"
            >{{ $t('buttonName.edit') }}</el-button
          >
          <el-button
            v-auth="'delete'"
            :disabled="scope.row.syncData"
            :title="scope.row.syncData ? $t('buttonName.syncData') : ''"
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
<script setup lang="tsx" name="areaManage">
import { ref, reactive, ComputedRef, computed } from 'vue';
import { ElMessage } from 'element-plus';
import { tableProps } from '@/api/modules/optCenter/aiPatrolManage/inspection';
import { useHandleData } from '@patrol/shared/hooks/useHandleData';
import { getDict, getDictForColumnFilters as dictForFilters, DefaultDict } from '@/utils/serviceDict';
import {
  droneList,
  droneDelete,
  droneUpdate,
  droneAdd,
  Row,
  droneDetail,
} from '@/api/modules/optCenter/deviceManage/drone';
import { getAreaListApi } from '@/api/modules/optCenter/inspectionSet/area';
import { useRoute, useRouter } from 'vue-router';
import formDialog from './formDialog.vue';
import { decryptPassword } from '@/views/optCenter/deviceManage/camera/usePWA';
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
/*
 **数据字典
 */
//监控设备类型

const typeDictlist = (await getDict('device_online_status')) as DefaultDict;

const route = useRoute();
const router = useRouter();
let cardTitle: ComputedRef<any> = computed(() => route.meta?.title!);
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
const columns = computed<tableProps<Row>[]>(() => [
  {
    type: 'selection',
    width: 60,
    selectable(e: any) {
      return !e.syncData;
    },
  },

  { type: 'index', label: t('table.sort'), width: 60 },
  {
    prop: 'droneName',
    label: t('camera.droneName'),
    minWidth: 120,
    search: {
      el: 'input',
      props: {
        placeholder: t('inputPlaceholder.placeholderEnter2'),
      },
    },
  },
  /* {
    prop: 'droneType',
    label: '无人机类型',
    minWidth: 120,
  },*/
  {
    prop: 'droneStatus',
    label: t('table.status'),
    minWidth: 120,
    filters: dictForFilters(typeDictlist),
    enum: typeDictlist,
  },
  {
    prop: 'areaName',
    label: t('overHaulArea.areaName'),
    minWidth: 120,
  },
  {
    prop: 'droneHost',
    label: t('common.ip'),
    minWidth: 120,
  },
  {
    prop: 'droneAccount',
    label: t('inputPlaceholder.username'),
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
  return droneList(newParams);
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
const openForm = async (title: string, rowData: { id: string } = { id: '' }) => {
  let nodeData = leftTree.value.element.getCurrentNode();
  if (title === t('buttonName.add')) {
    // if (nodeData) {
    if (nodeData.areaType == 2) {
      let params = {
        title,
        areaData: nodeData,
        rowData: {},
        isView: false,
        api: droneAdd,
        getTableList: proTable.value.getTableList,
      };
      formDialogRef.value.acceptParams(params);
    } else {
      ElMessage.warning(t('camera.tip7'));
    }
    /* } else {
      ElMessage.warning('请选择巡检区域！');
    } */
  } else {
    let params = {
      title,
      areaData: nodeData,
      rowData: await getSensorId(rowData.id),
      isView: title == t('buttonName.detail'),
      api: title == t('buttonName.edit') ? droneUpdate : '',
      getTableList: proTable.value.getTableList,
    };
    formDialogRef.value.acceptParams(params);
  }
};
async function getSensorId(id: string) {
  const { data } = await droneDetail({ id });
  return {
    ...data,
    dronePassword: await decryptPassword(data.dronePassword),
    droneHost: await decryptPassword(data.droneHost),
    droneAccount: await decryptPassword(data.droneAccount),
  };
}
// 批量删除表格数据
const batchDelete = async (id: string[]) => {
  await useHandleData(droneDelete, { ids: id.join() }, t('camera.tip8'));
  proTable.value.clearSelection();
  proTable.value.getTableList();
};
//删除表格数据
const deleteData = async (row: any) => {
  await useHandleData(droneDelete, { ids: row.id }, t('camera.tip9'));
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
