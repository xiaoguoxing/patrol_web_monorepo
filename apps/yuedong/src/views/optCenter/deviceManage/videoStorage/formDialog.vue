<template>
  <kr-public-dialog
    v-model="show"
    :title="`${paramprops.title} 存储设备`"
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
      <el-form-item label=" 存储设备名称" prop="storageName">
        <el-input v-model="paramprops.rowData!.storageName" placeholder="请输入 存储设备名称" clearable></el-input>
      </el-form-item>
      <el-form-item label=" 设备类型" prop="storageType">
        <el-select v-model="paramprops.rowData!.storageType" clearable>
          <el-option
            v-for="(item, index) in typeDictlist"
            :key="index"
            :label="item.label"
            :value="item.value"
          ></el-option>
        </el-select>
      </el-form-item>
      <el-form-item label="IP地址" prop="storageHost">
        <el-input v-model="paramprops.rowData!.storageHost" placeholder="请输入IP地址" clearable></el-input>
      </el-form-item>
      <el-form-item label="端口号" prop="storagePort">
        <el-input v-model="paramprops.rowData!.storagePort" placeholder="请输入端口号" clearable></el-input>
      </el-form-item>
      <el-form-item label="用户名" prop="storageAccount">
        <el-input v-model="paramprops.rowData!.storageAccount" placeholder="请输入用户名" clearable></el-input>
      </el-form-item>
      <el-form-item label="密码" prop="storagePassword">
        <el-input v-model="paramprops.rowData!.storagePassword" :type="passwordType" placeholder="请输入密码" clearable>
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

<script setup lang="ts" name="VideoStorageDialog">
import { ref, reactive, nextTick } from 'vue';
import { ElMessage, FormInstance } from 'element-plus';
const rules = reactive({
  storageName: [{ required: true, message: '请输入 存储设备名称' }],
  storageType: [{ required: true, message: '请选择 存储设备类型' }],
  storageHost: [{ required: true, message: '请输入IP地址' }],
  storagePort: [{ required: true, message: '请输入端口号' }],
  storageAccount: [{ required: true, message: '请输入用户名' }],
  storagePassword: [{ required: true, message: '请输入密码' }],
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
let passwordType = ref('password');
function changeType() {
  passwordType.value = passwordType.value === 'password' ? 'text' : 'password';
}
// 弹窗状态
const show = ref(false);
interface ParamProps {
  title: string;
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
      await paramprops.value.api!(paramprops.value.rowData);
      ElMessage.success({ message: `${paramprops.value.title} 存储设备成功！` });
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
