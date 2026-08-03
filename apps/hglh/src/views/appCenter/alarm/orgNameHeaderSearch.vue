<script setup lang="ts">
import { OrgTree, orgTree } from '@/api/modules/optCenter/aiPatrolManage/task';
import { computed, ref } from 'vue';

interface emits {
  (e: 'search'): void;
}
const emit = defineEmits<emits>();
const model = defineModel<string>();
// 列查询
let treeRef = ref();
let orgPopover = ref();
const defaultProps = {
  children: 'children',
  label: 'name',
};
let showOrg = ref(false);
let checkList = ref<string[]>([]);
let checkListCode = computed(() => checkList.value.toString());
function handleCheckChange(node: OrgTree, checkData: { checkedKeys: string[] }) {
  checkList.value = checkData.checkedKeys;
}
function searchOrg() {
  model.value = checkListCode.value;
  emit('search');
  orgPopover.value.hide();
}
function resetOrgData(isSearch: boolean = true) {
  treeRef.value.setCheckedKeys([], false);
  checkList.value = [];
  model.value = checkListCode.value;
  if (isSearch) emit('search');
  orgPopover.value.hide();
}
defineExpose({
  resetOrgData,
});
const orgList = (await orgTree()).data;
</script>

<template>
  <div>
    <span class="kr-font-medium" style="font-size: 16px" :class="!checkListCode ? '' : 'checkColor'">所属组织</span>
    <el-popover
      ref="orgPopover"
      placement="bottom"
      popper-class="is-pure el-table-filter"
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
        <div>
          <div class="orgTree el-table-filter__content">
            <el-scrollbar wrap-class="el-table-filter__wrap" view-class="pt10 pb10">
              <el-tree
                ref="treeRef"
                node-key="id"
                :data="orgList"
                :show-checkbox="true"
                :check-strictly="true"
                :highlight-current="true"
                :props="defaultProps"
                :expand-on-click-node="false"
                :check-on-click-node="true"
                @check="handleCheckChange"
              ></el-tree>
            </el-scrollbar>
          </div>
          <div class="orgBtn el-table-filter__bottom">
            <el-button link :disabled="!checkListCode" @click="searchOrg">筛选</el-button>
            <el-button link @click="resetOrgData">重置</el-button>
          </div>
        </div>
      </template>
    </el-popover>
  </div>
</template>

<style scoped lang="scss"></style>
