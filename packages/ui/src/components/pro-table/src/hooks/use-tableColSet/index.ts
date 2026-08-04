import { computed, nextTick, ref } from 'vue';
import { useUiAdapter, type TableColConfig } from '../../../../../adapter';
import type { ColumnProps } from '../../pro-table';

export default function (colSetting: ColumnProps[]) {
  const adapter = useUiAdapter();
  const userConfigList = ref<TableColConfig[]>([]);
  const currentUserConfig = computed(() =>
    userConfigList.value.find((item) => item.userId === adapter.getCurrentUserId())
  );

  async function getConfig() {
    const page = adapter.getCurrentPage();
    if (page) {
      const res = await adapter.getTableCol({
        page,
        userId: adapter.getCurrentUserId(),
      });
      userConfigList.value = res.data;
      await nextTick();
      if (currentUserConfig.value?.config) {
        const config = JSON.parse(currentUserConfig.value.config) as string[];
        for (const item of colSetting) {
          if (item.isShow !== config.includes(item.label!)) {
            Reflect.set(item, 'isShow', config.includes(item.label!));
          }
        }
      }
    }
  }

  async function setConfig() {
    const page = adapter.getCurrentPage();
    if (page) {
      const config = colSetting.filter((item) => item.isShow).map((item) => item.label);
      await adapter.setTableCol({
        page,
        userId: adapter.getCurrentUserId(),
        type: 'column',
        id: currentUserConfig.value?.id,
        config: JSON.stringify(config),
      });
    }
  }

  return {
    backColSetting: colSetting,
    userConfigList,
    currentUserConfig,
    getConfig,
    setConfig,
  };
}
