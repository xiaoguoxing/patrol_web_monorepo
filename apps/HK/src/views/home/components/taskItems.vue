<template>
  <kr-card header="" :border="false" bodyClass="taskCardBody">
    <template #header>
      <div class="left-title flx-align-center">
        <div class="title kr-font-medium">{{ $t('worktop.title7') }}</div>
        <div class="itemData flx-align-center ml20">
          <div class="label">
            {{ $t('worktop.finished') }}：<span class="c c1 kr-font-medium">{{ titleData.finished }}</span>
          </div>
          <div class="label">
            {{ $t('worktop.during') }}：<span class="c c2 kr-font-medium">{{ titleData.during }}</span>
          </div>
          <div class="label">
            {{ $t('worktop.no_execute') }}：<span class="c c2 kr-font-medium">{{ titleData.no_execute }}</span>
          </div>
        </div>
      </div>

      <div class="left-time flx-align-center">
        <el-button @click="backNow" :disabled="time === dateValue">{{ $t('buttonName.backNow') }}</el-button>
        <el-date-picker
          v-model="dateValue"
          type="date"
          :start-placeholder="$t('input.sTime')"
          :end-placeholder="$t('input.eTime')"
          format="YYYY-MM-DD"
          value-format="YYYY-MM-DD"
          @change="initData"
          :clearable="false"
        />
      </div>
    </template>
    <div class="taskCard">
      <cardItem :itemData="item" v-for="item in itemList" :key="item.id"></cardItem>
    </div>
  </kr-card>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import cardItem from '../components/cardItem.vue';
import { useDateFormat } from '@vueuse/core';
import { getTaskDay, Item } from '@/api/modules/workstand';
defineOptions({
  name: 'task',
});
let itemList = ref<Item[]>([]);
let titleData = ref({
  finished: 0,
  during: 0,
  no_execute: 0,
});
const len = computed(() => Math.ceil(itemList.value.length / 4));
let time = useDateFormat(new Date(), 'YYYY-MM-DD');
let dateValue = ref(time.value);

async function initData() {
  let res = await getTaskDay({ time: dateValue.value });
  itemList.value = res.data?.list ?? [];
  titleData.value.finished = res.data?.finished ?? 0;
  titleData.value.no_execute = res.data?.no_execute ?? 0;
  titleData.value.during = res.data?.during ?? 0;
}
function backNow() {
  dateValue.value = time.value;
  initData();
}
onMounted(() => {
  initData();
});
</script>
<style scoped lang="scss">
:deep(.taskCardBody) {
  padding: 16px var(--kr-card-horizen-padding);
  .taskCard {
    display: grid;
    grid-template-rows: repeat(v-bind(len), 80px);
    grid-template-columns: repeat(4, 1fr);
    grid-gap: 14px;
    overflow-y: scroll;
    &::-webkit-scrollbar {
      display: none;
    }
  }
}
.left-title {
  font-size: 14px;
  color: var(--el-text-color-regular);
  .itemData {
    gap: 20px;
    .label {
      color: var(--el-text-color-regular);
      .c {
        font-size: 18px;
        font-weight: 500;
        &.c1 {
          color: var(--el-text-color-primary);
        }
        &.c2 {
          color: var(--el-color-primary);
        }
      }
    }
  }
}
.left-time {
  gap: 15px;
}
</style>
