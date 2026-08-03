import { createRouter, createWebHashHistory } from 'vue-router';
import { GlobalStore } from '@/stores';
import { AuthStore } from '@/stores/modules/auth';
import { LOGIN_URL, HOME_URL } from '@/config/config';
import { initDynamicRouter } from '@/routers/modules/dynamicRouter';
import { staticRouter, errorRouter } from '@/routers/modules/staticRouter';
import { postUsageApp } from '@/api/modules/workstand';

import NProgress from '@/config/nprogress';
import { getAuthUserApi } from '@/api/modules/login';
async function redirect() {
  try {
    await getAuthUserApi({ token: '' });
  } catch (e: any) {
    window.location.replace(e.response.headers.redirecturl);
  }
}
//白名单
const whiteList = [LOGIN_URL, '/register'];

/**
 * @description 动态路由参数配置简介
 * @param path ==> 菜单路径
 * @param name ==> 菜单别名
 * @param redirect ==> 重定向地址
 * @param component ==> 视图文件路径
 * @param meta ==> 菜单信息
 * @param meta.icon ==> 菜单图标
 * @param meta.title ==> 菜单标题
 * @param meta.activeMenu ==> 当前路由为详情页时，需要高亮的菜单
 * @param meta.isLink ==> 是否外链
 * @param meta.isHide ==> 是否隐藏
 * @param meta.isFull ==> 是否全屏(示例：数据大屏页面)
 * @param meta.isAffix ==> 是否固定在 tabs nav
 * @param meta.isKeepAlive ==> 是否缓存
 * */
const router = createRouter({
  history: createWebHashHistory(),
  routes: [...staticRouter, ...errorRouter],
  strict: false,
  scrollBehavior: () => ({ left: 0, top: 0 }),
});

/**
 * @description 路由拦截 beforeEach
 * */
router.beforeEach(async (to, from, next) => {
  const globalStore = GlobalStore();

  // 1.NProgress 开始
  NProgress.start();

  // 2.动态设置标题
  const title = import.meta.env.VITE_GLOB_APP_TITLE;
  document.title = to.meta.title ? `${to.meta.title} - ${title}` : title;

  // 3.如果是访问登陆页，没有 token 直接放行，有 token 就在当前页
  if (to.path === LOGIN_URL) {
    if (!globalStore.token) return next();
    else return next(from.fullPath);
  }

  // 4.判断是否是单点登录过来的带着 Token
  // if (to.path === HOME_URL && to.query.token) {
  if (to.query.token) {
    // 清除之前登录所存的身份信息
    globalStore.setToken(to.query.token as string);
    globalStore.setCurrDs('');
    globalStore.setCurrOrg('');
    to.query.currDs && globalStore.setCurrDs(to.query.currDs as string);
    to.query.currOrg && globalStore.setCurrOrg(to.query.currOrg as string);
    let { currDs, currOrg, token, ...query } = to.query;
    return next({
      path: to.path,
      query: query,
      replace: true,
    });
  }
  // 5.判断是否有 Token，没有重定向到 login
  if (!globalStore.token) {
    // 没有token
    if (whiteList.indexOf(to.path) !== -1) {
      // 在免登录白名单，直接进入
      return next();
    } else {
      //到单点登录页或登录页
      await redirect();
      return next(LOGIN_URL);
      // next(`/login?redirect=${to.fullPath}`) // 否则全部重定向到登录页
      // NProgress.done()
    }
  }
  // 6.如果没有菜单列表，就重新请求菜单列表并添加动态路由
  const authStore = AuthStore();
  authStore.setRouteName(to.name as string);
  if (!authStore.authMenuListGet.length) {
    await initDynamicRouter();
    return next({ ...to, replace: true });
  }

  // 7.正常访问页面
  next();
});

/**
 * @description 重置路由
 * */
export const resetRouter = () => {
  const authStore = AuthStore();
  authStore.flatMenuListGet.forEach((route) => {
    const { name } = route;
    if (name && router.hasRoute(name)) router.removeRoute(name);
  });
};

/**
 * @description 路由跳转结束
 * */
router.afterEach((to, from, failure) => {
  const authStore = AuthStore();
  // console.log(authStore.flatShowMenuListGet);
  const targetMenu = authStore.flatShowMenuListGet.find((menu) => {
    const { path } = menu;
    const { fullPath } = to;
    return path != '/patrolInspection/worktop' && path == fullPath;
  });
  if (targetMenu) {
    const param = {
      moduleName: targetMenu.meta?.title,
      photo: targetMenu.meta?.icon || targetMenu.meta?.parentIcon,
      route: targetMenu.path,
    };
    postUsageApp(param)
      .then((res) => {
        // console.log(param);
      })
      .catch((error) => {
        console.error(error);
      });
  }
  NProgress.done();
});

/**
 * @description 路由跳转错误
 * */
router.onError((error) => {
  NProgress.done();
  console.warn('路由错误', error.message);
});

export default router;
