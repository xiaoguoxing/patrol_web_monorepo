<template>
  <div class="calendar-wrapper">
    <div class="week">
      <div class="week-day" v-for="(item, index) in weekDay" :key="index">{{ item }}</div>
    </div>
    <div class="content">
      <el-scrollbar view-class="days">
        <div class="day" :class="{ nolm: !item.isCurM }" v-for="(item, index) in dates" :key="index">
          <div class="day-num kr-font-medium">{{ Number(item.date) }}</div>
          <div class="day-infos" v-if="item.nums">
            <template v-for="(item1, index1) in dateList[Number(item.date)]" :key="index1">
              <taskInfoPopover
                class="content-info"
                v-if="index1 < 3"
                :ref="(el:any)=>el?itemDateListRef[index+'_'+index1] = el:''"
                @click="showItemDate(item1, index + '_' + index1)"
                :inspection-task-name="item1.inspectionTaskName"
                :task-status="item1.taskStatus"
                :isFocus="itemDate === item1"
              ></taskInfoPopover>
            </template>
          </div>
          <div class="day-more" v-if="item.isCurM && item.nums > 3" @click="showDateAll(item, index)">
            <span>还有{{ item.nums - 3 }}项任务</span>
            <el-icon class="more-icon" :ref="(el:any) => el?(dayMoreAllRef[index] = el):''"><ArrowDown /></el-icon>
          </div>
          <div class="day-none" v-if="!item.isCurM || !item.nums">暂无任务</div>
          <div class="day-more" v-if="!item.isCurM || item.nums <= 3"></div>
        </div>
      </el-scrollbar>
    </div>
    <el-popover
      placement="right-start"
      ref="popoverRef"
      :virtual-ref="dayMoreRef"
      popper-class="calendar-popover-other"
      :visible="showAllDateList"
      virtual-triggering
      :width="200"
      trigger="click"
      :teleported="false"
      :show-arrow="false"
    >
      <template #default>
        <div class="list-all" v-click-outside="hideDateAll">
          <div class="list-title">全部任务</div>
          <div class="list-content">
            <template v-for="(item1, index1) in dateList[Number(dataAll)]" :key="index1">
              <taskInfoPopover
                class="content-info"
                v-if="index1 > 2"
                :ref="(el:any)=>itemDateListRef[moreIndex+'_'+index1] = el"
                @click="showItemDate(item1, moreIndex + '_' + index1)"
                :inspection-task-name="item1.inspectionTaskName"
                :task-status="item1.taskStatus"
                :isFocus="itemDate === item1"
              ></taskInfoPopover>
            </template>
          </div>
        </div>
      </template>
    </el-popover>
    <el-popover
      ref="taskPopover"
      popper-class="calendar-popover"
      placement="right-start"
      trigger="click"
      :width="300"
      :show-arrow="false"
      :teleported="false"
      :visible="showItemDateList"
      @hide="itemDate = {}"
      virtual-triggering
      :show-after="500"
      :hide-after="500"
      :virtual-ref="itemDateRef"
    >
      <template #default>
        <taskItemInfo
          class="detail-div"
          id="popover1"
          @gotoOther="gotoOther"
          v-click-outside="hideDateItem"
          :item-date="itemDate"
        ></taskItemInfo>
      </template>
    </el-popover>
  </div>
</template>
<script lang="ts" setup>
import { formatNum, getToday } from './hooks';
import { computed, onBeforeMount, ref, watch } from 'vue';
import { getItemDetailApi, TaskDetail, TaskList } from '@/api/modules/appCenter/task/schedule';
import { useRouter } from 'vue-router';
import { ClickOutside as vClickOutside } from 'element-plus';
import taskInfoPopover from './taskPopover.vue';
import taskItemInfo from './taskItemInfo.vue';

defineOptions({
  name: 'calendar',
});

interface Props {
  weekstart?: number;
  dateList?: TaskList;
}
const props = withDefaults(defineProps<Props>(), {
  weekstart: 1,
  dateList() {
    return {};
  },
});

interface Emits {
  (e: 'changeYearMonth', a: { year: number; month: number }): void;
}
const emit = defineEmits<Emits>();

const router = useRouter();
let { year: nowYear, month: nowMonth } = getToday();
onBeforeMount(() => {
  dateDataChange(nowYear, nowMonth);
});
const weekText = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
let positionTop = ref(0);
let dates = ref<any[]>([]);
watch(
  () => props.dateList,
  (val) => {
    dates.value = dates.value.map((item) => {
      if (item.isCurM) {
        item.nums = val[Number(formatNum(item.date))] ? val[Number(formatNum(item.date))].length : 0;
      }
      return item;
    });
  },
  {
    deep: true,
  }
);
let weekDay = computed(() => weekText.slice(props.weekstart).concat(weekText.slice(0, props.weekstart)));

const lineDay = computed(() => dates.value.length / weekDay.value.length);
//日期数据更换
function dateDataChange(nowYear: number, nowMonth: number) {
  dayMoreAllRef.value = {};
  itemDateListRef.value = {};
  dates.value = monthDay(nowYear, nowMonth);
  emit('changeYearMonth', { year: nowYear, month: nowMonth });
}
//跳转
function gotoOther(item1: TaskDetail) {
  let url = '';
  //执行中
  if (item1.taskStatus == 'during') url = '/patrolInspection/appCenter/inspectionMonitor/aiInspection?id=' + item1.id;
  //已完成
  else if (item1.taskStatus == 'finished')
    url = `/patrolInspection/appCenter/appCenterTask/taskReport?id=${item1.taskReportId}&syncData=${item1.syncData}`;
  if (url.length) router.push(url);
}
// 月份生成
function monthDay(y: number, month: number) {
  let dates = [];
  let m = Number(month);
  let firstDayOfMonth = new Date(y, m - 1, 1).getDay(); // 当月第一天星期几
  let lastDateOfMonth = new Date(y, m, 0).getDate(); // 当月最后一天
  let lastDayOfLastMonth = new Date(y, m - 1, 0).getDate(); // 上一月的最后一天
  let weekstart = props.weekstart == 7 ? 0 : props.weekstart;
  let startDay = (() => {
    // 周初有几天是上个月的
    if (firstDayOfMonth == weekstart) {
      return 0;
    } else if (firstDayOfMonth > weekstart) {
      return firstDayOfMonth - weekstart;
    } else {
      return 7 - weekstart + firstDayOfMonth;
    }
  })();
  let endDay = 7 - ((startDay + lastDateOfMonth) % 7); // 结束还有几天是下个月的
  for (let i = 1; i <= startDay; i++) {
    dates.push({
      date: formatNum(lastDayOfLastMonth - startDay + i),
      day: weekstart + i - 1 || 7,
      month: m - 1 >= 0 ? formatNum(m - 1) : 12,
      year: m - 1 >= 0 ? y : y - 1,
    });
  }
  for (let j = 1; j <= lastDateOfMonth; j++) {
    dates.push({
      date: formatNum(j),
      day: (j % 7) + firstDayOfMonth - 1 || 7,
      month: formatNum(m),
      year: y,
      isCurM: true, //是否当前月份
      collapse: true,
      //任务的数量
      nums: 0,
      //   dateList[Number(formatNum(j))] ? dateList[Number(formatNum(j))].length : 0,
    });
  }
  for (let k = 1; k <= endDay; k++) {
    dates.push({
      date: formatNum(k),
      day: (lastDateOfMonth + startDay + weekstart + k - 1) % 7 || 7,
      month: m + 1 <= 11 ? formatNum(m + 1) : 0,
      year: m + 1 <= 11 ? y : y + 1,
    });
  }
  return dates;
}
//改变年月
function changeMonth(type: string, date: { year: number; month: number }) {
  nowYear = date.year;
  nowMonth = date.month;
  if (type == 'pre') {
    if (nowMonth == 1) {
      nowMonth = 12;
      nowYear -= 1;
    } else {
      nowMonth -= 1;
    }
  } else {
    if (nowMonth == 12) {
      nowMonth = 1;
      nowYear += 1;
    } else {
      nowMonth += 1;
    }
  }
  dateDataChange(nowYear, nowMonth);
}
// 回到今天
function backToday() {
  let { year, month } = getToday();
  dateDataChange(year, month);
}
//展开全部
let showAllDateList = ref(false);
let dataAll = ref('');
let dayMoreRef = ref();
let moreIndex = ref('0');
let dayMoreAllRef = ref<any>({});
let popoverRef = ref();
function showDateAll(item: { date: string }, index: string) {
  dayMoreRef.value = dayMoreAllRef.value[index];
  moreIndex.value = index;
  showAllDateList.value = true;
  dataAll.value = item.date;
}
function hideDateAll() {
  showAllDateList.value = showItemDateList.value && showAllDateList.value;
}
//具体某项
let itemDate = ref<any>({});
let showItemDateList = ref(false);
let itemDateRef = ref();
let itemDateListRef = ref<any>({});
async function showItemDate(item1: any, index: number) {
  itemDateRef.value = itemDateListRef.value[index];
  let { data } = await getItemDetailApi({
    taskStatus: item1.taskStatus,
    id: item1.taskStatus == 'no_execute' ? item1.taskPlanId : item1.taskId,
    syncData: item1.syncData,
  });
  item1.taskItemMapList = data;
  itemDate.value = item1;
  showItemDateList.value = true;
}
function hideDateItem() {
  showItemDateList.value = false;
}
defineExpose({
  changeMonth,
  backToday,
});
</script>
<style lang="scss" scoped>
@use './index';
:deep(.days) {
  grid-template-rows: repeat(v-bind(lineDay), minmax(var(--box-height), auto));
}
</style>
