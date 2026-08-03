<script setup lang="ts">
import {
  PageType,
  Dict,
  getAlarmDetailApi,
  AlarmListRows,
  getAlarmCheckApi,
  addDefectStockToEAMApi,
} from '@/api/modules/appCenter/alarm';
// import dialogPicture from '@/views/appCenter/task/report/detail/detailDialog.vue';
import myTab from '@/components/Tabs/index.vue';
import videoControls from '@optCenter/videoRealTime.vue';
import { onMounted, ref, watch } from 'vue';
import { useHandleData } from '@patrol/shared/hooks/useHandleData';
import { useBackFileUrl, useRemoveURLObject } from '@optCenter/hooks/use-file-utils';
import { useRouter } from 'vue-router';
import { GlobalStore } from '@/stores';
import { cameraInTask } from '@/api/modules/camera';
const router = useRouter();
const globalStore = GlobalStore();
const node_env = import.meta.env.VITE_USER_NODE_ENV;
interface Props {
  id: string;
  pageType: PageType;
  alarm_level: Dict;
  alarm_type: Dict;
  alarm_status: Dict;
  inspection_conclusion: Dict;
  alarm_source: Dict;
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
  { label: '告警区域', value: '南沙水司/黄阁水厂/加药间', prop: 'alarmAreaName', type: 'text' },
  { label: '告警对象', value: 'PAC投加系统', prop: 'alarmObjectName', type: 'text' },
  { label: '告警项', value: 'PAC投加系统', prop: 'alarmItemName', type: 'text' },
  {
    label: '识别结果',
    value: '80℃',
    prop: 'recognitionResult',
    type: 'text',
    format(val, data) {
      return data.scadaResult ? `${val}（${data.gatherTime})` : val || '--';
    },
  },
  {
    label: 'SCADA结果',
    value: '80℃',
    prop: 'scadaResult',
    type: 'text',
    format(val, data) {
      return data.scadaResult ? `${val}（${data.scadaTime})` : val || '--';
    },
  },
  {
    label: '告警规则',
    value: '温度≥65℃',
    prop: 'alarmRules',
    type: 'text',
    buttonShow: true,
    clickHandler: () => {
      if (!rows.value.itemId) return;
      let res = router.resolve({
        path: `/patrolInspection/operationsManagement/aiPatrolManage/inspection`,
        query: {
          id: rows.value.itemId,
          token: rows.value.syncData ? globalStore.token : undefined,
        },
      });
      if (rows.value.syncData) {
        let baseUrl = import.meta.env.VITE_SYS_URL;
        window.open(`${baseUrl}/${res.href}`, '_blank');
      } else {
        window.open(res.href, '_blank');
      }
    },
  },
  {
    label: '告警等级',
    value: '二级',
    prop: 'alarmGrade',
    type: 'tag',
    activeClass: 'tag1type1',
    format(val: string, row: any) {
      return findOpt(val, 'alarm_level').label;
    },
    // changeClass(val: string, data) {
    //   return `tag1type${data.alarmGrade}`;
    // },
    changeStyle(val: string, data) {
      let styleStr = '';
      let obj = findOpt(data.alarmGrade, 'alarm_level');
      let style = obj?.remark;
      if (style.length) {
        let styleObj = JSON.parse(style);
        for (let item of Object.keys(styleObj)) {
          styleStr += item + ':' + styleObj[item] + ';';
        }
      }
      return styleStr;
    },
  },
  {
    label: '告警状态',
    value: '告警中',
    prop: 'alarmStatus',
    type: 'tag',
    activeClass: 'tag2type2',
    format(val: string) {
      return findOpt(val, 'alarm_status').label;
    },
    changeClass(val: string) {
      return val === '告警中' ? 'tag2type1' : 'tag2type2';
    },
  },
  { label: '告警时间', value: '2023-09-08 16:00', prop: 'alarmTime', type: 'text' },
  { label: '消警时间', value: '2023-09-08 16:00', prop: 'erasingTime', type: 'text' },
  { label: '消警说明', value: '2023-09-08 16:00', prop: 'erasingExplain', type: 'text' },
  {
    label: '告警来源',
    value: '2023-09-08 16:00',
    prop: 'alarmSource',
    type: 'text',
    format(val: string, row: any) {
      return findOpt(val, 'alarm_source').label;
    },
  },
  { label: '告警点位', value: '加药间PAC投加系统热成像球机#1', prop: 'cameraName', type: 'text' },
  {
    label: '报缺状态',
    value: '加药间PAC投加系统热成像球机#1',
    prop: 'isReport',
    type: 'text',
    format(val: string) {
      return eval(val) ? '已报缺' : '未报缺';
    },
  },
  { label: '报缺工单号', value: '加药间PAC投加系统热成像球机#1', prop: 'reportId', type: 'text' },

  /*  { label: '告警名称', value: '设备温度异常', prop: 'alarmName', type: 'text' },
  {
    label: '告警类型',
    value: '设备状态异常告警',
    prop: 'alarmType',
    type: 'text',
    format(val: string, row: any) {
      return findOpt(val, 'alarm_type').label;
    },
  },*/
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
  rows.value.itemId = data.alarmItem;
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
function findOpt(value: string, opt: string) {
  return (props[opt as keyof Props] as Dict).find((i) => i.value === value) || { label: '', value: '', remark: '' };
}

const dialogPictureRef = ref();
let rows = ref<AlarmListRows>({});
let show = ref(false);
let abc = ref('');
let timeRange = ref<string[]>([]);
async function handleSubmit() {
  try {
    /*let { value: abc } = await ElMessageBox.prompt('是否消警？', '', {
      confirmButtonText: '确定',
      type: 'warning',
      inputType: 'textarea',
      inputPlaceholder: '请输入消警说明',
      cancelButtonText: '取消',
    });
    await useHandleData<{ id: string; erasingExplain: string }>(
      getAlarmCheckApi,
      { id: rows.value.id!, erasingExplain: abc ?? '' },
      '消警'
    );*/
    await getAlarmCheckApi({
      id: rows.value.id!,
      erasingExplain: abc.value ?? '',
      erasingDateStart: timeRange.value[0],
      erasingDateEnd: timeRange.value[1],
    });
    await getDetail();
    show.value = false;
  } catch (e) {}
}
/*function checkConfirm(data: any) {
  let obj = {
    id: rows.value.id,
    ...data,
  };
  let formD = new FormData();
  for (const formDKey in obj) {
    formD.append(formDKey, obj[formDKey]);
  }
  getAlarmCheckApi(formD)
    .then((res) => {
      ElMessage.success(`${res.description}`);
      getDetail();
    })
    .catch((e) => {});
}*/
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
  /*let path = `/patrolInspection/appCenter/inspectionMonitor/watchingMonitor`;
  let res = router.resolve({
    path: path,
    query: {
      id: `c2fdde706c834294b8814bbe15b74652`,
      token: rows.value.syncData ? globalStore.token : undefined,
    },
  });
  if (rows.value.syncData) {
    let baseUrl = serviceConfig[node_env].VITE_SYS_URL;
    window.open(`${baseUrl}/${res.href}`, '_blank');
  } else {
    window.open(res.href, '_blank');
  }*/
  let res = await cameraInTask({ itemId: rows.value.itemId! });
  videoRef.value.rotate(res.data.presetPositionInfo);
}
async function openUploadDialog() {
  try {
    await useHandleData<{ id: string }>(
      addDefectStockToEAMApi,
      { id: props.id! },
      '上报成功',
      '确认将本条告警提交到EAM系统缺陷工单?'
    );
  } catch (e) {}
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
        <span class="alarm-right-title-text kr-font-medium">告警事件信息</span>
        <div class="alarm-right-title-btn">
          <el-button
            @click="show = true"
            class="el-button--primary2"
            :title="rows.syncData ? '同步的数据不支持此操作' : ''"
            :disabled="rows.syncData || rows.alarmStatus === 'alert_lifted'"
            v-auth="'falsealarm'"
            >消警</el-button
          >
          <el-button
            v-if="!rows.isReport"
            type="primary"
            :disabled="rows.syncData"
            :title="rows.syncData ? '同步的数据不支持此操作' : ''"
            v-auth="'reportingDeficiencies'"
            @click="openUploadDialog"
            >报缺</el-button
          >
        </div>
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
    <!--    <dialogPicture ref="dialogPictureRef" :id="rows.id" @confirm="checkConfirm" :row-data="rows"></dialogPicture>-->
    <kr-public-dialog
      v-model="show"
      title="温馨提示"
      :singleClose="false"
      @doSubmit="handleSubmit"
      @doClose="show = false"
      width="5%"
    >
      <div class="flx-align-center mb10">
        <el-icon class="el-message-box__status el-message-box-icon--warning mr10"><WarningFilled /></el-icon>是否消警？
      </div>
      <el-input v-model="abc" class="mb10" placeholder="请输入消警说明" type="textarea" clearable></el-input>
      <div class="flx-align-center mb10">停止告警时间区间</div>
      <el-date-picker
        v-model="timeRange"
        value-format="YYYY-MM-DD HH:mm"
        format="YYYY-MM-DD HH:mm"
        time-format="HH:mm"
        type="datetimerange"
        start-placeholder="开始消警时间"
        end-placeholder="结束消警时间"
      />
    </kr-public-dialog>
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
