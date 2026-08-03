<script setup lang="ts">
import { computed, nextTick, reactive, ref, onMounted } from 'vue';
import type {
  Id,
  PageType,
  addRows,
  ItemRules,
  ItemRunTime,
  PageTypeTitle,
} from '@/api/modules/optCenter/aiPatrolManage/watching';
import { detailWatchingApi, addWatchingApi } from '@/api/modules/optCenter/aiPatrolManage/watching';
import videoControls from '@optCenter/videoRealTime.vue';
import pictureDimension from '@optCenter/components/picDimension/pictureDimension.vue';
import { ElImageViewer, ElMessage, FormInstance, FormRules } from 'element-plus';
import { getAlarmAllListApi } from '@/api/modules/optCenter/aiPatrolManage/inspection';
import { useBackFileUrl, usePicture, useRemoveURLObject } from '@optCenter/hooks/use-file-utils';
import { VueInstance } from '@vueuse/core';
import { algorithmGetAll, Row as AIRow } from '@/api/modules/optCenter/Almanagement/AIModelManagement';
interface props {
  id?: Id;
  cameraId?: string;
  pageType: PageType;
}
const props = withDefaults(defineProps<props>(), {});
const typeTitle = computed(() => PageTypeTitle[props.pageType]);

interface Emits {
  (e: 'openDialogChange', page: PageType, row?: addRows): void;
}
const emit = defineEmits<Emits>();

const open = ref(false);
const AIList = ref<AIRow[]>([]);
function openDialog() {
  open.value = true;
  getDetail();
}
onMounted(() => {
  getAIList();
});
function getAIList() {
  algorithmGetAll().then((res) => {
    AIList.value = res.data;
  });
}
function skillChange(val: string) {}
//form
const rulesArr = reactive<FormRules<ItemRules>>({
  alarmIndex: [{ required: true, message: '请选择' }],
  alarmRules: [{ required: true, message: '请选择' }],
  rulesValue: [{ required: true, message: '请输入' }],
});
const rulesTimeArr = reactive<FormRules<ItemRunTime>>({
  times: [{ required: true, message: '请选择', type: 'array' }],
});
const rules = reactive<FormRules<addRows>>({
  relatedSkillsId: [{ required: false, message: '请选择关联技能' }],
  alarmId: [{ required: true, message: '请选择告警名称' }],
});
class formBase {
  relatedSkillsId = '';
  ruleCondition = 1;
  isStatus = 0;
  alarmId = '';
  alarmName = '';
  alarmType = '';
  rulesList = [
    {
      alarmIndex: '',
      rulesValue: '',
      alarmRules: '',
      alarmIndexUnit: '',
    },
  ];
  runtimeList = [
    {
      runtimeStart: '',
      runtimeEnd: '',
      times: [],
    },
  ];
  capture = '';
}
let formData = ref<addRows>({
  relatedSkillsId: '',
  alarmId: '',
  alarmType: '',
  capture: '',
  rulesList: [
    {
      alarmIndex: '',
      rulesValue: '',
      alarmRules: '',
    },
  ],
  runtimeList: [
    {
      runtimeStart: '',
      runtimeEnd: '',
      times: [],
    },
  ],
});
const urlArr = useRemoveURLObject();
async function getDetail() {
  await nextTick();
  if (props.id) {
    let { data } = await detailWatchingApi({ id: props.id });
    formData.value = data;
    if (data.monitorPic) {
      url2.value = (await useBackFileUrl(data.monitorPic)) || '';
      urlArr.add(url2.value);
    }
    alarmChange(data.alarmId, false);
    data.rulesList.forEach((i, index) => {
      alarmIndexChange(i.alarmIndex!, index);
    });
    data.runtimeList.forEach((i, index) => {
      i.times = [i.runtimeStart, i.runtimeEnd];
    });
  } else {
    formData.value = new formBase() as addRows;
    url2.value = '';
    paramsOpt = [];
    alarmMentListOpt = [];
  }
}
//规则arr
let alarmOptions: any[] = [];
let paramsOpt: any[] = [];
let alarmMentListOpt: any[] = [];
let rulesListItemRef = ref<HTMLElement[]>();
let realTimeRef = ref<HTMLElement[]>();
onMounted(() => {
  getAlarmOption();
});
async function getAlarmOption() {
  let { data } = await getAlarmAllListApi();
  alarmOptions = data;
}
function addRules() {
  let rules: ItemRules = {
    alarmIndex: '',
    alarmRules: '',
    rulesValue: '',
  };
  formData.value.rulesList.push(rules);
  nextTick(() => {
    let target = rulesListItemRef.value?.at(-1);
    target?.scrollIntoView(false);
  });
}
function deleteRules(index: number) {
  formData.value.rulesList.splice(index, 1);
}
function alarmChange(val: string, first: boolean = true) {
  let obj = alarmOptions.find((i) => i.id === val);
  if (obj) {
    formData.value.isStatus = obj.alarmAttribute === 'state' ? 1 : 0;
    paramsOpt = [
      { alarmIndexId: obj.alarmIndexId, alarmIndexName: obj.alarmIndexName, alarmIndexUnit: obj.alarmIndexUnit },
    ];
    alarmMentListOpt = obj.alarmMentList ?? [];
    formData.value.alarmId = obj.id;
    formData.value.alarmName = obj.alarmName;
    formData.value.alarmType = obj.alarmType;
    if (first)
      formData.value.rulesList = [
        {
          alarmIndex: '',
          alarmRules: '',
          rulesValue: '',
          alarmIndexUnit: '',
        },
      ];

    // formData.value.ruleCondition = 1;
  } else {
    formData.value.alarmId = '';
    formData.value.alarmName = '';
    formData.value.alarmType = '';
    paramsOpt = [];
    alarmMentListOpt = [];
  }
}
function alarmIndexChange(val: string, index: number) {
  let obj = paramsOpt.find((i) => i.alarmIndexId === val);
  if (obj) {
    formData.value.rulesList[index].alarmIndexUnit = obj.alarmIndexUnit;
  }
}
function addRunTime() {
  if (formData.value.runtimeList.length < 3) {
    let rules: ItemRunTime = {
      runtimeEnd: '',
      runtimeStart: '',
      times: [],
    };
    formData.value.runtimeList.push(rules);
    nextTick(() => {
      let target = realTimeRef.value?.at(-1);
      target?.scrollIntoView({ block: 'nearest' });
    });
  }
}
function deleteRunTime(index: number) {
  formData.value.runtimeList.splice(index, 1);
}
function timeChange(item: ItemRunTime, arr: string[]) {
  item.runtimeStart = arr?.[0] || '';
  item.runtimeEnd = arr?.[1] || '';
}
//抓图
let {
  openPictureDialog,
  confirmPicture,
  closePicture,
  pictureDimensionRef,
  videoControlsRef,
  openPicture,
  url2,
  file,
  position,
} = usePicture(formData);
let showUrl2 = ref(false);
function showUrl(is: boolean = true) {
  showUrl2.value = is;
}
//提交
let formRef = ref<FormInstance>();
let formListRef = ref<FormInstance>();
let formTimeListRef = ref<FormInstance>();
const confirm = async () => {
  await formRef.value?.validate();
  await formListRef.value?.validate();
  await formTimeListRef.value?.validate();
  let newFormData = new FormData();
  let newFormDataKey: keyof addRows;
  for (newFormDataKey in new formBase()) {
    if (!['rulesList', 'runtimeList'].includes(newFormDataKey)) {
      newFormData.append(newFormDataKey, formData.value[newFormDataKey] as string);
    }
  }
  newFormData.append(
    'rulesListStr',
    JSON.stringify(
      formData.value.rulesList.map((i) => {
        let { alarmIndexUnit, ...data } = i;
        return data;
      })
    )
  );
  newFormData.append(
    'runtimeListStr',
    JSON.stringify(
      formData.value.runtimeList.map((i) => {
        let { times, ...data } = i;
        return data;
      })
    )
  );

  if (props.id) newFormData.append('id', props.id);
  newFormData.append('cameraId', props.cameraId!);

  if (file.value) newFormData.append('files', file.value);
  if (position.value) newFormData.append('position', JSON.stringify(position.value));
  let { description } = await addWatchingApi(newFormData);
  ElMessage.success(description);
  emit('openDialogChange', 'list', undefined);
  close();
};
const close = function () {
  open.value = false;
};
defineExpose({
  openDialog,
});
</script>

<template>
  <KrPublicDialog
    :noFootBtn="pageType === 'detail'"
    :title="`${typeTitle}关联技能`"
    v-model="open"
    width="1270px"
    @doSubmit="confirm"
    @doClose="close"
  >
    <el-form
      ref="formRef"
      :model="formData"
      label-suffix=" :"
      :disabled="pageType === 'detail'"
      :rules="rules"
      label-width="auto"
    >
      <el-row class="watching-add-page">
        <el-col :span="24">
          <el-row :gutter="30">
            <el-col :span="12">
              <el-form-item label="关联技能" prop="relatedSkillsId">
                <el-select v-model="formData.relatedSkillsId" clearable @change="skillChange">
                  <el-option
                    :label="item.algorithmName"
                    :value="item.id"
                    :key="item.id"
                    v-for="item in AIList"
                  ></el-option>
                </el-select>
                <!--                <el-input v-model="formData.relatedSkillsId"></el-input>-->
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="告警名称" prop="alarmId">
                <el-select v-model="formData.alarmId" filterable clearable @change="alarmChange">
                  <el-option
                    :label="item.alarmName"
                    :key="item.id"
                    :value="item.id"
                    v-for="item in alarmOptions"
                  ></el-option>
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
        </el-col>
        <el-col :span="24">
          <div class="rules-title watching-public-title">告警规则</div>
          <template v-if="!formData.isStatus">
            <div class="rules-title-sub">满足如下条件范围</div>
            <div class="rules-radio">
              <el-radio-group v-model="formData.ruleCondition">
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
      :model="formData.rulesList"
      label-width="auto"
    >
      <el-row class="watching-add-page">
        <el-col :span="24">
          <div class="rules-list">
            <div
              class="rules-list-item"
              ref="rulesListItemRef"
              :key="index"
              v-for="(item, index) in formData.rulesList"
            >
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
                  <el-form-item :prop="`${index}.alarmRules`" :rules="rulesArr.alarmRules">
                    <el-select v-model="item.alarmRules" clearable>
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
                  <el-form-item :prop="`${index}.rulesValue`" :rules="rulesArr.rulesValue">
                    <el-input v-model="item.rulesValue" clearable>
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
    <el-form
      ref="formTimeListRef"
      :rules="rulesTimeArr"
      label-suffix=" :"
      :disabled="pageType === 'detail'"
      :model="formData.runtimeList"
      label-width="auto"
    >
      <el-row class="watching-add-page">
        <el-col :span="24">
          <div class="watching-title watching-public-title">监控方位及规则设置</div>
          <div class="watching-content">
            <div class="watching-content-left">
              <videoControls v-if="open" :cameraId="cameraId" ref="videoControlsRef" />
            </div>
            <div class="watching-content-right">
              <div class="watching-public-title">框定分析区域</div>
              <div class="img-add" v-if="!url2" @click="openPictureDialog(true)">
                <el-icon><CirclePlus /></el-icon>
                <span class="info">去框定</span>
              </div>
              <div class="img" v-else>
                <el-image
                  style="width: 100%; height: 100%"
                  :src="url2"
                  :zoom-rate="1.2"
                  :max-scale="7"
                  :min-scale="0.2"
                  :preview-src-list="[url2]"
                  :preview-teleported="true"
                  fit="cover"
                />
                <div class="img-Edit-delete">
                  <template v-if="pageType !== 'detail'">
                    <el-icon size="24" title="查看" @click="showUrl"><ZoomIn /></el-icon>
                    <el-icon size="24" title="编辑" @click="openPictureDialog(false)"><EditPen /></el-icon>
                    <el-icon size="24" title="重新抓图" @click="openPictureDialog(true)"><Refresh /></el-icon>
                  </template>
                  <template v-else>
                    <el-icon size="24" title="查看" @click="showUrl"><ZoomIn /></el-icon>
                  </template>
                </div>
                <el-image-viewer :url-list="[url2]" v-if="showUrl2" @close="showUrl(false)"></el-image-viewer>
              </div>
              <div class="watching-public-title watching-step-title">运行时段</div>
              <div class="watching-step-content">
                <div
                  class="watching-step-list-item"
                  ref="realTimeRef"
                  :key="index"
                  v-for="(item, index) in formData.runtimeList"
                >
                  <div class="select-item">
                    <el-form-item :prop="`${index}.times`" :rules="rulesTimeArr.times">
                      <el-time-picker
                        v-model="item.times"
                        is-range
                        range-separator="-"
                        start-placeholder="开始时间"
                        end-placeholder="结束时间"
                        value-format="HH:mm"
                        format="HH:mm"
                        time-format="HH:mm"
                        @change="timeChange(item, $event)"
                      />
                    </el-form-item>
                  </div>
                  <div class="watching-step-add-icon flx-center" v-if="pageType !== 'detail'">
                    <el-icon size="20" v-if="index !== 0" @click="deleteRunTime(index)">
                      <Delete />
                    </el-icon>
                    <el-icon size="20" v-if="index === 0" @click="addRunTime">
                      <CirclePlus />
                    </el-icon>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </el-col>
      </el-row>
    </el-form>
  </KrPublicDialog>
  <KrPublicDialog
    :title="`框选`"
    v-model="openPicture"
    width="900px"
    @doSubmit="confirmPicture"
    @doClose="closePicture"
  >
    <div style="display: flex; justify-content: center">
      <pictureDimension
        ref="pictureDimensionRef"
        v-if="openPicture"
        :backgroundUrl="url2"
        style="width: 710px; height: 460px"
        :form-json="formData.capture"
      ></pictureDimension>
    </div>
  </KrPublicDialog>
</template>

<style scoped lang="scss">
.watching-add-page {
  padding: 0 40px;
  .watching-public-title {
    font-size: 16px;
  }
  .rules-title {
    margin-bottom: 20px;
  }
  .rules-title-sub {
    margin-bottom: 16px;
    color: var(--el-text-color-secondary);
  }
  .rules-list {
    margin-top: 10px;
    .rules-list-item {
      display: flex;
      gap: 15px;
      margin-bottom: 2px;
      .select-item {
        flex: 1;
      }
      .rules-add-icon {
        height: var(--el-component-size);
        cursor: pointer;
        .el-icon + .el-icon {
          margin-left: 12px;
        }
      }
      &:last-child {
        margin-bottom: 0;
      }
    }
  }
  .watching-title {
    margin-top: 20px;
    margin-bottom: 16px;
  }
  .watching-content {
    display: flex;
    gap: 20px;
    height: 498px;
    &-left {
      width: 885px;
      height: inherit;
      overflow: hidden;
      background: var(--el-color-black);
      border-radius: 6px;
    }
    &-right {
      flex: 1;
      height: inherit;
      .img,
      .img-add {
        width: 200px;
        height: 120px;
        margin-top: 16px;
        overflow: hidden;
        cursor: pointer;
        border-radius: 6px;
      }
      .img-add {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        background: #f4f4f4;
        .el-icon {
          font-size: 20px;
        }
        span.info {
          margin-top: 10px;
          color: var(--el-text-color-secondary);
        }
      }
      .img {
        position: relative;
        &:hover {
          .img-Edit-delete {
            display: flex;
          }
        }
        .img-Edit-delete {
          position: absolute;
          top: 0;
          left: 0;
          display: none;
          align-items: center;
          justify-content: space-evenly;
          width: 100%;
          height: 100%;
          color: #ffffff;
          background: #0d0d0d65;
        }
      }
      .watching-step-title {
        margin-top: 20px;
      }
      .watching-step-content {
        margin-top: 10px;
        .watching-step-list-item {
          display: flex;
          margin-bottom: 2px;
          .select-item {
            flex: 1;
          }
          .watching-step-add-icon {
            height: var(--el-component-size);
            margin-left: 14px;
            cursor: pointer;
            .el-icon + .el-icon {
              margin-left: 12px;
            }
          }
          &:last-child {
            margin-bottom: 0;
          }
        }
      }
    }
  }
  :deep(.el-radio__input.is-checked + .el-radio__label) {
    color: initial;
  }
}
:deep(.el-dialog__body) {
  scroll-behavior: smooth;
}
</style>
