// 用来整合组件的，最终实现导出组件

import { withInstall } from '../../utils';
import ProTable from './src/pro-table.vue';

// 通过 withInstall 方法给 Protable 添加了一个 install 方法
export const KrProTable = withInstall(ProTable);
// 可以通过 app.use 来使用，也可以通过 import 方式单独使用
export default KrProTable;
export * from './src/pro-table';
