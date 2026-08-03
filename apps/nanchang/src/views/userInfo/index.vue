<template>
  <div class="userInfo">
    <kr-card class="flex-1" header-border>
      <template #header>
        <div>
          <el-icon @click="openDialogChange()" class="mr8 page-back"><Back /></el-icon>
          <span class="title kr-font-medium">账号与资料</span>
        </div>
      </template>
      <div class="infos">
        <div class="info">
          <div class="info-title">个人信息</div>
          <div class="info-part">
            <div class="showImg">
              <div class="avatar">
                <img class="avatorImg" :src="imageUrl" alt="" v-if="imageUrl" />
                <el-icon v-else class="avatar-uploader-icon"><Plus /></el-icon>
              </div>
              <div class="avatarBtn">
                <el-button size="small" @click="updateAvatar">修改头像</el-button>
                <div class="tip"><span>仅支持jpg,jpeg,png格式的图片，不大于100k</span></div>
              </div>
            </div>
            <!-- </div> -->
            <el-form ref="formRef" :rules="rules" label-suffix=" :" :model="userFormData" label-width="100">
              <el-row class="">
                <el-col :span="24">
                  <el-form-item label="用户名" prop="name" label-width="100">
                    <el-input v-model="userFormData.name" disabled></el-input>
                  </el-form-item>
                </el-col>
                <el-col :span="24">
                  <el-form-item label="账号" prop="account" label-width="100">
                    <el-input v-model="userFormData.account" disabled></el-input>
                  </el-form-item>
                </el-col>
                <el-col :span="24">
                  <el-form-item label="手机号" prop="phone" label-width="100">
                    <el-input v-model="userFormData.phone" disabled></el-input>
                  </el-form-item>
                </el-col>
                <el-col :span="24">
                  <el-form-item label="默认组织" prop="defaultOrgId" label-width="100">
                    <!-- <el-input v-model="userFormData.defaultOrgId" clearable></el-input> -->
                    <el-select v-model="userFormData.defaultOrgId" placeholder="">
                      <el-option v-for="item in zzOptions" :key="item.value" :label="item.label" :value="item.value" />
                    </el-select>
                  </el-form-item>
                </el-col>
                <!-- <el-col :span="24">
                <el-form-item label="默认租户" prop="defaultAppId" label-width="100">
                  <el-select v-model="userFormData.defaultAppId" placeholder="">
                    <el-option v-for="item in zhOptions" :key="item.value" :label="item.label" :value="item.value" />
                  </el-select>
                </el-form-item>
              </el-col> -->
              </el-row></el-form
            >
          </div>
        </div>
        <div class="info">
          <div class="info-title">修改密码</div>
          <div class="info-part">
            <el-form ref="pswFormRef" :rules="rules1" label-suffix=" :" :model="passwdFormData" label-width="100">
              <el-row class="">
                <el-col :span="24">
                  <el-form-item label="旧密码" prop="oldPassword" label-width="100">
                    <el-input v-model="passwdFormData.oldPassword" type="password" show-password></el-input>
                  </el-form-item>
                </el-col>
                <el-col :span="24">
                  <el-form-item label="新密码" prop="newPassword" label-width="100">
                    <el-input v-model="passwdFormData.newPassword" type="password" show-password></el-input>
                  </el-form-item>
                </el-col>
                <el-col :span="24">
                  <el-form-item label="确认新密码" prop="newPasswordAgin" label-width="100">
                    <el-input v-model="passwdFormData.newPasswordAgin" type="password" show-password></el-input>
                  </el-form-item>
                </el-col>
              </el-row>
            </el-form>
          </div>
        </div>
      </div>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="openDialogChange()">取消</el-button>
          <el-button type="primary" @click="confirm">确定并保存</el-button>
        </div>
      </template>
    </kr-card>
    <input
      type="file"
      ref="uploadFile"
      style="display: none"
      accept=".png,.jpg,.jpeg"
      :multiple="false"
      @change="autoUploadFile"
    />
  </div>
</template>
<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue';
import { ElMessage, FormInstance, FormRules } from 'element-plus';
import {
  getUserDataByAccount,
  addOrEditUser,
  resetPassword,
  getPublicKey,
  verifyStaffInfo,
} from '@/api/modules/userInfo';
import { useRouter } from 'vue-router';
import { AuthStore } from '@/stores/modules/auth';
import { GlobalStore } from '@/stores';
import JSEncrypt from 'jsencrypt/bin/jsencrypt';

import { logoutApi } from '@/api/modules/login';
import { resetRouter } from '@/routers/index';
import { LOGIN_URL } from '@/config/config';
import { usePreview } from '@/hooks/usePreview';
import { useRemoveURLObject } from '@optCenter/hooks/use-file-utils';
const globalStore = GlobalStore();
const router = useRouter();

const authStore = AuthStore();
const uploadFile = ref();
const photoFile = ref();
const pswFormRef = ref();
const imageUrl = ref('');
let userFormData: any = ref({
  name: '',
  account: '',
  phone: '',
  defaultOrgId: '',
  defaultAppId: '',
});
let passwdFormData: any = ref({
  oldPassword: '',
  newPassword: '',
  newPasswordAgin: '',
});
const zzOptions = ref();
const zhOptions = ref();
const rules1 = {
  oldPassword: [
    {
      required: true,
      message: '请输入旧密码',
      trigger: 'blur',
      validator: async (rule: any, value: any, callback: any) => {
        await checkPassword(rule, value, callback);
      },
    },
  ],
  newPassword: [
    {
      required: true,
      message: '密码必须是包含字母、数字、特殊符号(包含下划线)的8位以上组合',
      trigger: 'blur',
      validator: (rule: any, value: any, callback: any) => {
        // checkPassword(rule, value, callback);
        const mailReg = /^(?![A-Za-z0-9]+$)(?![A-Za-z\W]+$)[a-zA-Z0-9_\W]{8,}$/;
        if (!mailReg.test(value) && value) {
          return callback(new Error('密码必须是包含字母、数字、特殊符号(包含下划线)的8位以上组合'));
        } else {
          callback();
        }
      },
    },
  ],
  newPasswordAgin: [
    {
      required: true,
      message: '输入有误',
      trigger: 'blur',
      validator: (rule: any, value: any, callback: any) => {
        checkNewPassword(rule, value, callback);
      },
    },
  ],
};
// 表单
const rules = {};

onMounted(() => {
  init();
  // this.$store.getters.mineUserInfo.account
});
//预览图片
let { getPreviewUrl } = usePreview();
let urlArr = useRemoveURLObject();
const getImgUrl = async (id: string) => {
  if (id) {
    imageUrl.value = (await getPreviewUrl({ fileId: id, currDs: '_default' })) as string;
    urlArr.add(imageUrl.value);
  }
};
const init = () => {
  getUserDataByAccount({ account: authStore.userInfo.account }).then((res) => {
    let data = res.data;
    getImgUrl(res.data.photo);
    zzOptions.value = data.orgVoList.map((item: any) => {
      const obj = {
        label: `${item.levelPathName}/${item.name}`,
        value: item.id,
      };
      return obj;
    });
    let defaultOrg = data.orgVoList.filter((item: any) => item.defaultFlag == 1);
    data.defaultOrgId = defaultOrg.length != 0 ? defaultOrg[0].id : '';
    zhOptions.value = data.appSimpleBeanList.map((item: any) => {
      const obj = {
        label: item.appName,
        value: item.appMark,
      };
      return obj;
    });
    userFormData.value = data;
  });
};
const openDialogChange = () => {
  router.back();
  // router.push('/patrolInspection/worktop');
};
const autoUploadFile = (e: any) => {
  const file = e.target.files[0];
  if (!file) return;

  const allowed = ['image/jpeg', 'image/png'];
  const extOK = /\.(jpe?g|png)$/i.test(file.name);

  if (!allowed.includes(file.type) || !extOK) {
    alert('只能上传 jpg / jpeg / png 格式的图片！');
    e.target.value = ''; // 清空
  } else {
    photoFile.value = uploadFile.value.files[0];
    imageUrl.value = URL.createObjectURL(photoFile.value);
    urlArr.add(imageUrl.value);
  }
};

//修改用户头像
const updateAvatar = () => {
  uploadFile.value?.click();
};
//保存
const confirm = async () => {
  let res;
  let delPhotoId;
  let formData = userFormData.value;
  delete formData.userOwnJurisdictionBean;
  delete formData.levelPath;
  delete formData.levelPathName;
  delete formData.orgVoList;
  delete formData.appSimpleBeanList;
  if (photoFile.value) {
    delPhotoId = userFormData.value.photo;
    formData.photo = null;
  }
  let params = {
    delPhotoId: delPhotoId,
  };
  const data = new FormData();
  data.append('staffBeanStr', JSON.stringify(formData));
  if (photoFile.value) data.append('photo', photoFile.value);
  res = (await addOrEditUser(params, data)) as any;

  //有填入旧密码
  if (passwdFormData.value.oldPassword) {
    //重置密码
    if (pswFormRef.value.validate()) {
      let param = {
        account: authStore.userInfo.account,
        password: '',
        prePassword: '',
      };
      param.password = (await encryptPassword(passwdFormData.value.newPassword)) as string;
      param.prePassword = (await encryptPassword(passwdFormData.value.oldPassword)) as string;
      let res = (await resetPassword(param)) as any;
      if (res.code == 200) {
        ElMessage.success(res.description);
        logOut();
      }
    } else {
      ElMessage.error('请完成修改密码部分');
    }
  }
  if (res.code == 200) {
    ElMessage.success(res.description);
    nextTick(() => {
      location.reload();
    });
    // logOut();
  }
  //   resetPassword()
};
const logOut = async function () {
  // 1.调用退出登录接口
  await logoutApi();
  // 2.清除 Token
  globalStore.setToken('');
  // 3.重置路由
  resetRouter();
  // 4.重定向到登陆页
  router.replace(LOGIN_URL);
  ElMessage.success('请重新登录');
};
/**
 * 用于账号密码验证时对密码的加密
 * @param {String} scope
 * @returns {String}
 */
const encryptPassword = function (val: any) {
  return new Promise((resolve, reject) => {
    getPublicKey().then((res: any) => {
      const encryptor = new JSEncrypt();
      encryptor.setPublicKey(res.data); //设置公钥
      let rsaPassWord = encryptor.encrypt(val);
      resolve(rsaPassWord);
    });
  });
};
//检验旧密码
const checkPassword = async (rule: any, val: any, callback: any) => {
  if (!val) return callback(new Error('请输入正确的密码'));
  let params = {
    account: userFormData.value.account,
    password: '',
  };
  params.password = (await encryptPassword(val)) as string;
  verifyStaffInfo(params)
    .then((res) => {
      callback();
    })
    .catch((e) => {
      return callback(new Error('请输入正确的密码'));
    });
};
//校验新密码与确认密码是否一致
const checkNewPassword = (rule: any, val: any, callback: any) => {
  let newPassword = passwdFormData.value.newPassword;
  if (newPassword != val) {
    //debugger
    return callback(new Error('密码前后不一致'));
  } else {
    callback();
  }
};
</script>
<style lang="scss" scoped>
.userInfo {
  height: 100%;

  // height: calc(100% - 20px);
  // margin-top: 20px;
}
.infos {
  width: 40%;
  margin: 0 26px;
  .info {
    .info-title {
      margin: 15px 0;

      // font-weight: 600;
      font-family: SourceHanSansCN-Medium;
      font-size: 18px;
      color: #333333;
    }
    .info-part {
      // margin-top: 10px;
      .showImg {
        margin-bottom: 15px;
        margin-left: 100px;
        .avatar {
          width: 80px;
          height: 80px;
          margin-bottom: 20px;
          .avatorImg {
            width: 100%;
            height: 100%;
            border-radius: 50%;
          }
          .avatar-uploader-icon {
            width: 100%;
            height: 100%;
            border: 1px dashed #999999;
          }
        }
        .avatarBtn {
          display: flex;
          gap: 10px;
          align-content: center;
          width: 100%;

          //   justify-content: center;
          .tip {
            height: 24px;
            font-size: 12px;
            line-height: 24px;
            color: #999999;
          }
        }
      }
    }
  }
}
.el-button + .el-button {
  margin-left: 0;
}
.dialog-footer {
  display: flex;
  gap: 16px;
  align-content: center;

  // justify-content: center;
  width: 50%;
  margin-left: 130px;
  .el-button {
    width: 100px;
  }
}
</style>
