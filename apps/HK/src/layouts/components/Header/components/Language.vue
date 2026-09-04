<template>
  <el-dropdown trigger="click" @command="(lang:string) => handleSetLanguage(lang,false)">
    <i :class="'iconfont icon-zhongyingwen'" class="toolBar-icon" :title="$t('header.langChangeTitle')"></i>
    <template #dropdown>
      <el-dropdown-menu>
        <el-dropdown-item :disabled="language && language === 'zh'" command="zh">简体中文</el-dropdown-item>
        <el-dropdown-item :disabled="language === 'zh-HK'" command="zh-HK">繁體中文</el-dropdown-item>
        <el-dropdown-item :disabled="language === 'en'" command="en">English</el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
</template>

<script setup lang="ts">
import { computed, onMounted, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';
import { GlobalStore } from '@/stores';
import { getBrowserLang } from '@/utils/util';

const i18n = useI18n();
const globalStore = GlobalStore();
const language = computed((): string => globalStore.language);

// 切换语言
const handleSetLanguage = (lang: string, is: boolean = false): void => {
  i18n.locale.value = lang;
  globalStore.updateLanguage(lang);
  console.log(is);
  if (!is) reloadPage();
};
const reloadPage = () => {
  nextTick(() => {
    if (typeof window !== 'undefined') {
      window.history.go(0);
    }
  });
};
onMounted(() => {
  handleSetLanguage(language.value || getBrowserLang(), true);
});
</script>
