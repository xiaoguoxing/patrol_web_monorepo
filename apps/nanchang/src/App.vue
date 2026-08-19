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
import zhHK from 'element-plus/es/locale/lang/zh-hk';
import type { Language, TranslatePair } from 'element-plus/es/locale';
import { en as appEn, zh as appZh, zhHK as appZhHK } from '@patrol/languages';

// 使用主题
useTheme();

const globalStore = GlobalStore();
// 配置element按钮文字中间是否有空格
const config = reactive({
  autoInsertSpace: false,
});

// 在保留 Element Plus 内置词条的基础上扩展共享 UI 词条
const extendLocale = (locale: Language, patrol: TranslatePair): Language => ({
  ...locale,
  el: {
    ...locale.el,
    patrol,
  },
});

const elementLocales: Record<string, Language> = {
  zh: extendLocale(zhCn, appZh.ui),
  en: extendLocale(en, appEn.ui),
  'zh-HK': extendLocale(zhHK, appZhHK.ui),
};

// Element Plus 及共享 UI 语言与应用默认语言保持一致
const i18nLocale = computed(() => elementLocales[globalStore.language] ?? elementLocales.zh);

// 配置全局组件大小 (small/default(medium)/large)
const assemblySize = computed((): string => globalStore.assemblySize);
</script>
