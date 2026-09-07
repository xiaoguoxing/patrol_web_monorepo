import type { RemoteLanguage, RemoteLanguagePack } from '@/api/modules/i18n';
import type { LanguageOption } from '@/stores/interface';

type MessageTree = Record<string, string | MessageTree>;
const FORBIDDEN_PATHS = new Set(['__proto__', 'prototype', 'constructor']);

export const normalizeLanguages = (items: RemoteLanguage[] | undefined): LanguageOption[] => {
  const seen = new Set<string>();
  return (items ?? []).reduce<LanguageOption[]>((languages, item) => {
    const code = typeof item.langCode === 'string' ? item.langCode.trim() : '';
    if (!code || seen.has(code)) return languages;
    seen.add(code);
    languages.push({
      code,
      name: typeof item.langName === 'string' && item.langName.trim() ? item.langName : code,
      isDefault: item.isDefault === 1,
    });
    return languages;
  }, []);
};

const setByPath = (target: MessageTree, key: string, value: string) => {
  const paths = key.split('.').filter(Boolean);
  if (!paths.length || paths.some(path => FORBIDDEN_PATHS.has(path))) return;
  let current = target;
  paths.slice(0, -1).forEach(path => {
    const next = current[path];
    if (!next || typeof next === 'string') current[path] = {};
    current = current[path] as MessageTree;
  });
  current[paths[paths.length - 1]] = value;
};

/** 将 user.name 形式的服务端键值对转换成 vue-i18n 嵌套消息对象。 */
export const buildRemoteMessages = (languagePack: RemoteLanguagePack): MessageTree => {
  return Object.entries(languagePack).reduce<MessageTree>((messages, [key, value]) => {
    if (typeof value === 'string') setByPath(messages, key, value);
    return messages;
  }, {});
};
