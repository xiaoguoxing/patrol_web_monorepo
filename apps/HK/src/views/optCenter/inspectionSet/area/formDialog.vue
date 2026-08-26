<template>
  <kr-public-dialog
    v-model="show"
    :title="`${props.title}${$t('overHaulArea.object')}`"
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
      <el-form-item :label="$t('overHaulArea.objectCode')" prop="objectCode">
        <el-input v-model="props.rowData!.objectCode" disabled :placeholder="$t('overHaulArea.autoPrint')"></el-input>
      </el-form-item>
      <el-form-item :label="$t('aiInspection.objectName')" prop="objectName">
        <el-input
          v-model="props.rowData!.objectName"
          :placeholder="$t('inputPlaceholder.placeholderBase') + $t('aiInspection.objectName')"
        ></el-input>
      </el-form-item>
    </el-form>
  </kr-public-dialog>
</template>

<script setup lang="ts" name="ObjFormDialog">
import { ref, reactive } from 'vue';
import { ElMessage, FormInstance } from 'element-plus';
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
const rules = reactive({
  objectName: [{ required: true, message: t('inputPlaceholder.placeholderBase') + t('aiInspection.objectName') }],
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
      ElMessage.success({ message: `${props.value.title}${t('overHaulArea.object')}${t('buttonName.success')}！` });
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
