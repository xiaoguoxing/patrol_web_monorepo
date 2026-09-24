const $ = (id) => document.getElementById(id);
const scene = $('scene');
const layer = $('imageLayer');
const image = $('mapImage');
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
let config = PatrolData.defaults();
let selectedTaskIndex = 0;
let selectedCameraIndex = 0;
let scale = 1;
let tx = 0;
let ty = 0;
let fitScale = 1;
let imageUrl = null;
let saveQueue = Promise.resolve();
let pointer = null;

function cameraById(id) {
  return config.cameras.find((camera) => camera.id === id);
}

function taskTargets() {
  return config.tasks.map((task) => {
    const camera = cameraById(task.cameraId);
    return camera ? { ...task, x: camera.x, y: camera.y, cameraName: camera.name } : null;
  }).filter(Boolean);
}

function setStatus(message, error = false) {
  $('saveStatus').textContent = message;
  $('saveStatus').classList.toggle('is-error', error);
}

function snapshot() {
  return {
    ...config,
    cameras: config.cameras.map((camera) => ({ ...camera })),
    tasks: config.tasks.map((task) => ({ ...task })),
  };
}

function persist() {
  const data = snapshot();
  setStatus('正在保存…');
  saveQueue = saveQueue.catch(() => {}).then(() => PatrolData.save(data));
  return saveQueue.then(() => setStatus('配置已保存'), (error) => {
    console.error('[图片巡检] 保存配置失败', error);
    setStatus('保存失败，请检查浏览器存储权限', true);
    throw error;
  });
}

function setImageSource() {
  if (imageUrl) URL.revokeObjectURL(imageUrl);
  imageUrl = config.imageBlob ? URL.createObjectURL(config.imageBlob) : null;
  image.src = imageUrl || './floor-plan.svg';
}

function applyTransform(animate = true) {
  layer.style.transitionDuration = animate ? '.25s' : '0s';
  layer.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
  $('zoomLabel').textContent = `${Math.round(scale / fitScale * 100)}%`;
}

function fitImage(animate = true) {
  if (!scene.clientWidth || !scene.clientHeight) return;
  fitScale = Math.min(scene.clientWidth / config.imageWidth, scene.clientHeight / config.imageHeight) * .88;
  scale = fitScale;
  tx = (scene.clientWidth - config.imageWidth * scale) / 2;
  ty = (scene.clientHeight - config.imageHeight * scale) / 2;
  applyTransform(animate);
}

function focusCamera(camera) {
  if (!camera) return;
  scale = Math.max(scale, fitScale * 1.35);
  tx = scene.clientWidth / 2 - camera.x * scale;
  ty = scene.clientHeight / 2 - camera.y * scale;
  applyTransform();
}

function zoomAt(clientX, clientY, multiplier) {
  const rect = scene.getBoundingClientRect();
  const px = clientX - rect.left;
  const py = clientY - rect.top;
  const imageX = (px - tx) / scale;
  const imageY = (py - ty) / scale;
  scale = clamp(scale * multiplier, fitScale * .45, Math.max(fitScale * 6, 4));
  tx = px - imageX * scale;
  ty = py - imageY * scale;
  applyTransform();
}

function imageCoordinates(clientX, clientY) {
  const rect = layer.getBoundingClientRect();
  return {
    x: (clientX - rect.left) * config.imageWidth / rect.width,
    y: (clientY - rect.top) * config.imageHeight / rect.height,
  };
}

function renderRoute() {
  const svg = $('routeLayer');
  const targets = taskTargets();
  svg.setAttribute('viewBox', `0 0 ${config.imageWidth} ${config.imageHeight}`);
  svg.replaceChildren();
  if (targets.length < 2) return;
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', PatrolData.routePath(targets, config.imageWidth, config.imageHeight, true));
  path.setAttribute('class', 'route-line');
  svg.append(path);
}

function renderCameras() {
  const container = $('markersLayer');
  container.replaceChildren();
  config.cameras.forEach((camera, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `marker camera-patrol-marker ${index === selectedCameraIndex ? 'is-current' : ''}`;
    button.style.left = `${camera.x}px`;
    button.style.top = `${camera.y}px`;
    button.title = `${camera.name} (${camera.x}, ${camera.y})`;
    button.setAttribute('aria-label', button.title);
    const symbol = document.createElement('span');
    symbol.className = 'camera-symbol';
    symbol.append(document.createElement('i'));
    const sequence = document.createElement('span');
    sequence.className = 'camera-sequence';
    sequence.textContent = String(index + 1).padStart(2, '0');
    const label = document.createElement('span');
    label.className = 'marker-label';
    label.textContent = camera.name;
    button.append(symbol, sequence, label);
    button.addEventListener('pointerdown', (event) => event.stopPropagation());
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      selectCamera(index);
    });
    container.append(button);
  });
}

function renderTasks() {
  const list = $('taskList');
  list.replaceChildren();
  config.tasks.forEach((task, index) => {
    const camera = cameraById(task.cameraId);
    const li = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `task-item ${index === selectedTaskIndex ? 'is-current' : ''}`;
    const number = document.createElement('span');
    number.className = 'task-number';
    number.textContent = String(index + 1).padStart(2, '0');
    const copy = document.createElement('span');
    copy.className = 'task-copy';
    const name = document.createElement('strong');
    name.textContent = task.name;
    const association = document.createElement('small');
    association.textContent = camera ? `${camera.id} · ${camera.name}` : '未关联摄像头';
    copy.append(name, association);
    button.append(number, copy);
    button.addEventListener('click', () => selectTask(index));
    li.append(button);
    list.append(li);
  });
}

function renderTaskEditor() {
  const select = $('taskSelect');
  select.replaceChildren();
  config.tasks.forEach((task, index) => {
    const option = document.createElement('option');
    option.value = String(index);
    option.textContent = `${task.id} · ${task.name}`;
    select.append(option);
  });
  const cameraSelect = $('taskCameraSelect');
  cameraSelect.replaceChildren();
  config.cameras.forEach((camera) => {
    const option = document.createElement('option');
    option.value = camera.id;
    option.textContent = `${camera.id} · ${camera.name}`;
    cameraSelect.append(option);
  });
  const task = config.tasks[selectedTaskIndex];
  select.disabled = !task;
  $('saveTaskButton').disabled = !task;
  $('deleteTaskButton').disabled = !task;
  cameraSelect.disabled = !task || !config.cameras.length;
  select.value = task ? String(selectedTaskIndex) : '';
  $('taskName').value = task?.name || '';
  cameraSelect.value = task?.cameraId || '';
}

function renderCameraEditor() {
  const select = $('cameraSelect');
  select.replaceChildren();
  config.cameras.forEach((camera, index) => {
    const option = document.createElement('option');
    option.value = String(index);
    option.textContent = `${camera.id} · ${camera.name}`;
    select.append(option);
  });
  const camera = config.cameras[selectedCameraIndex];
  $('cameraCount').textContent = String(config.cameras.length);
  select.disabled = !camera;
  $('saveCameraButton').disabled = !camera;
  $('deleteCameraButton').disabled = !camera;
  select.value = camera ? String(selectedCameraIndex) : '';
  $('cameraName').value = camera?.name || '';
  $('cameraX').value = camera?.x ?? '';
  $('cameraY').value = camera?.y ?? '';
  $('cameraX').max = String(config.imageWidth);
  $('cameraY').max = String(config.imageHeight);
}

function render() {
  layer.style.width = `${config.imageWidth}px`;
  layer.style.height = `${config.imageHeight}px`;
  $('imageTitle').textContent = config.imageName;
  $('imageSize').textContent = `${config.imageWidth} × ${config.imageHeight} px`;
  $('taskCount').textContent = String(config.tasks.length);
  renderRoute();
  renderCameras();
  renderTasks();
  renderTaskEditor();
  renderCameraEditor();
}

function selectTask(index) {
  const task = config.tasks[index];
  if (!task) return;
  selectedTaskIndex = index;
  const cameraIndex = config.cameras.findIndex((camera) => camera.id === task.cameraId);
  if (cameraIndex >= 0) selectedCameraIndex = cameraIndex;
  render();
  focusCamera(cameraById(task.cameraId));
}

function selectCamera(index) {
  const camera = config.cameras[index];
  if (!camera) return;
  selectedCameraIndex = index;
  renderCameras();
  renderCameraEditor();
  focusCamera(camera);
}

function addTask() {
  if (!config.cameras.length) {
    window.alert('请先在图片上添加一个摄像头定点');
    return;
  }
  const nextId = Math.max(0, ...config.tasks.map((task) => Number(task.id.slice(5)) || 0)) + 1;
  const camera = config.cameras[selectedCameraIndex] || config.cameras[0];
  config.tasks.push({ id: `TASK-${String(nextId).padStart(2, '0')}`, name: `巡检任务 ${String(nextId).padStart(2, '0')}`, cameraId: camera.id });
  selectedTaskIndex = config.tasks.length - 1;
  render();
  persist().catch(() => {});
  $('taskName').focus();
  $('taskName').select();
}

function addCamera(x, y) {
  const nextId = Math.max(0, ...config.cameras.map((camera) => Number(camera.id.slice(4)) || 0)) + 1;
  const camera = { id: `CAM-${String(nextId).padStart(2, '0')}`, name: `摄像头 ${String(nextId).padStart(2, '0')}`, x: Math.round(x), y: Math.round(y) };
  config.cameras.push(camera);
  selectedCameraIndex = config.cameras.length - 1;
  render();
  focusCamera(camera);
  persist().catch(() => {});
  $('cameraName').focus();
  $('cameraName').select();
}

function commitTaskEditor() {
  const task = config.tasks[selectedTaskIndex];
  if (!task) return true;
  if (!$('taskCameraSelect').value) {
    window.alert('请选择任务关联的摄像头');
    return false;
  }
  task.name = $('taskName').value.trim() || task.id;
  task.cameraId = $('taskCameraSelect').value;
  return true;
}

function commitCameraEditor() {
  const camera = config.cameras[selectedCameraIndex];
  if (!camera) return true;
  const x = Number($('cameraX').value);
  const y = Number($('cameraY').value);
  if ($('cameraX').value === '' || $('cameraY').value === '' || !Number.isFinite(x) || !Number.isFinite(y)) {
    window.alert('请输入有效的摄像头 X、Y 坐标');
    return false;
  }
  camera.name = $('cameraName').value.trim() || camera.id;
  camera.x = Math.round(clamp(x, 0, config.imageWidth));
  camera.y = Math.round(clamp(y, 0, config.imageHeight));
  return true;
}

function commitAndRender() {
  if (!commitTaskEditor() || !commitCameraEditor()) return false;
  render();
  return true;
}

$('taskSelect').addEventListener('change', (event) => selectTask(Number(event.target.value)));
$('cameraSelect').addEventListener('change', (event) => selectCamera(Number(event.target.value)));
$('addTaskButton').addEventListener('click', addTask);
$('addCameraButton').addEventListener('click', () => {
  addCamera(clamp((scene.clientWidth / 2 - tx) / scale, 0, config.imageWidth), clamp((scene.clientHeight / 2 - ty) / scale, 0, config.imageHeight));
});
$('saveTaskButton').addEventListener('click', () => { if (commitAndRender()) persist().catch(() => {}); });
$('saveCameraButton').addEventListener('click', () => { if (commitAndRender()) persist().catch(() => {}); });
$('deleteTaskButton').addEventListener('click', () => {
  if (!config.tasks[selectedTaskIndex]) return;
  config.tasks.splice(selectedTaskIndex, 1);
  selectedTaskIndex = clamp(selectedTaskIndex, 0, Math.max(0, config.tasks.length - 1));
  render();
  persist().catch(() => {});
});
$('deleteCameraButton').addEventListener('click', () => {
  const camera = config.cameras[selectedCameraIndex];
  if (!camera) return;
  const linkedTasks = config.tasks.filter((task) => task.cameraId === camera.id);
  if (linkedTasks.length && config.cameras.length === 1) {
    window.alert('该摄像头仍有关联任务，请先新增其他摄像头或删除相关任务');
    return;
  }
  config.cameras.splice(selectedCameraIndex, 1);
  const replacement = config.cameras[0];
  linkedTasks.forEach((task) => { task.cameraId = replacement?.id || ''; });
  selectedCameraIndex = clamp(selectedCameraIndex, 0, Math.max(0, config.cameras.length - 1));
  render();
  persist().catch(() => {});
});
$('saveAllButton').addEventListener('click', () => { if (commitAndRender()) persist().catch(() => {}); });
$('patrolLink').addEventListener('click', async (event) => {
  event.preventDefault();
  if (!commitAndRender()) return;
  try {
    await persist();
    window.location.href = './index.html';
  } catch {
    window.alert('配置未保存成功，无法带入巡检页。请检查浏览器存储权限。');
  }
});
$('resetButton').addEventListener('click', () => {
  config = PatrolData.defaults();
  selectedTaskIndex = 0;
  selectedCameraIndex = 0;
  setImageSource();
  render();
  fitImage();
  persist().catch(() => {});
});
$('fitButton').addEventListener('click', () => fitImage());
$('zoomInButton').addEventListener('click', () => {
  const rect = scene.getBoundingClientRect();
  zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, 1.25);
});
$('zoomOutButton').addEventListener('click', () => {
  const rect = scene.getBoundingClientRect();
  zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, .8);
});
scene.addEventListener('wheel', (event) => {
  event.preventDefault();
  zoomAt(event.clientX, event.clientY, event.deltaY < 0 ? 1.13 : 1 / 1.13);
}, { passive: false });
scene.addEventListener('pointerdown', (event) => {
  if (event.button !== 0 || event.target.closest('.marker, .map-zoom-controls, .scene-corner')) return;
  pointer = { x: event.clientX, y: event.clientY, tx, ty, moved: false };
  scene.setPointerCapture(event.pointerId);
  layer.style.transitionDuration = '0s';
});
scene.addEventListener('pointermove', (event) => {
  const coordinates = imageCoordinates(event.clientX, event.clientY);
  $('coordinateHint').textContent = coordinates.x >= 0 && coordinates.x <= config.imageWidth && coordinates.y >= 0 && coordinates.y <= config.imageHeight ? `X: ${Math.round(coordinates.x)}   Y: ${Math.round(coordinates.y)}` : 'X: —   Y: —';
  if (!pointer) return;
  const dx = event.clientX - pointer.x;
  const dy = event.clientY - pointer.y;
  if (Math.hypot(dx, dy) > 4) pointer.moved = true;
  if (pointer.moved) {
    tx = pointer.tx + dx;
    ty = pointer.ty + dy;
    applyTransform(false);
  }
});
scene.addEventListener('pointerup', (event) => {
  if (!pointer) return;
  const moved = pointer.moved;
  pointer = null;
  if (!moved) {
    const coordinates = imageCoordinates(event.clientX, event.clientY);
    if (coordinates.x >= 0 && coordinates.x <= config.imageWidth && coordinates.y >= 0 && coordinates.y <= config.imageHeight) addCamera(coordinates.x, coordinates.y);
  }
});
scene.addEventListener('pointercancel', () => { pointer = null; });
$('imageInput').addEventListener('change', () => {
  const file = $('imageInput').files?.[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    window.alert('请选择图片文件');
    return;
  }
  const url = URL.createObjectURL(file);
  const probe = new Image();
  probe.onload = () => {
    if (!probe.naturalWidth || !probe.naturalHeight) {
      URL.revokeObjectURL(url);
      window.alert('无法读取图片尺寸');
      return;
    }
    config.cameras.forEach((camera) => {
      camera.x = Math.round(camera.x * probe.naturalWidth / config.imageWidth);
      camera.y = Math.round(camera.y * probe.naturalHeight / config.imageHeight);
    });
    config.imageWidth = probe.naturalWidth;
    config.imageHeight = probe.naturalHeight;
    config.imageName = file.name;
    config.imageBlob = file;
    URL.revokeObjectURL(url);
    setImageSource();
    render();
    fitImage(false);
    persist().catch(() => {});
    $('imageInput').value = '';
  };
  probe.onerror = () => { URL.revokeObjectURL(url); window.alert('图片读取失败，请重新选择'); };
  probe.src = url;
});

new ResizeObserver(() => fitImage(false)).observe(scene);
window.addEventListener('beforeunload', () => { if (imageUrl) URL.revokeObjectURL(imageUrl); });
PatrolData.load().then((saved) => {
  config = saved;
  selectedTaskIndex = 0;
  selectedCameraIndex = 0;
  setImageSource();
  render();
  fitImage(false);
  setStatus('配置已加载');
}).catch((error) => {
  console.error('[图片巡检] 读取配置失败', error);
  render();
  fitImage(false);
  setStatus('浏览器存储不可用，当前为临时配置', true);
});
