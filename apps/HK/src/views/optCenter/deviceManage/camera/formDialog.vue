<template>
  <kr-public-dialog
    v-model="show"
    :title="`${paramprops.title}${$t('device.camera')}`"
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
      <el-form-item :label="$t('camera.cameraName')" prop="cameraName">
        <el-input
          v-model="paramprops.rowData!.cameraName"
          :placeholder="$t('inputPlaceholder.placeholderBase') + $t('camera.cameraName')"
          clearable
        ></el-input>
      </el-form-item>
      <el-form-item :label="$t('camera.cameraType')" prop="cameraType">
        <el-select v-model="paramprops.rowData!.cameraType" clearable>
          <el-option
            v-for="(item, index) in typeDictlist"
            :key="index"
            :label="item.label"
            :value="item.value"
          ></el-option>
        </el-select>
      </el-form-item>
      <el-form-item :label="$t('common.ip')" prop="cameraHost">
        <el-input
          v-model="paramprops.rowData!.cameraHost"
          :placeholder="$t('inputPlaceholder.placeholderBase') + $t('common.ip')"
          clearable
        ></el-input>
      </el-form-item>
      <el-form-item :label="$t('common.port')" prop="cameraPort">
        <el-input
          v-model="paramprops.rowData!.cameraPort"
          :placeholder="$t('inputPlaceholder.placeholderBase') + $t('common.port')"
          clearable
        ></el-input>
      </el-form-item>
      <el-form-item :label="$t('camera.channelNum')" prop="channelNum">
        <el-input-number
          v-model="paramprops.rowData!.channelNum"
          :placeholder="$t('inputPlaceholder.placeholderBase') + $t('camera.channelNum')"
          clearable
          controls-position="right"
        />
        <!-- <el-input v-model="paramprops.rowData!.channelNum" placeholder="请输入通道号" clearable></el-input> -->
      </el-form-item>
      <el-form-item :label="$t('inputPlaceholder.username')" prop="cameraAccount">
        <el-input
          v-model="paramprops.rowData!.cameraAccount"
          :placeholder="$t('inputPlaceholder.placeholderBase') + $t('inputPlaceholder.username')"
          clearable
        ></el-input>
      </el-form-item>
      <el-form-item :label="$t('inputPlaceholder.password')" prop="cameraPassword">
        <el-input
          v-model="paramprops.rowData!.cameraPassword"
          :type="passwordType"
          :placeholder="$t('inputPlaceholder.placeholderBase') + $t('inputPlaceholder.password')"
        >
          <template #suffix>
            <el-icon @click="changeType" style="cursor: pointer">
              <View v-if="passwordType === 'password'" />
              <Hide v-else />
            </el-icon>
          </template>
        </el-input>
      </el-form-item>
      <el-form-item :label="$t('camera.storageId')" prop="storageId">
        <el-select v-model="paramprops.rowData!.storageId" clearable>
          <el-option v-for="i in cvrList" :key="i.id" :label="i.storageName" :value="i.id"></el-option>
        </el-select>
      </el-form-item>
      <el-form-item :label="$t('camera.attachmentStorageId')" prop="attachmentStorageId">
        <el-select v-model="paramprops.rowData!.attachmentStorageId" clearable>
          <el-option v-for="i in cvrList" :key="i.id" :label="i.storageName" :value="i.id"></el-option>
        </el-select>
      </el-form-item>
      <el-form-item :label="$t('camera.setPreset')" prop="setPreset">
        <el-radio-group text-color="#000" v-model="paramprops.rowData!.setPreset">
          <el-radio :value="true">{{ $t('common.s') }}</el-radio>
          <el-radio :value="false">{{ $t('common.f') }}</el-radio>
        </el-radio-group>
      </el-form-item>
    </el-form>
  </kr-public-dialog>
</template>
<script setup lang="ts">
defineOptions({
  name: 'SignalDialog',
});
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, FormInstance } from 'element-plus';
import { getAllListApi, VideoStorage } from '@/api/modules/optCenter/deviceManage/videoStorage';
import { encryptPassword } from '@/views/optCenter/deviceManage/camera/usePWA';
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
const rules = reactive({
  cameraName: [
    { required: true, message: t('inputPlaceholder.placeholderBase') + t('camera.cameraName'), trigger: 'blur' },
  ],
  cameraType: [
    { required: true, message: t('inputPlaceholder.placeholderSelect') + t('camera.cameraType'), trigger: 'blur' },
  ],
  cameraHost: [{ required: true, message: t('inputPlaceholder.placeholderBase') + t('common.ip'), trigger: 'blur' }],
  cameraPort: [{ required: true, message: t('inputPlaceholder.placeholderBase') + t('common.port'), trigger: 'blur' }],
  channelNum: [
    { required: true, message: t('inputPlaceholder.placeholderBase') + t('camera.channelNum'), trigger: 'blur' },
  ],
  cameraAccount: [
    {
      required: true,
      message: t('inputPlaceholder.placeholderBase') + t('inputPlaceholder.username'),
      trigger: 'blur',
    },
  ],
  cameraPassword: [
    {
      required: true,
      message: t('inputPlaceholder.placeholderBase') + t('inputPlaceholder.password'),
      trigger: 'blur',
    },
  ],
  storageId: [
    { required: false, message: t('inputPlaceholder.placeholderSelect') + t('camera.storageId'), trigger: 'blur' },
  ],
  attachmentStorageId: [
    {
      required: false,
      message: t('inputPlaceholder.placeholderSelect') + t('camera.attachmentStorageId'),
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
onMounted(async () => {
  let res = await getAllListApi();
  cvrList.value = res.data;
});
let passwordType = ref('password');
function changeType() {
  passwordType.value = passwordType.value === 'password' ? 'text' : 'password';
}
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
let cvrList = ref<VideoStorage.ResList[]>([]);
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
      if (paramprops.value.title !== t('buttonName.edit'))
        paramprops.value.rowData.areaId = paramprops.value.areaData.id;
      await paramprops.value.api!({
        ...paramprops.value.rowData,
        cameraPassword: await encryptPassword(paramprops.value.rowData.cameraPassword),
        cameraHost: await encryptPassword(paramprops.value.rowData.cameraHost),
        cameraAccount: await encryptPassword(paramprops.value.rowData.cameraAccount),
      });
      ElMessage.success({ message: `${paramprops.value.title}${t('device.camera')}${t('buttonName.success')}！` });
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
