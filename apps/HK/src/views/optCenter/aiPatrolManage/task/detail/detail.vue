<script setup lang="ts">
import { reactive, ref, onMounted } from 'vue';
import { PageType, addRows, detailTaskApi, Cron } from '@/api/modules/optCenter/aiPatrolManage/task';
import addObjectList from '../add/addObjectList.vue';
import { getDict } from '@/utils/serviceDict';
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
defineExpose({
  openDialogChange() {
    emit('openDialogChange', 'edit', { id: props.id! });
  },
});
const executeCycleNames = (await getDict('task_execute_cycle')) as unknown as {
  label: string;
  value: string;
  method: () => Cron[];
}[];
const model = [
  { label: t('linkageSet.serial'), value: 'serial' },
  { label: t('linkageSet.parallel'), value: 'parallel' },
];
interface props {
  id?: string;
  pageType: PageType;
}
const props = withDefaults(defineProps<props>(), {});

interface addEmit {
  (e: 'openDialogChange', t: PageType, r: { id?: string }): void;
}
const emit = defineEmits<addEmit>();

onMounted(() => {
  getDetail();
});
let formData = ref<addRows>({
  taskPlanName: '',
  orgName: '',
  orgCode: '',
  taskType: '',
  inspectionWay: '',
  executeMode: '',
  executeType: 'timing',
  executeCycle: 'hour',
  executeFrequency: '',
  taskStartTime: '',
  taskEndTime: '',
});
type FormProps = { label: string; prop: keyof addRows; format?: (val: string, obj: addRows) => any }[];
type FormProps2 = { timing: FormProps; cycle: FormProps };
let formProps: FormProps = [
  { label: t('aiInspection.inspectionTaskName') + '：', prop: 'taskPlanName' },
  { label: t('common.orgName') + '：', prop: 'orgName' },
  { label: t('aiInspection.taskTypeName') + '：', prop: 'taskTypeName' },
  {
    label: t('task.inspectionModel') + '：',
    prop: 'executeMode',
    format(val) {
      let obj = model.find((i) => i.value === val);
      return obj?.label;
    },
  },
  { label: t('inspection.inspectionWay') + '：', prop: 'inspectionWayName' },
  { label: t('aiInspection.executeTypeName') + '：', prop: 'executeTypeName' },
];
let executeTypeConfig: FormProps2 = {
  timing: [{ label: t('aiInspection.taskStartTime') + '：', prop: 'taskStartTime' }],
  cycle: [
    {
      label: t('inspection.executeFrequency') + '：',
      prop: 'executeFrequency',
      format(val, obj) {
        return `每 ${val} ${executeCycleNames.find((i) => i.value === obj.executeCycle)?.label}`;
      },
    },
    { label: t('aiInspection.taskStartTime') + '：', prop: 'taskStartTime' },
    { label: t('aiInspection.taskEndTime') + '：', prop: 'taskEndTime' },
  ],
};

async function getDetail() {
  if (props.id) {
    let { data } = await detailTaskApi({ id: props.id });
    formData.value = data;
    objectList.value = data.taskPlanItemList!;
    formProps.push(...executeTypeConfig[data.executeType as keyof FormProps2]);
  } else {
  }
}
//org
// formSelectChange
//表格
let objectList = ref<any[]>([]);
//提交
function cancel() {
  emit('openDialogChange', 'edit', { id: undefined });
}
</script>

<template>
  <div class="detailPage">
    <div class="detail-title kr-font-medium" style="margin-bottom: 16px">{{ $t('task.taskInfo') }}</div>
    <div class="detail-description">
      <div class="detail-description-items" :key="item.prop" v-for="item in formProps">
        <div class="detail-description-label">{{ item.label }}</div>
        <div class="detail-description-value">
          {{ item.format?.(formData[item.prop] as string, formData) || formData[item.prop] }}
        </div>
      </div>
    </div>
    <div class="detail-title kr-font-medium">{{ $t('overHaulArea.object') }}</div>
    <div class="detail-table">
      <addObjectList :objectList="objectList" :show-btn="false"></addObjectList>
    </div>
  </div>
</template>

<style scoped lang="scss">
.detailPage {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  .detail-title {
    font-size: 18px;
    color: var(--el-text-color-primary);
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
        width: 120px;
        color: #999999;
        text-align: right;
      }
      .detail-description-value {
        margin-left: 16px;
        color: #666666;
      }
    }
  }
  .detail-table {
    flex: 1;
    overflow: hidden;
  }
}
</style>
