import { createI18n } from 'vue-i18n';
import { en, zh, zhHK } from '@patrol/languages';
import { provideHandleDataTranslator } from '@patrol/shared/hooks/useHandleData';
const cloneMessages = <T>(messages: T): T => JSON.parse(JSON.stringify(messages)) as T;
const LOCAL_MESSAGES = { zh, en, 'zh-HK': zhHK };

const getLocalMessage = (language: string) => {
  return LOCAL_MESSAGES[language as keyof typeof LOCAL_MESSAGES];
};

const i18n = createI18n({
  legacy: false,
  locale: 'zh',
  globalInjection: true,
  // 使用副本，避免 mergeLocaleMessage 修改作为刷新基线的本地语言包。
  messages: cloneMessages(LOCAL_MESSAGES),
});

provideHandleDataTranslator((key, params) => (i18n.global.te(key) ? i18n.global.t(key, params ?? {}) : undefined));

/** 将指定语言恢复成本地词条；没有本地语言包时恢复为空对象。 */
export const resetLocaleMessage = (language: string) => {
  const localMessage = getLocalMessage(language);
  i18n.global.setLocaleMessage(language, localMessage ? cloneMessages(localMessage) : {});
};

export default i18n;
