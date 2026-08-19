import { createI18n } from 'vue-i18n';
import { en, zh, zhHK } from '@patrol/languages';

const i18n = createI18n({
  legacy: false,
  locale: 'zh',
  globalInjection: true,
  messages: { zh, en, 'zh-HK': zhHK },
});

export default i18n;
