import { ref, onUnmounted, Ref, watch } from 'vue';
import { btnStr, btnStr2, cameraInfoApi } from '@/api/modules/camera';
import { trackDetail } from '@/api/modules/optCenter/deviceManage/track';
import { ElMessage } from 'element-plus';
import { useElementSize } from '@vueuse/core';

function useMouseDelayCloud(
  callBack: (a: any, b: boolean) => any,
  option: { timeOut?: number; cameraId?: string; isCancelTask?: boolean }
) {
  const { isCancelTask = true } = option;
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
    if (!isCancelTask) {
      inTask.value = false;
      return Promise.resolve();
    }
    try {
      await useIsTask(option.cameraId!);
      inTask.value = false;
      return Promise.resolve();
    } catch (e) {
      inTask.value = true;
      return Promise.reject(e as unknown as string);
    }
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

function useVideoRect(videoRef: Ref<HTMLVideoElement | undefined>) {
  let canvasRect = ref({ width: 0, height: 0 });
  let scale = ref(0);
  let parentElement = ref<HTMLElement>();
  const { stop: canvasStop, width: vcw, height: vch } = useElementSize(parentElement);
  watch(videoRef, (value) => {
    parentElement.value = value?.parentElement!;
  });
  watch([vcw, vch], (value) => {
    Refresh();
  });
  function setCanvasRect() {
    scale.value = Math.min(
      vcw.value / (videoRef.value?.videoWidth || 1920),
      vch.value / (videoRef.value?.videoHeight || 1080)
    );
    canvasRect.value.width = (videoRef.value?.videoWidth || 1920) * scale.value;
    canvasRect.value.height = (videoRef.value?.videoHeight || 1080) * scale.value;
  }
  function Refresh() {
    setCanvasRect();
  }
  onUnmounted(() => {
    canvasStop();
  });
  return {
    canvasRect,
  };
}

export function videoNodeType() {
  let nodeType = ref([3, 4]);
  let nodeTypeLabel = ref({ 3: 1, 4: 4 });
  return {
    nodeType,
    nodeTypeLabel,
  };
}

export { useMouseDelayCloud, useIsTask, useVideoRect };
