<script setup lang="ts">
import { PlayType, Quality } from '@optCenter/videoType';
import { computed, nextTick, onUnmounted, ref } from 'vue';
import {
  getUserApi,
  capturePic,
  cameraInfoApi,
  UserApi2,
  ptzcontrol,
  online,
  cameraRotate,
} from '@/api/modules/camera';
import { getDict } from '@/utils/serviceDict';
import WebRtcStreamer from '@/assets/js/webrtc';
// import WebRtcStreamer from '@optCenter/hooks/useWebRTC';
import videoCloud from '@optCenter/components/videocloud/videocloud.vue';
import { useIsTask } from '@optCenter/hooks/use-video';
import { ElMessage } from 'element-plus';
interface props {
  playType: PlayType;
  cameraId: string;
  showControls?: boolean;
  isCanvas?: boolean;
  dataIndex?: string | number;
  startTime?: number | string;
  endTime?: string;
  businessId?: string;
  quality?: Quality;
}
const props = withDefaults(defineProps<props>(), {
  playType: 1,
  showControls: true,
});

interface Emit {
  (e: 'err', str: string): void;
  (e: 'success'): void;
  (e: 'loading', isLoading: boolean): void;
  (e: 'toggle'): void;
}
const emit = defineEmits<Emit>();

let play: any = null;
const videoRef = ref<HTMLVideoElement>();
const cameraData = ref<Partial<UserApi2>>({
  cameraType: 'tube',
});
const userData = ref<Partial<ptzcontrol>>({});
type SendData = { ip: string; port: string; userName: string; password: string; channelNum: number };
const loginSendData = computed<SendData>(() => {
  return {
    ip: cameraData.value.cameraHost!,
    port: cameraData.value.cameraPort!,
    userName: cameraData.value.cameraAccount!,
    password: cameraData.value.cameraPassword!,
    channelNum: cameraData.value.channelNum!,
  };
});
let iceServer = ref<{ [p: string]: any; remark: any }[]>([]);
let qualitySelectValue = ref<Quality>(props.quality ?? '原画');
let isRefreshQuality = ref(false);
async function init() {
  try {
    let { data } = await cameraInfoApi({ id: props.cameraId });
    let resIceServer = await getDict('streamIceServer');
    cameraData.value = data;
    iceServer.value = resIceServer;
    unFlv();
    try {
      let { data } = await online(loginSendData.value);
      await nextTick();
      if (data) {
        try {
          let res = await getUserApi(loginSendData.value);
          userData.value = res?.data ?? {};
          setPlay().then(() => runPlay());
        } catch (e) {
          console.log(e);
          emit('err', '设备登陆失败');
        }
      } else {
        throw new Error('设备不在线');
      }
    } catch (e) {
      emit('err', '该设备不在线');
    }
  } catch (e) {
    emit('err', '获取设备信息失败');
  }
}

async function setPlay() {
  return new Promise((resolve, reject) => {
    let streamId = getStreamID();
    play = new WebRtcStreamer(
      videoRef.value!,
      streamId,
      '',
      iceServer.value.map((i) => {
        let iceUser = JSON.parse(i?.remark ?? '{}');
        return {
          urls: i.value,
          ...iceUser,
        };
      })
    );
    play.on('connectSuccess', () => {
      emit('success');
    });
    play.on('connectError', () => {
      emit('err', '');
    });
    play.on('streamError', () => {
      emit('err', `媒体流获取失败`);
      unFlv();
    });
    resolve('1');
  });
}

async function runPlay() {
  try {
    let last_url = getUrl();
    await play.addPlay(last_url);
    if (play.switchQuality) {
      isRefreshQuality.value = true;
      await play?.switchQuality(qualitySelectValue.value);
      isRefreshQuality.value = false;
    }
    emit('loading', false);
    emit('success');
  } catch (e: any) {
    emit('err', (e as TypeError).message);
    unFlv();
  }
}

function getUrl() {
  let res = ``;

  res = `rtsp://${loginSendData.value.userName}:${loginSendData.value.password}@${
    loginSendData.value.ip
  }:554/Streaming/Channels/${loginSendData.value?.channelNum || 1}01?transportmode=unicast`;

  return res;
}

function getStreamID() {
  let res = '';
  res = cameraData.value.id! + '_' + cameraData.value.cameraName;
  return res;
}
//抓图
async function pic() {
  return await capturePic({
    ...loginSendData.value,
  });
}
//转动预置位
async function rotate(presetPositionInfo: number) {
  try {
    await useIsTask(props.cameraId);
    return await cameraRotate({
      ...loginSendData.value,
      presetIndex: presetPositionInfo,
      command: 39,
    });
  } catch (e: any) {
    ElMessage.warning(e as string);
  }
}
//
let qualityOptions = ref(['原画', '720P', '360P']);
async function qualityChange(quality: Quality) {
  if (play.switchQuality) {
    isRefreshQuality.value = true;
    qualitySelectValue.value = quality;
    await play?.switchQuality(quality);
    isRefreshQuality.value = false;
  }
}

onUnmounted(() => {
  unFlv();
});
function unFlv() {
  if (play != null) {
    console.log('视频实例销毁');
    play.disconnect();
    play = null;
  }
}

defineExpose({
  init,
  pic,
  rotate,
  videoRef,
});
</script>

<template>
  <video :data-index="dataIndex" muted ref="videoRef" class="videoRef" />
  <template v-if="showControls">
    <div class="Controls">
      <videoCloud :camera-id="cameraId" :loginData="cameraData" :login-send-data="loginSendData"></videoCloud>
    </div>
    <div class="openScreen">
      <el-dropdown v-show="false" placement="top" :teleported="false">
        <span class="quality">
          {{ qualitySelectValue }}
        </span>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item
              :disabled="key === qualitySelectValue"
              v-for="key in qualityOptions"
              :key="key"
              @click="qualityChange(key)"
            >
              {{ key }}
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
      <el-icon @click="emit('toggle')" size="18" title="全屏"><FullScreen /></el-icon>
      <el-icon @click="init" :class="{ 'loading-rotate': isRefreshQuality }" size="18" title="重新加载">
        <Refresh />
      </el-icon>
    </div>
  </template>
</template>

<style lang="scss" scoped>
@use '../../style/index';
.loading-rotate {
  animation: loading-rotate 2s linear infinite;
}
</style>
