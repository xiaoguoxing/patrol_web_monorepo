<script setup lang="ts">
import { PageType, getAlarmDetailApi, AlarmListRows } from '@/api/modules/appCenter/task/abnormal';
import myTab from '@/components/Tabs/index.vue';
import videoControls from '@optCenter/videoRealTime.vue';
import { onMounted, ref, watch } from 'vue';
import { useBackFileUrl, useRemoveURLObject } from '@optCenter/hooks/use-file-utils';
import { cameraInTask } from '@/api/modules/camera';
interface Props {
  id: string;
  pageType: PageType;
}
const props = withDefaults(defineProps<Props>(), {});

interface Emits {
  (e: 'update:pageType', value: PageType): void;
}
defineEmits<Emits>();

const urlArr = useRemoveURLObject();
let tabsOpt = [
  { label: '告警抓图', value: '1' },
  { label: '实时视频', value: '2' },
  { label: '录像回放', value: '3' },
];
let tabValue = ref('1');
interface FormConfig {
  label: string;
  value: string;
  prop: string;
  type: 'text' | 'tag';
  activeClass?: string;
  activeStyle?: string;
  buttonShow?: boolean;
  clickHandler?: (val: string, row: any) => void;
  format?: (val: string, row: any) => string;
  changeClass?: (val: string, row: any) => string;
  changeStyle?: (val: string, row: any) => string;
}
let formDataConfig = ref<FormConfig[]>([
  { label: '所属组织', value: '南沙水司/黄阁水厂/加药间', prop: 'orgName', type: 'text' },
  { label: '巡检区域', value: '南沙水司/黄阁水厂/加药间', prop: 'areaName', type: 'text' },
  { label: '巡检对象', value: 'PAC投加系统', prop: 'objectName', type: 'text' },
  { label: '巡检项', value: 'PAC投加系统', prop: 'itemName', type: 'text' },
  { label: '异常时间', value: '2023-09-08 16:00', prop: 'executeTime', type: 'text' },
  {
    label: '异常结果',
    value: '80℃',
    prop: 'recognitionResult',
    type: 'text',
    format(val, data) {
      return data.scadaResult ? `${val}（${data.gatherTime})` : val || '--';
    },
  },
]);
onMounted(() => {
  getDetail();
});
watch(
  () => props.id,
  () => {
    getDetail();
  }
);
async function getDetail() {
  type RowProps = Omit<AlarmListRows, 'syncData'>;
  let { data } = await getAlarmDetailApi({ id: props.id });
  rows.value = data;
  formDataConfig.value.map((i) => {
    i.value = i.format?.(data[i.prop as keyof RowProps] ?? '', data) ?? (data[i.prop as keyof RowProps] || '--');
    if (i.changeClass) i.activeClass = i.changeClass(i.value, data);
    if (i.changeStyle) i.activeStyle = i.changeStyle(i.value, data);
  });
  if (data.alarmPic) {
    rows.value.imgPath = (await useBackFileUrl(data.alarmPic, undefined, true)) || '';
    urlArr.add(rows.value.imgPath);
  }
}

let rows = ref<AlarmListRows>({});
let imgRef = ref();
function fullscreenImg() {
  const img = imgRef.value.$el?.querySelector('img');
  img?.click();
}
let videoRef = ref();
let isLoad = ref(false);
function videoLoad() {
  isLoad.value = true;
}
async function goRealVideo() {
  let res = await cameraInTask({ itemId: rows.value.itemId! });
  videoRef.value.rotate(res.data.presetPositionInfo);
}
</script>

<template>
  <div class="alarm-add">
    <div class="alarm-left">
      <div class="alarm-left-top mb20">
        <myTab :options="tabsOpt" v-model="tabValue"></myTab>
        <div class="flx-align-center">
          <el-button
            @click="goRealVideo"
            :disabled="!isLoad"
            v-if="tabValue === '2'"
            title="跳转至预置位"
            icon="VideoCamera"
          ></el-button>
          <el-button
            @click="fullscreenImg"
            v-if="tabValue === '1'"
            title="查看图片"
            :disabled="!rows.imgPath"
            icon="ZoomIn"
          ></el-button>
        </div>
      </div>
      <div class="alarm-left-content">
        <template v-if="tabValue === '1'">
          <el-image
            v-if="rows.imgPath"
            ref="imgRef"
            :zoom-rate="1.2"
            :max-scale="7"
            :min-scale="0.2"
            :preview-src-list="[rows.imgPath]"
            :preview-teleported="true"
            :hide-on-click-modal="true"
            :initial-index="0"
            :src="rows.imgPath"
          >
            <template #error>
              <el-empty class="pic-empty" description="图片加载失败">
                <template #image>
                  <img src="@/assets/images/notData.png" />
                </template>
              </el-empty>
            </template>
          </el-image>
          <el-empty class="pic-empty" description="目前没有任何预览图" v-else>
            <template #image>
              <img src="@/assets/images/notData.png" />
            </template>
          </el-empty>
        </template>
        <videoControls
          v-else-if="tabValue === '2'"
          ref="videoRef"
          @success="videoLoad"
          :play-type="7"
          :camera-id="rows.cameraId!"
        ></videoControls>
        <videoControls
          v-else-if="tabValue === '3'"
          :start-time="rows.playbackStartTime"
          :end-time="rows.playbackEndTime"
          :play-type="2"
          :show-controls="false"
          :camera-id="rows.cameraId!"
          :business-id="rows.id"
        ></videoControls>
      </div>
    </div>
    <div class="alarm-right">
      <div class="alarm-right-title">
        <span class="alarm-right-title-text kr-font-medium">异常事件信息</span>
        <div class="alarm-right-title-btn"></div>
      </div>
      <div class="alarm-right-content">
        <el-scrollbar>
          <div class="alarm-right-description-items" :key="item.prop" v-for="item in formDataConfig">
            <div class="alarm-right-description-items-label">{{ item.label }}：</div>
            <template v-if="item.type === 'text'">
              <div class="alarm-right-description-items-value">
                {{ item.value }}
                <el-link
                  v-if="item.buttonShow"
                  @click="item.clickHandler(item.value, item)"
                  :underline="false"
                  icon="EditPen"
                ></el-link>
              </div>
            </template>
            <template v-if="item.type === 'tag'">
              <div class="alarm-right-description-items-value">
                <span
                  class="alarm-right-description-items-value-tag"
                  :class="item.activeClass"
                  :style="item.activeStyle"
                  >{{ item.value }}</span
                >
              </div>
            </template>
          </div>
        </el-scrollbar>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.alarm-add {
  display: flex;
  gap: 20px;
  width: 100%;
  height: 100%;
  .alarm-left {
    display: flex;
    flex: 1;
    flex-direction: column;
    overflow: hidden;
    .alarm-left-top {
      display: flex;
      justify-content: space-between;
    }
    .alarm-left-content {
      flex: 1;
      overflow: hidden;
      .el-image {
        width: 100%;
        height: 100%;
      }
      .pic-empty {
        width: 100%;
        height: 100%;
        background: var(--el-fill-color-light);
      }
    }
  }
  .alarm-right {
    width: 360px;
    .alarm-right-title {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 20px;
      .alarm-right-title-text {
        font-size: 18px;
        color: var(--el-text-color-primary);
      }
      .alarm-right-title-btn {
        text-align: right;
      }
    }
    .alarm-right-content {
      height: calc(100% - 56px);
      .alarm-right-description-items {
        display: flex;
        align-items: baseline;
        margin-bottom: 20px;
        .alarm-right-description-items-label {
          width: 86px;
          font-size: 14px;
          color: var(--el-text-color-secondary);
        }
        .alarm-right-description-items-value {
          flex: 1;
          margin-left: 2px;
          font-size: 14px;
          color: var(--el-text-color-regular);
          .alarm-right-description-items-value-tag {
            padding: 6px 8px;
            border: 1px solid;
            border-radius: 4px;
            &.tag1type1 {
              color: #e3007b;
              background: #fcdeee;
              border-color: transparent;
            }
            &.tag1type2 {
              color: #ea3939;
              background: #ffe2e2;
              border-color: transparent;
            }
            &.tag1type3 {
              color: #fa802f;
              background: #ffebde;
              border-color: transparent;
            }
            &.tag1type4 {
              color: #f1b000;
              background: #fcf4de;
              border-color: transparent;
            }
            &.tag2type1 {
              color: var(--el-color-error);
              border-color: var(--el-color-error);
            }
            &.tag2type2 {
              color: var(--el-text-color-regular);
              border-color: var(--el-text-color-regular);
            }
          }
        }
      }
    }
  }
}
</style>
