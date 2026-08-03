import { ResPage, User } from '@/api/interface/index';
import { PORT_INSPECT } from '@/api/config/servicePort';
import http from '@/api';

/**
 * @name 用户管理模块
 */
// * 获取用户列表
export const getUserList = (params: User.ReqGetUserParams) => {
  return http.post<ResPage<User.ResUserList>>(PORT_INSPECT + `/user/list`, params);
};

// * 新增用户
export const addUser = (params: { id: string }) => {
  return http.post(PORT_INSPECT + `/user/add`, params);
};

// * 批量添加用户
export const BatchAddUser = (params: FormData) => {
  return http.post(PORT_INSPECT + `/user/import`, params);
};

// * 编辑用户
export const editUser = (params: { id: string }) => {
  return http.post(PORT_INSPECT + `/user/edit`, params);
};

// * 删除用户
export const deleteUser = (params: { id: string[] }) => {
  return http.post(PORT_INSPECT + `/user/delete`, params);
};

// * 切换用户状态
export const changeUserStatus = (params: { id: string; status: number }) => {
  return http.post(PORT_INSPECT + `/user/change`, params);
};

// * 重置用户密码
export const resetUserPassWord = (params: { id: string }) => {
  return http.post(PORT_INSPECT + `/user/rest_password`, params);
};

// * 导出用户数据
export const exportUserInfo = (params: User.ReqGetUserParams) => {
  return http.post<BlobPart>(PORT_INSPECT + `/user/export`, params, { responseType: 'blob' });
};

// * 获取用户状态
export const getUserStatus = () => {
  return http.get<User.ResStatus>(PORT_INSPECT + `/user/status`);
};

// * 获取用户性别字典
export const getUserGender = () => {
  return http.get<User.ResGender>(PORT_INSPECT + `/user/gender`);
};

// * 获取用户部门列表
export const getUserDepartment = () => {
  return http.get<User.ResDepartment>(PORT_INSPECT + `/user/department`);
};
