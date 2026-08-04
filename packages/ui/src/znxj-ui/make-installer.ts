import type { App, Plugin } from 'vue';
import { provideUiAdapter, type UiAdapter } from '../adapter';

// 是否已安装标识
const INSTALLED_KEY = Symbol('INSTALLED_KEY');

export const makeInstaller = (components: Plugin[] = []) => {
  const install = (app: App, adapter: Partial<UiAdapter> = {}) => {
    if ((app as any)[INSTALLED_KEY]) return;

    (app as any)[INSTALLED_KEY] = true;
    provideUiAdapter(app, adapter);
    components.forEach((component) => {
      app.use(component);
    });
  };

  return { install };
};
