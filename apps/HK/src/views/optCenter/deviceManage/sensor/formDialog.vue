<template>
  <kr-public-dialog
    v-model="show"
    :title="`${paramprops.title}传感器`"
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
      <el-form-item label="设备ID号" prop="deviceId">
        <el-input-number
          v-model="paramprops.rowData!.deviceId"
          type="number"
          :max="99999"
          :min="1"
          controls-position="right"
          placeholder="输入范围:1~99999"
          clearable
        ></el-input-number>
      </el-form-item>
      <el-form-item label="传感器名称" prop="sensorName">
        <el-input v-model="paramprops.rowData!.sensorName" placeholder="传感器名称" clearable></el-input>
      </el-form-item>
      <el-form-item label="传感器状态" prop="sensorStatus">
        <el-select v-model="paramprops.rowData!.sensorStatus" clearable>
          <el-option
            v-for="(item, index) in typeDictlist"
            :key="index"
            :label="item.label"
            :value="item.value"
          ></el-option>
        </el-select>
      </el-form-item>
      <el-form-item label="传感器IP地址" prop="sensorHost">
        <el-input v-model="paramprops.rowData!.sensorHost" placeholder="请输入IP地址" clearable></el-input>
      </el-form-item>
      <el-form-item label="传感器用户名" prop="sensorAccount">
        <el-input v-model="paramprops.rowData!.sensorAccount" placeholder="请输入用户名" clearable></el-input>
      </el-form-item>
      <el-form-item label="传感器密码" prop="sensorPassword">
        <el-input v-model="paramprops.rowData!.sensorPassword" :type="passwordType" placeholder="请输入密码" clearable>
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
const rules = reactive({
  deviceId: [{ required: true, message: '请输入设备ID号', trigger: 'blur' }],
  sensorName: [{ required: true, message: '请选择传感器名称', trigger: 'blur' }],
  sensorStatus: [{ required: true, message: '请输入传感器状态', trigger: 'blur' }],
  sensorHost: [{ required: true, message: '请输入传感器IP地址', trigger: 'blur' }],
  sensorAccount: [{ required: true, message: '请输入传感器用户名', trigger: 'blur' }],
  sensorPassword: [{ required: true, message: '请输入传感器密码', trigger: 'blur' }],
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
      if (paramprops.value.title !== '编辑') {
        paramprops.value.rowData.areaId = paramprops.value.areaData.id;
        paramprops.value.rowData.areaName = paramprops.value.areaData.areaName;
      }
      await paramprops.value.api!({
        ...paramprops.value.rowData,
        sensorPassword: await encryptPassword(paramprops.value.rowData.sensorPassword),
        sensorHost: await encryptPassword(paramprops.value.rowData.sensorHost),
        sensorAccount: await encryptPassword(paramprops.value.rowData.sensorAccount),
      });
      ElMessage.success({ message: `${paramprops.value.title}传感器成功！` });
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
