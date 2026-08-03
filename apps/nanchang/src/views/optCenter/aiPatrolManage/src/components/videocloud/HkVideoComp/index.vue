<script setup lang="ts">
import { computed, ref } from 'vue';
import { ptzcontrolApi, btnType, btnType2, btnStr, btnStr2 } from '@/api/modules/HKcamera';
import { ElMessage } from 'element-plus';
import { useMouseDelayCloud } from '@optCenter/hooks/use-video';
import baseCloud from '@optCenter/components/videocloud/baseComp/basecloud.vue';
interface Props {
  cameraId: string;
}
const props = defineProps<Props>();

const isTube = computed(() => props.cameraId === '');

//方位接口
let { start, end, isTask, inTask } = useMouseDelayCloud(btn1, {
  get cameraId() {
    return props.cameraId;
  },
});
async function btn1(btnT: btnStr, is: boolean) {
  return ptzcontrolApi({
    cameraIndexCode: props.cameraId,
    command: btnType[btnT],
    action: is ? 0 : 1,
    speed: speedValue.value,
  });
}
//转圈
let isRotate = ref(false);
async function zq(btnT: btnStr) {
  /*try {
    if (isRotate.value === false) await isTask();
    if (!inTask.value) {
      await btn1(btnT, (isRotate.value = !isRotate.value));
    }
  } catch (e: any) {
    ElMessage.warning(e);
  }*/
}
//功能按钮
let { start: bottomBtnStart, end: bottomBtnEnd } = useMouseDelayCloud(btn2, {
  get cameraId() {
    return props.cameraId;
  },
});
async function btn2(btnT: btnStr2, is: boolean) {
  return ptzcontrolApi({
    cameraIndexCode: props.cameraId,
    command: btnType2[btnT],
    action: is ? 0 : 1,
    speed: speedValue.value,
  });
}
//转速
let speedValue = ref(50);
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
  >
    <template #sliderFormatNum>{{ speedValue }}</template>
  </baseCloud>
</template>
<style scoped lang="scss"></style>
