declare module '@vue/runtime-core' {
  export interface GlobalComponents {
    KrGrid: typeof import('kr-ui').KrGrid;
    KrGridItem: typeof import('kr-ui').KrGridItem;
    KrProTable: typeof import('kr-ui').KrProTable;
    KrTreeList: typeof import('kr-ui').KrTreeList;
    KrTreeListSelect: typeof import('kr-ui').KrTreeListSelect;
    KrPublicDialog: typeof import('kr-ui').KrPublicDialog;
    KrFilterTree: typeof import('kr-ui').KrFilterTree;
    // KrFilterList: typeof import('kr-ui').KrFilterList;
    KrCard: typeof import('kr-ui').KrCard;
  }
}
export {};
