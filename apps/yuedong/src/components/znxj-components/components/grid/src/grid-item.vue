<template>
  <div :style="style" v-show="isShow">
    <slot />
  </div>
</template>
<script lang="ts">
import { defineComponent, computed, inject, ref, useAttrs, watch } from 'vue';
import { gridItemProps } from './grid-item';
import type { Ref } from 'vue';
import type { BreakPoint } from './grid';
export default defineComponent({
  name: 'KrGridItem',
  props: gridItemProps,
  setup(props) {
    const attrs = useAttrs() as any;
    const isShow = ref(true);

    // 注入断点
    const breakPoint = inject<Ref<BreakPoint>>('breakPoint', ref('xl'));
    const shouldHiddenIndex = inject<Ref<number>>('shouldHiddenIndex', ref(-1));
    watch(
      () => [shouldHiddenIndex.value, breakPoint.value],
      (n) => {
        if (attrs.index) {
          isShow.value = !(n[0] !== -1 && Number.parseInt(attrs.index) >= n[0]);
        }
      },
      { immediate: true }
    );

    const gap = inject('gap', 0);
    const cols = inject<Ref<number>>('cols', ref(4));
    const style = computed(() => {
      let span = props[breakPoint.value]?.span ?? props.span;
      let offset = props[breakPoint.value]?.offset ?? props.offset;
      if (props.suffix) {
        return {
          gridColumnStart: cols.value - span - offset + 1,
          gridColumnEnd: `span ${span + offset}`,
          marginLeft: offset !== 0 ? `calc(((100% + ${gap}px) / ${span + offset}) * ${offset})` : 'unset',
        };
      } else {
        return {
          gridColumn: `span ${span + offset > cols.value ? cols.value : span + offset}/span ${
            span + offset > cols.value ? cols.value : span + offset
          }`,
          marginLeft: offset !== 0 ? `calc(((100% + ${gap}px) / ${span + offset}) * ${offset})` : 'unset',
        };
      }
    });
    return {
      style,
      isShow,
    };
  },
});
</script>
<!-- <script setup lang="ts" name="GridItem">
import { computed, inject, ref, useAttrs, watch } from 'vue';
import { gridItemProps } from './grid-item';
import type { Ref } from 'vue';
import type { BreakPoint } from './grid';
defineOptions({
  name: 'KrGridItem',
});
const props = defineProps(gridItemProps);

const attrs = useAttrs() as any;
const isShow = ref(true);

// 注入断点
const breakPoint = inject<Ref<BreakPoint>>('breakPoint', ref('xl'));
const shouldHiddenIndex = inject<Ref<number>>('shouldHiddenIndex', ref(-1));
watch(
  () => [shouldHiddenIndex.value, breakPoint.value],
  (n) => {
    if (attrs.index) {
      isShow.value = !(n[0] !== -1 && Number.parseInt(attrs.index) >= n[0]);
    }
  },
  { immediate: true }
);

const gap = inject('gap', 0);
const cols = inject<Ref<number>>('cols', ref(4));
const style = computed(() => {
  let span = props[breakPoint.value]?.span ?? props.span;
  let offset = props[breakPoint.value]?.offset ?? props.offset;
  if (props.suffix) {
    return {
      gridColumnStart: cols.value - span - offset + 1,
      gridColumnEnd: `span ${span + offset}`,
      marginLeft:
        offset !== 0
          ? `calc(((100% + ${gap}px) / ${span + offset}) * ${offset})`
          : 'unset',
    };
  } else {
    return {
      gridColumn: `span ${
        span + offset > cols.value ? cols.value : span + offset
      }/span ${span + offset > cols.value ? cols.value : span + offset}`,
      marginLeft:
        offset !== 0
          ? `calc(((100% + ${gap}px) / ${span + offset}) * ${offset})`
          : 'unset',
    };
  }
});
</script> -->
