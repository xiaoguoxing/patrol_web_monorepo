<template>
  <div class="kr-filter-tree">
    <el-input v-model="filterText" :placeholder="placeholder || t('el.patrol.filterPlaceholder')" clearable />
    <el-scrollbar style="height: calc(100% - 47px)">
      <!-- :style="{ height: header||$slots.header ? `calc(100% - 95px)` : `calc(100% - 56px)` }" -->
      <el-tree
        ref="treeRef"
        :default-expand-all="dea"
        :default-expanded-keys="!dea ? [treeData[0].id] : []"
        :node-key="id"
        :data="treeData"
        :show-checkbox="multiple"
        :check-strictly="false"
        :current-node-key="!multiple ? defaultValue : ''"
        :highlight-current="highlightCurrent"
        :expand-on-click-node="false"
        :check-on-click-node="multiple"
        :props="defaultProps"
        :filter-node-method="filterNode"
        :default-checked-keys="multiple ? defaultValue : []"
        @check="handleCheckChange"
        @current-change="handleNodeClickChange"
        @node-click="handleNodeClick"
      >
        <!-- @node-click="handleNodeClick" -->

        <template v-if="$slots.default" #default="{ node, data }">
          <slot :node="node" :data="data"></slot>
        </template>
        <template #empty>
          <slot name="empty"></slot>
        </template>
      </el-tree>
    </el-scrollbar>
  </div>
</template>

<script setup lang="ts" name="KrFilterTree">
import { ref, watch, onBeforeMount } from 'vue';
import { ElTree, useLocale } from 'element-plus';
import '../style/index.scss';
const { t } = useLocale();
// 接收父组件参数并设置默认值
interface FilterTreeProps {
  requestApi?: (data?: any) => Promise<any>; // 请求数据的 api ==> 非必传
  data?: { [key: string]: any }[]; // 分类数据，如果有分类数据，则不会执行 api 请求 ==> 非必传
  id?: string; // 选择的id ==> 非必传，默认为 “id”
  placeholder?: string; // 选择的id ==> 非必传，默认为 “id”
  label?: string; // 显示的label ==> 非必传，默认为 “label”
  multiple?: boolean; // 是否为多选 ==> 非必传，默认为 false
  highlightCurrent?: boolean; // 是否为多选 ==> 非必传，默认为 true
  defaultValue?: any; // 默认选中的值 ==> 非必传
  clickCancelAble?: boolean; //重复点击是否取消高亮
  dea?: boolean; //重复点击是否取消高亮
}
const props = withDefaults(defineProps<FilterTreeProps>(), {
  id: 'id',
  label: 'label',
  placeholder: '',
  multiple: false,
  highlightCurrent: true,
  dea: true,
});

const defaultProps = {
  children: 'children',
  label: props.label,
};

const filterText = ref<string>('');
const treeRef = ref<InstanceType<typeof ElTree>>();
const treeData = ref<{ [key: string]: any }[]>([]);

const setTreeData = async () => {
  if (props.data?.length) return (treeData.value = props.data);
  const { data } = await props.requestApi!();
  treeData.value = data;
  // if (props.multiple) return (treeData.value = data);
  // treeData.value = [{ id: '', [props.label]: '全部' }, ...data];
};
onBeforeMount(setTreeData);

watch(filterText, (val) => {
  treeRef.value!.filter(val);
});
// 过滤
const filterNode = (value: string, data: { [key: string]: any }, node: any) => {
  if (!value) return true;
  let parentNode = node.parent,
    labels = [node.label],
    level = 1;
  while (level < node.level) {
    labels = [...labels, parentNode.label];
    parentNode = parentNode.parent;
    level++;
  }
  return labels.some((label) => label.indexOf(value) !== -1);
};

interface FilterEmits {
  (e: 'change', value: any, data: any): void;
}
const emit = defineEmits<FilterEmits>();

//为了计算当前点击的节点是否已经高亮
let isChange: number = 0;
if (!props.multiple && props.defaultValue) {
  ++isChange;
}
// 选中节点切换时触发
const handleNodeClickChange = (data: { [key: string]: any }) => {
  isChange = 0;
  if (props.multiple) return;
  emit('change', data ? data[props.id] : '', data);
};
//点击节点时触发
const handleNodeClick = (node: any) => {
  //判断 当前节点是否已被选中
  if (isChange && props.clickCancelAble) {
    treeRef.value!.setCurrentKey(null);
  }
  ++isChange;
};
// 多选
const handleCheckChange = () => {
  emit('change', treeRef.value?.getCheckedKeys(), treeRef.value?.getCheckedNodes());
};
// 暴露给父组件的参数和方法(外部需要什么，都可以从这里暴露出去)
defineExpose({
  element: treeRef,
  setTreeData,
});
</script>
