import type { App, InjectionKey } from 'vue';
import { inject } from 'vue';

export interface TableColConfig {
  page?: string | symbol;
  userId?: string;
  config?: string;
  type?: string;
  id?: string;
}

export interface UiAdapter {
  getCurrentUserId(): string | undefined;
  getCurrentPage(): string | symbol | undefined;
  getTableCol(params: TableColConfig): Promise<{ data: TableColConfig[] }>;
  setTableCol(params: TableColConfig): Promise<unknown>;
}

const defaultAdapter: UiAdapter = {
  getCurrentUserId: () => undefined,
  getCurrentPage: () => undefined,
  getTableCol: async () => ({ data: [] }),
  setTableCol: async () => undefined,
};

const UI_ADAPTER_KEY: InjectionKey<UiAdapter> = Symbol('UI_ADAPTER_KEY');

export function provideUiAdapter(app: App, adapter: Partial<UiAdapter> = {}): void {
  app.provide(UI_ADAPTER_KEY, { ...defaultAdapter, ...adapter });
}

export function useUiAdapter(): UiAdapter {
  return inject(UI_ADAPTER_KEY, defaultAdapter);
}
