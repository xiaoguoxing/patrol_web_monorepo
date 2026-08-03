import type TreeListSelect from './treeListSelect.vue';

export interface TreeListSelectProps<T> {
  dialogTitle?: string; // 弹窗标题 ==> 非必传，默认为 “请选择”
  treeTitle?: string; // 树标题 ==> 非必传，默认为 节点树
  tableTitle?: string; //表格标题 ==> 非必传，默认为 列表
  getListApi?: (data?: any) => Promise<any>; // 请求table数据的 api ==> 非必传
  getTreeApi?: (data?: any) => Promise<any>; // 请求树数据的 api ==> 非必传
  initTableParam?: { [key: string]: any };
  dataCallback?: (data: any) => any;
  // treeData?: { [key: string]: any }[]; //树数据，如果有树数据，则不会执行 getTreeApi 请求 ==> 非必传
  //header?: string; // treeFilter 标题 ==> 非必传
  treeId?: string; // 选择的id ==> 非必传，默认为 “id”
  treeLabel?: string; // 显示的label ==> 非必传，默认为 “label”
  id?: string; // 选择的id ==> 非必传，默认为 “id”
  label?: string; // 显示的label ==> 非必传，默认为 “label”
  multiple?: boolean; // 是否为多选 ==> 非必传，默认为 false
  value?: T[] | T; // 默认选中的值 ==>
  visible?: boolean;
}
export type TreeListSelectInstance = InstanceType<typeof TreeListSelect>;
