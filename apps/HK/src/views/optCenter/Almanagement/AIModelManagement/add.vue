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
import { useI18n } from 'vue-i18n';
const { t, locale } = useI18n();
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
  algorithmCode: [{ required: true, message: t('inputPlaceholder.placeholderBase') }],
  algorithmName: [{ required: true, message: t('inputPlaceholder.placeholderBase') }],
  algorithmPort: [{ required: true, message: t('inputPlaceholder.placeholderBase') }],
  algorithmUrl: [{ required: true, message: t('inputPlaceholder.placeholderBase') }],
  algorithmVersion: [{ required: true, message: t('inputPlaceholder.placeholderBase') }],
  algorithmSkill: [{ required: false, message: t('inputPlaceholder.placeholderBase') }],
  authenticationUrl: [{ required: true, message: t('inputPlaceholder.placeholderBase') }],
  [identifyType]: [{ required: true, message: t('inputPlaceholder.placeholderSelect') }],
  runtimeEnvironment: [{ required: false, message: t('inputPlaceholder.placeholderBase') }],
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
  ElMessage.success(`${PageTypeTitle[prop.pageType!]}${t('buttonName.success')}!`);
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
      :label-width="locale === 'en' ? '180px' : '120px'"
      label-suffix=" :"
      :rules="formRule"
      :disabled="pageType === 'detail'"
      :model="formData"
      :hide-required-asterisk="pageType === 'detail'"
    >
      <el-form-item :label="$t('model.algorithmName')" prop="algorithmName">
        <el-input
          v-model="formData.algorithmName"
          :placeholder="$t('inputPlaceholder.placeholderBase') + $t('model.algorithmName')"
          clearable
        ></el-input>
      </el-form-item>
      <el-form-item :label="$t('model.algorithmCode')" prop="algorithmCode">
        <el-input
          v-model="formData.algorithmCode"
          :placeholder="$t('inputPlaceholder.placeholderBase') + $t('model.algorithmCode')"
          clearable
        ></el-input>
      </el-form-item>
      <el-form-item :label="$t('model.algorithmVersion')" prop="algorithmVersion">
        <el-input
          v-model="formData.algorithmVersion"
          :placeholder="$t('inputPlaceholder.placeholderBase') + $t('model.algorithmVersion')"
          clearable
        ></el-input>
      </el-form-item>
      <el-form-item :label="$t('linkageSet.relatedSkills')" prop="algorithmSkill">
        <el-input
          v-model="formData.algorithmSkill"
          :placeholder="$t('inputPlaceholder.placeholderBase') + $t('linkageSet.relatedSkills')"
          clearable
        ></el-input>
      </el-form-item>
      <el-form-item :label="$t('model.runtimeEnvironment')" prop="runtimeEnvironment">
        <el-input
          v-model="formData.runtimeEnvironment"
          :placeholder="$t('inputPlaceholder.placeholderBase') + $t('model.runtimeEnvironment')"
          clearable
        ></el-input>
      </el-form-item>
      <el-form-item :label="t('model.algorithmUrl')" prop="algorithmUrl">
        <el-input
          v-model="formData.algorithmUrl"
          :placeholder="$t('inputPlaceholder.placeholderBase') + t('model.algorithmUrl')"
          clearable
        ></el-input>
      </el-form-item>
      <el-form-item label="端口号" v-if="false" prop="algorithmPort">
        <el-input v-model="formData.algorithmPort" placeholder="请输入端口号" clearable></el-input>
      </el-form-item>
      <el-form-item :label="$t('model.identifyType')" prop="identifyType">
        <el-select clearable v-model="formData[identifyType]">
          <el-option
            :value="item.value"
            :label="item.label"
            :key="item.value"
            v-for="item in identifyOptions"
          ></el-option>
        </el-select>
      </el-form-item>
      <el-form-item :label="$t('model.needBusiness')" prop="needBusiness">
        <el-radio-group text-color="#000" v-model="formData.needBusiness">
          <el-radio :value="true">{{ $t('common.s') }}</el-radio>
          <el-radio :value="false">{{ $t('common.f') }}</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item :label="$t('model.needMarked')" prop="needMarked">
        <el-radio-group text-color="#000" v-model="formData.needMarked">
          <el-radio :value="true">{{ $t('common.s') }}</el-radio>
          <el-radio :value="false">{{ $t('common.f') }}</el-radio>
        </el-radio-group>
      </el-form-item>
    </el-form>
  </KrPublicDialog>
</template>

<style scoped lang="scss"></style>
