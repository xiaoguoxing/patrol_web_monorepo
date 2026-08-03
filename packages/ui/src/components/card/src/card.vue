<template>
  <div :class="['kr-card', border ? 'kr-card--border' : '']">
    <div
      v-if="$slots.header || header || $slots.headerRight"
      :class="['kr-card__header', 'flx-justify-between', headerBorder ? 'kr-card__header--border' : '']"
    >
      <slot name="header">
        <span class="title kr-font-medium">{{ header }}</span>
        <slot name="headerRight"></slot>
      </slot>
    </div>

    <div class="kr-card__body" :style="bodyStyle" :class="bodyClass">
      <slot name="default"></slot>
    </div>
    <div v-if="$slots.footer" class="kr-card__footer">
      <slot name="footer"></slot>
    </div>
  </div>
</template>

<script setup lang="ts" name="KrCard">
import type { CardProps as ElCardProps } from 'element-plus';
import '../../style/index.scss';
import '../style/index.scss';

interface CardProps {
  border?: boolean;
  headerBorder?: boolean;
  header?: ElCardProps['header'];
  bodyStyle?: ElCardProps['bodyStyle'];
  bodyClass?: ElCardProps['bodyClass'];
}
const props = withDefaults(defineProps<CardProps>(), {});
</script>
