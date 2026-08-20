<template>
  <div class="not-container">
    <img src="@/assets/images/404.png" class="not-img" alt="404" />
    <div class="not-detail">
      <h2>404</h2>
      <h4>{{ $t('error.page404Msg') }}</h4>
      <el-button type="primary" @click="router.push(HOME_URL)">{{ $t('errpr.goHome') }}</el-button>
    </div>
  </div>
</template>

<script setup lang="ts" name="404">
import { useRouter } from 'vue-router';
import { HOME_URL } from '@/config/config';
const router = useRouter();
</script>

<style scoped lang="scss">
@use './index.scss';
</style>
