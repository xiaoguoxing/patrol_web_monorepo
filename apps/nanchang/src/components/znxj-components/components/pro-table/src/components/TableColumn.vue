<template>
  <component :is="renderLoop(column, index)" />
</template>

<script lang="tsx" setup>
import { inject, ref, useSlots } from 'vue';
import { ElTableColumn, ElTag } from 'element-plus';
import { filterEnum, formatValue, handleRowAccordingToProp } from '@/components/znxj-components/utils';
import type { ColumnProps } from '../pro-table';
import { isFunction } from '@/components/znxj-components/utils';
const slots = useSlots();

defineProps<{ column: ColumnProps; index: number }>();

const enumMap = inject('enumMap', ref(new Map()));
const propFun = (item: ColumnProps, index: number) => {
  return isFunction(item.prop) && item.prop(index) ? item.prop(index) : item.prop;
};
// 渲染表格数据
const renderCellData = (item: ColumnProps, scope: { [key: string]: any }, index: number) => {
  return enumMap.value.get(propFun(item, index)) && item.isFilterEnum
    ? filterEnum(
        handleRowAccordingToProp(scope.row, propFun(item, index)!),
        enumMap.value.get(propFun(item, index))!,
        item.fieldNames
      )
    : formatValue(handleRowAccordingToProp(scope.row, propFun(item, index)!));
};

// 获取 tag 类型
const getTagType = (item: ColumnProps, scope: { [key: string]: any }, index: number) => {
  return filterEnum(
    handleRowAccordingToProp(scope.row, propFun(item, index)!),
    enumMap.value.get(propFun(item, index)),
    item.fieldNames,
    'tag'
  ) as any;
};
const filterHandler = (value: string, row: any, column: ColumnProps) => {
  const property = column['property'] as string;
  return row[property] === value;
};
const renderLoop = (item: ColumnProps, index: number) => {
  if (item.isShow) {
    return (
      <ElTableColumn
        {...item}
        prop={propFun(item, index)}
        align={item.align ?? 'left'}
        showOverflowTooltip={item.showOverflowTooltip ?? item.prop !== 'operation'}
        columnKey={item.columnKey ?? item.prop}
        filterPlacement={item.filterPlacement ?? 'bottom'}
        // filterMethod={item.filters ? item.filterMethod ?? filterHandler : undefined}
      >
        {{
          default: (scope: any) => {
            if (item._children) return item._children.map((child, index) => renderLoop(child, index));
            if (item.render) return item.render(scope);
            if (slots[item.prop!]) return slots[item.prop!]!(scope);
            if (item.tag)
              return <ElTag type={getTagType(item, scope, index)}>{renderCellData(item, scope, index)}</ElTag>;
            return renderCellData(item, scope, index);
          },
          header: () => {
            if (item.headerRender) return item.headerRender(item);
            if (slots[`${item.prop}Header`]) return slots[`${item.prop}Header`]!({ row: item });
            return item.label;
          },
        }}
      </ElTableColumn>
    );
  }
};
</script>
