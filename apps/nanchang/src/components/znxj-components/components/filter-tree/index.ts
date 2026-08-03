// 用来整合组件的，最终实现导出组件

import { withInstall } from '@/components/znxj-components/utils';
import FilterTree from './src/filter-tree.vue';

// 通过 withInstall 方法给 Protable 添加了一个 install 方法
export const KrFilterTree = withInstall(FilterTree);
// 可以通过 app.use 来使用，也可以通过 import 方式单独使用
export default KrFilterTree;
export * from './src/filter-tree';
