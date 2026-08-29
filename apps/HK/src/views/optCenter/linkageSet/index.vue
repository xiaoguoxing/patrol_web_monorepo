<template>
  <div class="flex-1">
    <kr-card class="flex-1 two-col-page" :header="cardTitle" header-border>
      <div class="two-col-page-lf flex-column" v-dragLine>
        <el-input v-model="filterText" :placeholder="$t('linkageSet.treePlaceholder')" clearable />
        <div class="signal-btns mt20 mb18">
          <el-button
            v-auth="'addSignal'"
            icon="CirclePlus"
            type="primary"
            link
            @click="openSignalDialog($t('buttonName.add'))"
            >{{ $t('buttonName.add') }}</el-button
          >
          <!-- <el-button icon="Download" class="mr10" link @click="downloadFile">下载模板</el-button> -->

          <!-- <el-upload
            class="upload-btn"
            :show-file-list="false"
            action="#"
            :http-request="handleHttpUpload"
            :on-success="uploadSuccess"
            :on-error="uploadError"
          >
            <el-button icon="Upload" link>导入</el-button>
          </el-upload> -->
          <el-button v-auth="'uploadSignal'" icon="Upload" link @click="handleHttpUpload">{{
            $t('buttonName.importFile')
          }}</el-button>
        </div>
        <el-scrollbar class="flex-1-column">
          <div class="signal-item" v-for="(signal, index) in filterList" :key="index">
            <div
              class="signal-item-content"
              :class="initParam.linkageSignalId == signal.id ? 'active' : ''"
              @click="onClickSignal(signal)"
            >
              <div class="signal-item-name mb10">
                <el-tag class="signal-item-tag mr10" :type="signal.linked ? 'primary' : 'warning'">{{
                  signal.linked ? $t('linkageSet.linked1') : $t('linkageSet.linked2')
                }}</el-tag
                >{{ signal.linkageSignalName }}
              </div>
              <div class="signal-item-code">
                {{ $t('aiInspection.linkageSignalCode') }}：{{ signal.linkageSignalCode }}
              </div>
            </div>
            <el-popover
              placement="bottom"
              width="80"
              popper-class="signal-item-poper"
              popper-style="min-width:50px"
              trigger="click"
              :teleported="false"
            >
              <template #reference>
                <el-icon class="signal-item-rt"><MoreFilled /></el-icon>
              </template>

              <el-button v-auth="'editSignal'" link @click="openSignalDialog($t('buttonName.edit'), signal)">{{
                $t('buttonName.edit')
              }}</el-button>
              <el-button v-auth="'deleteSignal'" link @click="deleteSignalData(signal.id)">{{
                $t('ui.delete')
              }}</el-button>
            </el-popover>
          </div>
        </el-scrollbar>
      </div>
      <kr-pro-table
        ref="proTable"
        :columns="columns"
        :requestApi="getTableList"
        :initParam="initParam"
        :dataCallback="dataCallback"
        :searchCol="{ xs: 1, sm: 1, md: 3, lg: 3, xl: 3 }"
        selectId="id"
        colSetAble
      >
        <!-- 表格 header 按钮 -->
        <template #tableHeader="scope">
          <el-button v-auth="'add'" icon="CirclePlus" type="primary" @click="openForm($t('linkageSet.addItem'))">{{
            $t('linkageSet.addItem')
          }}</el-button>
          <el-button
            v-auth="'batchDelete'"
            icon="Delete"
            @click="batchDelete(scope.selectedListIds)"
            :disabled="!scope.isSelected"
            >{{ $t('ui.delete') }}</el-button
          >
          <!-- v-auth="'batchUp'" -->
          <!-- v-auth="'batchDown'" -->
          <el-button icon="Sort" @click="openSort()">{{ $t('buttonName.sort') }}</el-button>
          <!-- <el-button icon="Bottom" @click="batchMove(scope.selectedListIds, 1)" :disabled="!scope.isSelected"
            >下移</el-button
          > -->
        </template>
        <!-- 表格操作 -->
        <template #operation="scope">
          <el-button v-auth="'delete'" type="primary" link @click="deleteData(scope.row)">{{
            $t('ui.delete')
          }}</el-button>
        </template>
      </kr-pro-table>
    </kr-card>
    <SignalFormDialog ref="signalDialogRef" />
    <formDialog ref="formDialogRef" />
    <sortDialog ref="sortDialogRef" />
    <ImportExcel ref="importRef" />
  </div>
</template>
<script setup lang="tsx" name="linkageSet">
import { ref, reactive, watch, ComputedRef, computed } from 'vue';
import { ElMessage, ElNotification } from 'element-plus';
import { getDict, getDictForColumnFilters as dictForFilters } from '@/utils/serviceDict';
import type { DefaultDict, FilterDict } from '@/utils/serviceDict';

import { ColumnProps } from '@patrol/ui';
import { useHandleData } from '@patrol/shared/hooks/useHandleData';
import SignalFormDialog from './SignalFormDialog.vue';
import formDialog from './formDialog.vue';
import sortDialog from './sortDialog.vue';
import ImportExcel from '@/components/ImportExcel/index.vue';

import {
  getSignalListApi,
  deleteSignalApi,
  editSignalApi,
  addSignalApi,
  uploadSignalApi,
  downloadTemplateApi,
  getListApi,
  deleteApi,
  editApi,
  addApi,
} from '@/api/modules/optCenter/linkageSet';
import type { Signal } from '@/api/modules/optCenter/linkageSet';
4;
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';
const { t } = useI18n();
const route = useRoute();
let cardTitle: ComputedRef<any> = computed(() => route.meta?.title!);
/*
 **数据字典
 */
//获取数据字典
const typeDictlist = (await getDict('camera_type')) as DefaultDict;

/*
  联动信号功能
*/
// 默认选中的信号
const initParam = reactive({
  linkageSignalId: '',
});
// 搜索值
const filterText = ref('');
// 显示的信号列表数据
const filterList = ref<Signal.ResList[]>([]);
//信号列表数据
const dataSource = ref<Signal.ResList[]>([
  {
    id: '1',
    linkageSignalName: '南沙水司',
    linkageSignalCode: '56789',
    linked: true,
  },
  {
    id: '2',
    linkageSignalName: '西沙水司',
    linkageSignalCode: '12345',
    linked: false,
  },
  {
    id: '3',
    linkageSignalName: '梧州水司',
    linkageSignalCode: '23456',
    linked: false,
  },
]);

//请求获取信号列表数据
const initSignalList = async () => {
  let { data } = await getSignalListApi();
  dataSource.value = data;
  filterText.value = '';
  filterList.value = dataSource.value;
  initParam.linkageSignalId = filterList.value[0]?.id;
  if (data.length > 0) {
    initParam.linkageSignalId = data[0].id;
  }
};
const getSignalList = async () => {
  let { data } = await getSignalListApi();
  dataSource.value = data;
  filterList.value = dataSource.value!.filter(
    (item) => item.linkageSignalName.includes(filterText.value) || item.linkageSignalCode == filterText.value
  );
};
await initSignalList();

watch(filterText, (val) => {
  filterList.value = dataSource.value!.filter(
    (item) => item.linkageSignalName.includes(val) || item.linkageSignalCode == val
  );
});
// 打开 signalDialog增、查看、编辑)
const signalDialogRef = ref();
const openSignalDialog = (title: string, data: any = {}) => {
  let params = {
    title,
    rowData: { ...data },
    isView: title === t('buttonName.detail'),
    api: title === t('buttonName.add') ? addSignalApi : title === t('buttonName.edit') ? editSignalApi : '',
    getList: initSignalList,
  };
  signalDialogRef.value.acceptParams(params);
};

//删除信号
const deleteSignalData = async (id: string) => {
  await useHandleData(deleteSignalApi, { ids: id }, t('linkageSet.deleteItem'));
  initSignalList();
};
//
const importRef = ref();
const handleHttpUpload = () => {
  let params = {
    title: t('linkageSet.data'),
    tempApi: downloadTemplateApi,
    importApi: uploadSignalApi,
    getTableList: initSignalList,
  };
  importRef.value.acceptParams(params);
};
// 文件导入
/* const handleHttpUpload = async (options: UploadRequestOptions) => {
  let formData = new FormData();
  formData.append('file', options.file);
  try {
    await uploadSignalApi(formData);
  } catch (error) {
    options.onError(error as any);
  }
}; */
// 上传成功提示
/*
  巡检项功能

*/
const proTable = ref();
const searchProp = ref('itemName');

const dataCallback = (data: any) => {
  return {
    datalist: data.list,
    total: data.total,
    pageNum: data.page,
    pageSize: data.pageSize,
  };
};

// 表格配置项
const columns = computed<ColumnProps[]>(() => [
  { type: 'selection', width: 60 },

  { type: 'index', label: t('table.sort'), width: 60 },
  {
    prop: 'areaPath',
    label: t('aiInspection.areaName'),
    minWidth: 200,
  },
  {
    prop: 'objectName',
    label: t('aiInspection.objectName'),
    minWidth: 120,
  },
  {
    prop: 'itemName',
    label: t('task.itemName'),
    minWidth: 120,
    width: 120,
    search: {
      el: 'input',
      key: 'searchValue',
      render(attr) {
        return (
          <el-input {...attr}>
            {{
              prepend: () => {
                return (
                  <el-select
                    v-model={searchProp.value}
                    placeholder={t('inputPlaceholder.placeholderSelect')}
                    style={'width: 140px'}
                  >
                    <el-option label={t('task.itemName')} value={'itemName'} />
                    <el-option label={t('aiInspection.areaName')} value={'areaName'} />
                    <el-option label={t('aiInspection.objectName')} value={'objectName'} />
                    <el-option label={t('linkageSet.cameraName')} value={'cameraName'} />
                    <el-option label={t('linkageSet.presetPositionName')} value={'presetPositionName'} />
                    <el-option label={t('linkageSet.relatedSkills')} value={'relatedSkills'} />
                  </el-select>
                );
              },
            }}
          </el-input>
        );
      },
    },
  },
  {
    prop: 'cameraName',
    label: t('linkageSet.cameraName'),
    minWidth: 120,
    width: 120,
  },
  {
    prop: 'cameraType', //TODO:该属性名称未知，问后端
    label: t('linkageSet.cameraType'),
    minWidth: 150,
    filters: dictForFilters(typeDictlist),
    enum: typeDictlist,
  },
  {
    prop: 'presetPositionName',
    label: t('linkageSet.presetPositionName'),
    minWidth: 120,
    width: 120,
  },
  {
    prop: 'relatedSkillsName',
    label: t('linkageSet.relatedSkills'),
    minWidth: 120,
    width: 120,
  },
  {
    prop: 'createTime', //TODO:属性名称问后端
    label: t('linkageSet.createTime'),
    minWidth: 150,
  },
  { prop: 'operation', label: t('table.operation'), width: 200, fixed: 'right' },
]);
// 点击联动信号
const onClickSignal = (signal: any) => {
  proTable.value.pageable.pageNum = 1;
  initParam.linkageSignalId = signal.id;
};

// 获取表格数据
const getTableList = (params: any) => {
  //TODO:是否需要判断有无联动信号id才决定请求不请求联动内容
  let newParams = { ...params };
  if (newParams.searchValue) {
    newParams[searchProp.value] = newParams.searchValue;
    delete newParams.searchValue;
  }
  newParams.page = newParams.pageNum;
  delete newParams.pageNum;
  return getListApi(newParams);
};
// 为联动信号添加巡检项
const formDialogRef = ref();
const openForm = (title: string) => {
  if (initParam.linkageSignalId) {
    let params = {
      title,
      linkageSignalId: initParam.linkageSignalId,
      api: addApi,
      getTableList: () => {
        getSignalList();
        proTable.value.getTableList();
      },
    };
    formDialogRef.value.acceptParams(params);
  } else {
    ElMessage.warning(t('linkageSet.msg1'));
  }
};
const sortDialogRef = ref();
// 排序
const openSort = () => {
  if (initParam.linkageSignalId) {
    let params = {
      title: t('buttonName.sort'),
      linkageSignalId: initParam.linkageSignalId,
      getTableList: proTable.value.getTableList,
    };
    sortDialogRef.value.acceptParams(params);
  } else {
    ElMessage.warning(t('linkageSet.msg1'));
  }
};
//批量移动数据
const batchMove = (id: string[], num: number) => {};
// 批量删除表格数据
const batchDelete = async (id: string[]) => {
  await useHandleData(deleteApi, { ids: id.join() }, t('linkageSet.msg2'));
  proTable.value.clearSelection();
  proTable.value.getTableList();
  getSignalList();
};
//删除表格数据
const deleteData = async (row: any) => {
  await useHandleData(deleteApi, { ids: row.id }, t('linkageSet.msg3'));
  proTable.value.getTableList();
  getSignalList();
};
</script>
<style lang="scss" scoped>
.signal-btns {
  display: flex;
}
.upload-btn {
  vertical-align: middle;
}
.signal-item {
  position: relative;
  &-content {
    padding: 8px 15px 15px 8px;
    border-bottom: 1px solid var(--el-border-color-light2);
    &.active {
      background-color: var(--el-fill-color);
    }
    &:hover {
      background-color: var(--el-fill-color);
    }
  }
  &-name {
    font-size: var(--el-font-size-base);
    color: var(--el-text-color-regular);
  }
  &-code {
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }
  &-rt {
    position: absolute;
    top: 8px;
    right: 8px;
    padding: 2px 4px;
    color: var(--el-text-color-regular);
    transform: rotate(90deg);
    &:hover,
    &[aria-describedby] {
      background-color: var(--el-fill-color);
    }
  }
}
:deep(.el-popper.signal-item-poper) {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0;
  .el-button {
    width: 100%;
    height: 48px;
    margin: 0;
    border-radius: 0;
    &:hover {
      color: var(--el-button-text-color);
      background-color: var(--el-fill-color);
    }
  }
}
</style>
