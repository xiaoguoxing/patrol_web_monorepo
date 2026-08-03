<template>
  <div class="flex-1">
    <kr-card class="flex-1 two-col-page" :header="cardTitle" header-border>
      <kr-filter-tree
        class="two-col-page-lf"
        v-dragLine
        ref="areaTree"
        label="areaName"
        :data="dataSource"
        :defaultValue="defaultValue"
        @change="clickTreeNode"
      ></kr-filter-tree>
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
        <template #tableHeader="{ selectedListIds }">
          <el-button
            v-auth="'add'"
            icon="CirclePlus"
            :title="syncData ? '同步的数据不支持此操作' : ''"
            :disabled="syncData"
            type="primary"
            @click="openForm('新建')"
            >新建检修区域</el-button
          >
          <el-button
            icon="Delete"
            v-auth="'delete'"
            :disabled="!selectedListIds.length"
            @click="batchDelete(selectedListIds)"
            >删除</el-button
          >
        </template>
        <!-- 表格操作 -->
        <template #operation="scope">
          <el-button
            v-auth="'edit'"
            :disabled="scope.row.syncData"
            :title="scope.row.syncData ? '同步的数据不支持此操作' : ''"
            type="primary"
            link
            @click="openForm('编辑', scope.row)"
            >编辑</el-button
          >
          <el-button
            v-auth="'delete'"
            :disabled="scope.row.syncData"
            :title="scope.row.syncData ? '同步的数据不支持此操作' : ''"
            type="primary"
            link
            @click="deleteData(scope.row)"
            >删除</el-button
          >
        </template>
      </kr-pro-table>
    </kr-card>
    <formDialog ref="formDialogRef" />
  </div>
</template>
<script setup lang="tsx" name="areaManage">
import { ref, reactive, onBeforeMount, nextTick, ComputedRef, computed } from 'vue';
import { ElMessage } from 'element-plus';
import { ColumnProps } from '@/components/znxj-components/znxj-ui';
import { useHandleData } from '@/hooks/useHandleData';

import formDialog from './formDialog.vue';
import { getListApi, addApi, editApi, deleteApi } from '@/api/modules/optCenter/inspectionSet/OverhaulArea';
import { getAreaListApi } from '@/api/modules/optCenter/inspectionSet/area';
import { useRoute } from 'vue-router';
import { getDict, getDictForColumnFilters } from '@/utils/serviceDict';
import { Dict } from '@/api/modules/appCenter/alarm';
/*
  巡检区域功能
*/
const route = useRoute();
let cardTitle: ComputedRef<any> = computed(() => route.meta?.title!);
//树数据
const areaTree = ref();

const dataSource = ref();
const defaultValue = ref();
//请求获取区域树数据
const initTreeList = async () => {
  let { data } = await getAreaListApi();
  dataSource.value = data;
  if (data.length > 0) {
    defaultValue.value = data[0].id;
  }
};
await initTreeList();
let alarm_level: Dict = (await getDict('Overhaul_status')) as unknown as Dict;

const proTable = ref();
const searchProp = ref('objectName');
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
    prop: 'objectCode',
    label: '巡检对象编号',
  },
  {
    prop: 'objectName',
    label: '巡检对象名称',
    search: {
      el: 'input',
      key: 'searchValue',
      render(attr) {
        return (
          <el-input {...attr}>
            {{
              prepend: () => {
                return (
                  <el-select v-model={searchProp.value} placeholder={'请选择'} style={'width: 140px'}>
                    <el-option label="巡检对象名称" value={'objectName'} />
                    <el-option label="巡检对象编号" value={'objectCode'} />
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
    prop: 'areaName',
    label: '所属区域',
  },
  {
    prop: 'startTime',
    label: '检修开始时间',
  },
  {
    prop: 'endTime',
    label: '检修结束时间',
  },
  {
    prop: 'status',
    label: '状态',
    filterMultiple: false,
    filters: getDictForColumnFilters(alarm_level),
    enum: alarm_level,
  },
  { prop: 'operation', label: '操作', width: 200, fixed: 'right' },
];
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
  if (newParams.searchValue) {
    newParams[searchProp.value] = newParams.searchValue;
    delete newParams.searchValue;
  }
  newParams.page = newParams.pageNum;
  delete newParams.pageNum;
  return getListApi(newParams);
};
// 添加巡检对象
const formDialogRef = ref();
const openForm = (title: string, rowData: any = {}) => {
  let nodeData = areaTree.value.element.getCurrentNode();
  if (nodeData) {
    if (nodeData.areaType == 2) {
      rowData.areaId = nodeData.id;
      let params = {
        title: title,
        areaData: nodeData,
        rowData: { ...rowData },
        isView: title === '详情',
        api: title === '新建' ? addApi : title === '编辑' ? editApi : '',
        getTableList: proTable.value.getTableList,
      };
      formDialogRef.value.acceptParams(params);
    } else {
      ElMessage.warning('当前节点不可添加巡检对象，请选择正确的巡检区域！');
    }
  } else {
    ElMessage.warning('请选择巡检区域！');
  }
};
// 批量删除表格数据
const batchDelete = async (id: string[]) => {
  await useHandleData(deleteApi, { ids: id.join() }, '删除所选巡检对象');
  proTable.value.clearSelection();
  proTable.value.getTableList();
};
//删除表格数据
const deleteData = async (row: any) => {
  await useHandleData(deleteApi, { ids: row.id }, `删除该巡检对象`);
  proTable.value.getTableList();
};
</script>
<style lang="scss" scoped>
.el-tree-node__content:hover {
  .custom-tree-node-btns {
    display: flex;
  }
}
.custom-tree-node {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  overflow: hidden;
  &-label {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .custom-tree-node-btns {
    display: none;
    align-items: center;

    // width: 90px;
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
