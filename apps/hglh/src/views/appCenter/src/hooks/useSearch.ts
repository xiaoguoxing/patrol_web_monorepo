import { ref, onMounted } from 'vue';

/**
 * @description 搜索逻辑
 * */
interface obj {
  [key: string]: any;
}
export const useSearch = (api: (params: any) => Promise<any>, initParam: object = {}) => {
  const searchInitParam = ref<obj>({});
  const searchParam = ref<obj>({});
  const totalParam = ref<obj>({});
  const resultData = ref();
  const getData = async () => {
    let { data } = await api({ ...totalParam.value, ...initParam });
    resultData.value = data;
  };
  /**
   * @description 更新查询参数
   * @return void
   * */
  const updatedTotalParam = () => {
    totalParam.value = {};
    // 处理查询参数，可以给查询参数加自定义前缀操作
    const nowSearchParam: { [key: string]: any } = {};
    // 防止手动清空输入框携带参数（这里可以自定义查询参数前缀）
    for (const key in searchParam.value) {
      // * 某些情况下参数为 false/0 也应该携带参数
      if (searchParam.value[key] || searchParam.value[key] === false || searchParam.value[key] === 0) {
        if (searchParam.value[key] == 'all') {
          nowSearchParam[key] = '';
        } else {
          nowSearchParam[key] = searchParam.value[key];
        }
      }
    }
    Object.assign(totalParam.value, nowSearchParam);
  };
  /**
   * @description数据查询
   * @return void
   * */
  const search = () => {
    updatedTotalParam();
    getData();
  };

  /**
   * @description 表格数据重置
   * @return void
   * */
  const reset = () => {
    searchParam.value = {};
    // 重置搜索表单的时，如果有默认搜索参数，则重置默认的搜索参数
    Object.keys(searchInitParam.value).forEach((key) => {
      searchParam.value[key] = searchInitParam.value[key];
    });
    updatedTotalParam();
    getData();
  };
  // 初始化的时候需要做的事情就是 设置表单查询默认值 && 获取表格数据(reset函数的作用刚好是这两个功能)
  onMounted(() => {
    reset();
  });
  return { searchParam, reset, search, resultData };
};
