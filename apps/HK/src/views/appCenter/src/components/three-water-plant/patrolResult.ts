/**
 * 巡检任务结果数据源。
 *
 * 当前为本地模拟实现：延迟返回确定性假数据（同一设备结果稳定）。
 *
 * 【后续接入后端】只需替换 requestPatrolResult 的实现，调用方（threeRectangle.vue）不感知：
 *   - 建立 WebSocket 连接，按 taskId 订阅识别结果
 *   - 服务端推送 { taskId, image, title, detail, confidence } 时 resolve
 *   - 收到新 id（见 BIMdetail.vue 的 query id）可作为 taskId 来源
 */

export interface PatrolResultPayload {
  /** 任务 id（巡检点位模型 id） */
  taskId: string;
  /** 识别结果状态 */
  status: 'success' | 'error';
  /** 识别快照图片（data URL 或 http URL） */
  image: string;
  /** 识别结论标题，如"设备运行正常" */
  title: string;
  /** 识别详情 */
  detail: string;
  /** 置信度 0~1 */
  confidence: number;
}

interface ResultTemplate {
  title: string;
  detail: string;
  confidence: number;
}

const RESULT_TEMPLATES: ResultTemplate[] = [
  { title: '设备运行正常', detail: '振动幅值处于正常范围，无异常温升。', confidence: 0.97 },
  { title: '设备运行正常', detail: '电流值符合额定参数。', confidence: 0.94 },
  { title: '温度略偏高', detail: '表面温度略高于同类设备均值，请安排现场复核。', confidence: 0.88 },
  { title: '压力正常', detail: '进出口压力差在允许范围内。', confidence: 0.96 },
  { title: '无异常渗漏', detail: '管口及法兰连接处无渗漏迹象。', confidence: 0.93 },
];

/** 根据 taskId 生成稳定的模拟结果（同一设备重复巡检结果一致） */
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
    // 模拟后端 AI 识别耗时（1.5s ~ 3s）
    const delay = 1500 + Math.random() * 1500;
    const timer = window.setTimeout(() => {
      const hash = [...taskId].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
      const template = RESULT_TEMPLATES[hash % RESULT_TEMPLATES.length];
      const url = new URL(`/demoImg/demo${Math.random() < 0.5 ? 1 : 2}.jpg`, window.location.href).href;
      resolve({
        taskId,
        status: 'success',
        image: url || buildSnapshotImage(displayName || taskId, template.title),
        title: template.title,
        detail: template.detail,
        confidence: template.confidence,
      });
    }, delay);
    signal?.addEventListener('abort', () => {
      window.clearTimeout(timer);
      reject(new Error('aborted'));
    });
  });
}

/** 生成一张模拟的"AI 识别快照"占位图（SVG data URL，含设备编号） */
function buildSnapshotImage(taskId: string, title: string) {
  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180">',
    '<defs>',
    '<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">',
    '<stop offset="0" stop-color="#071a33"/>',
    '<stop offset="1" stop-color="#0d2b4a"/>',
    '</linearGradient>',
    '</defs>',
    '<rect width="320" height="180" fill="url(#bg)"/>',
    '<g stroke="#123a5e" stroke-width="1">',
    '<path d="M0 30H320M0 60H320M0 90H320M0 120H320M0 150H320"/>',
    '<path d="M40 0V180M80 0V180M120 0V180M160 0V180M200 0V180M240 0V180M280 0V180"/>',
    '</g>',
    '<rect x="98" y="55" width="124" height="70" rx="6" fill="#0f4c81" stroke="#00d4ff" stroke-width="2"/>',
    '<rect x="112" y="70" width="42" height="16" rx="3" fill="#123f66" stroke="#2ee6a8" stroke-width="1.5"/>',
    '<rect x="162" y="70" width="42" height="16" rx="3" fill="#123f66" stroke="#2ee6a8" stroke-width="1.5"/>',
    '<circle cx="122" cy="102" r="8" fill="none" stroke="#2ee6a8" stroke-width="1.5"/>',
    '<circle cx="196" cy="102" r="8" fill="none" stroke="#2ee6a8" stroke-width="1.5"/>',
    '<rect x="120" y="125" width="80" height="6" rx="3" fill="#0d3557"/>',
    '<rect x="78" y="38" width="164" height="104" fill="none" stroke="#00d4ff" stroke-width="1.5" stroke-dasharray="6 4" opacity="0.85"/>',
    '<text x="86" y="28" fill="#7fd8ff" font-family="sans-serif" font-size="13">AI 识别快照</text>',
    `<text x="160" y="174" fill="#9fd8ff" font-family="sans-serif" font-size="12" text-anchor="middle">${taskId}</text>`,
    '</svg>',
  ].join('');
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
