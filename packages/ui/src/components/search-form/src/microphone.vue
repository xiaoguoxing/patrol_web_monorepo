<script setup lang="ts">
import { Microphone, Mute } from '@element-plus/icons-vue';
import { ScrollbarInstance } from 'element-plus';
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useListenMp, Wss } from './listenMp';

const emit = defineEmits(['close']);
let model = defineModel<string>();

let wss = new Wss(`wss://10.11.228.119:10096`);
const { circleSize, aStart: audioStart, audioClear, enabled, isSupported } = useListenMp(wss);
let circleSizePx = computed(() => circleSize.value + 'px');
// isSupported是否支持麦克风、isSpeech是否开启转写、isWssError asr的服务
let isSpeech = ref(false);
let isWssError = ref(false);

const isOk = computed(() => isSupported.value && isWssError.value);

onMounted(() => {
  connectASR();
});
function connectASR() {
  setMsg(`连接中`);
  wss.openWss();
}

//监听asr服务是否可用，不能用false。能用检查麦克风权限，麦克风不能用清空asr服务。
wss.on('first', () => {
  isWssError.value = true;
  if (isSupported.value) {
    startMicroPhone();
  } else {
    setMsg('无权限！请检查麦克风');
    wss.stopWss();
  }
});
wss.on('error', () => {
  isWssError.value = false;
});

// 开始麦克风，判断是否可用，是否已经在说，asr服务是不是close。清空result，开始第一次对话，成功后开始启动麦克风，开始说话
function startMicroPhone() {
  if (!isSupported.value || isSpeech.value) return;
  if (wss.wsState.value === 'CLOSED') return;
  setMsg(`转换开始`);
  result.value = '';
  wss.startOne().then(() => {
    audioStart();
    isSpeech.value = true;
  });
}
//结束对话，关闭麦克风
function endMicroPhone() {
  isSpeech.value = false;
  result.value = '';
  wss
    .endOne()
    .then(() => {
      audioClear();
    })
    .catch(() => {});
}

let msg = ref('');
wss.on('stateChange', setMsg);
function setMsg(str: string) {
  msg.value = str;
}
//监听结果
let result = ref('');
let scrollRef = ref<ScrollbarInstance>();
wss.on('result', (res: string) => {
  if (isSpeech.value) {
    result.value = res;
    let dom = scrollRef.value?.wrapRef?.querySelector('.el-scrollbar__view');
    let num = dom?.clientHeight ?? 800;
    scrollRef.value?.setScrollTop(num as number);
  }
});

//说完了，赋值model，
function upSendData() {
  model.value = result.value;
  closeOne();
}
//关闭弹框，清空model，
function closeMp() {
  model.value = '';
  if (isOk.value) {
    closeOne();
  } else {
    emit('close');
  }
}

async function closeOne() {
  await wss.endOne();
  emit('close');
}

onUnmounted(() => {
  audioClear();
  wss.stopWss();
});
</script>

<template>
  <div id="microphone">
    <div class="tip_Title" v-if="isOk">请说出内容</div>
    <div class="micro_phone">
      <div class="mp_icon" :class="{ animation: enabled, start: isSpeech, stop: !isSpeech, supported: !isOk }">
        <el-icon size="40" v-if="isOk">
          <Microphone />
        </el-icon>
        <el-icon v-else size="40">
          <Mute />
        </el-icon>
        <div class="three"></div>
      </div>
    </div>
    <div class="tip_Msg" v-if="!isOk">{{ msg }}</div>
    <el-scrollbar wrap-class="micro_content" ref="scrollRef" v-if="isOk">
      {{ result }}
    </el-scrollbar>
    <div class="btnContent" v-if="isOk">
      <template v-if="isSpeech">
        <div class="btn1 btn" @click="endMicroPhone">取消</div>
        <div class="btn2 btn" @click="result ? upSendData() : null">说完了</div>
      </template>
      <div class="btn2 btn btn3" v-else @click="startMicroPhone">重说</div>
    </div>
    <div class="closeMicrophone" @click="closeMp">
      <el-icon><Close /></el-icon>
    </div>
    <div class="bg" v-show="false"></div>
  </div>
</template>

<style scoped lang="scss">
#microphone {
  display: flex;
  flex-direction: column;
  padding: 12px;
  user-select: none;
  :deep(.micro_content) {
    height: 100px;
    color: var(--el-text-color-primary);
  }
  .micro_phone {
    display: flex;
    gap: 60px;
    place-content: center;
    place-items: center;
    margin-top: 20px;
    .mp_icon {
      position: relative;
      display: flex;
      place-content: center;
      place-items: center;
      width: 100px;
      height: 100px;
      cursor: pointer;
      border: 1px solid transparent;
      border-radius: 50%;
      &.start {
        color: var(--el-color-primary);
      }
      &.stop {
        color: var(--el-color-primary);
        background: #dfeffd;
      }
      &.supported {
        color: #cccccc;
        background: #f8f8f8;
      }
      &.animation::before {
        position: absolute;
        top: -1px;
        left: -1px;
        width: 100%;
        height: 100%;
        content: '';
        background: transparent;
        border: 2px solid var(--el-color-primary-light-5);
        border-radius: 50%;
        opacity: 0;
        animation: an1 2s infinite;
      }
      &.animation::after {
        position: absolute;
        top: -1px;
        left: -1px;
        width: 100%;
        height: 100%;
        content: '';
        background: transparent;
        border: 2px solid var(--el-color-primary-light-5);
        border-radius: 50%;
        opacity: 0;
        animation: an1 2s infinite 0.5s;
      }
      &.animation .three {
        position: absolute;
        top: -1px;
        left: -1px;
        width: 100%;
        height: 100%;
        content: '';
        background: transparent;
        border: 2px solid var(--el-color-primary-light-5);
        border-radius: 50%;
        opacity: 0;
        animation: an1 2s infinite 1s;
      }
      @keyframes an1 {
        0% {
          opacity: 1;
          transform: scale(0);
        }
        100% {
          opacity: 0;
          transform: scale(1);
        }
      }
    }
  }
  .tip_Title {
    font-size: 18px;
    color: var(--el-text-color-secondary);
    text-align: center;
  }
  .tip_Msg {
    margin-top: 20px;
    font-size: 14px;
    color: var(--el-text-color-secondary);
    text-align: center;
  }
  .btnContent {
    display: flex;
    gap: 16px;
    justify-content: center;
    margin-top: 10px;
    .btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 98px;
      height: var(--el-component-size);
      font-size: 16px;
      cursor: pointer;
      border-radius: 18px;
    }
    .btn1 {
      color: var(--el-text-color-primary);
      border: 1px solid #b2b2b2;
    }
    .btn2 {
      color: #ffffff;
      background: #0d60b4;
      border: 1px solid #0d60b4;
    }
    .btn3 {
      width: 120px;
    }
  }
  .closeMicrophone {
    position: absolute;
    top: 24px;
    right: 24px;
    cursor: pointer;
  }
  .bg {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: v-bind(circleSizePx);
    background: #0d60b4;
    border-radius: 50% 50% 0 0;
    transition: height;
  }
}
</style>
