<template>
  <svg class="icon" :style="iconStyle" aria-hidden="true">
    <use :xlink:href="symbolId" />
  </svg>
</template>

<script setup lang="ts" name="SvgIcon">
import { computed, CSSProperties } from 'vue';
interface SvgProps {
  name: string; // 图标的名称 ==> 必传
  prefix?: string; // 图标的前缀 ==> 非必传（默认为"icon"）
  iconStyle?: CSSProperties; // 图标的样式 ==> 非必传
}
// 接收父组件参数并设置默认值
const props = withDefaults(defineProps<SvgProps>(), {
  prefix: 'icon-',
  iconStyle: () => ({}),
});

const symbolId = computed(() => `#${props.prefix}${props.name}`);
</script>
<style>
.icon {
  width: 1em;
  height: 1em;
  overflow: hidden;
  vertical-align: -0.15em;
  fill: currentColor;
}
</style>
