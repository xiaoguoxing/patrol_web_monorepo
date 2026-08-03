<script setup lang="ts">
import { ptzcontrolApi, btnType, btnStr, CloudCommand } from '@/api/modules/robotTrack';
import { ref } from 'vue';
import { useMouseDelayCloud } from '@optCenter/hooks/use-video';
interface Props {
  loginData?: Partial<CloudCommand>;
  cameraId: string;
}
const props = defineProps<Props>();

//方位接口
let { start, end } = useMouseDelayCloud(btn1, { cameraId: props.cameraId, isCancelTask: false });
async function btn1(btnT: btnStr, is: boolean) {
  return ptzcontrolApi({
    ...props.loginData,
    cameraIndexCode: undefined,
    command: btnType[btnT],
    action: is ? 0 : 1,
    speed: speedValue.value,
  });
}
//转速
let speedValue = ref(40);
let isTube = ref(false);
</script>

<template>
  <div class="base-cloud-content">
    <div class="operationBtnTop flx-center">
      <div class="bg1">
        <div class="eventDisable" v-if="isTube"></div>
        <div class="shan-content">
          <div class="shan shan-item1" @mousedown="start('上')" @mouseup="end('上')">
            <div class="shan-text-arrow top">
              <el-icon class="arrow"><component :is="'CaretTop'" /></el-icon>
              <span class="text">上升</span>
            </div>
          </div>
          <div class="shan shan-item2">
            <div class="shan-text-arrow right" @mousedown="start('右')" @mouseup="end('右')">
              <el-icon class="arrow"><component :is="'CaretRight'" /></el-icon>
              <span class="text">后退</span>
            </div>
          </div>
          <div class="shan shan-item3">
            <div class="shan-text-arrow left" @mousedown="start('左')" @mouseup="end('左')">
              <el-icon class="arrow"><component :is="'CaretLeft'" /></el-icon>
              <span class="text">前进</span>
            </div>
          </div>
          <div class="shan shan-item4">
            <div class="shan-text-arrow bottom" @mousedown="start('下')" @mouseup="end('下')">
              <el-icon class="arrow"><component :is="'CaretBottom'" /></el-icon>
              <span class="text">下降</span>
            </div>
          </div>
          <div class="shan-center"></div>
        </div>
      </div>
    </div>
    <div class="operationBtnCenter">
      <span class="label">转速</span>
      <div class="speedProgress">
        <el-slider :size="'small'" :disabled="isTube" :show-tooltip="false" v-model="speedValue" />
      </div>
      <span class="value">{{ speedValue }}</span>
    </div>
    <div class="visibleHeight"></div>
  </div>
</template>

<style scoped lang="scss">
.base-cloud-content {
  --bg1-width-height: 120px;
  --shan-gap: 6px;
  --shan-rotate: 45deg;
  --shan-rotate-negative45: -45deg;
  --shan-center-width: 35px;
  --shan-taxt-gap: -2px;
  .operationBtnTop {
    padding-top: 25px;
    .bg1 {
      position: relative;
      box-sizing: border-box;
      width: var(--bg1-width-height);
      height: var(--bg1-width-height);
      padding: 8px;
      overflow: hidden;
      background: #ffffff;
      border-radius: 50%;
      box-shadow: 0 0 12px 0 rgb(0 0 0 / 10%);
      .eventDisable {
        position: absolute;
        top: 0;
        left: 0;
        z-index: 1;
        width: 100%;
        height: 100%;
        cursor: not-allowed;
      }
      .shan-content {
        display: grid;
        grid-template-rows: repeat(2, 1fr);
        grid-template-columns: repeat(2, 1fr);
        gap: var(--shan-gap);
        width: 100%;
        height: 100%;
        transform: rotate(var(--shan-rotate));
        .shan-center {
          position: absolute;
          top: calc(50% - var(--shan-center-width) / 2);
          left: calc(50% - var(--shan-center-width) / 2);
          width: var(--shan-center-width);
          height: var(--shan-center-width);
          background: #f8f8f8;
          border-radius: 50%;
        }
        .shan {
          width: 100%;
          height: 100%;
          cursor: pointer;
          background: #ffffff;
          box-shadow: 0 0 var(--shan-gap) 0 rgb(0 0 0 / 10%);
          &:hover {
            color: var(--el-color-primary);
            background: #dfeffd;
          }
          &:active {
            color: var(--el-text-color-placeholder);
            background: #ffffff;
          }
          &.shan-item1 {
            border-radius: 50px 0 0;
            .shan-text-arrow {
              flex-direction: column;
              .text {
                margin-top: var(--shan-taxt-gap);
              }
            }
          }
          &.shan-item2 {
            border-radius: 0 50px 0 0;
            .shan-text-arrow {
              flex-direction: row-reverse;
              .text {
                margin-right: var(--shan-taxt-gap);
                writing-mode: vertical-rl;
                text-orientation: upright;
              }
            }
          }
          &.shan-item3 {
            border-radius: 0 0 0 50px;
            .shan-text-arrow {
              .text {
                margin-left: var(--shan-taxt-gap);
                writing-mode: vertical-rl;
                text-orientation: upright;
              }
            }
          }
          &.shan-item4 {
            border-radius: 0 0 50px;
            .shan-text-arrow {
              flex-direction: column-reverse;
              .text {
                margin-bottom: var(--shan-taxt-gap);
              }
            }
          }
          .shan-text-arrow {
            box-sizing: border-box;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            height: 100%;
            transform: rotate(var(--shan-rotate-negative45));
            .text {
              font-size: 12px;
              user-select: none;
            }
            .arrow {
              font-size: 14px;
            }
          }
        }
      }
    }
  }
  .operationBtnCenter {
    display: flex;
    gap: 10px;
    align-items: center;
    justify-content: space-between;
    height: 28px;
    margin-top: 10px;
    font-size: 12px;
    background: transparent;
    .label {
      color: var(--el-text-color-secondary);
    }
    .speedProgress {
      flex: 1;
      padding: 0 10px;
    }
  }
  .visibleHeight {
    height: 25px;
  }
}
</style>
