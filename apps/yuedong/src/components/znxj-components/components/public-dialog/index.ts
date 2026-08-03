// 用来整合组件的，最终实现导出组件

import { withInstall } from '@/components/znxj-components/utils';
import PublicDialog from './src/public-dialog.vue';

// 通过 withInstall 方法给 Protable 添加了一个 install 方法
export const KrPublicDialog = withInstall(PublicDialog);
// 可以通过 app.use 来使用，也可以通过 import 方式单独使用
export default KrPublicDialog;
export * from './src/public-dialog';
