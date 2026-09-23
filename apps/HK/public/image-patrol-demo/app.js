const $ = (id) => document.getElementById(id);
const el = {
  app: $('app'), scene: $('scene'), layer: $('imageLayer'), image: $('mapImage'),
  markers: $('markersLayer'), cameras: $('camerasLayer'), tasks: $('taskList'), card: $('resultCard'),
  play: $('playButton'), next: $('nextButton'), panel: $('taskPanel'),
};
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const TRANSIT_MS = 1600;
const FLOW_LAP_MS = 1100;
const state = {
  config: PatrolData.defaults(), selectedIndex: 0, currentIndex: -1,
  completed: new Set(), running: false, phase: 'idle', round: 1, generation: 0, lightVersion: 0, timers: [],
  scale: 1, tx: 0, ty: 0, focused: false, imageUrl: null, pointer: null,
};

function cancelTimers() {
  state.generation += 1;
  state.timers.forEach(window.clearTimeout);
  state.timers = [];
  stopLight();
  $('routeActive').setAttribute('d', '');
  $('routeActiveGlow').setAttribute('d', '');
  $('routeLayer').classList.remove('is-recognizing');
}

function stopLight() {
  state.lightVersion += 1;
  $('routeStreak').setAttribute('d', '');
}

function later(callback, ms) {
  state.timers.push(window.setTimeout(callback, ms));
}

function applyTransform(animate = true) {
  el.layer.style.transitionDuration = animate ? '1.55s' : '0s';
  el.layer.style.transform = `translate(${state.tx}px, ${state.ty}px) scale(${state.scale})`;
  updateCardPosition();
}

function coverImage(animate = true) {
  const { imageWidth, imageHeight } = state.config;
  const width = el.scene.clientWidth;
  const height = el.scene.clientHeight;
  if (!width || !height) return;
  state.scale = Math.max(width / imageWidth, height / imageHeight);
  state.tx = (width - imageWidth * state.scale) / 2;
  state.ty = (height - imageHeight * state.scale) / 2;
  state.focused = false;
  applyTransform(animate);
}

function showWholeImage() {
  const { imageWidth, imageHeight } = state.config;
  state.scale = Math.min(el.scene.clientWidth / imageWidth, el.scene.clientHeight / imageHeight) * .9;
  state.tx = (el.scene.clientWidth - imageWidth * state.scale) / 2;
  state.ty = (el.scene.clientHeight - imageHeight * state.scale) / 2;
  state.focused = false;
  applyTransform();
}

function focusPoint(point, animate = true) {
  const width = el.scene.clientWidth;
  const height = el.scene.clientHeight;
  if (!width || !height) return;
  const cover = Math.max(width / state.config.imageWidth, height / state.config.imageHeight);
  state.scale = cover * 1.23;
  state.tx = width * .51 - point.x * state.scale;
  state.ty = height * .51 - point.y * state.scale;
  state.focused = true;
  applyTransform(animate);
}

function zoomAt(clientX, clientY, multiplier) {
  const rect = el.scene.getBoundingClientRect();
  const px = clientX - rect.left;
  const py = clientY - rect.top;
  const imageX = (px - state.tx) / state.scale;
  const imageY = (py - state.ty) / state.scale;
  const fit = Math.min(rect.width / state.config.imageWidth, rect.height / state.config.imageHeight);
  state.scale = clamp(state.scale * multiplier, fit * .5, Math.max(fit * 6, 4));
  state.tx = px - imageX * state.scale;
  state.ty = py - imageY * state.scale;
  state.focused = false;
  applyTransform(false);
}

function updateCardPosition() {
  if (el.card.hidden || state.currentIndex < 0) return;
  const point = state.config.points[state.currentIndex];
  if (!point) return;
  const width = el.scene.clientWidth;
  const height = el.scene.clientHeight;
  const x = state.tx + point.x * state.scale;
  const y = state.ty + point.y * state.scale;
  const cardWidth = Math.min(370, width - 32);
  const cardHeight = el.card.offsetHeight || 360;
  const panelEdge = el.panel.classList.contains('is-collapsed') ? 30 : 328;
  const candidateRight = x + 32;
  const candidateLeft = x - cardWidth - 32;
  const desiredX = candidateRight + cardWidth < width - 16 ? candidateRight : candidateLeft;
  const minX = width - cardWidth - 16 >= panelEdge ? panelEdge : 16;
  el.card.style.setProperty('--card-x', `${clamp(desiredX, minX, Math.max(minX, width - cardWidth - 16))}px`);
  el.card.style.setProperty('--card-y', `${clamp(y - cardHeight / 2, 84, Math.max(84, height - cardHeight - 104))}px`);
}

function pointStatus(index) {
  if (index === state.currentIndex && !state.completed.has(index)) return 'current';
  if (state.completed.has(index)) return 'done';
  return 'pending';
}

function renderRoute() {
  const points = state.config.points;
  const { imageWidth, imageHeight } = state.config;
  $('routeLayer').setAttribute('viewBox', `0 0 ${imageWidth} ${imageHeight}`);
  const full = PatrolData.routePath(points, imageWidth, imageHeight, true);
  $('routeGlow').setAttribute('d', full);
  $('routeBase').setAttribute('d', full);
  const progress = state.currentIndex > 0 ? PatrolData.routePath(points, imageWidth, imageHeight, false, state.currentIndex) : '';
  $('routeProgressGlow').setAttribute('d', progress);
  $('routeProgress').setAttribute('d', progress);
}

function activeCurve(fromIndex, toIndex) {
  const start = state.config.points[fromIndex];
  const end = state.config.points[toIndex];
  if (!start || !end || fromIndex === toIndex) return null;
  const curve = PatrolData.curveSegment(start, end, fromIndex, state.config.imageWidth, state.config.imageHeight);
  const path = `M ${start.x} ${start.y} ${curve.command}`;
  $('routeActive').setAttribute('d', path);
  $('routeActiveGlow').setAttribute('d', path);
  return curve;
}

function animateLight(curve, generation, duration, repeat = false) {
  if (!curve) return;
  const version = ++state.lightVersion;
  const streak = $('routeStreak');
  const began = performance.now();
  function frame(now) {
    if (generation !== state.generation || version !== state.lightVersion || !state.running) return;
    const elapsed = (now - began) / duration;
    const t = repeat ? elapsed % 1 : clamp(elapsed, 0, 1);
    const trailStart = Math.max(0, t - (repeat ? .23 : .16));
    const trail = [];
    for (let i = 0; i <= 6; i += 1) {
      const point = curve.pointAt(trailStart + (t - trailStart) * i / 6);
      trail.push(`${i ? 'L' : 'M'} ${point.x} ${point.y}`);
    }
    streak.setAttribute('d', t < .06 ? '' : trail.join(' '));
    if (repeat || elapsed < 1) requestAnimationFrame(frame);
    else stopLight();
  }
  requestAnimationFrame(frame);
}

function renderMarkers() {
  el.markers.replaceChildren();
  state.config.points.forEach((point, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `marker is-${pointStatus(index)} ${!state.running && index === state.selectedIndex ? 'is-selected' : ''}`;
    button.style.left = `${point.x}px`;
    button.style.top = `${point.y}px`;
    button.title = `${point.name} (${point.x}, ${point.y})`;
    button.setAttribute('aria-label', button.title);
    const ring = document.createElement('span');
    ring.className = 'marker-ring';
    ring.textContent = pointStatus(index) === 'done' ? '✓' : String(index + 1).padStart(2, '0');
    const label = document.createElement('span');
    label.className = 'marker-label';
    label.textContent = point.name;
    button.append(ring, label);
    button.addEventListener('pointerdown', (event) => event.stopPropagation());
    button.addEventListener('click', (event) => { event.stopPropagation(); selectPoint(index); });
    el.markers.append(button);
  });
}

function renderCameras() {
  el.cameras.replaceChildren();
  state.config.cameras.forEach((camera) => {
    const marker = document.createElement('div');
    marker.className = 'camera-marker is-display';
    marker.style.left = `${camera.x}px`;
    marker.style.top = `${camera.y}px`;
    marker.title = `${camera.id} (X: ${camera.x}, Y: ${camera.y})`;
    marker.setAttribute('aria-label', marker.title);
    const symbol = document.createElement('span');
    symbol.className = 'camera-symbol';
    symbol.append(document.createElement('i'));
    const label = document.createElement('span');
    label.className = 'camera-label';
    label.textContent = camera.id;
    marker.append(symbol, label);
    el.cameras.append(marker);
  });
}

function renderTasks() {
  el.tasks.replaceChildren();
  state.config.points.forEach((point, index) => {
    const li = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `task-item is-${pointStatus(index)} ${!state.running && index === state.selectedIndex ? 'is-selected' : ''}`;
    const number = document.createElement('span');
    number.className = 'task-number';
    number.textContent = pointStatus(index) === 'done' ? '✓' : String(index + 1).padStart(2, '0');
    const copy = document.createElement('span');
    copy.className = 'task-copy';
    const name = document.createElement('strong');
    name.textContent = point.name;
    const coordinate = document.createElement('small');
    coordinate.textContent = `X: ${point.x} / Y: ${point.y}`;
    copy.append(name, coordinate);
    const badge = document.createElement('span');
    badge.className = 'task-badge';
    badge.textContent = { done: '已巡检', current: '巡检中', pending: '待巡检' }[pointStatus(index)];
    button.append(number, copy, badge);
    button.addEventListener('click', () => selectPoint(index));
    li.append(button);
    el.tasks.append(li);
  });
  el.tasks.querySelector('.is-current')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

function render() {
  const { imageWidth, imageHeight, imageName, points } = state.config;
  el.layer.style.width = `${imageWidth}px`;
  el.layer.style.height = `${imageHeight}px`;
  $('imageTitle').textContent = imageName;
  $('imageSize').textContent = `${imageWidth} × ${imageHeight} px`;
  $('taskCount').textContent = String(points.length);
  $('progressLabel').textContent = `${state.completed.size} / ${points.length}`;
  $('progressFill').style.width = `${points.length ? state.completed.size / points.length * 100 : 0}%`;
  $('roundLabel').textContent = `第 ${state.round} 轮巡检`;
  const point = points[state.currentIndex];
  $('currentTarget').textContent = point?.name || '等待开始';
  $('currentCoordinate').textContent = point ? `X: ${point.x} / Y: ${point.y}` : 'X: — / Y: —';
  const phaseText = {
    transit: '正在前往下一个点位',
    recognizing: '正在获取识别结果',
    result: `正在巡检 · 第 ${state.round} 轮`,
  };
  $('topStatus').textContent = state.running ? phaseText[state.phase] : state.currentIndex >= 0 ? '巡检已暂停' : '巡检准备就绪';
  el.play.textContent = state.running ? '暂停巡检' : state.currentIndex >= 0 ? '继续巡检' : '开始巡检';
  el.play.disabled = points.length === 0;
  el.next.disabled = points.length === 0;
  renderRoute();
  renderMarkers();
  renderCameras();
  renderTasks();
  updateCardPosition();
}

function selectPoint(index) {
  if (!state.config.points[index]) return;
  state.selectedIndex = index;
  if (state.running) runAt(index);
  else {
    el.card.hidden = true;
    render();
    focusPoint(state.config.points[index]);
  }
}

function formatTime() {
  const date = new Date();
  const pad = (number) => String(number).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function showResultLoading(point) {
  el.card.hidden = false;
  $('resultCode').textContent = point.id;
  $('resultName').textContent = point.name;
  $('resultState').textContent = '识别中';
  $('resultState').classList.add('is-loading');
  $('resultConclusion').textContent = 'AI 识别中…';
  $('resultConclusion').classList.remove('is-warn');
  $('resultHealth').textContent = '--';
  $('resultDetail').textContent = '正在获取识别结果…';
  $('resultDcs').textContent = '暂无数据';
  $('resultTime').textContent = '--';
  updateCardPosition();
}

function showResult(point, index) {
  const warning = index === 3;
  $('resultState').textContent = warning ? '需要关注' : '巡检完成';
  $('resultState').classList.remove('is-loading');
  $('resultConclusion').textContent = warning ? '温度略偏高' : '设备运行正常';
  $('resultConclusion').classList.toggle('is-warn', warning);
  $('resultHealth').textContent = warning ? '86%（关注）' : `${94 + (index % 6)}%（良好）`;
  $('resultDetail').textContent = warning ? '柜体表面温度高于同类设备均值，建议现场复核。' : '运行参数符合预设范围，未发现明显异常。';
  $('resultDcs').textContent = `压力 ${(0.38 + index * .02).toFixed(2)} MPa · 流量 ${280 + index * 13} m³/h`;
  $('resultTime').textContent = formatTime();
  $('snapshotImage').src = `../demoImg/demo${index % 2 + 1}.jpg`;
  updateCardPosition();
}

function runAt(index) {
  const points = state.config.points;
  if (!points[index]) return;
  const previous = state.currentIndex;
  cancelTimers();
  if (index === 0 && state.completed.size === points.length) {
    state.completed.clear();
    state.round += 1;
  }
  state.running = true;
  state.phase = 'transit';
  state.currentIndex = index;
  state.selectedIndex = index;
  state.completed.delete(index);
  el.card.hidden = true;
  render();
  focusPoint(points[index]);
  const generation = state.generation;
  const curve = previous >= 0 && (previous + 1) % points.length === index ? activeCurve(previous, index) : null;
  animateLight(curve, generation, TRANSIT_MS - 50);
  later(() => {
    if (!state.running || generation !== state.generation) return;
    state.phase = 'recognizing';
    $('routeLayer').classList.toggle('is-recognizing', !!curve);
    render();
    showResultLoading(points[index]);
    animateLight(curve, generation, FLOW_LAP_MS, true);
    later(() => {
      if (!state.running || generation !== state.generation) return;
      $('routeLayer').classList.remove('is-recognizing');
      $('routeActive').setAttribute('d', '');
      $('routeActiveGlow').setAttribute('d', '');
      stopLight();
      state.phase = 'result';
      showResult(points[index], index);
      render();
      later(() => {
        if (!state.running || generation !== state.generation) return;
        state.completed.add(index);
        render();
        runAt((index + 1) % points.length);
      }, 4800);
    }, 1200);
  }, TRANSIT_MS);
}

function pause() {
  cancelTimers();
  state.running = false;
  state.phase = 'paused';
  if ($('resultState').classList.contains('is-loading')) el.card.hidden = true;
  render();
}

el.play.addEventListener('click', () => { if (state.running) pause(); else runAt(state.selectedIndex); });
el.next.addEventListener('click', () => {
  if (state.currentIndex >= 0) state.completed.add(state.currentIndex);
  runAt((state.currentIndex + 1) % state.config.points.length);
});
$('resetButton').addEventListener('click', () => {
  pause();
  state.currentIndex = -1;
  state.phase = 'idle';
  state.selectedIndex = 0;
  state.completed.clear();
  state.round = 1;
  el.card.hidden = true;
  render();
  coverImage();
});
$('toggleTasksButton').addEventListener('click', () => {
  const collapsed = el.panel.classList.toggle('is-collapsed');
  $('toggleTasksButton').textContent = collapsed ? '展开 ›' : '收起 ‹';
  $('toggleTasksButton').setAttribute('aria-expanded', String(!collapsed));
  updateCardPosition();
});
$('fitButton').addEventListener('click', showWholeImage);
$('zoomInButton').addEventListener('click', () => {
  const rect = el.scene.getBoundingClientRect();
  zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, 1.25);
});
$('zoomOutButton').addEventListener('click', () => {
  const rect = el.scene.getBoundingClientRect();
  zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, .8);
});
$('fullscreenButton').addEventListener('click', async () => {
  if (document.fullscreenElement) await document.exitFullscreen();
  else await el.app.requestFullscreen();
});
document.addEventListener('fullscreenchange', () => { $('fullscreenButton').textContent = document.fullscreenElement ? '退出全屏' : '全屏'; });
el.scene.addEventListener('wheel', (event) => {
  if (event.target.closest('.map-topbar, .map-tools, .floating-tasks, .result-card, .floating-controls')) return;
  event.preventDefault();
  zoomAt(event.clientX, event.clientY, event.deltaY < 0 ? 1.13 : 1 / 1.13);
}, { passive: false });
el.scene.addEventListener('pointerdown', (event) => {
  if (event.button !== 0 || event.target.closest('.marker, .camera-marker, .map-topbar, .floating-tasks, .map-tools, .floating-controls, .result-card')) return;
  state.pointer = { x: event.clientX, y: event.clientY, tx: state.tx, ty: state.ty };
  el.scene.setPointerCapture(event.pointerId);
  el.layer.style.transitionDuration = '0s';
});
el.scene.addEventListener('pointermove', (event) => {
  const rect = el.layer.getBoundingClientRect();
  const x = Math.round((event.clientX - rect.left) * state.config.imageWidth / rect.width);
  const y = Math.round((event.clientY - rect.top) * state.config.imageHeight / rect.height);
  $('coordinateHint').textContent = x >= 0 && x <= state.config.imageWidth && y >= 0 && y <= state.config.imageHeight ? `X: ${x}   Y: ${y}` : 'X: —   Y: —';
  if (!state.pointer) return;
  state.tx = state.pointer.tx + event.clientX - state.pointer.x;
  state.ty = state.pointer.ty + event.clientY - state.pointer.y;
  state.focused = false;
  applyTransform(false);
});
el.scene.addEventListener('pointerup', () => { state.pointer = null; });
el.scene.addEventListener('pointercancel', () => { state.pointer = null; });

new ResizeObserver(() => {
  const focus = state.config.points[state.currentIndex >= 0 ? state.currentIndex : state.selectedIndex];
  if (state.focused && focus) focusPoint(focus, false);
  else coverImage(false);
}).observe(el.scene);
window.addEventListener('beforeunload', () => { if (state.imageUrl) URL.revokeObjectURL(state.imageUrl); });
PatrolData.load().then((config) => {
  state.config = config;
  if (state.imageUrl) URL.revokeObjectURL(state.imageUrl);
  state.imageUrl = config.imageBlob ? URL.createObjectURL(config.imageBlob) : null;
  el.image.src = state.imageUrl || './floor-plan.svg';
  render();
  coverImage(false);
}).catch((error) => {
  console.error('[图片巡检] 读取配置失败', error);
  render();
  coverImage(false);
  $('topStatus').textContent = '使用示例配置 · 浏览器存储不可用';
});
