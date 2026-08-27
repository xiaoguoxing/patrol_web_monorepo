<script setup lang="ts">
import { nextTick, onMounted, reactive, ref } from 'vue';
import {
  addRows,
  addWatchingApi,
  detailWatchingApi,
  Id,
  PageType,
  rows,
} from '@/api/modules/optCenter/aiPatrolManage/watching';
import videoControls from '@optCenter/videoRealTime.vue';
import { ElMessage, FormInstance, FormRules } from 'element-plus';
import { Warning } from '@element-plus/icons-vue';
import { algorithmGetAll, Row as AIRow } from '@/api/modules/optCenter/Almanagement/AIModelManagement';
import { getDict, getNeedBusiness } from '@/utils/serviceDict';
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
interface props {
  id?: Id;
  cameraId: string;
  pageType: PageType;
}
const props = withDefaults(defineProps<props>(), {});

interface Emits {
  (e: 'pageChange', page: PageType, row?: rows): void;
  (e: 'reSearch'): void;
}
const emit = defineEmits<Emits>();

onMounted(() => {
  getDetail();
  getDict('alarm_level').then((res) => {
    alarm_level.value = res;
  });
});
async function getDetail() {
  getAIList();
  await nextTick();
  if (props.id) {
    let { data } = await detailWatchingApi({ id: props.id });
    formData.value = data;
    await skillChange(data.relatedSkillsId);
  } else {
    formData.value = new formBase() as addRows;
  }
}
let AIList = ref<AIRow[]>([]);
let alarm_level = ref<any[]>([]);
let alarmStateListOpt = ref<any[]>([]);
function getAIList() {
  algorithmGetAll({ identifyType: 'monitor' }).then((res) => {
    AIList.value = res.data;
  });
}
async function skillChange(val: string, isClear: boolean = true) {
  let obj = AIList.value.find((i) => i.id == val);
  if (obj) {
    alarmStateListOpt.value = await getNeedBusiness(obj.algorithmCode);
    formData.value.relatedSkillsName = obj.algorithmName;
  }
}
function alarmStatusChange(val: string) {
  let obj = alarmStateListOpt.value.find((i) => i.value == val);
  if (obj) {
    formData.value.alarmStatusName = obj.label;
  }
}

const rules = reactive<FormRules<addRows>>({
  relatedSkillsId: [
    { required: true, message: t('inputPlaceholder.placeholderSelect') + t('linkageSet.relatedSkills') },
  ],
  alarmLevel: [{ required: true, message: t('inputPlaceholder.placeholderSelect') + t('alarm.alarmGrade') }],
  isPopup: [{ required: true, message: t('inputPlaceholder.placeholderSelect') + t('inspection.batchOffOn') }],
  alarmStatus: [{ required: true, message: t('inputPlaceholder.placeholderSelect') + t('linkageSet.relatedSkills') }],
});
class formBase {
  relatedSkillsId = '';
  alarmStatus = '';
  isPopup = 0;
  monitorStatus = 0;
  relatedSkillsName = '';
  alarmStatusName = '';
  alarmLevel = '';
}
let formData = ref<addRows>({
  relatedSkillsId: '',
  relatedSkillsName: '',
  alarmStatusName: '',
  alarmStatus: '',
  isPopup: 0,
  monitorStatus: 0,
  alarmLevel: '',
});

let formRef = ref<FormInstance>();
const confirm = async () => {
  try {
    await formRef.value?.validate();
    let newFormData: any = {
      cameraId: props.cameraId,
    };
    let newFormDataKey: keyof addRows;
    for (newFormDataKey in new formBase()) {
      newFormData[newFormDataKey] = formData.value[newFormDataKey];
    }
    if (props.id) newFormData.id = props.id;

    let { description } = await addWatchingApi(newFormData);
    ElMessage.success(description);
    close();
    emit('reSearch');
  } catch (e) {}
};
const close = () => {
  emit('pageChange', 'list');
};
</script>

<template>
  <div class="addPage">
    <div class="addPageCont">
      <el-scrollbar>
        <el-col :xl="15" :lg="15" :md="15" :sm="24" :xs="24">
          <el-form ref="formRef" :rules="rules" label-suffix=" :" :model="formData" label-width="auto">
            <el-row>
              <el-col :span="24">
                <el-form-item :label="$t('linkageSet.relatedSkills')" prop="relatedSkillsId">
                  <el-select
                    v-model="formData.relatedSkillsId"
                    :disabled="pageType === 'detail'"
                    clearable
                    filterable
                    @change="skillChange"
                  >
                    <el-option
                      v-for="item in AIList"
                      :key="item.id"
                      :label="item.algorithmName"
                      :value="item.id"
                    ></el-option>
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="24">
                <el-form-item :label="$t('camera.monitorLocation')">
                  <div class="videoFormControls">
                    <videoControls :cameraId="cameraId" ref="videoControlsRef" />
                  </div>
                </el-form-item>
              </el-col>
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
                    :active-value="1"
                    :inactive-value="0"
                  />
                </el-form-item>
              </el-col>
              <el-col :span="24">
                <div class="rules-title">{{ $t('alarm.alarmRules') }}</div>
              </el-col>
              <el-col :span="24">
                <div class="rules-list">
                  <div class="rules-list-item" ref="rulesListItemRef">
                    <div class="rules-label is-required">{{ $t('alarm.alarmStatus') }} :</div>
                    <div class="select-item">
                      <el-form-item :prop="`alarmStatus`">
                        <el-select v-model="formData.alarmStatus" @change="alarmStatusChange" clearable>
                          <el-option
                            :label="item.label"
                            :key="item.value"
                            v-for="item in alarmStateListOpt"
                            :value="item.value"
                          ></el-option>
                        </el-select>
                      </el-form-item>
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
  </div>
</template>

<style scoped lang="scss">
@use '@optCenter/style/addPage.scss';
.addPage {
  .videoFormControls {
    width: 100%;
    height: 400px;
  }
}
</style>
