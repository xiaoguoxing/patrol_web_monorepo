<template>
  <div class="home">
    <div class="home-welcome">
      <span>Hi，{{ authStore.userInfo.userName }}，欢迎您！</span>
      <!-- 暂时隐藏切换租户功能,TODO: 放开-->
      <!--  <el-select
        :model-value="groupValue"
        placeholder="Select"
        style="float: right; width: 120px; margin-top: 14px"
        @change="ChangeCurrDs"
      >
        <el-option v-for="item in groupOptions" :key="item.appMark" :label="item.appName" :value="item.appMark" />
      </el-select> -->
    </div>
    <div class="home-box">
      <div class="flex-left">
        <div class="flex-top">
          <div class="grid">
            <kr-card header="巡检设备总览" :border="false" class="card-equipment">
              <div class="equipment" v-for="(item, index) in equipmentList" :key="index" @click="goPath(item)">
                <p class="equip-title">{{ item.name }}</p>
                <div class="equip-num">
                  <img :src="item.icon" alt="" />
                  <div class="equip-item">
                    <p class="value-online">{{ item.online }}</p>
                    <p class="label value-label">在线数</p>
                  </div>
                  <div class="equip-item1">
                    <p class="value">{{ item.total }}</p>
                    <p class="label">总数</p>
                  </div>
                  <div class="equip-item1" v-if="item.menuName === 'cameraMng'">
                    <p class="value" style="color: #ea3939">{{ item.total - item.online }}</p>
                    <p class="label">离线数</p>
                  </div>
                </div>
              </div>
            </kr-card>
            <common :title="'异常概述'" :dataList="linkList2" class="card-linkage" @itemClick="goPath" />
            <common :title="'消息推送概况'" :dataList="linkList3" class="card-linkage" @itemClick="goPath" />
          </div>
          <div class="left-bottom">
            <common :title="'告警概况'" :dataList="alarmList" class="card-alarm" @itemClick="goPath" />
            <common :title="'智能联动概况'" :dataList="linkList" class="card-linkage" @itemClick="goPath" />
          </div>
        </div>
        <taskItems class="flex-bottom" />
      </div>
      <div class="flex-right">
        <apps class="flex-top" />
        <message class="flex-bottom" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import apps from './components/apps.vue';
import message from './components/message.vue';
import task from './components/task.vue';
import taskItems from './components/taskItems.vue';
import common from './components/common.vue';
import { AuthStore } from '@/stores/modules/auth';
import { GlobalStore } from '@/stores';
import { useRouter } from 'vue-router';
const router = useRouter();
import video1 from '@/assets/images/home/video1.png';
import video2 from '@/assets/images/home/video2.png';
import video3 from '@/assets/images/home/video3.png';
import icon1 from '@/assets/images/home/icon1.png';
import icon2 from '@/assets/images/home/icon2.png';
import icon3 from '@/assets/images/home/icon3.png';
import icon4 from '@/assets/images/home/icon4.png';
import {
  getStatistics,
  getAlarmStatistics,
  getlinkageStatistics,
  getTodayCount,
  getTodayXXTSCount,
} from '@/api/modules/workstand';
defineOptions({ name: 'home' });
const authStore = AuthStore();
const globalStore = GlobalStore();

const groupOptions = authStore.tenantList;
const groupValue = ref(globalStore.currDs);
const ChangeCurrDs = (val) => {
  globalStore.setCurrDs(val);
  groupValue.value = val;
};
const equipmentList = ref([
  {
    name: '摄像头',
    online: 0,
    total: 0,
    icon: video1,
    menuName: 'cameraMng',
  },
  {
    name: '传感器',
    online: 0,
    total: 0,
    icon: video2,
    menuName: 'sensorMng',
  },
  {
    name: '轨道机器人',
    online: 0,
    total: 0,
    icon: video3,
    menuName: 'trackMng',
  },
]);
const alarmList = ref([
  {
    name: '今日报警数 (条)',
    value: 0,
    icon: icon1,
    color: '#EA3939',
    menuName: 'appCenterAlarm',
    fromRoute: '1',
  },
  {
    name: '巡检项总数 (项)	',
    value: 0,
    icon: icon2,
    color: '#0D60B4',
    menuName: 'inspection',
  },
]);
const linkList = ref([
  {
    name: '今日联动告警数 (条)',
    value: 0,
    icon: icon3,
    color: '#FA802F',
    menuName: 'appCenterAlarm',
    fromRoute: '2',
  },
  {
    name: '联动巡检点位数 (项)',
    value: 0,
    icon: icon4,
    color: '#0D60B4',
    menuName: 'linkageSet',
  },
]);
const linkList2 = ref([
  {
    name: '今日异常项 (条)',
    value: 0,
    icon: icon3,
    color: '#FA802F',
    menuName: 'abnormal',
    fromRoute: '1',
  },
]);
const linkList3 = ref([
  {
    name: '今日推送告警数',
    value: 0,
    icon: icon3,
    color: '#FA802F',
    menuName: 'appCenterAlarm',
    fromRoute: '3',
  },
]);
const initAll = () => {
  getStatisticsData();
  getAlarmData();
  getlinkageData();
  getTodayCountNum();
  getTodayXXTSCountNum();
};
const getStatisticsData = async () => {
  try {
    let res = await getStatistics();
    equipmentList.value[0] = Object.assign(equipmentList.value[0], res.data.camera);
    equipmentList.value[1] = Object.assign(equipmentList.value[1], res.data.sensor);
    equipmentList.value[2] = Object.assign(equipmentList.value[2], res.data.track);
  } catch (e) {}
};
const getAlarmData = async () => {
  try {
    let res = await getAlarmStatistics();
    alarmList.value[0].value = res.data.alarmCount;
    alarmList.value[1].value = res.data.itemCount;
  } catch (e) {}
};
const getlinkageData = async () => {
  try {
    let res = await getlinkageStatistics();
    linkList.value[0].value = res.data.linkageAlarmCount;
    linkList.value[1].value = res.data.linkageItemCount;
  } catch (e) {}
};
const getTodayCountNum = async () => {
  try {
    let res = await getTodayCount();
    linkList2.value[0].value = res.data ?? 0;
  } catch (e) {}
};
const getTodayXXTSCountNum = async () => {
  try {
    let res = await getTodayXXTSCount();
    linkList3.value[0].value = res.data ?? 0;
  } catch (e) {}
};
onMounted(() => {
  initAll();
});
function goPath(item) {
  if (!item.menuName) return;
  let pathData = authStore.flatMenuListGet.find((i) => i.name === item.menuName);
  if (pathData.path) router.replace({ path: pathData.path, query: { fromRoute: item.fromRoute } });
}
</script>

<style scoped lang="scss">
@use './index.scss';
</style>
