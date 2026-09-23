// 两个独立 HTML 共用的示例配置。图片 Blob 存在 IndexedDB，避免大图超过 localStorage 配额。
(function () {
  const DATABASE = 'image-patrol-demo';
  const STORE = 'config';
  const KEY = 'current';
  const DEFAULT_POINTS = [
    { id: 'P-01', name: '进水池液位检测', x: 225, y: 264 },
    { id: 'P-02', name: '一号主泵运行检查', x: 663, y: 266 },
    { id: 'P-03', name: '二号主泵运行检查', x: 835, y: 266 },
    { id: 'P-04', name: '高压配电柜检查', x: 1292, y: 265 },
    { id: 'P-05', name: '加药罐液位检查', x: 249, y: 650 },
    { id: 'P-06', name: '阀门廊道检查', x: 809, y: 649 },
    { id: 'P-07', name: '出水水质监测', x: 1345, y: 649 },
  ];
  // 示例摄像头：仅包含编号与图片原始像素坐标，不参与巡检路线。
  const DEFAULT_CAMERAS = [
    { id: 'CAM-01', x: 173, y: 151 },
    { id: 'CAM-02', x: 746, y: 176 },
    { id: 'CAM-03', x: 1412, y: 354 },
    { id: 'CAM-04', x: 1018, y: 721 },
    { id: 'CAM-05', x: 421, y: 746 },
  ];

  function defaults() {
    return {
      imageWidth: 1600,
      imageHeight: 900,
      imageName: '泵房平面图',
      imageBlob: null,
      points: DEFAULT_POINTS.map((point) => ({ ...point })),
      cameras: DEFAULT_CAMERAS.map((camera) => ({ ...camera })),
    };
  }

  function normalize(config) {
    const fallback = defaults();
    return {
      ...fallback,
      ...config,
      points: Array.isArray(config?.points) ? config.points : fallback.points,
      // 兼容此前已经保存但没有 cameras 字段的配置。
      cameras: Array.isArray(config?.cameras) ? config.cameras : fallback.cameras,
    };
  }

  // 所有页面共用同一段三次贝塞尔曲线，保证配置预览与巡检流光严格重合。
  function curveSegment(start, end, index, width, height) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.hypot(dx, dy);
    const bend = Math.min(90, length * .15) * (index % 2 === 0 ? 1 : -1);
    const nx = length ? -dy / length : 0;
    const ny = length ? dx / length : 0;
    const x1 = Math.max(0, Math.min(width, start.x + dx / 3 + nx * bend));
    const y1 = Math.max(0, Math.min(height, start.y + dy / 3 + ny * bend));
    const x2 = Math.max(0, Math.min(width, start.x + dx * 2 / 3 + nx * bend));
    const y2 = Math.max(0, Math.min(height, start.y + dy * 2 / 3 + ny * bend));
    return {
      command: `C ${x1} ${y1} ${x2} ${y2} ${end.x} ${end.y}`,
      pointAt(t) {
        const u = 1 - t;
        return {
          x: u ** 3 * start.x + 3 * u ** 2 * t * x1 + 3 * u * t ** 2 * x2 + t ** 3 * end.x,
          y: u ** 3 * start.y + 3 * u ** 2 * t * y1 + 3 * u * t ** 2 * y2 + t ** 3 * end.y,
        };
      },
    };
  }

  function routePath(points, width, height, close = false, until = points.length - 1) {
    if (points.length < 2) return '';
    const count = close ? points.length : Math.min(until, points.length - 1);
    const commands = [`M ${points[0].x} ${points[0].y}`];
    for (let index = 0; index < count; index += 1) {
      commands.push(curveSegment(points[index], points[(index + 1) % points.length], index, width, height).command);
    }
    return commands.join(' ');
  }

  function openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DATABASE, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(STORE);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('配置存储不可用'));
    });
  }

  async function load() {
    const db = await openDatabase();
    try {
      return await new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE, 'readonly');
        const request = transaction.objectStore(STORE).get(KEY);
        request.onsuccess = () => resolve(normalize(request.result));
        request.onerror = () => reject(request.error || new Error('读取配置失败'));
      });
    } finally {
      db.close();
    }
  }

  async function save(config) {
    const db = await openDatabase();
    try {
      await new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE, 'readwrite');
        transaction.objectStore(STORE).put(config, KEY);
        transaction.oncomplete = resolve;
        transaction.onerror = () => reject(transaction.error || new Error('保存配置失败'));
        transaction.onabort = () => reject(transaction.error || new Error('保存配置中止'));
      });
    } finally {
      db.close();
    }
  }

  window.PatrolData = { defaults, normalize, load, save, curveSegment, routePath };
})();
