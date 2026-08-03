// 用来整合组件的，最终实现导出组件

import { withInstall } from '@/components/znxj-components/utils';
import SearchForm from './src/search-form.vue';

export const KrSearchForm = withInstall(SearchForm);
// 可以通过 app.use 来使用，也可以通过 import 方式单独使用
export default KrSearchForm;
export * from './src/search-form';
