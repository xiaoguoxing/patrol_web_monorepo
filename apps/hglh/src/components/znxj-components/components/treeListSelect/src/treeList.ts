import type TreeList from './treeList.vue';
import { ColumnProps } from '@/components/znxj-components/components';

export interface TreeListProps<T> {
  treeTitle?: string; // 树标题 ==> 非必传，默认为 节点树
  tableTitle?: string; //表格标题 ==> 非必传，默认为 列表
  getTreeApi?: (data?: any) => Promise<any>; // 请求树数据的 api ==> 非必传
  treeData?: { [key: string]: any }[]; //树数据，如果有了该数据，则不会执行 getTreeApi 请求 (非必传)
  treeId?: string; // 左侧树的每个树节点用来作为唯一标识的属性，整棵树应该是唯一的
  treeLabel?: string; // 显示的label ==> 非必传，默认为 “label”
  getListApi?: (data?: any) => Promise<any>; // 请求table数据的 api ==> 非必传
  initTableParam?: { [key: string]: any }; //列表的初始化请求参数 ==> 非必传（默认为{}）
  dataCallback?: (data: any) => any; //表格返回数据的回调函数，可以对数据进行处理 ==> 非必传
  column?: ColumnProps[]; //中间列表的列配置项
  selectable?: boolean; //是否需要选择功能：值为false时，只用来展示树表联动数据，值为true右侧的已选列表会出现，并且中间列表具有选择功能
  multiple?: boolean; // selectable 为 true 时，该属性才有效设置是单选（值为 false)还是多选(值为 true 时），
  id?: string; // 选择的id ==> 非必传，默认为 “id”
  label?: string; //  右侧已选列表显示的label ==> 非必传，默认为 “label”
  value?: T[] | T; // 默认选中的值 ==>
}
export type TreeListInstance = InstanceType<typeof TreeList>;
