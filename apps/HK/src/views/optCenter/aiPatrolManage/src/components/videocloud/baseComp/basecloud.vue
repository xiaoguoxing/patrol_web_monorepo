<script setup lang="ts">
import { ref } from 'vue';

interface Props {
  start?: (str: string) => {};
  end?: (str: string) => {};
  zq?: (str: string) => {};
  bottomBtnStart?: (str: string) => {};
  bottomBtnEnd?: (str: string) => {};
  isRotate: boolean;
  isTube: boolean;
  speedValue: number;
  speedNum?: number;
}
interface Emit {
  (e: 'update:speedValue', value: number): void;
}
const props = defineProps<Props>();
const emit = defineEmits<Emit>();
let s = ref(props.speedValue);
function sliderInput(e: number) {
  emit('update:speedValue', e);
}
const sliderMax = props.speedNum ? props.speedNum * (props.speedNum - 1) : undefined;
</script>
<template>
  <div class="base-cloud-content">
    <div class="operationBtnTop flx-center">
      <div class="bg1">
        <div class="eventDisable" v-if="isTube"></div>
        <div class="bg2 flx-center">
          <div class="bg3">
            <div class="buttonControls topLeft" @mousedown="() => start('上左')" @mouseup="() => end('上左')">
              <div class="circleBtn"></div>
            </div>
            <div class="buttonControls top" @mousedown="() => start('上')" @mouseup="() => end('上')">
              <el-icon><component :is="'CaretTop'" /></el-icon>
            </div>
            <div class="buttonControls topRight" @mousedown="() => start('上右')" @mouseup="() => end('上右')">
              <div class="circleBtn"></div>
            </div>

            <div class="buttonControls left" @mousedown="() => start('左')" @mouseup="() => end('左')">
              <el-icon><component :is="'CaretLeft'" /></el-icon>
            </div>
            <div class="buttonControls"></div>
            <div class="buttonControls right" @mousedown="() => start('右')" @mouseup="() => end('右')">
              <el-icon><component :is="'CaretRight'" /></el-icon>
            </div>

            <div class="buttonControls bottomLeft" @mousedown="() => start('下左')" @mouseup="() => end('下左')">
              <div class="circleBtn"></div>
            </div>
            <div class="buttonControls bottom" @mousedown="() => start('下')" @mouseup="() => end('下')">
              <el-icon><component :is="'CaretBottom'" /></el-icon>
            </div>
            <div class="buttonControls bottomRight" @mousedown="() => start('下右')" @mouseup="() => end('下右')">
              <div class="circleBtn"></div>
            </div>

            <div class="buttonControls center flx-center" :class="{ active: isRotate }" @click="zq('自动转圈')">
              <img v-if="!isRotate" src="@/assets/images/videoControls/center_icon.png" alt="自动转圈" />
              <img v-else src="@/assets/images/videoControls/center_icon_active.png" alt="自动转圈" />
            </div>
          </div>
          <div class="line line1"></div>
          <div class="line line2"></div>
          <div class="line line3"></div>
          <div class="line line4"></div>
          <div class="line line5"></div>
          <div class="line line6"></div>
          <div class="line line7"></div>
          <div class="line line8"></div>
        </div>
      </div>
    </div>
    <div class="operationBtnCenter">
      <span class="label">{{ $t('camera.speed') }}</span>
      <div class="speedProgress">
        <el-slider
          :size="'small'"
          @input="sliderInput"
          :max="sliderMax"
          :disabled="isTube"
          :show-tooltip="false"
          v-model="s"
        />
      </div>
      <span class="value">
        <slot name="sliderFormatNum">{{ speedValue }}</slot>
      </span>
    </div>
    <div class="operationBtnBottom">
      <div class="operationBtnBottom-items">
        <div
          class="operationBtnBottom-items-btn"
          @mousedown="() => bottomBtnStart('焦距大')"
          @mouseup="() => bottomBtnEnd('焦距大')"
          title="焦距大"
        >
          <img src="@/assets/images/videoControls/jjd.png" alt="焦距大" />
        </div>
        <div
          class="operationBtnBottom-items-btn"
          @mousedown="() => bottomBtnStart('焦距小')"
          @mouseup="() => bottomBtnEnd('焦距小')"
          title="焦距小"
        >
          <img src="@/assets/images/videoControls/jjx.png" alt="焦距小" />
        </div>
      </div>
      <div class="operationBtnBottom-items">
        <div
          class="operationBtnBottom-items-btn"
          @mousedown="() => bottomBtnStart('焦点前')"
          @mouseup="() => bottomBtnEnd('焦点前')"
          title="焦点前"
        >
          <img src="@/assets/images/videoControls/qzjd.png" alt="焦点前" />
        </div>
        <div
          class="operationBtnBottom-items-btn"
          @mousedown="() => bottomBtnStart('焦点后')"
          @mouseup="() => bottomBtnEnd('焦点后')"
          title="焦点后"
        >
          <img src="@/assets/images/videoControls/hzjd.png" alt="焦点后" />
        </div>
      </div>
      <div class="operationBtnBottom-items">
        <div class="operationBtnBottom-items-btn-disable" title="暂不支持此功能"></div>
        <div
          class="operationBtnBottom-items-btn"
          @mousedown="() => bottomBtnStart('光圈大')"
          @mouseup="() => bottomBtnEnd('光圈大')"
          title="光圈大"
        >
          <img src="@/assets/images/videoControls/gqd.png" alt="光圈大" />
        </div>
        <div
          class="operationBtnBottom-items-btn"
          @mousedown="() => bottomBtnStart('光圈小')"
          @mouseup="() => bottomBtnEnd('光圈小')"
          title="光圈小"
        >
          <img src="@/assets/images/videoControls/gqx.png" alt="光圈小" />
        </div>
      </div>
    </div>
  </div>
</template>
<style scoped lang="scss">
.base-cloud-content {
  --margin-circle-start: 15px;
  --margin-caret-start: -8px;
  --width-circle: 8px;
  --bg1-width-height: 120px;
  --line-y: -35px;
  --line-gap: 45deg;
  --line-gap-first: 22deg;
  .operationBtnTop {
    padding-top: 12px;
    .bg1 {
      position: relative;
      .eventDisable {
        position: absolute;
        top: 0;
        left: 0;
        z-index: 1;
        width: 100%;
        height: 100%;
        cursor: not-allowed;
      }

      box-sizing: border-box;
      width: var(--bg1-width-height);
      height: var(--bg1-width-height);
      padding: 8px;
      background: linear-gradient(180deg, #ffffff 40%, #e6e6e6);
      border-radius: 50%;
      box-shadow: 0 0 12px 0 rgb(0 0 0 / 10%);
      .bg2 {
        box-sizing: border-box;
        width: 100%;
        height: 100%;
        background: linear-gradient(0deg, #ffffff, #f9f9f9);
        border-radius: 50%;
        .bg3 {
          position: relative;
          display: grid;
          grid-template-rows: repeat(3, 1fr);
          grid-template-columns: repeat(3, 1fr);
          align-content: space-evenly;
          align-items: center;
          justify-items: center;
          width: 100%;
          height: 100%;
          background: rgb(255 255 255 / 20%);
          border-radius: 50%;
          .buttonControls {
            box-sizing: border-box;
            font-size: 25px;
            color: var(--el-text-color-regular);
            cursor: pointer;
            .circleBtn {
              width: var(--width-circle);
              height: var(--width-circle);
              background: var(--el-text-color-secondary);
              border-radius: calc(var(--width-circle) / 2);
            }
            &.top {
              margin-top: var(--margin-caret-start);
            }
            &.left {
              margin-bottom: -5px;
              margin-left: var(--margin-caret-start);
            }
            &.right {
              margin-right: var(--margin-caret-start);
              margin-bottom: -5px;
            }
            &.bottom {
              margin-bottom: var(--margin-caret-start);
            }
            &.topLeft {
              margin-top: var(--margin-circle-start);
              margin-left: var(--margin-circle-start);
            }
            &.topRight {
              margin-top: var(--margin-circle-start);
              margin-right: var(--margin-circle-start);
            }
            &.bottomLeft {
              margin-bottom: var(--margin-circle-start);
              margin-left: var(--margin-circle-start);
            }
            &.bottomRight {
              margin-right: var(--margin-circle-start);
              margin-bottom: var(--margin-circle-start);
            }
            &.center {
              position: absolute;
              width: 40px;
              height: 40px;
              border-radius: 50%;
              box-shadow: 0 0 4px 4px rgb(0 0 0 / 10%);
              img {
                width: 20px;
                height: 20px;
              }
            }
            &:hover {
              color: var(--el-color-primary);
              .circleBtn {
                background: var(--el-color-primary);
              }
            }
          }
        }
        & > .line {
          position: absolute;
          width: 2px;
          height: 30px;
          background: linear-gradient(0deg, #cbcbcb, #ffffff);

          $total: 8;
          @function column-width($col) {
            @return calc(var(--line-gap-first) + (var(--line-gap) * $col));
          }

          @for $i from 1 through $total {
            &.line#{$i} {
              transform: rotate(column-width($i)) translate(0, var(--line-y));
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
  .operationBtnBottom {
    display: flex;
    justify-content: space-between;
    height: 28px;
    margin-top: 10px;
    background: transparent;
    .operationBtnBottom-items {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: space-evenly;
      width: 60px;
      cursor: pointer;
      background: var(--el-color-white);
      border-radius: calc(28px / 2);
      box-shadow: 0 0 6px 0 rgb(0 0 0 / 10%);
      .operationBtnBottom-items-btn {
        width: 18px;
        height: 18px;
        img {
          width: 18px;
          height: 18px;
        }
      }
      .operationBtnBottom-items-btn-disable {
        position: absolute;
        top: 0;
        left: 0;
        z-index: 1;
        width: 100%;
        height: 100%;
        cursor: not-allowed;
      }
    }
  }
}
</style>
