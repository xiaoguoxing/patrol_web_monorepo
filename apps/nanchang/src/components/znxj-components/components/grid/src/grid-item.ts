import type { ExtractPropTypes, PropType } from 'vue';
import type GridItem from './grid-item.vue';
import type { Responsive } from './grid';

export const gridItemProps = {
  offset: {
    type: Number,
    default: 0,
  },
  span: {
    type: Number,
    default: 1,
  },
  suffix: {
    type: Boolean,
    default: false,
  },
  xs: {
    type: [Object] as PropType<Responsive>,
  },
  sm: {
    type: [Object] as PropType<Responsive>,
  },
  md: {
    type: [Object] as PropType<Responsive>,
  },
  lg: {
    type: [Object] as PropType<Responsive>,
  },
  xl: {
    type: [Object] as PropType<Responsive>,
  },
} as const;

export type GridItemProps = ExtractPropTypes<typeof gridItemProps>;
export type GridItemInstance = InstanceType<typeof GridItem>;
