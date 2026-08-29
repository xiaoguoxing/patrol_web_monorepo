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
          <el-button v-auth="'add'" icon="CirclePlus" type="primary" @click="openForm($t('buttonName.add'))">{{
            $t('buttonName.add') + $t('aiInspection.taskTypeName')
          }}</el-button>
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
          <el-button v-auth="'edit'" type="primary" link @click="openForm($t('buttonName.edit'), scope.row)">{{
            $t('buttonName.edit')
          }}</el-button>
          <el-button v-auth="'delete'" type="primary" link @click="deleteData(scope.row)">{{
            $t('ui.delete')
          }}</el-button>
        </template>
      </kr-pro-table>
    </kr-card>
    <formDialog ref="formDialogRef" />
  </div>
</template>
<script setup lang="tsx" name="TaskType">
import { computed, ComputedRef, ref } from 'vue';
import { ColumnProps } from '@patrol/ui';
import { useHandleData } from '@patrol/shared/hooks/useHandleData';
import formDialog from './formDialog.vue';
import { getListApi, deleteApi, editApi, addApi, TaskType } from '@/api/modules/optCenter/inspectionSet/taskType';
import { Warning } from '@element-plus/icons-vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
const route = useRoute();
let cardTitle: ComputedRef<any> = computed(() => route.meta?.title!);
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
const columns  = computed<ColumnProps[]>(()=>[
  { type: 'selection', width: 60 },

  { type: 'index', label: t('table.sort'), width: 60 },
  {
    prop: 'taskType',
    label: t('task.taskTypeName'),
    search: {
      el: 'input',
      props: {
        placeholder: t('task.taskTypeNamePlaceholder'),
      },
    },
  },

  {
    prop: 'priorityLevel',
    label: t('task.priorityLevel'),
    // 使用 headerRender 自定义表头
    headerRender: (scope) => {
      return (
        <span>
          {t('task.priorityLevel')}
          <el-tooltip content={t('task.priorityLevelTip')} effect="light" placement="top">
            <el-icon>
              <Warning />
            </el-icon>
          </el-tooltip>
        </span>
      );
    },
  },
  { prop: 'operation', label: t('table.operation'), width: 200, fixed: 'right' },
]);

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
    isView: title === t('buttonName.detail'),
    api: title === t('buttonName.add') ? addApi : title === t('buttonName.edit') ? editApi : '',
    getTableList: proTable.value.getTableList,
  };
  formDialogRef.value.acceptParams(params);
};
// 批量删除表格数据
const batchDelete = async (id: string[]) => {
  await useHandleData(deleteApi, { ids: id.join() }, t('task.msg1'));
  proTable.value.clearSelection();
  proTable.value.getTableList();
};
//删除表格数据
const deleteData = async (row: any) => {
  await useHandleData(deleteApi, { ids: row.id }, t('task.msg2'));
  proTable.value.getTableList();
};
</script>
<style lang="scss" scoped></style>
