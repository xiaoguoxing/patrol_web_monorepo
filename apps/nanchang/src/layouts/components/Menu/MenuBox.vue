<template>
  <el-menu
    v-if="mode == 'horizontal'"
    :mode="mode"
    :default-active="defaultActive"
    :router="false"
    :collapse="collapseShow && themeConfig.isCollapse"
    :collapse-transition="false"
    :unique-opened="true"
    :popper-offset="popperOffset"
  >
    <!--     :background-color="menuTheme.bgColor"
    :text-color="menuTheme.txtColor"
    :active-text-color="menuTheme.activeColor" -->
    <slot></slot>
  </el-menu>
  <el-scrollbar v-else>
    <el-menu
      :mode="mode"
      :default-active="defaultActive"
      :router="false"
      :collapse="collapseShow && themeConfig.isCollapse"
      :collapse-transition="false"
      :unique-opened="true"
    >
      <slot></slot>
    </el-menu>
  </el-scrollbar>

  <div v-if="collapseShow" class="collapse-box">
    <CollapseIcon id="collapseIcon" />
  </div>
</template>
<script setup lang="ts">
import { computed } from 'vue';

import { GlobalStore } from '@/stores';
import CollapseIcon from '@/layouts/components/Header/components/CollapseIcon.vue';

const globalStore = GlobalStore();

const themeConfig = computed(() => globalStore.themeConfig);

// const styleObj: { [key: string]: any } = {
//   primary: {
//     bgColor: globalStore.themeConfig.primary,
//     txtColor: 'rgba(255,255,255,0.8)',
//     activeColor: '#fff',
//   },
//   white: {
//     bgColor: '#fff',
//     txtColor: '#303331',
//     activeColor: globalStore.themeConfig.primary,
//   },
// };

interface MenuProps {
  // menuList: Menu.MenuOptions[]; // 菜单列表
  mode?: string;
  defaultActive?: string;
  collapseShow?: boolean;
  collapse?: boolean;
  styleType?: string; // 菜单样式类型
  popperOffset?: number; //弹出层的偏移量(对所有子菜单有效)
}
const props = withDefaults(defineProps<MenuProps>(), {
  styleType: 'primary',
  collapseShow: false,
  collapse: false,
  popperOffset: 0,
});
//不再使用动态样式，element-plus对这些属性已废弃
const menuTheme = computed(() => {
  if (props.styleType == 'primary') {
    return {
      bgColor: globalStore.themeConfig.primary,
      txtColor: '#fff', //'rgba(255,255,255,0.8)',
      activeColor: '#fff',
    };
  } else {
    return {
      bgColor: '#fff',
      txtColor: '#333',
      activeColor: globalStore.themeConfig.primary,
    };
  }
});
</script>
