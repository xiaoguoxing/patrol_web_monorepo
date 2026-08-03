import type { ExtractPropTypes, PropType } from 'vue';
import type SearchForm from './search-form.vue';
import type { ColumnProps } from '@/components/znxj-components/components/pro-table';
import type { Cols } from '@/components/znxj-components/components/grid';

export const searchFormProps = {
  columns: {
    type: Array as PropType<ColumnProps[]>,
    default: () => [],
  },
  searchParam: {
    type: Object,
    default: () => ({}),
  },
  searchCol: {
    type: [Number, Object] as PropType<Cols>,
  },
  search: {
    type: Function,
  },
  reset: {
    type: Function,
  },
} as const;

export type SearchFormProps = ExtractPropTypes<typeof searchFormProps>;
export type SearchFormInstance = InstanceType<typeof SearchForm>;
