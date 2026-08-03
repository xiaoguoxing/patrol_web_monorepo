<template>
  <kr-public-dialog
    v-model="show"
    :title="`${paramprops.title}告警`"
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
      <el-form-item label="告警名称" prop="alarmName">
        <el-input v-model="paramprops.rowData!.alarmName" placeholder="请输入告警名称"></el-input>
      </el-form-item>
      <el-form-item label="告警类型" prop="alarmType">
        <el-select v-model="paramprops.rowData!.alarmType" clearable>
          <el-option
            v-for="(item, index) in typeDictlist"
            :key="index"
            :label="item.label"
            :value="item.value"
          ></el-option>
        </el-select>
      </el-form-item>
      <el-form-item label="告警等级" prop="alarmLevel">
        <el-select v-model="paramprops.rowData!.alarmLevel" clearable>
          <el-option
            v-for="(item, index) in levelDictList"
            :key="index"
            :label="item.label"
            :value="item.value"
          ></el-option>
        </el-select>
      </el-form-item>
      <el-form-item label="弹框推送" prop="isPopup">
        <template #label="{ label }">
          <div>
            {{ label }}
            <el-tooltip
              content="弹框推送关闭，则告警发生时默认仅推送消息提醒；弹框推送开启，则告警发生时同步推送消息提醒和告警弹框。"
              effect="light"
              placement="right"
            >
              <el-icon>
                <Warning />
              </el-icon>
            </el-tooltip>
          </div>
        </template>
        <el-switch v-model="paramprops.rowData!.isPopup" :active-value="true" :inactive-value="false" />
      </el-form-item>
      <el-form-item label="告警属性" prop="alarmAttribute">
        <el-select v-model="paramprops.rowData!.alarmAttribute" @change="onAlarmAttrChange" clearable>
          <el-option label="状态类告警" value="state"></el-option>
          <el-option label="参数类告警" value="param"></el-option>
        </el-select>
      </el-form-item>
      <template v-if="paramprops.rowData.alarmAttribute == 'state'">
        <el-form-item
          v-for="(item,index) in paramprops.rowData!.alarmMentList"
          :label="`状态${index + 1}`"
          :prop="'alarmMentList.' + index + '.alarmMent'"
          :key="index"
          :rules="{
            required: true,
            message: '请输入状态名称',
            trigger: 'blur',
          }"
          class="alarmMent"
        >
          <el-input v-model="item.alarmMent" placeholder="请输入"></el-input>
          <el-button
            class="pl10"
            icon="Delete"
            type="primary"
            link
            @click.prevent="removeAlarmMent(item, index)"
          ></el-button>
        </el-form-item>
        <el-form-item class="alarmMent">
          <el-button class="pl0" icon="CirclePlus" type="primary" link @click.prevent="addAlarmMent()"
            >增加状态</el-button
          >
        </el-form-item>
      </template>
      <template v-if="paramprops.rowData.alarmAttribute == 'param'">
        <el-form-item
          label="告警指标"
          prop="alarmIndexId"
          :rules="{
            required: true,
            message: '请选择',
            trigger: 'change',
          }"
        >
          <el-select v-model="paramprops.rowData!.alarmIndexId" clearable>
            <el-option
              v-for="(item, index) in indexList"
              :key="index"
              :label="item.indexName"
              :value="item.id"
            ></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="">
          <el-icon>
            <Warning />
          </el-icon>
          找不到需要的告警指标？
          <el-button type="primary" link @click="openAlarmDrawer">去新增</el-button>
        </el-form-item>
      </template>
    </el-form>
  </kr-public-dialog>
</template>

<script setup lang="ts" name="AlarmDialog">
import { ref, reactive } from 'vue';
import { ElMessage, FormInstance } from 'element-plus';
import { Warning } from '@element-plus/icons-vue';
import type { Alarm } from '@/api/modules/optCenter/inspectionSet/alarm';
import { getIndexListApi } from '@/api/modules/optCenter/inspectionSet/alarm';
const emit = defineEmits(['openDrawer']);
const checkAlarmMentList = (rule: any, value: any, callback: any) => {
  if (paramprops.value.rowData.alarmAttribute == 'state' && (!value || value.length < 1)) {
    return callback(new Error('请增加状态'));
  }
};
const rules = reactive({
  alarmName: [{ required: true, message: '请输入告警名称', trigger: 'blur' }],
  alarmType: [{ required: true, message: '请选择告警类型', trigger: 'change' }],
  alarmLevel: [{ required: true, message: '请选择告警等级', trigger: 'change' }],
  isPopup: [{ required: true, message: '是否弹窗' }],
  alarmAttribute: [{ required: true, message: '请选择告警属性', trigger: 'change' }],
  alarmMentList: [{ validator: checkAlarmMentList, trigger: 'blur' }],
});

interface ParamProps {
  title: string;
  isView: boolean;
  rowData?: any;
  api?: (params: any) => Promise<any>;
  getTableList?: () => Promise<any>;
}
type dictOption = {
  label: string;
  value: string;
}[];
interface DialogProps {
  typeDictlist: dictOption;
  levelDictList: dictOption;
}
// 弹窗状态
const show = ref(false);
const paramprops = ref<ParamProps>({
  isView: false,
  title: '',
});
// 接受父组件参数，配置默认值
const props = withDefaults(defineProps<DialogProps>(), {
  typeDictlist: [] as any,
  levelDictList: [] as any,
});
// 接收父组件传过来的参数
const acceptParams = async (params: ParamProps): void => {
  paramprops.value = params;
  indexList.value = (await getIndexListApi()).data;
  show.value = true;
};

const openAlarmDrawer = () => {
  show.value = false;
  emit('openDrawer');
};
const onAlarmAttrChange = (val) => {
  if (val == 'state') {
    paramprops.value.rowData.alarmMentList = paramprops.value.rowData.alarmMentList || [];
  }
};
const addAlarmMent = () => {
  if (paramprops.value.rowData.alarmMentList.length < 15) {
    paramprops.value.rowData.alarmMentList.push({
      alarmMent: '',
    });
  } else {
    ElMessage.warning({ message: `状态最多可添加15个！` });
  }
};
const removeAlarmMent = (item, index: number) => {
  paramprops.value.rowData.alarmMentList.splice(index, 1);
};
// 提交数据（新增/编辑）
const ruleFormRef = ref<FormInstance>();
const handleSubmit = () => {
  ruleFormRef.value!.validate(async (valid) => {
    if (!valid) return;
    try {
      await paramprops.value.api!(paramprops.value.rowData);
      ElMessage.success({ message: `${paramprops.value.title}告警成功！` });
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
// 获取告警指标列表
const indexList = ref((await getIndexListApi()).data);
</script>
<style lang="scss" scoped>
.alarmMent {
  flex-grow: 1;
  width: 100%;
  margin-bottom: 18px;
  :deep(.el-form-item__content) {
    flex-flow: row nowrap;
  }
}
</style>
