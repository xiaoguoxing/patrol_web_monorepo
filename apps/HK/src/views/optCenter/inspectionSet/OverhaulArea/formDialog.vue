<template>
  <kr-public-dialog
    v-model="show"
    :title="`${props.title}${$t('overHaulArea.overHaulAreaName')}`"
    :singleClose="props.isView"
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
      :disabled="props.isView"
      :model="props.rowData"
      :hide-required-asterisk="props.isView"
    >
      <el-form-item :label="$t('overHaulArea.object')" prop="objectIdList">
        <el-tree-select
          v-model="props.rowData!.objectIdList"
          :data="data"
          :props="{ label: 'nodeName', value: 'id' }"
          multiple
          node-key="id"
          :disabled="props.title === $t('buttonName.edit')"
          :render-after-expand="false"
          show-checkbox
        />
      </el-form-item>
      <el-form-item :label="$t('overHaulArea.jxTime')" prop="startTime">
        <el-date-picker
          v-model="timesArr"
          type="datetimerange"
          :range-separator="$t('input.rangeSeparator')"
          :start-placeholder="$t('input.sTime')"
          :end-placeholder="$t('input.eTime')"
          format="YYYY-MM-DD HH:mm:ss"
          value-format="YYYY-MM-DD HH:mm:ss"
          time-format="HH:mm:ss"
          @change="dateChange"
        />
      </el-form-item>
    </el-form>
  </kr-public-dialog>
</template>

<script setup lang="ts" name="ObjFormDialog">
import { ref, reactive } from 'vue';
import { ElMessage, FormInstance } from 'element-plus';
import { getObjectTreeApi } from '@/api/modules/optCenter/inspectionSet/OverhaulArea';
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
const rules = reactive({
  objectIdList: [
    {
      required: true,
      type: 'array',
      message: t('inputPlaceholder.placeholderSelect') + t('overHaulArea.object'),
    },
  ],
  startTime: [{ required: true, message: t('inputPlaceholder.placeholderSelect') + t('overHaulArea.jxTime') }],
});
interface DialogProps {
  title: string;
  isView: boolean;
  areaData?: any;
  rowData?: any;
  api?: (params: any) => Promise<any>;
  getTableList?: () => Promise<any>;
}
// 弹窗状态
const show = ref(false);
const props = ref<DialogProps>({
  isView: false,
  title: '',
});
// 接收父组件传过来的参数
const acceptParams = async (params: DialogProps): Promise<void> => {
  props.value = params;
  props.value.rowData.objectIdList = params.rowData.objectId ? [params.rowData.objectId] : [];
  timesArr.value = [params.rowData?.startTime ?? '', params.rowData?.endTime ?? ''];
  let res = await getObjectTreeApi({ areaId: params.rowData.areaId });
  data.value = res.data;
  show.value = true;
};
// 提交数据（新增/编辑）
let timesArr = ref([]);
const data = ref<any>([]);
const ruleFormRef = ref<FormInstance>();
const handleSubmit = () => {
  ruleFormRef.value!.validate(async (valid) => {
    if (!valid) return;
    try {
      await props.value.api!(props.value.rowData);
      ElMessage.success({
        message: `${props.value.title}${t('overHaulArea.overHaulAreaName')}${t('buttonName.success')}！`,
      });
      props.value.getTableList!();
      show.value = false;
    } catch (error) {
      console.log(error);
    }
  });
};
function dateChange(val: [string, string]) {
  props.value.rowData!.startTime = val[0];
  props.value.rowData!.endTime = val[1];
}
defineExpose({
  acceptParams,
});
</script>
