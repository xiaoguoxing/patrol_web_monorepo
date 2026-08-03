<template>
  <kr-card class="flex-1 two-col-page" :header="cardTitle" header-border>
    <template #headerRight v-if="pageType === 'list'">
      <el-button v-auth="'indexSet'" icon="Operation" type="primary" link @click="openDrawer">参数设置</el-button>
    </template>
    <kr-filter-tree
      v-show="pageType === 'list'"
      class="two-col-page-lf"
      label="nodeName"
      v-dragLine
      :data="dataSource"
      placeholder="请输入您想搜索的巡检对象名称"
      @change="changeTreeFilter"
      :defaultValue="defaultValue"
    />
    <kr-pro-table
      v-show="pageType === 'list'"
      ref="proTable"
      :columns="columns"
      :requestApi="getTableList"
      :dataCallback="dataCallback"
      :initParam="initParam"
      :searchCol="{ xs: 1, sm: 1, md: 2, lg: 3, xl: 3 }"
      selectId="id"
      title="预置位配置"
      titleBorder
      :outBorder="false"
      colSetAble
    >
      <!-- 表格 header 按钮 -->
      <template #tableHeader="{ selectedListIds, isSelected }">
        <el-button
          v-auth="'add'"
          icon="CirclePlus"
          :disabled="nodeType !== 3"
          type="primary"
          @click="openDialogChange('add')"
          >新建巡检项</el-button
        >
        <el-button
          v-auth="'batchOn'"
          icon="Unlock"
          @click="batchChange(selectedListIds, true)"
          :disabled="!isSelected"
          class="el-button--primary2"
          >开启弹窗推送</el-button
        >
        <el-button
          v-auth="'batchOff'"
          icon="Lock"
          class="el-button--primary2"
          @click="batchChange(selectedListIds, false)"
          :disabled="!isSelected"
          >关闭弹框推送</el-button
        >
        <el-button icon="Delete" v-auth="'delete'" :disabled="!isSelected" @click="deleteList(selectedListIds)"
          >删除</el-button
        >
      </template>
      <!-- 表格操作 -->
      <template #operation="{ row }">
        <el-button type="primary" link @click="openDialogChange('detail', row)">查看</el-button>
        <el-button type="primary" link v-auth="'edit'" @click="openDialogChange('edit', row)">编辑</el-button>
        <el-button type="primary" link v-auth="'delete'" @click="deleteList([row['id']])">删除</el-button>
      </template>
    </kr-pro-table>
    <addPage
      v-if="['add', 'edit', 'detail'].includes(pageType)"
      ref="addPageRef"
      :objectId="defaultValue"
      :id="id"
      @openDialogChange="openDialogChange"
      :pageType="pageType"
    />
    <alarmDrawer ref="alarmDrawerRef" />
  </kr-card>
</template>
<script setup lang="tsx">
import { ref, reactive, computed, onMounted } from 'vue';
import addPage from './add.vue';
import { useHandleData } from '@patrol/shared/hooks/useHandleData';
import {
  deleteInspectionApi,
  getInspectionListApi,
  getTreeApi,
  turnApi,
} from '@/api/modules/optCenter/aiPatrolManage/inspection';
import type {
  Tree,
  Id,
  PageType,
  rows,
  searchParams,
  tableProps,
} from '@/api/modules/optCenter/aiPatrolManage/inspection';
import { getDict, getDictForColumnFilters } from '@/utils/serviceDict';
import { treeFirst } from '@/api/modules/optCenter/aiPatrolManage/position';
import alarmDrawer from './alarmDrawer.vue';
import { QuestionFilled } from '@element-plus/icons-vue';
import { useRoute, useRouter } from 'vue-router';
import { PageTypeTitle } from '@/api/modules/optCenter/aiPatrolManage/task';
const route = useRoute();
const router = useRouter();
let cardTitle = computed(() => (pageType.value === 'list' ? route.meta?.title! : PageTypeTitle[pageType.value]));
// 树操作
const dataSource = ref<Tree[]>([]);
const currentTreeNode = ref<Tree>();
const defaultValue = computed<string>(() => currentTreeNode.value?.id ?? '');

const nodeType = computed<number>(() => currentTreeNode.value?.nodeType ?? 1);
const getTreeList = async () => {
  let { data } = await getTreeApi();
  dataSource.value = data;
  currentTreeNode.value = treeFirst(data) as Tree;
};
await getTreeList();
const changeTreeFilter = (val: string, node: Tree) => {
  proTable.value.pageable.pageNum = 1;
  initParam.objectId = val;
  currentTreeNode.value = node;
};
// 表格配置项
const cameraTypeNames = (await getDict('camera_type')) as { label: string; value: string; remark: string }[];
const proTable = ref();
const initParam = reactive<Partial<searchParams>>({ objectId: defaultValue.value });
const dataCallback = (data: any) => {
  return {
    datalist: data.list,
    total: data.total,
    pageNum: data.page,
    pageSize: data.pageSize,
  };
};
const columns: tableProps<rows>[] = [
  { type: 'selection', label: '序号', width: 70 },
  { type: 'index', label: '序号', width: 70 },
  {
    prop: 'itemName',
    label: '巡检项名称',
    isShowInputLabel: false,
    search: {
      el: 'input',
      props: { placeholder: '请输入您想搜索的巡检项名称' },
    },
    minWidth: 200,
  },
  {
    prop: 'cameraName',
    label: '监控设备名称',
    minWidth: 200,
  },
  {
    prop: 'cameraType',
    label: '监控设备类型',
    filters: getDictForColumnFilters(cameraTypeNames),
    enum: cameraTypeNames,
    minWidth: 200,
  },
  {
    prop: 'presetPositionName',
    label: '关联预置位名称',
    minWidth: 200,
  },
  {
    prop: 'relatedSkillsName',
    label: '关联技能',
    minWidth: 200,
  },
  {
    prop: 'isPopup',
    label: '告警弹框推送',
    headerRender: (scope) => {
      return (
        <span>
          弹框推送
          <el-tooltip
            content="弹框推送关闭，则告警发生时默认仅推送消息提醒；弹框推送开启，则告警发生时同步推送消息提醒和告警弹框。"
            effect="light"
            placement="right"
          >
            <el-icon>
              <QuestionFilled />
            </el-icon>
          </el-tooltip>
        </span>
      );
    },
    render: (scope) => {
      let loading = false;
      let { row } = scope;
      const change = () => {
        loading = true;
        return turnApi({ ids: row.id, isPopup: !row.isPopup })
          .then((res) => {
            loading = false;
            row.isPopup = !row.isPopup;
            return Promise.resolve(true);
          })
          .catch((error) => {
            loading = false;
            return Promise.reject(false);
          });
      };
      return (
        <el-switch model-value={scope.row.isPopup} active-value={true} inactive-value={false} beforeChange={change} />
      );
    },
    minWidth: 200,
  },
  { prop: 'operation', align: 'right', label: '操作', width: 180, fixed: 'right' },
];
const getTableList = async (params: any) => {
  let { pageNum, ...searchData } = params;
  searchData.page = pageNum;
  return getInspectionListApi(searchData);
};
const deleteList = async (selectedListIds: string[]) => {
  try {
    await useHandleData<{ ids: string }>(deleteInspectionApi, { ids: selectedListIds.toString() }, '删除');
    proTable.value.clearSelection();
    proTable.value.getTableList();
  } catch (e) {
    proTable.value.clearSelection();
    proTable.value.getTableList();
  }
};
const batchChange = async (id: string[], isPopup: boolean) => {
  await useHandleData(turnApi, { ids: id.join(), isPopup: isPopup }, (isPopup ? '开启' : '关闭') + '所选告警弹窗推送');
  proTable.value.clearSelection();
  proTable.value.getTableList();
};
// 新增
const addPageRef = ref();
const id = ref<Id>();
const pageType = ref<PageType>('list');
async function openDialogChange(page: PageType, row?: rows) {
  id.value = row ? row.id : '';
  pageType.value = page;
  if (page === 'list') {
    proTable.value.getTableList();
  }
  if (route.query.id) {
    await router.push({
      path: route.path,
      query: {},
    });
  }
}

//打开告警指标配置弹窗
const alarmDrawerRef = ref();
const openDrawer = () => {
  alarmDrawerRef.value.acceptParams({
    title: '告警指标设置',
  });
};

onMounted(() => {
  if (route.query.id) {
    openDialogChange('edit', route.query as unknown as rows);
  }
});
</script>
<style scoped></style>
