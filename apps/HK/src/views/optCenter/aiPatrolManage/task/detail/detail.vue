<script setup lang="ts">
import { reactive, ref, onMounted } from 'vue';
import { PageType, addRows, detailTaskApi, Cron } from '@/api/modules/optCenter/aiPatrolManage/task';
import addObjectList from '../add/addObjectList.vue';
import { getDict } from '@/utils/serviceDict';
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
  { label: '顺序执行', value: 'serial' },
  { label: '并行执行', value: 'parallel' },
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
  { label: '任务名称：', prop: 'taskPlanName' },
  { label: '所属组织：', prop: 'orgName' },
  { label: '任务类型：', prop: 'taskTypeName' },
  {
    label: '巡检模式：',
    prop: 'executeMode',
    format(val) {
      let obj = model.find((i) => i.value === val);
      return obj?.label;
    },
  },
  { label: '巡检方式：', prop: 'inspectionWayName' },
  { label: '任务执行类型：', prop: 'executeTypeName' },
];
let executeTypeConfig: FormProps2 = {
  timing: [{ label: '任务执行时间：', prop: 'taskStartTime' }],
  cycle: [
    {
      label: '任务执行频率：',
      prop: 'executeFrequency',
      format(val, obj) {
        return `每 ${val} ${executeCycleNames.find((i) => i.value === obj.executeCycle)?.label}`;
      },
    },
    { label: '任务开始时间：', prop: 'taskStartTime' },
    { label: '任务结束时间：', prop: 'taskEndTime' },
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
    <div class="detail-title kr-font-medium" style="margin-bottom: 16px">任务信息</div>
    <div class="detail-description">
      <div class="detail-description-items" :key="item.prop" v-for="item in formProps">
        <div class="detail-description-label">{{ item.label }}</div>
        <div class="detail-description-value">
          {{ item.format?.(formData[item.prop] as string, formData) || formData[item.prop] }}
        </div>
      </div>
    </div>
    <div class="detail-title kr-font-medium">巡检对象</div>
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
