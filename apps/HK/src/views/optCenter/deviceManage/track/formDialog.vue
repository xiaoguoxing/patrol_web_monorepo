<template>
  <kr-public-dialog
    v-model="show"
    :title="`${paramprops.title}${$t('device.trackBot')}`"
    :singleClose="paramprops.isView"
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
      :disabled="paramprops.isView"
      :model="paramprops.rowData"
      :hide-required-asterisk="paramprops.isView"
    >
      <el-form-item :label="$t('camera.robotName')" prop="robotName">
        <el-input
          v-model="paramprops.rowData!.robotName"
          :placeholder="$t('inputPlaceholder.placeholderBase') + $t('camera.robotName')"
          clearable
        ></el-input>
      </el-form-item>
      <el-form-item :label="$t('common.ip')" prop="robotHost">
        <el-input
          v-model="paramprops.rowData!.robotHost"
          :placeholder="$t('inputPlaceholder.placeholderBase') + $t('common.ip')"
          clearable
        ></el-input>
      </el-form-item>
      <el-form-item :label="$t('camera.akCode')" prop="appKey">
        <el-input
          v-model="paramprops.rowData!.appKey"
          :placeholder="$t('inputPlaceholder.placeholderBase') + $t('camera.akCode')"
          clearable
        ></el-input>
      </el-form-item>
      <el-form-item :label="$t('camera.skCode')" prop="appSecret">
        <el-input
          v-model="paramprops.rowData!.appSecret"
          :placeholder="$t('inputPlaceholder.placeholderBase') + $t('camera.skCode')"
          clearable
        ></el-input>
      </el-form-item>
      <el-form-item :label="$t('camera.attachmentStorageId')" prop="attachmentStorageId">
        <el-select v-model="paramprops.rowData!.attachmentStorageId" clearable>
          <el-option v-for="i in cvrList" :key="i.id" :label="i.storageName" :value="i.id"></el-option>
        </el-select>
      </el-form-item>
    </el-form>
  </kr-public-dialog>
</template>
<script setup lang="ts" name="SignalDialog">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, FormInstance } from 'element-plus';
import { getAllListApi, VideoStorage } from '@/api/modules/optCenter/deviceManage/videoStorage';
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
const rules = reactive({
  robotName: [
    { required: true, message: t('inputPlaceholder.placeholderBase') + t('camera.robotName'), trigger: 'blur' },
  ],
  appKey: [{ required: true, message: t('inputPlaceholder.placeholderBase') + t('camera.akCode'), trigger: 'blur' }],
  robotHost: [{ required: true, message: t('inputPlaceholder.placeholderBase') + t('common.ip'), trigger: 'blur' }],
  appSecret: [{ required: true, message: t('inputPlaceholder.placeholderBase') + t('camera.skCode'), trigger: 'blur' }],
});
type dictOption = {
  label: string;
  value: string;
}[];
interface DialogProps {
  typeDictlist: dictOption;
}
// 接受父组件参数，配置默认值
const props = withDefaults(defineProps<DialogProps>(), {
  typeDictlist: [] as any,
});
onMounted(async () => {
  let res = await getAllListApi();
  cvrList.value = res.data;
});
// 弹窗状态
const show = ref(false);
interface ParamProps {
  title: string;
  areaData?: any;
  rowData?: any;
  isView: boolean;
  api?: (params: any) => Promise<any>;
  getTableList?: () => Promise<any>;
}
const paramprops = ref<ParamProps>({
  isView: false,
  title: '',
});
// 接收父组件传过来的参数
const acceptParams = (params: ParamProps): void => {
  paramprops.value = params;
  show.value = true;
};
// 提交数据（新增/编辑）
const ruleFormRef = ref<FormInstance>();
const handleSubmit = () => {
  ruleFormRef.value!.validate(async (valid) => {
    if (!valid) return;
    try {
      if (paramprops.value.title !== t('buttonName.edit')) {
        paramprops.value.rowData.areaId = paramprops.value.areaData.id;
        paramprops.value.rowData.areaName = paramprops.value.areaData.areaName;
      }
      await paramprops.value.api!(paramprops.value.rowData);
      ElMessage.success({ message: `${paramprops.value.title}${t('device.trackBot')}${t('buttonName.success')}！` });
      paramprops.value.getTableList!();
      show.value = false;
    } catch (error) {
      console.log(error);
    }
  });
};

let cvrList = ref<VideoStorage.ResList[]>([]);

defineExpose({
  acceptParams,
});
</script>
<style scoped lang="scss">
.el-input-number {
  width: 100%;
  :deep(.el-input__inner) {
    text-align: left;
  }
}
</style>
