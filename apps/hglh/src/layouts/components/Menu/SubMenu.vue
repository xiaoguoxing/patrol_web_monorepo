<template>
  <template v-for="subItem in menuList" :key="subItem.path">
    <el-sub-menu v-if="subItem.children && subItem.children.length > 0" :index="subItem.path">
      <template #title>
        <!-- <el-icon>
          <component :is="subItem.meta.icon"></component>
        </el-icon> -->

        <el-icon :style="subItem.meta.icon ? 'width:1em;' : 'width:0px;'" v-if="subItem.meta.icon">
          <svg-icon :prefix="''" :name="subItem.meta.icon"></svg-icon>
        </el-icon>
        <span>{{ subItem.meta.title }}</span>
      </template>
      <SubMenu :menuList="subItem.children" />
    </el-sub-menu>
    <el-menu-item v-else :index="subItem.path" @click="handleClickMenu(subItem)">
      <!-- <el-icon>
        <component :is="subItem.meta.icon"></component>
      </el-icon> -->

      <el-icon :style="subItem.meta.icon ? 'width:1em;' : 'width:0px;'">
        <svg-icon v-if="subItem.meta.icon" :prefix="''" :name="subItem.meta.icon"></svg-icon>
      </el-icon>
      <template #title>
        <span>{{ subItem.meta.title }}</span>
      </template>
    </el-menu-item>
  </template>
</template>

<script setup lang="ts">
import SvgIcon from '@/components/SvgIcon/index.vue';
import { useMenu } from '@/layouts/hooks/useMenu';
import { RouteRecordRaw } from 'vue-router';

defineProps<{ menuList: RouteRecordRaw[] }>();

const { handleClickMenu } = useMenu();
</script>
