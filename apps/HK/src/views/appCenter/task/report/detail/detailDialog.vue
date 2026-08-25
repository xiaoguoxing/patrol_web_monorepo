<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue';
import pictureDimension from '@optCenter/components/picDimension/pictureDimension.vue';
import { getDict, getNeedBusiness } from '@/utils/serviceDict';
import { detailInspectionApi } from '@/api/modules/optCenter/aiPatrolManage/inspection';
import { FormInstance, FormRules } from 'element-plus';
import { detailPositionApi, PositionListRows } from '@/api/modules/optCenter/aiPatrolManage/position';
import { getIndexListApi } from '@/api/modules/optCenter/inspectionSet/alarm';
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
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
interface props {
  id?: string;
  rowData?: FormData;
}

const props = withDefaults(defineProps<props>(), {});
interface Emit {
  (e: 'confirm', row: FormData): void;
}
const emit = defineEmits<Emit>();

let inspection_conclusion: { label: ''; value: '' }[] = [];
onMounted(async () => {
  await getIndexList();
  inspection_conclusion = (await getDict('inspection_conclusion')) as { label: ''; value: ''; remark: string }[];
});
const inspectionConclusion = computed(() => {
  return inspection_conclusion.find((i) => i.value === props.rowData?.inspectionConclusion)?.label || '';
});

let show = ref(false);
let alarmMentListOpt = ref<any[]>([]);
let IndexOptions = ref<any[]>([]);
let isState = ref(true);
let unit = ref('');
async function openDialog() {
  formData.value = {
    checkConclusion: '',
    checkResult: '',
    // checkPicFile: undefined,
    // position: undefined,
  };
  show.value = true;
  await getAlarmDetail();
}
async function getIndexList() {
  let { data } = await getIndexListApi();
  IndexOptions.value = data;
}
async function getAlarmDetail() {
  await nextTick();
  console.log(props.rowData);
  let { data } = await detailInspectionApi({ id: props.rowData?.itemId! });
  let { data: data2 } = await detailPositionApi({ id: data.presetPositionId });
  isState.value = data.itemAttribute === 'state';
  await getOptions2(data2);
  let obj = IndexOptions.value.find((i) => i.id === data.indexId);
  if (obj) {
    unit.value = obj.indexUnit || '';
  }
}
let rules = ref<FormRules<FormData>>({
  checkConclusion: [
    { required: true, message: `${t('inputPlaceholder.placeholderSelect')}${t('aiInspection.inspectionResult')}` },
  ],
  checkResult: [{ required: true, message: `${t('inputPlaceholder.placeholderSelect')}${t('task.checkResult')}` }],
});
let formData = ref<FormData>({
  checkConclusion: '',
  checkResult: '',
  // checkPicFile: undefined,
  // position: undefined,
});
async function getOptions2(data2: PositionListRows) {
  let arr: any[] = [];
  if (data2.needBusiness) {
    arr = (data2?.algorithmResultBeanList ?? []).map((i) => {
      return {
        label: i.algorithmRecognitionResults,
        value: i.algorithmRecognitionResults!,
      };
    });
  } else {
    let res = await getNeedBusiness(data2.algorithmCode!);
    arr = res.map((i) => ({ label: i.label, value: i.label }));
  }
  console.log(arr);
  alarmMentListOpt.value = arr;
}

let capture = ref();
let pictureDimensionRef = ref();
let formRef = ref<FormInstance>();

async function confirm() {
  await formRef.value?.validate();
  if (pictureDimensionRef.value?.exportLoadImage()) {
    let canvas = pictureDimensionRef.value.canvasIns();
    if (canvas._objects.length !== 0) {
      let { dataURLtoFile, position } = pictureDimensionRef.value?.exportLoadImage();
      formData.value.checkPicFile = dataURLtoFile;
      formData.value.position = position;
    } else {
      Reflect.deleteProperty(formData.value, 'checkPicFile');
    }
  }
  emit('confirm', formData.value);
  close();
}
function close() {
  show.value = false;
}
defineExpose({
  openDialog,
});
</script>

<template>
  <KrPublicDialog
    width="60%"
    :btnText="[$t('ui.cancel'), $t('task.qrxz')]"
    :title="$t('task.resFh')"
    v-model="show"
    @doSubmit="confirm"
    @doClose="close"
  >
    <div class="detailDialog">
      <div class="detailDialog-left">
        <!--        <pictureDimension
          ref="pictureDimensionRef"
          v-if="rowData?.imgPath && show"
          :backgroundUrl="rowData.imgPath!"
          :form-json="capture"
        ></pictureDimension>-->
        <el-image v-if="rowData?.imgPath && show" :src="rowData.imgPath!" fit="contain">
          <template #error>
            <el-empty class="pic-empty" :description="$t('alarm.picEmpty')">
              <template #image>
                <img src="@/assets/images/notData.png" />
              </template>
            </el-empty>
          </template>
        </el-image>
        <el-empty v-else class="pic-empty" :description="$t('alarm.picEmpty2')">
          <template #image>
            <img src="@/assets/images/notData.png" />
          </template>
        </el-empty>
      </div>
      <div class="detailDialog-right">
        <div class="detailDialog-right-title kr-font-medium">{{ $t('aiInspection.inspectionRes') }}</div>
        <div class="detailDialog-right-description">
          <div class="detailDialog-right-description-items">
            <div class="detailDialog-right-description-items-label">{{ $t('aiInspection.inspectionResult') }}：</div>
            <div class="detailDialog-right-description-items-value">{{ inspectionConclusion }}</div>
          </div>
          <div class="detailDialog-right-description-items">
            <div class="detailDialog-right-description-items-label">{{ $t('aiInspection.recognitionResult') }}：</div>
            <div class="detailDialog-right-description-items-value">{{ rowData?.recognitionResult ?? '' }}</div>
          </div>
        </div>
        <div class="detailDialog-right-title kr-font-medium">{{ $t('task.Fhres') }}</div>
        <el-form ref="formRef" :rules="rules" label-suffix=" :" :model="formData">
          <div class="detailDialog-right-description">
            <div class="detailDialog-right-description-items no20">
              <div class="detailDialog-right-description-items-label">{{ $t('aiInspection.inspectionResult') }}：</div>
              <el-form-item class="detailDialog-right-description-items-value" prop="checkConclusion">
                <el-radio-group v-model="formData.checkConclusion">
                  <el-radio :value="item.value" :key="item.value" size="large" v-for="item in inspection_conclusion">{{
                    item.label
                  }}</el-radio>
                </el-radio-group>
              </el-form-item>
            </div>
            <div class="detailDialog-right-description-items no20">
              <div class="detailDialog-right-description-items-label">{{ $t('task.checkResult') }}：</div>
              <el-form-item class="detailDialog-right-description-items-value" prop="checkResult">
                <template v-if="isState">
                  <el-select v-model="formData.checkResult" clearable>
                    <el-option
                      :label="item.label"
                      :key="item.id"
                      v-for="item in alarmMentListOpt"
                      :value="item.value"
                    ></el-option>
                  </el-select>
                </template>
                <template v-else>
                  <el-input v-model="formData.checkResult">
                    <template #suffix>{{ unit }}</template>
                  </el-input>
                </template>
              </el-form-item>
            </div>
          </div>
        </el-form>
        <el-popover placement="bottom-start" :width="290" trigger="hover" :content="$t('task.operationInfo')">
          <template #reference>
            <div class="detailDialog-right-tip">
              <el-icon size="16"><Warning /></el-icon>
              <span>{{ $t('task.operationInfoLabel') }}</span>
            </div>
          </template>
        </el-popover>
      </div>
    </div>
  </KrPublicDialog>
</template>

<style scoped lang="scss">
.detailDialog {
  display: flex;
  gap: 20px;
  height: calc(447px + 60px);
  .detailDialog-left {
    flex: 1;
    .el-image {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    .pic-empty {
      width: 100%;
      height: 100%;
      background: var(--el-fill-color-light);
    }
  }
  .detailDialog-right {
    width: 290px;
    .detailDialog-right-title {
      margin-bottom: 20px;
      font-size: 16px;
      color: var(--el-text-color-primary);
    }
    .detailDialog-right-description {
      .detailDialog-right-description-items {
        display: flex;
        align-items: baseline;
        margin-bottom: 20px;
        &.no20 {
          margin-bottom: 0;
        }
        .detailDialog-right-description-items-label {
          width: 70px;
          color: var(--el-text-color-regular);
        }
        .detailDialog-right-description-items-value {
          flex: 1;
          margin-left: 20px;
          color: var(--el-text-color-primary);
        }
      }
    }
    .detailDialog-right-tip {
      display: flex;
      align-items: center;
      width: 80px;
      margin-top: 50px;
      color: var(--el-text-color-secondary);
      cursor: pointer;
      &:hover {
        color: var(--el-text-color-regular);
      }
    }
  }
}
</style>
