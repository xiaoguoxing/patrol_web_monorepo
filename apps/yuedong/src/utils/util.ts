import { isArray } from '@/utils/is';
import { cloneDeep } from 'lodash';
import { RouteRecordRaw } from 'vue-router';
/**
 * @description 获取localStorage
 * @param {String} key Storage名称
 * @return string
 */
export function localGet(key: string) {
  const value = window.localStorage.getItem(key);
  try {
    return JSON.parse(window.localStorage.getItem(key) as string);
  } catch (error) {
    return value;
  }
}

/**
 * @description 存储localStorage
 * @param {String} key Storage名称
 * @param {Any} value Storage值
 * @return void
 */
export function localSet(key: string, value: any) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

/**
 * @description 清除localStorage
 * @param {String} key Storage名称
 * @return void
 */
export function localRemove(key: string) {
  window.localStorage.removeItem(key);
}

/**
 * @description 清除所有localStorage
 * @return void
 */
export function localClear() {
  window.localStorage.clear();
}

/**
 * @description 判断数据类型
 * @param {Any} val 需要判断类型的数据
 * @return string
 */
export function isType(val: any) {
  if (val === null) return 'null';
  if (typeof val !== 'object') return typeof val;
  else return Object.prototype.toString.call(val).slice(8, -1).toLocaleLowerCase();
}

/**
 * @description 生成唯一 uuid
 * @return string
 */
export function generateUUID() {
  if (typeof crypto === 'object') {
    if (typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    if (typeof crypto.getRandomValues === 'function' && typeof Uint8Array === 'function') {
      const callback = (c: any) => {
        const num = Number(c);
        return (num ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (num / 4)))).toString(16);
      };
      return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, callback);
    }
  }
  let timestamp = new Date().getTime();
  let performanceNow = (typeof performance !== 'undefined' && performance.now && performance.now() * 1000) || 0;
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    let random = Math.random() * 16;
    if (timestamp > 0) {
      random = (timestamp + random) % 16 | 0;
      timestamp = Math.floor(timestamp / 16);
    } else {
      random = (performanceNow + random) % 16 | 0;
      performanceNow = Math.floor(performanceNow / 16);
    }
    return (c === 'x' ? random : (random & 0x3) | 0x8).toString(16);
  });
}

/**
 * 判断两个对象是否相同
 * @param a 要比较的对象一
 * @param b 要比较的对象二
 * @returns 相同返回 true，反之则反
 */
export function isObjectValueEqual(a: { [key: string]: any }, b: { [key: string]: any }) {
  if (!a || !b) return false;
  let aProps = Object.getOwnPropertyNames(a);
  let bProps = Object.getOwnPropertyNames(b);
  if (aProps.length != bProps.length) return false;
  for (let i = 0; i < aProps.length; i++) {
    let propName = aProps[i];
    let propA = a[propName];
    let propB = b[propName];
    if (!b.hasOwnProperty(propName)) return false;
    if (propA instanceof Object) {
      if (!isObjectValueEqual(propA, propB)) return false;
    } else if (propA !== propB) {
      return false;
    }
  }
  return true;
}

/**
 * @description 生成随机数
 * @param {Number} min 最小值
 * @param {Number} max 最大值
 * @return number
 */
export function randomNum(min: number, max: number): number {
  let num = Math.floor(Math.random() * (min - max) + max);
  return num;
}

/**
 * @description 获取当前时间对应的提示语
 * @return string
 */
export function getTimeState() {
  // 获取当前时间
  let timeNow = new Date();
  // 获取当前小时
  let hours = timeNow.getHours();
  // 判断当前时间段
  if (hours >= 6 && hours <= 10) return `早上好 ⛅`;
  if (hours >= 10 && hours <= 14) return `中午好 🌞`;
  if (hours >= 14 && hours <= 18) return `下午好 🌞`;
  if (hours >= 18 && hours <= 24) return `晚上好 🌛`;
  if (hours >= 0 && hours <= 6) return `凌晨好 🌛`;
}

/**
 * @description 获取浏览器默认语言
 * @return string
 */
export function getBrowserLang() {
  let browserLang = navigator.language ? navigator.language : navigator.browserLanguage;
  let defaultBrowserLang = '';
  if (
    browserLang.toLowerCase() === 'cn' ||
    browserLang.toLowerCase() === 'zh' ||
    browserLang.toLowerCase() === 'zh-cn'
  ) {
    defaultBrowserLang = 'zh';
  } else {
    defaultBrowserLang = 'en';
  }
  return defaultBrowserLang;
}

/**
 * @description 递归查询当前路由所对应的路由
 * @param {Array} menuList 所有菜单列表
 * @param {String} path 当前访问地址
 * @return array
 */
export function filterCurrentRoute(menuList: RouteRecordRaw[], path: string) {
  let result = {};
  for (let item of menuList) {
    if (item.path === path) return item;
    if (item.children) {
      const res = filterCurrentRoute(item.children, path);
      if (Object.keys(res).length) result = res;
    }
  }
  return result;
}

/**
 * @description 扁平化数组对象(主要用来处理路由菜单)
 * @param {Array} menuList 所有菜单列表
 * @return array
 */
export function getFlatArr(menuList: RouteRecordRaw[]) {
  let newMenuList: RouteRecordRaw[] = cloneDeep(menuList); //JSON.parse(JSON.stringify(menuList));
  return newMenuList.reduce((pre: RouteRecordRaw[], current: RouteRecordRaw) => {
    let flatArr = [...pre, current];
    if (current.children) flatArr = [...flatArr, ...getFlatArr(current.children)];
    return flatArr;
  }, []);
}

/**遍历数据成树 */

export function getTrees(list: any, parentId: any, idKey: any, pidKey: any, parentNameKey: any) {
  let items: { [key: string]: any } = {};
  // 获取每个节点的直属子节点，*记住是直属，不是所有子节点
  for (let i = 0; i < list.length; i++) {
    let key = list[i][pidKey];
    if (items[key]) {
      items[key].push(list[i]);
    } else {
      items[key] = [];
      items[key].push(list[i]);
    }
  }
  return formatTree(items, parentId, idKey, parentNameKey);
}
export function formatTree(items: any, parentId: any, idKey: any, parentNameKey: any) {
  let result: any[] = [];
  if (!items[parentId]) {
    return result;
  }
  for (let t of items[parentId]) {
    let sub = formatTree(items, t[idKey], idKey, parentNameKey);
    if (sub.length > 0) {
      sub.forEach((i) => {
        i.parentName = t[parentNameKey];
      });
      t.children = sub;
    }
    result.push(t);
  }
  return result;
}

//处理树结构的原始菜单为路由需要的
export function generateRoute(
  data: any[],
  parentPath: string,
  parentOpen: boolean,
  parentStatue: boolean,
  arr: any[],
  parentIcon: string
) {
  data.forEach((item, index) => {
    arr.push({
      path: `${parentPath}/${item.menuCode}`,
      name: item.menuCode,
      meta: {
        icon: item.icon,
        parentIcon: parentIcon || item.icon,
        title: item.name,
        code: item.menuCode,
        isLink: item.isLink,
        isHide: item.isHide,
        isFull: false,
        isAffix: false,
        isOpen: parentOpen && item.isOpen,
        isEnable: parentStatue && item.status,
      },
      children: [],
    });
    if (item.isMenu) {
      arr[index].component = item.menuUrl;
    }
    if (item.children) {
      let list = item.children.find((element: any) => element.isOpen && element.status);
      if (!item.isMenu) {
        arr[index].redirect = `${parentPath}/${item.menuCode}/${list.menuCode}`;
      }
      generateRoute(
        item.children,
        `${parentPath}/${item.menuCode}`,
        parentOpen && item.isOpen,
        parentStatue && item.status,
        arr[index].children,
        item.icon || arr[index].parentIcon
      );
    } else {
      delete arr[index].children;
    }
  });
  return arr;
}
//处理原始权限按钮list为代码处理需要的
export function generateBtn(btns: { funcCode: string; menuCode: string }[], menus: any) {
  let obj: { [key: string]: any } = {};
  menus.forEach((item: any) => {
    obj[item.menuCode] = btns
      .filter((btn: any) => {
        return btn.menuCode == item.menuCode && btn.funcCode;
      })
      .map((btn) => btn.funcCode);
  });
  return obj;
}
/**
 * @description 使用递归，过滤需要缓存的路由（暂时没有使用）
 * @param {Array} menuList 所有菜单列表
 * @param {Array} cacheArr 缓存的路由菜单 name ['**','**']
 * @return array
 * */
export function getKeepAliveRouterName(menuList: RouteRecordRaw[], keepAliveArr: string[] = []) {
  menuList.forEach((item) => {
    item.meta?.isKeepAlive && item.name && keepAliveArr.push(item.name as string);
    item.children?.length && getKeepAliveRouterName(item.children, keepAliveArr);
  });
  return keepAliveArr;
}

/**
 * @description 使用递归，过滤出需要渲染在左侧菜单的列表（剔除 isHide == true 的菜单）
 * @param {Array} menuList 所有菜单列表
 * @return array
 * */
export function getShowMenuList(menuList: RouteRecordRaw[]) {
  let newMenuList: RouteRecordRaw[] = JSON.parse(JSON.stringify(menuList));
  return newMenuList.filter((item) => {
    item.children?.length && (item.children = getShowMenuList(item.children));
    return !item.meta?.isHide;
  });
}

/**
 * @description 使用递归处理路由菜单 path，生成一维数组(第一版本地路由鉴权会用到)
 * @param {Array} menuList 所有菜单列表
 * @param {Array} menuPathArr 菜单地址的一维数组 ['**','**']
 * @return array
 */
export function getMenuListPath(menuList: RouteRecordRaw[], menuPathArr: string[] = []) {
  menuList.forEach((item: RouteRecordRaw) => {
    typeof item === 'object' && item.path && menuPathArr.push(item.path);
    item.children?.length && getMenuListPath(item.children, menuPathArr);
  });
  return menuPathArr;
}

/**
 * @description 双重递归找出所有面包屑存储到 pinia/vuex 中
 * @param {Array} menuList 所有菜单列表
 * @param {Object} result 输出的结果
 * @param {String} path 当前递归的路径
 * @returns object
 */
export const getAllBreadcrumbList = (menuList: RouteRecordRaw[], result: { [key: string]: any } = {}, path = []) => {
  for (const item of menuList) {
    result[item.path] = [...path, item];
    if (item.children) getAllBreadcrumbList(item.children, result, result[item.path]);
  }
  return result;
};

/**
 * @description 格式化表格单元格默认值(el-table-column)
 * @param {Number} row 行
 * @param {Number} col 列
 * @param {String} callValue 当前单元格值
 * @return string
 * */
export function defaultFormat(row: number, col: number, callValue: any) {
  // 如果当前值为数组,使用 / 拼接（根据需求自定义）
  if (isArray(callValue)) return callValue.length ? callValue.join(' / ') : '--';
  return callValue ?? '--';
}

/**
 * @description 处理无数据情况
 * @param {String} callValue 需要处理的值
 * @return string
 * */
export function formatValue(callValue: any) {
  // 如果当前值为数组,使用 / 拼接（根据需求自定义）
  if (isArray(callValue)) return callValue.length ? callValue.join(' / ') : '--';
  return callValue ?? '--';
}

/**
 * @description 处理 prop 为多级嵌套的情况(列如: prop:user.name)
 * @param {Object} row 当前行数据
 * @param {String} prop 当前 prop
 * @return any
 * */
export function handleRowAccordingToProp(row: { [key: string]: any }, prop: string) {
  if (!prop.includes('.')) return row[prop];
  prop.split('.').forEach((item) => {
    row = row[item] ?? '--';
  });
  return row;
}

/**
 * @description 处理 prop，当 prop 为多级嵌套时 ==> 返回最后一级 prop
 * @param {String} prop 当前 prop
 * @return string
 * */
export function handleProp(prop: string) {
  const propArr = prop.split('.');
  if (propArr.length == 1) return prop;
  return propArr[propArr.length - 1];
}

/**
 * @description 根据枚举列表查询当需要的数据（如果指定了 label 和 value 的 key值，会自动识别格式化）
 * @param {String} callValue 当前单元格值
 * @param {Array} enumData 枚举列表
 * @param {String} type 过滤类型（目前只有 tag）
 * @return string
 * */
export function filterEnum(
  callValue: any,
  enumData: { [key: string]: any } | undefined,
  searchProps?: { [key: string]: any },
  type?: string
): string {
  const value = searchProps?.value ?? 'value';
  const label = searchProps?.label ?? 'label';
  let filterData: any = {};
  if (Array.isArray(enumData)) filterData = enumData.find((item: any) => item[value] === callValue);
  if (type == 'tag') return filterData?.tagType ? filterData.tagType : '';
  return filterData ? filterData[label] : '--';
}

/**
 * @description Base64字符串转File文件
 * @param dataUrl {String}  Base64字符串(字符串包含Data URI scheme，例如：data:image/png;base64, )
 * @param fileName {String}  文件名称
 */
export function dataURLtoFile(dataUrl: string, fileName: string) {
  let arr = dataUrl.split(',');
  let mime = arr[0].match(/:(.*?);/)?.[1] ?? 'image/png';
  let bstr = window.atob(arr[1]);
  let n = bstr.length;
  let u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], fileName, {
    type: mime,
  });
}

/**
 * 二进制流转Base64(字符串包含Data URI scheme)
 * @param {Object} data 二进制流
 * @param {String} type 文件类型(例如：image/png)
 */
export function getDataURL(
  data: Blob,
  type: string = 'image/png'
): Promise<{ base64: string | ArrayBuffer | null; blobUrl: string }> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([data], {
      type,
    });
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onload = () => resolve({ base64: reader.result, blobUrl: window.URL.createObjectURL(blob) });
    reader.onerror = (error) => reject(error);
  });
}
/**
 * 二进制流转Base64(字符串包含Data URI scheme)
 * @param {Object} data 二进制流
 * @param {String} type 文件类型(例如：image/png)
 */
export function getDataURLOp2(data: Blob, type: string = 'image/png'): Promise<string> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([data], {
      type,
    });
    resolve(window.URL.createObjectURL(blob));
  });
}
/**
 * 分数转百分数对应的数字用于进度条显示
 * @param {Number} numerator 分子
 * @param {Number} denominator 分母
 * @return Number 0-100的两位小数的数字
 */
export function getPercentNum(numerator: number, denominator: number) {
  let num = (numerator / denominator) * 100;
  let result = Number(num.toFixed(2));
  if (isNaN(result)) {
    return 0;
  } else {
    return Number(num.toFixed(2));
  }
}
