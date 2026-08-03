import type { ExtractPropTypes, PropType } from 'vue';
import type Grid from './grid.vue';

export type BreakPoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type Responsive = {
  span?: number;
  offset?: number;
};
export type Cols = number | Record<BreakPoint, number>;
export type Gap = [number, number] | number;

export const gridProps = {
  cols: {
    type: [Number, Object] as PropType<Cols>,
    default: () => ({ xs: 1, sm: 2, md: 2, lg: 3, xl: 4 }),
  },
  collapsed: {
    type: Boolean,
    default: false,
  },
  collapsedRows: {
    type: Number,
    default: 1,
  },
  gap: {
    type: [Array, Number] as PropType<Gap>,
    default: 0,
  },
} as const;

export type GridProps = ExtractPropTypes<typeof gridProps>;
export type GridInstance = InstanceType<typeof Grid>;
