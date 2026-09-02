# AI 巡检任务执行与结果反馈设计方案

## 一、业务流程概述

### 1.1 核心流程

```
用户进入详情页
    ↓
获取巡检任务列表（HTTP）
    ↓
建立 WebSocket 连接
    ↓
前端驱动 3D 场景自动巡检
    ↓
到达设备 → 触发识别请求 → 等待结果
    ↓
收到识别结果 → 展示卡片 → 继续下一个
    ↓
全部完成 / 用户离开 → 断开连接
```

### 1.2 角色职责

| 角色             | 职责                                                   |
| ---------------- | ------------------------------------------------------ |
| **后端**         | 提供任务列表、接收识别请求、调用 AI 模型、推送识别结果 |
| **前端 3D 场景** | 按任务列表顺序巡检、到达设备时通知外层组件             |
| **前端业务层**   | 管理 WebSocket 连接、请求识别、接收结果、更新 UI       |

---

## 二、数据结构设计

### 2.1 巡检任务（Task）

```typescript
/**
 * 巡检任务项（后端返回）
 * 一个任务对应一个需要巡检的设备
 */
interface PatrolTask {
  /** 任务 ID（全局唯一，用于 WebSocket 通信） */
  taskId: string;

  /** 设备 ID（对应 GLB 模型中的节点名，如 "Line009"） */
  deviceId: string;

  /** 设备名称（展示用，如 "1#输水管道"） */
  deviceName: string;

  /** 设备类型（pipe/motor/valve 等，用于识别模型选择） */
  deviceType: string;

  /** 任务状态 */
  status: 'pending' | 'inspecting' | 'completed' | 'failed';

  /** 预设视角（可选，优先级高于 constants.ts 内置视角） */
  viewpoint?: {
    position: [number, number, number];
    target: [number, number, number];
    fov?: number;
  };

  /** 任务创建时间 */
  createdAt: string;
}
```

### 2.2 识别请求（Inspection Request）

```typescript
/**
 * 前端 → 后端：请求对某个设备进行 AI 识别
 */
interface InspectionRequest {
  /** 消息类型 */
  type: 'INSPECTION_REQUEST';

  /** 任务 ID */
  taskId: string;

  /** 设备 ID */
  deviceId: string;

  /** 相机快照（可选，Base64 编码的截图） */
  snapshot?: string;

  /** 当前视角参数（可选，用于后端记录） */
  viewpoint?: {
    position: [number, number, number];
    target: [number, number, number];
    fov: number;
  };

  /** 请求时间戳 */
  timestamp: number;
}
```

### 2.3 识别结果（Inspection Result）

```typescript
/**
 * 后端 → 前端：AI 识别结果推送
 */
interface InspectionResult {
  /** 消息类型 */
  type: 'INSPECTION_RESULT';

  /** 任务 ID */
  taskId: string;

  /** 设备 ID */
  deviceId: string;

  /** 识别状态 */
  status: 'success' | 'failed';

  /** 识别结论（正常/异常） */
  conclusion: 'normal' | 'abnormal' | 'failed';

  /** 结论标题（如 "设备运行正常" / "存在轻微异响"） */
  title: string;

  /** 详细描述 */
  detail: string;

  /** 置信度（0-1） */
  confidence?: number;

  /** AI 识别快照图片 URL（后端存储的图片地址） */
  image?: string;

  /** 识别完成时间 */
  completedAt: string;

  /** 错误信息（识别失败时） */
  error?: string;
}
```

### 2.4 WebSocket 消息协议

```typescript
/**
 * WebSocket 消息统一格式
 */
interface WebSocketMessage {
  /** 消息类型 */
  type:
    | 'CONNECTION_ACK' // 连接确认（后端 → 前端）
    | 'INSPECTION_REQUEST' // 识别请求（前端 → 后端）
    | 'INSPECTION_RESULT' // 识别结果（后端 → 前端）
    | 'TASK_STATUS_UPDATE' // 任务状态更新（后端 → 前端）
    | 'HEARTBEAT' // 心跳保活
    | 'ERROR'; // 错误消息

  /** 消息负载（根据 type 不同而不同） */
  payload: Record<string, unknown>;

  /** 消息 ID（用于请求-响应关联） */
  messageId: string;

  /** 时间戳 */
  timestamp: number;
}
```

---

## 三、前端架构设计

### 3.1 目录结构

```
apps/HK/src/views/appCenter/src/
├── components/
│   ├── three-water-plant/
│   │   ├── threeRectangle.vue         # 3D 场景容器（现有）
│   │   ├── WaterPlantScene.ts         # 场景渲染（现有）
│   │   ├── patrolController.ts        # 巡检控制器（现有）
│   │   └── patrolResult.ts            # 结果数据源（需改造）
│   └── shared/
│       └── constants.ts                # 配置常量（现有）
├── composables/
│   └── usePatrolWebSocket.ts           # WebSocket 连接管理（新增）
├── services/
│   └── patrolService.ts                # 巡检任务 API（新增）
└── BIMdetail.vue                       # AI 巡检详情页（需改造）
```

### 3.2 核心模块职责

#### 3.2.1 `BIMdetail.vue` - 页面控制器

**职责**：

- 获取巡检任务列表（HTTP API）
- 管理 WebSocket 连接生命周期
- 协调 3D 场景与 WebSocket 通信
- 维护任务状态（pending/inspecting/completed）

**关键逻辑**：

```typescript
// 1. 页面加载：获取任务列表
onMounted(async () => {
  try {
    // 从 URL 参数获取巡检记录 ID
    const inspectionId = route.query.id;

    // HTTP 获取任务列表
    const tasks = await PatrolService.getTaskList(inspectionId);

    // 建立 WebSocket 连接
    const { connect, disconnect, requestInspection } = usePatrolWebSocket(inspectionId);
    connect({
      onResult: handleInspectionResult,
      onStatusUpdate: handleTaskStatusUpdate,
    });

    // 传递任务列表给 3D 场景
    patrolTasks.value = tasks;
  } catch (error) {
    ElMessage.error('任务列表加载失败');
  }
});

// 2. 3D 场景到达设备时触发识别
const handleDeviceArrived = (taskId: string, deviceId: string) => {
  // 更新任务状态为"识别中"
  updateTaskStatus(taskId, 'inspecting');

  // 通过 WebSocket 请求识别
  requestInspection({
    taskId,
    deviceId,
    snapshot: captureSceneSnapshot(), // 可选：截取当前画面
    viewpoint: getCurrentViewpoint(), // 可选：记录视角
  });
};

// 3. 收到识别结果
const handleInspectionResult = (result: InspectionResult) => {
  // 更新任务状态
  updateTaskStatus(result.taskId, result.status === 'success' ? 'completed' : 'failed');

  // 传递结果给 3D 场景展示卡片
  resultCard.value = {
    visible: true,
    taskId: result.taskId,
    taskName: getTaskName(result.taskId),
    status: result.status,
    title: result.title,
    detail: result.detail,
    image: result.image,
    confidence: result.confidence,
    time: result.completedAt,
  };

  // 等待卡片展示完毕（15s）后自动进入下一个任务
  // 由 3D 场景的 patrolController 自动推进
};

// 4. 页面卸载：断开连接
onBeforeUnmount(() => {
  disconnect();
});
```

#### 3.2.2 `usePatrolWebSocket.ts` - WebSocket 管理

**职责**：

- 建立和维护 WebSocket 连接
- 处理重连逻辑（指数退避）
- 心跳保活
- 消息发送与接收

**核心实现**：

```typescript
import { ref, onUnmounted } from 'vue';

interface UsePatrolWebSocketOptions {
  /** 识别结果回调 */
  onResult?: (result: InspectionResult) => void;
  /** 任务状态更新回调 */
  onStatusUpdate?: (taskId: string, status: string) => void;
  /** 连接错误回调 */
  onError?: (error: Error) => void;
}

export function usePatrolWebSocket(inspectionId: string) {
  let ws: WebSocket | null = null;
  let reconnectTimer: number | undefined;
  let heartbeatTimer: number | undefined;
  let reconnectAttempts = 0;
  const maxReconnectAttempts = 5;
  const isConnected = ref(false);

  /**
   * 建立 WebSocket 连接
   */
  function connect(options: UsePatrolWebSocketOptions) {
    const { onResult, onStatusUpdate, onError } = options;

    // WebSocket URL（开发环境 / 生产环境）
    const wsUrl = import.meta.env.DEV
      ? `ws://localhost:8080/api/patrol/ws/${inspectionId}`
      : `wss://${window.location.host}/api/patrol/ws/${inspectionId}`;

    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('[WebSocket] 连接已建立');
      isConnected.value = true;
      reconnectAttempts = 0;
      startHeartbeat();
    };

    ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);

        switch (message.type) {
          case 'CONNECTION_ACK':
            console.log('[WebSocket] 连接确认', message.payload);
            break;

          case 'INSPECTION_RESULT':
            onResult?.(message.payload as InspectionResult);
            break;

          case 'TASK_STATUS_UPDATE':
            const { taskId, status } = message.payload;
            onStatusUpdate?.(taskId as string, status as string);
            break;

          case 'ERROR':
            console.error('[WebSocket] 服务端错误', message.payload);
            onError?.(new Error(message.payload.message as string));
            break;
        }
      } catch (error) {
        console.error('[WebSocket] 消息解析失败', error);
      }
    };

    ws.onerror = (error) => {
      console.error('[WebSocket] 连接错误', error);
      isConnected.value = false;
      onError?.(new Error('WebSocket 连接错误'));
    };

    ws.onclose = (event) => {
      console.log('[WebSocket] 连接关闭', event.code, event.reason);
      isConnected.value = false;
      stopHeartbeat();

      // 非正常关闭且未达到最大重连次数，尝试重连
      if (event.code !== 1000 && reconnectAttempts < maxReconnectAttempts) {
        scheduleReconnect(options);
      }
    };
  }

  /**
   * 请求识别（前端 → 后端）
   */
  function requestInspection(request: Omit<InspectionRequest, 'type' | 'timestamp'>) {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.error('[WebSocket] 连接未建立，无法发送识别请求');
      return;
    }

    const message: WebSocketMessage = {
      type: 'INSPECTION_REQUEST',
      payload: {
        ...request,
        timestamp: Date.now(),
      },
      messageId: generateMessageId(),
      timestamp: Date.now(),
    };

    ws.send(JSON.stringify(message));
    console.log('[WebSocket] 发送识别请求', request.taskId);
  }

  /**
   * 断开连接
   */
  function disconnect() {
    stopHeartbeat();
    window.clearTimeout(reconnectTimer);

    if (ws) {
      ws.close(1000, '用户主动断开');
      ws = null;
    }
  }

  /**
   * 心跳保活（每 30s 发送一次）
   */
  function startHeartbeat() {
    heartbeatTimer = window.setInterval(() => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'HEARTBEAT', payload: {}, messageId: '', timestamp: Date.now() }));
      }
    }, 30000);
  }

  function stopHeartbeat() {
    if (heartbeatTimer) {
      window.clearInterval(heartbeatTimer);
      heartbeatTimer = undefined;
    }
  }

  /**
   * 重连逻辑（指数退避）
   */
  function scheduleReconnect(options: UsePatrolWebSocketOptions) {
    reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000); // 最大 30s

    console.log(`[WebSocket] ${delay}ms 后尝试第 ${reconnectAttempts} 次重连`);

    reconnectTimer = window.setTimeout(() => {
      connect(options);
    }, delay);
  }

  /**
   * 生成唯一消息 ID
   */
  function generateMessageId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // 组件卸载时自动断开
  onUnmounted(() => {
    disconnect();
  });

  return {
    isConnected,
    connect,
    disconnect,
    requestInspection,
  };
}
```

#### 3.2.3 `patrolService.ts` - HTTP API

**职责**：

- 获取巡检任务列表
- 提交巡检报告
- 查询历史记录

```typescript
import http from '@/api';

export class PatrolService {
  /**
   * 获取巡检任务列表
   * @param inspectionId 巡检记录 ID
   */
  static async getTaskList(inspectionId: string): Promise<PatrolTask[]> {
    const { data } = await http.get<PatrolTask[]>(`/api/patrol/inspection/${inspectionId}/tasks`);
    return data;
  }

  /**
   * 提交巡检报告（全部完成后调用）
   * @param inspectionId 巡检记录 ID
   */
  static async submitReport(inspectionId: string, results: InspectionResult[]): Promise<void> {
    await http.post(`/api/patrol/inspection/${inspectionId}/submit`, { results });
  }

  /**
   * 获取单个任务的识别结果（兜底方案，WebSocket 失败时使用）
   * @param taskId 任务 ID
   */
  static async getTaskResult(taskId: string): Promise<InspectionResult | null> {
    try {
      const { data } = await http.get<InspectionResult>(`/api/patrol/task/${taskId}/result`);
      return data;
    } catch {
      return null;
    }
  }
}
```

#### 3.2.4 `patrolResult.ts` 改造

**现状**：本地模拟数据源  
**改造方向**：接入 WebSocket，保留降级方案

```typescript
/**
 * 改造后的请求识别结果函数
 *
 * 策略：
 * 1. 优先使用 WebSocket 实时推送
 * 2. WebSocket 超时（如 10s）后降级为 HTTP 轮询
 * 3. 仍支持 AbortSignal 取消请求
 */
export function requestPatrolResult(
  taskId: string,
  signal?: AbortSignal,
  displayName?: string
): Promise<PatrolResultPayload> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error('aborted'));
      return;
    }

    // WebSocket 优先，由外层 usePatrolWebSocket 推送结果
    // 此函数仅作为兜底，等待外层 resolve

    // 设置 10s 超时，超时后降级为 HTTP 轮询
    const timeoutTimer = window.setTimeout(async () => {
      console.warn(`[Patrol] WebSocket 超时，降级为 HTTP 轮询: ${taskId}`);

      try {
        const result = await PatrolService.getTaskResult(taskId);
        if (result) {
          resolve({
            taskId: result.taskId,
            status: result.status,
            image: result.image || buildSnapshotImage(displayName || taskId, result.title),
            title: result.title,
            detail: result.detail,
            confidence: result.confidence || 0,
          });
        } else {
          reject(new Error('未获取到识别结果'));
        }
      } catch (error) {
        reject(error);
      }
    }, 10000);

    signal?.addEventListener('abort', () => {
      window.clearTimeout(timeoutTimer);
      reject(new Error('aborted'));
    });
  });
}
```

---

## 四、后端接口设计

### 4.1 RESTful API

#### 4.1.1 获取巡检任务列表

```
GET /api/patrol/inspection/{inspectionId}/tasks
```

**请求参数**：

- `inspectionId`（路径参数）：巡检记录 ID

**响应示例**：

```json
{
  "success": true,
  "code": 200,
  "data": [
    {
      "taskId": "task-001",
      "deviceId": "Line009",
      "deviceName": "1#输水管道",
      "deviceType": "pipe",
      "status": "pending",
      "viewpoint": {
        "position": [462.92, 104.29, 110.19],
        "target": [376.73, 65.86, 67.48],
        "fov": 46
      },
      "createdAt": "2025-01-15T10:30:00Z"
    },
    {
      "taskId": "task-002",
      "deviceId": "Rectangle004",
      "deviceName": "9#电机",
      "deviceType": "motor",
      "status": "pending",
      "createdAt": "2025-01-15T10:30:00Z"
    }
    // ... 更多任务
  ]
}
```

#### 4.1.2 提交巡检报告

```
POST /api/patrol/inspection/{inspectionId}/submit
```

**请求体**：

```json
{
  "results": [
    {
      "taskId": "task-001",
      "deviceId": "Line009",
      "status": "success",
      "conclusion": "normal",
      "title": "设备运行正常",
      "detail": "振动幅值处于正常范围，无异常温升。",
      "confidence": 0.97,
      "completedAt": "2025-01-15T10:35:12Z"
    }
    // ... 更多结果
  ]
}
```

**响应示例**：

```json
{
  "success": true,
  "code": 200,
  "message": "巡检报告提交成功",
  "data": {
    "reportId": "report-12345",
    "submittedAt": "2025-01-15T10:40:00Z"
  }
}
```

#### 4.1.3 获取单个任务结果（兜底）

```
GET /api/patrol/task/{taskId}/result
```

**响应示例**：

```json
{
  "success": true,
  "code": 200,
  "data": {
    "taskId": "task-001",
    "deviceId": "Line009",
    "status": "success",
    "conclusion": "normal",
    "title": "设备运行正常",
    "detail": "振动幅值处于正常范围，无异常温升。",
    "confidence": 0.97,
    "image": "https://cdn.example.com/inspection/task-001.jpg",
    "completedAt": "2025-01-15T10:35:12Z"
  }
}
```

### 4.2 WebSocket 协议

#### 4.2.1 连接建立

```
WebSocket URL: wss://api.example.com/api/patrol/ws/{inspectionId}

Headers:
  Authorization: Bearer <token>
```

**连接成功后，后端推送确认消息**：

```json
{
  "type": "CONNECTION_ACK",
  "payload": {
    "inspectionId": "inspection-12345",
    "connectedAt": "2025-01-15T10:30:00Z"
  },
  "messageId": "msg-001",
  "timestamp": 1736935800000
}
```

#### 4.2.2 前端请求识别

```json
{
  "type": "INSPECTION_REQUEST",
  "payload": {
    "taskId": "task-001",
    "deviceId": "Line009",
    "snapshot": "data:image/png;base64,iVBORw0KG...",
    "viewpoint": {
      "position": [462.92, 104.29, 110.19],
      "target": [376.73, 65.86, 67.48],
      "fov": 46
    }
  },
  "messageId": "msg-002",
  "timestamp": 1736935810000
}
```

**后端处理流程**：

1. 接收识别请求
2. 将快照/参数传递给 AI 模型服务
3. AI 模型异步识别（2-5s）
4. 识别完成后推送结果

#### 4.2.3 后端推送结果

```json
{
  "type": "INSPECTION_RESULT",
  "payload": {
    "taskId": "task-001",
    "deviceId": "Line009",
    "status": "success",
    "conclusion": "normal",
    "title": "设备运行正常",
    "detail": "振动幅值处于正常范围，无异常温升。",
    "confidence": 0.97,
    "image": "https://cdn.example.com/inspection/task-001.jpg",
    "completedAt": "2025-01-15T10:35:12Z"
  },
  "messageId": "msg-003",
  "timestamp": 1736935812000
}
```

#### 4.2.4 任务状态更新（可选）

后端可主动推送任务状态变化（如其他客户端修改、管理员干预等）：

```json
{
  "type": "TASK_STATUS_UPDATE",
  "payload": {
    "taskId": "task-002",
    "status": "inspecting",
    "reason": "AI 模型正在处理"
  },
  "messageId": "msg-004",
  "timestamp": 1736935815000
}
```

#### 4.2.5 心跳保活

**前端每 30s 发送**：

```json
{
  "type": "HEARTBEAT",
  "payload": {},
  "messageId": "",
  "timestamp": 1736935820000
}
```

**后端响应**（可选）：

```json
{
  "type": "HEARTBEAT",
  "payload": {},
  "messageId": "",
  "timestamp": 1736935820100
}
```

---

## 五、状态管理与同步

### 5.1 任务状态机

```
pending（待巡检）
    ↓ 3D 场景到达设备
inspecting（识别中）
    ↓ 收到识别结果
completed（已完成） / failed（失败）
```

### 5.2 前端状态维护

**BIMdetail.vue**：

```typescript
// 任务状态映射表
const taskStatusMap = ref<Map<string, PatrolTask['status']>>(new Map());

// 识别结果缓存
const taskResultMap = ref<Map<string, InspectionResult>>(new Map());

// 更新任务状态
function updateTaskStatus(taskId: string, status: PatrolTask['status']) {
  taskStatusMap.value.set(taskId, status);

  // 同步更新任务列表
  const task = patrolTasks.value.find((t) => t.taskId === taskId);
  if (task) {
    task.status = status;
  }
}

// 缓存识别结果
function cacheTaskResult(result: InspectionResult) {
  taskResultMap.value.set(result.taskId, result);
}

// 获取任务进度
const progress = computed(() => {
  const completed = patrolTasks.value.filter((t) => t.status === 'completed').length;
  return {
    completed,
    total: patrolTasks.value.length,
    percentage: Math.round((completed / patrolTasks.value.length) * 100),
  };
});
```

### 5.3 3D 场景与业务层协同

**时序图**：

```
用户          BIMdetail.vue    WebSocket         3D Scene          后端
 |                |                |                  |               |
 |-- 进入页面 --→|                |                  |               |
 |                |-- 获取任务 --→|                  |               |
 |                |←-- 任务列表 --|                  |               |
 |                |                |                  |               |
 |                |-- 建立连接 --→|                  |               |
 |                |←- CONNECTION_ACK -|               |               |
 |                |                |                  |               |
 |                |-- 传递任务 --→|                  |               |
 |                |                |-- 开始巡检 --→  |               |
 |                |                |                  |               |
 |                |←- 到达设备 -←|                  |               |
 |                |                |                  |               |
 |                |-- 请求识别 --→|                  |               |
 |                |                |-- INSPECTION_REQUEST --→        |
 |                |                |                  |-- 调用 AI -→|
 |                |                |                  |               |
 |                |                |←- INSPECTION_RESULT -|←- 返回 -|
 |                |                |                  |               |
 |                |-- 展示结果 --→|                  |               |
 |                |                |-- 显示卡片 --→  |               |
 |                |                |                  |               |
 |                |                |-- 15s 后继续 -→  |               |
 |                |                |                  |               |
 |                |←- 到达下一设备 -|                |               |
 |               ...              ...                ...             ...
```

---

## 六、异常处理与降级方案

### 6.1 WebSocket 连接失败

**场景**：网络问题、服务端不可用

**处理**：

1. 自动重连（指数退避，最多 5 次）
2. 提示用户"实时连接异常，正在尝试重连"
3. 超过最大重连次数后，降级为 HTTP 轮询模式

```typescript
// HTTP 轮询兜底（每 2s 查询一次结果）
function fallbackToPolling(taskId: string) {
  const pollInterval = setInterval(async () => {
    try {
      const result = await PatrolService.getTaskResult(taskId);
      if (result) {
        clearInterval(pollInterval);
        handleInspectionResult(result);
      }
    } catch (error) {
      console.error('[Polling] 查询失败', error);
    }
  }, 2000);

  // 最多轮询 30s
  setTimeout(() => {
    clearInterval(pollInterval);
    ElMessage.error('识别超时，请稍后重试');
  }, 30000);
}
```

### 6.2 识别超时

**场景**：后端 AI 模型处理时间过长（> 10s）

**处理**：

1. 前端显示"识别耗时较长，请稍候..."
2. 继续等待，不中断
3. 30s 后仍无结果，标记任务为 `failed`，跳过继续下一个

```typescript
function requestInspection(request) {
  const timeoutTimer = setTimeout(() => {
    ElMessage.warning('识别超时，已跳过该设备');
    updateTaskStatus(request.taskId, 'failed');
    // 通知 3D 场景继续下一个
    waterPlantScene.advanceToNextTarget();
  }, 30000);

  // 收到结果后清除定时器
  signal.addEventListener('result', () => {
    clearTimeout(timeoutTimer);
  });
}
```

### 6.3 快照截取失败

**场景**：WebGL 上下文丢失、浏览器安全策略

**处理**：

- 不传递 `snapshot` 字段
- 后端使用默认识别模式（基于设备类型）

```typescript
function captureSceneSnapshot(): string | undefined {
  try {
    const canvas = document.querySelector('.three-water-plant__canvas') as HTMLCanvasElement;
    if (!canvas) return undefined;

    return canvas.toDataURL('image/png');
  } catch (error) {
    console.warn('[Snapshot] 截图失败', error);
    return undefined;
  }
}
```

### 6.4 任务列表为空

**场景**：巡检记录无任务、配置错误

**处理**：

- 显示空状态提示："该巡检记录暂无任务"
- 不启动 3D 巡检，仅展示静态场景

---

## 七、性能优化建议

### 7.1 WebSocket 连接复用

**问题**：频繁进出页面导致连接建立/断开开销大

**方案**：

- 使用全局单例管理 WebSocket 连接
- 同一 `inspectionId` 复用连接
- 页面切换时保持连接，仅取消订阅

```typescript
// 全局 WebSocket 管理器
class GlobalPatrolWebSocket {
  private connections = new Map<string, WebSocket>();

  getOrCreate(inspectionId: string): WebSocket {
    if (!this.connections.has(inspectionId)) {
      const ws = new WebSocket(`wss://.../${inspectionId}`);
      this.connections.set(inspectionId, ws);
    }
    return this.connections.get(inspectionId)!;
  }

  close(inspectionId: string) {
    const ws = this.connections.get(inspectionId);
    if (ws) {
      ws.close();
      this.connections.delete(inspectionId);
    }
  }
}
```

### 7.2 识别结果缓存

**问题**：用户返回页面需重新识别

**方案**：

- 本地缓存已识别的结果（Map/IndexedDB）
- 下次进入直接展示缓存，标注"历史结果"

```typescript
// 使用 IndexedDB 持久化
import { useIndexedDB } from '@vueuse/core';

const { get, set } = useIndexedDB('patrol-results', 'results');

// 保存结果
async function cacheResult(result: InspectionResult) {
  await set(result.taskId, result);
}

// 读取缓存
async function loadCachedResult(taskId: string): Promise<InspectionResult | null> {
  return await get(taskId);
}
```

### 7.3 快照压缩

**问题**：Base64 编码的 PNG 快照体积大（200-500KB）

**方案**：

- 使用 JPEG 格式（`canvas.toDataURL('image/jpeg', 0.8)`）
- 降低分辨率（缩小 canvas 尺寸）
- 前端压缩后再传输

```typescript
function captureCompressedSnapshot(maxWidth = 800): string | undefined {
  try {
    const canvas = document.querySelector('.three-water-plant__canvas') as HTMLCanvasElement;
    if (!canvas) return undefined;

    // 创建缩小的 canvas
    const scale = Math.min(1, maxWidth / canvas.width);
    const smallCanvas = document.createElement('canvas');
    smallCanvas.width = canvas.width * scale;
    smallCanvas.height = canvas.height * scale;

    const ctx = smallCanvas.getContext('2d');
    ctx?.drawImage(canvas, 0, 0, smallCanvas.width, smallCanvas.height);

    // JPEG 压缩
    return smallCanvas.toDataURL('image/jpeg', 0.8);
  } catch (error) {
    console.warn('[Snapshot] 压缩截图失败', error);
    return undefined;
  }
}
```

### 7.4 批量上报

**问题**：每个设备识别完立即上报，请求频繁

**方案**：

- 全部任务完成后批量提交报告
- WebSocket 仅用于实时反馈，最终结果由 HTTP 统一提交

---

## 八、安全性考虑

### 8.1 WebSocket 鉴权

**方案**：

- 连接建立时通过 URL 参数或 Header 传递 Token
- 后端验证 Token 有效性，无效则拒绝连接

```typescript
// 前端携带 Token
const token = getAuthToken();
const wsUrl = `wss://api.example.com/api/patrol/ws/${inspectionId}?token=${token}`;
```

**后端验证**（Spring Boot 示例）：

```java
@Component
public class WebSocketAuthInterceptor implements HandshakeInterceptor {
    @Override
    public boolean beforeHandshake(ServerHttpRequest request,
                                    ServerHttpResponse response,
                                    WebSocketHandler wsHandler,
                                    Map<String, Object> attributes) {
        String token = request.getURI().getQuery().split("token=")[1];
        if (!validateToken(token)) {
            return false; // 拒绝握手
        }
        return true;
    }
}
```

### 8.2 消息签名

**问题**：防止消息篡改

**方案**：

- 关键消息（如识别结果）携带签名
- 前端验证签名有效性

```typescript
interface SignedMessage {
  data: InspectionResult;
  signature: string; // HMAC-SHA256(data + secret)
}

function verifySignature(message: SignedMessage): boolean {
  const expectedSig = computeHMAC(JSON.stringify(message.data), SECRET_KEY);
  return message.signature === expectedSig;
}
```

### 8.3 数据脱敏

**问题**：识别结果可能包含敏感信息

**方案**：

- 后端过滤敏感字段（如设备物理地址、内部编号）
- 前端仅展示必要信息

---

## 九、测试用例

### 9.1 正常流程测试

| 测试场景           | 前置条件            | 操作步骤                       | 预期结果                                |
| ------------------ | ------------------- | ------------------------------ | --------------------------------------- |
| 完整巡检流程       | 任务列表有 3 个任务 | 进入页面 → 自动巡检 → 全部完成 | 3 个任务依次识别，结果卡片展示正确      |
| WebSocket 实时反馈 | 连接正常            | 到达设备 → 发送请求            | 2-5s 内收到识别结果                     |
| 任务状态同步       | 多客户端同时连接    | A 客户端完成任务 1             | B 客户端看到任务 1 状态更新为 completed |

### 9.2 异常流程测试

| 测试场景       | 模拟条件         | 操作步骤     | 预期结果                           |
| -------------- | ---------------- | ------------ | ---------------------------------- |
| WebSocket 断连 | 手动断开网络     | 识别中途断网 | 自动重连，重连后继续               |
| 识别超时       | 后端延迟 30s     | 等待识别结果 | 30s 后提示超时，跳过该设备         |
| 任务列表为空   | 返回空数组       | 进入页面     | 显示空状态，不启动巡检             |
| 快照截取失败   | WebGL 上下文丢失 | 到达设备     | 不传递快照，识别继续               |
| 重复进入页面   | 已识别部分任务   | 退出后再进入 | 加载缓存结果，已完成任务不重复识别 |

### 9.3 性能测试

| 测试场景         | 测试条件          | 指标要求                          |
| ---------------- | ----------------- | --------------------------------- |
| 大任务列表       | 100 个任务        | 列表渲染 < 200ms，内存增长 < 50MB |
| WebSocket 长连接 | 保持连接 30 分钟  | 无内存泄漏，心跳正常              |
| 快照传输         | 800x600 JPEG 快照 | 单次传输 < 100KB，耗时 < 500ms    |

---

## 十、部署与监控

### 10.1 部署架构

```
                    ┌─────────────┐
                    │   Nginx     │ (反向代理)
                    └──────┬──────┘
                           │
              ┌────────────┴────────────┐
              │                         │
         HTTP │                    WebSocket
              │                         │
    ┌─────────▼────────┐      ┌────────▼────────┐
    │  API Server      │      │  WebSocket      │
    │  (RESTful)       │      │  Server         │
    └─────────┬────────┘      └────────┬────────┘
              │                         │
              └────────────┬────────────┘
                           │
                    ┌──────▼──────┐
                    │  AI Model   │
                    │  Service    │
                    └─────────────┘
```

**Nginx 配置**（WebSocket 代理）：

```nginx
location /api/patrol/ws/ {
    proxy_pass http://ws-backend;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_read_timeout 300s;
    proxy_send_timeout 300s;
}
```

### 10.2 监控指标

**前端监控**（埋点）：

- WebSocket 连接成功率
- 识别请求响应时间（P50/P95/P99）
- 任务完成率
- 异常重连次数

**后端监控**：

- WebSocket 并发连接数
- AI 模型推理耗时
- 消息队列积压
- 错误率（识别失败/超时）

**示例（前端埋点）**：

```typescript
// 使用 Web Vitals / Sentry 等工具
import { reportMetric } from '@/utils/monitoring';

// 连接建立
reportMetric('ws_connection_success', { inspectionId });

// 识别耗时
const startTime = performance.now();
// ... 等待识别结果
const duration = performance.now() - startTime;
reportMetric('inspection_duration', { duration, taskId });

// 识别失败
reportMetric('inspection_failed', { taskId, error: error.message });
```

---

## 十一、后续扩展方向

### 11.1 离线模式

**场景**：现场网络不稳定

**方案**：

- 前端缓存任务列表和历史结果
- 支持离线巡检（仅记录截图和时间戳）
- 恢复网络后批量同步

### 11.2 实时视频流识别

**场景**：提升识别准确率

**方案**：

- 巡检过程中持续传输视频流（WebRTC）
- 后端实时分析视频帧
- 检测到异常立即告警

### 11.3 多人协同巡检

**场景**：多个工程师同时巡检不同区域

**方案**：

- WebSocket 广播其他用户的巡检进度
- 3D 场景中显示其他用户的位置标记
- 任务动态分配（避免重复巡检）

---

## 十二、总结

本方案设计了一套完整的"任务列表 → 自动巡检 → 实时识别 → 结果反馈"闭环系统，核心特点：

1. **前后端分离**：HTTP 获取任务，WebSocket 实时通信，职责清晰
2. **性能优化**：连接复用、结果缓存、快照压缩，保证流畅体验
3. **高可用性**：自动重连、降级方案、异常处理，保证系统稳定
4. **扩展性强**：支持离线模式、视频流、多人协同等未来需求

**推荐实施步骤**：

1. **Phase 1**（2 周）：实现 HTTP API + 本地模拟 WebSocket，验证业务流程
2. **Phase 2**（2 周）：接入真实 WebSocket，对接后端 AI 服务
3. **Phase 3**（1 周）：优化性能（缓存、压缩、批量），完善异常处理
4. **Phase 4**（1 周）：测试、监控、文档，上线验证

---

**文档版本**：v1.0  
**编写日期**：2025-01-15  
**维护者**：前端团队
