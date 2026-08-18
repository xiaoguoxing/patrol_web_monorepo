import { ref, computed, watch } from 'vue';
import { RouteRecordRaw, useRoute, useRouter } from 'vue-router';
import { GlobalStore } from '@/stores';
import { AuthStore } from '@/stores/modules/auth';
import { TABS_WHITE_LIST } from '@/config/config';
export const useMenu = () => {
  const route = useRoute();
  const authStore = AuthStore();
  const globalStore = GlobalStore();
  // const activeMenu = computed(() => route.path);
  const activeMenu = computed(() => (route.meta.activeMenu ? route.meta.activeMenu : route.path));
  const menuList = computed(() => authStore.showMenuListGet);
  const isCollapse = computed(() => globalStore.themeConfig.isCollapse);
  const collapseStyle = computed(() => {
    return { width: globalStore.themeConfig.isCollapse ? '65px' : '264px' };
  });

  const router = useRouter();
  const subMenu = ref<RouteRecordRaw[]>([]);
  const splitActive = ref<string>('');
  watch(
    () => [menuList, route],
    () => {
      // 当前路由存在 tabs 白名单中 || 当前菜单没有数据直接 return
      if (TABS_WHITE_LIST.includes(route.path) || !menuList.value.length) return;
      const menuItem = menuList.value.filter((item: RouteRecordRaw) => route.path.includes(item.path));
      if (menuItem[0]) {
        splitActive.value = menuItem[0].path;
        if (menuItem[0].children?.length) return (subMenu.value = menuItem[0].children);
        subMenu.value = [];
      }
    },
    {
      deep: true,
      immediate: true,
    }
  );
  // 切换 SubMenu
  const changeSubMenu = (item: RouteRecordRaw) => {
    splitActive.value = item.path;
    if (item.children?.length) {
      subMenu.value = item.children;
    } else {
      subMenu.value = [];
    }
    router.push(item.path);
  };
  const handleClickMenu = (subItem: RouteRecordRaw) => {
    if (subItem.meta?.isLink) return window.open(subItem.meta?.isLink, '_blank');
    router.push(subItem.path);
  };

  return {
    changeSubMenu,
    handleClickMenu,
    menuList,
    subMenu,
    splitActive,
    activeMenu,
    isCollapse,
    collapseStyle,
  };
};
