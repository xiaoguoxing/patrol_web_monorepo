<template>
  <kr-card class="flex-1 two-col-page" header="实时监控配置" header-border>
    <kr-filter-tree
      class="two-col-page-lf"
      label="nodeName"
      v-dragLine
      :data="dataSource"
      placeholder="请输入您想搜索的巡检对象名称"
      @change="changeTreeFilter"
      :defaultValue="defaultValue"
    />
    <kr-pro-table
      ref="proTable"
      :columns="columns"
      :requestApi="getTableList"
      :initParam="initParam"
      :dataCallback="dataCallback"
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
          v-auth="'add'"
          :disabled="currentCameraTreeNode?.nodeType !== 3"
          type="primary"
          @click="openDialogChange('add')"
          >关联技能</el-button
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
        <!--        <el-button type="primary" link @click="openDialogChange('detail', row)">查看</el-button>-->
        <el-button v-auth="'edit'" type="primary" link @click="openDialogChange('edit', row)">编辑</el-button>
        <el-button v-auth="'delete'" type="primary" link @click="deleteList([row['id']])">删除</el-button>
      </template>
    </kr-pro-table>
    <addPage
      ref="addPageRef"
      :id="id"
      @openDialogChange="openDialogChange"
      :camera-id="currentCameraTreeNode?.id"
      :pageType="pageType"
    />
  </kr-card>
</template>
<script setup lang="tsx">
import { ref, reactive } from 'vue';
import addPage from './add.vue';
import { Id, PageType, searchForm, rows } from '@/api/modules/optCenter/aiPatrolManage/watching';
import { getWatchingListApi, deleteWatchingApi } from '@/api/modules/optCenter/aiPatrolManage/watching';
import { useHandleData } from '@/hooks/useHandleData';
import { tableProps } from '@/api/modules/optCenter/aiPatrolManage/inspection';
import { treeFirst } from '@/api/modules/optCenter/aiPatrolManage/position';
import { getCameraTreeApi, Tree } from '@/api/modules/camera';
import { useBackFileUrl, useRemoveURLObject } from '@optCenter/hooks/use-file-utils';
// 树操作
const dataSource = ref<Tree[]>([]);
const currentCameraTreeNode = ref<Tree>();
const defaultValue = ref<string>();
const getTreeList = async () => {
  let { data } = await getCameraTreeApi();
  dataSource.value = data;
  defaultValue.value = treeFirst(data)?.id || '';
  currentCameraTreeNode.value = treeFirst(data) as Tree;
};
await getTreeList();
const changeTreeFilter = (val: string, node: Tree) => {
  proTable.value.pageable.pageNum = 1;
  initParam.cameraId = val;
  currentCameraTreeNode.value = node;
};

// 表格配置项
const proTable = ref();
const urlArr = useRemoveURLObject();
const initParam = reactive<Partial<searchForm>>({ cameraId: defaultValue.value });
const columns: tableProps<rows>[] = [
  { type: 'selection', label: '序号', width: 70 },
  { type: 'index', label: '序号', width: 70 },
  {
    prop: 'relatedSkills',
    label: '技能名称',
    isShowInputLabel: false,
    search: {
      el: 'input',
      props: { placeholder: '请输入您需要搜索的技能名称' },
    },
    minWidth: 200,
  },
  {
    prop: 'runtime',
    label: '运行时段',
    minWidth: 200,
  },
  {
    prop: 'monitorPic',
    label: '分析区域',
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
  {
    prop: 'alarmName',
    label: '告警名称',
    minWidth: 200,
  },
  { prop: 'operation', align: 'right', label: '操作', width: 150, fixed: 'right' },
];
const dataCallback = (data: any) => {
  return {
    datalist: data.list,
    total: data.total,
    pageNum: data.page,
    pageSize: data.pageSize,
  };
};
const getTableList = async (params: any) => {
  let { pageNum, ...searchData } = params;
  searchData.page = pageNum;
  let res = ref<rows[]>();
  let { list, ...pageInfo } = (await getWatchingListApi(searchData)).data;
  res.value = list;
  for (const i of res.value!) {
    if (i.monitorPic) {
      useBackFileUrl(i.monitorPic).then((url) => {
        Reflect.set(i, 'imgPath', url);
        urlArr.add(url!);
      });
    }
  }
  return {
    data: {
      list: res.value,
      ...pageInfo,
    },
  };
};
const deleteList = async (selectedListIds: string[]) => {
  try {
    await useHandleData<{ ids: string }>(deleteWatchingApi, { ids: selectedListIds.toString() }, '删除');
    proTable.value.clearSelection();
    proTable.value.getTableList();
  } catch (e) {
    proTable.value.clearSelection();
    proTable.value.getTableList();
  }
};

// 弹框
const id = ref<Id>();
const pageType = ref<PageType>();
const addPageRef = ref();

function openDialogChange(page: PageType, row?: rows) {
  id.value = row ? row.id : '';
  pageType.value = page;

  if (page === 'list') {
    proTable.value.getTableList();
  } else {
    addPageRef.value.openDialog();
  }
}
</script>
<style scoped></style>
