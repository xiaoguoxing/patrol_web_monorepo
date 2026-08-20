<template>
  <kr-card :header="$t('worktop.title6')" :border="false">
    <template #headerRight>
      <div class="bolck" style="width: 230px">
        <el-date-picker
          v-model="dateValue"
          type="daterange"
          :start-placeholder="$t('input.sTime')"
          :end-placeholder="$t('input.eTime')"
          format="YYYY-MM-DD"
          value-format="YYYY-MM-DD"
          @change="initData"
        />
      </div>
    </template>
    <chart id="task-echart" :loading="loading" :echartOption="energyChartOption"></chart>
  </kr-card>
</template>

<script setup name="task">
import { ref, onMounted } from 'vue';
import chart from '../components/chart.vue';

import ChartsConfig from '../config/chart.js';
import { getTaskStatistics } from '@/api/modules/workstand';
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
let energyChartOption = ref({});
let loading = ref(true);

const handleTime = (num) => {
  const now = new Date();
  now.setDate(now.getDate() - num);
  let year = now.getFullYear();
  let month = now.getMonth() + 1 < 10 ? '0' + (now.getMonth() + 1) : now.getMonth() + 1;
  let day = now.getDate() < 10 ? '0' + now.getDate() : now.getDate();
  let date = year + '-' + month + '-' + day;
  return date;
};
let dateValue = ref([handleTime(14), handleTime(0)]);

const initData = async () => {
  let res = await getTaskStatistics({ startTime: dateValue.value[0], endTime: dateValue.value[1] });
  loading.value = false;

  let yData = [];
  let xData = [];
  for (let i in res.data) {
    let data = [];
    xData = [];
    res.data[i].forEach((element) => {
      data.push(element.value);
      xData.push(element.time);
    });
    let obj = {
      name: i,
      data: data,
    };
    yData.push(obj);
  }
  energyChartOption.value = ChartsConfig.lineOptions(xData, t('echarts.unit'), yData);
};

onMounted(() => {
  initData();
});
</script>
<style scoped lang="scss">
// @import './index.scss';
</style>
