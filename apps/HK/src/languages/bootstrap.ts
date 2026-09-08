import { getRemoteLanguagePack, getRemoteLanguages, type RemoteLanguagePack } from '@/api/modules/i18n';
import { GlobalStore } from '@/stores';
import type { LanguageOption } from '@/stores/interface';
import i18n, { resetLocaleMessage } from './index';
import { buildRemoteMessages, normalizeLanguages } from './remote';

const LOCAL_LANGUAGES: LanguageOption[] = [
  { code: 'zh', name: '简体中文', isDefault: true },
  { code: 'zh-HK', name: '繁體中文', isDefault: false },
  { code: 'en', name: 'English', isDefault: false },
];

let loading: Promise<void> | undefined;
let initialized = false;
let hasLoadedRemoteLanguages = false;
let preserveInitialLanguage = false;

const applyLanguages = (languages: LanguageOption[], preserveCurrent = true): string => {
  const globalStore = GlobalStore();
  // 接口成功时由后端决定可选语言；返回空数组时回退到本地配置。
  const selectableLanguages = languages.length ? languages : LOCAL_LANGUAGES;
  globalStore.setLanguageOptions(selectableLanguages);

  const currentLanguage =
    preserveCurrent && selectableLanguages.some((item) => item.code === globalStore.language)
      ? globalStore.language
      : '';
  const defaultLanguage = selectableLanguages.find((item) => item.isDefault)?.code ?? selectableLanguages[0].code;
  const selectedLanguage = selectableLanguages.some((item) => item.code === currentLanguage)
    ? currentLanguage
    : defaultLanguage;
  i18n.global.locale.value = selectedLanguage;
  globalStore.updateLanguage(selectedLanguage);
  return selectedLanguage;
};

const applyLanguagePack = (language: string, languagePack: RemoteLanguagePack) => {
  // 先恢复本地词条，确保服务端已删除的旧词条不会在 refresh 后残留。
  resetLocaleMessage(language);
  i18n.global.mergeLocaleMessage(language, buildRemoteMessages(languagePack));
};

const applyLocalLanguageFallback = () => applyLanguages(LOCAL_LANGUAGES);

/** 启动时加载服务端语言和词条；失败的接口保留现有配置，首次失败则使用本地配置。 */
export const initializeRemoteI18n = async (): Promise<void> => {
  if (loading) return loading;
  loading = (async () => {
    const globalStore = GlobalStore();
    if (!initialized) preserveInitialLanguage = Boolean(globalStore.language);
    let selectedLanguage = globalStore.language;

    try {
      const languageResult = await getRemoteLanguages();
      const languages = Array.isArray(languageResult.data) ? normalizeLanguages(languageResult.data) : [];
      selectedLanguage = applyLanguages(languages, hasLoadedRemoteLanguages || preserveInitialLanguage);
      hasLoadedRemoteLanguages = true;
    } catch {
      // 首次加载失败时必须建立本地可用状态；refresh 失败则保留当前语言列表。
      if (!initialized) selectedLanguage = applyLocalLanguageFallback();
    }

    if (selectedLanguage) {
      try {
        const languagePackResult = await getRemoteLanguagePack(selectedLanguage);
        const languagePack = languagePackResult.data;
        if (languagePack && typeof languagePack === 'object' && !Array.isArray(languagePack)) {
          applyLanguagePack(selectedLanguage, languagePack);
        }
      } catch {
        // 保留当前已合并词条；首次加载时 i18n 中已有对应的本地兜底。
      }
    }
    initialized = true;
  })();

  try {
    await loading;
  } finally {
    loading = undefined;
  }
};

/** 后台词条或语言配置更新后调用，重新请求并合并最新配置。 */
export const refreshRemoteI18n = () => initializeRemoteI18n();
