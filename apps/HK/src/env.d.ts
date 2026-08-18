/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/ban-types
  const component: DefineComponent<{}, {}, any>;
  export default component;
}
declare module 'jsencrypt/bin/jsencrypt';
type Sc = {
  VITE_API_URL: string;
  VITE_ONLINE_URL: string;
  VITE_API_STREAM_URL: string;
  VITE_API_FONT_URL: string;
  VITE_API_AI_STREAM_URL: string;
  VITE_SYS_URL: string;
  VITE_SYS_NAME: string;
};
interface ServiceConfig {
  development: Sc;
  test: Sc;
  production: Sc;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
interface ImportMetaEnv {
  readonly VITE_USER_NODE_ENV: 'development' | 'test' | 'production';
}
declare const serviceConfig: ServiceConfig;
