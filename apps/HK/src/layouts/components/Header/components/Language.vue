<template>
  <el-dropdown trigger="click" @command="(lang:string) => handleSetLanguage(lang)">
    <i :class="'iconfont icon-zhongyingwen'" class="toolBar-icon" :title="$t('header.langChangeTitle')"></i>
    <template #dropdown>
      <el-dropdown-menu>
        <el-dropdown-item
          v-for="item in languageOptions"
          :key="item.code"
          :disabled="language === item.code"
          :command="item.code"
        >
          {{ item.name }}
        </el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { GlobalStore } from '@/stores';

const i18n = useI18n();
const globalStore = GlobalStore();
const language = computed((): string => globalStore.language);
const languageOptions = computed(() => globalStore.languageOptions);

// 切换语言
const handleSetLanguage = (lang: string): void => {
  i18n.locale.value = lang;
  globalStore.updateLanguage(lang);
  // 业务接口也通过 Lang 请求头返回本地化数据，切换后重新加载页面以刷新这些数据。
  window.location.reload();
};
</script>
