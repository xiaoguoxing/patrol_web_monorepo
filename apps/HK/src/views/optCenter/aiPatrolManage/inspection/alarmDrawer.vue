<template>
  <el-drawer
    class="alarm-index-drawer"
    v-model="drawerVisible"
    :destroy-on-close="true"
    size="480px"
    :title="$t('inspection.alarmZbSet')"
  >
    <!-- <el-form ref="ruleFormRef" label-width="0" :model="tableSource"> -->
    <el-table ref="proTable" :data="tableSource.indexList">
      <el-table-column v-for="(col, index) in columns" :label="col.label" :key="index">
        <template #default="scope">
          <!-- <el-form-item
              :prop="'indexList.' + index + '.' + col.prop"
              :rules="{
                required: true,
                message: '请输入',
                trigger: 'blur',
              }"
            > -->
          <el-input
            v-if="scope.row[index]"
            @keyup.enter="scope.row[index] = false"
            @blur="scope.row[index] = false"
            v-model="scope.row[col.prop]"
          />
          <div v-else class="table-v2-inline-editing-trigger" @click="scope.row[index] = true">
            {{ scope.row[col.prop] }}
          </div>
          <!-- </el-form-item> -->
        </template>
      </el-table-column>
      <!-- 表格操作 -->
      <el-table-column :label="$t('table.operation')" width="180">
        <template #default="scope">
          <el-button type="primary" link @click="deleteData(scope.row, scope.$index)">{{ $t('ui.delete') }}</el-button>
        </template>
      </el-table-column>
      <template #append>
        <el-button class="add-btn" icon="CirclePlus" type="primary" link @click="addData()">{{
          $t('buttonName.add2')
        }}</el-button>
      </template>
    </el-table>
    <!-- </el-form> -->
    <template #footer>
      <el-button @click="drawerVisible = false">{{ $t('ui.cancel') }}</el-button>
      <el-button type="primary" @click="handleSubmit">{{ $t('buttonName.save') }}</el-button>
    </template>
  </el-drawer>
</template>

<script setup lang="ts" name="AlarmDrawer">
import { computed, ref } from 'vue';
import { ElMessage, FormInstance } from 'element-plus';
import { ColumnProps } from '@patrol/ui';
import { useHandleData } from '@patrol/shared/hooks/useHandleData';

import {
  getIndexListApi,
  deleteIndexApi,
  editIndexApi,
  addIndexApi,
  AlarmIndex,
} from '@/api/modules/optCenter/inspectionSet/alarm';
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
interface DrawerProps {
  title: string;
}

// drawer框状态
const drawerVisible = ref(false);
const drawerProps = ref<DrawerProps>({
  title: '',
});

// 接收父组件传过来的参数
const acceptParams = async (params: DrawerProps): void => {
  drawerProps.value = params;
  drawerVisible.value = true;
  tableSource.value.indexList = (await getIndexListApi()).data;
};

// 表格测试数据
const tableSource = ref<{ indexList: AlarmIndex.ReqPostParams[] }>({
  indexList: [
    { id: '1', indexName: '测试', indexUnit: '1' },
    { id: '2', indexName: '测试', indexUnit: '2' },
    { id: '3', indexName: '测试', indexUnit: '3' },
    { id: '4', indexName: '测试', indexUnit: '4' },
    { id: '5', indexName: '测试', indexUnit: '5' },
    { id: '6', indexName: '测试', indexUnit: '6' },
  ],
});
// 表格配置项
const columns = computed<ColumnProps[]>(() => [
  {
    prop: 'indexName',
    label: t('inspection.indexName'),
  },

  {
    prop: 'indexUnit',
    label: t('inspection.indexUnit'),
  },
]);
//删除表格数据
const deleteData = async (row: any, index: number) => {
  if (row.id) {
    //TODO
    //1、记录删除的id;保存时才删除
    //2、直接提示删除，确定直接删除
    await useHandleData(deleteIndexApi, { id: row.id }, t('inspection.indexDel'));
    tableSource.value.indexList.splice(index, 1);
  } else {
    tableSource.value.indexList.splice(index, 1);
  }
};
//添加表格数据
const addData = () => {
  tableSource.value.indexList.push({
    indexName: '',
    indexUnit: '',
  });
};

// 提交数据（新增/编辑）
const handleSubmit = async () => {
  if (
    tableSource.value.indexList.find((item) => {
      return item.indexName == '';
    })
  ) {
    ElMessage.warning({
      message: t('inspection.Msg5'),
    });
    return false;
  }
  try {
    let newList = tableSource.value.indexList.filter((item) => !item.id);
    let updateList = tableSource.value.indexList.filter((item) => item.id);
    newList.forEach(async (item) => {
      await addIndexApi(item);
    });
    updateList.forEach(async (item) => {
      await editIndexApi(item);
    });
    ElMessage.success({
      message: `${drawerProps.value.title} ${t('buttonName.success')}！`,
    });
    drawerVisible.value = false;
  } catch (error) {
    console.log(error);
  }
};

defineExpose({
  acceptParams,
});
tableSource.value.indexList = (await getIndexListApi()).data;
</script>
<style lang="scss" scoped>
.alarm-index-drawer {
  .el-table {
    :deep(.el-table__inner-wrapper::before) {
      height: 0;
    }
  }
  .add-btn {
    justify-content: flex-start;
    width: 100%;
    height: 50px;
    padding-left: 12px;
  }
  .table-v2-inline-editing-trigger {
    height: 23px;
    border: 1px transparent dotted;
  }
  .table-v2-inline-editing-trigger:hover {
    border-color: var(--el-color-primary);
  }
}
</style>
