<template>
  <el-popover placement="bottom" popper-class="user-header-nav-info" :width="160" trigger="hover">
    <template #reference>
      <div class="user-header-info">
        <div class="avatar">
          <!-- <el-img :src="photoUrl" /> -->
          <!-- <el-image class="flex-1" :src="photoUrl" fit="scale-down" /> -->
          <img :src="photoUrl" alt="avatar" />
        </div>
        <span class="user-name"
          >{{ authStore.userInfo.userName }} <el-icon class="right-icon"><CaretBottom /></el-icon
        ></span>
      </div>
    </template>
    <div class="user-info__content">
      <div class="user-info__item" @click="goSys()">
        <!-- openDialog('infoRef') -->
        <el-icon class="icon"><Position /></el-icon>
        <div class="text">{{ $t('header.goFrom') }}{{ sysName }}</div>
      </div>
      <div class="user-info__item" @click="gotoUser()">
        <!-- openDialog('infoRef') -->
        <el-icon class="icon"><User /></el-icon>
        <div class="text">{{ $t('header.zlofuser') }}</div>
      </div>
      <div class="user-info__item" @click="logout">
        <el-icon class="icon"><SwitchButton /></el-icon>
        <div class="text">{{ $t('header.logout') }}</div>
      </div>
    </div>
  </el-popover>
  <!-- infoDialog -->
  <!-- <InfoDialog ref="infoRef"></InfoDialog> -->
  <!-- passwordDialog -->
  <PasswordDialog ref="passwordRef"></PasswordDialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { GlobalStore } from '@/stores';
import { AuthStore } from '@/stores/modules/auth';

import { LOGIN_URL } from '@/config/config';
import { resetRouter } from '@/routers/index';
import { getAuthUserApi, logoutApi } from '@/api/modules/login';
import { useRouter } from 'vue-router';
import { ElMessageBox, ElMessage } from 'element-plus';
// import InfoDialog from './InfoDialog.vue';
import PasswordDialog from './PasswordDialog.vue';
import { usePreview } from '@/hooks/usePreview';
import imgUrl from '@/assets/images/avatar.svg';
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
const { getPreviewUrl } = usePreview();
const router = useRouter();
const globalStore = GlobalStore();
const authStore = AuthStore();
const photoUrl = ref(imgUrl);

getPreviewUrl({ fileId: authStore.userInfo.photo, currDs: '_default' })
  .then((res) => {
    photoUrl.value = res || imgUrl;
  })
  .catch((err) => {
    console.error(err);
  });
const gotoUser = () => {
  router.push('/patrolInspection/worktop/userInfo');
};
async function redirect() {
  try {
    await logoutApi();
  } catch (e: any) {
    window.location.replace(e.response.headers.redirecturl);
  }
}
// 退出登录
const logout = () => {
  ElMessageBox.confirm(t('messageTip.logoutMsg1'), t('messageTip.logoutMsg2'), {
    confirmButtonText: t('ui.confirm'),
    cancelButtonText: t('ui.cancel'),
    type: 'warning',
  }).then(async () => {
    // 1.调用退出登录接口
    await redirect();
    // 2.清除 Token
    globalStore.setToken('');
    // 3.重置路由
    resetRouter();
    // 4.重定向到登陆页
    router.replace(LOGIN_URL);
    /*try {
      await logoutApi();
    } catch (e: any) {
      window.location.replace(e.response.headers.redirecturl);
    }*/
    ElMessage.success(t('messageTip.logoutMsg3'));
  });
};

interface DialogExpose {
  openDialog: () => void;
}
const infoRef = ref<null | DialogExpose>(null);
const passwordRef = ref<null | DialogExpose>(null);
// 打开修改密码和个人信息弹窗
const openDialog = (refName: string) => {
  if (refName == 'infoRef') infoRef.value?.openDialog();
  else passwordRef.value?.openDialog();
};
const sysName = computed(() => import.meta.env.VITE_SYS_NAME);
function goSys() {
  let baseUrl = import.meta.env.VITE_SYS_URL;
  window.open(`${baseUrl}/#/patrolInspection/worktop?token=${globalStore.token}`, '_blank');
}
</script>
<style lang="scss">
.el-popper.user-header-nav-info {
  --user-info-height: 40px;
  --user-info-padding-left: 20px;

  padding: 20px 0;
  border: none;
  border-radius: 0;
}
</style>
<style scoped lang="scss">
.user-header-info {
  display: flex;
  align-items: center;
  height: 100%;
  cursor: pointer;
  .avatar {
    width: 44px;
    height: 44px;
    overflow: hidden;
    border-radius: 50%;
    img {
      width: 100%;
      height: 100%;
    }
  }
  .user-name {
    margin-left: 9px;
  }
  .right-icon {
    margin-left: 6px;
  }
}
.user-info__content {
  .user-info__item {
    display: flex;
    align-items: center;
    height: var(--user-info-height);
    padding-left: var(--user-info-padding-left);
    color: #333333;
    cursor: pointer;
    &:hover {
      color: var(--el-color-primary);
      background: #f8f8f8;
    }
    .icon {
      font-size: 18px;
    }
    .text {
      margin-left: 9px;
    }
  }
}
</style>
