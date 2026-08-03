import { PersistedStateOptions } from 'pinia-plugin-persistedstate';

/**
 * @description pinia持久化参数配置
 * @param {String} key 存储到持久化的 name
 * @param {Array} paths 需要持久化的 state name
 * @return persist
 * */
export const piniaPersistConfig = (key: string, paths?: string[]) => {
  const persist: PersistedStateOptions = {
    key,
    storage: window.localStorage,
    paths,
  };
  return persist;
};

export const piniaSessionConfig = (key: string, paths?: string[]) => {
  const persist: PersistedStateOptions = {
    key,
    storage: window.sessionStorage,
    paths,
  };
  return persist;
};
export default piniaPersistConfig;
