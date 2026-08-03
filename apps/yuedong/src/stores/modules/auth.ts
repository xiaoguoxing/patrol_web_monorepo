import { defineStore } from 'pinia';
import { AuthState } from '@/stores/interface';
import { getFlatArr, getTrees } from '@/utils/util';
import { getAuthUserApi } from '@/api/modules/login';
import { getShowMenuList, getAllBreadcrumbList, generateRoute, generateBtn } from '@/utils/util';
import { GlobalStore } from '@/stores';
import { RouteRecordRaw } from 'vue-router';
type obj = { [key: string]: any };

// AuthStore
export const AuthStore = defineStore({
  id: 'AuthRealState',
  state: (): AuthState => ({
    //用户信息：名称，头像，所属组织，本身信息，
    userInfo: {},
    // 当前租户，水司，组织，身份信息
    curInfo: {},

    // 数据源列表---租户的数据库列表
    tenantList: [],

    menuPictures: [
      {
        code: 'patrolInspection',
        name: '智能巡检',
        router: '/patrolInspection',
        status: true,
        // imgSrc: require('@/assets/img/workStation/znxj.svg'),
      },
      {
        code: 'systemManagement',
        name: '系统管理',
        // router: '/patrolInspection',
        // status: true,
        // imgSrc: require('@/assets/img/workStation/znxj.svg'),
      },
    ],
    appList: [],
    // 当前页面的 router name，用来做按钮权限筛选
    routeName: '',
    // 按钮权限列表
    authButtonList: {},
    // 当前应用的菜单权限列表
    authMenuList: [],
    // 各个应用的菜单权限列表
    allAuthMenuList: [],
  }),
  getters: {
    // 按钮权限列表
    authButtonListGet: (state) => state.authButtonList,
    // 后端返回的菜单列表 ==> 这里没有经过任何处理
    authMenuListGet: (state) => state.authMenuList,
    // 后端返回的菜单列表 ==> 左侧菜单栏渲染，需要去除 isHide == true
    showMenuListGet: (state) => getShowMenuList(state.authMenuList),
    // 扁平化之后的一维数组路由，主要用来添加动态路由
    flatMenuListGet: (state) => getFlatArr(state.authMenuList),
    // 需要去除 isHide == true扁平化之后的一维数组路由，主要用来添加常用应用
    flatShowMenuListGet: (state) => getFlatArr(state.authMenuList).filter((menu) => !menu.meta?.isHide),
    // 所有面包屑导航列表
    breadcrumbListGet: (state) => getAllBreadcrumbList(state.authMenuList),

    // 数据源列表---租户的数据库列表
    tenantListGet: (state) => state.userInfo.userOwnJurisdictionBean.appSimpleBeanList,
    // 当前租户，水司，组织，身份信息
    curInfoGet: (state) => {
      const globalStore = GlobalStore();
      let userInfo = state.userInfo;
      let curInfo: obj = {};
      if (userInfo) {
        curInfo.currOrgName = userInfo.orgName || '';
        // 设置当前组织
        if (globalStore.currOrg) {
          curInfo.currOrg = globalStore.currOrg;
        } else {
          let defaultOrg = userInfo.orgVoList.filter((item: { defaultFlag: number }) => item.defaultFlag == 1);
          curInfo.currOrg = defaultOrg.length != 0 ? defaultOrg[0].id : userInfo.orgVoList[0].id;
          globalStore.setCurrOrg(curInfo.currOrg);
        }
        //设置当前数据源---当前租户对应的数据库
        if (globalStore.currDs) {
          curInfo.currDs = globalStore.currDs;
        } else {
          curInfo.currDs = userInfo.defaultAppId ? userInfo.defaultAppId : userInfo.appSimpleBeanList[0].appMark;
          globalStore.setCurrDs(curInfo.currDs);
        }

        return curInfo;
      } else {
        return {};
      }
    },
  },
  actions: {
    async getAuth() {
      return new Promise((resolve, reject) => {
        const globalStore = GlobalStore();
        let param = {
          token: globalStore.token,
        };
        getAuthUserApi(param)
          .then((res) => {
            //1、设置用户信息
            this.userInfo = res.data;
            // TODO:EAM有多重身份，代理人的概念：agent，我们这里没有先不管
            // TODO:EAM中设置了OUT_ORG,这个是？localStorage.setItem("OUT_ORG",this.userInfo.isOutOrg || 0);
            // TODO: 设置用户的头像回显：这里不应该是userInfo中的一个url即一张图片路径吗？暂时不按EAM的做，跟后端商量

            //2、设置租户列表信息
            this.tenantList = res.data.userOwnJurisdictionBean.appSimpleBeanList;

            //3、 设置当前水司，组织，身份信息
            this.setcurInfo(res.data);

            //4、设置权限：菜单路由等；
            let defaultDs = res.data.defaultAppId ? res.data.defaultAppId : this.tenantList[0].appMark;
            let appMark = globalStore.currDs ? globalStore.currDs : defaultDs;
            this.getAuthMenuList(appMark);

            resolve(res);
          })
          .catch((error) => {
            reject(error);
          });
      });
    },
    //获取用户,租户，菜单权限信息
    // getAuthMenuList
    async getAuthMenuList(appMark: string) {
      // 当前用户的所有租户下的权限应用，菜单，按钮
      let allListBox = this.userInfo.userOwnJurisdictionBean.appMenuJurisdictionBeanList;

      // 当前租户下的权限应用，菜单，按钮
      let allList = allListBox.map((item: obj) => item.mark == appMark && item.menuJurisdictionBeanList).flat();
      //当前租户下的所有权限应用，菜单
      let menuList = allList.filter((item: obj) => item.isFunc == 0 && item);

      //当前租户下的所有权限按钮
      let btnList = allList.filter((item: obj) => item.isFunc != 0);

      this.authButtonList = generateBtn(btnList, menuList);

      let result = getTrees(menuList, 0, 'menuId', 'parent', 'name');

      result.forEach((item) => {
        // 设置权限应用
        if (item.isOpen && item.status) {
          this.menuPictures.forEach((list) => {
            if (list.code == item.menuCode) {
              this.appList.push(list);
            }
          });
        }
      });

      // 菜单
      this.allAuthMenuList = generateRoute(result, '', true, true, [], '');

      //TODO: 暂时设置当前菜单为第一个应用的,后续需要根据应用切换，路由变化等动态做
      this.authMenuList =
        this.allAuthMenuList.find((item) => item.name == 'patrolInspection')?.children || ([] as RouteRecordRaw[]);
      // console.log('result:', result);
      // console.log('allAuthMenuList:', this.allAuthMenuList);
      // console.log('authMenuList:', this.authMenuList);
      // console.log('authButtonList', this.authButtonList);
    },
    // setRouteName
    async setRouteName(name: string) {
      this.routeName = name;
    },
    async setcurInfo(userInfo: obj) {
      const globalStore = GlobalStore();
      let curInfo: obj = {};
      if (userInfo) {
        curInfo.currOrgName = userInfo.orgName || '';
        // 设置当前组织
        if (globalStore.currOrg) {
          curInfo.currOrg = globalStore.currOrg;
        } else {
          let defaultOrg = userInfo.orgVoList.filter((item: { defaultFlag: number }) => item.defaultFlag == 1);
          curInfo.currOrg = defaultOrg.length != 0 ? defaultOrg[0].id : userInfo.orgVoList[0].id;
          globalStore.setCurrOrg(curInfo.currOrg);
        }
        //设置当前数据源---当前租户对应的数据库
        if (globalStore.currDs) {
          curInfo.currDs = globalStore.currDs;
        } else {
          curInfo.currDs = userInfo.defaultAppId ? userInfo.defaultAppId : userInfo.appSimpleBeanList[0].appMark;
          globalStore.setCurrDs(curInfo.currDs);
        }

        this.curInfo = curInfo;
      } else {
        this.curInfo = {};
      }
    },
  },
});
