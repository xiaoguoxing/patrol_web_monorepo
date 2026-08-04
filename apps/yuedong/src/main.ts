import { createApp } from 'vue';
import App from './App.vue';

import '@/assets/iconfont/iconfont.scss';
import ElementPlus from 'element-plus';
import * as Icons from '@element-plus/icons-vue';
import '@/styles/element/index.scss';
import '@/styles/index.scss';
import '@/styles/font';
import '@/styles/element_custom.scss';
import '@/styles/theme/element-dark.scss';

import router from '@/routers/index';
import I18n from '@/languages/index';
import pinia from '@/stores/index';
import { AuthStore } from '@/stores/modules/auth';
import auth from '@/directives/modules/auth';
import { getTableCol, setTableCol } from '@/api/modules/common';
import 'virtual:svg-icons-register';
import znxjUi from '@patrol/ui';

const app = createApp(App);

// 注册 Element Plus 图标组件
Object.keys(Icons).forEach((key) => {
  app.component(key, Icons[key as keyof typeof Icons]);
});

app.directive('auth', auth);
app
  .use(router)
  .use(I18n)
  .use(pinia)
  .use(ElementPlus)
  .use(znxjUi, {
    getCurrentUserId: () => AuthStore().userInfo.account,
    getCurrentPage: () => router.currentRoute.value.name,
    getTableCol,
    setTableCol,
  })
  .mount('#app');
