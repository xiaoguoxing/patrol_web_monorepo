import { PORT_SYSTEM } from '@/api/config/servicePort';
import http from '@/api';
import { GlobalStore } from '@/stores';

/** 服务端启用语言配置，主要字段为 langCode / langName / isDefault。 */
export interface RemoteLanguage {
  id: string;
  langName: string;
  langCode: string;
  isDefault: 0 | 1;
  sort: number;
}

export type RemoteLanguagePack = Record<string, string>;

const getRequestOptions = () => {
  const token = GlobalStore().token;
  return {
    headers: {
      noLoading: true,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };
};

/** 所有启用语言列表。 */
export const getRemoteLanguages = () =>
  http.get<RemoteLanguage[]>(`${PORT_SYSTEM}/language/list`, {}, getRequestOptions());

/** 按语言编码加载前端语言包。 */
export const getRemoteLanguagePack = (langCode: string) =>
  http.get<RemoteLanguagePack>(`${PORT_SYSTEM}/languageEntry/load`, { langCode }, getRequestOptions());
