<template>
  <kr-public-dialog
    v-model="show"
    :title="`${props.title}巡检区域`"
    :singleClose="props.isView"
    @doSubmit="handleSubmit"
    @doClose="show = false"
    width="30%"
  >
    <el-form
      ref="ruleFormRef"
      label-width="120px"
      label-suffix=" :"
      :rules="rules"
      :disabled="props.isView"
      :model="props.rowData"
      :hide-required-asterisk="props.isView"
    >
      <el-form-item label="上级巡检区域">
        <el-input v-model="props.parentData!.areaName" placeholder="上级巡检区域" disabled></el-input>
      </el-form-item>
      <el-form-item label="巡检区域名称" prop="areaName">
        <el-input v-model="props.rowData!.areaName" placeholder="请输入巡检区域名称" clearable></el-input>
      </el-form-item>

      <el-form-item label="巡检区域说明" prop="areaExplain">
        <el-input
          v-model="props.rowData!.areaExplain"
          placeholder="请输入描述"
          maxlength="200"
          :autosize="{ minRows: 2, maxRows: 4 }"
          show-word-limit
          type="textarea"
          clearable
        ></el-input>
      </el-form-item>
    </el-form>
  </kr-public-dialog>
</template>

<script setup lang="ts" name="AreaDialog">
import { ref, reactive } from 'vue';
import { ElMessage, FormInstance } from 'element-plus';

const rules = reactive({
  areaName: [{ required: true, message: '请输入巡检区域名称' }],
});

interface DialogProps {
  title: string;
  parentData?: any;
  isView: boolean;
  rowData?: any;
  api?: (params: any) => Promise<any>;
  getList?: () => Promise<any>;
}

// 弹窗状态
const show = ref(false);
const props = ref<DialogProps>({
  isView: false,
  title: '',
});

// 接收父组件传过来的参数
const acceptParams = (params: DialogProps): void => {
  props.value = params;
  show.value = true;
};

// 提交数据（新增/编辑）
const ruleFormRef = ref<FormInstance>();
const handleSubmit = () => {
  ruleFormRef.value!.validate(async (valid) => {
    if (!valid) return;
    try {
      await props.value.api!(props.value.rowData);
      ElMessage.success({ message: `${props.value.title}巡检区域成功！` });
      props.value.getList!();
      show.value = false;
    } catch (error) {
      console.log(error);
    }
  });
};

defineExpose({
  acceptParams,
});
</script>
