/* themeConfigProp */
import { RouteRecordRaw } from 'vue-router';

export interface ThemeConfigProps {
  layout: string;
  primary: string;
  isDark: boolean;
  isGrey: boolean;
  isCollapse: boolean;
  isWeak: boolean;
  breadcrumb: boolean;
  breadcrumbIcon: boolean;
  tabs: boolean;
  tabsIcon: boolean;
  footer: boolean;
  maximize: boolean;
}

/* GlobalState */
export interface GlobalState {
  token: string;
  currDs: string;
  currOrg: string;
  // userInfo: any;
  assemblySize: string;
  language: string;
  themeConfig: ThemeConfigProps;
}

/* tabsMenuProps */
export interface TabsMenuProps {
  icon: string;
  title: string;
  path: string;
  name: string;
  close: boolean;
}

/* TabsState */
export interface TabsState {
  tabsMenuList: TabsMenuProps[];
}

type obj = {
  [key: string]: any;
};
/* AuthState */
export interface AuthState {
  userInfo: obj;
  curInfo: obj;
  tenantList: obj[];
  appList: obj[];
  menuPictures: obj[];
  routeName: string;
  authButtonList: {
    [key: string]: string[];
  };
  authMenuList: RouteRecordRaw[];
  allAuthMenuList: RouteRecordRaw[];
}

/* keepAliveState */
export interface keepAliveState {
  keepLiveName: string[];
}
