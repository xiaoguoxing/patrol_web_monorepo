import { PORT_INSPECT } from '@/api/config/servicePort';
import http from '@/api';
import { ContentTypeEnum } from '@/enums/httpEnum';

export enum PageTypeTitle {
  list = '',
  detail = 'task.taskReportDetail',
}
export type PageType = keyof typeof PageTypeTitle;
export interface ReportListParams {
  selectProp: string;
  abc: string;
}
export interface ReportListRows {
  id?: string;
  areaId?: string;
  cron?: string;
  executeCycle?: string;
  linkageSignalCode?: string;
  linkageSignalName?: string;
  executeFrequency?: string;
  executeType?: string;
  inspectionWay?: string;
  syncData?: boolean;
  inspectionWayName?: string;
  taskTypeName?: string;
  objectId?: string;
  orgCode?: string;
  taskStatus?: string;
  abnormalNum?: string;
  normalNum?: string;
  noDoneNum?: string;
  abnormalInspectionNum?: string;

  taskEndTime: string;
  inspectionTaskName: string;
  taskType: string;
  inspectionModel: string;
  areaName: string;
  orgName: string;
  objectName: string;
  itemNum: string;
  taskStartTime: string;
  taskUseTime: string;
  normalList?: any[];
  noInspectionList?: any[];
  abnormalList?: any[];
  noDoneList?: any[];
  objectMapList?: any[];
}
export type id = string;
export const getReportListApi = (params: ReportListParams, isLoading: boolean = true) => {
  return http.get<ReportListRows>(`${PORT_INSPECT}/link/report/list`, params, {
    headers: { noLoading: isLoading },
    timeout: 0,
  });
};
export const getReportDetailApi = (params: { id: string }) => {
  return http.get<ReportListRows>(`${PORT_INSPECT}/link/report/detail`, params);
};
export const getReportTaskDetailApi = (params: { taskId: string }) => {
  return http.get<ReportListRows>(`${PORT_INSPECT}/link/report/detail/taskId`, params);
};
export const getReportExportApi = (id: string) => {
  return http.get<Blob>(`${PORT_INSPECT}/link/report/export`, { id }, { responseType: 'blob', timeout: 0 });
};
export const getReportCreateApi = (params: ReportListParams) => {
  return http.get<ReportListRows>(`${PORT_INSPECT}/link/report/create`, params);
};
export const getReportCheckApi = (params: any) => {
  return http.post<ReportListRows>(`${PORT_INSPECT}/link/report/check`, params, {
    'Content-Type': ContentTypeEnum.FORM_DATA,
  });
};
