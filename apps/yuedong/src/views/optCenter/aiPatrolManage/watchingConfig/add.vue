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
import HKcloud from '@optCenter/components/videocloud/HKcloud.vue';

interface props {
  id?: Id;
  cameraId: string;
  pageType: PageType;
}
const props = withDefaults(defineProps<props>(), {});

interface Emits {
  (e: 'pageChange', page: PageType, row?: rows): void;
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
  relatedSkillsId: [{ required: true, message: '请选择关联技能' }],
  alarmLevel: [{ required: true, message: '请选择告警等级' }],
  isPopup: [{ required: true, message: '请选择是否弹窗' }],
  alarmStatus: [{ required: true, message: '请选择技能规则' }],
});
const videoControlsRef = ref();
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
function isHKControl(val: boolean = true) {
  let play = videoControlsRef.value.currentComponentName.play;
  val ? play.hideControl() : play.showControl();
}
function scroll() {
  let play = videoControlsRef.value.currentComponentName.play;
  play.setControlRect();
}

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
  } catch (e) {}
};
const close = () => {
  emit('pageChange', 'list');
};
</script>

<template>
  <div class="addPage">
    <div class="addPageCont">
      <el-scrollbar @scroll="scroll">
        <el-col :xl="15" :lg="15" :md="15" :sm="24" :xs="24">
          <el-form ref="formRef" :rules="rules" label-suffix=" :" :model="formData" label-width="auto">
            <el-row>
              <el-col :span="24">
                <el-form-item label="技能名称" prop="relatedSkillsId">
                  <el-select
                    v-model="formData.relatedSkillsId"
                    :disabled="pageType === 'detail'"
                    @visible-change="isHKControl"
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
              <el-col :span="19">
                <el-form-item label="监控方位设置">
                  <div class="videoFormControls">
                    <videoControls :cameraId="cameraId" :playType="5" ref="videoControlsRef" />
                  </div>
                </el-form-item>
              </el-col>
              <el-col :span="5">
                <HKcloud :cameraId="cameraId" :abc="cameraId" />
              </el-col>
              <el-col :span="24">
                <el-form-item label="告警等级" prop="alarmLevel">
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
                <el-form-item label="弹框推送" prop="isPopup">
                  <template #label="{ label }">
                    <div>
                      {{ label }}
                      <el-tooltip effect="light" placement="right">
                        <el-icon>
                          <Warning />
                        </el-icon>
                        <template #content>
                          <p>
                            弹框推送关闭，则告警发生时默认仅推送消息提醒;
                            <br />
                            弹框推送开启，则告警发生时同步推送消息提醒和告警单框。
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
                <div class="rules-title">告警规则</div>
              </el-col>
              <el-col :span="24">
                <div class="rules-list">
                  <div class="rules-list-item" ref="rulesListItemRef">
                    <div class="rules-label is-required">告警状态 :</div>
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
      <el-button class="button-size" @click="close">取消</el-button>
      <el-button class="button-size" v-if="pageType !== 'detail'" @click="confirm" type="primary">保存</el-button>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@optCenter/style/addPage.scss';
.addPage {
  .videoFormControls {
    width: 100%;
    height: 400px;
    margin-right: 10px;
  }
}
</style>
