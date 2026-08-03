<template>
  <div class="flex-1">
    <kr-card class="flex-1 two-col-page" header="预置位配置" header-border>
      <kr-filter-tree
        v-dragLine
        class="two-col-page-lf"
        placeholder="请输入您想搜索的设备名称"
        label="nodeName"
        :data="dataSource"
        :defaultValue="defaultValue"
        @change="changeTreeFilter"
      />
      <kr-pro-table
        ref="proTable"
        :columns="columns"
        :requestApi="getTableList"
        :initParam="initParam"
        :searchCol="{ xs: 1, sm: 1, md: 2, lg: 3, xl: 3 }"
        selectId="id"
        title="预置位配置"
        titleBorder
        :outBorder="false"
        colSetAble
      >
        <!-- 表格 header 按钮 -->
        <template #tableHeader="{ selectedListIds }">
          <el-button
            icon="CirclePlus"
            :disabled="syncData || !nodeType.includes(currentCameraTreeNode?.nodeType)"
            :title="
              nodeType.includes(currentCameraTreeNode?.nodeType)
                ? syncData
                  ? '同步的数据不支持此操作'
                  : null
                : '请选择监控设备'
            "
            type="primary"
            v-auth="'add'"
            @click="openDialogChange('add')"
            >新增预置位</el-button
          >
          <el-button
            icon="Delete"
            v-auth="'delete'"
            :disabled="!selectedListIds.length"
            @click="deleteList(selectedListIds)"
            >删除</el-button
          >
        </template>
        <!-- 表格操作 -->
        <template #operation="{ row }">
          <!--        <el-button type="primary" link @click="openDialogChange('detail', row)">详情</el-button>-->
          <el-button type="primary" v-if="row.needMarked" v-auth="'edit'" link @click="goDimension(row)"
            >标注</el-button
          >
          <el-button type="primary" v-auth="'edit'" link @click="openDialogChange('edit', row)">编辑</el-button>
          <el-button type="primary" v-auth="'delete'" link @click="deleteList([row['id']])">删除</el-button>
        </template>
        <template #id="{ row }">
          <div class="messageContent" @click="copyFn(row)">{{ row.id }}</div>
        </template>
      </kr-pro-table>
      <addPage
        ref="addPageRef"
        @openDialogChange="openDialogChange"
        :cameraId="currentCameraTreeNode?.id"
        :nodeType="currentCameraTreeNode?.nodeType"
        :id="id"
        :pageType="pageType"
        @addPageClose="show = false"
        v-if="show"
      />
    </kr-card>
  </div>
</template>
<script setup lang="tsx">
import { nextTick, reactive, ref } from 'vue';
import {
  Id,
  ListPageProps,
  PageType,
  PositionListParams,
  PositionListRows,
  treeFirst,
  deletePositionApi,
  getPositionListApi,
} from '@/api/modules/optCenter/aiPatrolManage/position';
import addPage from './add.vue';
import { useHandleData } from '@patrol/shared/hooks/useHandleData';
import { tableProps } from '@/api/modules/optCenter/aiPatrolManage/inspection';
import { getCameraTreeApi, Tree } from '@/api/modules/camera';
import { useBackFileUrl, useRemoveURLObject } from '@optCenter/hooks/use-file-utils';
import { useClipboard } from '@vueuse/core';
import { ElMessage } from 'element-plus';
import { useRouter } from 'vue-router';
import { algorithmDetail } from '@/api/modules/optCenter/Almanagement/AIDimension';
import { videoNodeType } from '@optCenter/hooks/use-video';

const { copy } = useClipboard({ legacy: true });
const { replace } = useRouter();
//树操作
let currentCameraTreeNode = ref<Tree | undefined>(undefined);
const dataSource = ref<Tree[]>([]);
const defaultValue = ref<string>();
const { nodeType } = videoNodeType();
const getTreeList = async () => {
  let { data } = await getCameraTreeApi();
  dataSource.value = data;
  defaultValue.value = treeFirst(data, nodeType.value)?.id || '';
  currentCameraTreeNode.value = treeFirst(data, nodeType.value) as Tree;
};
let syncData = ref();

await getTreeList();
const changeTreeFilter = (val: string, node: Tree) => {
  proTable.value.pageable.pageNum = 1;
  initParam.cameraId = val;
  currentCameraTreeNode.value = node;
  syncData.value = node.syncData;
};
// 表格配置项
const proTable = ref();
const urlArr = useRemoveURLObject();
const initParam = reactive<Partial<PositionListParams>>({ cameraId: defaultValue.value });
const columns: tableProps<PositionListRows>[] = [
  {
    type: 'selection',
    label: '序号',
    selectable(e) {
      return !e.syncData;
    },
    width: 70,
  },
  { type: 'index', label: '序号', width: 70 },
  {
    prop: 'presetPositionName',
    label: '预置位名称',
    isShowInputLabel: false,
    search: {
      el: 'input',
      props: { placeholder: '请输入您想搜索的预置位名称' },
    },
    minWidth: 200,
  },
  {
    prop: 'id',
    label: '预置位ID',
    minWidth: 250,
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
              style={'width: 60px; height: auto; display:block'}
              src={scope.row.imgPath}
              zoom-rate={1.2}
              max-scale={7}
              min-scale={0.2}
              preview-src-list={[scope.row.imgPath]}
              preview-teleported={true}
              hide-on-click-modal={true}
              initial-index={0}
              fit="cover"
            />
          ) : (
            <div>--</div>
          )}
        </div>
      );
    },
    minWidth: 100,
  },
  {
    prop: 'relatedSkillsName',
    label: '关联技能',
    minWidth: 200,
  },
  { prop: 'operation', align: 'right', label: '操作', width: 250, fixed: 'right' },
];
const getTableList = async (params: PositionListParams) => {
  let { pageNum, ...searchData } = params;
  searchData.page = pageNum!;
  let res = ref<{ data: ListPageProps }>({
    data: { list: [], pageNum: 1, pageSize: 10, total: 0 },
  });
  if (searchData.cameraId !== '') {
    res.value = await getPositionListApi(searchData);
  }
  let { list, ...pageData } = res.value.data;
  for (const [key, i] of list.entries()) {
    if (i.attachmentId) {
      useBackFileUrl(i.attachmentId).then((res) => {
        Reflect.set(list[key], 'imgPath', res);
        urlArr.add(res!);
      });
    }
  }
  return {
    data: {
      datalist: list,
      ...pageData,
    },
  };
};
const deleteList = async (selectedListIds: string[]) => {
  try {
    await useHandleData<{ ids: string }>(deletePositionApi, { ids: selectedListIds.toString() }, '删除');
    proTable.value.clearSelection();
    proTable.value.getTableList();
  } catch (e) {
    proTable.value.clearSelection();
    proTable.value.getTableList();
  }
};
// 弹框
const id = ref<Id>();
const pageType = ref<PageType>('list');
const addPageRef = ref();
const show = ref(false);
function openDialogChange(page: PageType, row?: PositionListRows) {
  id.value = row ? row.id : '';
  pageType.value = page;
  if (page === 'list') {
    proTable.value.getTableList();
  } else {
    show.value = true;
    nextTick(() => {
      addPageRef.value.openDialog();
    });
  }
}

function copyFn(row: PositionListRows) {
  copy(row.id!);
  ElMessage.success('复制成功');
}
async function goDimension(row: PositionListRows) {
  try {
    let { data } = await algorithmDetail({ id: row.markId! });
    replace({
      path: `/patrolInspection/operationsManagement/Almanagement/AIDimension`,
      query: {
        id: row.markId,
        markStatus: data.markStatus,
      },
    });
  } catch (e) {
    ElMessage.error(`标注数据获取失败`);
  }
}
</script>
<style scoped lang="scss">
.messageContent {
  cursor: pointer;
  &:hover {
    color: #0d60b4;
  }
}
</style>
