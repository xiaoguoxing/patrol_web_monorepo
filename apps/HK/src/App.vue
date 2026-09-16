<template>
  <el-config-provider :locale="i18nLocale" :button="config" :size="assemblySize">
    <router-view></router-view>
  </el-config-provider>
</template>

<script setup lang="ts">
import { reactive, computed } from 'vue';
import { GlobalStore } from '@/stores';
import { useTheme } from '@/hooks/useTheme';
import i18n from '@/languages';
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

interface ElementLocaleConfig {
  locale: Language;
  ui: TranslatePair;
}

const elementLocaleConfigs: Record<string, ElementLocaleConfig> = {
  'zh-CN': { locale: zhCn, ui: appZh.ui },
  'en-US': { locale: en, ui: appEn.ui },
  'zh-HK': { locale: zhHK, ui: appZhHK.ui },
};

const resolveElementLocale = (language: string): ElementLocaleConfig => {
  if (elementLocaleConfigs[language]) return elementLocaleConfigs[language];
  if (language.toLowerCase().startsWith('en')) return elementLocaleConfigs['en-US'];
  if (/^zh[-_](hk|tw)/i.test(language)) return elementLocaleConfigs['zh-HK'];
  return elementLocaleConfigs['zh-CN'];
};

// Element Plus 及共享 UI 语言与应用默认语言保持一致，并动态获取服务端覆盖的 UI 词条
const i18nLocale = computed(() => {
  const language = globalStore.language;
  const elementConfig = resolveElementLocale(language);
  // Element Plus 没有对应内置语言时只回退其组件文案；业务 UI 仍读取当前语言的服务端词条。
  const activeMessages = (i18n.global.messages.value as Record<string, { ui?: TranslatePair }>)[language];
  const currentUi: TranslatePair = {
    ...elementConfig.ui,
    ...(activeMessages?.ui ?? {}),
  };

  return extendLocale(elementConfig.locale, currentUi);
});

// 配置全局组件大小 (small/default(medium)/large)
const assemblySize = computed((): string => globalStore.assemblySize);
</script>
