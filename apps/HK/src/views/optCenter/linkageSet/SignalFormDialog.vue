<template>
  <kr-public-dialog
    v-model="show"
    :title="`${props.title} ${$t('linkageSet.ldxh')}`"
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
      <el-form-item :label="$t('aiInspection.cameraName')" prop="linkageSignalCode">
        <!--        <el-input v-model="props.rowData!.linkageSignalCode" placeholder="请输入联动信号编码" clearable></el-input>-->
        <el-select-v2
          v-model="props.rowData!.linkageSignalCode"
          :options="scadaList"
          :props="{ value: 'code', label: 'name' }"
          filterable
          clearable
          :disabled="props.title === $t('buttonName.edit')"
          @change="scadaChange"
        >
          <!--                <el-option :label="item.name" :value="item.code" :key="item.id" v-for="item in scadaList"></el-option>-->
        </el-select-v2>
      </el-form-item>
      <el-form-item :label="$t('aiInspection.linkageSignalName')" prop="linkageSignalName">
        <el-input
          v-model="props.rowData!.linkageSignalName"
          :placeholder="`${$t('inputPlaceholder.placeholderBase')}${$t('aiInspection.linkageSignalName')}`"
          clearable
        ></el-input>
      </el-form-item>
      <el-form-item :label="$t('linkageSet.standardValue')" prop="standardValue">
        <el-input
          v-model="props.rowData!.standardValue"
          :placeholder="`${$t('inputPlaceholder.placeholderBase')}${$t('linkageSet.standardValue')}`"
          clearable
        ></el-input>
      </el-form-item>
      <el-form-item :label="$t('task.inspectionModel')" prop="executeMode">
        <el-select v-model="props.rowData!.executeMode" clearable>
          <el-option :label="$t('linkageSet.serial')" value="serial"></el-option>
          <el-option :label="$t('linkageSet.parallel')" value="parallel"></el-option>
        </el-select>
      </el-form-item>
    </el-form>
  </kr-public-dialog>
</template>

<script setup lang="ts" name="SignalDialog">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, FormInstance } from 'element-plus';
import { getScadaInfoApi } from '@/api/modules/optCenter/aiPatrolManage/position';
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
const rules = reactive({
  linkageSignalName: [
    {
      required: true,
      message: `${t('inputPlaceholder.placeholderBase')}${t('aiInspection.linkageSignalName')}`,
      trigger: 'blur',
    },
  ],
  linkageSignalCode: [
    {
      required: true,
      message: `${t('inputPlaceholder.placeholderBase')}${t('aiInspection.linkageSignalCode')}`,
      trigger: 'blur',
    },
  ],
  standardValue: [
    {
      required: true,
      message: `${t('inputPlaceholder.placeholderBase')}${t('linkageSet.standardValue')}`,
      trigger: 'blur',
    },
  ],
  executeMode: [
    {
      required: true,
      message: `${t('inputPlaceholder.placeholderSelect')}${t('linkageSet.inspectionModel')}`,
      trigger: 'blur',
    },
  ],
});

interface DialogProps {
  title: string;
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

const scadaList = ref<any[]>([]);
onMounted(() => {
  getAIList();
});
function getAIList() {
  getScadaInfoApi().then((res) => {
    scadaList.value = res.data;
  });
}
async function scadaChange(val: string) {
  if (val) {
    let obj = scadaList.value.find((i) => i.code == val);
    props.value.rowData!.linkageSignalName = obj.name;
  } else {
    props.value.rowData!.linkageSignalName = '';
    props.value.rowData!.linkageSignalName = '';
  }
}
// 提交数据（新增/编辑）
const ruleFormRef = ref<FormInstance>();
const handleSubmit = () => {
  ruleFormRef.value!.validate(async (valid) => {
    if (!valid) return;
    try {
      await props.value.api!(props.value.rowData);
      ElMessage.success({ message: `${props.value.title}${t('linkageSet.ldxh')}${t('buttonName.success')}！` });
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
<style scoped lang="scss"></style>
