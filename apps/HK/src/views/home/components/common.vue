<template>
  <kr-card :header="title" :border="false">
    <div class="alarm" v-for="(item, index) in dataList" :key="index" @click="$emit('itemClick', item)">
      <img :src="item.icon" alt="" />
      <div>
        <p class="name" :class="locale">{{ item.name }}</p>
        <p class="value" :style="{ color: item.color }">{{ item.value }}</p>
      </div>
    </div>
  </kr-card>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
interface Props {
  dataList?: { [key: string]: any }[];
  title?: string;
}
const props = withDefaults(defineProps<Props>(), {
  title: '',
  dataList: () => [],
});
defineOptions({ name: 'common' });
const { locale } = useI18n();
</script>

<style scoped lang="scss">
// @import './index.scss';
</style>
