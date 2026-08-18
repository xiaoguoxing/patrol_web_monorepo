import http from '@/api';
import { PORT_COMMON, PORT_INSPECT } from '@/api/config/servicePort';
export const downFile = (params: { fileId: string }) => {
  return http.get<Blob>(`${PORT_COMMON}/attachment/preview`, params, {
    headers: { noLoading: true },
    responseType: 'blob',
    timeout: 0,
  });
};
export const downCVRFile = (params: { fileId: string }) => {
  return http.get<Blob>(`${PORT_INSPECT}/cvr/attachment/preview`, params, {
    headers: { noLoading: true },
    responseType: 'blob',
    timeout: 0,
  });
};
