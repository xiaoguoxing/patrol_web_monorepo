<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { HikvisionWebSdk, type HikChannel, type HikProtocol } from '@optCenter/hooks/HKSDK';

const playerElement = ref<HTMLElement>();
const channels = ref<HikChannel[]>([]);
const selectedChannelId = ref<number>();
const deviceIdentify = ref('');
const rtspPort = ref<number>();
const message = ref('正在初始化播放器…');
const busy = ref(false);

const form = reactive({
  assetBaseUrl: '/webs/codebase',
  ip: '',
  port: location.protocol === 'https:' ? 443 : 80,
  username: 'admin',
  password: '',
  protocol: (location.protocol === 'https:' ? 2 : 1) as HikProtocol,
  streamType: 1 as 1 | 2,
  proxy: location.protocol === 'https:',
  startTime: toInputTime(new Date(Date.now() - 60 * 60 * 1000)),
  endTime: toInputTime(new Date()),
});

let sdk: HikvisionWebSdk | undefined;
let resizeObserver: ResizeObserver | undefined;

const selectedChannel = computed(() =>
  channels.value.find((channel: HikChannel) => channel.id === selectedChannelId.value)
);

function toInputTime(date: Date): string {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

async function run(action: () => Promise<void>, successMessage: string): Promise<void> {
  busy.value = true;
  try {
    await action();
    message.value = successMessage;
  } catch (error) {
    message.value = error instanceof Error ? error.message : String(error);
  } finally {
    busy.value = false;
  }
}

async function initialize(): Promise<void> {
  if (!playerElement.value) return;
  sdk = new HikvisionWebSdk({
    assetBaseUrl: form.assetBaseUrl,
    onPlaybackEnded: () => {
      message.value = '回放结束';
    },
    onError: (error) => {
      message.value = error.message;
    },
  });
  await sdk.init(playerElement.value);
  resizeObserver = new ResizeObserver(([entry]) => {
    sdk?.resize(Math.floor(entry.contentRect.width), Math.floor(entry.contentRect.height));
  });
  resizeObserver.observe(playerElement.value);
  message.value = '播放器已就绪';
}

function requireChannel(): HikChannel {
  if (!selectedChannel.value) throw new Error('请选择通道');
  return selectedChannel.value;
}

function login(): void {
  void run(async () => {
    if (!sdk) throw new Error('播放器尚未初始化');
    deviceIdentify.value = await sdk.login(form);
    const ports = sdk.getDevicePorts(deviceIdentify.value);
    rtspPort.value = ports.iRtspPort;
    channels.value = await sdk.getChannels(deviceIdentify.value);
    selectedChannelId.value = channels.value[0]?.id;
    if (!channels.value.length) throw new Error('登录成功，但未发现在线通道');
  }, '登录成功，通道已加载');
}

function preview(): void {
  void run(async () => {
    const channel = requireChannel();
    await sdk!.startPreview({
      deviceIdentify: deviceIdentify.value,
      channelId: channel.id,
      zeroChannel: channel.zeroChannel,
      rtspPort: rtspPort.value,
      streamType: form.streamType,
      proxy: form.proxy,
    });
  }, '预览已开始');
}

function playback(): void {
  void run(async () => {
    const channel = requireChannel();
    if (channel.zeroChannel) throw new Error('零通道不支持回放');
    await sdk!.startPlayback({
      deviceIdentify: deviceIdentify.value,
      channelId: channel.id,
      rtspPort: rtspPort.value,
      streamType: form.streamType,
      proxy: form.proxy,
      startTime: form.startTime,
      endTime: form.endTime,
    });
  }, '回放已开始');
}

function stop(): void {
  void run(() => sdk?.stop() ?? Promise.resolve(), '播放已停止');
}

onMounted(() => {
  void run(initialize, '播放器已就绪');
});
onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  void sdk?.destroy();
});
</script>

<template>
  <section class="hik-demo">
    <div ref="playerElement" class="player" aria-label="海康视频播放区域"></div>

    <form class="controls" @submit.prevent="login">
      <label>SDK 资源路径<input v-model.trim="form.assetBaseUrl" :disabled="busy || !!sdk" /></label>
      <label>设备 IP<input v-model.trim="form.ip" required autocomplete="off" /></label>
      <label>端口<input v-model.number="form.port" required type="number" min="1" max="65535" /></label>
      <label>用户名<input v-model.trim="form.username" required autocomplete="username" /></label>
      <label>密码<input v-model="form.password" required type="password" autocomplete="current-password" /></label>
      <label
        >协议
        <select v-model="form.protocol">
          <option :value="1">HTTP</option>
          <option :value="2">HTTPS</option>
        </select>
      </label>
      <button type="submit" :disabled="busy">登录并加载通道</button>

      <label
        >通道
        <select v-model="selectedChannelId" :disabled="!channels.length">
          <option v-for="channel in channels" :key="`${channel.kind}-${channel.id}`" :value="channel.id">
            {{ channel.name }}（{{ channel.id }}）
          </option>
        </select>
      </label>
      <label
        >码流
        <select v-model="form.streamType">
          <option :value="1">主码流</option>
          <option :value="2">子码流</option>
        </select>
      </label>
      <label class="checkbox"><input v-model="form.proxy" type="checkbox" />使用 WebSocket 代理</label>

      <div class="actions">
        <button type="button" :disabled="busy || !deviceIdentify" @click="preview">开始预览</button>
        <button type="button" :disabled="busy" @click="stop">停止</button>
      </div>

      <label>回放开始<input v-model="form.startTime" type="datetime-local" /></label>
      <label>回放结束<input v-model="form.endTime" type="datetime-local" /></label>
      <button type="button" :disabled="busy || !deviceIdentify" @click="playback">开始回放</button>
    </form>

    <p class="status" role="status" aria-live="polite">{{ message }}</p>
  </section>
</template>

<style scoped>
.hik-demo {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(280px, 1fr);
  gap: 16px;
}
.player {
  min-height: 520px;
  overflow: hidden;
  background: #101419;
}
.controls {
  display: grid;
  gap: 10px;
  align-content: start;
}
label {
  display: grid;
  gap: 4px;
  font-size: 14px;
}
input,
select,
button {
  min-height: 36px;
  padding: 6px 10px;
  font: inherit;
}
button {
  cursor: pointer;
}
button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}
.checkbox {
  display: flex;
  align-items: center;
}
.checkbox input {
  min-height: auto;
}
.actions {
  display: flex;
  gap: 8px;
}
.status {
  grid-column: 1 / -1;
  margin: 0;
  color: #334155;
}
@media (max-width: 800px) {
  .hik-demo {
    grid-template-columns: 1fr;
  }
  .player {
    min-height: 360px;
  }
}
</style>
