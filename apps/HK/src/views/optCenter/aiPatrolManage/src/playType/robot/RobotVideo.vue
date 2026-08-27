<script setup lang="ts">
import { PlayType, Quality } from '@optCenter/videoType';
import { computed, onUnmounted, ref } from 'vue';
import { getDict } from '@/utils/serviceDict';
import WebRtcStreamer from '@/assets/js/webrtc';
import robotcloud from '@optCenter/components/videocloud/robotcloud.vue';
import { useIsTask } from '@optCenter/hooks/use-video';
import { ElMessage } from 'element-plus';
import { Row, trackDetail } from '@/api/modules/optCenter/deviceManage/track';
import { capturePic, cameraRotate, getStreamRTSP } from '@/api/modules/robotTrack';
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
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
const cameraData = ref<Partial<Row>>({});
const cloudData = computed(() => {
  return {
    cameraIndexCode: cameraData.value.channelIndexCode,
    orbitalIndexCode: cameraData.value.orbitalIndexCode,
    host: cameraData.value.host,
    appKey: cameraData.value.appKey,
    appSecret: cameraData.value.appSecret,
  };
});
let iceServer = ref<{ [p: string]: any; remark: any }[]>([]);

async function init() {
  try {
    let { data } = await trackDetail({ id: props.cameraId });
    let resIceServer = await getDict('streamIceServer');
    cameraData.value = data;
    iceServer.value = resIceServer;
    unFlv();
    try {
      if (data.robotStatus === 'online') {
        try {
          setPlay().then(() => runPlay());
        } catch (e) {
          console.log(e);
          emit('err', t('camera.deviceSb'));
        }
      } else {
        throw new Error(t('camera.deviceNotOnline'));
      }
    } catch (e) {
      emit('err', t('camera.deviceNotOnline'));
    }
  } catch (e) {
    emit('err', t('camera.getDeviceInfoSb'));
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
      }),
      true,
      getUrl
    );
    play.on('connectSuccess', () => {
      emit('success');
    });
    play.on('connectError', () => {
      emit('err', '');
    });
    play.on('streamError', () => {
      emit('err', t('camera.getStreamSb'));
      unFlv();
    });
    resolve('1');
  });
}

async function runPlay() {
  try {
    let last_url = await getUrl();
    await play.addPlay(last_url);
    emit('loading', false);
    emit('success');
  } catch (e: any) {
    emit('err', (e as TypeError).message);
    unFlv();
  }
}

async function getUrl() {
  let res = await getStreamRTSP(cloudData.value);
  return res?.data?.url;
  // return 'rtsp://admin:hgsc@12345@10.11.0.7:554/Streaming/Channels/201?transportmode=unicast';
}

function getStreamID() {
  let res = '';
  res = cameraData.value.channelIndexCode! + '_' + cameraData.value.channelIndexName;
  return res;
}
//抓图
async function pic() {
  return await capturePic(cloudData.value);
}
//转动预置位
async function rotate(presetPositionInfo: number) {
  try {
    await useIsTask(props.cameraId);
    return await cameraRotate({
      ...cloudData.value,
      presetIndex: presetPositionInfo,
    });
  } catch (e: any) {
    ElMessage.warning(e as string);
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
      <robotcloud :camera-id="cameraId" :loginData="cloudData"></robotcloud>
    </div>
    <div class="openScreen">
      <el-icon @click="emit('toggle')" size="18" title="全屏"><FullScreen /></el-icon>
      <el-icon @click="init" size="18" title="重新加载"><Refresh /></el-icon>
    </div>
  </template>
</template>

<style lang="scss" scoped>
@use '../../style/index';
</style>
