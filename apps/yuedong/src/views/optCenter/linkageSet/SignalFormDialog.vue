<template>
  <kr-public-dialog
    v-model="show"
    :title="`${props.title}联动信号`"
    :singleClose="props.isView"
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
      :disabled="props.isView"
      :model="props.rowData"
      :hide-required-asterisk="props.isView"
    >
      <el-form-item label="联动点位" prop="linkageSignalCode">
        <!--        <el-input v-model="props.rowData!.linkageSignalCode" placeholder="请输入联动信号编码" clearable></el-input>-->
        <el-select-v2
          v-model="props.rowData!.linkageSignalCode"
          :options="scadaList"
          :props="{ value: 'code', label: 'name' }"
          filterable
          clearable
          :disabled="props.title === '编辑'"
          @change="scadaChange"
        >
          <!--                <el-option :label="item.name" :value="item.code" :key="item.id" v-for="item in scadaList"></el-option>-->
        </el-select-v2>
      </el-form-item>
      <el-form-item label="联动信号名称" prop="linkageSignalName">
        <el-input v-model="props.rowData!.linkageSignalName" placeholder="请输入联动信号名称" clearable></el-input>
      </el-form-item>
      <el-form-item label="标准值" prop="standardValue">
        <div class="el-input el-input--default el-input--suffix">
          <div class="el-input__wrapper">
            <input
              class="el-input__inner"
              type="number"
              id="standardValue"
              v-model="props.rowData!.standardValue"
              placeholder="请输入标准值"
            />
          </div>
        </div>
      </el-form-item>
      <el-form-item label="巡检模式" prop="executeMode">
        <el-select v-model="props.rowData!.executeMode" clearable>
          <el-option label="顺序执行" value="serial"></el-option>
          <el-option label="并行执行" value="parallel"></el-option>
        </el-select>
      </el-form-item>
    </el-form>
  </kr-public-dialog>
</template>

<script setup lang="ts" name="SignalDialog">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, FormInstance } from 'element-plus';
import { getScadaInfoApi } from '@/api/modules/optCenter/aiPatrolManage/position';

const rules = reactive({
  linkageSignalName: [{ required: true, message: '请输入联动信号名称', trigger: 'blur' }],
  linkageSignalCode: [{ required: true, message: '请输入联动信号编码', trigger: 'blur' }],
  standardValue: [{ required: true, message: '请输入标准值', trigger: 'blur' }],
  executeMode: [{ required: true, message: '请选择巡检模式', trigger: 'blur' }],
});

interface DialogProps {
  title: string;
  isView: boolean;
  rowData?: any;
  api?: (params: any) => Promise<any>;
  getList?: () => Promise<any>;
}

// 弹窗状态
const show = ref(false);
const props = ref<DialogProps>({
  isView: false,
  title: '',
});

// 接收父组件传过来的参数
const acceptParams = (params: DialogProps): void => {
  props.value = params;
  show.value = true;
};

const scadaList = ref<any[]>([]);
onMounted(() => {
  getAIList();
});
function getAIList() {
  getScadaInfoApi().then((res) => {
    scadaList.value = res.data;
  });
}
async function scadaChange(val: string) {
  if (val) {
    let obj = scadaList.value.find((i) => i.code == val);
    props.value.rowData!.linkageSignalName = obj.name;
  } else {
    props.value.rowData!.linkageSignalName = '';
    props.value.rowData!.linkageSignalName = '';
  }
}
// 提交数据（新增/编辑）
const ruleFormRef = ref<FormInstance>();
const handleSubmit = () => {
  ruleFormRef.value!.validate(async (valid) => {
    if (!valid) return;
    try {
      await props.value.api!(props.value.rowData);
      ElMessage.success({ message: `${props.value.title}联动信号成功！` });
      props.value.getList!();
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
<style scoped lang="scss"></style>
