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
      >
        <template #default="{ node, data }">
          <span class="custom-tree-node">
            <!-- <el-tooltip :content="node.label" effect="light" placement="bottom-start" :offset="0"> -->
            <span class="custom-tree-node-label">{{ node.label }}</span>
            <!-- </el-tooltip> -->

            <span class="custom-tree-node-btns" v-if="data.syncData === false">
              <a class="mr12" v-auth="'addNode'" @click.stop="openTreeDialog($t('buttonName.add'), node, data)">
                <el-icon><CirclePlus /></el-icon>
              </a>
              <a
                class="mr12"
                v-auth="'editNode'"
                v-if="data.areaType == 2"
                @click.stop="openTreeDialog($t('buttonName.edit'), node, data)"
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
            :title="syncData ? $t('buttonName.syncData') : ''"
            :disabled="syncData"
            type="primary"
            @click="openForm($t('buttonName.add'))"
            >{{ $t('buttonName.add') }}{{ $t('overHaulArea.object') }}</el-button
          >
          <el-button
            v-auth="'add'"
            icon="CirclePlus"
            :title="syncData ? $t('buttonName.syncData') : ''"
            :disabled="syncData"
            type="primary"
            @click="openForm($t('buttonName.add2'))"
            >{{ $t('buttonName.add2') }}{{ $t('overHaulArea.object') }}</el-button
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
        <!-- 表格操作 -->
        <template #operation="scope">
          <el-button
            v-auth="'edit'"
            v-if="scope.row.objectSource == 'add'"
            :disabled="scope.row.syncData"
            :title="scope.row.syncData ? $t('buttonName.syncData') : ''"
            type="primary"
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
            v-auth="'edit'"
            v-show="scope.row.syncData"
            type="primary"
            link
            @click="openForm($t('buttonName.detail'), scope.row)"
            >{{ $t('buttonName.detail') }}</el-button
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
import { ref, reactive, onBeforeMount, nextTick, ComputedRef, computed } from 'vue';
import { ElMessage } from 'element-plus';
import { ColumnProps } from '@patrol/ui';
import { useHandleData } from '@patrol/shared/hooks/useHandleData';

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
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
import { useRoute } from 'vue-router';
const route = useRoute();
let cardTitle: ComputedRef<any> = computed(() => route.meta?.title!);
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
  if (title === t('buttonName.add')) {
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
    isView: title === t('buttonName.detail'),
    api,
    getList: getTreeList,
  };
  treeDialogRef.value.acceptParams(params);
};

//删除树节点区域
const deleteTreeData = async (node: any) => {
  await useHandleData(deleteAreaApi, { id: node.id }, t('linkageSet.msg4'));
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

  { type: 'index', label: t('table.sort'), width: 60 },
  {
    prop: 'objectCode',
    label: t('overHaulArea.objectCode'),
  },
  {
    prop: 'objectName',
    label: t('aiInspection.objectName'),
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
                    <el-option label={t('aiInspection.objectName')} value={'objectName'} />
                    <el-option label={t('overHaulArea.objectCode')} value={'objectCode'} />
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
    label: t('overHaulArea.areaName'),
  },
  { prop: 'operation', label: t('table.operation'), width: 200, fixed: 'right' },
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
        isView: title === t('buttonName.detail'),
        api:
          title === t('buttonName.add2')
            ? addSeledApi
            : title === t('buttonName.add')
            ? addApi
            : title === t('buttonName.edit')
            ? editApi
            : '',
        getTableList: proTable.value.getTableList,
      };
      if (title === t('buttonName.add2')) {
        selDialogRef.value.acceptParams(params);
      } else {
        formDialogRef.value.acceptParams(params);
      }
    } else {
      ElMessage.warning(t('overHaulArea.msg1'));
    }
  } else {
    ElMessage.warning(t('overHaulArea.msg2'));
  }
};
// 批量删除表格数据
const batchDelete = async (id: string[]) => {
  await useHandleData(deleteApi, { ids: id.join() }, t('overHaulArea.msg3'));
  proTable.value.clearSelection();
  proTable.value.getTableList();
};
//删除表格数据
const deleteData = async (row: any) => {
  await useHandleData(deleteApi, { ids: row.id }, t('overHaulArea.msg4'));
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
