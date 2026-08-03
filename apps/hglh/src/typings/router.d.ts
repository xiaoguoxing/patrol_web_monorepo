declare module 'vue-router' {
  interface RouteMeta {
    icon: string;
    title: string;
    activeMenu?: string;
    isLink?: string;
    isHide: boolean;
    isFull: boolean;
    isAffix: boolean;
    isKeepAlive: boolean;
    parentIcon?: string;
  }
}
export {};
