<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
interface Props {
  objectList: any[];
  showBtn?: boolean;
  showMove?: boolean;
}
const props = withDefaults(defineProps<Props>(), {
  showBtn: true,
  showMove: true,
});

interface Emit {
  (e: 'openObjectDialog'): any;
  (e: 'deleteList', id: string[]): any;
  (e: 'prev', id: string): any;
  (e: 'next', id: string): any;
}
const emit = defineEmits<Emit>();
//表格
const proTable = ref();
const resColumns = computed(() => [
  ...[props.showBtn ? { type: 'selection', label: t('table.sort'), width: 70 } : {}],
  { type: 'index', label: t('table.sort'), width: 70 },
  {
    prop: 'areaName',
    label: t('aiInspection.areaName'),
  },
  {
    prop: 'objectName',
    label: t('aiInspection.objectName'),
  },
  {
    prop: 'itemName',
    label: t('task.itemName'),
  },
  ...[
    props.showBtn ? { prop: 'operation', align: 'right', label: t('table.operation'), width: 250, fixed: 'right' } : {},
  ],
]);
const initParam = {};
watch(
  () => props.objectList,
  () => {
    proTable.value?.getTableList();
  }
);
function dataCallback() {}
function getListApi() {
  return new Promise((resolve) => {
    resolve({
      data: props.objectList,
    });
  });
}
function openDialogChange() {
  emit('openObjectDialog');
}
function deleteList(arr: string[]) {
  emit('deleteList', arr);
  proTable.value?.clearSelection();
}
const firstId = computed(() => props.objectList.at(0).itemId);
const lastId = computed(() => props.objectList.at(-1).itemId);
function prev(itemId: string) {
  emit('prev', itemId);
}
function next(itemId: string) {
  emit('next', itemId);
}
</script>

<template>
  <kr-pro-table
    ref="proTable"
    v-bind="$attrs"
    :title="'已选'"
    outBorder
    titleBorder
    :columns="resColumns"
    :requestApi="getListApi"
    :initParam="initParam"
    selectId="itemId"
    :pagination="false"
    :sortAble="false"
  >
    <!-- 表格 header 按钮 -->
    <template v-if="props.showBtn" #tableHeader="{ selectedListIds }">
      <el-button icon="CirclePlus" type="primary" @click="openDialogChange()">{{
        $t('inspection.AddInspection')
      }}</el-button>
      <el-button icon="Delete" :disabled="!selectedListIds.length" @click="deleteList(selectedListIds)">{{
        $t('ui.delete')
      }}</el-button>
    </template>
    <!-- 表格操作 -->
    <template #operation="{ row }">
      <el-button type="primary" link v-if="showMove && !(firstId === row.itemId)" @click="prev(row['itemId'])">{{
        $t('inspection.prev')
      }}</el-button>
      <el-button type="primary" link v-if="showMove && !(lastId === row.itemId)" @click="next(row['itemId'])">{{
        $t('inspection.next')
      }}</el-button>
      <el-button type="primary" link @click="deleteList(row['itemId'] ? [row['itemId']] : [])">{{
        $t('ui.delete')
      }}</el-button>
    </template>
  </kr-pro-table>
</template>

<style scoped lang="scss"></style>
