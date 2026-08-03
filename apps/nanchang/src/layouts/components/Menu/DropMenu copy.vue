<template>
  <ul class="flx-justify-between" :style="`flex-direction:${moreLevel ? 'row' : 'column'} ;`">
    <template v-for="subItem in menuList" :key="subItem.path">
      <li class="drop-menu-col" :index="subItem.path">
        <template v-if="watchLevel(subItem)">
          <div class="drop-menu-title">
            <span>{{ subItem.meta.title }}</span>
          </div>
          <ul>
            <li
              :class="['drop-menu-item', activeMenu == subItem.path ? 'is-active' : '']"
              v-for="item in subItem.children"
              :key="item.path"
              @click="handleClickMenu(item)"
            >
              <span>{{ item.meta.title }}</span>
            </li>
          </ul>
        </template>

        <div
          v-else
          :class="['drop-menu-item', activeMenu == subItem.path ? 'is-active' : '']"
          :index="subItem.path"
          @click="handleClickMenu(subItem)"
        >
          <el-icon>
            <component :is="subItem.meta.icon"></component>
          </el-icon>
          <span>{{ subItem.meta.title }}</span>
        </div>
      </li>

      <!-- <el-sub-menu v-if="subItem.children && subItem.children.length > 0" :index="subItem.path">
      <template #title>
        <el-icon>
          <component :is="subItem.meta.icon"></component>
        </el-icon>
        <span>{{ subItem.meta.title }}</span>
      </template>
      <SubMenu :menuList="subItem.children" />
    </el-sub-menu>
    <el-menu-item v-else :index="subItem.path" @click="handleClickMenu(subItem)">
      <el-icon>
        <component :is="subItem.meta.icon"></component>
      </el-icon>
      <template #title>
        <span>{{ subItem.meta.title }}</span>
      </template>
    </el-menu-item> -->
    </template>
  </ul>
</template>

<script setup lang="ts">
import { RouteRecordRaw, useRouter } from 'vue-router';
import { ref } from 'vue';
import { useMenu } from '@/layouts/hooks/useMenu';

defineProps<{ menuList: RouteRecordRaw[] }>();

// const menuList = ref([
//   {
//     path: '/one',
//     meta: {
//       title: '二级菜单',
//       icon: 'menu',
//     },
//     children: [
//       {
//         path: '/one/one1',
//         meta: {
//           title: '三级菜单',
//           icon: 'menu',
//         },
//       },
//       {
//         path: '/one/one1',
//         meta: {
//           title: '三级菜单',
//           icon: 'menu',
//         },
//       },
//       {
//         path: '/one/one1',
//         meta: {
//           title: '三级菜单',
//           icon: 'menu',
//         },
//       },
//     ],
//   },
//   {
//     path: '/one',
//     meta: {
//       title: '二级菜单',
//       icon: 'menu',
//     },
//     children: [
//       {
//         path: '/one/one1',
//         meta: {
//           title: '三级菜单',
//           icon: 'menu',
//         },
//       },
//       {
//         path: '/one/one1',
//         meta: {
//           title: '三级菜单',
//           icon: 'menu',
//         },
//       },
//       {
//         path: '/one/one1',
//         meta: {
//           title: '三级菜单',
//           icon: 'menu',
//         },
//       },
//     ],
//   },
//   {
//     path: '/one',
//     meta: {
//       title: '二级菜单',
//       icon: 'menu',
//     },
//     children: [
//       {
//         path: '/one/one1',
//         meta: {
//           title: '三级菜单',
//           icon: 'menu',
//         },
//       },
//       {
//         path: '/one/one1',
//         meta: {
//           title: '三级菜单',
//           icon: 'menu',
//         },
//       },
//       {
//         path: '/one/one1',
//         meta: {
//           title: '三级菜单',
//           icon: 'menu',
//         },
//       },
//     ],
//   },
// ]);
const moreLevel = ref(false);
const watchLevel = (subItem) => {
  if (!moreLevel.value) {
    if (subItem.children && subItem.children.length) {
      moreLevel.value = true;
    }
  }
  return subItem.children && subItem.children.length;
};
const router = useRouter();
const { activeMenu } = useMenu();

const handleClickMenu = (subItem: RouteRecordRaw) => {
  if (subItem.meta?.isLink) return window.open(subItem.meta?.isLink, '_blank');
  router.push(subItem.path);
};
</script>
<style scoped lang="scss">
.drop-menu-col {
  width: 148px;
}
.drop-menu-title {
  height: 54px;
  padding: 0 12px;
  font-size: var(--el-font-size-medium);
  line-height: 54px;
  color: var(--el-text-color-secondary);
}
.drop-menu-item {
  display: flex;
  align-items: center;
  height: $kr-menu-item-height;
  padding: 0 12px;
  line-height: $kr-menu-item-height;
  color: var(--el-text-color-regular);
  [class^='el-icon'] {
    margin-right: 5px;
  }
  &:hover {
    background-color: $kr-menu-hover-bg-color;
  }
  &.is-active {
    color: var(--el-color-primary);
    background-color: var(--kr-color-primary-aside-active);
  }
  * {
    font-size: var(--el-font-size-base);
  }
}

// .drop-menu-item{

// }
</style>
