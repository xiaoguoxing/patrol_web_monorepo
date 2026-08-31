<script setup lang="ts">
import { reactive, ref, onMounted } from 'vue';
import {
  PageType,
  addRows,
  Cron,
  taskTypeSelectApi,
  addTaskApi,
  detailTaskApi,
} from '@/api/modules/optCenter/aiPatrolManage/task';
import { ElMessage, FormInstance, FormRules } from 'element-plus';
import orgDialog from '../orgDialog.vue';
import addObjectList from './addObjectList.vue';
import addObjectDialog from './addObjectDialog.vue';
import { getDict } from '@/utils/serviceDict';
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
const taskTypeSelectNames = ((await taskTypeSelectApi()).data as any[]).map((i: any) => ({
  label: i.taskType,
  value: i.id,
}));
const executeNames = (await getDict('task_execute_type')) as { label: string; value: string; remark: string }[];
const inspectionNames = (await getDict('inspection_way')) as { label: string; value: string; remark: string }[];
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
  (e: 'openDialogChange', t: PageType, r: undefined): void;
}
const emit = defineEmits<addEmit>();

const open = ref(false);
const active = ref(1);

onMounted(() => {
  getDetail();
});
('aiInspection.inspectionTaskName');
const rules = reactive<FormRules<addRows>>({
  taskPlanName: [
    { required: true, message: t('inputPlaceholder.placeholderBase') + t('aiInspection.inspectionTaskName') },
  ],
  orgName: [{ required: true, message: t('inputPlaceholder.placeholderSelect') + t('common.orgName') }],
  taskType: [{ required: true, message: t('inputPlaceholder.placeholderSelect') + t('aiInspection.taskTypeName') }],
  inspectionWay: [{ required: true, message: t('inputPlaceholder.placeholderSelect') + t('inspection.inspectionWay') }],
  executeType: [
    { required: true, message: t('inputPlaceholder.placeholderSelect') + t('aiInspection.executeTypeName') },
  ],
  executeCycle: [{ required: true, message: t('inputPlaceholder.placeholderSelect') + t('inspection.executeCycle') }],
  executeFrequency: [
    { required: true, message: t('inputPlaceholder.placeholderSelect') + t('inspection.executeFrequency') },
  ],
  taskStartTime: [
    { required: true, message: t('inputPlaceholder.placeholderSelect') + t('aiInspection.taskStartTime') },
  ],
  taskEndTime: [{ required: false, message: t('inputPlaceholder.placeholderSelect') + t('aiInspection.taskEndTime') }],
  executeMode: [{ required: true, message: t('inputPlaceholder.placeholderSelect') + t('task.inspectionModel') }],
});
let formData = reactive<addRows>({
  taskPlanName: '',
  orgName: '',
  orgCode: '',
  taskType: '',
  inspectionWay: '',
  executeType: 'timing',
  executeCycle: 'hour',
  executeFrequency: '',
  taskStartTime: '',
  taskEndTime: '',
  executeMode: '',
});
async function getDetail() {
  if (props.id) {
    let { data } = await detailTaskApi({ id: props.id });
    let formDataKey: keyof addRows;
    for (formDataKey in formData) {
      formData[formDataKey] = data[formDataKey] as never;
    }
    orgData.value = [{ id: data.orgCode, name: data.orgName }];
    objectList.value = data.taskPlanItemList!.toSorted((a, b) => a.sortNo - b.sortNo);
    cronChange(formData.executeCycle, false);
  } else {
    cronChange(formData.executeCycle);
  }
}
//org
const formDialogRef = ref();
const orgData = ref<any[]>([]);
function selectClick() {
  formDialogRef.value.showDialog();
}
function orgConfirm(ids: string[], arr: { id: string; name: string }) {
  orgData.value = [arr];
  formData.orgCode = arr.id;
  formData.orgName = arr.name;
}
// formSelectChange
function setArr(num: number): Cron[] {
  return new Array(num).fill({}).map((i, index) => ({ label: `${index + 1}`, value: `${index + 1}` }));
}
interface CronDayName {
  [key: string]: () => Cron[];
}
const cronDayMethod: CronDayName = {
  [t('common.hour')]: () => setArr(24),
  [t('common.today2')]: () => setArr(7),
  [t('common.week3')]: () => setArr(4),
  [t('common.month3')]: () => setArr(12),
};
let cronValue = ref<Cron>({ value: '', label: '' });
function cronChange(value: string, first: boolean = true) {
  let obj = executeCycleNames.find((i) => i.value === value);
  if (obj) {
    obj.method = cronDayMethod[obj.label as keyof CronDayName];
    cronValue.value = obj;
    if (first) formData.executeFrequency = '';
  }
}
//表格
let objectList = ref<any[]>([]);
let addObjectDialogRef = ref();
function addObj() {
  addObjectDialogRef.value.showDialog();
}
function openObjectDialog() {
  addObj();
}
function addObjectDialogConfirm(ids: any, arr: any) {
  // sortNo
  objectList.value = arr;
}
function deleteList(arr: string[]) {
  arr.map((i) => {
    let index = objectList.value.findIndex((j) => j.itemId === i);
    if (index !== -1) objectList.value.splice(index, 1);
  });
}
function prevList(id: string) {
  let index = objectList.value.findIndex((j) => j.itemId === id);
  let r = objectList.value.splice(index, 1);
  objectList.value.splice(index - 1, 0, r[0]);
}
function nextList(id: string) {
  let index = objectList.value.findIndex((j) => j.itemId === id);
  let r = objectList.value.splice(index, 1);
  objectList.value.splice(index + 1, 0, r[0]);
}
//提交
const formRef = ref<FormInstance>();
async function stepOne() {
  try {
    await formRef.value?.validate();
    next(2);
  } catch (e) {}
}
function next(activeChange: number) {
  active.value = activeChange;
}
async function save() {
  formData.taskPlanItemList = objectList.value.map((i: any, index: number) => {
    i.sortNo = index + 1;
    return i;
  });
  if (props.id) formData.id = props.id;
  let { description } = await addTaskApi(formData);
  ElMessage.success(description);
  cancel();
}
function cancel() {
  emit('openDialogChange', 'list', undefined);
}
</script>

<template>
  <div class="addPage">
    <div class="addPageCont">
      <div class="stepMargin">
        <el-steps :active="active">
          <el-step :title="$t('task.step1')" />
          <el-step :title="$t('task.step2')" />
        </el-steps>
      </div>
      <el-row class="formCenter">
        <el-scrollbar v-if="active === 1" view-class="addPageStepOne">
          <el-col :span="9" :xl="9" :lg="12" :md="12" :sm="24" :xs="24">
            <el-form ref="formRef" :rules="rules" label-suffix=" :" :model="formData" label-width="auto">
              <el-row>
                <el-col :span="24">
                  <el-form-item :label="$t('aiInspection.inspectionTaskName')" prop="taskPlanName">
                    <el-input
                      v-model="formData.taskPlanName"
                      :placeholder="$t('inputPlaceholder.placeholderBase')"
                    ></el-input>
                  </el-form-item>
                </el-col>
                <el-col :span="24">
                  <el-form-item :label="$t('common.orgName')" prop="orgName">
                    <el-input
                      v-model="formData.orgName"
                      :placeholder="t('inputPlaceholder.placeholderSelect')"
                      readonly
                      @click="selectClick"
                    ></el-input>
                  </el-form-item>
                </el-col>
                <el-col :span="24">
                  <el-form-item :label="$t('aiInspection.taskTypeName')" prop="taskType">
                    <el-select v-model="formData.taskType">
                      <el-option
                        :label="item.label"
                        :key="item.value"
                        v-for="item in taskTypeSelectNames"
                        :value="item.value"
                      ></el-option>
                    </el-select>
                  </el-form-item>
                </el-col>
                <el-col :span="24">
                  <el-form-item :label="$t('task.inspectionModel')" prop="executeMode">
                    <el-select v-model="formData.executeMode">
                      <el-option
                        :label="item.label"
                        :key="item.value"
                        v-for="item in model"
                        :value="item.value"
                      ></el-option>
                    </el-select>
                  </el-form-item>
                </el-col>
                <el-col :span="24">
                  <el-form-item :label="$t('inspection.inspectionWay')" prop="inspectionWay">
                    <el-select v-model="formData.inspectionWay">
                      <el-option
                        :label="item.label"
                        :key="item.value"
                        v-for="item in inspectionNames"
                        :value="item.value"
                      ></el-option>
                    </el-select>
                  </el-form-item>
                </el-col>
                <el-col :span="24">
                  <el-form-item :label="$t('aiInspection.executeTypeName')" prop="executeType">
                    <el-select v-model="formData.executeType">
                      <el-option
                        :label="item.label"
                        :key="item.value"
                        v-for="item in executeNames"
                        :value="item.value"
                      ></el-option>
                    </el-select>
                  </el-form-item>
                </el-col>
                <el-col v-if="formData.executeType === 'timing'" :span="24">
                  <el-form-item :label="$t('aiInspection.taskStartTime')" prop="taskStartTime">
                    <el-date-picker
                      v-model="formData.taskStartTime"
                      value-format="YYYY-MM-DD HH:mm"
                      format="YYYY-MM-DD HH:mm"
                      time-format="HH:mm"
                      type="datetime"
                      :placeholder="$t('inputPlaceholder.placeholderSelect') + $t('aiInspection.taskStartTime')"
                    />
                  </el-form-item>
                </el-col>
                <el-col v-if="formData.executeType === 'cycle'" :span="24">
                  <el-form-item :label="$t('inspection.executeCycle')" prop="executeCycle">
                    <el-radio-group v-model="formData.executeCycle" class="ml-4" @change="cronChange">
                      <el-radio v-for="item in executeCycleNames" :key="item.value" :value="item.value">{{
                        item.label
                      }}</el-radio>
                    </el-radio-group>
                  </el-form-item>
                </el-col>
                <el-col v-if="formData.executeType === 'cycle'" :span="24">
                  <div class="input-sub-content">
                    <div class="input-sub-content-left"></div>
                    <div class="input-sub-content-right">
                      <el-form-item :label="$t('inspection.executeFrequency')" prop="executeFrequency">
                        <span class="beforeText">{{ $t('task.m') }}</span>
                        <!--                    <el-time-picker
                          v-if="cronValue.label === '小时'"
                          value-format="HH:mm:ss"
                          v-model="formData.executeFrequency"
                        />-->
                        <el-select
                          v-if="
                            [$t('common.hour'), $t('common.today2'), $t('common.week3'), $t('common.month3')].includes(
                              cronValue.label
                            )
                          "
                          v-model="formData.executeFrequency"
                          clearable
                        >
                          <el-option
                            :label="item.label"
                            :value="item.value"
                            :key="item.value"
                            v-for="item in cronValue.method?.() ?? []"
                          ></el-option>
                        </el-select>
                        <el-date-picker
                          v-else-if="cronValue.label === $t('common.year')"
                          type="year"
                          value-format="YYYY"
                          v-model="formData.executeFrequency"
                        />
                        <span class="afterText">{{ cronValue.label }}</span>
                      </el-form-item>
                      <el-form-item :label="$t('aiInspection.taskStartTime')" prop="taskStartTime">
                        <el-date-picker
                          v-model="formData.taskStartTime"
                          value-format="YYYY-MM-DD HH:mm"
                          type="datetime"
                          :placeholder="$t('inputPlaceholder.placeholderSelect') + $t('aiInspection.taskStartTime')"
                        />
                      </el-form-item>
                      <el-form-item :label="$t('aiInspection.taskEndTime')" prop="taskEndTime">
                        <el-date-picker
                          v-model="formData.taskEndTime"
                          value-format="YYYY-MM-DD HH:mm"
                          type="datetime"
                          :placeholder="$t('inputPlaceholder.placeholderSelect') + $t('aiInspection.taskEndTime')"
                        />
                      </el-form-item>
                    </div>
                  </div>
                </el-col>
                <el-col :span="24">
                  <div class="input-sub-button">
                    <div class="input-sub-button-left"></div>
                    <div class="input-sub-button-right"></div>
                  </div>
                </el-col>
                <el-col :span="24">
                  <orgDialog
                    ref="formDialogRef"
                    :list="orgData"
                    @confirm="orgConfirm"
                    :treeTitle="$t('common.orgNameGroup')"
                    :tableTitle="$t('common.orgNameGroup2')"
                    :title="$t('common.orgNameGroupSelect')"
                  ></orgDialog>
                </el-col>
              </el-row>
            </el-form>
          </el-col>
        </el-scrollbar>
        <el-col v-else-if="active === 2" class="addPageStepTwo" :span="24">
          <div class="table-operation" v-if="objectList.length">
            <addObjectList
              :objectList="objectList"
              @deleteList="deleteList"
              @prev="prevList"
              @next="nextList"
              :show-move="formData.executeMode === 'serial'"
              @openObjectDialog="openObjectDialog"
            ></addObjectList>
            <div class="listBtn"></div>
          </div>
          <addObjectDialog
            :title="$t('linkageSet.addItem')"
            :treeTitle="$t('linkageSet.objectNameList')"
            :tableTitle="$t('inspection.addInspection2')"
            :list="objectList"
            @confirm="addObjectDialogConfirm"
            ref="addObjectDialogRef"
          ></addObjectDialog>
        </el-col>
      </el-row>
      <div class="addBtn" v-if="active === 2 && !objectList.length">
        <img src="@/assets/images/notData.png" />
        <span class="addText">{{ $t('inspection.Msg6') }}</span>
        <el-button type="primary" icon="CirclePlus" @click="addObj">{{ $t('buttonName.add3') }}</el-button>
      </div>
    </div>
    <div class="bottomBtn">
      <template v-if="active === 1">
        <el-button class="button-size" @click="cancel">{{ $t('ui.cancel') }}</el-button>
        <el-button class="button-size" @click="stepOne" type="primary">{{ $t('model.redo') }}</el-button>
      </template>
      <template v-else-if="active === 2">
        <el-button class="button-size" @click="next(1)"> {{ $t('model.undo') }}</el-button>
        <el-button class="button-size" @click="cancel">{{ $t('ui.cancel') }}</el-button>
        <el-button class="button-size" v-if="objectList.length" @click="save" type="primary">{{
          $t('buttonName.add4')
        }}</el-button>
      </template>
    </div>
  </div>
</template>

<style scoped lang="scss">
.addPage {
  display: flex;
  flex-direction: column;
  height: 100%;
  :deep(.el-form-item__label) {
    color: var(--el-text-color-secondary);
  }
  :deep(.el-step) {
    .el-step__title {
      margin-inline-end: 5px;
      font-size: 14px;
      white-space: nowrap;
      &.is-process {
        color: var(--el-text-color-regular);
      }
    }
    .el-step__head {
      &.is-finish {
        color: var(--el-color-white);
        .el-step__icon.is-text {
          background: var(--el-color-primary);
          box-shadow: 0 0 0 5px #ffffff;
        }
      }
      .el-step__line-inner {
        border-color: var(--el-color-primary);
      }
      &.is-process {
        color: var(--el-text-color-regular);
        border-color: var(--el-text-color-regular);
      }
      .el-step__icon.is-text {
        cursor: pointer;
        border: 1px solid;
        box-shadow: -5px 0 0 1px #ffffff;
      }
    }
  }
  .stepMargin {
    width: 200px;
    height: 60px;
    margin-bottom: 15px;
  }
  .formCenter {
    flex: 1;
    overflow: hidden;
  }
  .addPageStepOne {
    .input-sub-content {
      box-sizing: border-box;
      display: flex;
      width: 100%;
      height: 196px;
      margin-bottom: 30px;
      .input-sub-content-left {
        width: 100px;
      }
      .input-sub-content-right {
        flex: 1;
        padding: 22px 16px;
        background: var(--el-fill-color-light);
        :deep(.el-select),
        :deep(.el-input) {
          flex: 1;
        }
        .beforeText {
          margin-right: 5px;
        }
        .afterText {
          margin-left: 5px;
        }
      }
    }
    .input-sub-button {
      box-sizing: border-box;
      display: flex;
      width: 100%;
      .input-sub-button-left {
        width: 100px;
      }
      .input-sub-content-right {
        flex: 1;
        .button-size {
          width: 108px;
          height: 40px;
        }
      }
    }
  }
  .addPageStepTwo {
    height: 100%;
    .table-operation {
      height: 100%;
    }
    .listBtn {
      margin-top: 20px;
    }
  }
  .bottomBtn {
    display: flex;
    height: 73px;
    padding-left: 130px;
    margin: 0 -24px -24px;
    border-top: 1px solid #e6e6e6;
    .el-button {
      min-width: 108px;
      height: 40px;
      margin-top: 11px;
    }
  }
  .addPageCont {
    position: relative;
    display: flex;
    flex: 1;
    flex-direction: column;
    overflow: hidden;
    .addBtn {
      position: absolute;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      margin-top: -20px;
      img {
        width: 130px;
        height: auto;
      }
      .addText {
        margin-top: 10px;
        margin-bottom: 20px;
        color: #999999;
      }
    }
  }
}
</style>
