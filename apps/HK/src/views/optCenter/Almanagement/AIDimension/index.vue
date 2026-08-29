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
            >{{ $t('buttonName.detail') }}</el-button
          >
          <el-button type="primary" v-auth="'edit'" link @click="pageChange('edit', row)">{{
            row.markStatus === 'todo' ? $t('model.marked') : $t('buttonName.edit')
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
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
const route = useRoute();
const router = useRouter();
let cardTitle: ComputedRef<any> = computed(() =>
  pageType.value === 'list' ? route.meta?.title! : t(PageTypeTitle[pageType.value])
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
const stateOption = ref<StateOption>({ todo: t('model.markStatus1'), finish: t('model.markStatus2') });
const stateClassOption = ref<StateOption>({ todo: 'tab1', finish: 'tab2' });
const proTable = ref();
const initParam = reactive<Partial<Search>>({});
const columns = computed<tableProps<Row>[]>(() => [
  { type: 'index', label: t('table.sort'), width: 70 },
  {
    prop: 'presetPositionName',
    label: t('linkageSet.presetPositionName'),
  },
  {
    prop: 'presetPositionId',
    label: t('position.presetPositionId'),
    isShowInputLabel: false,
    search: {
      el: 'input',
      props: { placeholder: t('position.presetPositionPlaceholder') },
    },
  },
  {
    prop: 'algorithmName',
    showOverflowTooltip: false,
    label: t('linkageSet.relatedSkills'),
  },
  {
    prop: 'markStatus',
    label: t('model.markStatus'),
    filterMultiple: false,
    filters: [
      { value: 'todo', text: t('model.markStatus1') },
      { value: 'finish', text: t('model.markStatus2') },
    ],
  },
  {
    prop: 'createTime',
    label: t('linkageSet.createTime'),
  },
  { prop: 'operation', align: 'right', label: t('table.operation'), width: 180, fixed: 'right' },
]);
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
