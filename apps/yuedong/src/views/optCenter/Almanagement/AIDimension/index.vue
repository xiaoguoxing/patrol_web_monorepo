<template>
  <div class="flex-1">
    <kr-card class="flex-1" :header="cardTitle" header-border>
      <template #header>
        <div>
          <el-icon @click="pageChange('list')" v-if="pageType === 'detail'" class="mr8 page-back"><Back /></el-icon>
          <span class="title kr-font-medium">{{ cardTitle }}</span>
        </div>
      </template>
      <kr-pro-table
        v-if="pageType === 'list'"
        style=""
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
        <!-- 表格操作 -->
        <template #operation="{ row }">
          <el-button
            type="primary"
            v-auth="'detail'"
            v-if="row.markStatus === 'finish'"
            link
            @click="pageChange('detail', row)"
            >详情</el-button
          >
          <el-button type="primary" v-auth="'edit'" link @click="pageChange('edit', row)">{{
            row.markStatus === 'todo' ? '标注' : '编辑'
          }}</el-button>
        </template>

        <template #markStatus="{ row }">
          <!--          待标注-->
          <span class="dimensionTag" :class="stateClassOption[row.markStatus as keyof StateOption]">
            {{ stateOption[row.markStatus as keyof StateOption] }}
          </span>
        </template>
      </kr-pro-table>
      <addPage
        v-else-if="['detail', 'edit'].includes(pageType)"
        :id="id!"
        :pageType="pageType!"
        ref="addPageRef"
        :rowState="rowState"
        @get-list="pageChange"
      ></addPage>
    </kr-card>
  </div>
</template>
<script setup lang="ts">
import { ref, reactive, computed, watch, ComputedRef } from 'vue';
import { tableProps } from '@/api/modules/optCenter/aiPatrolManage/inspection';
import { useRoute, useRouter } from 'vue-router';
import {
  Row,
  Search,
  PageType,
  algorithmList,
  PageTypeTitle,
  RowState,
} from '@/api/modules/optCenter/Almanagement/AIDimension';
import addPage from './add.vue';
import { getCameraTreeApi } from '@/api/modules/camera';
const route = useRoute();
const router = useRouter();
let cardTitle: ComputedRef<any> = computed(() =>
  pageType.value === 'list' ? route.meta?.title! : PageTypeTitle[pageType.value]
);
const getTreeList = async () => {
  try {
    await getCameraTreeApi();
  } catch (e) {}
};

await getTreeList();
//
type StateOption = {
  [p in RowState]: string;
};
const stateOption = ref<StateOption>({ todo: '未标注', finish: '已标注' });
const stateClassOption = ref<StateOption>({ todo: 'tab1', finish: 'tab2' });
const proTable = ref();
const initParam = reactive<Partial<Search>>({});
const columns: tableProps<Row>[] = [
  { type: 'index', label: '序号', width: 70 },
  {
    prop: 'presetPositionName',
    label: '预置位名称',
  },
  {
    prop: 'presetPositionId',
    label: '预置位ID',
    isShowInputLabel: false,
    search: {
      el: 'input',
      props: { placeholder: '请输入您想搜索的预置位名称或ID' },
    },
  },
  {
    prop: 'algorithmName',
    showOverflowTooltip: false,
    label: '关联技能',
  },
  {
    prop: 'markStatus',
    label: '标注状态',
    filterMultiple: false,
    filters: [
      { value: 'todo', text: '未标注' },
      { value: 'finish', text: '已标注' },
    ],
  },
  {
    prop: 'createTime',
    label: '创建时间',
  },
  { prop: 'operation', align: 'right', label: '操作', width: 180, fixed: 'right' },
];
const dataCallback = (data: any) => {
  return {
    datalist: data.list,
    total: data.total,
    pageNum: data.page,
    pageSize: data.pageSize,
  };
};
const getTableList = async (params: Search) => {
  let { pageNum, ...searchData } = params;
  searchData.page = pageNum;
  return algorithmList(searchData);
};
//add
let addPageRef = ref();
let id = ref<string>();
let pageType = ref<PageType>('list');
let rowState = ref<RowState>('todo');
async function pageChange(pt: PageType, row?: Row) {
  id.value = row?.id;
  rowState.value = row?.markStatus!;
  pageType.value = pt;
  if (route.query.id) {
    router.push({
      path: route.path,
      query: {},
    });
  }
}
//
if (Reflect.has(route.query, 'id')) {
  pageChange('edit', { id: route.query.id as string, markStatus: route.query.markStatus } as Row);
}
</script>
<style scoped lang="scss">
:deep(.kr-protable-header) {
  margin-bottom: 0;
  .header-button-ri {
    margin-top: calc(0px - (var(--el-component-size) + 18px));
  }
}
.dimensionTag {
  padding: 7px;
  font-size: 14px;
  border-radius: 4px;
  &.tab1 {
    color: #666666;
    background: #efefef;
  }
  &.tab2 {
    color: #0d60b4;
    background: #dfeffd;
  }
}
</style>
