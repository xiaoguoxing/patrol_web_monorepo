<template>
  <kr-card header="常用应用" :border="false">
    <div v-for="(item, index) in appsList" :key="index" class="apps" @click="goToMenu(item)">
      <!-- <img :src="item.icon" alt="" /> -->
      <div class="app-icon">
        <el-icon>
          <svg-icon :prefix="''" :name="item.photo"></svg-icon>
        </el-icon>
      </div>
      <span>{{ item.moduleName }}</span>
    </div>
  </kr-card>
</template>

<script setup name="apps">
import SvgIcon from '@/components/SvgIcon/index.vue';

import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import app1 from '@/assets/images/home/app1.png';
import app2 from '@/assets/images/home/app2.png';
import app3 from '@/assets/images/home/app3.png';
import app4 from '@/assets/images/home/app4.png';
import { getApp } from '@/api/modules/workstand';
const router = useRouter();
const appsList = ref([
  // {
  //   moduleName: '巡检区域配置',
  //   icon: app1,
  // },
  // {
  //   moduleName: '智能巡检',
  //   icon: app1,
  // },
  // {
  //   moduleName: '轨道机巡检',
  //   icon: app1,
  // },
  // {
  //   moduleName: '任务日程',
  //   icon: app2
  // },
  // {
  //   moduleName: '任务报告',
  //   icon: app3,
  // },
  // {
  //   moduleName: '告警管理',
  //   icon: app4,
  // },
]);
const getAppData = async () => {
  let res = await getApp();
  res.data.forEach((element) => {
    element.icon = app1;
  });
  appsList.value = res.data;
};
const goToMenu = (item) => {
  router.push(item.route);
};
onMounted(() => {
  getAppData();
});
</script>

<style scoped lang="scss">
// @import './index.scss';
:deep(.kr-card__body) {
  .apps {
    cursor: pointer;
  }
  .app-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 64px;
    height: 64px;
    font-size: 32px;
    color: #ffffff;
    background: url('@/assets/images/home/usageBg.png') no-repeat;
  }
}
</style>
