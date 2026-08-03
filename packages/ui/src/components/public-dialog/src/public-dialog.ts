import type { ExtractPropTypes } from 'vue';
import type PublicDialog from './public-dialog.vue';

export const publicDialogProps = {
  singleClose: {
    type: Boolean,
    default: false,
  },
  title: {
    type: String,
    default: '',
  },

  modelValue: {
    type: Boolean,
    default: false,
  },
  appendTobody: {
    type: Boolean,
    default: false,
  },
  noFootBtn: {
    type: Boolean,
    default: false,
  },
  fullscreen: {
    type: Boolean,
    default: false,
  },
  showClose: {
    type: Boolean,
    default: true,
  },
  modal: {
    type: Boolean,
    default: true,
  },
  btnText: {
    type: Array,
    default: () => {
      return ['确定', '取消'];
    },
  },
  width: {
    type: String,
    default: '',
  },
  height: {
    type: String,
    default: '',
  },
  //拖动
  draggable: {
    type: Boolean,
    default: true,
  },
} as const;

export type PublicDialogProps = ExtractPropTypes<typeof publicDialogProps>;
export type PublicDialogInstance = InstanceType<typeof PublicDialog>;
