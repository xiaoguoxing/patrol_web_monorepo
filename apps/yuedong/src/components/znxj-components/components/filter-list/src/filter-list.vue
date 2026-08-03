<template>
  <kr-card
    class="kr-filter-list"
    v-bind="$attrs"
    v-if="componentsType === 'filterList'"
    :header-border="headerBorder"
    :header="header"
    :border="outBorder"
  >
    <template #headerRight>
      <el-button :icon="Delete" size="small" class="clearBtn" @click="clearAll">清空</el-button>
    </template>

    <el-input
      v-if="filterable"
      placeholder="输入关键字过滤"
      class="treeInput"
      v-model="filterText"
      suffix-icon="el-icon-search"
      clearable
      style="margin-bottom: 10px"
    ></el-input>

    <el-scrollbar style="height: calc(100% - 47px)">
      <div
        v-for="(i, index) in filterData"
        :key="index"
        class="chosedSelect"
        :class="{ isActive: i[id] == currentId }"
        @mouseenter="enterItem(i)"
        @mouseleave="outItem(i)"
      >
        <span>
          <label>{{ i[label] }}</label>
        </span>
        <el-icon v-show="i[id] == currentId" @click="delItem(index, i)" class="select-icon-close" size="17">
          <Close />
        </el-icon>
      </div>
    </el-scrollbar>
  </kr-card>
  <kr-card
    class="kr-filter-list"
    v-bind="$attrs"
    v-if="componentsType === 'tableList'"
    :header-border="headerBorder"
    :header="header"
    :border="outBorder"
  >
    <template #headerRight>
      <el-button type="primary" @click="clearAll" link>清除全部</el-button>
    </template>
    <kr-pro-table
      ref="proTable"
      v-bind="$attrs"
      :title="'已选'"
      outBorder
      :operationBtn="filterable"
      titleBorder
      :columns="resColumns"
      :requestApi="getListApi"
      :initParam="initParam"
      :selectId="id"
      :border="false"
      :pagination="false"
    >
      <template v-if="filterable" #tableHeader>
        <el-input
          v-model="filterText"
          placeholder="输入关键字过滤"
          suffix-icon="el-icon-search"
          clearable
          style="margin-bottom: 10px"
        ></el-input>
      </template>

      <template #operation="{ row, index }">
        <el-button type="primary" @click="delItem(index, row)" link>删除</el-button>
      </template>
    </kr-pro-table>
  </kr-card>
</template>

<script setup lang="ts" name="KrFilterList">
import '../../style/index.scss';
import '../style/index.scss';
import { computed, ref, watch } from 'vue';
import KrCard from '@/components/znxj-components/components/card';
import { cloneDeep } from 'lodash-es';
import { Delete, Close } from '@element-plus/icons-vue';

// 接收父组件参数并设置默认值
interface FilterListProps {
  componentsType: 'filterList' | 'tableList';
  value?: { [key: string]: any }[]; // 分类数据，如果有分类数据，则不会执行 api 请求 ==> 非必传
  header?: string; // treeFilter 标题 ==> 非必传
  columns: []; // columns 标题 ==> 必传
  id?: string; // 选择的id ==> 非必传，默认为 “id”
  label?: string; // 显示的label ==> 非必传，默认为 “label”
  filterable?: boolean; // 是否可过滤 ==> 非必传，默认为 false
  headerBorder?: boolean; //是否显示header的下边框
  outBorder?: boolean; //是否显示边框
}

const props = withDefaults(defineProps<FilterListProps>(), {
  componentsType: 'filterList',
  id: 'id',
  label: 'label',
  filterable: false,
  value: () => {
    return [];
  },
});

const emit = defineEmits(['change']);

const filterText = ref<string>('');
const getFilterData = () => {
  if (filterText.value) {
    return props.value?.filter((item) => {
      return item[props.label].indexOf(filterText.value) !== -1;
    });
  } else {
    return cloneDeep(props.value);
  }
};
const filterData = ref(getFilterData());
const data = ref(cloneDeep(props.value));
watch(
  () => props.value,
  () => {
    filterData.value = getFilterData();
    data.value = cloneDeep(props.value);
    proTable.value?.getTableList();
  },
  { deep: true }
);
watch(
  () => filterText,
  () => {
    filterData.value = getFilterData();
    proTable.value?.getTableList();
  },
  { deep: true }
);
const currentId = ref('');
const enterItem = (i: { [key: string]: any }) => {
  currentId.value = i[props.id];
};
const outItem = (i: { [key: string]: any }) => {
  currentId.value = '';
};
//清除列表中的数据
const clearAll = () => {
  filterData.value = [];
  emit('change', []);
};
//点击移除的时候触发
const delItem = (index: number, row: { [key: string]: any }) => {
  data.value.forEach((item, i: number) => {
    if (row[props.id] == item[props.id]) {
      data.value.splice(i, 1);
      filterData.value.splice(i, 1);
    }
  });

  emit('change', data.value);
};

const resColumns = computed(() => [
  ...props.columns,
  {
    prop: 'operation',
    align: 'right',
    label: '操作',
    fixed: 'right',
  },
]);

const proTable = ref();

function getListApi() {
  return new Promise((resolve) => {
    resolve({
      data: filterData.value,
    });
  });
}

const initParam = {};
</script>
