import type { /* App, */ Plugin } from 'vue';

// 是否已安装标识
const INSTALLED_KEY = Symbol('INSTALLED_KEY');
export const makeInstaller = (components: Plugin[] = []) => {
  //TODO:暂且app类型改为any,找到解决办法再改
  const install = (app: any) => {
    if (app[INSTALLED_KEY]) return;

    app[INSTALLED_KEY] = true;
    components.forEach((c) => {
      app.use(c);
    });
  };

  return {
    install,
  };
};
