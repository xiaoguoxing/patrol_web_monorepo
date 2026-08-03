import { ref, onMounted } from 'vue';
import { AuthStore } from '@/stores/modules/auth';
import { ResultEnum } from '@/enums/httpEnum';
import { ElMessage } from 'element-plus';
import { ResultData } from '@/api/interface';
/**
 * @description websocket请求
 * */
export const useWebSocket = (apiUrl: string, callback: (e: any) => void) => {
  const lockReconnect = ref(false);
  const authStore = AuthStore();
  const account: string = authStore.userInfo.account;
  const currDs: string = authStore.userInfo.currDs;
  const url =
    //@ts-ignore
    import.meta.env.VITE_ONLINE_URL.replace('https://', 'wss://').replace('http://', 'ws://') +
    `${apiUrl}/${currDs}/${account}`;
  const websock = ref();
  const initWebSocket = () => {
    websock.value = new WebSocket(url);
    websock.value.onopen = websocketOnopen;
    websock.value.onerror = websocketOnerror;
    websock.value.onmessage = websocketOnmessage;
    websock.value.onclose = websocketOnclose;
  };
  onMounted(() => {
    initWebSocket();
  });
  const websocketOnopen = () => {
    console.log('WebSocket连接成功');
  };
  const websocketOnerror = (e: any) => {
    console.log('WebSocket连接发生错误');
    reconnect();
  };
  const websocketOnmessage = (e: ResultData) => {
    const { data } = JSON.parse(e.data);
    // * 全局错误信息拦截（防止下载文件得时候返回数据流，没有code，直接报错）
    if (data.code && data.code !== ResultEnum.SUCCESS) {
      ElMessage.error(data.description);
      return Promise.reject(data);
    }
    callback(data);
  };
  const websocketOnclose = (e: CloseEvent) => {
    console.log('关闭了');
    // reconnect();
  };
  const reconnect = () => {
    if (lockReconnect.value) return;
    lockReconnect.value = true;
    //没连接上会一直重连，设置延迟避免请求过多
    setTimeout(() => {
      console.info('尝试重连...');
      initWebSocket();
      lockReconnect.value = false;
    }, 5000);
  };
  return websock;
};
