<!-- 📚📚📚 Pro-Table 文档: https://juejin.cn/post/7166068828202336263 -->

<template>
  <div class="kr-protable">
    <!-- 查询表单 card -->
    <kr-search-form
      :search="search"
      :reset="reset"
      :showReset="showReset"
      :showMicrophone="showMicrophone"
      :searchParam="searchParam"
      :clearMethod="updatedTotalParam"
      :columns="searchColumns"
      :searchCol="searchCol"
      v-show="isShowSearch"
    />
    <!-- 表格头部 操作按钮 -->
    <div class="kr-protable-header clearfix" v-if="operationBtn">
      <div class="header-button-lf">
        <slot
          name="tableHeader"
          :selectedListIds="selectedListIds"
          :selectList="selectedList"
          :isSelected="isSelected"
        ></slot>
      </div>
      <div class="header-button-ri">
        <el-button v-if="refreshAble && columns.length" :icon="Refresh" circle @click="getTableList"></el-button>
        <el-button :icon="Printer" circle v-if="printAble && columns.length" @click="handlePrint"></el-button>
        <el-popover placement="bottom" v-if="colSetAble && columns.length" :width="500" trigger="click">
          <template #reference>
            <el-button :icon="Operation" circle @click="openColSetting"></el-button>
          </template>
          <ColSetting v-if="colSetAble" ref="colRef" :setConfig="setConfig" v-model:colSetting="colSetting" />
        </el-popover>
        <el-popover placement="bottom" v-if="sortAble" :width="500" trigger="click">
          <template #reference>
            <el-button :icon="Sort" circle @click="openSortSetting"></el-button>
          </template>
          <el-tree
            :allow-drop="allowDrop"
            :allow-drag="allowDrag"
            :data="tableData"
            :props="{ label: 'itemName' }"
            draggable
            default-expand-all
            node-key="id"
          />
        </el-popover>
      </div>
    </div>
    <!-- 表格主体 -->
    <slot name="table" :tableData="tableData" :total="pageable.total">
      <el-table
        ref="tableRef"
        v-bind="$attrs"
        :height="height"
        :data="tableData"
        :border="border"
        :row-key="getRowKeys"
        @selection-change="selectionChange"
        @select="clickCheckBox"
        @select-all="clickCheckBox"
        @filter-change="filterChange"
        @row-click="tableHandleCurrentChange"
      >
        <!-- @filter-change="filterChange" -->
        <!-- 默认插槽 -->
        <slot></slot>
        <template v-for="(item, index) in tableColumns" :key="item">
          <!-- selection || index -->
          <el-table-column
            v-bind="item"
            :reserve-selection="item.type == 'selection'"
            :align="item.align ?? 'center'"
            :selectable="item.type == 'selection' ? item.selectable : undefined"
            v-if="item.type == 'selection' || item.type == 'index'"
            v-slot="scope"
          >
            <template v-if="pagination && item.type == 'index'"
              >{{ pageable.pageSize * (pageable.pageNum - 1) + scope.$index + 1 }}
            </template>
          </el-table-column>
          <el-table-column v-if="item.type == 'radio'" :align="item.align ?? 'center'" v-bind="item" v-slot="scope">
            <div>
              <el-radio
                :style="'--el-radio-input-height: 18px; --el-radio-input-width: 18px;'"
                v-model="radioCheck"
                :label="scope.row[selectId]"
                :disabled="item.selectable ? item?.selectable(scope.row, scope.$index) : false"
                @change="() => radioSelect(scope.row)"
              >
                <i></i>
              </el-radio>
            </div>
          </el-table-column>
          <!-- expand 支持 tsx 语法 && 作用域插槽 (tsx > slot) -->
          <el-table-column v-bind="item" :align="item.align ?? 'center'" v-if="item.type == 'expand'" v-slot="scope">
            <component :is="item.render" :row="scope.row" :scopeData="scope" v-if="item.render"></component>
            <slot :name="item.type" :row="scope.row" :scopeData="scope" v-else></slot>
          </el-table-column>
          <!-- other 循环递归 -->
          <TableColumn v-if="!item.type && item.prop && item.isShow" :column="item" :key="item.prop" :index="index">
            <template v-for="slot in Object.keys($slots)" #[slot]="scope">
              <slot :name="slot" :row="scope.row" :scopeData="scope"></slot>
            </template>
          </TableColumn>
        </template>
        <!-- 无数据 -->
        <!-- <template #empty>
          <div class="table-empty">
            <img src="./assets/images/notData.png" alt="notData" />
            <div>暂无数据</div>
          </div>
        </template> -->
      </el-table>
    </slot>
    <!-- 分页组件 -->
    <Pagination
      v-if="pagination"
      :pageable="pageable"
      :handleSizeChange="handleSizeChange"
      :handleCurrentChange="handleCurrentChange"
    />
  </div>
  <!-- 列设置 -->
</template>

<script setup lang="ts" name="KrProTable">
import '../../style/index.scss';
import '../style/index.scss';
import { computed, provide, ref, watch, nextTick, useSlots } from 'vue';
import { useTable } from './hooks/use-table';
import { useSelection } from './hooks/use-selection';
import { ElTable, TableInstance } from 'element-plus';
import { filterEnum, formatValue, handleProp, handleRowAccordingToProp } from '../../../utils';
import { Operation, Printer, Refresh, Sort } from '@element-plus/icons-vue';
import { cloneDeep } from 'lodash-es';

import type { BreakPoint } from '../../grid';
import type { ColumnProps } from './pro-table';
import type { TableProps } from 'element-plus';

import KrSearchForm from '../../search-form';

import Pagination from './components/Pagination.vue';
import ColSetting from './components/ColSetting.vue';
import TableColumn from './components/TableColumn.vue';
import printJS from 'print-js';
import useTableColSet from './hooks/use-tableColSet';
import type { AllowDropType, NodeDropType } from 'element-plus/es/components/tree/src/tree.type';
// 表格 DOM 元素
const tableRef = ref<TableInstance>();

// 是否显示搜索模块
const isShowSearch = ref<boolean>(true);

interface ProTableProps extends /* @vue-ignore */ Partial<Omit<TableProps<any>, 'data'>> {
  columns: any[]; // 列配置项
  requestApi: (params: any) => Promise<any>; // 请求表格数据的api ==> 必传
  height?: string | number; // 表格高度
  dataCallback?: (data: any) => any; // 返回数据的回调函数，可以对数据进行处理 ==> 非必传
  title?: string; // 表格标题， ==> 非必传
  titleBorder?: boolean; // 标题是否有下边框
  outBorder?: boolean; // 是否带有表格卡片边框 ==> 非必传（）
  pagination?: boolean; // 是否需要分页组件 ==> 非必传（默认为true）
  initParam?: any; // 初始化请求参数 ==> 非必传（默认为{}）
  border?: boolean; // 是否带有纵向边框 ==> 非必传（默认为true）
  operationBtn?: boolean; // 是否带有操作区域 ==> 非必传（默认为true）
  refreshAble?: boolean; // 是否带有纵向边框 ==> 非必传（默认为true）
  printAble?: boolean; // 是否带有纵向边框 ==> 非必传（默认为true）
  colSetAble?: boolean; // 是否带有纵向边框 ==> 非必传（默认为true）
  sortAble?: boolean; // 是否带有纵向边框 ==> 非必传（默认为true）
  showReset?: boolean; // 是否带有纵向边框 ==> 非必传（默认为true）
  showMicrophone?: boolean; // 是否带有纵向边框 ==> 非必传（默认为true）
  selectId?: string; // 当表格数据多选时，所指定的 id ==> 非必传（默认为 id）
  selectData?: { [key: string]: any }[]; //所有选中的数据
  searchCol?: number | Record<BreakPoint, number>; // 表格搜索项 每列占比配置 ==> 非必传 { xs: 1, sm: 2, md: 2, lg: 3, xl: 4 }
}

// 接受父组件参数，配置默认值
const props = withDefaults(defineProps<ProTableProps>(), {
  columns: () => [],
  pagination: true,
  initParam: {},
  border: true,
  operationBtn: true,
  showReset: false,
  showMicrophone: false,
  sortAble: false,
  selectId: 'id',
  selectData: () => [],
  searchCol: () => ({ xs: 1, sm: 2, md: 2, lg: 3, xl: 4 }),
});
const emit = defineEmits(['select', 'radioSelect', 'resetFn']);
// 表格多选 Hooks
const { selectionChange, getRowKeys, selectedList, selectedListIds, isSelected } = useSelection(props.selectId);

const clearFilter = () => {
  // let strArr = tableColumns.value.filter((i) => i?.filteredValue?.length === 0).map((i) => i.prop as string);
  let strArr = tableColumns.value.filter((i) => i?.filters).map((i) => i.columnKey || (i.prop as string));
  tableRef.value?.clearFilter(strArr);
  tableColumns.value
    .filter((i) => i?.filteredValue?.length)
    .forEach((j) => {
      let p = j.columnKey || (j.prop as string);
      setDefaultValue(p);
    });
};
function setDefaultValue(p: string) {
  let col = findCol(p);
  if (col) {
    col.filteredValue = searchInitParam.value[p] ? [searchInitParam.value[p]] : [];
  }
}
function findCol(key: string) {
  return tableRef.value?.columns?.find?.((i: any) => i.columnKey === key);
}
// 表格操作 Hooks
const {
  tableData,
  pageable,
  searchParam,
  searchInitParam,
  getTableList,
  updatedTotalParam,
  search,
  reset,
  handleSizeChange,
  handleCurrentChange,
  filterChange,
} = useTable(
  props.requestApi,
  props.initParam,
  props.pagination,
  clearFilter,
  props.dataCallback,
  setDefaultValue,
  findCol,
  () => {
    emit('resetFn');
  }
);

const seledData = ref(cloneDeep(props.selectData));
const radioCheck = ref(props.selectData[0] ? props.selectData[0][props.selectId] : null);
// 清空选中数据列表
const clearSelection = () => {
  seledData.value = [];
  tableRef.value!.clearSelection();
};
const clickCheckBox = (selection: []) => {
  seledData.value = selection;
  emit('select', selection);
};
//set选中数据
//单选
//设置单选框选中数据
// eslint-disable-next-line @typescript-eslint/no-unused-vars
let extra: any = '';
const radioSelect = (row: { [x: string]: any }) => {
  seledData.value = [row];
  extra = row[props.selectId];
  emit('radioSelect', [row]);
};
//针对行点击的
function tableHandleCurrentChange(row: { [x: string]: any }) {
  if (haveRadio()) {
    radioSelect(row);
  }
}
//多选
const setCheckBox = () => {
  tableData.value?.forEach((row) => {
    const selId = seledData.value?.find((item) => {
      return row[props.selectId] == item[props.selectId];
    });
    if (selId !== undefined) {
      tableRef.value!.toggleRowSelection(row, true);
    } else {
      tableRef.value!.toggleRowSelection(row, false);
    }
  });
};
const setRadio = () => {
  if (seledData.value.length != 0) {
    radioCheck.value = seledData.value[0][props.selectId];
  } else {
    radioCheck.value = null;
  }
};
const haveRadio = () => {
  return props.columns.find((column) => {
    return column.type == 'radio';
  });
};
const haveCheck = () => {
  return props.columns.find((column) => {
    return column.type == 'selection';
  });
};
// 监听页面 initParam 改化，重新获取表格数据
watch(
  () => props.initParam,
  () => {
    getTableList();
  },
  { deep: true }
);

watch(
  () => props.selectData,
  () => {
    seledData.value = cloneDeep(props.selectData);
    if (haveRadio()) {
      setRadio();
    }
    if (haveCheck()) {
      setCheckBox();
    }
  }
);
watch(
  () => tableData.value,
  () => {
    nextTick(() => {
      if (haveRadio()) {
        setRadio();
      }
      if (haveCheck()) {
        setCheckBox();
      }
    });
  }
);
// 接收 columns 并设置为响应式
const tableColumns = ref<ColumnProps[]>(props.columns);

// 定义 enumMap 存储 enum 值（避免异步请求无法格式化单元格内容 || 无法填充搜索下拉选择）
const enumMap = ref(new Map<string, { [key: string]: any }[]>());
provide('enumMap', enumMap);

// 扁平化 columns && 处理 tableColumns 数据
const flatColumnsFunc = (columns: ColumnProps[], flatArr: ColumnProps[] = []) => {
  columns.forEach(async (col) => {
    if (col._children?.length) flatArr.push(...flatColumnsFunc(col._children));
    flatArr.push(col);
    // 给每一项 column 添加 isShow && isFilterEnum 属性
    Reflect.set(col, 'isShow', col.isShow ?? true);
    Reflect.set(col, 'isFilterEnum', col.isFilterEnum ?? true);
    if (!col.enum) return;
    // 如果当前 enum 为后台数据需要请求数据，则调用该请求接口，并存储到 enumMap
    if (typeof col.enum !== 'function') return enumMap.value.set(col.prop!, col.enum);
    const { data } = await col.enum();
    enumMap.value.set(col.prop!, data);
  });
  return flatArr.filter((item) => !item._children?.length);
};

// 扁平 columns
const flatColumns = ref<ColumnProps[]>();
flatColumns.value = flatColumnsFunc(tableColumns.value as any);

// 过滤需要搜索的配置项 && 处理搜索排序
const searchColumns = ref<ColumnProps[]>(
  flatColumns.value.filter((item) => item.search?.el).sort((a, b) => (b.search?.order ?? 0) - (a.search?.order ?? 0))
);

// 设置搜索表单的默认值
searchColumns.value.forEach((column) => {
  const key = column.search?.key ?? handleProp(column.prop!);
  const defaultValue = column.search?.defaultValue;
  if (defaultValue !== undefined && defaultValue !== null) {
    // searchParam.value[String(key)] = defaultValue
    searchInitParam.value[String(key)] = defaultValue;
  }
});
// 设置filters搜索表单的默认值
flatColumns.value
  .filter((item) => item.filters?.length)
  .forEach((column) => {
    const key = column.columnKey ?? handleProp(column.prop!);
    const filteredValue = column?.filteredValue;
    if (filteredValue !== undefined && filteredValue !== null && filteredValue.length !== 0) {
      // searchParam.value[String(key)] = defaultValue
      searchInitParam.value[String(key)] = filteredValue[0];
    }
  });

// 监听 columns 变化（如多语言切换导致父组件重新生成列配置），同步更新表格列、搜索项
watch(
  () => props.columns,
  (val) => {
    if (val === tableColumns.value) return;
    tableColumns.value = val as ColumnProps[];
    flatColumns.value = flatColumnsFunc(val as any);
    searchColumns.value = flatColumns.value
      .filter((item) => item.search?.el)
      .sort((a, b) => (b.search?.order ?? 0) - (a.search?.order ?? 0));
  }
);

// 列设置 ==> 过滤掉不需要设置显隐的列
const colRef = ref();
const colSetting = tableColumns.value!.filter((item) => {
  return (
    item.isShow &&
    item.type !== 'selection' &&
    item.type !== 'index' &&
    item.type !== 'expand' &&
    item.prop !== 'operation'
  );
});
const { setConfig, getConfig } = useTableColSet(colSetting);
if (props.colSetAble) {
  try {
    getConfig();
  } catch (e) {
    console.log(e);
  }
}
const openColSetting = () => {
  colRef.value.openColSetting();
};
const openSortSetting = () => {};
const allowDrop = (draggingNode: Node, dropNode: Node, type: AllowDropType) => {
  return type !== 'inner';
};
const allowDrag = (draggingNode: Node) => {
  return true;
};
// 处理打印数据（把后台返回的值根据 enum 做转换）
const printData = computed(() => {
  let printDataList = JSON.parse(JSON.stringify(selectedList.value.length ? selectedList.value : tableData.value));
  let colEnumList = flatColumns.value!.filter((item) => item.enum || (item.prop && item.prop.split('.').length > 1));
  colEnumList.forEach((colItem) => {
    printDataList.forEach((tableItem: { [key: string]: any }) => {
      tableItem[handleProp(colItem.prop!)] =
        colItem.prop!.split('.').length > 1 && !colItem.enum
          ? formatValue(handleRowAccordingToProp(tableItem, colItem.prop!))
          : filterEnum(
              handleRowAccordingToProp(tableItem, colItem.prop!),
              enumMap.value.get(colItem.prop!),
              colItem.fieldNames
            );
    });
  });
  return printDataList;
});

// 打印表格数据（💥 多级表头数据打印时，只能扁平化成一维数组，printJs 不支持多级表头打印）
const handlePrint = () => {
  printJS({
    printable: printData.value,
    header:
      props.title &&
      `<div style="display: flex;flex-direction: column;text-align: center"><h2>${props.title}</h2></div>`,
    properties: flatColumns
      .value!.filter(
        (item) =>
          item.isShow &&
          item.type !== 'selection' &&
          item.type !== 'index' &&
          item.type !== 'expand' &&
          item.prop !== 'operation'
      )
      .map((item: ColumnProps) => {
        return {
          field: handleProp(item.prop!),
          displayName: item.label,
        };
      }),
    type: 'json',
    gridHeaderStyle:
      'border: 1px solid #ebeef5;height: 45px;font-size: 14px;color: #232425;text-align: center;background-color: #fafafa;',
    gridStyle: 'border: 1px solid #ebeef5;height: 40px;font-size: 14px;color: #494b4e;text-align: center',
  });
};

// 暴露给父组件的参数和方法(外部需要什么，都可以从这里暴露出去)
defineExpose({
  element: tableRef,
  tableData,
  searchParam,
  pageable,
  getTableList,
  // selectedList,
  clearSelection,
  enumMap,
  filterChange,
});

const slot = useSlots();
// 是否左布局
const isLeftRight = computed(() => Reflect.has(slot, 'leftLayout'));
</script>
