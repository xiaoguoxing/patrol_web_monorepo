<template>
  <kr-public-dialog
    :title="resolvedDialogTitle"
    v-model="show"
    width="1380"
    height="75%"
    @doSubmit="confirm"
    @doClose="close"
  >
    <component
      :is="TreeListComponent"
      v-if="show"
      ref="treeList"
      v-bind="$attrs"
      :selectable="true"
      @change="getSelData"
    >
      <template #treeHeader>
        <slot name="treeHeader"></slot>
      </template>
      <template #tree="{ node, data }">
        <slot name="tree" :node="node" :data="data"></slot>
      </template>
    </component>
  </kr-public-dialog>
</template>
<script setup lang="ts" name="KrTreeListSelect">
import { computed, ref, watch, useAttrs, onBeforeMount } from 'vue';
import { useLocale } from 'element-plus';
import KrTreeList from './treeList.vue';
import '../style/index.scss';

const TreeListComponent = KrTreeList as any;

defineOptions({
  name: 'KrTreeListSelect',

  inheritAttrs: false,
});
// 接收父组件参数并设置默认值
interface TreeListSelectProps {
  dialogTitle?: string; // 弹窗标题 ==> 非必传，默认为 “请选择”
  visible?: boolean;
}
const props = withDefaults(defineProps<TreeListSelectProps>(), {
  visible: false,
});
const { t } = useLocale();
const resolvedDialogTitle = computed(() => props.dialogTitle || t('el.patrol.selectPlaceholder'));
const emit = defineEmits(['confirm', 'close', 'update:visible']);
const show = ref(false);

// 获取 ProTable 元素，调用其获取刷新数据方法（还能获取到当前查询参数，方便导出携带参数）
const treeList = ref();
const attrs = useAttrs() as Record<string, any>;
const selData = ref<{ [key: string]: any }[]>([]);
// 勾选的数据变化时触发
const getSelData = (data: { [key: string]: any }[]) => {
  selData.value = data;
};
const confirm = () => {
  if (attrs.multiple) {
    let selectedIds = selData.value.map((o) => o[attrs.id]);
    emit('confirm', selectedIds, selData.value);
  } else {
    if (!selData.value.length) {
      emit('confirm', '', {});
      return;
    }
    let selectedIds = selData.value.map((o) => o[attrs.id]);
    emit('confirm', selectedIds[0], selData.value[0]);
  }
  show.value = false;
};

const close = () => {
  show.value = false;
  emit('close');
};
watch(
  () => props.visible,
  (val) => {
    show.value = val;
  },
  {
    immediate: true,
  }
);
watch(
  () => show.value,
  (val) => {
    emit('update:visible', val);
  },
  {
    immediate: true,
  }
);
onBeforeMount(() => {
  show.value = props.visible;
});
</script>
