<template>
  <kr-card :header="title" :border="false">
    <div class="alarm" v-for="(item, index) in dataList" :key="index" @click="$emit('itemClick', item)">
      <img :src="item.icon" alt="" />
      <div>
        <p class="name">{{ item.name }}</p>
        <p class="value" :style="{ color: item.color }">{{ item.value }}</p>
      </div>
    </div>
  </kr-card>
</template>

<script>
import { ref, defineComponent } from 'vue';

export default defineComponent({
  name: 'common',
  props: {
    title: {
      type: String,
      default: '',
    },
    dataList: {
      type: Array,
      default: () => [],
    },
  },
  setup(props) {},
});
</script>

<style scoped lang="scss">
// @import './index.scss';
</style>
