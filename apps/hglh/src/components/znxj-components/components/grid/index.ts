// 用来整合组件的，最终实现导出组件

import { withInstall } from '@/components/znxj-components/utils';
import Grid from './src/grid.vue';
import GridItem from './src/grid-item.vue';

// 通过 withInstall 方法给 Icon 添加了一个 install 方法
export const KrGrid = withInstall(Grid);
// 可以通过 app.use 来使用，也可以通过 import 方式单独使用
export default KrGrid;
export const KrGridItem = withInstall(GridItem);
export * from './src/grid';
export * from './src/grid-item';
