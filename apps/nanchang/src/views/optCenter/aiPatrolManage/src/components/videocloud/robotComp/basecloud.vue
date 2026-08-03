<script setup lang="ts">
import { ref } from 'vue';
import { ptzcontrolApi, btnType, btnStr, btnType2, btnStr2, CloudCommand } from '@/api/modules/robotTrack';
import { ElMessage } from 'element-plus';
import { useMouseDelayCloud } from '@optCenter/hooks/use-video';
import baseCloud from '@optCenter/components/videocloud/baseComp/basecloud.vue';

interface Props {
  loginData?: Partial<CloudCommand>;
  cameraId: string;
}
const props = defineProps<Props>();

const isTube = ref(false);

//方位接口
let { start, end, isTask, inTask } = useMouseDelayCloud(btn1, { cameraId: props.cameraId, isCancelTask: false });
async function btn1(btnT: btnStr, is: boolean) {
  return ptzcontrolApi({
    ...props.loginData,
    command: btnType[btnT],
    action: is ? 0 : 1,
    speed: speedValue.value,
  });
}
//转圈
let isRotate = ref(false);
async function zq(btnT: btnStr) {
  try {
    if (isRotate.value === false) await isTask();
    if (!inTask.value) {
      await btn1(btnT, (isRotate.value = !isRotate.value));
    }
  } catch (e: any) {
    ElMessage.warning(e);
  }
}
//功能按钮
let { start: bottomBtnStart, end: bottomBtnEnd } = useMouseDelayCloud(btn2, {
  cameraId: props.cameraId,
  isCancelTask: false,
});
async function btn2(btnT: btnStr2, is: boolean) {
  return ptzcontrolApi({
    ...props.loginData,
    command: btnType2[btnT],
    action: is ? 0 : 1,
    speed: speedValue.value,
  });
}
//转速
let speedValue = ref(40);
</script>
<template>
  <baseCloud
    v-model:speed-value="speedValue"
    :zq="zq"
    :start="start"
    :end="end"
    :is-rotate="isRotate"
    :is-tube="isTube"
    :bottom-btn-start="bottomBtnStart"
    :bottom-btn-end="bottomBtnEnd"
  ></baseCloud>
</template>
<style scoped lang="scss"></style>
