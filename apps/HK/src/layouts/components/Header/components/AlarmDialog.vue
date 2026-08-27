<script setup lang="ts">
import { getAlarmListApi, Row } from '@/api/modules/alarmDialog';
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue';
import { tableProps } from '@/api/modules/optCenter/aiPatrolManage/inspection';
import { useElementSize, useParentElement, useTimeoutFn, useToNumber, useTransition } from '@vueuse/core';
import { useRouter } from 'vue-router';
import { Dict } from '@/api/modules/appCenter/alarm';
import { getDict, getDictForColumnFilters } from '@/utils/serviceDict';
import { getNeedBusinessApi } from '@/api/modules/common';
import { useI18n } from 'vue-i18n';
const { t: ti } = useI18n();
let alarm_level: Dict = (await getDict('alarm_level')) as unknown as Dict;
const proTable = ref();
const initParam = reactive({});
const columns: tableProps<Row>[] = [
  {
    prop: 'alarmTime',
    label: ti('alarm.alarmTime'),
    sortable: true,
  },
  {
    prop: 'alarmAreaName',
    label: ti('alarm.alarmAreaName'),
  },
  {
    prop: 'alarmObjectName',
    label: ti('alarm.alarmObjectName'),
  },
  {
    prop: 'alarmItemName',
    label: ti('alarm.alarmItemName'),
  },
  {
    prop: 'recognitionResult',
    label: ti('alarm.recognitionResult'),
  },
  {
    prop: 'alarmRules',
    label: ti('alarm.alarmRules'),
  },
  {
    prop: 'alarmGrade',
    label: ti('alarm.alarmGrade'),
    filters: getDictForColumnFilters(alarm_level!),
    enum: alarm_level,
  },
];
let input3 = ref('');
let select = ref('alarmAreaName');
const dataCallback = (data: any) => {
  s.value = data.count;
  return data.list;
};
const getTableList = async () => {
  let obj = {
    [select.value]: input3.value || undefined,
  };
  return getAlarmListApi(obj);
};
const router = useRouter();
function rowClick(params: any) {
  let url = '/patrolInspection/appCenter/appCenterAlarm';
  let queryObj = {
    id: params?.id,
    pageType: params ? 'detail' : 'list',
  };
  if (!params) {
    delete queryObj.id;
  }
  const res = router.resolve({
    path: url,
    query: queryObj,
  });
  window.open(res.href, '_blank');
}
/*let inputChange = useDebounceFn(() => {
  if (input3.value !== '') {
    proTable.value.getTableList();
  }
}, 1000);*/
let inputChange = () => {
  proTable.value.getTableList();
};
function resAlarmGradeStyle(alarmGrade: string) {
  let obj = alarm_level.find((i) => i.value === alarmGrade);
  let styleStr = '';
  if (obj?.remark !== undefined) {
    let styleObj = JSON.parse(obj.remark ?? '{}');
    for (let item of Object.keys(styleObj)) {
      styleStr += item + ':' + styleObj[item] + ';';
    }
  }
  return styleStr;
}
function resAlarmGradeLabel(alarmGrade: string) {
  let obj = alarm_level.find((i) => i.value === alarmGrade);
  let styleStr = '';
  if (obj?.label !== undefined) {
    styleStr = obj.label;
  }
  return styleStr;
}

const alarmDialogContentRef = ref();
let open = ref(false);
let contRef = useParentElement(alarmDialogContentRef);
let { height: tableH } = useElementSize(contRef);
let tableHeight = computed(() => tableH.value - 36 - 20);
onMounted(() => {
  getNeedBusinessApi({ classifyCode: 'inspection', code: 'alarm_config' }).then((res) => {
    t.value = useToNumber(res.data.configDetailList[0].value).value;
    start();
  });
});
let time = computed(() => 60000 * t.value);
let hours = computed(() => (time.value / 60000 / 60).toFixed(2));
let t = ref(0);
let { start, stop } = useTimeoutFn(
  () => {
    s.value = 0;
    input3.value = '';
    select.value = 'alarmAreaName';
    getTableList().then((res) => {
      let { data } = res as { data: { count: number } };
      if (data.count !== 0) {
        if (proTable.value) {
          proTable.value.getTableList().then(() => {
            open.value = true;
          });
        } else {
          open.value = true;
        }
      }
    });
  },
  time,
  { immediate: false }
);
function close() {
  open.value = false;
  start();
}

let s = ref(0);
let os = useTransition(s, {
  duration: 1000,
});
onUnmounted(() => {
  stop();
});
</script>
<template>
  <KrPublicDialog
    :title="$t('alarm.newAlarmMsg')"
    v-model="open"
    width="60%"
    ref="RulesFormDialogRef"
    @doClose="close"
    appendTobody
    singleClose
    :btnText="[$t('buttonName.close')]"
    customClass="alarmDialog"
  >
    <template #dialog-title>
      <div class="leftTitle">
        <img src="@/assets/images/alarmIcon/home1.png" alt="msg" />
        <span>{{ $t('alarm.newAlarmMsg') }}</span>
      </div>
    </template>
    <div ref="alarmDialogContentRef" class="alarmDialogContent">
      <div class="alarmDialogInfo">
        <div class="infoLeft">
          {{ $t('messageTip.jin', { hours }) }}：<span class="red">{{ parseInt(os) }}</span>
        </div>
        <div class="infoRight">
          <el-input
            v-model="input3"
            style="max-width: 600px"
            suffix-icon="Search"
            :placeholder="$t('inputPlaceholder.placeholderEnter')"
            class="input-with-select"
            clearable
            @change="inputChange"
          >
            <template #prepend>
              <el-select v-model="select" placeholder="" @change="inputChange" style="width: 115px">
                <el-option :label="$t('alarm.alarmAreaName')" value="alarmAreaName" />
                <el-option :label="$t('alarm.alarmObjectName')" value="alarmObjectName" />
                <el-option :label="$t('alarm.alarmItemName')" value="alarmItemName" />
              </el-select>
            </template>
          </el-input>
        </div>
      </div>
      <div class="alarmDialogTable">
        <kr-pro-table
          ref="proTable"
          :columns="columns"
          :requestApi="getTableList"
          :initParam="initParam"
          :dataCallback="dataCallback"
          :height="tableHeight"
          @row-click="rowClick"
          selectId="id"
          :pagination="false"
          :border="false"
          :operationBtn="false"
        >
          <template #alarmGrade="{ row }">
            <div class="alarm-tab-main" v-if="row.alarmGrade">
              <span class="alarm-tag" :style="resAlarmGradeStyle(row.alarmGrade)">
                {{ resAlarmGradeLabel(row.alarmGrade) }}
              </span>
            </div>
            <span v-else>--</span>
          </template>
        </kr-pro-table>
      </div>
    </div>
  </KrPublicDialog>
</template>
<style lang="scss">
.alarmDialog {
  height: 80%;
  .el-dialog__header {
    background: linear-gradient(90deg, var(--el-color-danger) 0%, var(--el-color-warning) 100%);
    border-bottom: none;
    border-radius: 0;
    .leftTitle {
      box-sizing: border-box;
      display: flex;
      gap: 12px;
      align-items: flex-start;
      font-size: 22px;
      font-weight: bold;
      color: #ffffff;
      .toolBar-icon {
        display: flex;
        align-items: center;
        height: 100%;
        font-size: 28px;
      }
    }
    .el-dialog__headerbtn {
      position: static;
      display: flex;
      place-content: center;
      place-items: center;
      width: 28px;
      height: 28px;
      background: var(--el-color-danger);
      .el-dialog__close {
        color: #ffffff;
      }
    }
  }
  .el-dialog__body {
    padding: 0 20px;
    .infoRight {
      .el-input {
        --el-input-border-radius: 18px;
      }
      .el-input-group__prepend {
        background: #ffffff;
        .el-select .el-select__wrapper {
          box-shadow: none;
        }
      }
    }
  }
}
</style>
<style scoped lang="scss">
.alarmDialogContent {
  .alarmDialogInfo {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: var(--el-component-size);
    margin: 10px 0;
    .infoLeft {
      display: flex;
      align-items: baseline;
      height: 100%;
      color: var(--el-text-color-regular);
      .red {
        font-size: 20px;
        color: var(--el-color-danger);
      }
    }
  }
  .alarmDialogTable {
    :deep(.el-table) {
      --el-table-row-hover-bg-color: #dfeffd;
      .el-table__body tr:hover > td.el-table__cell {
        color: var(--el-color-primary);
        cursor: pointer;
      }
      .el-table__inner-wrapper::before {
        display: none;
      }
      .alarm-tab-main {
        display: flex;
        align-items: center;
        .alarm-tag {
          padding: 2px 6px;
          color: #ffffff;
          cursor: pointer;
          background: indianred;
          border: 1px solid transparent;
          border-radius: 4px;

          //   &.tag1type1 {
          //     color: #e3007b;
          //     background: #fcdeee;
          //     border-color: transparent;
          //   }
          //   &.tag1type2 {
          //     color: #ea3939;
          //     background: #ffe2e2;
          //     border-color: transparent;
          //   }
          //   &.tag1type3 {
          //     color: #fa802f;
          //     background: #ffebde;
          //     border-color: transparent;
          //   }
          //   &.tag1type4 {
          //     color: #f1b000;
          //     background: #fcf4de;
          //     border-color: transparent;
          //   }
        }
        .alarm-tag-line {
          padding: 2px 6px;
          cursor: pointer;
          border: 1px solid;
          border-radius: 4px;
          &.tag2type1 {
            color: var(--el-color-error);
            border-color: var(--el-color-error);
          }
          &.tag2type2 {
            color: var(--el-text-color-regular);
            border-color: var(--el-text-color-regular);
          }
        }
      }
    }
  }
}
</style>
