// * 系统全局字典

import { getDictApi, Dict, getNeedBusinessApi } from '@/api/modules/common';
/**
 * @description 操作数据字典
 * */
export type DefaultDict = { label: string; value: string; remark: string }[];
export type FilterDict = { text: string; value: string; remark: string }[];
export const getDictFun = (labelKey: string = 'label', valueKey: string = 'value') => {
  return async (code: string) => {
    let { data } = await getDictApi({ classifyId: 'inspectionManagement', code });
    const dictList = data.sysDataDictDetailList.map((item) => {
      let obj = {
        [labelKey]: item.value,
        [valueKey]: item.key,
        remark: item.remark,
      };

      return obj;
    });
    return dictList;
  };
};
export const getNeedBusinessFun = (labelKey: string = 'label', valueKey: string = 'value') => {
  return async (code: string) => {
    let { data } = await getNeedBusinessApi({ classifyCode: 'inspection', code });
    const dictList = (data?.configDetailList ?? []).map((item) => {
      let obj = {
        [labelKey]: item.value,
        [valueKey]: item.key,
        remark: item.remark,
      };
      return obj;
    });
    return dictList ?? [];
  };
};
//默认属性名：label,value
export const getDict = getDictFun();
export const getNeedBusiness = getNeedBusinessFun();

//获得目标字段对应的对象数组
export const formatDict = (dictList: DefaultDict, labelKey: string, valueKey: string) => {
  return dictList.map((item) => {
    return {
      [labelKey]: item.label,
      [valueKey]: item.value,
      remark: item.remark,
    };
  });
};
//根据选项值获取该选项对应的字典对象：{字典valueKey:字典对象}
export const getDictObj = (dictList: DefaultDict, valueKey: string) => {
  const dictObj: { [key: string]: any } = {};
  dictList.forEach((item) => {
    dictObj[item[valueKey as keyof { label: string; value: string; remark: string }]] = { ...item };
  });
  return dictObj;
};

// 针对element-plus的table过滤选项属性名获得对应的字典选项
export const getDictForColumnFilters = (dictList: DefaultDict) => {
  return formatDict(dictList, 'text', 'value') as FilterDict;
};
