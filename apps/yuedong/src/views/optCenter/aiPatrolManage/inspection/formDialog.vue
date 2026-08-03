<template>
  <div class="app-inspection-position-dialog">
    <kr-tree-list-select
      :dialog-title="props.title"
      v-model:visible="show"
      v-model:value="abc"
      :singleClose="pageType === 'detail'"
      :treeData="dataSource"
      :getListApi="getTList"
      :column="column"
      tree-title="监控设备列表"
      table-title="待添加预置位"
      tree-label="nodeName"
      label="presetPositionName"
      id="id"
      :multiple="false"
      :pagination="false"
      @confirm="onConfirm"
      @close="onClose"
      :defaultValue="defaultValue"
    >
      <!--      <template #treeHeader>
        <myTabs :options="options1" style="margin-bottom: 10px" buttonType="line" @change="tabChange"></myTabs>
      </template>-->
      <template #tree="{ node, data }">
        <cameraTreeTemp :node="node" :data="data"></cameraTreeTemp>
      </template>
    </kr-tree-list-select>
  </div>
</template>
<script setup lang="tsx" name="UserDialog">
import { ref, computed, onUnmounted } from 'vue';
import { ColumnProps } from '@patrol/ui';
import myTabs from '@/components/Tabs/index.vue';
import cameraTreeTemp from '@optCenter/components/cameraTreeTemp/index.vue';
import {
  getAllPositionApi,
  getPositionListApi,
  ListPageProps,
  PositionListRows,
  treeFirst,
  treeItem,
} from '@/api/modules/optCenter/aiPatrolManage/position';
import { getCameraTreeApi, Tree } from '@/api/modules/camera';
import { useBackFileUrl, useRemoveURLObject } from '@optCenter/hooks/use-file-utils';
import { videoNodeType } from '@optCenter/hooks/use-video';

interface DialogProps {
  title: string;
  pageType: string;
  api?: (params: any) => Promise<any>;
  getTableList?: () => Promise<any>;
  list?: any[];
}
const props = withDefaults(defineProps<DialogProps>(), {});
// 接收父组件传过来的参数
const showDialog = () => {
  show.value = true;
  let area = treeItem(dataSource.value, props.list?.[0]?.cameraId);
  if (area?.id) {
    defaultValue.value = area.id;
  }
};
defineExpose({
  showDialog,
});
//emit
interface DialogEmitProps {
  presetPositionId: string;
  presetPositionName: string;
  relatedSkillsId: string;
  relatedSkillsName: string;
}
interface Emit {
  (e: 'confirm', ids: string[], arr: DialogEmitProps): any;
}
const emit = defineEmits<Emit>();
// 弹窗状态
const show = ref(false);
//树数据
const dataSource = ref<Tree[]>([]);
const defaultValue = ref<string>();
const { nodeType } = videoNodeType();
const getTreeList = async () => {
  let { data } = await getCameraTreeApi();
  defaultValue.value = treeFirst(data, nodeType.value)?.id || '';
  dataSource.value = data;
};
await getTreeList();
//表格
const urlArr = useRemoveURLObject();
const getTList = async (params: any) => {
  let { pageNum, treeId, keyWords, ...searchData } = params;
  searchData.page = pageNum!;
  searchData.cameraId = treeId;
  searchData.presetPositionName = keyWords;
  let resData = ref<PositionListRows[]>([]);
  if (searchData?.cameraId) {
    let { data } = await getAllPositionApi(searchData);
    resData.value = data;
    for (const [key, i] of resData.value.entries()) {
      if (i.attachmentId) {
        useBackFileUrl(i.attachmentId).then((res) => {
          Reflect.set(resData.value[key], 'imgPath', res);
          urlArr.add(res!);
        });
      }
    }
  }
  return {
    data: resData.value || [],
  };
};
const column: ColumnProps[] = [
  {
    prop: 'presetPositionName',
    label: '预置位名称',
  },
  {
    prop: 'relatedSkillsName',
    label: '关联技能',
  },
  {
    prop: 'attachmentId',
    label: '预置位抓图',
    showOverflowTooltip: false,
    render(scope) {
      return (
        <div>
          {scope.row.imgPath ? (
            <el-image
              style={'width: 60px; height: auto;display:block'}
              src={scope.row.imgPath}
              zoom-rate={1.2}
              max-scale={7}
              min-scale={0.2}
              preview-src-list={[scope.row.imgPath]}
              preview-teleported={true}
              initial-index={0}
              fit="cover"
            />
          ) : (
            <div>--</div>
          )}
        </div>
      );
    },
  },
];
// 提交数据（新增/编辑）
const abc = computed(() => [...props.list!]);
const onConfirm = (ids: string[], arr: any) => {
  arr.presetPositionId = arr.id;
  emit('confirm', ids, arr);
  show.value = false;
};
const onClose = () => {
  show.value = false;
};

const options1 = [
  { label: '摄像头', value: '1' },
  { label: '轨道机', value: '2' },
];
const tabChange = function (val: string) {
  console.log(val);
};
</script>
<style scoped lang="scss">
.app-inspection-position-dialog {
  :deep(.kr-filter-tree) {
    height: calc(100% - var(--el-component-size));
  }
}
</style>
