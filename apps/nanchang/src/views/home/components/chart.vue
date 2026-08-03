<template>
  <div ref="verticalBarRef" :id="id" class="w100 h100" />
</template>
<script setup lang="ts">
//按需导入需要用到的 vue函数 和 echarts
import { onMounted, onBeforeUnmount, watch } from 'vue';
import * as echarts from 'echarts';
//获取 dom 和 父组件数据 并定义"myChart"用于初始化图表
let myChart: echarts.ECharts;
const props = defineProps({
  id: {
    type: String,
    default: 'chart',
    required: true,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  echartOption: {
    type: Object,
    default: () => ({}),
    required: true,
  },
});
//重绘图表函数
const resizeHandler = () => {
  myChart.resize();
};
//设置防抖，保证无论拖动窗口大小，只执行一次获取浏览器宽高的方法
const debounce = (fun: { (): void; (): void }, delay: number | undefined) => {
  let timer: NodeJS.Timeout;
  return function () {
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      fun();
    }, delay);
  };
};
const cancalDebounce = debounce(resizeHandler, 50);
//页面成功渲染，开始绘制图表
onMounted(() => {
  //配置为 svg 形式，预防页面缩放而出现模糊问题；图表过于复杂时建议使用 Canvas
  myChart = echarts.init(document.getElementById(props.id) as HTMLDivElement, { renderer: 'svg' });
  myChart.showLoading({
    text: '',
    color: '#409eff',
    textColor: '#14F3F3',
    maskColor: 'rgba(255, 255, 255, .0)',
    zlevel: 0,
    lineWidth: 2,
  });
  if (!props.loading) {
    myChart.hideLoading();
    myChart.setOption(props.echartOption, true);
  }
  //自适应不同屏幕时改变图表尺寸
  window.addEventListener('resize', cancalDebounce);
});
//页面销毁前，销毁事件和实例
onBeforeUnmount(() => {
  window.removeEventListener('resize', cancalDebounce);
  myChart.dispose();
});
//监听图表数据时候变化，重新渲染图表
watch(
  () => [props.echartOption, props.loading],
  () => {
    if (!props.loading) {
      myChart.hideLoading();
      myChart.setOption(props.echartOption, true);
    }
  },
  { deep: true }
);
</script>
<style scoped lang="scss">
.w100 {
  width: 100%;
}
.h100 {
  height: 100%;
}
</style>
