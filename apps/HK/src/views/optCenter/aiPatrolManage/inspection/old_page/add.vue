<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref } from 'vue';
import { Id, PageType, addRows, ItemRules } from '@/api/modules/optCenter/aiPatrolManage/inspection';
import {
  pageTypeTitle,
  getAlarmAllListApi,
  addInspectionApi,
  detailInspectionApi,
} from '@/api/modules/optCenter/aiPatrolManage/inspection';
import { ElMessage, FormInstance, FormRules } from 'element-plus';
import formDialog from '../formDialog.vue';
import { detailPositionApi } from '@/api/modules/optCenter/aiPatrolManage/position';
import { useBackFileUrl } from '@optCenter/hooks/use-file-utils';

interface Props {
  id?: Id;
  objectId: string;
  pageType: PageType;
}
const props = withDefaults(defineProps<Props>(), {});
const typeTitle = computed(() => pageTypeTitle[props.pageType]);
//emit
interface Emit {
  (e: 'openDialogChange', page: PageType, row: undefined): any;
}
const emit = defineEmits<Emit>();
//弹框
const open = ref(false);
function openDialog() {
  open.value = true;
  getDetail();
}
// 表单
const rules = reactive<FormRules<addRows>>({
  itemName: [{ required: true, message: '请输入巡检项名称' }],
  presetPositionId: [{ required: true, message: '请输入关联预置位' }],
  alarmId: [{ required: true, message: '请输入告警名称' }],
});
const rulesArr = reactive<FormRules<ItemRules>>({
  alarmIndex: [{ required: true, message: '请选择' }],
  alarmRule: [{ required: true, message: '请选择' }],
  ruleValue: [{ required: true, message: '请输入' }],
});
class formDataBase {
  alarmId = '';
  alarmName = '';
  isStatus = 0;
  itemName = '';
  itemRules = [];
  objectId = '';
  presetPositionId = '';
  ruleCondition = 1;
}
let formData = ref<addRows>({
  alarmId: '',
  alarmName: '',
  isStatus: 0,
  itemName: '',
  itemRules: [],
  objectId: '',
  presetPositionId: '',
  ruleCondition: 1,
});
async function getDetail() {
  await nextTick();
  if (props.id) {
    let { data } = await detailInspectionApi({ id: props.id });
    let { data: data2 } = await detailPositionApi({ id: data.presetPositionId });
    formData.value = data;
    if (data2.attachmentId) {
      data2.imgPath = (await useBackFileUrl(data2.attachmentId)) || '';
    }
    dialogArr.value = [data2];
    await alarmChange(data.alarmId);
    itemRules.value = data.itemRules;
    data.itemRules.forEach((i, index) => {
      alarmIndexChange(i.alarmIndex!, index);
    });
  } else {
    formData.value = new formDataBase() as addRows;
    dialogArr.value = [];
    itemRules.value = [
      {
        alarmIndex: '',
        alarmRule: '',
        ruleValue: '',
      },
    ];
  }
}
// 预置位弹框
let dialogArr = ref<any[]>([]);
const formDialogRef = ref();
const dialogProps: DialogProps = {
  presetPositionId: '',
  presetPositionName: '',
  relatedSkillsId: '',
  relatedSkillsName: '',
};
interface DialogProps {
  presetPositionId: string;
  presetPositionName: string;
  relatedSkillsId: string;
  relatedSkillsName: string;
}
function selectClick() {
  formDialogRef.value.showDialog();
}
function formDialogConfirm(ids: string[], arr: DialogProps) {
  let dialogPropsKey: keyof DialogProps;
  for (dialogPropsKey in dialogProps) {
    formData.value[dialogPropsKey] = arr[dialogPropsKey];
  }
  dialogArr.value = [arr];
}
//规则arr
onMounted(() => {
  getAlarmOption();
});
let alarmOptions: any[] = [];
let paramsOpt: any[] = [];
let alarmMentListOpt: any[] = [];
async function getAlarmOption() {
  let { data } = await getAlarmAllListApi();
  alarmOptions = data;
}
async function alarmChange(val: string) {
  let obj = alarmOptions.find((i) => i.id === val);
  if (obj) {
    formData.value.isStatus = obj.alarmAttribute === 'state' ? 1 : 0;
    paramsOpt = [
      { alarmIndexId: obj.alarmIndexId, alarmIndexName: obj.alarmIndexName, alarmIndexUnit: obj.alarmIndexUnit },
    ];
    alarmMentListOpt = obj.alarmMentList ?? [];
    formData.value.alarmId = obj.id;
    formData.value.alarmName = obj.alarmName;
    itemRules.value = [
      {
        alarmIndex: '',
        alarmRule: '',
        ruleValue: '',
      },
    ];
    // formData.value.ruleCondition = 1;
  } else {
    formData.value.alarmId = '';
    formData.value.alarmName = '';
  }
}
function alarmIndexChange(val: string, index: number) {
  let obj = paramsOpt.find((i) => i.alarmIndexId === val);
  if (obj) {
    itemRules.value[index].alarmIndexUnit = obj.alarmIndexUnit;
  }
}
// 规则操作
let itemRules = ref<ItemRules[]>([]);
let RulesFormDialogRef = ref();
let rulesListItemRef = ref<HTMLElement[]>();
function addRules() {
  let rules: ItemRules = {
    alarmIndex: '',
    alarmRule: '',
    ruleValue: '',
    alarmIndexUnit: '',
  };
  itemRules.value.push(rules);
  nextTick(() => {
    let target = rulesListItemRef.value?.at(-1);
    target?.scrollIntoView(false);
  });
}
function deleteRules(index: number) {
  itemRules.value.splice(index, 1);
}
// 提交
let formRef = ref<FormInstance>();
let formListRef = ref<FormInstance>();
async function confirm() {
  await formRef.value?.validate();
  await formListRef.value?.validate();
  let newFormData: any = {};
  let newFormDataKey: keyof addRows;
  for (newFormDataKey in new formDataBase()) {
    if (!['relatedSkillsId', 'relatedSkillsName'].includes(newFormDataKey)) {
      newFormData[newFormDataKey] = formData.value[newFormDataKey];
    }
  }
  if (props.id) newFormData.id = props.id;
  newFormData.objectId = props.objectId;
  newFormData.itemRules = itemRules.value;
  let { description } = await addInspectionApi(newFormData);
  ElMessage.success(description);
  emit('openDialogChange', 'list', undefined);
  close();
}
// 关闭
function close() {
  open.value = false;
}

defineExpose({
  openDialog,
});
</script>

<template>
  <KrPublicDialog
    :title="`${typeTitle}巡检项`"
    :singleClose="pageType === 'detail'"
    v-model="open"
    ref="RulesFormDialogRef"
    @doSubmit="confirm"
    @doClose="close"
  >
    <el-form ref="formRef" :rules="rules" label-suffix=" :" :model="formData" label-width="auto">
      <el-row class="inspection-add-page">
        <el-col :span="24">
          <el-form-item label="巡检项名称" prop="itemName">
            <el-input v-model="formData.itemName" :disabled="pageType === 'detail'" clearable></el-input>
          </el-form-item>
        </el-col>
        <el-col :span="24">
          <el-row :gutter="30">
            <el-col :span="12">
              <el-form-item label="关联预置位" prop="presetPositionId">
                <el-input
                  v-model="formData.presetPositionName"
                  @click.prevent="selectClick"
                  readonly
                  suffix-icon="More"
                ></el-input>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="关联技能" prop="relatedSkillsName">
                <el-input v-model="formData.relatedSkillsName" readonly />
              </el-form-item>
            </el-col>
          </el-row>
        </el-col>
        <el-col :span="24">
          <el-form-item label="告警名称" prop="alarmId">
            <el-select
              v-model="formData.alarmId"
              filterable
              :disabled="pageType === 'detail'"
              clearable
              @change="alarmChange"
            >
              <el-option
                :label="item.alarmName"
                :key="item.id"
                :value="item.id"
                v-for="item in alarmOptions"
              ></el-option>
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="24">
          <div class="rules-title">告警规则</div>
          <template v-if="!formData.isStatus">
            <div class="rules-title-sub">满足如下条件范围</div>
            <div class="rules-radio">
              <el-radio-group :disabled="pageType === 'detail'" text-color="#000" v-model="formData.ruleCondition">
                <el-radio :value="1" size="large">满足全部条件</el-radio>
                <el-radio :value="0" size="large">满足任一条件</el-radio>
              </el-radio-group>
            </div>
          </template>
        </el-col>
      </el-row>
    </el-form>
    <el-form
      ref="formListRef"
      :rules="rulesArr"
      label-suffix=" :"
      :disabled="pageType === 'detail'"
      :model="itemRules"
      label-width="auto"
    >
      <el-row class="inspection-add-page">
        <el-col :span="24">
          <div class="rules-list">
            <div class="rules-list-item" ref="rulesListItemRef" :key="index" v-for="(item, index) in itemRules">
              <template v-if="formData.isStatus">
                <div class="rules-add-icon is-required flx-center">告警状态</div>
                <div class="select-item">
                  <el-form-item :prop="`${index}.alarmIndex`" :rules="rulesArr.alarmIndex">
                    <el-select v-model="item.alarmIndex" clearable>
                      <el-option
                        :label="item.alarmMent"
                        :key="item.id"
                        v-for="item in alarmMentListOpt"
                        :value="item.id"
                      ></el-option>
                    </el-select>
                  </el-form-item>
                </div>
              </template>
              <template v-else>
                <div class="select-item">
                  <el-form-item :prop="`${index}.alarmIndex`" :rules="rulesArr.alarmIndex">
                    <el-select v-model="item.alarmIndex" clearable @change="alarmIndexChange($event, index)">
                      <el-option
                        :label="item.alarmIndexName"
                        :key="item.alarmIndexId"
                        v-for="item in paramsOpt"
                        :value="item.alarmIndexId"
                      ></el-option>
                    </el-select>
                  </el-form-item>
                </div>
                <div class="select-item">
                  <el-form-item :prop="`${index}.alarmRule`" :rules="rulesArr.alarmRule">
                    <el-select v-model="item.alarmRule" clearable>
                      <el-option label=">" value=">"></el-option>
                      <el-option label=">=" value=">="></el-option>
                      <el-option label="=" value="="></el-option>
                      <el-option label="<" value="<"></el-option>
                      <el-option label="<=" value="<="></el-option>
                      <el-option label="≠" value="≠"></el-option>
                    </el-select>
                  </el-form-item>
                </div>
                <div class="select-item">
                  <el-form-item :prop="`${index}.ruleValue`" :rules="rulesArr.alarmRule">
                    <el-input v-model="item.ruleValue" clearable>
                      <template #suffix>{{ item.alarmIndexUnit }}</template>
                    </el-input>
                  </el-form-item>
                </div>
              </template>
              <div class="rules-add-icon flx-center" v-if="pageType !== 'detail' && !formData.isStatus">
                <el-icon size="20" v-if="index !== 0" @click="deleteRules(index)">
                  <Delete />
                </el-icon>
                <el-icon size="20" v-if="index === 0" @click="addRules">
                  <CirclePlus />
                </el-icon>
              </div>
            </div>
          </div>
        </el-col>
      </el-row>
    </el-form>
    <formDialog
      ref="formDialogRef"
      :pageType="pageType"
      @confirm="formDialogConfirm"
      :list="dialogArr"
      title="关联预置位"
    ></formDialog>
  </KrPublicDialog>
</template>

<style scoped lang="scss">
.inspection-add-page {
  padding: 0 40px;
  .rules-title {
    margin-bottom: 20px;
    font-size: 16px;
  }
  .rules-title-sub {
    margin-bottom: 15px;
    color: var(--el-text-color-secondary);
  }
  .rules-list {
    margin-top: 10px;
    .rules-list-item {
      display: flex;
      gap: 15px;
      .select-item {
        flex: 1;
      }
      .rules-add-icon {
        height: var(--el-component-size);
        cursor: pointer;
        .el-icon + .el-icon {
          margin-left: 12px;
        }
        &.is-required::before {
          margin-right: 4px;
          color: var(--el-color-danger);
          content: '*';
        }
      }
      &:last-child {
        margin-bottom: 0;
      }
    }
  }
  :deep(.el-radio__input.is-checked + .el-radio__label) {
    color: initial;
  }
}
</style>
