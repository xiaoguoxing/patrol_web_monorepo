<script setup lang="ts">
import { ref } from 'vue';
interface Props {
  title?: string;
  options?: { text: string; value: any }[];
}
const props = withDefaults(defineProps<Props>(), { title: '' });
interface emits {
  (e: 'search'): void;
}
const emit = defineEmits<emits>();
const model = defineModel<string>();
// 列查询
let orgPopover = ref();

let showOrg = ref(false);

function searchOrg(item: { text: string; value: any }) {
  model.value = item.value;
  emit('search');
  orgPopover.value.hide();
}
function resetOrgData() {
  model.value = '';
  emit('search');
  orgPopover.value.hide();
}
defineExpose({
  resetOrgData,
});
</script>

<template>
  <div>
    <span class="kr-font-medium" style="font-size: 16px" :class="!model ? '' : 'checkColor'">{{ title }}</span>
    <el-popover
      ref="orgPopover"
      placement="bottom"
      popper-class="is-pure el-table-filter el-popover"
      trigger="click"
      :offset="2"
      :show-arrow="false"
      @before-leave="showOrg = false"
    >
      <template #reference>
        <span
          class="el-table__column-filter-trigger el-none-outline el-tooltip__trigger el-tooltip__trigger"
          @click="showOrg = !showOrg"
        >
          <el-icon v-if="showOrg"><ArrowUp /></el-icon>
          <el-icon v-else><ArrowDown /></el-icon>
        </span>
      </template>
      <template #default>
        <ul class="el-table-filter__list">
          <li
            class="el-table-filter__list-item"
            :class="{ 'is-active': item.value === model }"
            :key="index"
            v-for="(item, index) in options"
            @click="searchOrg(item)"
          >
            {{ item.text }}
          </li>
        </ul>
      </template>
    </el-popover>
  </div>
</template>

<style scoped lang="scss"></style>
