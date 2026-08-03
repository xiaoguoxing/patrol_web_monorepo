export interface Tabs {
  value: number;
  arrValue?: number;
  label: string;
}

export interface MonitorItem {
  isShow: boolean;
  relatedAlgorithm: boolean;
  state?: 'err' | 'success';
  nodeName?: string;
  nodeType?: number;
  id?: string;
}
