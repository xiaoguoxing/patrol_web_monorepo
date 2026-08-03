<template>
  <div class="fullscreen">
    <i
      :class="['iconfont', isFullscreen ? 'icon-suoxiao' : 'icon-fangda']"
      class="toolBar-icon"
      @click="toggle"
      :title="isFullscreen ? '退出全屏' : '全屏'"
    ></i>
  </div>
</template>

<script setup lang="ts">
import { useFullscreen } from '@vueuse/core';
const { toggle, isFullscreen } = useFullscreen();
</script>
