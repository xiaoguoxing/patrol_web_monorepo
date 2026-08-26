<template>
  <kr-public-dialog
    v-model="show"
    :title="`${props.title}${$t('aiInspection.areaName')}`"
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
      <el-form-item :label="$t('linkageSet.areaNameParent')">
        <el-input
          v-model="props.parentData!.areaName"
          :placeholder="$t('linkageSet.areaNameParent')"
          disabled
        ></el-input>
      </el-form-item>
      <el-form-item :label="$t('linkageSet.areaName')" prop="areaName">
        <el-input
          v-model="props.rowData!.areaName"
          :placeholder="$t('inputPlaceholder.placeholderBase') + $t('linkageSet.areaName')"
          clearable
        ></el-input>
      </el-form-item>

      <el-form-item :label="$t('linkageSet.areaExplain')" prop="areaExplain">
        <el-input
          v-model="props.rowData!.areaExplain"
          :placeholder="$t('inputPlaceholder.placeholderBase') + $t('linkageSet.areaExplain')"
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
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
const rules = reactive({
  areaName: [{ required: true, message: t('inputPlaceholder.placeholderBase') + t('linkageSet.areaName') }],
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
      ElMessage.success({
        message: `${props.value.title}${t('aiInspection.areaName')} ${t('buttonName.success')}！`,
      });
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
