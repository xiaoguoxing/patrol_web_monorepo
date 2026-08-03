<!-- 横向布局 -->
<template>
  <el-container class="layout">
    <el-header>
      <div class="logo flx-align-center">
        <img src="@/assets/images/logo.svg" alt="logo" />
        <Title />
      </div>
      <MenuBox mode="horizontal" styleType="primary" :default-active="activeMenu" :popperOffset="0">
        <!-- 只有在这里写 submenu 才能触发 menu 三个点省略 -->
        <template v-for="subItem in menuList" :key="subItem.path">
          <el-sub-menu
            v-if="false"
            :index="subItem.path"
            :key="subItem.path + 'el-sub-menu'"
            popper-class="transverse-menu-pop"
          >
            <template #title>
              <el-icon v-if="subItem.meta.icon">
                <svg-icon :prefix="''" :name="subItem.meta.icon"></svg-icon>
              </el-icon>

              <span>{{ subItem.meta.title }}</span>
            </template>
            <!-- <SubMenu :menuList="subItem.children" /> -->

            <DropMenu :menuList="subItem.children" />
            <!-- <el-icon>
                <component :is="subItem.meta.icon"></component>
              </el-icon>
              <template #title>
                <span>{{ subItem.meta.title }}</span>
              </template> -->
          </el-sub-menu>
          <el-menu-item
            v-else
            :index="subItem.path"
            :key="subItem.path + 'el-menu-item'"
            @click="handleClickMenu(subItem)"
          >
            <!-- <el-icon>
              <component :is="subItem.meta.icon"></component>
            </el-icon> -->

            <el-icon v-if="subItem.meta.icon">
              <svg-icon :prefix="''" :name="subItem.meta.icon"></svg-icon>
            </el-icon>
            <template #title>
              <span>{{ subItem.meta.title }}</span>
            </template>
          </el-menu-item>
        </template>
      </MenuBox>
      <ToolBarRight />
    </el-header>
    <el-container class="classic-content">
      <el-aside v-if="subMenu.length">
        <div class="menu" :style="collapseStyle">
          <MenuBox styleType="white" :default-active="activeMenu" :collapse-show="true">
            <SubMenu :menuList="subMenu" />
          </MenuBox>
          <!-- <el-scrollbar>
            <el-menu
              :default-active="activeMenu"
              :router="false"
              :collapse="isCollapse"
              :collapse-transition="false"
              :unique-opened="true"
              background-color="#ffffff"
              text-color="#303133"
            >
              <SubMenu :menuList="subMenu" />
            </el-menu>
          </el-scrollbar>
          <div class="collapse-box">
            <CollapseIcon id="collapseIcon" />
          </div> -->
        </div>
      </el-aside>
      <el-container class="classic-main">
        <el-header v-show="themeConfig.breadcrumb && breadcrumbList && breadcrumbList.length > 1">
          <ToolBarLeft />
        </el-header>
        <Main />
      </el-container>
    </el-container>
  </el-container>
</template>

<script setup lang="ts" name="layoutTransverse">
// import { computed } from 'vue';
// import { GlobalStore } from '@/stores';

import { AuthStore } from '@/stores/modules/auth';
// import { useRoute, useRouter } from 'vue-router';
import Main from '@/layouts/components/Main/index.vue';
import ToolBarRight from '@/layouts/components/Header/ToolBarRight.vue';
import ToolBarLeft from '@/layouts/components/Header/ToolBarLeft.vue';
import SubMenu from '@/layouts/components/Menu/SubMenu.vue';
import DropMenu from '@/layouts/components/Menu/DropMenu.vue';
import MenuBox from '@/layouts/components/Menu/MenuBox.vue';
import Title from '@/layouts/components/Header/components/Title.vue';
import { useMenu } from '@/layouts/hooks/useMenu';
import { computed } from 'vue';
import { GlobalStore } from '@/stores';
import { useRoute } from 'vue-router';
import SvgIcon from '@/components/SvgIcon/index.vue';

const route = useRoute();
const authStore = AuthStore();
const breadcrumbList = computed(() => authStore.breadcrumbListGet[route.matched[route.matched.length - 1].path]);
const globalStore = GlobalStore();
const themeConfig = computed(() => globalStore.themeConfig);
const { activeMenu, menuList, splitActive, subMenu, collapseStyle, handleClickMenu } = useMenu();
</script>

<style scoped lang="scss">
@use '@/layouts/index.scss';
.classic-content {
  .el-header {
    height: $kr-breadcrumb-height;
    padding: 0 $kr-body-padding;

    // background-color: #ffffff;
    background-color: $kr-body-bg-color;
    border-bottom: 0;

    // border-left: 1px solid #f1f1f1;
  }
}
:deep(.el-main) {
  padding: 0 $kr-body-padding $kr-body-padding;
}
</style>

<style lang="scss">
.transverse {
  // guide
  #driver-highlighted-element-stage {
    background-color: #606266 !important;
  }
}
.el-popper.transverse-menu-pop {
  border: unset;
  .el-menu {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    width: auto;
    height: auto;
    padding: 10px 20px 20px;
    background-color: #ffffff;
    box-shadow: 0 0 16px 0 rgb(0 0 0 / 10%);
  }
}
</style>
