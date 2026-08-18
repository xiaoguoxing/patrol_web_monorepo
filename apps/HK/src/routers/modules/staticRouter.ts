import { RouteRecordRaw } from 'vue-router';
import { HOME_URL, LOGIN_URL } from '@/config/config';

/**
 * staticRouter(静态路由)
 */
export const staticRouter: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: HOME_URL,
  },
  {
    path: LOGIN_URL,
    name: 'login',
    component: () => import('@/views/login/index.vue'),
    meta: {
      title: '登录',
      icon: '',
      isHide: false,
      isFull: false,
      isAffix: false,
      isKeepAlive: false,
    },
  },
  {
    path: '/layout',
    name: 'layout',
    // component: () => import('@/layouts/index.vue'),
    component: () => import('@/layouts/indexAsync.vue'),
    redirect: HOME_URL,
    children: [
      {
        path: '/test',
        name: 'test',
        component: () => import('@/views/test.vue'),
        meta: {
          title: 'test',
          icon: '',
          isHide: false,
          isFull: false,
          isAffix: false,
          isKeepAlive: false,
        },
      },
      // //运管中心
      // {
      //   path: '/optCenter',
      //   name: 'optCenter',
      //   redirect: '/optCenter/aiPatrolManage/position',
      //   meta: {
      //     icon: 'Briefcase',
      //     title: '运管中心',
      //     isLink: '',
      //     isHide: false,
      //     isFull: false,
      //     isAffix: false,
      //     isKeepAlive: true,
      //   },
      //   children: [
      //     //智能巡检管理
      //     {
      //       path: '/optCenter/aiPatrolManage',
      //       name: 'aiPatrolManage',
      //       redirect: '/optCenter/aiPatrolManage/position',
      //       meta: {
      //         icon: 'Menu',
      //         title: '智能巡检管理',
      //         isLink: '',
      //         isHide: false,
      //         isFull: false,
      //         isAffix: false,
      //         isKeepAlive: true,
      //       },
      //       children: [
      //         {
      //           path: '/optCenter/aiPatrolManage/position',
      //           name: 'area',
      //           component: () => import('@/views/optCenter/aiPatrolManage/position/index.vue'),
      //           meta: {
      //             icon: 'Menu',
      //             title: '预置位配置',
      //             isLink: '',
      //             isHide: false,
      //             isFull: false,
      //             isAffix: false,
      //             isKeepAlive: true,
      //           },
      //         },
      //       ],
      //     },
      //     //巡检配置
      //     {
      //       path: '/optCenter/inspectionSet',
      //       name: 'inspectionSet',
      //       redirect: '/optCenter/inspectionSet/area',
      //       meta: {
      //         icon: 'Menu',
      //         title: '巡检配置',
      //         isLink: '',
      //         isHide: false,
      //         isFull: false,
      //         isAffix: false,
      //         isKeepAlive: true,
      //       },
      //       children: [
      //         {
      //           path: '/optCenter/inspectionSet/area',
      //           name: 'area',
      //           component: () => import('@/views/optCenter/inspectionSet/area/index.vue'),
      //           meta: {
      //             icon: 'Menu',
      //             title: '巡检区域管理',
      //             isLink: '',
      //             isHide: false,
      //             isFull: false,
      //             isAffix: false,
      //             isKeepAlive: true,
      //           },
      //         },
      //       ],
      //     },
      //   ],
      // },
    ],
  },
];

/**
 * errorRouter(错误页面路由)
 */
export const errorRouter: RouteRecordRaw[] = [
  {
    path: '/403',
    name: '403',
    component: () => import('@/components/ErrorMessage/403.vue'),
    meta: {
      title: '403页面',
      icon: '',
      isHide: false,
      isFull: false,
      isAffix: false,
      isKeepAlive: false,
    },
  },
  {
    path: '/404',
    name: '404',
    component: () => import('@/components/ErrorMessage/404.vue'),
    meta: {
      title: '404页面',
      icon: '',
      isHide: false,
      isFull: false,
      isAffix: false,
      isKeepAlive: false,
    },
  },
  {
    path: '/500',
    name: '500',
    component: () => import('@/components/ErrorMessage/500.vue'),
    meta: {
      title: '500页面',
      icon: '',
      isHide: false,
      isFull: false,
      isAffix: false,
      isKeepAlive: false,
    },
  },
];

/**
 * notFoundRouter(找不到路由)
 */
export const notFoundRouter: RouteRecordRaw = {
  path: '/:pathMatch(.*)*',
  name: 'notFound',
  redirect: { name: '404' },
};
