<template>
  <kr-public-dialog
    v-model="show"
    :title="`${paramprops.title}摄像头`"
    :singleClose="paramprops.isView"
    @doSubmit="handleSubmit"
    @doClose="show = false"
    width="30%"
  >
    <el-form
      v-if="show"
      ref="ruleFormRef"
      label-width="140px"
      label-suffix=" :"
      :rules="rules"
      :disabled="paramprops.isView"
      :model="paramprops.rowData"
      :hide-required-asterisk="paramprops.isView"
    >
      <el-form-item label="摄像头名称" prop="cameraName">
        <el-input v-model="paramprops.rowData!.cameraName" placeholder="请输入摄像头名称" clearable></el-input>
      </el-form-item>
      <el-form-item label="摄像头类型" prop="cameraType">
        <el-select v-model="paramprops.rowData!.cameraType" clearable>
          <el-option
            v-for="(item, index) in typeDictlist"
            :key="index"
            :label="item.label"
            :value="item.value"
          ></el-option>
        </el-select>
      </el-form-item>
      <el-form-item label="IP地址" prop="cameraHost" v-if="false">
        <el-input v-model="paramprops.rowData!.cameraHost" placeholder="请输入IP地址" clearable></el-input>
      </el-form-item>
      <el-form-item label="端口号" prop="cameraPort" v-if="false">
        <el-input v-model="paramprops.rowData!.cameraPort" placeholder="请输入端口号" clearable></el-input>
      </el-form-item>
      <el-form-item label="通道号" prop="channelNum">
        <el-input-number
          v-model="paramprops.rowData!.channelNum"
          placeholder="请输入通道号"
          clearable
          controls-position="right"
        />
        <!-- <el-input v-model="paramprops.rowData!.channelNum" placeholder="请输入通道号" clearable></el-input> -->
      </el-form-item>
      <el-form-item label="用户名" prop="cameraAccount" v-if="false">
        <el-input v-model="paramprops.rowData!.cameraAccount" placeholder="请输入用户名" clearable></el-input>
      </el-form-item>
      <el-form-item label="密码" prop="cameraPassword" v-if="false">
        <el-input v-model="paramprops.rowData!.cameraPassword" :type="passwordType" placeholder="请输入密码">
          <template #suffix>
            <el-icon @click="changeType" style="cursor: pointer">
              <View v-if="passwordType === 'password'" />
              <Hide v-else />
            </el-icon>
          </template>
        </el-input>
      </el-form-item>
      <el-form-item label="关联视频存储设备" prop="storageId" v-if="false">
        <el-select v-model="paramprops.rowData!.storageId" clearable>
          <el-option v-for="i in cvrList" :key="i.id" :label="i.storageName" :value="i.id"></el-option>
        </el-select>
      </el-form-item>
      <el-form-item label="关联图片存储设备" prop="attachmentStorageId">
        <el-select v-model="paramprops.rowData!.attachmentStorageId" clearable>
          <el-option v-for="i in cvrList" :key="i.id" :label="i.storageName" :value="i.id"></el-option>
        </el-select>
      </el-form-item>
      <el-form-item label="是否支持预置位" prop="setPreset">
        <el-radio-group text-color="#000" v-model="paramprops.rowData!.setPreset">
          <el-radio :value="true">是</el-radio>
          <el-radio :value="false">否</el-radio>
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
const rules = reactive({
  cameraName: [{ required: true, message: '请输入摄像头名称', trigger: 'blur' }],
  cameraType: [{ required: true, message: '请选择摄像头类型', trigger: 'blur' }],
  cameraHost: [{ required: true, message: '请输入IP地址', trigger: 'blur' }],
  cameraPort: [{ required: true, message: '请输入端口号', trigger: 'blur' }],
  channelNum: [{ required: true, message: '请输入通道号', trigger: 'blur' }],
  cameraAccount: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  cameraPassword: [{ required: true, message: '请输入密码', trigger: 'blur' }],
  storageId: [{ required: false, message: '请选择CVR', trigger: 'blur' }],
  attachmentStorageId: [{ required: false, message: '请选择CVR', trigger: 'blur' }],
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
      if (paramprops.value.title !== '编辑') paramprops.value.rowData.areaId = paramprops.value.areaData.id;
      await paramprops.value.api!(paramprops.value.rowData);
      ElMessage.success({ message: `${paramprops.value.title}摄像头成功！` });
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
