import { ref, nextTick, onUnmounted, Ref, watch } from 'vue';
import { getDataURL } from '@/utils/util';
import { downFile, downCVRFile } from '@/api/modules/download';
import { btnStr, btnStr2, cameraInfoApi } from '@/api/modules/camera';
import { ElMessage } from 'element-plus';
import { useElementSize, useWebSocket, UseWebSocketReturn } from '@vueuse/core';
import { PORT_INSPECT } from '@/api/config/servicePort';
import { useI18n } from 'vue-i18n';
const webSocketUrl =
  //@ts-ignore
  import.meta.env.VITE_ONLINE_URL.replace('https://', 'wss://').replace('http://', 'ws://') +
  PORT_INSPECT +
  `/websocket/monitor`;
interface Position {
  top: number;
  left: number;
  width: number;
  height: number;
  imgWidth: number;
  imgHeight: number;
}
function usePicture(capture: any) {
  //抓图
  const { t } = useI18n();
  let openPicture = ref(false);
  let updateImage = ref(false);
  let pictureDimensionRef = ref();
  let videoControlsRef = ref();
  const url2 = ref('');
  const file = ref<File>();
  const position = ref<Position>({ top: 0, left: 0, width: 0, height: 0, imgWidth: 0, imgHeight: 0 });
  async function openPictureDialog(isFirst: boolean) {
    if (isFirst) {
      let res = await videoControlsRef.value.pic();
      let { blobUrl: res1 } = await getDataURL(res as unknown as Blob, 'image/png');
      capture.value.capture = undefined;
      file.value = undefined;
      url2.value = res1;
      updateImage.value = true;
      await nextTick();
    }
    openPicture.value = true;
  }
  async function confirmPicture(is: boolean = false) {
    let { imgUrl: imgUrl2, dataURLtoFile, position: p } = pictureDimensionRef.value.exportLoadImage();
    if (is || p.top !== undefined) {
      let captureJSON = pictureDimensionRef.value?.ImgToJson();
      url2.value = imgUrl2;
      file.value = dataURLtoFile;
      position.value = p;
      capture.value.capture = captureJSON;
      await nextTick();
      openPicture.value = false;
    } else {
      ElMessage.error(t('position.qkx'));
    }
  }
  async function closePicture() {
    if (!capture.value.capture) {
      pictureDimensionRef.value?.clearCanvas();
      await confirmPicture(true);
      return;
    }
    /*if (position.value.width !== 0) {
      openPicture.value = false;
    } else {
      ElMessage.error(`请框选`);
    }*/
    openPicture.value = false;
  }
  function beforeClose(DoneFn: () => any) {
    /*if (position.value.width !== 0) {
      DoneFn();
    } else {
      ElMessage.error(`请框选`);
    }*/
    DoneFn();
  }
  return {
    openPictureDialog,
    confirmPicture,
    beforeClose,
    closePicture,
    pictureDimensionRef,
    videoControlsRef,
    openPicture,
    url2,
    position,
    updateImage,
    file,
  };
}
async function useBackFileUrl(fileId: string, type: string = 'image/png', isCVR: boolean = false) {
  try {
    let res;
    if (isCVR) {
      res = await downCVRFile({ fileId: fileId });
    } else {
      res = await downFile({ fileId: fileId });
    }
    if ((res as unknown as Blob).size > 100) {
      return (await getDataURL(res as unknown as Blob, type)).blobUrl;
    } else {
      return '';
    }
  } catch (e) {}
}
function useRemoveURLObject() {
  const urlArr = new Set<string>();
  onUnmounted(() => {
    for (const urlArrElement of urlArr) {
      window.URL.revokeObjectURL(urlArrElement);
      urlArr.delete(urlArrElement);
    }
  });
  return urlArr;
}
function useMouseDelayCloud(callBack: (a: any, b: boolean) => any, option: { timeOut?: number; cameraId?: string }) {
  const { cameraId = '' } = option;
  const { t } = useI18n();
  type btn = btnStr | btnStr2;
  let inTask = ref(true);
  let isTrueSent = false; // true是否成功发送并响应
  let pendingFalse = false; // 是否等待发送 false
  async function start(btnT: btn) {
    try {
      isTrueSent = false;
      pendingFalse = false;
      await isTask();
      await sendCommand(btnT, true);
      isTrueSent = true;
      if (pendingFalse) {
        await sendCommand(btnT, false);
      }
    } catch (e) {
      isTrueSent = false;
      pendingFalse = false;
      ElMessage.warning(e as string);
    }
  }
  async function end(btnT: btn) {
    if (inTask.value) return;
    if (!isTrueSent) {
      pendingFalse = true;
    } else {
      await sendCommand(btnT, false);
    }
  }
  async function sendCommand(btnT: btn, value: boolean) {
    return callBack(btnT, value);
  }
  async function isTask() {
    let { data } = await cameraInfoApi({ id: cameraId });
    /*let data = {
      inTask: false,
    };*/
    inTask.value = data.inTask;
    return data.inTask ? Promise.reject(t('position.msg3')) : Promise.resolve();
  }
  return {
    start,
    end,
    isTask,
    inTask,
  };
}
async function useIsTask(cameraId: string) {
  let { data } = await cameraInfoApi({ id: cameraId });
  return data.inTask ? Promise.reject('该摄像头正在执行智能巡检任务，请稍后尝试') : Promise.resolve();
}
function useVideoDrawRect(
  id: string,
  outputRef: Ref<HTMLCanvasElement | undefined>,
  videoControlsRef: Ref<HTMLDivElement | undefined>,
  videoRef: Ref<HTMLVideoElement | undefined>
) {
  let canvasRect = ref({ width: 0, height: 0 });
  let socketData: UseWebSocketReturn<string>;
  let rectCtx: CanvasRenderingContext2D;
  let scale = ref(0);
  const { stop: canvasStop, width: vcw, height: vch } = useElementSize(videoControlsRef);
  watch([vcw, vch], (value) => {
    Refresh();
  });
  function run() {
    rectCtx = outputRef.value?.getContext('2d')!;
    socketData = useWebSocket<string>(`${webSocketUrl}/${id}`, {
      onMessage() {
        Refresh();
      },
    });
  }
  function setCanvasRect() {
    scale.value = Math.min(
      vcw.value / (videoRef.value?.videoWidth || 1920),
      vch.value / (videoRef.value?.videoHeight || 1080)
    );
    canvasRect.value.width = (videoRef.value?.videoWidth || 1920) * scale.value;
    canvasRect.value.height = (videoRef.value?.videoHeight || 1080) * scale.value;
  }
  function drawRect() {
    let rect = JSON.parse(socketData?.data.value as string) as {
      x: number;
      y: number;
      w: number;
      h: number;
      label: string;
    }[];
    rectCtx.lineWidth = 5 * scale.value;
    rectCtx.font = `bold ${20 * scale.value}px serif`;
    rectCtx.clearRect(0, 0, canvasRect.value.width, canvasRect.value.height);
    rectCtx.beginPath();
    (rect || []).forEach((i) => {
      let x = i.x * scale.value;
      let y = i.y * scale.value;
      let w = i.w * scale.value;
      let h = i.h * scale.value;
      rectCtx.fillStyle = 'transparent';
      rectCtx.strokeStyle = 'red';
      rectCtx.rect(x, y, w, h);
      rectCtx.fill();
      rectCtx.stroke();
      rectCtx.fillStyle = 'red';
      rectCtx.fillText(i.label, x + 5, y + h - 5);
    });
  }
  function Refresh() {
    setCanvasRect();
    if (rectCtx && videoRef.value?.videoWidth) {
      nextTick(() => {
        drawRect();
      }).then((r) => {});
    }
  }
  onUnmounted(() => {
    canvasStop();
    socketData?.close();
  });
  return {
    canvasRect,
    run,
  };
}
export { usePicture, useBackFileUrl, useMouseDelayCloud, useRemoveURLObject, useVideoDrawRect, useIsTask };
