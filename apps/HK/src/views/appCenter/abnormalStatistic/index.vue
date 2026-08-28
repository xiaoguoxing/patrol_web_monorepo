<template>
  <div class="content">
    <div class="top">
      <div class="t-top">
        <div class="buttons">
          <div>
            <my-tabs v-model="tabValue" :options="timeOptions" @change="timeChange"></my-tabs>
          </div>
          <div class="date-picker" v-if="tabValue == 3">
            <el-date-picker
              v-model="timesArr"
              type="datetimerange"
              :range-separator="$t('input.rangeSeparator')"
              :start-placeholder="$t('input.sTime')"
              :end-placeholder="$t('input.eTime')"
              format="YYYY-MM-DD HH:mm"
              value-format="YYYY-MM-DD HH:mm"
              date-format="YYYY-MM-DD ddd"
              time-format="HH:mm"
              @change="dateChange"
              :disabled-date="disabledDate"
              @calendar-change="handleCalendarChange"
            />
          </div>
        </div>
        <div class="cards" v-if="false">
          <div class="card" v-for="(item, index) in wainingInfo" :key="index">
            <img :src="icon1" />
            <div class="card-content">
              <div class="card-title">{{ item.name }}</div>
              <div class="card-bottom">
                <span class="card-nums">{{ item.nums }}</span>
                <span class="card-circle"
                  ><span>环比:</span>
                  <template v-if="item.circle">
                    <span>{{ item.circle }}%</span>
                    <el-icon class="upIcon" v-if="item.up"> <svg-icon :prefix="''" :name="upSvg"></svg-icon></el-icon>
                    <el-icon class="downIcon" v-if="!item.up">
                      <svg-icon :prefix="''" :name="downSvg"></svg-icon
                    ></el-icon>
                  </template>
                  <template v-else> - </template></span
                >
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="t-bottom">
        <!--        <div class="bottom-left">-->
        <kr-card :header="$t('alarm.alarmObjectName')" :border="false" class="h100 w100">
          <template #headerRight>
            <el-input
              clearable
              @clear="searchCardData"
              v-model="tableText"
              style="width: 360px"
              @keydown.enter="searchCardData"
              class="input-with-select"
            >
              <template #prepend>
                <el-select class="input-prepend-select" v-model="selectProp" style="width: 150px">
                  <el-option :label="$t('aiInspection.areaName')" value="areaName" />
                  <el-option :label="$t('aiInspection.objectName')" value="objectName" />
                </el-select>
              </template>
              <template #suffix>
                <el-icon @click="searchCardData" style="cursor: pointer"><Search /></el-icon>
              </template>
            </el-input>
          </template>
          <kr-pro-table
            ref="proTable"
            :columns="columns"
            :requestApi="getTableList"
            selectId="id"
            title="预置位配置"
            titleBorder
            :outBorder="false"
            :pagination="false"
          ></kr-pro-table>
        </kr-card>
        <!--        </div>-->
        <!--        <div class="bottom-right">
          <kr-card header="异常原因分布" :border="false" class="h100 w100">
            <div class="alarm-content" v-if="!loading1">
              <chart
                class="alarm-chart"
                id="alarm-echart1"
                :loading="loading1"
                :echartOption="energyChartOption1"
              ></chart>
              <div class="alarm-span">
                <span class="span" v-for="(item, index) of rightData" :key="index">
                  <span class="span-before" :style="'background-color:' + item.color"> </span>{{ item.name }}
                  {{ item.data }}条
                </span>
              </div>
            </div>
          </kr-card>
        </div>-->
      </div>
    </div>
    <div class="bottom">
      <my-tabs class="b-title" v-model="tabValue1" :options="timeOptions1" @change="timeChange1"></my-tabs>
      <div class="b-bottom">
        <!--        <div class="b-left">-->
        <kr-card header="" :border="false" class="h100 w100">
          <chart id="alarm-echart2" :loading="loading2" :echartOption="energyChartOption2"></chart
        ></kr-card>
        <!--        </div>-->
        <!--        <div class="b-right">
          <kr-card header="" :border="false" class="h100 w100">
            <chart id="alarm-echart3" :loading="loading3" :echartOption="energyChartOption3"></chart>
          </kr-card>
        </div>-->
      </div>
    </div>
  </div>
</template>
<script setup lang="tsx">
import { ref, onMounted, computed } from 'vue';
import icon1 from '@/assets/images/statistic/icon1.png';
import myTabs from '@/components/Tabs/index.vue';
import chart from '@/views/home/components/chart.vue';
import { MonitorItem, Tabs } from '@/api/modules/appCenter/inspectionMonitor/watchingMonitor';
import { ColumnProps } from '@patrol/ui';
import * as ChartsConfig from '@/views/appCenter/statistic/config/chart.js';
import { getListApi, getChartApi } from '@/api/modules/appCenter/statistic/abnormalStatistic';

import SvgIcon from '@/components/SvgIcon/index.vue';
import { getDict, DefaultDict } from '@/utils/serviceDict';
import { isJSON } from '@patrol/shared/utils/is';
import { Search } from '@element-plus/icons-vue';
// const ChartsConfig = createRequire('@/views/appCenter/statistic/config/chart.js');
// const ChartsConfig = require('@/views/appCenter/statistic/config/chart.js');
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
const levelDictList = (await getDict('alarm_level')) as DefaultDict;
const timeOptions = computed<Tabs[]>(() => [
  { label: t('common.today'), value: 0 },
  { label: t('common.week'), value: 1 },
  { label: t('common.month'), value: 2 },
  { label: t('common.custom'), value: 3 },
]);
const options = [
  { data: 'today', value: 0 },
  { data: 'week', value: 1 },
  { data: 'month', value: 2 },
  { data: 'custom', value: 3 },
];
const upSvg = ref('icon-a-6zengchang');
const downSvg = ref('icon-a-7xiadie');
// today - 今天
// week - 近一周
// month - 近一月
// custom - 自定义
const timeOptions1 = computed<Tabs[]>(() => [
  { label: t('common.week'), value: 1 },
  { label: t('common.month'), value: 2 },
]);
const wainingInfo = ref([
  { name: t('statistic.wainingInfo1'), nums: 0, circle: 0, up: true },
  { name: t('statistic.wainingInfo2'), nums: 0, circle: 0, up: true },
  { name: t('statistic.wainingInfo3'), nums: 0, circle: 0, up: true },
  { name: t('statistic.wainingInfo4'), nums: 0, circle: 0, up: true },
  { name: t('statistic.wainingInfo5'), nums: 0, circle: 0, up: true },
]);
interface levelObj {
  name: String;
  data: number;
  color: string;
}
let yData1 = ref([] as levelObj[]);

interface Arrobj {
  index: number;
  alarmItemNum: number;
  areaName: string;
  objectName: string;
}
let tabValue = ref(0);
let tabValue1 = ref(1);

let searchParams = ref({
  dimension: 'today',
  startDate: '',
  endDate: '',
});
const now = new Date();

const year = now.getFullYear();
const month = ('0' + (now.getMonth() + 1)).slice(-2);
const day = ('0' + now.getDate()).slice(-2);
const date = year + '-' + month + '-' + day + ' ';
let timesArr = ref([date + '00:00', date + '23:59']);
let searchParams1 = ref({
  dimension: 'week',
});

const proTable = ref();

// 表格配置项
const columns = computed<ColumnProps[]>(() => [
  // { type: 'selection', label: '序号', width: 50 },
  {
    prop: 'index',
    label: t('statistic.sort'),
    width: 80,
    render: (scope) => {
      let value = scope.row.rank > 9 ? scope.row.rank : '0' + scope.row.rank.toString();
      let str =
        'height:25px;width:25px;border-radius:12.5px;background:#0D60B4;color:#fff;display:flex;align-items:center;justify-content: center;';
      let str1 = str + 'background:#999999;';
      if (scope.row.rank < 4) {
        return <div style={str}> {value} </div>;
      } else return <div style={str1}> {value} </div>;
    },
  },
  { prop: 'areaName', label: t('aiInspection.areaName') },
  { prop: 'objectName', label: t('aiInspection.objectName') },
  { prop: 'abnormalCount', label: t('aiInspection.abnormalNum') },
  {
    prop: 'alarmItemNum',
    label: t('statistic.alarmItemNum'),
    minWidth: 200,
    render: (scope) => {
      const opt = [
        { text: t('statistic.alarmItemNum1'), value: '' },
        { text: t('statistic.alarmItemNum2'), value: '' },
        { text: t('statistic.alarmItemNum3'), value: '' },
        { text: t('statistic.alarmItemNum4'), value: '' },
      ];
      return (
        <div style={'display:inline-flex;gap:10px'}>
          {scope.row.reasonList.map((item, index) => (
            <div>
              {item.reason}：{t('statistic.item', { num: item.count || 123 })}
            </div>
          ))}
        </div>
      );
    },
  },
]);
const selectProp = ref('areaName');
const tableText = ref('');
let energyChartOption1 = ref({});
let energyChartOption2 = ref({});
let energyChartOption3 = ref({});
let rightData = ref([] as any[]);
let loading1 = ref(true);
let loading2 = ref(true);
let loading3 = ref(true);
const initData = async () => {
  loading2.value = true;
  loading3.value = true;
  let newParams = {
    ...searchParams1.value,
    [selectProp.value]: tableText.value,
  };
  // delete newParams.startDate
  // let data = await getChartApi(newParams);
  getChartApi(newParams).then((res) => {
    let data = res.data;
    //告警趋势
    let yData2: any = [
      { name: t('common.month1'), data: [], color: '#FA802F', dates: [] },
      // { name: '上月', data: [], color: '#0D60B4', dates: [] },
    ];
    if (searchParams1.value.dimension == 'week') {
      yData2[0].name = t('common.week1');
      // yData2[1].name = '上周';
    }
    let xData2: string[] = [];
    data.trend.forEach(
      (element: { count: number; last: number; date: string; currentDate: string; fullDate: string }) => {
        yData2[0].data.push(element.count);
        // yData2[1].data.push(element.last);

        yData2[0].dates.push({
          currentDate: element.date,
          lastDate: element.fullDate,
        });
        // yData2[1].dates.push({
        //   currentDate: element.currentDate,
        //   lastDate: element.lastDate,
        // });
        xData2.push(element.date);
      }
    );
    energyChartOption2.value = ChartsConfig.default.lineOptions(xData2, '', yData2, t('statistic.qstj'));
    //告警状态
    /*
    let yData3: any = [
      { name: '告警中', data: [], color: '#0D60B4' },
      { name: '已消警', data: [], color: '#cccccc' },
    ];
    // let dataTmp: any = [];
    let xData3: string[] = [];
    data.status.forEach((element: { in_alert: number; alert_lifted: number; date: string }) => {
      yData3[0].data.push(element.in_alert);
      yData3[1].data.push(element.alert_lifted);
      xData3.push(element.date);
    });
    // yData3[0].data = [...dataTmp];
    energyChartOption3.value = ChartsConfig.default.cotegoryStackOptions(xData3, '', yData3, '告警状态统计');*/
    loading2.value = false;
    loading3.value = false;
  });
};
// 获取表格数据
const getTableList = (params: any) => {
  loading1.value = true;
  let newParams = { ...searchParams.value, [selectProp.value]: tableText.value };
  return new Promise(async (resolve) => {
    getListApi(newParams).then((res) => {
      loading1.value = false;
      resolve({
        data: res.data,
      });
    });
  });
};
function dateChange() {
  pickDay.value = null;
  timeChange({ label: t('common.custom'), value: 3 });
}
function timeChange(nums: { value: number; label: string }) {
  if (nums) tabValue.value = nums.value;
  let dimension = options.find((item) => {
    return item.value == tabValue.value;
  });
  searchParams.value.dimension = dimension?.data || '';
  if (tabValue.value == 3) {
    searchParams.value.dimension = '';
    searchParams.value.startDate = timesArr.value[0];
    searchParams.value.endDate = timesArr.value[1];
  } else {
    searchParams.value.startDate = '';
    searchParams.value.endDate = '';
  }
  proTable.value.getTableList();
}
function timeChange1(nums: any) {
  tabValue1.value = nums.value;
  let dimension = options.find((item) => {
    return item.value == tabValue1.value;
  });
  searchParams1.value.dimension = dimension?.data || '';
  initData();
}

const searchCardData = () => {
  proTable.value.getTableList();
  initData();
};
onMounted(() => {
  initData();
});

// 核心：存储用户点击的第一个日期
const pickDay = ref<Date | null>(null);
// 动态判断日期是否需要禁用
const disabledDate = (time: Date) => {
  // 如果用户还没有点击第一个日期，允许选择所有未来/过去的日期（或结合业务增加其他限制）
  if (!pickDay.value) {
    return false;
  }

  // 这里的 1 个月按固定的 30 天计算，也可以用 dayjs 精确计算自然月
  const oneMonthTime = 30 * 24 * 3600 * 1000;

  // 计算当前点击日期的可选时间轴边界
  const minTime = pickDay.value.getTime() - oneMonthTime;
  const maxTime = pickDay.value.getTime() + oneMonthTime;

  // 禁用超出首选日期前后 30 天的格子
  return time.getTime() < minTime || time.getTime() > maxTime;
};
// 选中第一个日期时触发
const handleCalendarChange = (dates: [Date, Date]) => {
  // dates 是一个数组，选第一个时长度为 1，选第二个时长度为 2
  const [start, end] = dates;
  if (start && !end) {
    // 记录下第一个选中的日期
    pickDay.value = start;
  } else {
    // 两个都选完了，释放限制
    pickDay.value = null;
  }
};
</script>

<style scoped lang="scss">
@use './index.scss';
</style>
