<script setup lang="ts">
import {
  PageTypeTitle,
  Row,
  PageType,
  algorithmAdd,
  algorithmUpdate,
  algorithmDetail,
} from '@/api/modules/optCenter/Almanagement/AIModelManagement';
import { reactive, ref } from 'vue';
import { ElMessage, FormRules } from 'element-plus';
import { getDict, getDictForColumnFilters } from '@/utils/serviceDict';
interface Prop {
  id?: string;
  pageType: PageType;
}
const prop = withDefaults(defineProps<Prop>(), {});

//
interface Emit {
  (e: 'getList'): void;
}
const emit = defineEmits<Emit>();
const identifyType = 'identifyType';
let open = ref(false);
let identifyOptions = ref<any[]>([]);
async function openDialog() {
  open.value = true;
  identifyOptions.value = await getDict('algorithm_identify_type');
  await getDetail();
}

const ruleFormRef = ref();
let formRule = reactive<FormRules<Row>>({
  algorithmCode: [{ required: true, message: '请输入' }],
  algorithmName: [{ required: true, message: '请输入' }],
  algorithmPort: [{ required: true, message: '请输入' }],
  algorithmUrl: [{ required: true, message: '请输入' }],
  algorithmVersion: [{ required: true, message: '请输入' }],
  algorithmSkill: [{ required: false, message: '请输入' }],
  authenticationUrl: [{ required: true, message: '请输入' }],
  [identifyType]: [{ required: true, message: '请选择' }],
  runtimeEnvironment: [{ required: false, message: '请输入' }],
});
let formData = ref<Row>({
  id: '',
  algorithmPort: '',
  algorithmUrl: '',
  algorithmVersion: '',
  algorithmSkill: '',
  algorithmCode: '',
  algorithmName: '',
  authenticationUrl: '',
  runtimeEnvironment: '',
  [identifyType]: '',
  needBusiness: true,
  needMarked: false,
});
class formBase {
  id = '';
  algorithmPort = '';
  algorithmUrl = '';
  algorithmVersion = '';
  algorithmSkill = '';
  algorithmCode = '';
  algorithmName = '';
  [identifyType] = '';
  authenticationUrl = '';
  runtimeEnvironment = '';
  needBusiness = true;
  needMarked = false;
}
async function getDetail() {
  if (prop.id) {
    let res = await algorithmDetail({ id: prop.id });
    formData.value = res.data;
  } else {
    formData.value = new formBase();
  }
}

async function confirm() {
  await ruleFormRef.value?.validate();
  if (!prop.id) {
    await algorithmAdd(formData.value);
  } else {
    await algorithmUpdate(formData.value);
  }
  ElMessage.success(`${PageTypeTitle[prop.pageType!]}成功!`);
  emit('getList');
  close();
}
function close() {
  open.value = false;
}
defineExpose({ openDialog });
</script>

<template>
  <KrPublicDialog
    :title="PageTypeTitle[pageType!]"
    v-model="open"
    width="30%"
    ref="RulesFormDialogRef"
    @doSubmit="confirm"
    @doClose="close"
  >
    <el-form
      ref="ruleFormRef"
      label-width="120px"
      label-suffix=" :"
      :rules="formRule"
      :disabled="pageType === 'detail'"
      :model="formData"
      :hide-required-asterisk="pageType === 'detail'"
    >
      <el-form-item label="模型名称" prop="algorithmName">
        <el-input v-model="formData.algorithmName" placeholder="请输入模型名称" clearable></el-input>
      </el-form-item>
      <el-form-item label="模型ID" prop="algorithmCode">
        <el-input v-model="formData.algorithmCode" placeholder="请输入模型ID" clearable></el-input>
      </el-form-item>
      <el-form-item label="版本" prop="algorithmVersion">
        <el-input v-model="formData.algorithmVersion" placeholder="请输入版本" clearable></el-input>
      </el-form-item>
      <el-form-item label="关联技能" prop="algorithmSkill">
        <el-input v-model="formData.algorithmSkill" placeholder="请输入关联技能" clearable></el-input>
      </el-form-item>
      <el-form-item label="运行环境" prop="runtimeEnvironment">
        <el-input v-model="formData.runtimeEnvironment" placeholder="请输入运行环境" clearable></el-input>
      </el-form-item>
      <el-form-item label="算法URL" prop="algorithmUrl">
        <el-input v-model="formData.algorithmUrl" placeholder="请输入算法URL" clearable></el-input>
      </el-form-item>
      <el-form-item label="端口号" v-if="false" prop="algorithmPort">
        <el-input v-model="formData.algorithmPort" placeholder="请输入端口号" clearable></el-input>
      </el-form-item>
      <el-form-item label="识别类型" prop="identifyType">
        <el-select clearable v-model="formData[identifyType]">
          <el-option
            :value="item.value"
            :label="item.label"
            :key="item.value"
            v-for="item in identifyOptions"
          ></el-option>
        </el-select>
      </el-form-item>
      <el-form-item label="业务配置" prop="needBusiness">
        <el-radio-group text-color="#000" v-model="formData.needBusiness">
          <el-radio :value="true">是</el-radio>
          <el-radio :value="false">否</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="是否需要标注" prop="needBusiness">
        <el-radio-group text-color="#000" v-model="formData.needMarked">
          <el-radio :value="true">是</el-radio>
          <el-radio :value="false">否</el-radio>
        </el-radio-group>
      </el-form-item>
    </el-form>
  </KrPublicDialog>
</template>

<style scoped lang="scss"></style>
