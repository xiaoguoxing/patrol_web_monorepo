<template>
  <kr-public-dialog
    v-model="show"
    :title="`${paramprops.title}无人机`"
    :singleClose="paramprops.isView"
    @doSubmit="handleSubmit"
    @doClose="show = false"
    width="30%"
  >
    <el-form
      v-if="show"
      ref="ruleFormRef"
      label-width="130px"
      label-suffix=" :"
      :rules="rules"
      :disabled="paramprops.isView"
      :model="paramprops.rowData"
      :hide-required-asterisk="paramprops.isView"
    >
      <el-form-item label="无人机名称" prop="droneName">
        <el-input v-model="paramprops.rowData!.droneName" placeholder="传感器名称" clearable></el-input>
      </el-form-item>
      <el-form-item label="无人机状态" prop="droneStatus">
        <el-select v-model="paramprops.rowData!.droneStatus" clearable>
          <el-option
            v-for="(item, index) in typeDictlist"
            :key="index"
            :label="item.label"
            :value="item.value"
          ></el-option>
        </el-select>
      </el-form-item>
      <el-form-item label="无人机IP地址" prop="droneHost">
        <el-input v-model="paramprops.rowData!.droneHost" placeholder="请输入IP地址" clearable></el-input>
      </el-form-item>
      <el-form-item label="无人机端口" prop="dronePort">
        <el-input v-model="paramprops.rowData!.dronePort" placeholder="请输入IP地址" clearable></el-input>
      </el-form-item>
      <el-form-item label="无人机用户名" prop="droneAccount">
        <el-input v-model="paramprops.rowData!.droneAccount" placeholder="请输入用户名" clearable></el-input>
      </el-form-item>
      <el-form-item label="无人机密码" prop="dronePassword">
        <el-input v-model="paramprops.rowData!.dronePassword" :type="passwordType" placeholder="请输入密码" clearable>
          <template #suffix>
            <el-icon @click="changeType" style="cursor: pointer">
              <View v-if="passwordType === 'password'" />
              <Hide v-else />
            </el-icon>
          </template>
        </el-input>
      </el-form-item>

      <el-form-item label="无人机命令下发" prop="topicCmd">
        <el-input v-model="paramprops.rowData!.topicCmd" placeholder="请输入无人机命令下发" clearable></el-input>
      </el-form-item>

      <el-form-item label="无人机命令响应" prop="topicCmdReply">
        <el-input v-model="paramprops.rowData!.topicCmdReply" placeholder="请输入无人机命令响应" clearable></el-input>
      </el-form-item>
    </el-form>
  </kr-public-dialog>
</template>
<script setup lang="ts" name="SignalDialog">
import { ref, reactive } from 'vue';
import { ElMessage, FormInstance } from 'element-plus';
import { encryptPassword } from '@/views/optCenter/deviceManage/camera/usePWA';
const rules = reactive({
  droneName: [{ required: true, message: '请输入无人机名称', trigger: 'blur' }],
  droneStatus: [{ required: true, message: '请选择无人机状态', trigger: 'blur' }],
  droneHost: [{ required: true, message: '请输入无人机IP地址', trigger: 'blur' }],
  dronePort: [{ required: true, message: '请输入无人机端口', trigger: 'blur' }],
  droneAccount: [{ required: true, message: '请输入无人机用户名', trigger: 'blur' }],
  dronePassword: [{ required: true, message: '请输入无人机密码', trigger: 'blur' }],
  topicCmd: [{ required: true, message: '请输入无人机命令下发', trigger: 'blur' }],
  topicCmdReply: [{ required: true, message: '请输入无人机命令响应', trigger: 'blur' }],
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
        dronePassword: await encryptPassword(paramprops.value.rowData.dronePassword),
        droneHost: await encryptPassword(paramprops.value.rowData.droneHost),
        droneAccount: await encryptPassword(paramprops.value.rowData.droneAccount),
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
