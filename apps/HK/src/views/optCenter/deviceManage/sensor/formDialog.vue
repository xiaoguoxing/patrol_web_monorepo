<template>
  <kr-public-dialog
    v-model="show"
    :title="`${paramprops.title}${$t('device.sensor')}`"
    :singleClose="paramprops.isView"
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
      :disabled="paramprops.isView"
      :model="paramprops.rowData"
      :hide-required-asterisk="paramprops.isView"
    >
      <el-form-item :label="$t('camera.deviceId')" prop="deviceId">
        <el-input-number
          v-model="paramprops.rowData!.deviceId"
          type="number"
          :max="99999"
          :min="1"
          controls-position="right"
          :placeholder="$t('camera.deviceIdPlaceholder')"
          clearable
        ></el-input-number>
      </el-form-item>
      <el-form-item :label="$t('camera.sensorName')" prop="sensorName">
        <el-input v-model="paramprops.rowData!.sensorName" :placeholder="$t('camera.sensorName')" clearable></el-input>
      </el-form-item>
      <el-form-item :label="$t('camera.sensorStatus')" prop="sensorStatus">
        <el-select v-model="paramprops.rowData!.sensorStatus" clearable>
          <el-option
            v-for="(item, index) in typeDictlist"
            :key="index"
            :label="item.label"
            :value="item.value"
          ></el-option>
        </el-select>
      </el-form-item>
      <el-form-item :label="$t('common.ip')" prop="sensorHost">
        <el-input
          v-model="paramprops.rowData!.sensorHost"
          :placeholder="$t('inputPlaceholder.placeholderBase') + $t('common.ip')"
          clearable
        ></el-input>
      </el-form-item>
      <el-form-item :label="$t('inputPlaceholder.username')" prop="sensorAccount">
        <el-input
          v-model="paramprops.rowData!.sensorAccount"
          :placeholder="$t('inputPlaceholder.placeholderBase') + $t('inputPlaceholder.username')"
          clearable
        ></el-input>
      </el-form-item>
      <el-form-item :label="$t('inputPlaceholder.password')" prop="sensorPassword">
        <el-input
          v-model="paramprops.rowData!.sensorPassword"
          :type="passwordType"
          :placeholder="$t('inputPlaceholder.placeholderBase') + $t('inputPlaceholder.password')"
          clearable
        >
          <template #suffix>
            <el-icon @click="changeType" style="cursor: pointer">
              <View v-if="passwordType === 'password'" />
              <Hide v-else />
            </el-icon>
          </template>
        </el-input>
      </el-form-item>
    </el-form>
  </kr-public-dialog>
</template>
<script setup lang="ts" name="SignalDialog">
import { ref, reactive } from 'vue';
import { ElMessage, FormInstance } from 'element-plus';
import { encryptPassword } from '@/views/optCenter/deviceManage/camera/usePWA';
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
const rules = reactive({
  deviceId: [
    { required: true, message: t('inputPlaceholder.placeholderBase') + t('camera.deviceId'), trigger: 'blur' },
  ],
  sensorName: [
    { required: true, message: t('inputPlaceholder.placeholderBase') + t('camera.sensorName'), trigger: 'blur' },
  ],
  sensorStatus: [
    { required: true, message: t('inputPlaceholder.placeholderSelect') + t('camera.sensorStatus'), trigger: 'blur' },
  ],
  sensorHost: [{ required: true, message: t('inputPlaceholder.placeholderBase') + t('common.ip'), trigger: 'blur' }],
  sensorAccount: [
    {
      required: true,
      message: t('inputPlaceholder.placeholderBase') + t('inputPlaceholder.username'),
      trigger: 'blur',
    },
  ],
  sensorPassword: [
    {
      required: true,
      message: t('inputPlaceholder.placeholderBase') + t('inputPlaceholder.password'),
      trigger: 'blur',
    },
  ],
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
let passwordType = ref('password');
function changeType() {
  passwordType.value = passwordType.value === 'password' ? 'text' : 'password';
}
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
      await paramprops.value.api!({
        ...paramprops.value.rowData,
        sensorPassword: await encryptPassword(paramprops.value.rowData.sensorPassword),
        sensorHost: await encryptPassword(paramprops.value.rowData.sensorHost),
        sensorAccount: await encryptPassword(paramprops.value.rowData.sensorAccount),
      });
      ElMessage.success({ message: `${paramprops.value.title}${t('device.sensor')}${t('buttonName.success')}！` });
      paramprops.value.getTableList!();
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
<style scoped lang="scss">
.el-input-number {
  width: 100%;
  :deep(.el-input__inner) {
    text-align: left;
  }
}
</style>
