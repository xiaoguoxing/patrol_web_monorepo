<script setup lang="tsx">
import { ref, onMounted } from 'vue';
import detailList from '@/views/appCenter/task/report/detail/detailList.vue';
import detailExpandList from '@/views/appCenter/task/report/detail/detailExpandList.vue';
import detailDialog from '@/views/appCenter/task/report/detail/detailDialog.vue';
import type { ColumnProps } from '@patrol/ui';
import {
  getReportDetailApi,
  ReportListRows,
  PageType,
  getReportCheckApi,
} from '@/api/modules/appCenter/task/linkageReport';
import { ElMessage } from 'element-plus';
import { Clock } from '@element-plus/icons-vue';
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
interface props {
  id: string;
  pageType: PageType;
  inspection_conclusion: { label: string; value: string; remark: string }[];
  taskTypeSelectNames: { label: string; value: string; remark: string }[];
}

const props = withDefaults(defineProps<props>(), {});

onMounted(() => {
  getDetail();
});
let formData = ref<ReportListRows>({
  inspectionTaskName: '',
  inspectionModel: '',
  orgName: '',
  taskType: '',
  inspectionWay: '',
  executeType: 'timing',
  executeCycle: 'hour',
  executeFrequency: '',
  taskStartTime: '',
  syncData: false,
  areaName: '',
  itemNum: '',
  taskUseTime: '',
  taskEndTime: '',
  objectName: '',
  taskStatus: '',
});
type FormProps = { label: string; prop: keyof ReportListRows; format?: (val: string, obj: ReportListRows) => any }[];

let formProps: FormProps = [
  { label: t('aiInspection.linkageSignalCode') + '：', prop: 'linkageSignalCode' },
  { label: t('aiInspection.linkageSignalName') + '：', prop: 'linkageSignalName' },
  /*  {
    label: '任务类型：',
    prop: 'taskTypeName',
  },
  { label: '所属组织：', prop: 'orgName' },*/
  {
    label: t('aiInspection.taskStatus') + '：',
    prop: 'taskStatus',
  },
  {
    label: t('task.taskUseTime') + '：',
    prop: 'taskUseTime',
    format: (val) => ((val as unknown as number) / 60).toFixed(2) + t('common.minute'),
  },
  { label: t('aiInspection.taskStartTime') + '：', prop: 'taskStartTime' },
  { label: t('aiInspection.taskEndTime') + '：', prop: 'taskEndTime' },
  /*  { label: '巡检方式：', prop: 'inspectionWay' },
  { label: '任务执行类型：', prop: 'executeType' },*/
];

const resColumnBase: ColumnProps[] = [
  {
    prop: 'gatherPic',
    label: t('task.gatherPic'),
    render(scope) {
      return (
        <div>
          {scope.row.imgPath ? (
            <el-image
              style={'width: 53px; height: 30px; display:block'}
              src={scope.row.imgPath}
              zoom-rate={1.2}
              max-scale={7}
              min-scale={0.2}
              preview-src-list={[scope.row.imgPath]}
              preview-teleported={true}
              initial-index={0}
              fit="cover"
            />
          ) : (
            <div>--</div>
          )}
        </div>
      );
    },
  },
  {
    prop: 'gatherTime',
    label: t('task.gatherTime'),
  },
  {
    prop: 'inspectionConclusion',
    label: t('aiInspection.inspectionResult'),
    render(scope: any) {
      let obj = props.inspection_conclusion.find((i) => i.value === scope.row.inspectionConclusion);
      let obj2 = props.inspection_conclusion.find((i) => i.value === scope.row.inspectionConclusionBeforeCheck);
      return (
        <div class="recognitionResult">
          <span style="color:#666666">{obj?.label || '--'}</span>
          {scope.row?.isCheck ? (
            <el-tooltip effect="dark" content={`${t('task.beforeValue')}：${obj2?.label}`} placement="top-start">
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
];

const resColumns1: ColumnProps[] = [
  {
    prop: 'alarmRule',
    label: t('alarm.alarmRules'),
  },
  ...resColumnBase,
];

async function getDetail() {
  if (props.id) {
    let { data } = await getReportDetailApi({ id: props.id });
    formData.value = data;
    objectList1.value = data.abnormalList! || [];
    objectList2.value = data.objectMapList! || [];
    // formProps.push(...executeTypeConfig[data.executeType as keyof FormProps2]);
  } else {
  }
}

let objectList1 = ref<any[]>([]);
let objectList2 = ref<any[]>([]);
interface FormData {
  objectId?: string;
  itemId?: string;
  inspectionConclusion?: string;
  recognitionResult?: string;
  checkPicFile?: File;
  imgPath?: string;
  checkConclusion: string;
  checkResult: string;
  position?: string;
  id?: string;
  taskReportId?: string;
}
let rows = ref<FormData>({ checkResult: '', checkConclusion: '' });
const detailDialogRef = ref();
function setDetail(row: any) {
  rows.value = row;
  detailDialogRef.value?.openDialog();
}
function checkConfirm(data: any) {
  let obj = {
    taskReportId: rows.value.taskReportId,
    itemId: rows.value.itemId,
    ...data,
  };
  let formD = new FormData();
  for (const formDKey in obj) {
    formD.append(formDKey, obj[formDKey]);
  }
  getReportCheckApi(formD)
    .then((res) => {
      ElMessage.success(`${res.description}`);
      getDetail();
    })
    .catch((e) => {});
}
defineExpose({
  formData,
});
</script>

<template>
  <div class="detailPage">
    <div class="detail-title kr-font-medium" style="">{{ $t('task.taskInfo') }}</div>
    <div class="detail-description">
      <div class="detail-description-items" :key="item.prop" v-for="item in formProps">
        <div class="detail-description-label">{{ item.label }}</div>
        <div class="detail-description-value">
          {{ item.format?.(formData[item.prop] + '', formData) ?? formData[item.prop] }}
        </div>
      </div>
    </div>
    <div class="detail-title kr-font-medium">{{ $t('task.taskResult') }}</div>
    <div class="detail-card">
      <div class="detail-card-items">
        <img class="detail-card-item-img" src="@/assets/images/taskDetail/task_detail1.png" alt="巡检项总数量 (个)" />
        <div class="detail-card-item-info">
          <div class="detail-card-item-info-label">{{ $t('task.taskResult1') }}</div>
          <div class="detail-card-item-info-text type1">{{ formData.itemNum }}</div>
        </div>
      </div>
      <div class="detail-card-items">
        <img class="detail-card-item-img" src="@/assets/images/taskDetail/task_detail2.png" alt="告警项数量 (个)" />
        <div class="detail-card-item-info">
          <div class="detail-card-item-info-label">{{ $t('task.taskResult2') }}</div>
          <div class="detail-card-item-info-text type2">{{ formData.abnormalNum ?? '' }}</div>
        </div>
      </div>
      <div class="detail-card-items">
        <img class="detail-card-item-img" src="@/assets/images/taskDetail/task_detail3.png" alt="正常项数量 (个)" />
        <div class="detail-card-item-info">
          <div class="detail-card-item-info-label">{{ $t('task.taskResult3') }}</div>
          <div class="detail-card-item-info-text type3">{{ formData.normalNum }}</div>
        </div>
      </div>
      <div class="detail-card-items">
        <img class="detail-card-item-img" src="@/assets/images/taskDetail/task_detail4.png" alt="异常巡检项数量 (个)" />
        <div class="detail-card-item-info">
          <div class="detail-card-item-info-label">{{ $t('task.taskResult4') }}</div>
          <div class="detail-card-item-info-text type4">{{ formData.noDoneNum }}</div>
        </div>
      </div>
    </div>
    <div class="detail-sub-title"><span class="Rect">◆</span>{{ $t('task.taskDetail') }}</div>
    <div class="detail-table">
      <detailList
        :objectList="objectList1"
        :parentId="id"
        :column="resColumns1"
        :syncData="formData.syncData"
        :show-btn="false"
        @setDetail="setDetail"
      ></detailList>
    </div>
    <div class="detail-sub-title"><span class="Rect">◆</span>{{ $t('task.taskDetail1') }}</div>
    <div class="detail-table">
      <detailExpandList
        :objectList="objectList2"
        :parentId="id"
        :syncData="formData.syncData"
        :column="resColumns1"
        :show-btn="false"
        :expand="true"
        @setDetail="setDetail"
      ></detailExpandList>
    </div>
    <div class="detail-sub-title">&nbsp;</div>
    <detailDialog ref="detailDialogRef" @confirm="checkConfirm" :id="rows.id" :row-data="rows"></detailDialog>
  </div>
</template>

<style scoped lang="scss">
.detailPage {
  display: flex;
  flex-direction: column;
  height: 100%;
  .detail-title {
    margin-bottom: 16px;
    font-size: 18px;
    color: var(--el-text-color-primary);
  }
  .detail-sub-title {
    display: flex;
    align-items: center;
    margin-top: 16px;
    font-size: 16px;
    color: var(--el-text-color-primary);
    .Rect {
      margin-right: 10px;
      font-size: 12px;
      color: var(--el-color-primary);
    }
  }
  .detail-description {
    display: grid;
    grid-template-rows: repeat(3, auto);
    grid-template-columns: repeat(3, auto);
    grid-gap: 15px;
    margin-bottom: 16px;
    .detail-description-items {
      display: flex;
      font-size: 14px;
      .detail-description-label {
        width: 100px;
        color: var(--el-text-color-secondary);
        text-align: right;
      }
      .detail-description-value {
        margin-left: 16px;
        color: var(--el-text-color-regular);
      }
    }
  }
  .detail-card {
    display: flex;
    gap: 12px;
    height: 83px;
    padding: 0 5px;
    .detail-card-items {
      box-sizing: border-box;
      display: flex;
      flex: 1;
      height: inherit;
      padding: 16px;
      box-shadow: 0 0 10px 0 rgb(0 0 0 / 10%);
      .detail-card-item-img {
        width: 48px;
        height: 36px;
        margin-right: 16px;
      }
      .detail-card-item-info {
        .detail-card-item-info-label {
          font-size: 14px;
          color: var(--el-text-color-regular);
        }
        .detail-card-item-info-text {
          font-size: 24px;
          &.type1 {
            color: var(--el-color-primary);
          }
          &.type2 {
            color: var(--el-color-danger);
          }
          &.type3 {
            color: var(--el-color-success);
          }
          &.type4 {
            color: var(--el-color-warning);
          }
        }
      }
    }
  }
  .detail-table {
    flex: 1;
  }
}
</style>
