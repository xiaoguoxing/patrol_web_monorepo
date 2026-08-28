<template>
  <kr-card :header="cardTitle" class="flex-1" header-border>
    <template #header>
      <div class="header-left">
        <span class="title kr-font-medium mr30">{{ cardTitle }}</span>
        <div class="header-button">
          <div class="pre" @click="change('pre')">
            <el-icon><ArrowLeft /></el-icon>
          </div>
          <div>{{ year + ' - ' + formatNum(month) }}</div>
          <!--          <div>{{ year + $t('common.year') + formatNum(month) + $t('common.month3') }}</div>-->
          <div class="next" @click="change('next')">
            <el-icon><ArrowRight /></el-icon>
          </div>
          <div class="back-today" :class="{ disable: isToToday }" @click="isToToday ? null : backToday()">
            {{ $t('buttonName.back') }}{{ $t('common.month1') }}
          </div>
          <div class="back-today" @click="goSys()">{{ $t('header.goFrom') }}{{ sysName }}</div>
        </div>
      </div>
      <div class="header-right">
        <span class="ectant-status"
          ><span class="icon"></span><span class="text">{{ $t('task.status1') }}</span></span
        >
        <span class="excution-status">
          <span class="icon"></span>
          <span class="text">{{ $t('task.status2') }} <img :src="icon1" /></span>
        </span>
        <span class="finished-status">
          <span class="icon"></span><span class="text">{{ $t('task.status3') }}</span>
        </span>
      </div>
    </template>
    <my-calendar ref="calendar" :dateList="dateList" @changeYearMonth="initData"></my-calendar>
  </kr-card>
</template>
<script setup lang="ts">
import { computed, ComputedRef, ref } from 'vue';
import KrCard from '@patrol/ui/components/card';
import myCalendar from './components/calendar.vue';
import icon1 from '@/assets/images/schedule/doing.png';
import { getListApi } from '@/api/modules/appCenter/task/schedule';
import { formatNum, getToday } from './components/hooks';
import { GlobalStore } from '@/stores';
import { PageTypeTitle } from '@/api/modules/appCenter/alarm';
import { useRoute } from 'vue-router';
const globalStore = GlobalStore();
const route = useRoute();
let cardTitle: ComputedRef<any> = computed(() => route.meta?.title!);
const node_env = import.meta.env.VITE_USER_NODE_ENV;
const year = ref(0);
const month = ref(0);
const calendar = ref();
const dateList = ref({});
let isToToday = computed(() => {
  let date = getToday();
  return year.value === date.year && month.value === date.month;
});
function initData(data: any) {
  dateList.value = {};
  year.value = data.year;
  month.value = data.month;
  getListApi({ time: year.value + '-' + month.value }).then((res) => {
    dateList.value = res.data;
  });
}
function change(type: string) {
  calendar.value.changeMonth(type, { year: year.value, month: month.value });
}
function backToday() {
  calendar.value.backToday();
}
const sysName = computed(() => import.meta.env.VITE_SYS_NAME);
function goSys() {
  let baseUrl = import.meta.env.VITE_SYS_URL;
  window.open(
    `${baseUrl}/#/patrolInspection/appCenter/appCenterTask/taskSchedule?token=${globalStore.token}`,
    '_blank'
  );
}
</script>
<style scoped lang="scss">
.header-left {
  display: flex;
  .header-button {
    display: flex;
    align-items: center;
    font-size: 14px;

    // margin-right: 20px;
    .pre,
    .next {
      display: flex;
      flex-wrap: wrap;
      align-content: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      margin: 0 12px;
      color: #666666;
      cursor: pointer;
      background: #efefef;
    }
    .pre:hover,
    .next:hover,
    .pre:active,
    .next:active {
      color: #0d60b4;
      background: #dfeffd;
    }
    .back-today {
      padding: 2px 4px;
      margin-left: 8px;
      color: #666666;
      cursor: pointer;
      border: 1px solid #b2b2b2;
      border-radius: 4px;
      &.disable {
        cursor: not-allowed;
        opacity: 0.5;
      }
    }
    .back-today:hover,
    .back-today:active {
      color: #0d60b4;

      // background: #dfeffd;
      border: 1px solid #0d60b4;
    }
  }
}
.header-right {
  display: flex;
  gap: 8px;
  font-size: 12px;
  .text {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 28px;
    padding-inline: 5px;
  }
  .ectant-status {
    display: flex;
    color: #666666;
    background: #dfeffd;
    .icon {
      display: inline-block;
      width: 2px;
      height: 28px;
      background: #0d60b4;
    }
  }
  .excution-status {
    display: flex;
    color: #0d60b4;
    background: #dfeffd;
    .icon {
      display: inline-block;
      width: 2px;
      height: 28px;
      background: #0d60b4;
    }
    img {
      width: 15px;
      height: 15px;
      margin-left: 5px;
    }
  }
  .finished-status {
    display: flex;
    color: #666666;
    background: #efefef;
    .icon {
      display: inline-block;
      width: 2px;
      height: 28px;
      background: #cccccc;
    }
  }
}
</style>
