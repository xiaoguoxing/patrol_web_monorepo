<template>
  <div class="content">
    <div class="top">
      <div class="t-top">
        <div class="buttons">
          <my-tabs v-model="tabValue" :options="timeOptions" @change="timeChange"></my-tabs>
          <div class="date-picker" v-if="tabValue == 3">
            <el-date-picker
              v-model="timesArr"
              type="datetimerange"
              range-separator="到"
              start-placeholder="开始时间"
              end-placeholder="结束时间"
              format="YYYY-MM-DD HH:mm"
              value-format="YYYY-MM-DD HH:mm"
              date-format="YYYY-MM-DD ddd"
              time-format="HH:mm"
              @change="dateChange"
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
        <div class="bottom-left">
          <kr-card header="告警对象" :border="false" class="h100 w100">
            <template #headerRight>
              <el-input
                clearable
                @clear="searchCardData"
                v-model="tableText"
                style="width: 340px"
                @keydown.enter="searchCardData"
                class="input-with-select"
              >
                <template #prepend>
                  <el-select class="input-prepend-select" v-model="selectProp" style="width: 100px">
                    <el-option label="告警区域" value="areaName" />
                    <el-option label="告警对象" value="objectName" />
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
        </div>
        <div class="bottom-right">
          <kr-card header="告警等级" :border="false" class="h100 w100">
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
        </div>
      </div>
    </div>
    <div class="bottom">
      <my-tabs class="b-title" v-model="tabValue1" :options="timeOptions1" @change="timeChange1"></my-tabs>
      <div class="b-bottom">
        <div class="b-left">
          <kr-card header="" :border="false" class="h100 w100">
            <chart id="alarm-echart2" :loading="loading2" :echartOption="energyChartOption2"></chart
          ></kr-card>
        </div>
        <div class="b-right">
          <kr-card header="" :border="false" class="h100 w100">
            <chart id="alarm-echart3" :loading="loading3" :echartOption="energyChartOption3"></chart>
          </kr-card>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="tsx">
import { ref, onMounted } from 'vue';
import icon1 from '@/assets/images/statistic/icon1.png';
import myTabs from '@/components/Tabs/index.vue';
import chart from '@/views/home/components/chart.vue';
import { MonitorItem, Tabs } from '@/api/modules/appCenter/inspectionMonitor/watchingMonitor';
import { ColumnProps } from '@/components/znxj-components/znxj-ui';
import * as ChartsConfig from '@/views/appCenter/statistic/config/chart.js';
import { getListApi, getChartApi } from '@/api/modules/appCenter/statistic';

import SvgIcon from '@/components/SvgIcon/index.vue';
import { getDict, DefaultDict } from '@/utils/serviceDict';
import { isJSON } from '@/utils/is';
import { Search } from '@element-plus/icons-vue';
// const ChartsConfig = createRequire('@/views/appCenter/statistic/config/chart.js');
// const ChartsConfig = require('@/views/appCenter/statistic/config/chart.js');

const levelDictList = (await getDict('alarm_level')) as DefaultDict;
const timeOptions: Tabs[] = [
  { label: '今天', value: 0 },
  { label: '近一周', value: 1 },
  { label: '近一月', value: 2 },
  { label: '自定义', value: 3 },
];
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
const timeOptions1: Tabs[] = [
  { label: '近一周', value: 1 },
  { label: '近一月', value: 2 },
];
const wainingInfo = ref([
  { name: '告警条数（条）', nums: 0, circle: 0, up: true },
  { name: '设备安全隐患告警（条）', nums: 0, circle: 0, up: true },
  { name: '设备状态异常告警（条）', nums: 0, circle: 0, up: true },
  { name: '环境风险异常告警（条）', nums: 0, circle: 0, up: true },
  { name: '人员行为异常告警（条）', nums: 0, circle: 0, up: true },
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
  startTime: '',
  endTime: '',
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
const columns: ColumnProps[] = [
  // { type: 'selection', label: '序号', width: 50 },
  {
    prop: 'index',
    label: '排名',
    width: 100,
    render: (scope) => {
      let value = scope.row.index > 9 ? scope.row.index : '0' + scope.row.index.toString();
      let str =
        'height:25px;width:25px;border-radius:12.5px;background:#0D60B4;color:#fff;display:flex;align-items:center;justify-content: center;';
      let str1 = str + 'background:#999999;';
      if (scope.row.index < 4) {
        return <div style={str}> {value} </div>;
      } else return <div style={str1}> {value} </div>;
    },
  },
  { prop: 'areaName', label: '告警区域' },
  { prop: 'objectName', label: '告警对象名称' },
  { prop: 'alarmItemNum', label: '告警项数量' },
];
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
  let newParams = { ...searchParams1.value, [selectProp.value]: tableText.value };
  // delete newParams.startTime
  // let data = await getChartApi(newParams);
  getChartApi(newParams).then((res) => {
    let data = res.data;
    //告警趋势
    let yData2: any = [
      { name: '本月', data: [], color: '#FA802F', dates: [] },
      { name: '上月', data: [], color: '#0D60B4', dates: [] },
    ];
    if (searchParams1.value.dimension == 'week') {
      yData2[0].name = '本周';
      yData2[1].name = '上周';
    }
    let xData2: string[] = [];
    data.trend.forEach(
      (element: { current: number; last: number; date: string; currentDate: string; lastDate: string }) => {
        yData2[0].data.push(element.current);
        yData2[1].data.push(element.last);

        yData2[0].dates.push({
          currentDate: element.currentDate,
          lastDate: element.lastDate,
        });
        yData2[1].dates.push({
          currentDate: element.currentDate,
          lastDate: element.lastDate,
        });
        xData2.push(element.date);
      }
    );
    energyChartOption2.value = ChartsConfig.default.lineOptions(xData2, '', yData2, '告警趋势统计');
    //告警状态

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
    energyChartOption3.value = ChartsConfig.default.cotegoryStackOptions(xData3, '', yData3, '告警状态统计');
    loading2.value = false;
    loading3.value = false;
  });
};
// 获取表格数据
const getTableList = (params: any) => {
  loading1.value = true;
  let newParams = { ...searchParams.value, [selectProp.value]: tableText.value };
  return new Promise(async (resolve) => {
    let resultData: Arrobj[] = [];
    getListApi(newParams).then((res) => {
      loading1.value = false;
      if (res.data) {
        //告警预览
        if (res.data.alarmType.length) {
          res.data.alarmType.forEach((item: { name: ''; chainRatio: ''; alarmNum: number }, index: number) => {
            let circle = Number(item.chainRatio);
            let up = false;
            if (isNaN(circle)) {
              circle = 0;
            } else if (circle > 0) {
              up = true;
            }
            wainingInfo.value[index].nums = item.alarmNum;
            wainingInfo.value[index].circle = circle;
            wainingInfo.value[index].up = up;
            wainingInfo.value[index].name = item.name;
          });
        }
        yData1.value = [];
        //告警等级
        if (levelDictList.length) {
          levelDictList.forEach((item, index) => {
            let objTmp: levelObj = {
              name: item.label,
              data: res.data.alarmLevel[item.value],
              color: '',
            };
            if (isJSON(item.remark) && JSON.parse(item.remark)) {
              let remark = JSON.parse(item.remark);
              objTmp.color = remark.numsColor;
            }
            yData1.value.push(objTmp);
          });
          let title1 = yData1.value.reduce((acc, cur) => acc + cur.data, 0);
          rightData.value = yData1.value;
          energyChartOption1.value = ChartsConfig.default.pieOptions('总数', title1 + '条', yData1.value);
        }
        //告警对象
        if (res.data.alarmObject) {
          resultData = res.data.alarmObject.map((item: Arrobj, index: number) => {
            item.index = index + 1;
            return item;
          });
        }
        resolve({
          data: resultData,
          //  {
          //   datalist: resultData,
          //   total: resultData.length,
          //   pageNum: 1,
          //   pageSize: 10,
          // },
        });
      }
    });
  });
};
function dateChange() {
  timeChange({ label: '自定义', value: 3 });
}
function timeChange(nums: { value: number; label: string }) {
  if (nums) tabValue.value = nums.value;
  let dimension = options.find((item) => {
    return item.value == tabValue.value;
  });
  searchParams.value.dimension = dimension?.data || '';
  if (tabValue.value == 3) {
    searchParams.value.startTime = timesArr.value[0];
    searchParams.value.endTime = timesArr.value[1];
  } else {
    searchParams.value.startTime = '';
    searchParams.value.endTime = '';
  }
  proTable.value.getTableList();
} // funciton 方法名():返回值类型 {}
function timeChange1(nums: any) {
  tabValue1.value = nums.value;
  let dimension = options.find((item) => {
    return item.value == tabValue1.value;
  });
  searchParams1.value.dimension = dimension?.data || '';
  initData();
} // funciton 方法名():返回值类型 {}
function getMessageDetail() {}

const searchCardData = () => {
  proTable.value.getTableList();
  initData();
};

onMounted(() => {
  initData();
});
</script>

<style scoped lang="scss">
@use './index.scss';
</style>
