<script setup lang="ts">
import { computed, reactive, ref, nextTick, onMounted, watch } from 'vue';
import {
  AlgorithmResultBeanList,
  getScadaInfoApi,
  Id,
  PageType,
  PositionListRows,
  addPositionApi,
  detailPositionApi,
  pageTypeTitle,
  getObjectsApi,
} from '@/api/modules/optCenter/aiPatrolManage/position';
import videoControls from '@optCenter/videoRealTime.vue';
import objectDialog from './objectDialog.vue';
import pictureDimension from '@optCenter/components/picDimension/pictureDimension.vue';
import { FormRules, FormInstance } from 'element-plus';
import { ElMessage, ElImageViewer } from 'element-plus';
import imgUrl from '@/assets/images/403.png';
import { usePicture, useBackFileUrl, useRemoveURLObject } from '@optCenter/hooks/use-file-utils';
import { algorithmGetAll, Row as AIRow } from '@/api/modules/optCenter/Almanagement/AIModelManagement';
import { getNeedBusinessApi, NeedBusiness } from '@/api/modules/common';
import { videoNodeType } from '@optCenter/hooks/use-video';
import HKcloud from '@optCenter/components/videocloud/HKcloud.vue';
interface Props {
  id?: Id;
  cameraId?: string;
  pageType: PageType;
  nodeType: number;
}
const props = withDefaults(defineProps<Props>(), { cameraId: '' });
const typeTitle = computed(() => pageTypeTitle[props.pageType]);
interface Emits {
  (e: 'openDialogChange', page: PageType, row?: PositionListRows): void;
  (e: 'addPageClose'): void;
}
const emit = defineEmits<Emits>();
let { nodeTypeLabel } = videoNodeType();
const open = ref(false);
const AIList = ref<AIRow[]>([]);
const scadaList = ref<any[]>([]);
let isAutoAdd = ref(false);
let autoAddObject = ref<any>([]);
function openDialog() {
  open.value = true;
  getDetail();
}
onMounted(() => {
  getAIList();
});
function getAIList() {
  /*getNeedBusinessApi({ classifyCode: 'inspection', code: 'generate_item' }).then(async (res) => {
    let is = res.data.configDetailList.at(0)?.value === '1';
    isAutoAdd.value = is;
    if (is) {
      let res = await getObjectsApi({ cameraId: props.cameraId, nodeType: props.nodeType });
      autoAddObject.value = res.data;
    }
  });*/
  algorithmGetAll({ identifyType: 'inspection' }).then((res) => {
    AIList.value = res.data;
  });
  getScadaInfoApi().then((res) => {
    scadaList.value = res.data;
  });
}
async function skillChange(val: string, isClear: boolean = true) {
  let obj = AIList.value.find((i) => i.id == val);
  needBusiness.value = obj?.needBusiness ?? false;
  if (obj?.needBusiness) {
    let { data } = await getNeedBusinessApi({ classifyCode: 'inspection', code: obj.algorithmCode });
    skillList.value = data?.configDetailList ?? [];
    if (isClear) {
      itemRules.value = [
        {
          algorithmRecognitionResults: '正常',
          algorithmResults: '',
        },
      ];
      await nextTick();
      let target = rulesListItemRef.value?.at(-1);
      target?.scrollIntoView(false);
    }
  }
}
async function scadaChange(val: string) {
  if (val) {
    let obj = scadaList.value.find((i) => i.code == val);
    formData.value.scadaName = obj.name;
  } else {
    formData.value.scadaName = '';
    formData.value.scadaCode = '';
  }
}
//表单
const rules = reactive<FormRules<PositionListRows>>({
  presetPositionName: [{ required: true, message: '请输入预置位名称' }],
  relatedSkillsId: [{ required: false, message: '请选择关联技能' }],
  scadaCode: [{ required: false, message: '请选择SCADA点位' }],
});
let formData = ref<PositionListRows>({
  presetPositionName: '',
  relatedSkillsId: '',
  scadaCode: '',
  scadaName: '',
  capture: '',
  objectId: '',
  attachmentFile: '',
  errorRange: 0,
});
class formBase {
  presetPositionName = '';
  relatedSkillsId = '';
  scadaCode = '';
  scadaName = '';
  objectId = '';
  capture = undefined;
  errorRange = 0;
}
const formRef = ref<FormInstance>();
const formListRef = ref<FormInstance>();
const urlArr = useRemoveURLObject();
async function getDetail() {
  await nextTick();
  if (props.id) {
    let { data } = await detailPositionApi({ id: props.id });
    formData.value = data;
    orgData.value = [{ id: data.orgCode, name: data.orgName }];
    formData.value.scadaCode = data?.scadaCode ?? '';
    if (data.attachmentId) {
      url2.value = (await useBackFileUrl(data.attachmentId)) || '';
      urlArr.add(url2.value);
    }
    itemRules.value = data.algorithmResultBeanList!;
    skillChange(data.relatedSkillsId, !data.algorithmResultBeanList?.length);
    position.value = data.position ? JSON.parse(data.position! as unknown as string) : {};
  } else {
    formData.value = new formBase();
    url2.value = '';
    itemRules.value = [
      {
        algorithmRecognitionResults: '正常',
        algorithmResults: '',
      },
    ];
    needBusiness.value = false;
  }
}
async function confirm() {
  try {
    await formRef.value?.validate();
    await formListRef.value?.validate();
    let form = new FormData();
    let {
      attachmentFile,
      capture: a,
      algorithmResultBeanList,
      algorithmCode,
      needBusiness,
      position: p,
      ...formData1
    } = formData.value;
    for (const [key, value] of Object.entries(formData1)) {
      if (Reflect.has(new formBase(), key)) form.append(key, value as string);
    }
    form.append('cameraId', props.cameraId!);
    form.append('nodeType', props.nodeType! as unknown as string);
    if (props.id) form.append('id', props.id);
    //框选抓图
    if (file.value) form.append('attachmentFile', file.value);
    if (a) form.append('capture', a);
    if (position.value.width !== 0) {
      form.append('position', JSON.stringify(position.value));
    }
    if (!url2.value || position.value.width === 0) {
      ElMessage.error(`请抓图并框选`);
      throw new Error(`请抓图并框选`);
    }
    if (props.pageType === 'edit') {
      form.append('updateImage', `${updateImage.value}`);
    }

    //
    if (itemRules.value) form.append('algorithmResultBeanListStr', JSON.stringify(itemRules.value));
    await addPositionApi(form);
    ElMessage.success(`保存成功`);
    emit('openDialogChange', 'list', undefined);
    await close();
  } catch (e) {
    console.log(e);
  }
}
async function close() {
  open.value = false;
  emit('addPageClose');
}
//抓图
const url1 = ref(imgUrl);
let {
  openPictureDialog,
  confirmPicture,
  closePicture,
  beforeClose,
  pictureDimensionRef,
  videoControlsRef,
  openPicture,
  updateImage,
  position,
  url2,
  file,
} = usePicture(formData);
let showUrl2 = ref(false);
function showUrl(is: boolean = true) {
  showUrl2.value = is;
  isHKControl(is);
}
watch(openPicture, (val) => {
  isHKControl(val);
});
function isHKControl(val: boolean = true) {
  let play = videoControlsRef.value.currentComponentName.play;
  val ? play.hideControl() : play.showControl();
}
// 规则操作
const rulesArr = reactive<FormRules<AlgorithmResultBeanList>>({
  algorithmResults: [{ required: true, message: '请选择' }],
  algorithmRecognitionResults: [{ required: true, message: '请输入' }],
});
let itemRules = ref<AlgorithmResultBeanList[]>([]);
let skillList = ref<NeedBusiness.itemObj[]>([]);
let needBusiness = ref(false);
let rulesListItemRef = ref<HTMLElement[]>();
function addRules() {
  let rules: AlgorithmResultBeanList = {
    algorithmRecognitionResults: '正常',
    algorithmResults: '',
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
const formDialogRef = ref();
const orgData = ref<any[]>([]);
function selectClick() {
  formDialogRef.value.showDialog();
}
function orgConfirm(ids: string[], arr: { id: string; objectName: string }) {
  console.log(arr);
  orgData.value = [arr];
  formData.value.orgCode = arr.id;
  formData.value.orgName = arr.objectName;
}

const positionAddPageRef = ref<HTMLDivElement>();
defineExpose({
  openDialog,
});
</script>

<template>
  <KrPublicDialog :title="`${typeTitle}预置位`" v-model="open" @doSubmit="confirm" width="1180" @doClose="close">
    <div class="position-add-page" ref="positionAddPageRef">
      <el-form ref="formRef" :rules="rules" label-suffix=" :" :model="formData" label-width="auto">
        <el-row>
          <el-col :span="12">
            <el-form-item label="预置位名称" prop="presetPositionName">
              <el-input v-model="formData.presetPositionName" clearable></el-input>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="关联技能" prop="relatedSkillsId">
              <el-select
                v-model="formData.relatedSkillsId"
                @visible-change="isHKControl"
                filterable
                clearable
                @change="skillChange"
              >
                <el-option
                  :label="item.algorithmName"
                  :value="item.id"
                  :key="item.id"
                  v-for="item in AIList"
                ></el-option>
              </el-select>
              <!--            <el-input v-model="formData.relatedSkillsId" clearable></el-input>-->
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="对应SCADA点位" prop="scadaCode">
              <el-select-v2
                @visible-change="isHKControl"
                v-model="formData.scadaCode"
                :options="scadaList"
                :props="{ value: 'code', label: 'name' }"
                filterable
                clearable
                @change="scadaChange"
              >
                <!--                <el-option :label="item.name" :value="item.code" :key="item.id" v-for="item in scadaList"></el-option>-->
              </el-select-v2>
              <!--            <el-input v-model="formData.relatedSkillsId" clearable></el-input>-->
            </el-form-item>
          </el-col>
          <el-col :span="12" v-if="formData.scadaCode !== ''">
            <el-form-item label="对比允许误差" prop="errorRange">
              <el-input-number :controls="false" :precision="2" v-model="formData.errorRange" clearable />
            </el-form-item>
          </el-col>
          <el-col :span="12" v-if="isAutoAdd">
            <el-form-item label="巡检对象" prop="errorRange">
              <el-select v-model="formData.objectId" :disabled="pageType === 'edit'" filterable clearable>
                <el-option
                  :label="item.objectName"
                  :value="item.id"
                  :key="item.id"
                  v-for="item in autoAddObject"
                ></el-option>
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="24" class="video-content">
            <div class="video-title">监控视频</div>
            <div class="video">
              <videoControls
                class="videoEl"
                :scrollDom="positionAddPageRef?.parentElement"
                v-if="open"
                :play-type="5"
                :cameraId="cameraId"
                ref="videoControlsRef"
              />
              <div class="img-main">
                <div class="img-content">
                  <!--                  <div class="img-title">技能参考图</div>
                  <div class="img">
                    <el-image
                      style="width: 100%; height: 100%"
                      :src="url1"
                      :zoom-rate="1.2"
                      :max-scale="7"
                      :min-scale="0.2"
                      :preview-src-list="[url1]"
                      :preview-teleported="true"
                      fit="scale-down"
                    />
                  </div>-->
                  <HKcloud :cameraId="cameraId" :abc="cameraId" />
                </div>
                <div class="img-content">
                  <div class="img-title">预置位抓图</div>
                  <div class="img-add" v-if="!url2" @click="openPictureDialog(true)">
                    <el-icon>
                      <CirclePlus />
                    </el-icon>
                    <span class="info">设定预置位抓图</span>
                  </div>
                  <div class="img" v-else>
                    <el-image
                      style="width: 100%; height: 100%"
                      :src="url2"
                      :zoom-rate="1.2"
                      :max-scale="7"
                      :preview-src-list="[url2]"
                      :min-scale="0.2"
                      fit="scale-down"
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
                </div>
              </div>
            </div>
          </el-col>
          <el-col :span="24" class=""></el-col>
        </el-row>
      </el-form>
      <el-form
        ref="formListRef"
        :rules="rulesArr"
        label-suffix=" :"
        :disabled="pageType === 'detail'"
        :model="itemRules"
        label-width="auto"
        v-if="needBusiness"
      >
        <el-row>
          <el-col :span="24" class="rules-list">
            <div class="rules-title">识别结果</div>
            <div class="rules-list-item" ref="rulesListItemRef" :key="index" v-for="(item, index) in itemRules">
              <div class="select-item">
                <el-form-item
                  :prop="`${index}.algorithmRecognitionResults`"
                  :rules="rulesArr.algorithmRecognitionResults"
                >
                  <el-input
                    v-model="item.algorithmRecognitionResults"
                    clearable
                    placeholder="请输入文字描述"
                  ></el-input>
                </el-form-item>
              </div>
              <div class="subWidth">
                <el-form-item
                  :prop="`${index}.algorithmResults`"
                  label="对应算法结果"
                  :rules="rulesArr.algorithmResults"
                >
                  <el-select
                    v-model="item.algorithmResults"
                    @visible-change="isHKControl"
                    filterable
                    clearable
                    placeholder="请选择"
                  >
                    <el-option
                      :label="item.value"
                      :value="item.key"
                      :key="item.key"
                      v-for="item in skillList"
                    ></el-option>
                  </el-select>
                </el-form-item>
              </div>
              <div class="rules-add-icon flx-center" v-if="pageType !== 'detail'">
                <el-icon size="20" v-if="index !== 0" @click="deleteRules(index)">
                  <Delete />
                </el-icon>
                <el-icon size="20" v-if="index === 0" @click="addRules">
                  <CirclePlus />
                </el-icon>
              </div>
            </div>
          </el-col>
        </el-row>
      </el-form>
    </div>
  </KrPublicDialog>
  <KrPublicDialog
    :title="`框选`"
    width="900px"
    v-model="openPicture"
    :beforeClose="beforeClose"
    @doSubmit="confirmPicture"
    @doClose="closePicture"
  >
    <div style="display: flex; justify-content: center">
      <pictureDimension
        ref="pictureDimensionRef"
        v-if="openPicture"
        :backgroundUrl="url2"
        :form-json="formData.capture"
        style="width: 710px; height: 460px"
      ></pictureDimension>
    </div>
  </KrPublicDialog>
  <objectDialog
    ref="formDialogRef"
    :list="orgData"
    @confirm="orgConfirm"
    treeTitle="区域"
    tableTitle="待选对象"
    title="选择巡检对象"
  ></objectDialog>
</template>

<style scoped lang="scss">
.position-add-page {
  --video-height: 468px;

  padding: 0 40px;
  .video-title,
  .img-title,
  .rules-title {
    margin-bottom: 16px;
    font-size: 16px;
  }
  .video-content {
    margin-top: 12px;
    .video {
      display: flex;
      gap: 20px;
      .videoEl {
        flex: 1;
        height: var(--video-height);
        overflow: hidden;
        background: var(--el-color-black);
        border-radius: 6px;
      }
      .img-main {
        display: flex;
        flex-direction: column;
        gap: 32px;
        .img-content {
          display: flex;
          flex-direction: column;
          width: 200px;
          .img,
          .img-add {
            width: 200px;
            height: 120px;
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
        }
      }
    }
  }
  .rules-list {
    margin-top: 20px;
    .rules-list-item {
      display: flex;
      gap: 15px;
      .select-item {
        flex: 1;
      }
      .subWidth {
        width: 353px;
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
  :deep(.el-input-number) {
    width: 100%;
    .el-input__inner {
      text-align: left;
      &::placeholder {
        font-family: SourceHanSansCN-Regular;
      }
    }
  }
}
</style>
