<template>
  <!-- 列设置 -->
  <div class="kr-protable" ref="colTableRef">
    <el-table
      :data="colSetting"
      :border="true"
      row-key="prop"
      default-expand-all
      max-height="50vh"
      :tree-props="{ children: '_children' }"
    >
      <el-table-column prop="label" align="center" label="列名" />
      <el-table-column prop="isShow" align="center" label="显示" v-slot="scope">
        <el-switch v-model="scope.row.isShow" @change="setConfig" />
      </el-table-column>
      <el-table-column prop="sortable" align="center" label="排序" v-slot="scope">
        <el-switch v-model="scope.row.sortable" />
      </el-table-column>
      <template #empty>
        <div class="table-empty">
          <img src="../assets/images/notData.png" alt="notData" />
          <div>暂无可配置列</div>
        </div>
      </template>
    </el-table>
  </div>
</template>

<script setup lang="ts" name="colSetting">
import { ref } from 'vue';
import type { ColumnProps } from '../pro-table';

defineProps<{ colSetting: ColumnProps[]; setConfig: () => void }>();

const drawerVisible = ref<boolean>(false);
// 打开列设置
const openColSetting = () => {
  drawerVisible.value = true;
};

defineExpose({
  openColSetting,
});
</script>
