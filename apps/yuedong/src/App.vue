<template>
  <el-config-provider :locale="i18nLocale" :button="config" :size="assemblySize">
    <router-view></router-view>
  </el-config-provider>
</template>

<script setup lang="ts">
import { reactive, computed } from 'vue';
import { GlobalStore } from '@/stores';
import { useTheme } from '@/hooks/useTheme';
import zhCn from 'element-plus/es/locale/lang/zh-cn';
import en from 'element-plus/es/locale/lang/en';

// 使用主题
useTheme();

const globalStore = GlobalStore();
// 配置element按钮文字中间是否有空格
const config = reactive({
  autoInsertSpace: false,
});

// Element Plus 语言与应用默认语言保持一致
const i18nLocale = computed(() => (globalStore.language === 'en' ? en : zhCn));

// 配置全局组件大小 (small/default(medium)/large)
const assemblySize = computed((): string => globalStore.assemblySize);
</script>
