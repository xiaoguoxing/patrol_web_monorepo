<script setup lang="tsx">
import { computed, ref, watch } from 'vue';
import { useBackFileUrl, useRemoveURLObject } from '@optCenter/hooks/use-file-utils';
import { Clock } from '@element-plus/icons-vue';
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
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
const resColumns = computed(() => [
  ...[
    props.showBtn
      ? {
          type: 'selection',
          label: t('table.sort'),
          selectable(e: { syncData: boolean }) {
            return !e.syncData;
          },
          width: 70,
        }
      : {},
  ],
  { type: 'index', label: t('table.sort'), width: 70 },
  {
    prop: 'areaName',
    label: t('aiInspection.areaName'),
    width: 200,
  },
  {
    prop: 'objectName',
    label: t('aiInspection.objectName'),
    width: 220,
  },
  {
    prop: 'itemName',
    label: t('task.itemName'),
    width: 220,
  },
  {
    prop: 'recognitionResult',
    label: t('aiInspection.recognitionResult'),
    width: 180,
    render(scope: any) {
      // scadaResult
      return (
        <div class="recognitionResult">
          <span class={scope.row.comparisonStatus ? 'isred' : ''}>{scope.row.recognitionResult ?? '--'}</span>
          {scope.row?.isCheck ? (
            <el-tooltip
              effect="dark"
              content={`${t('task.beforeValue')}：${scope.row?.recognitionResultBeforeCheck}`}
              placement="top-start"
            >
              <el-icon class="box-item" size="18">
                <Clock />
              </el-icon>
            </el-tooltip>
          ) : (
            <span></span>
          )}
          {scope.row?.scadaResult ? <span>{scope.row?.gatherTime ?? '--'}</span> : ''}
        </div>
      );
    },
  },
  {
    prop: 'scadaResult',
    label: t('alarm.scadaResult'),
    width: 170,
    render(scope: any) {
      // scadaResult
      return (
        <div class="recognitionResult">
          <span>{scope.row.scadaResult ?? '--'}</span>
          {scope.row?.scadaResult ? <span>{scope.row?.scadaTime ?? '--'}</span> : ''}
        </div>
      );
    },
  },
  ...props.column,
  { prop: 'operation', align: 'right', label: t('table.operation'), width: 150, fixed: 'right' },
]);
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
        :title="syncData ? $t('buttonName.syncData') : ''"
        link
        @click="open(row)"
        >{{ $t('task.Fh') }}</el-button
      >
    </template>
  </kr-pro-table>
</template>

<style scoped lang="scss">
:deep(.recognitionResult) {
  display: flex;
  flex-direction: column;
  width: 100%;
  .box-item {
    margin-left: 5px;
  }
  .isred {
    color: var(--el-color-danger);
  }
}
</style>
