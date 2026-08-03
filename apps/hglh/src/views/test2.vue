<template>
  <div class="kr-docs-box kr-docs-table">
    <kr-pro-table
      ref="proTable"
      :columns="columns"
      :requestApi="getTableList"
      :initParam="initParam"
      :dataCallback="dataCallback"
      :searchCol="{ xs: 1, sm: 1, md: 2, lg: 3, xl: 3 }"
      selectId="code"
      title="内容区标题"
      titleBorder
      :outBorder="false"
      colSetAble
    >
      <!--卡片headerRightArea-->
      <template #cardHeaderRight></template>

      <template #leftLayout>
        <div style="width: 100%">123</div>
      </template>
      <!-- 表格 header 按钮 -->
      <template #tableHeader>
        <el-button type="primary" @click="open">打开弹框</el-button>
      </template>
      <!-- 表格操作 -->
      <template #operation>
        <el-button type="primary" link>版本</el-button>
        <el-button type="primary" link>编辑</el-button>
        <el-button type="primary" link>详情</el-button>
        <el-button type="primary" link>删除</el-button>
      </template>
    </kr-pro-table>
    <kr-tree-list-select
      v-model:visible="show"
      :treeData="dataSource"
      :getListApi="getTableList2"
      :dataCallback="dataCallback2"
      :column="column"
      tree-title="组织"
      table-title="人员列表"
      label="name"
      id="code"
      multiple
      @confirm="onConfirm"
    ></kr-tree-list-select>
  </div>
</template>
<script setup lang="tsx">
import { ref, reactive } from 'vue';
import { ColumnProps } from '@patrol/ui';

// import type {} from 'element-plus'
interface listProp {
  id: string;
  label: string;
  version: string;
  treeId: number;
}

interface Tree {
  id: number;
  label: string;
  children?: Tree[];
}

const proTable = ref();
const selectProp = ref('1');
const initParam = reactive<Partial<listProp>>({});
const dataCallback = (data: any) => {
  return {
    datalist: data.list,
    total: data.total,
    pageNum: data.page,
    pageSize: data.pageSize,
  };
};
const tableSource: Array<listProp> = [
  { id: '1', label: '测试 1', version: 'v1.1', treeId: 1 },
  { id: '2', label: '测试 2', version: 'v1.1', treeId: 2 },
  { id: '3', label: '测试 3', version: 'v1.1', treeId: 3 },
  { id: '3', label: '测试 3', version: 'v1.1', treeId: 3 },
  { id: '3', label: '测试 3', version: 'v1.1', treeId: 3 },
  { id: '3', label: '测试 3', version: 'v1.1', treeId: 3 },
  { id: '3', label: '测试 3', version: 'v1.1', treeId: 3 },
  { id: '3', label: '测试 3', version: 'v1.1', treeId: 3 },
  { id: '3', label: '测试 3', version: 'v1.1', treeId: 3 },
  { id: '3', label: '测试 3', version: 'v1.1', treeId: 3 },
  { id: '3', label: '测试 3', version: 'v1.1', treeId: 3 },
];
const getTableList = (params: any) => {
  //param:pageNum,在这里可以根据后端需要的参数从 params 拿到想要的参数值
  return new Promise((resolve) => {
    let resultData = [...tableSource];
    if (params.label) {
      resultData = tableSource.filter((item) => item.label.includes(params.label));
    }
    if (params.version) {
      resultData = resultData.filter((item) => item.version.includes(params.version));
    }
    resolve({
      data: {
        list: resultData,
        total: resultData.length,
        page: 1,
        pageSize: 10,
      },
    });
  });
};

// 表格配置项
const columns: ColumnProps[] = [
  { type: 'selection', label: '序号', width: 70 },
  { type: 'index', label: '序号', width: 70 },
  {
    prop: 'label',
    label: '应用名称',
    isShowInputLabel: false,
    search: {
      el: 'input',
      isPrependInput: true,
      PrependOption: {
        el: 'select',
        PrependProp: 'selectLabel',
        enum: [
          { label: '巡逻对象名称', value: '1' },
          { label: '巡逻对象名称2', value: '2' },
          { label: '巡逻对象名称3', value: '3' },
        ],
      },
      props: { placeholder: '请输入告警名称' },
    },
    filters: [
      { text: '一级告警', value: '1' },
      { text: '二级告警', value: '2' },
      { text: '三级告警', value: '3' },
      { text: '四级告警', value: '4' },
    ],
  },
  {
    prop: 'version',
    label: '告警名称',
    sortable: true,
    filterMultiple: false,
    search: {
      el: 'input',
      render(attr) {
        // console.log(searchData);
        return (
          <el-input {...attr}>
            {{
              prepend: () => {
                return (
                  <el-select v-model={selectProp.value} placeholder="Select" style={'width: 140px'}>
                    <el-option label="巡逻对象名称" value={'1'} />
                    <el-option label="Order No." value={'2'} />
                    <el-option label="Tel" value={'3'} />
                  </el-select>
                );
              },
            }}
          </el-input>
        );
      },
    },
    filters: [
      { text: '一级告警', value: '2016-05-01' },
      { text: '二级告警', value: '2016-05-02' },
      { text: '三级告警', value: '2016-05-03' },
      { text: '四级告警', value: '2016-05-04' },
    ],
  },
  {
    prop: 'version2',
    label: '告警类型',
  },
  {
    prop: 'version3',
    label: '告警等级',
  },
  {
    prop: 'version4',
    label: '告警指标',
  },
  {
    prop: 'version5',
    label: '弹框推送',
  },
  {
    prop: 'version6',
    label: '创建人',
  },
  {
    prop: 'version7',
    label: '创建时间',
  },
  { prop: 'operation', align: 'right', label: '操作', width: 300, fixed: 'right' },
];

interface listProp2 {
  code: string;
  name: string;
  categoryName: string;
  categoryCode: number;
}

const tableSource2 = [
  { code: '1', name: '测试1', categoryCode: 1, categoryName: 'Level one 1' },
  { code: '2', name: '测试2', categoryCode: 2, categoryName: 'Level one 2' },
  { code: '3', name: '测试3', categoryCode: 3, categoryName: 'Level one 3' },
];

const getTableList2 = (params: any) => {
  return new Promise((resolve) => {
    let resultData: listProp2[] = [...tableSource2];
    if (params.categoryCode) {
      resultData = tableSource2.filter((item) => item.categoryCode === params.treeId);
    }
    if (params.keyWords) {
      resultData = resultData.filter((item) => item.name.includes(params.keyWords));
    }
    resolve({
      data: {
        list: resultData,
        total: resultData.length,
        page: 1,
        pageSize: 10,
      },
    });
  });
};
const dataSource = ref<Tree[]>([
  {
    id: 1,
    label: 'Level one 1',
    children: [
      {
        id: 4,
        label: 'Level two 1-1',
        children: [
          {
            id: 9,
            label: 'Level three 1-1-1',
          },
          {
            id: 10,
            label: 'Level three 1-1-2',
          },
        ],
      },
    ],
  },
  {
    id: 2,
    label: 'Level one 2',
    children: [
      {
        id: 5,
        label: 'Level two 2-1',
      },
      {
        id: 6,
        label: 'Level two 2-2',
      },
    ],
  },
  {
    id: 3,
    label: 'Level one 3',
    children: [
      {
        id: 7,
        label: 'Level two 3-1',
      },
      {
        id: 8,
        label: 'Level two 3-2',
      },
    ],
  },
]);
// dataCallback 是对于返回的表格数据做处理，如果你后台返回的数据不是 datalist && total && pageNum && pageSize 这些字段，那么你可以在这里进行处理成这些字段

const dataCallback2 = (data: any) => {
  return {
    datalist: data.list,
    total: data.total,
    pageNum: data.page,
    pageSize: data.pageSize,
  };
};

const column = [
  { prop: 'code', label: '账号' },
  { prop: 'name', label: '姓名' },
  { prop: 'categoryName', label: '组织' },
];
const show = ref(false);
const open = () => {
  show.value = true;
};
const onConfirm = (ids: any, data: any) => {
  console.log(ids);
  console.log(data);
};
</script>
<style scoped>
.kr-docs-table {
  height: 100%;
  background: #ffffff;
}
</style>
