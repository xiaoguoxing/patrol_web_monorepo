<template>
  <kr-public-dialog
    v-model="show"
    :title="`${paramprops.title}${$t('device.drone')}`"
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
      <el-form-item :label="$t('camera.droneName')" prop="droneName">
        <el-input
          v-model="paramprops.rowData!.droneName"
          :placeholder="$t('inputPlaceholder.placeholderBase') + $t('camera.droneName')"
          clearable
        ></el-input>
      </el-form-item>
      <el-form-item :label="$t('camera.droneStatus')" prop="droneStatus">
        <el-select v-model="paramprops.rowData!.droneStatus" clearable>
          <el-option
            v-for="(item, index) in typeDictlist"
            :key="index"
            :label="item.label"
            :value="item.value"
          ></el-option>
        </el-select>
      </el-form-item>
      <el-form-item :label="$t('common.ip')" prop="droneHost">
        <el-input
          v-model="paramprops.rowData!.droneHost"
          :placeholder="$t('inputPlaceholder.placeholderBase') + $t('common.ip')"
          clearable
        ></el-input>
      </el-form-item>
      <el-form-item :label="$t('common.port')" prop="dronePort">
        <el-input
          v-model="paramprops.rowData!.dronePort"
          :placeholder="$t('inputPlaceholder.placeholderBase') + $t('common.port')"
          clearable
        ></el-input>
      </el-form-item>
      <el-form-item :label="$t('inputPlaceholder.username')" prop="droneAccount">
        <el-input
          v-model="paramprops.rowData!.droneAccount"
          :placeholder="$t('inputPlaceholder.placeholderBase') + $t('inputPlaceholder.username')"
          clearable
        ></el-input>
      </el-form-item>
      <el-form-item :label="$t('inputPlaceholder.password')" prop="dronePassword">
        <el-input
          v-model="paramprops.rowData!.dronePassword"
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

      <el-form-item :label="$t('camera.topicCmd')" prop="topicCmd">
        <el-input
          v-model="paramprops.rowData!.topicCmd"
          :placeholder="$t('inputPlaceholder.placeholderBase') + $t('camera.topicCmd')"
          clearable
        ></el-input>
      </el-form-item>

      <el-form-item :label="$t('camera.topicCmdReply')" prop="topicCmdReply">
        <el-input
          v-model="paramprops.rowData!.topicCmdReply"
          :placeholder="$t('inputPlaceholder.placeholderBase') + $t('camera.topicCmdReply')"
          clearable
        ></el-input>
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
  droneName: [
    { required: true, message: t('inputPlaceholder.placeholderBase') + t('camera.droneName'), trigger: 'blur' },
  ],
  droneStatus: [
    { required: true, message: t('inputPlaceholder.placeholderSelect') + t('camera.droneStatus'), trigger: 'blur' },
  ],
  droneHost: [{ required: true, message: t('inputPlaceholder.placeholderBase') + t('common.ip'), trigger: 'blur' }],
  dronePort: [{ required: true, message: t('inputPlaceholder.placeholderBase') + t('common.port'), trigger: 'blur' }],
  droneAccount: [
    {
      required: true,
      message: t('inputPlaceholder.placeholderBase') + t('inputPlaceholder.username'),
      trigger: 'blur',
    },
  ],
  dronePassword: [
    {
      required: true,
      message: t('inputPlaceholder.placeholderBase') + t('inputPlaceholder.password'),
      trigger: 'blur',
    },
  ],
  topicCmd: [
    { required: true, message: t('inputPlaceholder.placeholderBase') + t('camera.topicCmd'), trigger: 'blur' },
  ],
  topicCmdReply: [
    { required: true, message: t('inputPlaceholder.placeholderBase') + t('camera.topicCmdReply'), trigger: 'blur' },
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
        dronePassword: await encryptPassword(paramprops.value.rowData.dronePassword),
        droneHost: await encryptPassword(paramprops.value.rowData.droneHost),
        droneAccount: await encryptPassword(paramprops.value.rowData.droneAccount),
      });
      ElMessage.success({ message: `${paramprops.value.title}${t('device.drone')}${t('buttonName.success')}！` });
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
