<template>
  <div class="tool-bar-ri">
    <a v-if="system" class="header-link" :href="url" target="_blank">{{ $t('header.sysAdmin') }}</a>
    <div class="header-icon">
      <!--      <AssemblySize id="assemblySize" />

      <SearchMenu id="searchMenu" />

      <Message id="message" />

      <Fullscreen id="fullscreen" />
      <ThemeSetting id="themeSetting" />-->
      <Language id="language" />
    </div>

    <MessageAlarm id="MessageAlarm" />
    <Help class="mr32" />
    <Avatar />
    <AlarmDialog />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
// import SearchMenu from './components/SearchMenu.vue';
// import Fullscreen from './components/Fullscreen.vue';
// import Message from './components/Message.vue';
import MessageAlarm from './components/MessageAlarm.vue';
import AlarmDialog from './components/AlarmDialog.vue';
import Language from './components/Language.vue';
// import ThemeSetting from './components/ThemeSetting.vue';
// import AssemblySize from './components/AssemblySize.vue';
import Help from './components/Help.vue';
import Avatar from './components/Avatar.vue';
import { getEnvConfig } from '@/utils/getEnv';
// import vuePlugin from '@vitejs/plugin-vue';
import { AuthStore } from '@/stores/modules/auth';

import { GlobalStore } from '@/stores';
const globalStore = GlobalStore();
const authStore = AuthStore();
const token: string = globalStore.token;
const currDs: string = globalStore.currDs;
const currOrg: string = globalStore.currOrg;
const system = authStore.allAuthMenuList.find((item) => item.name == 'systemManagement');
const url =
  system?.meta.isLink +
  '/#/systemManagement?token=' +
  token +
  // 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJleHAiOjE3MDk1NDkyOTEsImFjY291bnQiOiJnYW95dWFuIn0.fc46JHm9gVS8Di78Q-6TFBCX7bvZfg3yEQWkXSSs0WU' +
  '&currDs=' +
  currDs +
  // 'water_02' +
  '&currOrg=' +
  currOrg;
</script>

<style scoped lang="scss">
.tool-bar-ri {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 $kr-body-padding;
  .header-link {
    margin-right: 32px;
    font-size: var(--el-font-size-medium);
  }
  .header-icon {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-right: 24px;
  }
}
</style>
