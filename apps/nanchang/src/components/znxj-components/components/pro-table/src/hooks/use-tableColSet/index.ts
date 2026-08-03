import { AuthStore } from '@/stores/modules/auth';
import { useRoute } from 'vue-router';
import type { ColumnProps } from '../../pro-table';
import { getTableCol, setTableCol, SetTableCol } from '@/api/modules/common';
import { computed, nextTick, ref } from 'vue';
export default function (colSetting: ColumnProps[]) {
  const authStore = AuthStore();
  const route = useRoute();
  let userConfigList = ref<SetTableCol[]>([]);
  let currentUserConfig = computed(() => userConfigList.value.find((i) => i.userId === authStore.userInfo.account));
  async function getConfig() {
    if (route.name) {
      let res = await getTableCol({
        page: route.name,
        userId: authStore.userInfo.account,
      });
      userConfigList.value = res.data;
      await nextTick();
      if (currentUserConfig.value?.config) {
        let config = JSON.parse(currentUserConfig.value?.config as string) as string[];
        for (const i of colSetting) {
          if (i.isShow !== config.includes(i.label!)) {
            Reflect.set(i, 'isShow', config.includes(i.label!));
          }
        }
      }
    }
  }
  async function setConfig() {
    if (route.name) {
      let config = colSetting.filter((i) => i.isShow).map((i) => i.label);
      await setTableCol({
        page: route.name,
        userId: authStore.userInfo.account,
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
