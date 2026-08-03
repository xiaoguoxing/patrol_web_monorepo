declare module '@vue/runtime-core' {
  export interface GlobalComponents {
    KrGrid: typeof import('@patrol/ui').KrGrid;
    KrGridItem: typeof import('@patrol/ui').KrGridItem;
    KrProTable: typeof import('@patrol/ui').KrProTable;
    KrTreeList: typeof import('@patrol/ui').KrTreeList;
    KrTreeListSelect: typeof import('@patrol/ui').KrTreeListSelect;
    KrPublicDialog: typeof import('@patrol/ui').KrPublicDialog;
    KrFilterTree: typeof import('@patrol/ui').KrFilterTree;
    KrCard: typeof import('@patrol/ui').KrCard;
  }
}
export {};
