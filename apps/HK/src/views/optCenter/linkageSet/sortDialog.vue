<template>
  <kr-public-dialog v-model="show" :title="`${props.title}`" @doSubmit="handleSubmit" @doClose="onClose" height="80%">
    <kr-pro-table
      ref="proTable"
      :pagination="false"
      :columns="columns"
      :requestApi="getTableList"
      :dataCallback="dataCallback"
      @cell-mouse-enter="rowDrop"
      row-class-name="drop-row"
    />
  </kr-public-dialog>
</template>
<script setup lang="tsx" name="sortDialog">
import { ref, reactive, onMounted, nextTick, watch } from 'vue';
import { ElMessage, FormInstance } from 'element-plus';
import Sortable from 'sortablejs';
import { Rank } from '@element-plus/icons-vue';
import { getListApi, sortApi, linkObj } from '@/api/modules/optCenter/linkageSet';
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
interface DialogProps {
  title: string;
  linkageSignalId?: string;
  getTableList?: () => Promise<any>;
}

// 弹窗状态
const show = ref(false);
const props = ref<DialogProps>({
  title: '',
});
const proTable = ref();

// 接收父组件传过来的参数
const acceptParams = (params: DialogProps): void => {
  props.value = params;
  show.value = true;
};
defineExpose({
  acceptParams,
});
const { data } = await getListApi({ linkageSignalId: props.value.linkageSignalId, page: -1, pageSize: -1 });
const dataList = ref(data.list);
const getTableList = (params: any) => {
  return getListApi({ linkageSignalId: props.value.linkageSignalId, page: -1, pageSize: -1 });
};
const dataCallback = (data: any) => {
  return data.list;
};
watch(show, (val) => {
  console.log(show.value);
  nextTick(async () => {
    if (val) {
      await proTable.value.getTableList();
      dataList.value = proTable.value.tableData;
    }
  });
});

const rowDrop = (row: any, column: any, cell: HTMLTableCellElement, event: Event) => {
  event.preventDefault();
  nextTick(() => {
    const wrapper = proTable.value.element.$el.querySelector('.el-table__body-wrapper tbody');
    new Sortable(wrapper, {
      animation: 180,
      delay: 0,
      onEnd: ({ newIndex, oldIndex }) => {
        const currentRow = dataList.value.splice(oldIndex, 1)[0];
        dataList.value.splice(newIndex, 0, currentRow);
      },
    });
  });
};
const columns = [
  // {
  //   label: '',
  //   prop: 'id',
  //   render: (scope) => {
  //     return (
  //       <div class="flex items-center">
  //         <el-icon class="drag-btn" onMouseenter={(event: { preventDefault: () => void }) => rowDrop(event)}>
  //           <Rank />
  //         </el-icon>
  //       </div>
  //     );
  //   },
  // },
  // { type: 'index', label: '序号', width: 60 },

  {
    prop: 'objectName',
    label: t('aiInspection.objectName'),
    minWidth: 120,
    render: (scope) => {
      return (
        <div class="flex items-center">
          <el-icon class="drag-btn">
            <Rank />
          </el-icon>
          {scope.row.objectName}
        </div>
      );
    },
  },
  {
    prop: 'areaPath',
    label: t('aiInspection.areaName'),
    minWidth: 200,
  },
  { prop: 'itemName', label: t('task.itemName') },
];
const handleSubmit = async () => {
  try {
    const param: linkObj.ReqSortParams = {
      linkageSignalId: props.value.linkageSignalId as string,
      list: dataList.value.map((item, index) => {
        return {
          id: item.id,
          sortNo: index + 1,
        };
      }),
    };
    await sortApi!(param);
    ElMessage.success({ message: `${props.value.title}${t('buttonName.success')}！` });
    props.value.getTableList!();
    show.value = false;
  } catch (error) {
    console.log(error);
  }
};
const onClose = () => {
  show.value = false;
};
</script>
<style lang="scss" scoped>
:deep(.drop-row:hover) {
  cursor: move;
}
</style>
