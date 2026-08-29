<template>
  <kr-public-dialog
    v-model="show"
    :title="`${paramprops.title}${$t('camera.storageName')}`"
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
      <el-form-item :label="$t('camera.storageName')" prop="storageName">
        <el-input
          v-model="paramprops.rowData!.storageName"
          :placeholder="$t('inputPlaceholder.placeholderBase') + $t('camera.storageName')"
          clearable
        ></el-input>
      </el-form-item>
      <el-form-item :label="$t('camera.storageType')" prop="storageType">
        <el-select v-model="paramprops.rowData!.storageType" clearable>
          <el-option
            v-for="(item, index) in typeDictlist"
            :key="index"
            :label="item.label"
            :value="item.value"
          ></el-option>
        </el-select>
      </el-form-item>
      <el-form-item :label="$t('common.ip')" prop="storageHost">
        <el-input
          v-model="paramprops.rowData!.storageHost"
          :placeholder="$t('inputPlaceholder.placeholderBase') + $t('common.ip')"
          clearable
        ></el-input>
      </el-form-item>
      <el-form-item :label="$t('common.port')" prop="storagePort">
        <el-input
          v-model="paramprops.rowData!.storagePort"
          :placeholder="$t('inputPlaceholder.placeholderBase') + $t('common.port')"
          clearable
        ></el-input>
      </el-form-item>
      <el-form-item :label="$t('inputPlaceholder.username')" prop="storageAccount">
        <el-input
          v-model="paramprops.rowData!.storageAccount"
          :placeholder="$t('inputPlaceholder.placeholderBase') + $t('inputPlaceholder.username')"
          clearable
        ></el-input>
      </el-form-item>
      <el-form-item :label="$t('inputPlaceholder.password')" prop="storagePassword">
        <el-input
          v-model="paramprops.rowData!.storagePassword"
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

<script setup lang="ts" name="VideoStorageDialog">
import { ref, reactive, nextTick } from 'vue';
import { ElMessage, FormInstance } from 'element-plus';
import { encryptPassword } from '@/views/optCenter/deviceManage/camera/usePWA';
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
const rules = reactive({
  storageName: [{ required: true, message: t('inputPlaceholder.placeholderBase') + t('camera.storageName') }],
  storageType: [{ required: true, message: t('inputPlaceholder.placeholderSelect') + t('camera.storageType') }],
  storageHost: [{ required: true, message: t('inputPlaceholder.placeholderBase') + t('common.ip') }],
  storagePort: [{ required: true, message: t('inputPlaceholder.placeholderBase') + t('common.port') }],
  storageAccount: [{ required: true, message: t('inputPlaceholder.placeholderBase') + t('inputPlaceholder.username') }],
  storagePassword: [
    { required: true, message: t('inputPlaceholder.placeholderBase') + t('inputPlaceholder.password') },
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
      await paramprops.value.api!({
        ...paramprops.value.rowData,
        storagePassword: await encryptPassword(paramprops.value.rowData.storagePassword),
        storageHost: await encryptPassword(paramprops.value.rowData.storageHost),
        storageAccount: await encryptPassword(paramprops.value.rowData.storageAccount),
      });
      ElMessage.success({ message: `${paramprops.value.title}${t('camera.storageName')}${t('buttonName.success')}！` });
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
