import { downFile, downCVRFile } from '@/api/modules/download';
import { ResultData } from '@/api/interface';
/**
 * @description 创建预览链接

 * @return void
 * */
export const usePreview = (isVCR: boolean = false) => {
  const getPreviewUrl = (param: { fileId: string; currDs?: string }, type: string = 'image/png') => {
    return new Promise<string>((resolve, reject) => {
      let res: Promise<ResultData<Blob>>;
      if (isVCR) {
        res = downCVRFile(param);
      } else {
        res = downFile(param);
      }
      res
        .then((res: unknown | Blob) => {
          const blob = new Blob([res as Blob], {
            type,
          });
          const reader: FileReader = new FileReader(); // 创建FileReader对象
          reader.onload = function (e) {
            // 文件读取成功完成后的处理
            const contents = e.target?.result;
            if (contents == '附件不存在') {
              resolve('');
            } else {
              resolve(window.URL.createObjectURL(blob as Blob));
            }
          };
          reader.onerror = function (e) {
            // 文件读取出错时的处理
            console.error('File could not be read! Code ' + e.target?.error?.code);
            reject('File could not be read! Code ');
          };
          reader.readAsText(blob as Blob); // 以文本形式读取文件
        })
        .catch((error) => {
          reject(error);
        });
    });
  };
  return {
    getPreviewUrl,
  };
};
