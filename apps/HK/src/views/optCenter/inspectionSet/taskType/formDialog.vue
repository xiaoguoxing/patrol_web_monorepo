<template>
  <kr-public-dialog
    v-model="show"
    :title="`${props.title}${$t('aiInspection.taskTypeName')}`"
    :singleClose="props.isView"
    @doSubmit="handleSubmit"
    @doClose="show = false"
    width="30%"
  >
    <el-form
      v-if="show"
      ref="ruleFormRef"
      label-width="auto"
      label-suffix=" :"
      :rules="rules"
      :disabled="props.isView"
      :model="props.rowData"
      :hide-required-asterisk="props.isView"
    >
      <el-form-item :label="$t('task.taskTypeName')" prop="taskType">
        <el-input
          v-model="props.rowData!.taskType"
          :placeholder="$t('inputPlaceholder.placeholderBase') + $t('task.taskTypeName')"
        ></el-input>
      </el-form-item>
      <el-form-item :label="$t('task.priorityLevel')" prop="priorityLevel">
        <el-slider v-model="props.rowData!.priorityLevel" show-input :step="1" :min="1" :max="10" show-stops />
      </el-form-item>
    </el-form>
  </kr-public-dialog>
</template>

<script setup lang="ts" name="TaskTypeDialog">
import { ref, reactive } from 'vue';
import { ElMessage, FormInstance } from 'element-plus';
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
const rules = reactive({
  taskType: [{ required: true, message: t('inputPlaceholder.placeholderBase') + t('task.taskTypeName') }],
  priorityLevel: [{ required: true, message: t('inputPlaceholder.placeholderSelect') + t('task.priorityLevel') }],
});

interface DialogProps {
  title: string;
  isView: boolean;
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
      ElMessage.success({
        message: `${props.value.title}${t('aiInspection.taskTypeName')} ${t('buttonName.success')}！`,
      });
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
