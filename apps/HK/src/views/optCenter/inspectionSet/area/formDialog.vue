<template>
  <kr-public-dialog
    v-model="show"
    :title="`${props.title}${$t('overHaulArea.object')}`"
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
      <el-form-item :label="$t('overHaulArea.objectCode')" prop="objectCode">
        <el-input v-model="props.rowData!.objectCode" disabled :placeholder="$t('overHaulArea.autoPrint')"></el-input>
      </el-form-item>
      <el-form-item :label="$t('aiInspection.objectName')" prop="objectName">
        <el-input
          v-model="props.rowData!.objectName"
          :placeholder="$t('inputPlaceholder.placeholderBase') + $t('aiInspection.objectName')"
        ></el-input>
      </el-form-item>
      <!-- 巡检视角配置：点击进入 3D 场景，选中设备并调整角度后保存 -->
      <el-form-item label="巡检视角">
        <div class="obj-vp-cell">
          <el-button v-if="!props.isView" type="primary" plain :icon="Aim" @click="viewpointDialogVisible = true">
            {{ viewpoint ? '重新配置' : '配置视角' }}
          </el-button>
          <span v-if="viewpoint" class="obj-vp-cell__status">
            <i class="obj-vp-cell__dot"></i>
            已配置：{{ viewpoint.modelId }}
          </span>
          <span v-else class="obj-vp-cell__empty">未配置（巡检时使用默认视角）</span>
          <el-button v-if="viewpoint && !props.isView" link type="danger" @click="clearViewpoint">清除</el-button>
        </div>
      </el-form-item>
    </el-form>
    <viewpointDialog
      v-model="viewpointDialogVisible"
      :object-name="props.rowData?.objectName"
      :view-point="viewpoint"
      @saved="handleViewpointSaved"
    />
  </kr-public-dialog>
</template>

<script setup lang="ts" name="ObjFormDialog">
import { ref, reactive, computed } from 'vue';
import { ElMessage, FormInstance } from 'element-plus';
import { useI18n } from 'vue-i18n';
import { Aim } from '@element-plus/icons-vue';
import viewpointDialog from '@appCenter/components/viewpoint/viewpointDialog.vue';
import type { ViewpointData } from '@appCenter/components/viewpoint/ViewpointPicker';
const { t } = useI18n();
const rules = reactive({
  objectName: [{ required: true, message: t('inputPlaceholder.placeholderBase') + t('aiInspection.objectName') }],
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
const acceptParams = (params: DialogProps): void => {
  props.value = params;
  show.value = true;
};

// 提交数据（新增/编辑），viewpoint 视角字段随 rowData 一并提交
const ruleFormRef = ref<FormInstance>();
const handleSubmit = () => {
  ruleFormRef.value!.validate(async (valid) => {
    if (!valid) return;
    try {
      await props.value.api!(props.value.rowData);
      ElMessage.success({ message: `${props.value.title}${t('overHaulArea.object')}${t('buttonName.success')}！` });
      props.value.getTableList!();
      show.value = false;
    } catch (error) {
      console.log(error);
    }
  });
};

// ---------- 巡检视角配置 ----------
const viewpointDialogVisible = ref(false);
const viewpoint = computed<ViewpointData | undefined>(() => props.value.rowData?.viewpoint);

/** 3D 场景中保存视角：写入当前巡检对象 */
const handleViewpointSaved = (data: ViewpointData) => {
  if (!props.value.rowData) return;
  props.value.rowData.viewpoint = data;
};

const clearViewpoint = () => {
  if (!props.value.rowData) return;
  delete props.value.rowData.viewpoint;
};

defineExpose({
  acceptParams,
});
</script>

<style scoped lang="scss">
.obj-vp-cell {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  width: 100%;
  &__status {
    display: inline-flex;
    gap: 5px;
    align-items: center;
    font-size: 12px;
    color: var(--el-color-success);
  }
  &__dot {
    width: 7px;
    height: 7px;
    background: var(--el-color-success);
    border-radius: 50%;
  }
  &__empty {
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }
}
</style>
