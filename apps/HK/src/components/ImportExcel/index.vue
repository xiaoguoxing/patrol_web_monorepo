<template>
  <el-dialog
    v-model="dialogVisible"
    :title="`${$t('exportFile.addAll')}${parameter.title}`"
    :destroy-on-close="true"
    width="580px"
    draggable
    class="padding16"
  >
    <el-form class="drawer-multiColumn-form" label-width="100px">
      <el-form-item :label="`${$t('exportFile.tempDown')} :`">
        <el-button type="primary" :icon="Download" @click="downloadTemp">{{ $t('exportFile.ClickDown') }}</el-button>
      </el-form-item>
      <el-form-item :label="`${$t('exportFile.fileUpload')} :`">
        <el-upload
          action="string"
          class="upload"
          :drag="true"
          :limit="excelLimit"
          :multiple="true"
          :show-file-list="true"
          :http-request="uploadExcel"
          :before-upload="beforeExcelUpload"
          :on-exceed="handleExceed"
          :on-success="excelUploadSuccess"
          :on-error="excelUploadError"
          accept="application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        >
          <el-icon class="el-icon--upload"><upload-filled /></el-icon>
          <div class="el-upload__text">
            {{ $t('exportFile.fileMsgTip1') }}<em>{{ $t('exportFile.clickUpload') }}</em>
          </div>
          <template #tip>
            <div class="el-upload__tip">{{ $t('exportFile.uploadTip') }}</div>
          </template>
        </el-upload>
      </el-form-item>
      <el-form-item v-if="parameter.coverable" :label="`${$t('exportFile.dataArea')} :`">
        <el-switch v-model="isCover" />
      </el-form-item>
    </el-form>
  </el-dialog>
</template>

<script setup lang="ts" name="ImportExcel">
import { ref } from 'vue';
import { useDownload } from '@patrol/shared/hooks/useDownload';
import { Download } from '@element-plus/icons-vue';
import { ElNotification } from 'element-plus';
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
export interface ExcelParameterProps {
  title: string; // 标题
  coverable: boolean;
  tempApi: (params: any) => Promise<any>; // 下载模板的Api
  importApi: (params: any) => Promise<any>; // 批量导入的Api
  getTableList?: () => Promise<any>; // 获取表格数据的Api
}

// 是否覆盖数据
const isCover = ref(false);
// 最大文件上传数
const excelLimit = ref(1);
// dialog状态
const dialogVisible = ref(false);
// 父组件传过来的参数
const parameter = ref<Partial<ExcelParameterProps>>({});

// 接收父组件参数
const acceptParams = (params?: any): void => {
  parameter.value = params;
  dialogVisible.value = true;
};

// Excel 导入模板下载
const downloadTemp = () => {
  if (!parameter.value.tempApi) return;
  useDownload(parameter.value.tempApi, `${parameter.value.title}${t('messageTip.temp')}`);
};

// 文件上传
const uploadExcel = async (param: any) => {
  let excelFormData = new FormData();
  excelFormData.append('file', param.file);
  if (parameter.value.coverable) {
    excelFormData.append('isCover', isCover.value as unknown as Blob);
  }
  await parameter.value.importApi!(excelFormData);
  parameter.value.getTableList && parameter.value.getTableList();
  dialogVisible.value = false;
};

/**
 * @description 文件上传之前判断
 * @param file 上传的文件
 * */
const beforeExcelUpload = (file: any) => {
  const isExcel =
    file.type === 'application/vnd.ms-excel' ||
    file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  const fileSize = file.size / 1024 / 1024 < 5;
  if (!isExcel)
    ElNotification({
      title: t('messageTip.logoutMsg2'),
      message: t('exportFile.fileMsgTip2'),
      type: 'warning',
    });
  if (!fileSize)
    ElNotification({
      title: t('messageTip.logoutMsg2'),
      message: t('exportFile.fileMsgTip3'),
      type: 'warning',
    });
  return isExcel && fileSize;
};

// 文件数超出提示
const handleExceed = (): void => {
  ElNotification({
    title: t('messageTip.logoutMsg2'),
    message: t('exportFile.fileMsgTip4'),
    type: 'warning',
  });
};

// 上传错误提示
const excelUploadError = (): void => {
  ElNotification({
    title: t('messageTip.logoutMsg2'),
    message: `${t('exportFile.addAll')}${parameter.value.title}${t('buttonName.error')}，${t(
      'exportFile.fileMsgTip5'
    )}！`,
    type: 'error',
  });
};

// 上传成功提示
const excelUploadSuccess = (): void => {
  ElNotification({
    title: t('messageTip.logoutMsg2'),
    message: `${t('exportFile.addAll')}${parameter.value.title}${t('buttonName.success')}！`,
    type: 'success',
  });
};

defineExpose({
  acceptParams,
});
</script>
<style lang="scss" scoped>
@use './index.scss';
</style>
<style lang="scss">
.el-dialog {
  &.padding16 {
    --el-dialog-padding-primary: 16px;
  }
}
</style>
