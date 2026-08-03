<template>
  <div class="flex-1">
    <kr-card class="flex-1" header="巡检任务类型配置" header-border>
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
          <el-button v-auth="'add'" icon="CirclePlus" type="primary" @click="openForm('新建')">新建任务类型</el-button>
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
          <el-button v-auth="'edit'" type="primary" link @click="openForm('编辑', scope.row)">编辑</el-button>
          <el-button v-auth="'delete'" type="primary" link @click="deleteData(scope.row)">删除</el-button>
        </template>
      </kr-pro-table>
    </kr-card>
    <formDialog ref="formDialogRef" />
  </div>
</template>
<script setup lang="tsx" name="TaskType">
import { ref, reactive } from 'vue';
import { ElMessage } from 'element-plus';
import { ColumnProps } from '@patrol/ui';
import { useHandleData } from '@patrol/shared/hooks/useHandleData';
import formDialog from './formDialog.vue';
import { getListApi, deleteApi, editApi, addApi, TaskType } from '@/api/modules/optCenter/inspectionSet/taskType';
import { removeGlobalNode } from 'element-plus/es/utils';
import { Warning } from '@element-plus/icons-vue';
/*
任务类型树表 选择器

*/
/*
  任务类型功能

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
  { id: '1', taskType: '测试', priorityLevel: 1 },
  { id: '2', taskType: '测试', priorityLevel: 2 },
  { id: '3', taskType: '测试', priorityLevel: 3 },
  { id: '4', taskType: '测试', priorityLevel: 4 },
  { id: '5', taskType: '测试', priorityLevel: 5 },
  { id: '6', taskType: '测试', priorityLevel: 6 },
];
// 表格配置项
const columns: ColumnProps[] = [
  { type: 'selection', width: 60 },

  { type: 'index', label: '序号', width: 60 },
  {
    prop: 'taskType',
    label: '任务类型名称',
    search: {
      el: 'input',
      props: {
        placeholder: '请输入您想搜索的任务类型名称',
      },
    },
  },

  {
    prop: 'priorityLevel',
    label: '执行优先级',
    // 使用 headerRender 自定义表头
    headerRender: (scope) => {
      return (
        <span>
          执行优先级
          <el-tooltip content="任务类型执行有优先级, 数值1~10，数值越小，执行优先级越高" effect="light" placement="top">
            <el-icon>
              <Warning />
            </el-icon>
          </el-tooltip>
        </span>
      );
    },
  },
  { prop: 'operation', label: '操作', width: 200, fixed: 'right' },
];

// 获取表格数据
const getTableList = (params: any) => {
  let newParams = { ...params };
  newParams.page = newParams.pageNum;
  delete newParams.pageNum;
  return getListApi(newParams);
};
// 新增任务类型
const formDialogRef = ref();
const openForm = (title: string, rowData: Partial<TaskType.ResList> = {}) => {
  let params = {
    title,
    rowData: { ...rowData },
    isView: title === '详情',
    api: title === '新建' ? addApi : title === '编辑' ? editApi : '',
    getTableList: proTable.value.getTableList,
  };
  formDialogRef.value.acceptParams(params);
};
// 批量删除表格数据
const batchDelete = async (id: string[]) => {
  await useHandleData(deleteApi, { ids: id.join() }, '删除所选任务类型');
  proTable.value.clearSelection();
  proTable.value.getTableList();
};
//删除表格数据
const deleteData = async (row: any) => {
  await useHandleData(deleteApi, { ids: row.id }, `删除该任务类型`);
  proTable.value.getTableList();
};
</script>
<style lang="scss" scoped></style>
