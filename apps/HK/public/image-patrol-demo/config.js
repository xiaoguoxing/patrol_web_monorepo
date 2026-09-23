const $ = (id) => document.getElementById(id);
const scene = $('scene');
const layer = $('imageLayer');
const image = $('mapImage');
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
let config = PatrolData.defaults();
let selectedIndex = 0;
let selectedCameraIndex = 0;
let scale = 1;
let tx = 0;
let ty = 0;
let fitScale = 1;
let imageUrl = null;
let saveQueue = Promise.resolve();
let pointer = null;

function setStatus(message, error = false) {
  $('saveStatus').textContent = message;
  $('saveStatus').classList.toggle('is-error', error);
}

function snapshot() {
  return {
    ...config,
    points: config.points.map((point) => ({ ...point })),
    cameras: config.cameras.map((camera) => ({ ...camera })),
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

function focusPoint(point) {
  scale = Math.max(scale, fitScale * 1.35);
  tx = scene.clientWidth / 2 - point.x * scale;
  ty = scene.clientHeight / 2 - point.y * scale;
  applyTransform();
}

function imageCoordinates(clientX, clientY) {
  // getBoundingClientRect 采用动画中的实际尺寸，放大缩小时仍能准确取点。
  const rect = layer.getBoundingClientRect();
  return {
    x: (clientX - rect.left) * config.imageWidth / rect.width,
    y: (clientY - rect.top) * config.imageHeight / rect.height,
  };
}

function renderRoute() {
  const svg = $('routeLayer');
  svg.setAttribute('viewBox', `0 0 ${config.imageWidth} ${config.imageHeight}`);
  svg.replaceChildren();
  if (config.points.length < 2) return;
  const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  line.setAttribute('d', PatrolData.routePath(config.points, config.imageWidth, config.imageHeight, true));
  line.setAttribute('class', 'route-line');
  svg.append(line);
}

function renderMarkers() {
  const container = $('markersLayer');
  container.replaceChildren();
  config.points.forEach((point, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `marker ${index === selectedIndex ? 'is-current' : ''}`;
    button.style.left = `${point.x}px`;
    button.style.top = `${point.y}px`;
    button.title = `${point.name} (${point.x}, ${point.y})`;
    button.setAttribute('aria-label', button.title);
    const ring = document.createElement('span');
    ring.className = 'marker-ring';
    ring.textContent = String(index + 1).padStart(2, '0');
    const label = document.createElement('span');
    label.className = 'marker-label';
    label.textContent = point.name;
    button.append(ring, label);
    button.addEventListener('pointerdown', (event) => event.stopPropagation());
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      selectPoint(index);
    });
    container.append(button);
  });
}

function renderCameras() {
  const container = $('camerasLayer');
  container.replaceChildren();
  config.cameras.forEach((camera, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `camera-marker ${index === selectedCameraIndex ? 'is-selected' : ''}`;
    button.style.left = `${camera.x}px`;
    button.style.top = `${camera.y}px`;
    button.title = `${camera.id} (X: ${camera.x}, Y: ${camera.y})`;
    button.setAttribute('aria-label', button.title);
    button.innerHTML = '<span class="camera-symbol"><i></i></span>';
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
  config.points.forEach((point, index) => {
    const li = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `task-item ${index === selectedIndex ? 'is-current' : ''}`;
    const number = document.createElement('span');
    number.className = 'task-number';
    number.textContent = String(index + 1).padStart(2, '0');
    const copy = document.createElement('span');
    copy.className = 'task-copy';
    const name = document.createElement('strong');
    name.textContent = point.name;
    const coordinate = document.createElement('small');
    coordinate.textContent = `X: ${point.x} / Y: ${point.y}`;
    copy.append(name, coordinate);
    button.append(number, copy);
    button.addEventListener('click', () => selectPoint(index));
    li.append(button);
    list.append(li);
  });
}

function renderEditor() {
  const select = $('pointSelect');
  select.replaceChildren();
  config.points.forEach((point, index) => {
    const option = document.createElement('option');
    option.value = String(index);
    option.textContent = `${point.id} · ${point.name}`;
    select.append(option);
  });
  const point = config.points[selectedIndex];
  select.disabled = !point;
  $('savePointButton').disabled = !point;
  $('deletePointButton').disabled = !point;
  select.value = point ? String(selectedIndex) : '';
  $('pointName').value = point?.name || '';
  $('pointX').value = point?.x ?? '';
  $('pointY').value = point?.y ?? '';
  $('pointX').max = String(config.imageWidth);
  $('pointY').max = String(config.imageHeight);
}

function renderCameraEditor() {
  const select = $('cameraSelect');
  select.replaceChildren();
  config.cameras.forEach((camera, index) => {
    const option = document.createElement('option');
    option.value = String(index);
    option.textContent = `${camera.id} · X ${camera.x} / Y ${camera.y}`;
    select.append(option);
  });
  const camera = config.cameras[selectedCameraIndex];
  $('cameraCount').textContent = String(config.cameras.length);
  select.disabled = !camera;
  $('saveCameraButton').disabled = !camera;
  $('deleteCameraButton').disabled = !camera;
  select.value = camera ? String(selectedCameraIndex) : '';
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
  $('taskCount').textContent = String(config.points.length);
  renderRoute();
  renderMarkers();
  renderCameras();
  renderTasks();
  renderEditor();
  renderCameraEditor();
}

function selectPoint(index) {
  if (!config.points[index]) return;
  selectedIndex = index;
  render();
  focusPoint(config.points[index]);
}

function selectCamera(index) {
  if (!config.cameras[index]) return;
  selectedCameraIndex = index;
  renderCameras();
  renderCameraEditor();
  focusPoint(config.cameras[index]);
}

function addPoint(x, y) {
  const nextId = Math.max(0, ...config.points.map((point) => Number(point.id.slice(2)) || 0)) + 1;
  const point = { id: `P-${String(nextId).padStart(2, '0')}`, name: `新巡检点位 ${nextId}`, x: Math.round(x), y: Math.round(y) };
  config.points.push(point);
  selectedIndex = config.points.length - 1;
  render();
  persist().catch(() => {});
  $('pointName').focus();
  $('pointName').select();
}

function commitEditor() {
  const point = config.points[selectedIndex];
  if (!point) return true;
  const x = Number($('pointX').value);
  const y = Number($('pointY').value);
  if ($('pointX').value === '' || $('pointY').value === '' || !Number.isFinite(x) || !Number.isFinite(y)) {
    window.alert('请输入有效的 X、Y 坐标');
    return false;
  }
  point.name = $('pointName').value.trim() || point.id;
  point.x = Math.round(clamp(x, 0, config.imageWidth));
  point.y = Math.round(clamp(y, 0, config.imageHeight));
  renderRoute();
  renderMarkers();
  renderTasks();
  renderEditor();
  focusPoint(point);
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
  camera.x = Math.round(clamp(x, 0, config.imageWidth));
  camera.y = Math.round(clamp(y, 0, config.imageHeight));
  renderCameras();
  renderCameraEditor();
  focusPoint(camera);
  return true;
}

$('pointSelect').addEventListener('change', (event) => selectPoint(Number(event.target.value)));
$('cameraSelect').addEventListener('change', (event) => selectCamera(Number(event.target.value)));
$('addPointButton').addEventListener('click', () => {
  const x = clamp((scene.clientWidth / 2 - tx) / scale, 0, config.imageWidth);
  const y = clamp((scene.clientHeight / 2 - ty) / scale, 0, config.imageHeight);
  addPoint(x, y);
});
$('savePointButton').addEventListener('click', () => {
  if (commitEditor()) persist().catch(() => {});
});
$('deletePointButton').addEventListener('click', () => {
  if (!config.points[selectedIndex]) return;
  config.points.splice(selectedIndex, 1);
  selectedIndex = clamp(selectedIndex, 0, Math.max(0, config.points.length - 1));
  render();
  persist().catch(() => {});
});
$('addCameraButton').addEventListener('click', () => {
  const nextId = Math.max(0, ...config.cameras.map((camera) => Number(camera.id.slice(4)) || 0)) + 1;
  const camera = {
    id: `CAM-${String(nextId).padStart(2, '0')}`,
    x: Math.round(clamp((scene.clientWidth / 2 - tx) / scale, 0, config.imageWidth)),
    y: Math.round(clamp((scene.clientHeight / 2 - ty) / scale, 0, config.imageHeight)),
  };
  config.cameras.push(camera);
  selectedCameraIndex = config.cameras.length - 1;
  render();
  focusPoint(camera);
  persist().catch(() => {});
});
$('saveCameraButton').addEventListener('click', () => {
  if (commitCameraEditor()) persist().catch(() => {});
});
$('deleteCameraButton').addEventListener('click', () => {
  if (!config.cameras[selectedCameraIndex]) return;
  config.cameras.splice(selectedCameraIndex, 1);
  selectedCameraIndex = clamp(selectedCameraIndex, 0, Math.max(0, config.cameras.length - 1));
  render();
  persist().catch(() => {});
});
$('saveAllButton').addEventListener('click', () => {
  if (commitEditor() && commitCameraEditor()) persist().catch(() => {});
});
$('patrolLink').addEventListener('click', async (event) => {
  event.preventDefault();
  if (!commitEditor() || !commitCameraEditor()) return;
  try {
    await persist();
    window.location.href = './index.html';
  } catch {
    window.alert('配置未保存成功，无法带入巡检页。请检查浏览器存储权限。');
  }
});
$('resetButton').addEventListener('click', () => {
  config = PatrolData.defaults();
  selectedIndex = 0;
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
  if (event.button !== 0 || event.target.closest('.marker, .camera-marker, .map-zoom-controls, .scene-corner')) return;
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
    if (coordinates.x >= 0 && coordinates.x <= config.imageWidth && coordinates.y >= 0 && coordinates.y <= config.imageHeight) addPoint(coordinates.x, coordinates.y);
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
    config.points.forEach((point) => {
      point.x = Math.round(point.x * probe.naturalWidth / config.imageWidth);
      point.y = Math.round(point.y * probe.naturalHeight / config.imageHeight);
    });
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
  selectedIndex = 0;
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
