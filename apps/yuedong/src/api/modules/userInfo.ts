import http from '@/api';
import { PORT_INSPECT, PORT_SYSTEM } from '@/api/config/servicePort';

export const getUserInfo = (params: any) => {
  return http.get<any>(PORT_SYSTEM + `/system/staff/getCurrUserInfo`, params);
};

export const getUserDataByAccount = (params: any) => {
  return http.get<any>(PORT_SYSTEM + `/system/staff/getSingleUserInfo`, params);
};
//保存数据
export const addOrEditUser = (params: any, data: any) => {
  let t = '';
  if (params.delPhotoId) t = '?delPhotoId=' + params.delPhotoId;
  return http.put<any>(PORT_SYSTEM + `/system/staff/updateUser` + t, data);
};
//重置密码
export const resetPassword = (params: any) => {
  let t = '?';
  if (params) {
    Object.keys(params).forEach((key) => {
      let arr = encodeURI(params[key]).replace(/\+/g, '%2B');
      t += `${key}=${arr}&`;
    });
  }

  return http.put<any>(PORT_SYSTEM + `/system/staff/resetPw` + t.substring(0, t.length - 1));
};
//公钥
export const getPublicKey = () => {
  return http.get<any>(PORT_SYSTEM + `/system/staff/getPublicKey`, {}, { headers: { noLoading: true } });
};
//校验用户名密码
export const verifyStaffInfo = (data: any) => {
  return http.post<any>(PORT_SYSTEM + `/system/staff/ticketVerifyStaffInfo`, data, { headers: { noLoading: true } });
};
