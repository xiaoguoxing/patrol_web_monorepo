<template>
  <div>
    <el-dialog
      :title="title"
      v-model="visible"
      :draggable="draggable"
      :append-to-body="appendTobody"
      :close-on-click-modal="false"
      :fullscreen="fullscreen"
      :width="width"
      :modal="modal"
      :show-close="showClose"
      class="kr-public-dialog"
      :class="customClass"
      :style="style"
      :lock-scroll="lockScroll"
      :before-close="beforeClose"
      :destroy-on-close="destroyOnClose"
      @close="close"
      align-center
    >
      <template #header>
        <slot name="dialog-title"></slot>
      </template>

      <slot></slot>

      <template v-if="!noFootBtn" #footer>
        <div class="dialog-footer" ref="addReceptionForm">
          <slot name="footer">
            <el-button v-if="singleClose" class="dialog-footer__btn" @click="closeDialog">{{ btnText[0] }}</el-button>
            <template v-else>
              <el-button class="dialog-footer__btn" @click="closeDialog">{{ btnText[0] }}</el-button>
              <el-button
                type="primary"
                class="dialog-footer__btn"
                v-debounce="
                  () => {
                    $emit('doSubmit');
                  }
                "
                >{{ btnText[1] }}</el-button
              >
            </template>
          </slot>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts" name="KrPublicDialog">
import { debounce as vDebounce } from '../../../directives';
import { addUnit } from '../../../utils';
import { computed, onBeforeMount, ref, watch } from 'vue';
import '../style/index.scss';
import type { CSSProperties } from 'vue';
interface PublicDialog {
  singleClose?: boolean;
  title?: string;
  customClass?: string | string[] | { [key: string]: boolean };
  modelValue?: boolean;
  appendTobody?: boolean;
  noFootBtn?: boolean;
  fullscreen?: boolean;
  showClose?: boolean;
  destroyOnClose?: boolean;
  modal?: boolean;
  btnText?: [string, string];
  width?: string | number;
  height?: string | number;
  draggable?: boolean;
  beforeClose?: (fn: () => any) => void;
}
// 接受父组件参数，配置默认值
const props = withDefaults(defineProps<PublicDialog>(), {
  singleClose: false,
  title: '标题',
  modelValue: false,
  appendTobody: false,
  noFootBtn: false,
  fullscreen: false,
  showClose: true,
  destroyOnClose: false,
  modal: true,
  btnText: () => ['取消', '确定'],
  width: '',
  height: '',
  customClass: '',
  draggable: false,
  beforeClose: (fn: () => any) => {
    fn();
  },
});
const emit = defineEmits(['update:modelValue', 'doSubmit', 'doClose']);
const visible = ref(false);
const lockScroll = ref(false);
const style = computed<CSSProperties>(() => {
  const style: CSSProperties = {};
  if (!props.fullscreen) {
    if (props.height) {
      style[`height`] = addUnit(props.height);
    }
  }
  return style;
});
watch(
  () => props.modelValue,
  (val) => {
    visible.value = val;
  },
  {
    immediate: true,
  }
);
/*
watch(visible, (val) => {
  if (!val) {
    emit('update:modelValue', false);
  }
});

onBeforeMount(() => {
   visible.value = props.modelValue;
});
*/
function closeDialog() {
  emit('doClose');
}
function close() {
  emit('update:modelValue', false);
  closeDialog();
}
</script>
