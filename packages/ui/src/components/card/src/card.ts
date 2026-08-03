import type Card from './card.vue';
import type { CardProps as ElCardProps } from 'element-plus';

export interface CardProps {
  headerBorder?: boolean;
  header?: ElCardProps['header'];
  bodyStyle?: ElCardProps['bodyStyle'];
}
export type CardInstance = InstanceType<typeof Card>;
