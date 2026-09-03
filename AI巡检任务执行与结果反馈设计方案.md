# AI 巡检任务执行与结果反馈设计方案

## 一、业务流程概述

### 1.1 核心流程（后端驱动模式）

```
【后端】巡检任务队列已启动，按序执行
    ↓
【前端】用户进入详情页
    ↓
【前端】HTTP 获取任务列表 + 当前执行状态
    ↓
【前端】建立 WebSocket 连接订阅推送
    ↓
【后端】推送："当前执行到 task-003"
    ↓
【前端】3D 场景飞向对应设备，开始等待
    ↓
【后端】AI 识别完成 → 推送识别结果
    ↓
【前端】展示结果卡片（15s）
    ↓
【后端】推送："开始执行 task-004"
    ↓
【前端】3D 场景飞向下一个设备，继续等待
    ↓
... 循环往复 ...
    ↓
【后端】推送："全部任务已完成"
    ↓
【前端】显示完成提示，断开连接
```

### 1.2 角色职责

| 角色             | 职责                                                          |
| ---------------- | ------------------------------------------------------------- |
| **后端**         | 自主执行任务队列、调用 AI 模型、主动推送任务状态与识别结果    |
| **前端 3D 场景** | 被动跟随后端进度、飞向对应设备、展示识别结果                  |
| **前端业务层**   | 管理 WebSocket 连接、接收推送、同步 3D 场景状态、展示任务进度 |

### 1.3 关键设计原则

⚠️ **前端不发送识别请求，只接收推送**

- 前端无 `INSPECTION_REQUEST` 消息
- 后端完全自主决定何时执行哪个任务
- 前端通过 WebSocket 被动接收 `TASK_STARTED`、`INSPECTION_RESULT` 等推送

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

### 2.2 任务开始推送（Task Started）

```typescript
/**
 * 后端 → 前端：通知前端某个任务开始执行
 */
interface TaskStarted {
  /** 消息类型 */
  type: 'TASK_STARTED';

  /** 任务 ID */
  taskId: string;

  /** 设备 ID */
  deviceId: string;

  /** 设备名称 */
  deviceName: string;

  /** 设备类型 */
  deviceType: string;

  /** 预计识别耗时（秒，可选） */
  estimatedDuration?: number;

  /** 开始时间 */
  startedAt: string;
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

### 2.4 任务完成推送（Task Completed）

```typescript
/**
 * 后端 → 前端：通知前端某个任务已完成（无论成功/失败）
 */
interface TaskCompleted {
  /** 消息类型 */
  type: 'TASK_COMPLETED';

  /** 任务 ID */
  taskId: string;

  /** 完成状态 */
  status: 'success' | 'failed';

  /** 完成时间 */
  completedAt: string;
}
```

### 2.5 全部任务完成推送（All Tasks Completed）

```typescript
/**
 * 后端 → 前端：通知前端当前巡检记录的所有任务已执行完毕
 */
interface AllTasksCompleted {
  /** 消息类型 */
  type: 'ALL_TASKS_COMPLETED';

  /** 巡检记录 ID */
  inspectionId: string;

  /** 总任务数 */
  totalTasks: number;

  /** 成功数 */
  successCount: number;

  /** 失败数 */
  failedCount: number;

  /** 完成时间 */
  completedAt: string;
}
```

### 2.6 WebSocket 消息协议

```typescript
/**
 * WebSocket 消息统一格式
 */
interface WebSocketMessage {
  /** 消息类型 */
  type:
    | 'CONNECTION_ACK' // 连接确认（后端 → 前端）
    | 'TASK_STARTED' // 任务开始（后端 → 前端）
    | 'INSPECTION_RESULT' // 识别结果（后端 → 前端）
    | 'TASK_COMPLETED' // 任务完成（后端 → 前端）
    | 'ALL_TASKS_COMPLETED' // 全部完成（后端 → 前端）
    | 'HEARTBEAT' // 心跳保活（双向）
    | 'ERROR'; // 错误消息（后端 → 前端）

  /** 消息负载（根据 type 不同而不同） */
  payload: Record<string, unknown>;

  /** 消息 ID（用于追踪） */
  messageId: string;

  /** 时间戳 */
  timestamp: number;
}
```

**⚠️ 注意**：前端**只接收**推送，**不发送**业务消息（除心跳外）

/\*_ 时间戳 _/
timestamp: number;
}

```

---

## 三、前端架构设计

### 3.1 目录结构

```

apps/HK/src/views/appCenter/src/
├── components/
│ ├── three-water-plant/
│ │ ├── threeRectangle.vue # 3D 场景容器（现有）
│ │ ├── WaterPlantScene.ts # 场景渲染（现有）
│ │ ├── patrolController.ts # 巡检控制器（现有）
│ │ └── patrolResult.ts # 结果数据源（需改造）
│ └── shared/
│ └── constants.ts # 配置常量（现有）
├── composables/
│ └── usePatrolWebSocket.ts # WebSocket 连接管理（新增）
├── services/
│ └── patrolService.ts # 巡检任务 API（新增）
└── BIMdetail.vue # AI 巡检详情页（需改造）

````

### 3.2 核心模块职责

#### 3.2.1 `BIMdetail.vue` - 页面控制器

**职责**：

- 获取巡检任务列表 + 当前执行状态（HTTP API）
- 管理 WebSocket 连接生命周期
- 被动接收后端推送，驱动 3D 场景跟随
- 维护前端任务状态同步

**关键逻辑**：

```typescript
// 1. 页面加载：获取任务列表和当前进度
onMounted(async () => {
  try {
    // 从 URL 参数获取巡检记录 ID
    const inspectionId = route.query.id;

    // HTTP 获取任务列表 + 当前执行状态
    const { tasks, currentTaskId } = await PatrolService.getTaskListWithStatus(inspectionId);

    // 建立 WebSocket 连接，订阅推送
    const { connect, disconnect } = usePatrolWebSocket(inspectionId);
    connect({
      onTaskStarted: handleTaskStarted,
      onResult: handleInspectionResult,
      onTaskCompleted: handleTaskCompleted,
      onAllCompleted: handleAllTasksCompleted,
    });

    // 传递任务列表给 3D 场景
    patrolTasks.value = tasks;

    // 如果后端已经开始执行某个任务，立即飞向对应设备
    if (currentTaskId) {
      const currentTask = tasks.find(t => t.taskId === currentTaskId);
      if (currentTask) {
        flyToDevice(currentTask.deviceId, currentTask.deviceName);
      }
    }
  } catch (error) {
    ElMessage.error('任务列表加载失败');
  }
});

// 2. 收到"任务开始"推送
const handleTaskStarted = (data: TaskStarted) => {
  console.log(`[巡检] 后端开始执行任务: ${data.deviceName}`);

  // 更新任务状态为"执行中"
  updateTaskStatus(data.taskId, 'inspecting');

  // 驱动 3D 场景飞向对应设备
  flyToDevice(data.deviceId, data.deviceName);

  // 显示加载提示
  ElMessage.info(`正在巡检 ${data.deviceName}，请稍候...`);
};

// 3. 收到"识别结果"推送
const handleInspectionResult = (result: InspectionResult) => {
  console.log(`[巡检] 收到识别结果: ${result.taskId}`);

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

  // 卡片展示 15s 后自动隐藏（由 3D 场景内部控制）
  // 后端会在适当时机推送下一个 TASK_STARTED
};

// 4. 收到"任务完成"推送
const handleTaskCompleted = (data: TaskCompleted) => {
  console.log(`[巡检] 任务完成: ${data.taskId}, 状态: ${data.status}`);

  // 更新任务状态
  updateTaskStatus(data.taskId, data.status === 'success' ? 'completed' : 'failed');
};

// 5. 收到"全部完成"推送
const handleAllTasksCompleted = (data: AllTasksCompleted) => {
  console.log(`[巡检] 全部任务已完成，成功: ${data.successCount}, 失败: ${data.failedCount}`);

  ElMessage.success(`巡检完成！共 ${data.totalTasks} 个任务，成功 ${data.successCount} 个`);

  // 可选：自动跳转到报告页
  // router.push(`/patrol/report/${data.inspectionId}`);
};

// 6. 驱动 3D 场景飞向设备
const flyToDevice = (deviceId: string, deviceName: string) => {
  // 通知 3D 场景组件
  waterPlantSceneRef.value?.flyToDevice(deviceId, deviceName);
};

// 7. 页面卸载：断开连接
onBeforeUnmount(() => {
  disconnect();
});
````

**关键变化**：

- ❌ 删除 `handleDeviceArrived` —— 前端不再主动触发识别
- ✅ 新增 `handleTaskStarted` —— 被动接收后端推送，驱动 3D 场景
- ✅ 新增 `handleAllTasksCompleted` —— 监听全部完成事件

````

#### 3.2.2 `usePatrolWebSocket.ts` - WebSocket 管理

**职责**：

- 建立和维护 WebSocket 连接
- 处理重连逻辑（指数退避）
- 心跳保活
- **仅接收**后端推送消息，分发给回调函数

**核心实现**：

```typescript
import { ref, onUnmounted } from 'vue';

interface UsePatrolWebSocketOptions {
  /** 任务开始回调 */
  onTaskStarted?: (data: TaskStarted) => void;
  /** 识别结果回调 */
  onResult?: (result: InspectionResult) => void;
  /** 任务完成回调 */
  onTaskCompleted?: (data: TaskCompleted) => void;
  /** 全部完成回调 */
  onAllCompleted?: (data: AllTasksCompleted) => void;
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
    const { onTaskStarted, onResult, onTaskCompleted, onAllCompleted, onError } = options;

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

          case 'TASK_STARTED':
            onTaskStarted?.(message.payload as TaskStarted);
            break;

          case 'INSPECTION_RESULT':
            onResult?.(message.payload as InspectionResult);
            break;

          case 'TASK_COMPLETED':
            onTaskCompleted?.(message.payload as TaskCompleted);
            break;

          case 'ALL_TASKS_COMPLETED':
            onAllCompleted?.(message.payload as AllTasksCompleted);
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

  // 组件卸载时自动断开
  onUnmounted(() => {
    disconnect();
  });

  return {
    isConnected,
    connect,
    disconnect,
  };
}
````

**关键变化**：

- ❌ 删除 `requestInspection` 方法 —— 前端不再发送识别请求
- ✅ 新增 `onTaskStarted` 回调 —— 监听任务开始推送
- ✅ 新增 `onTaskCompleted` / `onAllCompleted` 回调

````

#### 3.2.3 `patrolService.ts` - HTTP API

**职责**：

- 获取巡检任务列表 + 当前执行状态
- 查询历史记录

```typescript
import http from '@/api';

export class PatrolService {
  /**
   * 获取巡检任务列表 + 当前执行状态
   * @param inspectionId 巡检记录 ID
   */
  static async getTaskListWithStatus(inspectionId: string): Promise<{
    tasks: PatrolTask[];
    currentTaskId: string | null; // 当前正在执行的任务 ID（null 表示尚未开始或已全部完成）
    totalTasks: number;
    completedTasks: number;
  }> {
    const { data } = await http.get(`/api/patrol/inspection/${inspectionId}/tasks`);
    return data;
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
````

**关键变化**：

- ❌ 删除 `submitReport` —— 后端自主执行，无需前端提交
- ✅ 修改 `getTaskList` → `getTaskListWithStatus` —— 返回当前执行状态

````

#### 3.2.4 `patrolResult.ts` 改造

**现状**：本地模拟数据源
**改造方向**：完全依赖外层 WebSocket 推送，不再主动请求

```typescript
/**
 * 改造后：不再主动请求，仅提供数据转换
 *
 * 实际识别结果由 BIMdetail.vue 通过 WebSocket 接收后，
 * 通过 props/event 传递给 3D 场景组件
 *
 * 本模块仅保留：
 * 1. 类型定义
 * 2. 数据格式转换函数
 * 3. 降级兜底（HTTP 轮询）
 */

/**
 * HTTP 轮询兜底（仅在 WebSocket 完全失败时使用）
 * 外层应优先使用 WebSocket，此函数作为最后保障
 */
export async function pollTaskResult(
  taskId: string,
  maxAttempts = 15, // 最多轮询 15 次（30s）
  interval = 2000    // 每 2s 一次
): Promise<PatrolResultPayload | null> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const result = await PatrolService.getTaskResult(taskId);
      if (result) {
        return {
          taskId: result.taskId,
          status: result.status,
          image: result.image || buildDefaultImage(taskId),
          title: result.title,
          detail: result.detail,
          confidence: result.confidence || 0,
        };
      }
    } catch (error) {
      console.error(`[轮询] 第 ${attempt + 1} 次查询失败`, error);
    }

    // 等待 interval 后继续
    await new Promise(resolve => setTimeout(resolve, interval));
  }

  return null;
}

/**
 * 构建默认快照图片（兜底）
 */
function buildDefaultImage(taskId: string): string {
  // 返回占位图或默认图
  return `https://via.placeholder.com/400x300?text=${encodeURIComponent(taskId)}`;
}
````

**关键变化**：

- ❌ 删除 `requestPatrolResult` 的 WebSocket 超时逻辑 —— 外层统一处理
- ✅ 简化为纯粹的 HTTP 轮询兜底函数
- ✅ 主流程完全依赖 `BIMdetail.vue` 的 WebSocket 推送

```

---

## 四、后端接口设计

### 4.1 RESTful API

#### 4.1.1 获取巡检任务列表 + 当前执行状态

```

GET /api/patrol/inspection/{inspectionId}/tasks

````

**请求参数**：

- `inspectionId`（路径参数）：巡检记录 ID

**响应示例**：

```json
{
  "success": true,
  "code": 200,
  "data": {
    "tasks": [
      {
        "taskId": "task-001",
        "deviceId": "Line009",
        "deviceName": "1#输水管道",
        "deviceType": "pipe",
        "status": "completed",
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
        "status": "inspecting",
        "createdAt": "2025-01-15T10:30:00Z"
      },
      {
        "taskId": "task-003",
        "deviceId": "Box001",
        "deviceName": "3#控制柜",
        "deviceType": "cabinet",
        "status": "pending",
        "createdAt": "2025-01-15T10:30:00Z"
      }
    ],
    "currentTaskId": "task-002",
    "totalTasks": 10,
    "completedTasks": 1
  }
}
````

**字段说明**：

- `currentTaskId`：当前正在执行的任务 ID，`null` 表示尚未开始或已全部完成
- `status`：任务状态（`pending` / `inspecting` / `completed` / `failed`）

```

#### 4.1.2 获取单个任务结果（兜底）

```

GET /api/patrol/task/{taskId}/result

````

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
````

**用途**：仅在 WebSocket 连接失败时，前端降级为 HTTP 轮询使用

```

### 4.2 WebSocket 协议（后端驱动模式）

#### 4.2.1 连接建立

```

WebSocket URL: wss://api.example.com/api/patrol/ws/{inspectionId}

Headers:
Authorization: Bearer <token>

````

**连接成功后，后端推送确认消息**：

```json
{
  "type": "CONNECTION_ACK",
  "payload": {
    "inspectionId": "inspection-12345",
    "connectedAt": "2025-01-15T10:30:00Z",
    "currentTaskId": "task-002"
  },
  "messageId": "msg-001",
  "timestamp": 1736935800000
}
````

**说明**：`currentTaskId` 告知前端当前正在执行哪个任务（如果有）

#### 4.2.2 后端推送：任务开始

```json
{
  "type": "TASK_STARTED",
  "payload": {
    "taskId": "task-003",
    "deviceId": "Box001",
    "deviceName": "3#控制柜",
    "deviceType": "cabinet",
    "estimatedDuration": 5,
    "startedAt": "2025-01-15T10:35:00Z"
  },
  "messageId": "msg-002",
  "timestamp": 1736935900000
}
```

**前端收到后的处理**：

1. 更新任务状态为 `inspecting`
2. 驱动 3D 场景飞向对应设备（`Box001`）
3. 显示加载提示："正在巡检 3#控制柜，请稍候..."

#### 4.2.3 后端推送：识别结果

```json
{
  "type": "INSPECTION_RESULT",
  "payload": {
    "taskId": "task-003",
    "deviceId": "Box001",
    "status": "success",
    "conclusion": "normal",
    "title": "设备运行正常",
    "detail": "振动幅值处于正常范围，无异常温升。",
    "confidence": 0.97,
    "image": "https://cdn.example.com/inspection/task-003.jpg",
    "completedAt": "2025-01-15T10:35:12Z"
  },
  "messageId": "msg-003",
  "timestamp": 1736935912000
}
```

**前端收到后的处理**：

1. 展示结果卡片（标题 + 详情 + 图片 + 置信度）
2. 卡片显示 15s 后自动隐藏
3. 等待后端推送下一个 `TASK_STARTED`

#### 4.2.4 后端推送：任务完成

```json
{
  "type": "TASK_COMPLETED",
  "payload": {
    "taskId": "task-003",
    "status": "success",
    "completedAt": "2025-01-15T10:35:12Z"
  },
  "messageId": "msg-004",
  "timestamp": 1736935912000
}
```

**前端收到后的处理**：

- 更新任务状态为 `completed`

#### 4.2.5 后端推送：全部任务完成

```json
{
  "type": "ALL_TASKS_COMPLETED",
  "payload": {
    "inspectionId": "inspection-12345",
    "totalTasks": 10,
    "successCount": 9,
    "failedCount": 1,
    "completedAt": "2025-01-15T10:45:00Z"
  },
  "messageId": "msg-005",
  "timestamp": 1736936700000
}
```

**前端收到后的处理**：

- 显示完成提示："巡检完成！共 10 个任务，成功 9 个"
- 可选：跳转到报告页

#### 4.2.6 心跳保活

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

#### 4.2.7 后端执行流程

```
【后端任务队列】
    ↓
取出下一个任务（task-003）
    ↓
推送 TASK_STARTED
    ↓
调用 AI 模型识别（2-5s）
    ↓
推送 INSPECTION_RESULT
    ↓
推送 TASK_COMPLETED
    ↓
【可选】等待 15s（给前端展示卡片）
    ↓
取出下一个任务（task-004）
    ↓
... 循环往复 ...
    ↓
全部完成 → 推送 ALL_TASKS_COMPLETED
```

**⚠️ 关键点**：

- 后端完全自主决定何时执行哪个任务
- 前端无法命令后端"开始识别"或"跳过"
- 前端只能被动接收推送，同步 3D 场景状态

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

````

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
````

### 5.3 3D 场景与业务层协同

**时序图（后端驱动模式）**：

```
后端任务队列   后端           WebSocket         BIMdetail.vue    3D Scene
     |            |                |                  |               |
     |-- 开始执行 task-003 --→|                  |               |
     |            |                |                  |               |
     |            |-- TASK_STARTED --→              |               |
     |            |                |                  |               |
     |            |                |←- 收到推送 -←|               |
     |            |                |                  |               |
     |            |                |                  |-- 飞向设备 -→|
     |            |                |                  |               |
     |            |-- 调用 AI 识别（2-5s）--→      |               |
     |            |                |                  |               |
     |            |←- 识别完成 -←|                  |               |
     |            |                |                  |               |
     |            |-- INSPECTION_RESULT --→         |               |
     |            |                |                  |               |
     |            |                |←- 收到结果 -←|               |
     |            |                |                  |               |
     |            |                |                  |-- 展示卡片 -→|
     |            |                |                  |               |
     |            |-- TASK_COMPLETED --→            |               |
     |            |                |                  |               |
     |            |                |←- 更新状态 -←|               |
     |            |                |                  |               |
     |-- 【可选等待 15s 卡片展示】--→              |               |
     |            |                |                  |               |
     |-- 开始执行 task-004 --→|                  |               |
     |            |                |                  |               |
     |            |-- TASK_STARTED --→              |               |
     |           ...              ...                ...             ...
     |            |                |                  |               |
     |-- 全部完成 --→          |                  |               |
     |            |                |                  |               |
     |            |-- ALL_TASKS_COMPLETED --→       |               |
     |            |                |                  |               |
     |            |                |←- 显示完成提示 -|               |
```

**关键流程说明**：

1. **后端主导**：任务队列完全由后端控制，前端无法干预
2. **推送驱动**：每个 `TASK_STARTED` 推送触发前端 3D 场景飞向对应设备
3. **结果展示**：`INSPECTION_RESULT` 推送后，前端展示卡片 15s
4. **状态同步**：`TASK_COMPLETED` 推送后，前端更新任务状态
5. **循环往复**：后端按序推送下一个任务，前端被动跟随

````

---

## 六、异常处理与降级方案

### 6.1 WebSocket 连接失败

**场景**：网络问题、服务端不可用

**处理**：

1. 自动重连（指数退避，最多 5 次）
2. 提示用户"实时连接异常，正在尝试重连"
3. 超过最大重连次数后，降级为 HTTP 轮询模式

```typescript
// HTTP 轮询兜底（每 2s 查询一次当前任务状态）
function fallbackToPolling(inspectionId: string) {
  const pollInterval = setInterval(async () => {
    try {
      const { currentTaskId, tasks } = await PatrolService.getTaskListWithStatus(inspectionId);

      // 检查是否有新的任务开始
      if (currentTaskId && currentTaskId !== lastTaskId.value) {
        lastTaskId.value = currentTaskId;
        const task = tasks.find(t => t.taskId === currentTaskId);
        if (task) {
          handleTaskStarted({
            type: 'TASK_STARTED',
            taskId: task.taskId,
            deviceId: task.deviceId,
            deviceName: task.deviceName,
            deviceType: task.deviceType,
            startedAt: new Date().toISOString(),
          });
        }
      }

      // 轮询当前任务的结果
      if (currentTaskId) {
        const result = await PatrolService.getTaskResult(currentTaskId);
        if (result) {
          handleInspectionResult(result);
        }
      }
    } catch (error) {
      console.error('[轮询] 查询失败', error);
    }
  }, 2000);

  // 最多轮询 5 分钟
  setTimeout(() => {
    clearInterval(pollInterval);
    ElMessage.error('连接超时，请刷新页面重试');
  }, 300000);
}
````

### 6.2 后端任务执行超时

**场景**：后端某个任务长时间未完成（如 AI 模型卡死）

**处理**：

1. 前端监控：如果某个任务超过 2 分钟仍处于 `inspecting` 状态，显示警告
2. 提示用户："当前任务执行时间较长，请稍候或联系管理员"
3. 前端**不主动跳过**，等待后端推送（可能是 `TASK_COMPLETED` 失败或超时）

```typescript
// 监控任务执行超时
watch(currentTaskId, (newTaskId) => {
  // 清除旧的超时定时器
  if (taskTimeoutTimer) {
    clearTimeout(taskTimeoutTimer);
  }

  if (newTaskId) {
    // 2 分钟后仍未完成，显示警告
    taskTimeoutTimer = setTimeout(() => {
      ElMessage.warning('当前任务执行时间较长，请稍候...');
    }, 120000);
  }
});
```

### 6.3 推送消息丢失

**场景**：网络抖动导致某条 WebSocket 消息未送达

**处理**：

1. 前端定期（每 30s）轮询任务状态，对比本地状态与服务端状态
2. 发现不一致时，主动同步（如本地显示 `pending`，服务端已 `completed`）

```typescript
// 定期同步状态（每 30s）
setInterval(async () => {
  try {
    const { tasks, currentTaskId } = await PatrolService.getTaskListWithStatus(inspectionId);

    // 对比本地任务状态与服务端状态
    tasks.forEach((serverTask) => {
      const localTask = patrolTasks.value.find((t) => t.taskId === serverTask.taskId);
      if (localTask && localTask.status !== serverTask.status) {
        console.warn(
          `[同步] 任务 ${serverTask.taskId} 状态不一致，本地: ${localTask.status}, 服务端: ${serverTask.status}`
        );
        localTask.status = serverTask.status;
      }
    });

    // 同步当前执行任务
    if (currentTaskId && currentTaskId !== lastTaskId.value) {
      console.warn(`[同步] 检测到任务切换，currentTaskId: ${currentTaskId}`);
      lastTaskId.value = currentTaskId;
      const task = tasks.find((t) => t.taskId === currentTaskId);
      if (task) {
        flyToDevice(task.deviceId, task.deviceName);
      }
    }
  } catch (error) {
    console.error('[同步] 状态同步失败', error);
  }
}, 30000);
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

**问题**：用户返回页面需重新获取结果

**方案**：

- 本地缓存已完成任务的结果（Map/IndexedDB）
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

### 7.3 状态同步优化

**问题**：定期轮询任务状态开销大

**方案**：

- WebSocket 连接正常时，不轮询
- 仅在检测到连接异常（如 30s 未收到任何消息）时，才启动轮询

```typescript
let lastMessageTime = Date.now();

// WebSocket 收到任何消息时更新时间戳
ws.onmessage = (event) => {
  lastMessageTime = Date.now();
  // ... 处理消息
};

// 检测连接健康度（每 60s 检查一次）
setInterval(() => {
  const silentDuration = Date.now() - lastMessageTime;
  if (silentDuration > 30000) {
    console.warn(`[健康检查] ${silentDuration}ms 未收到消息，启动轮询兜底`);
    fallbackToPolling(inspectionId);
  }
}, 60000);
```

### 7.4 3D 场景飞行动画优化

**问题**：频繁切换设备时，飞行动画卡顿

**方案**：

- 使用 `requestAnimationFrame` 驱动相机动画
- 动画插值使用 `easeInOutCubic`，避免突兀
- 飞行时长根据距离自适应（近距离 1s，远距离 3s）

````typescript
// 参考 patrolController.ts 中的 flyToTarget 实现
// 已在之前的优化中实现

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
````

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

| 测试场景                 | 前置条件                                | 操作步骤                          | 预期结果                                         |
| ------------------------ | --------------------------------------- | --------------------------------- | ------------------------------------------------ |
| 完整巡检流程（后端驱动） | 后端任务队列已启动，任务列表有 3 个任务 | 进入页面 → 接收推送 → 全部完成    | 3 个任务依次执行，前端被动跟随，结果卡片展示正确 |
| WebSocket 实时推送       | 连接正常，后端正在执行任务              | 页面加载 → 收到 TASK_STARTED 推送 | 前端立即飞向对应设备，显示加载提示               |
| 中途进入页面             | 后端已完成 2 个任务，正在执行第 3 个    | 进入页面                          | 前端获取当前任务状态，飞向第 3 个设备            |
| 识别结果展示             | 收到 INSPECTION_RESULT 推送             | 卡片展示 15s                      | 卡片正确显示标题/详情/图片/置信度，15s 后隐藏    |

### 9.2 异常流程测试

| 测试场景       | 模拟条件                     | 操作步骤            | 预期结果                           |
| -------------- | ---------------------------- | ------------------- | ---------------------------------- |
| WebSocket 断连 | 手动断开网络                 | 识别中途断网        | 自动重连，重连后同步状态，继续跟随 |
| 后端任务超时   | 后端某任务卡死 2 分钟        | 等待推送            | 2 分钟后显示警告，继续等待后端推送 |
| 推送消息丢失   | 模拟网络抖动，某条消息未送达 | 定期状态同步（30s） | 检测到不一致，主动同步状态         |
| 任务列表为空   | 返回空数组                   | 进入页面            | 显示空状态，不启动巡检             |
| 中途进入页面   | 后端已完成部分任务           | 退出后再进入        | 加载缓存结果，飞向当前执行任务     |

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

本方案设计了一套**后端驱动**的"任务队列自动执行 → WebSocket 推送 → 前端被动跟随"系统，核心特点：

1. **后端自主执行**：任务队列完全由后端控制，前端无法干预执行顺序或跳过任务
2. **实时推送驱动**：WebSocket 推送 `TASK_STARTED`/`INSPECTION_RESULT`/`TASK_COMPLETED`，前端被动响应
3. **状态同步保障**：定期轮询 + WebSocket 重连，确保状态一致性
4. **高可用性**：自动重连、降级方案（HTTP 轮询）、异常处理
5. **性能优化**：连接复用、结果缓存、状态同步优化

**与传统"前端驱动"方案的区别**：

| 对比项             | 前端驱动（旧方案）                | 后端驱动（本方案）                 |
| ------------------ | --------------------------------- | ---------------------------------- |
| **执行控制**       | 前端决定何时识别哪个设备          | 后端自主执行任务队列               |
| **WebSocket 消息** | 前端发送 `INSPECTION_REQUEST`     | 前端**只接收**推送，无业务消息发送 |
| **3D 场景驱动**    | 前端主动触发飞行 → 到达后请求识别 | 后端推送 → 前端被动飞向设备        |
| **适用场景**       | 交互式巡检（用户点击设备）        | 自动化巡检（任务队列批量执行）     |

**推荐实施步骤**：

1. **Phase 1**（1 周）：实现 HTTP API（`getTaskListWithStatus`），验证数据结构
2. **Phase 2**（2 周）：实现 WebSocket 推送（`TASK_STARTED`/`INSPECTION_RESULT`/`TASK_COMPLETED`），对接前端
3. **Phase 3**（1 周）：完善异常处理（重连、降级、状态同步）
4. **Phase 4**（1 周）：性能优化（缓存、连接复用）、测试、上线

---

**关键设计原则重申**：

✅ **前端职责**：被动接收推送、驱动 3D 场景跟随、展示识别结果  
❌ **前端不做**：主动请求识别、控制任务执行顺序、跳过任务

---

**文档版本**：v2.0（后端驱动模式）  
**编写日期**：2025-01-15  
**维护者**：前端团队
