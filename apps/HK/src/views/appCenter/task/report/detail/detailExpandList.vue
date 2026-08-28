<script setup lang="tsx">
import { computed, ref, watch } from 'vue';
import { useBackFileUrl, useRemoveURLObject } from '@optCenter/hooks/use-file-utils';
import { Clock } from '@element-plus/icons-vue';
import { useTimeoutFn } from '@vueuse/core';
import { useRouter } from 'vue-router';
import { GlobalStore } from '@/stores';
import { cameraInTask } from '@/api/modules/camera';
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
const node_env = import.meta.env.VITE_USER_NODE_ENV;
const globalStore = GlobalStore();
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
const proTableEl = computed(() => proTable.value.element);
const proTableSubRef = ref();
const urlArr = useRemoveURLObject();
const resColumns = computed(() => [
  { type: 'expand', label: '', width: 1 },
  { type: 'index', label: t('table.sort'), width: 70 },
  {
    prop: 'areaName',
    label: t('aiInspection.areaName'),
  },
  {
    prop: 'objectName',
    label: t('aiInspection.objectName'),
  },
  {
    prop: 'objectName1',
    label: t('aiInspection.inspectionRes'),
  },
  {
    prop: 'conclusion',
    label: t('aiInspection.inspectionResult'),
  },
]);
const resColumnsSub = computed(() => [
  {
    prop: 'itemName',
    label: t('task.itemName'),
    minWidth: 180,
  },
  {
    prop: 'recognitionResult',
    label: t('aiInspection.recognitionResult'),
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
          {scope.row?.scadaResult ? <span style="padding-left:10px"> ({scope.row?.gatherTime ?? '--'})</span> : ''}
        </div>
      );
    },
    minWidth: 150,
  },
  {
    prop: 'scadaResult',
    label: t('alarm.scadaResult'),
    render(scope: any) {
      // scadaResult
      return (
        <div class="recognitionResult">
          <span>{scope.row?.scadaResult ?? '--'}</span>
          {scope.row?.scadaResult ? <span style="padding-left:10px">({scope.row?.scadaTime ?? '--'})</span> : ''}
        </div>
      );
    },
    minWidth: 120,
  },
  ...props.column,
  { prop: 'operation', align: 'right', label: t('table.operation'), width: 130 },
]);
let subList = ref<any[]>([]);
let subListId = ref<any[]>([]);
const initParam = {};
watch(
  () => props.objectList,
  (value) => {
    proTable.value?.getTableList();
    useTimeoutFn(() => {
      value.forEach((row) => {
        proTableEl.value.toggleRowExpansion(row, false);
      });
      /*useTimeoutFn(() => {
        value.forEach((row) => {
          if (subListId.value.includes(row.objectId)) proTableEl.value.toggleRowExpansion(row, true);
        });
      }, 100);*/
    }, 100);
  }
);
function getListApi() {
  /*for (const objectListElement of props.objectList) {
    if (objectListElement.gatherPic) {
      useBackFileUrl(objectListElement.gatherPic, undefined, true).then((res) => {
        objectListElement.imgPath = res || '';
        urlArr.add(res!);
      });
    }
  }*/
  return {
    data: props.objectList,
  };
}
function getListApiSub() {
  for (const objectListElement of subList.value) {
    if (objectListElement.gatherPic && !objectListElement.imgPath) {
      useBackFileUrl(objectListElement.gatherPic, undefined, true).then((res) => {
        objectListElement.imgPath = res || '';
        urlArr.add(res!);
      });
    }
  }
  return {
    data: subList.value,
  };
}
async function open(row: any) {
  emit('setDetail', row);
}
async function expandRow(row: any, scopeData: { $index: number; expanded: boolean }) {
  proTableEl.value.toggleRowExpansion(row);
  subList.value = row.itemList ?? [];
  if (!scopeData.expanded) {
    subListId.value.push(row.objectId);
    useTimeoutFn(() => {
      let target = proTableSubRef.value;
      target?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  } else {
    let i = subListId.value.findIndex((i) => i === row.objectId);
    subListId.value.splice(i, 1);
  }
}
const router = useRouter();
async function goPath(row: any) {
  try {
    let { id, presetPositionInfo } = await getCamera(row.itemId);
    let path = `/patrolInspection/appCenter/inspectionMonitor/watchingMonitor`;
    let res = router.resolve({
      path: path,
      query: {
        id: id,
        presetPositionInfo: presetPositionInfo,
        token: props.syncData ? globalStore.token : undefined,
      },
    });
    if (props.syncData) {
      let baseUrl = import.meta.env.VITE_SYS_URL;
      window.open(`${baseUrl}/${res.href}`, '_blank');
    } else {
      window.open(res.href, '_blank');
    }
  } catch (e) {}
}
async function getCamera(itemId: string) {
  let res = await cameraInTask({ itemId });
  return {
    id: res.data.cameraId,
    presetPositionInfo: res.data.presetPositionInfo,
  };
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
    :operationBtn="true"
    selectId="objectId"
    :pagination="false"
    :border="false"
  >
    <template #objectName1="{ row }">
      <div class="badgeItems flx-align-center">
        <div class="badgeItem">
          <div class="badgeLabel">{{ $t('task.badgeItem1') }}:</div>
          <div class="badgeValue" :class="row.abnormalNum ? 'text1' : 'defaultText'">{{ row.abnormalNum }}</div>
        </div>
        <div class="badgeItem">
          <div class="badgeLabel">{{ $t('task.badgeItem2') }}:</div>
          <div class="badgeValue" :class="row.normalNum ? 'text2' : 'defaultText'">{{ row.normalNum }}</div>
        </div>
        <div class="badgeItem">
          <div class="badgeLabel">{{ $t('task.badgeItem3') }}:</div>
          <div class="badgeValue" :class="row.noDoneNum ? 'text3' : 'defaultText'">{{ row.noDoneNum }}</div>
        </div>
      </div>
    </template>
    <template #objectName="{ row, scopeData }">
      <div
        class="flx-align-center expandObjName"
        :class="{ expandClass: scopeData.expanded }"
        style="cursor: pointer"
        @click="expandRow(row, scopeData)"
      >
        <el-icon v-if="scopeData.expanded" class="mr7 expandLabel"><ArrowUp /></el-icon>
        <el-icon v-else class="mr7 expandLabel"><ArrowDown /></el-icon>
        <span class="expandValue">{{ row.objectName }}</span>
      </div>
    </template>
    <template #expand>
      <div ref="proTableSubRef" class="proTableSub mr20 ml20 pr20 pl20 pb10">
        <kr-pro-table
          :columns="resColumnsSub"
          :requestApi="getListApiSub"
          :initParam="initParam"
          selectId="id"
          :operationBtn="props.showBtn"
          :pagination="false"
          :border="false"
        >
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
            <el-button
              type="primary"
              v-if="showOperation"
              :disabled="syncData"
              :title="syncData ? $t('buttonName.syncData') : ''"
              link
              @click="goPath(row)"
              >{{ $t('task.openWind') }}</el-button
            >
          </template>
        </kr-pro-table>
      </div>
    </template>
  </kr-pro-table>
</template>

<style scoped lang="scss">
:deep(.recognitionResult) {
  display: flex;
  width: 100%;
  height: 30px;
  .box-item {
    margin-left: 5px;
  }
  .isred {
    color: var(--el-color-danger);
  }
}
:deep(.el-table__expand-icon) {
  display: none;
}
:deep(.el-table__expanded-cell) {
  padding: 20px 0;
  border-bottom: none !important;
}
.proTableSub {
  border-radius: 8px;
  box-shadow: 0 0 20px 0 rgb(13 96 180 / 30%);
  :deep(.el-table) {
    --el-table-header-bg-color: #ffffff;
    --el-table-border-color: transparent;
    --el-table-header-text-color: #666666;
    --el-table-border: 1px solid transparent;
    .el-table__header {
      th {
        height: 44px;
      }
      th.el-table__cell .cell {
        font-size: 14px;
      }
      th.el-table__cell.is-leaf {
        border-bottom: 1px solid var(--el-border-color-light2);
      }
      .el-table__cell {
        padding: 5px 0;
      }
    }
    .el-table__body {
      .el-table__cell {
        padding: 2px 0;
        .cell {
          font-size: 12px;
          color: #999999;
          button > span {
            font-size: 12px;
          }
        }
      }
      .el-table__row {
        height: 36px;
      }
    }
  }
}
.badgeItems {
  .badgeItem {
    display: flex;
    margin-right: 10px;
    font-size: 14px;
    .badgeLabel {
      margin-right: 6px;
    }
    .badgeValue {
      height: 20px;
      padding: 0 10px;
      color: #ffffff;
      border-radius: 10px;
      &.defaultText {
        color: var(--el-text-color-regular);
        background: #e6e6e6;
      }
      &.text1 {
        background-color: #ea3939;
      }
      &.text2 {
        background-color: #2ebc5d;
      }
      &.text3 {
        background-color: #fa802f;
      }
    }
  }
}
.expandObjName {
  .expandLabel {
    padding: 2px;
    color: #ffffff;
    background: #999999;
    border-radius: 50%;
  }
}
.expandClass {
  .expandValue {
    color: var(--el-color-primary);
  }
  .expandLabel {
    color: #ffffff;
    background: var(--el-color-primary);
  }
}
</style>
