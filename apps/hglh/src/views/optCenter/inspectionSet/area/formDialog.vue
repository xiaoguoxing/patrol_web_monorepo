<template>
  <kr-public-dialog
    v-model="show"
    :title="`${props.title}巡检对象`"
    :singleClose="props.isView"
    @doSubmit="handleSubmit"
    @doClose="show = false"
    width="30%"
  >
    <el-form
      v-if="show"
      ref="ruleFormRef"
      label-width="120px"
      label-suffix=" :"
      :rules="rules"
      :disabled="props.isView"
      :model="props.rowData"
      :hide-required-asterisk="props.isView"
    >
      <el-form-item label="巡检对象编码" prop="objectCode">
        <el-input v-model="props.rowData!.objectCode" disabled placeholder="自动生成"></el-input>
      </el-form-item>
      <el-form-item label="巡检对象名称" prop="objectName">
        <el-input v-model="props.rowData!.objectName" placeholder="请输入巡检对象名称"></el-input>
      </el-form-item>
    </el-form>
  </kr-public-dialog>
</template>

<script setup lang="ts" name="ObjFormDialog">
import { ref, reactive } from 'vue';
import { ElMessage, FormInstance } from 'element-plus';

const rules = reactive({
  objectName: [{ required: true, message: '请输入巡检对象名称' }],
});

interface DialogProps {
  title: string;
  isView: boolean;
  areaData?: any;
  rowData?: any;
  api?: (params: any) => Promise<any>;
  getTableList?: () => Promise<any>;
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
      ElMessage.success({ message: `${props.value.title}巡检对象成功！` });
      props.value.getTableList!();
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
