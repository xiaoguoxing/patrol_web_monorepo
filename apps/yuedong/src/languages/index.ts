import { createI18n } from 'vue-i18n';
import { en, zh, zhHK } from '@patrol/languages';
import { provideHandleDataTranslator } from '@patrol/shared/hooks/useHandleData';

const i18n = createI18n({
  legacy: false,
  locale: 'zh',
  globalInjection: true,
  messages: { zh, en, 'zh-HK': zhHK },
});

provideHandleDataTranslator((key, params) => (i18n.global.te(key) ? i18n.global.t(key, params ?? {}) : undefined));

export default i18n;
