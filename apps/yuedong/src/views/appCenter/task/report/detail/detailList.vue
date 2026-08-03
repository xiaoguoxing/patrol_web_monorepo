<script setup lang="tsx">
import { ref, watch } from 'vue';
import { useBackFileUrl, useRemoveURLObject } from '@optCenter/hooks/use-file-utils';
import { Clock } from '@element-plus/icons-vue';
interface Props {
  objectList: any[];
  parentId: string;
  column: any[];
  showBtn?: boolean;
  syncData?: boolean;
  showOperation?: boolean;
}
const props = withDefaults(defineProps<Props>(), {
  showBtn: true,
  column: () => [],
  showOperation: true,
});

interface Emit {
  (e: 'setDetail', row: any): void;
}
const emit = defineEmits<Emit>();
//表格
const proTable = ref();
const urlArr = useRemoveURLObject();
const resColumns = [
  ...[
    props.showBtn
      ? {
          type: 'selection',
          label: '序号',
          selectable(e: { syncData: boolean }) {
            return !e.syncData;
          },
          width: 70,
        }
      : {},
  ],
  { type: 'index', label: '序号', width: 70 },
  {
    prop: 'areaName',
    label: '巡检区域',
    width: 200,
  },
  {
    prop: 'objectName',
    label: '巡检对象名称',
    width: 200,
  },
  {
    prop: 'itemName',
    label: '巡检项名称',
    width: 200,
  },
  {
    prop: 'recognitionResult',
    label: '识别结果',
    width: 150,
    render(scope: any) {
      // scadaResult
      return (
        <div class="recognitionResult">
          <span class={scope.row.comparisonStatus ? 'isred' : ''}>{scope.row.recognitionResult ?? '--'}</span>
          {scope.row?.isCheck ? (
            <el-tooltip
              effect="dark"
              content={`修正前：${scope.row?.recognitionResultBeforeCheck}`}
              placement="top-start"
            >
              <el-icon class="box-item" size="18">
                <Clock />
              </el-icon>
            </el-tooltip>
          ) : (
            <span></span>
          )}
        </div>
      );
    },
  },
  {
    prop: 'scadaResult',
    label: 'SCADA识别结果',
    width: 150,
  },
  ...props.column,
  { prop: 'operation', align: 'right', label: '操作', width: 80 },
];
const initParam = {};
watch(
  () => props.objectList,
  () => {
    proTable.value?.getTableList();
  }
);
function getListApi() {
  for (const objectListElement of props.objectList) {
    if (objectListElement.gatherPic) {
      useBackFileUrl(objectListElement.gatherPic, undefined, true).then((res) => {
        objectListElement.imgPath = res || '';
        urlArr.add(res!);
      });
    }
  }
  return {
    data: props.objectList,
  };
}

async function open(row: any) {
  emit('setDetail', row);
}
</script>

<template>
  <kr-pro-table
    ref="proTable"
    v-bind="$attrs"
    :title="'已选'"
    outBorder
    titleBorder
    :columns="resColumns"
    :requestApi="getListApi"
    :initParam="initParam"
    selectId="itemId"
    :pagination="false"
  >
    <!-- 表格 header 按钮 -->
    <template v-if="props.showBtn" #tableHeader="{}"> </template>
    <!-- 表格操作 -->
    <template #operation="{ row }">
      <el-button
        type="primary"
        v-if="showOperation"
        v-auth="'falsealarm'"
        :disabled="syncData"
        :title="syncData ? '同步的数据不支持此操作' : ''"
        link
        @click="open(row)"
        >复核</el-button
      >
    </template>
  </kr-pro-table>
</template>

<style scoped lang="scss">
:deep(.recognitionResult) {
  display: flex;
  align-items: center;
  width: 100%;
  height: 30px;
  .box-item {
    margin-left: 5px;
  }
  .isred {
    color: var(--el-color-danger);
  }
}
</style>
