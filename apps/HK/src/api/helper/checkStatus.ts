import { ElMessage } from 'element-plus';
import I18n from '@/languages/index';
const t = function (str: string) {
  return I18n.global.t(str);
};
/**
 * @description: 校验网络请求状态码
 * @param {Number} status
 * @return void
 */
export const checkStatus = (status: number): void => {
  switch (status) {
    case 400:
      ElMessage.error(t('error.400'));
      break;
    case 401:
      ElMessage.error(t('error.401'));
      break;
    case 403:
      ElMessage.error(t('error.403'));
      break;
    case 404:
      ElMessage.error(t('error.404'));
      break;
    case 405:
      ElMessage.error(t('error.405'));
      break;
    case 408:
      ElMessage.error(t('error.408'));
      break;
    case 500:
      ElMessage.error(t('error.500'));
      break;
    case 502:
      ElMessage.error(t('error.502'));
      break;
    case 503:
      ElMessage.error(t('error.503'));
      break;
    case 504:
      ElMessage.error(t('error.504'));
      break;
    case 302:
      ElMessage.error(t('error.302'));
      break;
    default:
      ElMessage.error(t('error.other'));
  }
};
