<template>
  <div class="flex-1 app-inspection">
    <kr-card class="flex-1" :header="cardTitle" header-border>
      <template #headerRight>
        <Switch v-model="listType" />
      </template>
      <TaskList v-if="listType == 1">
        <!--  <template #headerRt>
          <Switch v-model="listType" />
        </template>-->
      </TaskList>
      <!-- table形式展示 -->
      <Table v-else>
        <!-- <Switch v-model="listType" /> -->
      </Table>
    </kr-card>
  </div>
</template>
<script setup lang="ts" name="aiInspection">
import { ref, reactive, watch, onActivated, onDeactivated, onMounted, ComputedRef, computed } from 'vue';
import { KeepAliveStore } from '@/stores/modules/keepAlive';
import Table from './table.vue';
import TaskList from './list.vue';
import Switch from '@appCenter/components/switch.vue';
import '@appCenter/styles/inspection.scss';
import { useRoute } from 'vue-router';
const keepAliveStore = KeepAliveStore();
const route = useRoute();
let cardTitle: ComputedRef<any> = computed(() => route.meta?.title!);
//切换列表形式
enum ListType {
  Grid = 1,
  Table = 2,
}
const listType = ref<ListType>(1);
onMounted(() => {});
onActivated(() => {
  // 调用时机为首次挂载
  // 以及每次从缓存中被重新插入时
  if (!Reflect.has(route.query, 'detail')) {
    listType.value = 1;
  }
  keepAliveStore.removeKeepLiveName('aiInspection');
});
</script>
