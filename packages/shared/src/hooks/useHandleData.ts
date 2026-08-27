import { ElMessageBox, ElMessage } from 'element-plus';
import { HandleData } from './interface';

type TranslateParams = Record<string, string | number>;
type HandleDataTranslator = (key: string, params?: TranslateParams) => string | undefined;

let translator: HandleDataTranslator | undefined;

/**
 * 注入宿主应用的翻译能力，避免共享包反向依赖具体应用或 vue-i18n。
 */
export const provideHandleDataTranslator = (value: HandleDataTranslator) => {
  translator = value;
};

const translate = (key: string, fallback: string, params?: TranslateParams) => translator?.(key, params) || fallback;

/**
 * @description 操作单条数据信息(二次确认【删除、禁用、启用、重置密码】)
 * @param {Function} api 操作数据接口的api方法(必传)
 * @param {Object} params 携带的操作数据参数 {id,params}(必传)
 * @param {String} message 提示信息(必传)
 * @param {String} messageAll 提示信息完整形式(必传)
 * @param {String} confirmType icon类型(不必传,默认为 warning)
 * @return Promise
 */
export const useHandleData = <P = any, R = any>(
  api: (params: P) => Promise<R>,
  params: Parameters<typeof api>[0],
  message: string,
  messageAll?: string,
  confirmType: HandleData.MessageType = 'warning'
) => {
  return new Promise((resolve, reject) => {
    const confirmMessage = messageAll || translate('messageTip.confirmMessage', `是否${message}?`, { message });
    ElMessageBox.confirm(confirmMessage, translate('messageTip.logoutMsg2', '温馨提示'), {
      confirmButtonText: translate('ui.confirm', '确定'),
      cancelButtonText: translate('ui.cancel', '取消'),
      type: confirmType,
      draggable: true,
    })
      .then(async () => {
        const res = await api(params);
        if (!res) return reject(false);
        ElMessage({
          type: 'success',
          message: translate('messageTip.successMessage', `${message}成功!`, { message }),
        });
        resolve(true);
      })
      .catch(() => {
        reject();
      });
  });
};
