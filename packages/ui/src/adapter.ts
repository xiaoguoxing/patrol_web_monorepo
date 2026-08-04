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

let uiAdapter: UiAdapter = defaultAdapter;

export function configureUiAdapter(adapter: Partial<UiAdapter>): void {
  uiAdapter = { ...defaultAdapter, ...adapter };
}

export function getUiAdapter(): UiAdapter {
  return uiAdapter;
}
