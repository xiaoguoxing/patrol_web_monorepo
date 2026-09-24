// 两个独立 HTML 共用的示例配置。图片 Blob 存在 IndexedDB，避免大图超过 localStorage 配额。
(function () {
  const DATABASE = 'image-patrol-demo';
  const STORE = 'config';
  const KEY = 'current';
  // 摄像头只负责提供地图坐标；巡检任务通过 cameraId 关联摄像头。
  const DEFAULT_CAMERAS = [
    { id: 'CAM-01', name: '北侧入口摄像头', x: 173, y: 151 },
    { id: 'CAM-02', name: '主泵房摄像头', x: 746, y: 176 },
    { id: 'CAM-03', name: '配电间摄像头', x: 1412, y: 354 },
    { id: 'CAM-04', name: '出水区摄像头', x: 1018, y: 721 },
    { id: 'CAM-05', name: '加药间摄像头', x: 421, y: 746 },
  ];
  const DEFAULT_TASKS = [
    { id: 'TASK-01', name: '北侧入口环境巡检', cameraId: 'CAM-01' },
    { id: 'TASK-02', name: '一号主泵运行巡检', cameraId: 'CAM-02' },
    { id: 'TASK-03', name: '二号主泵运行巡检', cameraId: 'CAM-02' },
    { id: 'TASK-04', name: '配电柜温度巡检', cameraId: 'CAM-03' },
    { id: 'TASK-05', name: '出水水质仪表巡检', cameraId: 'CAM-04' },
    { id: 'TASK-06', name: '加药罐液位巡检', cameraId: 'CAM-05' },
    { id: 'TASK-07', name: '加药间泄漏巡检', cameraId: 'CAM-05' },
  ];

  function defaults() {
    return {
      schemaVersion: 3,
      imageWidth: 1600,
      imageHeight: 900,
      imageName: '泵房平面图',
      imageBlob: null,
      cameras: DEFAULT_CAMERAS.map((camera) => ({ ...camera })),
      tasks: DEFAULT_TASKS.map((task) => ({ ...task })),
    };
  }

  function normalize(config) {
    const fallback = defaults();
    const source = config || {};
    if (source.schemaVersion === 3 && Array.isArray(source.cameras) && Array.isArray(source.tasks)) {
      return { ...fallback, ...source, schemaVersion: 3, cameras: source.cameras, tasks: source.tasks };
    }

    // v2 曾把摄像头与巡检任务合为一组 points；迁移成一对一关联。
    if (source.schemaVersion === 2 && Array.isArray(source.points)) {
      const cameras = source.points.map((point, index) => ({
        id: point.id?.startsWith('CAM-') ? point.id : `CAM-${String(index + 1).padStart(2, '0')}`,
        name: point.name?.includes('摄像头') ? point.name : `摄像头 ${String(index + 1).padStart(2, '0')}`,
        x: point.x,
        y: point.y,
      }));
      const tasks = source.points.map((point, index) => ({
        id: `TASK-${String(index + 1).padStart(2, '0')}`,
        name: point.name || `巡检任务 ${String(index + 1).padStart(2, '0')}`,
        cameraId: cameras[index].id,
      }));
      const rest = { ...source };
      delete rest.points;
      return { ...fallback, ...rest, schemaVersion: 3, cameras, tasks };
    }

    // v1 有独立摄像头和旧巡检点，任务自动关联最近的摄像头。
    if (Array.isArray(source.cameras) && source.cameras.length) {
      const cameras = source.cameras.map((camera, index) => ({
        ...camera,
        id: camera.id || `CAM-${String(index + 1).padStart(2, '0')}`,
        name: camera.name || `摄像头 ${String(index + 1).padStart(2, '0')}`,
      }));
      const tasks = (source.points || []).map((point, index) => {
        const camera = cameras.reduce((nearest, candidate) => {
          const distance = (candidate.x - point.x) ** 2 + (candidate.y - point.y) ** 2;
          return !nearest || distance < nearest.distance ? { camera: candidate, distance } : nearest;
        }, null)?.camera || cameras[0];
        return { id: `TASK-${String(index + 1).padStart(2, '0')}`, name: point.name || `巡检任务 ${index + 1}`, cameraId: camera.id };
      });
      const rest = { ...source };
      delete rest.points;
      return { ...fallback, ...rest, schemaVersion: 3, cameras, tasks: tasks.length ? tasks : fallback.tasks };
    }

    return {
      ...fallback,
      ...source,
      schemaVersion: 3,
      cameras: fallback.cameras,
      tasks: fallback.tasks,
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
