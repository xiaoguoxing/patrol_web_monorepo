import type FilterList from './filter-list.vue';

// 接收父组件参数并设置默认值
export interface FilterListProps {
  modelValue?: { [key: string]: any }[]; // 分类数据，如果有分类数据，则不会执行 api 请求 ==> 非必传
  header?: string; // treeFilter 标题 ==> 非必传
  id?: string; // 选择的id ==> 非必传，默认为 “id”
  label?: string; // 显示的label ==> 非必传，默认为 “label”
  filterable?: boolean; // 是否可过滤 ==> 非必传，默认为 false
  headerBorder?: boolean; //是否显示header的下边框
}
export type FilterListInstance = InstanceType<typeof FilterList>;
