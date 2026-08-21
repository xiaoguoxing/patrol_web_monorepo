<template>
  <el-form ref="loginFormRef" :model="loginForm" :rules="loginRules" size="large">
    <el-form-item prop="account">
      <el-input v-model="loginForm.account" :placeholder="$t('inputPlaceholder.username')">
        <template #prefix>
          <el-icon class="el-input__icon"><user /></el-icon>
        </template>
      </el-input>
    </el-form-item>
    <el-form-item prop="password">
      <el-input
        type="password"
        v-model="loginForm.password"
        :placeholder="$t('inputPlaceholder.password')"
        autocomplete="new-password"
      >
        <template #prefix>
          <el-icon class="el-input__icon"><lock /></el-icon>
        </template>
      </el-input>
    </el-form-item>
  </el-form>
  <div class="login-btn">
    <el-button :icon="CircleClose" round @click="resetForm(loginFormRef)" size="large">{{ $t('ui.reset') }}</el-button>
    <el-button :icon="UserFilled" round @click="login(loginFormRef)" size="large" type="primary" :loading="loading">
      {{ $t('buttonName.login') }}
    </el-button>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { Login } from '@/api/interface';
import { ElNotification } from 'element-plus';
import { loginApi, getPublicKeyApi } from '@/api/modules/login';
import { TabsStore } from '@/stores/modules/tabs';
import { getTimeState } from '@/utils/util';
import { HOME_URL } from '@/config/config';
import { initDynamicRouter } from '@/routers/modules/dynamicRouter';
import { CircleClose, UserFilled } from '@element-plus/icons-vue';
import type { ElForm } from 'element-plus';
// tsconfig disabled
import JSEncrypt from 'jsencrypt/bin/jsencrypt';
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
// import md5 from 'js-md5';
const router = useRouter();
const tabsStore = TabsStore();

// 定义 formRef（校验规则）
type FormInstance = InstanceType<typeof ElForm>;
const loginFormRef = ref<FormInstance>();
const loginRules = reactive({
  account: [
    {
      required: true,
      message: t('inputPlaceholder.placeholderBase') + t('inputPlaceholder.username'),
      trigger: 'blur',
    },
  ],
  password: [
    {
      required: true,
      message: t('inputPlaceholder.placeholderBase') + t('inputPlaceholder.password'),
      trigger: 'blur',
    },
  ],
});

const loading = ref(false);
const loginForm = reactive<Login.ReqLoginForm>({ account: '', password: '' });
const login = (formEl: FormInstance | undefined) => {
  if (!formEl) return;
  formEl.validate(async (valid) => {
    if (!valid) return;
    loading.value = true;
    try {
      // 1.执行登录接口
      const formData = {
        account: loginForm.account,
        password: (await encryptPassword(loginForm.password)) as string,
      };
      await loginApi(formData);
      // TODO:后端改接口接收登录信息
      // globalStore.setToken(data.access_token);

      // 2.添加动态路由
      await initDynamicRouter();

      // 3.清除上个账号的 tab 信息
      tabsStore.closeMultipleTab();

      // 4.跳转到首页
      router.push(HOME_URL);
      ElNotification({
        title: getTimeState(),
        message: t('home.welcome') + t('home.sysName'),
        type: 'success',
        duration: 3000,
      });
    } finally {
      loading.value = false;
    }
  });
};

// resetForm
const resetForm = (formEl: FormInstance | undefined) => {
  if (!formEl) return;
  formEl.resetFields();
};
// 传给服务端加密后的密码
const encryptPassword = (val) => {
  return new Promise((resolve, reject) => {
    getPublicKeyApi()
      .then((res) => {
        const encryptor = new JSEncrypt();
        encryptor.setPublicKey(res.data); //设置公钥
        let rsaPassWord = encryptor.encrypt(val);
        resolve(rsaPassWord);
      })
      .catch((err) => {
        reject(err);
      });
  });
};
onMounted(() => {
  // 监听enter事件（调用登录）
  document.onkeydown = (e: any) => {
    e = window.event || e;
    if (e.code === 'Enter' || e.code === 'enter' || e.code === 'NumpadEnter') {
      if (loading.value) return;
      login(loginFormRef.value);
    }
  };
});
</script>

<style scoped lang="scss">
@use '../index.scss';
</style>
