<script setup lang="ts">
import { nextTick, onMounted, reactive, ref, computed } from 'vue';
import { Id, PageType, addRows, ItemRules, rows } from '@/api/modules/optCenter/aiPatrolManage/inspection';
import { addInspectionApi, detailInspectionApi } from '@/api/modules/optCenter/aiPatrolManage/inspection';
import { ElMessage, FormInstance, FormRules } from 'element-plus';
import { detailPositionApi, PositionListRows } from '@/api/modules/optCenter/aiPatrolManage/position';
import { useBackFileUrl } from '@optCenter/hooks/use-file-utils';
import { getIndexListApi } from '@/api/modules/optCenter/inspectionSet/alarm';
import { getNeedBusiness, getDict } from '@/utils/serviceDict';
import { Warning } from '@element-plus/icons-vue';
import formDialog from './formDialog.vue';
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
interface Props {
  id?: Id;
  objectId: string;
  pageType: PageType;
}
const props = withDefaults(defineProps<Props>(), {});
//emit
interface Emit {
  (e: 'openDialogChange', page: PageType, row?: rows): any;
}
const emit = defineEmits<Emit>();
// 表单
onMounted(() => {
  getDetail();
});
const rules = reactive<FormRules<addRows>>({
  itemName: [{ required: true, message: t('inputPlaceholder.placeholderBase') + t('task.itemName') }],
  presetPositionId: [
    { required: true, message: t('inputPlaceholder.placeholderBase') + t('inspection.presetPositionName') },
  ],
  itemAttribute: [{ required: true, message: t('inputPlaceholder.placeholderBase') + t('inspection.itemAttribute') }],
  alarmLevel: [{ required: true, message: t('inputPlaceholder.placeholderBase') + t('alarm.alarmGrade') }],
  indexId: [{ required: true, message: t('inspection.indexId') }],
  needAlarm: [{ required: true, message: t('inspection.needAlarm'), type: 'boolean' }],
  isPopup: [{ required: true, message: t('inspection.isPopupMsg'), type: 'boolean' }],
});
const rulesArr = reactive<FormRules<ItemRules>>({
  alarmIndex: [{ required: true, message: t('inputPlaceholder.placeholderSelect') }],
  alarmRule: [{ required: true, message: t('inputPlaceholder.placeholderSelect') }],
  ruleValue: [{ required: true, message: t('inputPlaceholder.placeholderBase') }],
});
class formDataBase {
  alarmId = '';
  alarmName = '';
  isStatus = 0;
  itemName = '';
  itemRules = [];
  objectId = '';
  itemAttribute = '';
  presetPositionId = '';
  indexId = '';
  alarmLevel = '';
  needAlarm = false;
  isPopup = false;
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
  itemAttribute: '',
  indexId: '',
  alarmLevel: '',
  needAlarm: false,
  isPopup: false,
});
let itemAttribute = computed(() => formData.value.itemAttribute);
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
    await itemAttributeChange(data.indexId!);
    itemRules.value = data.itemRules;
    await getOptions2(data2);
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
  id?: string;
}
function selectClick() {
  formDialogRef.value.showDialog();
}
async function formDialogConfirm(ids: string[], arr: DialogProps) {
  let dialogPropsKey: keyof DialogProps;
  for (dialogPropsKey in dialogProps) {
    formData.value[dialogPropsKey] = arr[dialogPropsKey]!;
  }
  dialogArr.value = [arr];
  let { data: data2 } = await detailPositionApi({ id: arr.id! });
  await getOptions2(data2);
  itemRules.value = [
    {
      alarmIndex: '',
      alarmRule: '',
      ruleValue: '',
      alarmIndexUnit: '',
    },
  ];
}
async function getOptions2(data2: PositionListRows) {
  let arr: any[] = [];
  if (data2.needBusiness) {
    arr = (data2?.algorithmResultBeanList ?? []).map((i) => {
      return {
        label: i.algorithmRecognitionResults,
        value: i.id!,
      };
    });
  } else {
    let res = await getNeedBusiness(data2.algorithmCode!);
    arr = res.map((i) => ({ label: i.label, value: i.label }));
  }
  console.log(arr);
  alarmMentListOpt.value = arr;
}
//规则支撑数据
onMounted(() => {
  getIndexList();
  getDict('alarm_level').then((res) => {
    alarm_level = res;
  });
});
let IndexOptions: any[] = [];
let alarm_level: any[] = [];
let paramsOpt: any[] = [];
let alarmMentListOpt = ref<any[]>([]);
async function getIndexList() {
  let { data } = await getIndexListApi();
  IndexOptions = data;
}
async function itemAttributeChange(val: string) {
  let obj = IndexOptions.find((i) => i.id === val);
  if (obj) {
    paramsOpt = [{ alarmIndexId: obj.id, alarmIndexName: obj.indexName, alarmIndexUnit: obj.indexUnit || '' }];
  }
  itemRules.value = [
    {
      alarmIndex: '',
      alarmRule: '',
      ruleValue: '',
      alarmIndexUnit: '',
    },
  ];
}
function alarmIndexChange(val: string, index: number) {
  let obj = paramsOpt.find((i) => i.alarmIndexId === val);
  if (obj) {
    itemRules.value[index].alarmIndexUnit = obj.alarmIndexUnit;
  }
}
// 规则操作
let itemRules = ref<ItemRules[]>([]);
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
  close();
}
function close() {
  emit('openDialogChange', 'list');
}
</script>

<template>
  <div class="addPage">
    <div class="addPageCont">
      <el-scrollbar>
        <el-col :span="10" :xl="10" :lg="12" :md="12" :sm="24" :xs="24">
          <el-form ref="formRef" :rules="rules" label-suffix=" :" :model="formData" label-width="auto">
            <el-row>
              <el-col :span="24">
                <el-form-item :label="$t('task.itemName')" prop="itemName">
                  <el-input v-model="formData.itemName" :readonly="pageType === 'detail'" clearable></el-input>
                </el-form-item>
              </el-col>
              <el-col :span="24">
                <el-form-item :label="$t('inspection.presetPositionName')" prop="presetPositionId">
                  <el-input
                    v-model="formData.presetPositionName"
                    @click.prevent="selectClick"
                    readonly
                    suffix-icon="More"
                  ></el-input>
                </el-form-item>
              </el-col>
              <el-col :span="24">
                <el-form-item :label="$t('linkageSet.relatedSkills')" prop="relatedSkillsName">
                  <el-input v-model="formData.relatedSkillsName" readonly />
                </el-form-item>
              </el-col>
              <el-col :span="24">
                <el-row :gutter="15">
                  <el-col :span="14">
                    <el-form-item :label="$t('inspection.inspectionProps')" prop="itemAttribute">
                      <template #label="{ label }">
                        <div>
                          {{ label }}
                          <el-tooltip effect="light" placement="right">
                            <el-icon>
                              <Warning />
                            </el-icon>
                            <template #content>
                              <p>
                                {{ $t('inspection.Msg1') }}
                                <br />
                                {{ $t('inspection.Msg2') }}
                              </p>
                            </template>
                          </el-tooltip>
                        </div>
                      </template>
                      <el-select
                        v-model="formData.itemAttribute"
                        :disabled="pageType === 'detail'"
                        clearable
                        @change="itemAttributeChange"
                      >
                        <el-option :label="$t('inspection.state')" value="state"></el-option>
                        <el-option :label="$t('inspection.param')" value="param"></el-option>
                      </el-select>
                    </el-form-item>
                  </el-col>
                  <el-col :span="10" v-if="itemAttribute === 'param'">
                    <el-form-item prop="indexId">
                      <el-select
                        v-model="formData.indexId"
                        :disabled="pageType === 'detail'"
                        clearable
                        @change="itemAttributeChange"
                      >
                        <el-option
                          v-for="item in IndexOptions"
                          :key="item.id"
                          :label="item.indexName"
                          :value="item.id"
                        ></el-option>
                      </el-select>
                    </el-form-item>
                  </el-col>
                </el-row>
              </el-col>
              <el-col :span="24">
                <el-form-item :label="$t('inspection.needAlarm')" prop="needAlarm">
                  <el-radio-group :disabled="pageType === 'detail'" text-color="#000" v-model="formData.needAlarm">
                    <el-radio :value="true" size="large">{{ $t('common.s') }}</el-radio>
                    <el-radio :value="false" size="large">{{ $t('common.f') }}</el-radio>
                  </el-radio-group>
                </el-form-item>
              </el-col>
              <template v-if="formData.needAlarm">
                <el-col :span="24">
                  <el-form-item :label="$t('alarm.alarmGrade')" prop="alarmLevel">
                    <el-select v-model="formData.alarmLevel" :disabled="pageType === 'detail'" clearable>
                      <el-option
                        v-for="(item, index) in alarm_level"
                        :key="index"
                        :label="item.label"
                        :value="item.value"
                      ></el-option>
                    </el-select>
                  </el-form-item>
                </el-col>
                <el-col :span="24">
                  <el-form-item :label="$t('inspection.isPopup')" prop="isPopup">
                    <template #label="{ label }">
                      <div>
                        {{ label }}
                        <el-tooltip effect="light" placement="right">
                          <el-icon>
                            <Warning />
                          </el-icon>
                          <template #content>
                            <p>
                              {{ $t('inspection.Msg3') }}
                              <br />
                              {{ $t('inspection.Msg4') }}
                            </p>
                          </template>
                        </el-tooltip>
                      </div>
                    </template>
                    <el-switch
                      v-model="formData.isPopup"
                      :disabled="pageType === 'detail'"
                      :active-value="true"
                      :inactive-value="false"
                    />
                  </el-form-item>
                </el-col>
                <el-col :span="24" v-if="itemAttribute">
                  <div class="rules-title">
                    {{ $t('alarm.alarmRules') }}
                    <span class="rules-title-sub" v-if="itemAttribute === 'param'">{{
                      $t('inspection.alarmRules1')
                    }}</span>
                  </div>
                  <el-form-item label="123" class="labelHide" v-if="itemAttribute === 'param'" prop="ruleCondition">
                    <el-radio-group
                      :disabled="pageType === 'detail'"
                      text-color="#000"
                      v-model="formData.ruleCondition"
                    >
                      <el-radio :value="1" size="large">{{ $t('inspection.alarmRules2') }}</el-radio>
                      <el-radio :value="0" size="large">{{ $t('inspection.alarmRules3') }}</el-radio>
                    </el-radio-group>
                  </el-form-item>
                </el-col>
              </template>
            </el-row>
          </el-form>
          <el-form
            v-if="formData.needAlarm && itemAttribute"
            ref="formListRef"
            :rules="rulesArr"
            label-suffix=" :"
            :disabled="pageType === 'detail'"
            :model="itemRules"
            label-width="auto"
          >
            <el-row>
              <el-col :span="24">
                <div class="rules-list">
                  <div class="rules-list-item" ref="rulesListItemRef" :key="index" v-for="(item, index) in itemRules">
                    <template v-if="itemAttribute === 'state'">
                      <div class="rules-label is-required">{{ $t('alarm.alarmStatus') }} :</div>
                      <div class="select-item">
                        <el-form-item :prop="`${index}.alarmIndex`" :rules="rulesArr.alarmIndex">
                          <el-select v-model="item.alarmIndex" clearable>
                            <el-option
                              :label="item.label"
                              :key="item.value"
                              v-for="item in alarmMentListOpt"
                              :value="item.value"
                            ></el-option>
                          </el-select>
                        </el-form-item>
                      </div>
                    </template>
                    <template v-else>
                      <div class="rules-label"></div>
                      <div class="select-item">
                        <el-form-item :prop="`${index}.alarmIndex`" :rules="rulesArr.alarmIndex">
                          <el-select
                            :placeholder="$t('inputPlaceholder.placeholderSelect') + $t('inspection.zb')"
                            v-model="item.alarmIndex"
                            clearable
                            @change="alarmIndexChange($event, index)"
                          >
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
                          <el-select
                            :placeholder="$t('inputPlaceholder.placeholderSelect') + $t('inspection.rules')"
                            v-model="item.alarmRule"
                            clearable
                          >
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
                          <el-input
                            :placeholder="$t('inputPlaceholder.placeholderBase')"
                            v-model="item.ruleValue"
                            clearable
                          >
                            <template #suffix>
                              <i class="el-icon" style="color: var(--el-text-color-regular)">
                                {{ item.alarmIndexUnit }}
                              </i>
                            </template>
                          </el-input>
                        </el-form-item>
                      </div>
                    </template>
                    <div class="rules-add-icon flx-center" v-if="pageType !== 'detail' && itemAttribute === 'param'">
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
        </el-col>
      </el-scrollbar>
    </div>
    <div class="bottomBtn">
      <el-button class="button-size" @click="close">{{ $t('ui.cancel') }}</el-button>
      <el-button class="button-size" v-if="pageType !== 'detail'" @click="confirm" type="primary">{{
        $t('buttonName.save')
      }}</el-button>
    </div>
    <formDialog
      ref="formDialogRef"
      :pageType="pageType"
      @confirm="formDialogConfirm"
      :list="dialogArr"
      :title="$t('inspection.needPosition')"
    ></formDialog>
  </div>
</template>

<style scoped lang="scss">
@use '@optCenter/style/addPage.scss';
</style>
