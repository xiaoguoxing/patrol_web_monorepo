<template>
  <ul class="drop-menu" :style="`flex-direction:${moreLevel ? 'row' : 'column'} ;`">
    <template v-for="subItem in menuList" :key="subItem.path">
      <li v-if="watchLevel(subItem)" class="drop-menu-col" :class="locale" :index="subItem.path">
        <div class="drop-menu-title">
          <span>{{ subItem.meta.title }}</span>
        </div>
        <ul>
          <el-menu-item
            v-for="item in subItem.children"
            :index="item.path"
            :key="item.path"
            @click="changeSubMenu(item)"
          >
            <span>{{ item.meta.title }}</span>
          </el-menu-item>
        </ul>
      </li>
      <el-menu-item class="first-row" :class="locale" v-else :index="subItem.path" @click="changeSubMenu(subItem)">
        <!-- <el-icon>
          <component :is="subItem.meta.icon"></component>
        </el-icon> -->
        <!-- <el-icon v-if="subItem.meta.icon">
          <svg-icon :prefix="''" :name="subItem.meta.icon"></svg-icon>
        </el-icon> -->
        <span>{{ subItem.meta.title }}</span>
      </el-menu-item>
    </template>
  </ul>
</template>

<script setup lang="ts">
import { RouteRecordRaw, useRouter } from 'vue-router';
import { ref } from 'vue';
import { useMenu } from '@/layouts/hooks/useMenu';
import SvgIcon from '@/components/SvgIcon/index.vue';
import { useI18n } from 'vue-i18n';
const { locale } = useI18n();
const props = defineProps<{ menuList: RouteRecordRaw[] }>();
const moreLevel = ref(false);
const watchLevel = (subItem: RouteRecordRaw) => {
  if (!moreLevel.value) {
    if (subItem.children && subItem.children.length) {
      moreLevel.value = true;
    }
  }
  return subItem.children && subItem.children.length;
};
const router = useRouter();
const { activeMenu, changeSubMenu } = useMenu();
</script>
<style scoped lang="scss">
.drop-menu {
  display: flex;
  justify-content: space-between;
  %first-row {
    height: 64px;
    padding: 0 12px;
    font-size: var(--el-font-size-medium);
    line-height: 64px;
  }
  .drop-menu-col {
    width: 148px;
    &.en,
    &.en .el-menu-item {
      width: auto !important;
    }
    .drop-menu-title {
      @extend %first-row;

      color: var(--el-text-color-secondary);
    }
  }
  .el-menu-item {
    display: flex;
    align-items: center;
    width: 148px;
    height: $kr-menu-item-height;
    padding: 0 12px;
    line-height: $kr-menu-item-height;
    color: var(--el-text-color-regular);
    &.en {
      width: auto !important;
    }
    &.first-row {
      @extend %first-row;
    }
    &:hover {
      color: var(--el-text-color-regular);
      background-color: $kr-menu-hover-bg-color;
    }
    &.is-active {
      color: var(--el-color-primary);
      background-color: var(--kr-color-primary-lighter);
    }

    // * {
    //   font-size: var(--el-font-size-base);
    // }
  }
}

// .drop-menu-item{

// }
</style>
