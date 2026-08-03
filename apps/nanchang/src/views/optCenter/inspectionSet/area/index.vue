<template>
  <div class="flex-1">
    <kr-card class="flex-1 two-col-page" header="巡检区域管理" header-border>
      <kr-filter-tree
        class="two-col-page-lf"
        v-dragLine
        ref="areaTree"
        label="areaName"
        :data="dataSource"
        :defaultValue="defaultValue"
        @change="clickTreeNode"
      >
        <template #default="{ node, data }">
          <span class="custom-tree-node">
            <!-- <el-tooltip :content="node.label" effect="light" placement="bottom-start" :offset="0"> -->
            <span class="custom-tree-node-label">{{ node.label }}</span>
            <!-- </el-tooltip> -->

            <span class="custom-tree-node-btns" v-if="data.syncData === false">
              <a class="mr12" v-auth="'addNode'" @click.stop="openTreeDialog('新建', node, data)">
                <el-icon><CirclePlus /></el-icon>
              </a>
              <a
                class="mr12"
                v-auth="'editNode'"
                v-if="data.areaType == 2"
                @click.stop="openTreeDialog('编辑', node, data)"
              >
                <el-icon><Edit /></el-icon>
              </a>
              <a class="mr12" v-auth="'deleteNode'" v-if="data.areaType == 2" @click.stop="deleteTreeData(data)">
                <el-icon><Delete /></el-icon>
              </a>
            </span>
          </span>
        </template>
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
            v-auth="'new'"
            icon="CirclePlus"
            :title="syncData ? '同步的数据不支持此操作' : ''"
            :disabled="syncData"
            type="primary"
            @click="openForm('新建')"
            >新建巡检对象</el-button
          >
          <el-button
            v-auth="'add'"
            icon="CirclePlus"
            :title="syncData ? '同步的数据不支持此操作' : ''"
            :disabled="syncData"
            type="primary"
            @click="openForm('添加')"
            >添加巡检对象</el-button
          >
          <el-button
            v-auth="'batchDelete'"
            icon="Delete"
            :title="syncData ? '同步的数据不支持此操作' : ''"
            @click="batchDelete(scope.selectedListIds)"
            :disabled="syncData || !scope.isSelected"
            >删除</el-button
          >
        </template>
        <!-- 表格操作 -->
        <template #operation="scope">
          <el-button
            v-auth="'edit'"
            v-if="scope.row.objectSource == 'add'"
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
          <el-button
            v-auth="'edit'"
            v-show="scope.row.syncData"
            type="primary"
            link
            @click="openForm('详情', scope.row)"
            >详情</el-button
          >
        </template>
      </kr-pro-table>
    </kr-card>
    <TreeFormDialog ref="treeDialogRef" />
    <formDialog ref="formDialogRef" />
    <selDialog ref="selDialogRef" />
  </div>
</template>
<script setup lang="tsx" name="areaManage">
import { ref, reactive, onBeforeMount, nextTick } from 'vue';
import { ElMessage } from 'element-plus';
import { ColumnProps } from '@/components/znxj-components/znxj-ui';
import { useHandleData } from '@/hooks/useHandleData';

import TreeFormDialog from './treeFormDialog.vue';
import formDialog from './formDialog.vue';
import selDialog from './selDialog.vue';
import {
  getAreaListApi,
  deleteAreaApi,
  editAreaApi,
  addAreaApi,
  getListApi,
  deleteApi,
  editApi,
  addApi,
  addSeledApi,
  Area,
  InspectionObj,
} from '@/api/modules/optCenter/inspectionSet/area';
/*
  巡检区域功能
*/

//树数据
const areaTree = ref();

const dataSource = ref<Area.ResList[]>();
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
//请求获取区域树数据
const getTreeList = async () => {
  let { data } = await getAreaListApi();
  dataSource.value = data;
  nextTick(() => {
    areaTree.value.setTreeData();
    nextTick(() => {
      areaTree.value.element.setCurrentKey(initParam.areaId);
    });
  });
  return Promise.resolve(data);
};

// 打开 treeDialog(新增、查看、编辑)
const treeDialogRef = ref();
const openTreeDialog = (title: string, node: any = {}, data: any = {}) => {
  let parentData,
    api,
    rowData = {};
  if (title === '新建') {
    parentData = { ...data };
    rowData = {
      areaName: '',
      areaExplain: '',
      pid: data.id,
      pidSource: data.areaType,
    };
    api = addAreaApi;
  } else {
    parentData = { ...node.parent.data };
    api = editAreaApi;
    rowData = { ...data };
  }
  let params = {
    title,
    parentData,
    rowData,
    isView: title === '详情',
    api,
    getList: getTreeList,
  };
  treeDialogRef.value.acceptParams(params);
};

//删除树节点区域
const deleteTreeData = async (node: any) => {
  await useHandleData(deleteAreaApi, { id: node.id }, `删除该巡检区域`);
  let { data } = await getAreaListApi();
  dataSource.value = data;
  if (initParam.areaId == node.id) {
    if (data.length > 0) {
      initParam.areaId = data[0].id;
    }
  }
  nextTick(() => {
    areaTree.value.setTreeData();
    nextTick(() => {
      areaTree.value.element.setCurrentKey(initParam.areaId);
    });
  });
};
/*
巡检对象树表 选择器

*/
/*
  巡检对象功能

*/
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
                  <el-select v-model={searchProp.value} placeholder="请选择" style={'width: 140px'}>
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
const selDialogRef = ref();
const formDialogRef = ref();
const openForm = (title: string, rowData: Partial<InspectionObj.ResList> = {}) => {
  let nodeData = areaTree.value.element.getCurrentNode();
  if (nodeData) {
    if (nodeData.areaType == 2) {
      rowData.areaId = nodeData.id;
      let params = {
        title: title,
        areaData: nodeData,
        rowData: { ...rowData },
        isView: title === '详情',
        api: title === '添加' ? addSeledApi : title === '新建' ? addApi : title === '编辑' ? editApi : '',
        getTableList: proTable.value.getTableList,
      };
      if (title === '添加') {
        selDialogRef.value.acceptParams(params);
      } else {
        formDialogRef.value.acceptParams(params);
      }
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
