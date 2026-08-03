import { createApp } from 'vue';
import App from './App.vue';

// iconfont css
import '@/assets/iconfont/iconfont.scss';
// element plus
import ElementPlus from 'element-plus';
// element icons
import * as Icons from '@element-plus/icons-vue';
// element plus css
import '@/styles/element/index.scss';
// CSS common style sheet
import '@/styles/index.scss';
import '@/styles/font';
import '@/styles/element_custom.scss';
// custom element dark(自定义暗黑模式)
import '@/styles/theme/element-dark.scss';

// vue Router
import router from '@/routers/index';
// vue i18n
import I18n from '@/languages/index';
// pinia store
import pinia from '@/stores/index';
// svg icons
import 'virtual:svg-icons-register';
// errorHandler
// import errorHandler from '@/utils/errorHandler';

import znxjUi from '@/components/znxj-components/znxj-ui';
// import '@/components/znxj-components/theme-chalk/src/index.scss';
const app = createApp(App);

// app.config.errorHandler = errorHandler;

// 注册element Icons组件
Object.keys(Icons).forEach((key) => {
  app.component(key, Icons[key as keyof typeof Icons]);
});

app.use(router).use(I18n).use(pinia).use(ElementPlus).use(znxjUi).mount('#app');
