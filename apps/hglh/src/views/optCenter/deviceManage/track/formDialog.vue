<template>
  <kr-public-dialog
    v-model="show"
    :title="`${paramprops.title}轨道机器人`"
    :singleClose="paramprops.isView"
    @doSubmit="handleSubmit"
    @doClose="show = false"
    width="30%"
  >
    <el-form
      v-if="show"
      ref="ruleFormRef"
      label-width="150px"
      label-suffix=" :"
      :rules="rules"
      :disabled="paramprops.isView"
      :model="paramprops.rowData"
      :hide-required-asterisk="paramprops.isView"
    >
      <el-form-item label="轨道机器人名称" prop="robotName">
        <el-input v-model="paramprops.rowData!.robotName" placeholder="轨道机器人名称" clearable></el-input>
      </el-form-item>
      <el-form-item label="轨道机器人IP地址" prop="robotHost">
        <el-input v-model="paramprops.rowData!.robotHost" placeholder="请输入IP地址" clearable></el-input>
      </el-form-item>
      <el-form-item label="轨道机器人AK码" prop="appKey">
        <el-input v-model="paramprops.rowData!.appKey" placeholder="请输入轨道机器人AK码" clearable></el-input>
      </el-form-item>
      <el-form-item label="轨道机器人SK码" prop="appSecret">
        <el-input v-model="paramprops.rowData!.appSecret" placeholder="请输入轨道机器人SK码" clearable></el-input>
      </el-form-item>
      <el-form-item label="关联图片存储设备" prop="attachmentStorageId">
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
const rules = reactive({
  robotName: [{ required: true, message: '请选择轨道机器人名称', trigger: 'blur' }],
  appKey: [{ required: true, message: '请输入端口', trigger: 'blur' }],
  robotHost: [{ required: true, message: '请输入轨道机器人IP地址', trigger: 'blur' }],
  appSecret: [{ required: true, message: '请输入轨道机器人用户名', trigger: 'blur' }],
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
      if (paramprops.value.title !== '编辑') {
        paramprops.value.rowData.areaId = paramprops.value.areaData.id;
        paramprops.value.rowData.areaName = paramprops.value.areaData.areaName;
      }
      await paramprops.value.api!(paramprops.value.rowData);
      ElMessage.success({ message: `${paramprops.value.title}轨道机器人成功！` });
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
