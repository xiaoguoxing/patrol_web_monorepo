<template>
  <el-tooltip effect="light" :content="title" placement="bottom">
    <span class="logo-title kr-font-bold">{{ isCollapse ? title.length && title[0] : title }}</span>
  </el-tooltip>
</template>
<script setup lang="ts">
import { ref } from 'vue';
import { TITLE } from '@/config/config';
interface TitleProps {
  isCollapse?: boolean;
}
withDefaults(defineProps<TitleProps>(), {
  isCollapse: false,
});
const title = ref(TITLE);
</script>

<style scoped lang="scss">
.logo-title {
  overflow: hidden;
  font-size: 20px;
  color: #ffffff;
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
