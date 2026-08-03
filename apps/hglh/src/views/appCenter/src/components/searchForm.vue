<template>
  <el-form ref="formRef" label-width="auto" label-position="top" :model="searchParam">
    <el-form-item label="巡检区域" prop="areaName">
      <el-input v-model="searchParam!.areaName" placeholder="请输入" clearable></el-input>
    </el-form-item>
    <el-form-item label="巡检对象" prop="objectName">
      <el-input v-model="searchParam!.objectName" placeholder="请输入" clearable></el-input>
    </el-form-item>
    <el-form-item label="巡检项" prop="itemName">
      <el-input v-model="searchParam!.itemName" placeholder="请输入" clearable></el-input>
    </el-form-item>
    <el-form-item label="巡检项状态" prop="itemStatus">
      <el-select v-model="searchParam!.itemStatus" clearable>
        <el-option
          v-for="(item, index) in itemDictlist"
          :key="index"
          :label="item.label"
          :value="item.value"
        ></el-option>
      </el-select>
    </el-form-item>
    <el-form-item class="btns-box">
      <el-button plain @click="reset">重置</el-button>

      <el-button type="primary" @click="search">查询</el-button>
    </el-form-item>
  </el-form>
</template>
<script setup lang="ts">
import { ref, reactive } from 'vue';
import { getDict, getDictForColumnFilters as dictForFilters } from '@/utils/serviceDict';
import type { DefaultDict, FilterDict } from '@/utils/serviceDict';
import { ElMessage, FormInstance } from 'element-plus';
interface Props {
  searchParam?: { [key: string]: any }; // 搜索参数
  search: () => void; // 搜索方法
  reset: () => void; // 重置方法
}
// 接受父组件参数，配置默认值
const props = withDefaults(defineProps<Props>(), {
  searchParam: () => ({}),
});
//巡检项状态数据字典
const itemDictlist = [{ label: '全部', value: 'all' }, ...((await getDict('item_status')) as DefaultDict)];
// 提交数据（新增/编辑）
const formRef = ref<FormInstance>();
// const reset = () => {};
// const search = () => {};
</script>
<style lang="scss" scoped>
.el-form-item {
  margin-bottom: 12px;
}
.btns-box {
  padding-top: 8px;
  margin-bottom: 0;
  :deep(.el-form-item__content) {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .el-button {
    flex: 1;
  }
}
</style>
