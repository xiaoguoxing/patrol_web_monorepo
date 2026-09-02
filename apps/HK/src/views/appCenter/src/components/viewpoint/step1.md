问：目前保存角度的功能要先做，如果我在配置巡检对象的时候顺便配置了，我要怎么保存角度，能和巡视时的角度一样，我想着在配置巡检对象的时候弹出模型，手动调到位置角度，然后保存，然后巡视的调出角度位置
答：
这个需求非常清晰，核心就是**"视角的保存与恢复"**。在 Three.js + OrbitControls 的场景下，只需要保存两个三维向量：`camera.position` 和 `controls.target`。

以下是完整的落地方案：

---

## 一、数据结构：视角到底存什么

```json
{
  "deviceId": "AHU-01",
  "viewpoint": {
    "position": [12.5, 8.0, 15.3],
    "target": [10.0, 2.0, 12.0],
    "fov": 45,
    "distance": 7.2
  }
}
```

| 字段       | 说明                                 | 必要性   |
| ---------- | ------------------------------------ | -------- |
| `position` | 相机所在位置                         | **必须** |
| `target`   | 相机看向哪里（OrbitControls.target） | **必须** |
| `fov`      | 视野角度，默认 45                    | 可选     |
| `distance` | 相机到 target 的距离（辅助校验）     | 可选     |

> **关键点**：只存 `position` 不够，必须同时存 `target`，否则恢复后相机位置对了，但看向的方向完全不对。

---

## 二、配置页面：手动调角度 + 保存

### 页面结构

```
┌─────────────────────────────────────────┐
│  [返回]  配置巡检对象：AHU-01            │
├─────────────────────────────────────────┤
│                                         │
│         [Three.js 模型画布]              │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  操作提示：滚轮缩放，左键旋转，   │    │
│  │  右键平移。调好角度后点击保存。   │    │
│  └─────────────────────────────────┘    │
├─────────────────────────────────────────┤
│  [重置视角]  [预览保存效果]  [保存视角]  │
└─────────────────────────────────────────┘
```

### 核心代码：获取当前视角

```javascript
// 假设你的 OrbitControls 实例叫 controls，camera 是 PerspectiveCamera

function getCurrentViewpoint() {
  const position = camera.position.toArray(); // [x, y, z]
  const target = controls.target.toArray(); // [x, y, z]
  const distance = camera.position.distanceTo(controls.target);

  return {
    position: position.map((v) => parseFloat(v.toFixed(3))), // 保留3位小数
    target: target.map((v) => parseFloat(v.toFixed(3))),
    fov: camera.fov,
    distance: parseFloat(distance.toFixed(3)),
  };
}

// 保存按钮点击
function onSaveViewpoint() {
  const vp = getCurrentViewpoint();

  // 发到后端，和当前 deviceId 绑定
  api
    .saveDeviceViewpoint({
      deviceId: currentDeviceId,
      viewpoint: vp,
    })
    .then(() => {
      alert('视角保存成功');
    });
}
```

### 辅助功能：自动定位到设备附近（减少手动调整量）

用户手动调角度太麻烦，先自动飞到一个**默认机位**，用户再微调：

```javascript
function autoFocusDevice(mesh) {
  // 计算设备包围盒中心
  const box = new THREE.Box3().setFromObject(mesh);
  const center = box.getCenter(new THREE.Vector3());

  // 默认：右前方45度，距离=最大边长×2.5
  const size = box.getSize(new THREE.Vector3());
  const distance = Math.max(size.x, size.y, size.z) * 2.5;

  const offset = new THREE.Vector3(1, 0.6, 1).normalize().multiplyScalar(distance);
  const defaultPos = center.clone().add(offset);

  // 直接设置（无动画），让用户在此基础上微调
  camera.position.copy(defaultPos);
  controls.target.copy(center);
  controls.update();
}
```

---

## 三、巡检页面：恢复保存的视角

### 核心代码：加载视角并飞行

```javascript
import gsap from 'gsap';

function flyToSavedViewpoint(viewpoint) {
  const { position, target } = viewpoint;

  // 当前值
  const startPos = camera.position.clone();
  const startTarget = controls.target.clone();
  const endPos = new THREE.Vector3(...position);
  const endTarget = new THREE.Vector3(...target);

  // 动画对象
  const animObj = {
    px: startPos.x,
    py: startPos.y,
    pz: startPos.z,
    tx: startTarget.x,
    ty: startTarget.y,
    tz: startTarget.z,
  };

  gsap.to(animObj, {
    px: endPos.x,
    py: endPos.y,
    pz: endPos.z,
    tx: endTarget.x,
    ty: endTarget.y,
    tz: endTarget.z,
    duration: 1.0,
    ease: 'power2.inOut',
    onUpdate: () => {
      camera.position.set(animObj.px, animObj.py, animObj.pz);
      controls.target.set(animObj.tx, animObj.ty, animObj.tz);
      controls.update(); // 必须调用，否则OrbitControls不会生效
    },
  });
}

// 巡检时调用
async function inspectDevice(deviceId) {
  // 1. 从后端获取该设备的视角配置
  const device = await api.getDevice(deviceId);

  // 2. 飞到保存的视角
  if (device.viewpoint) {
    flyToSavedViewpoint(device.viewpoint);
  } else {
    // 没配过视角，用自动计算的兜底
    const mesh = findMeshByDeviceId(deviceId);
    flyToAutoViewpoint(mesh);
  }

  // 3. 显示卡片，等待算法结果...
}
```

---

## 四、关键注意事项

### 1. 模型加载一致性

配置页面和巡检页面**必须用同一个 GLB 文件**，且加载后的场景坐标系完全一致。如果：

- 配置页面模型缩放为 0.001，巡检页面也必须 0.001
- 配置页面 Y 轴向上，巡检页面也必须 Y 轴向上

否则保存的坐标在巡检时会对不上。

### 2. 坐标精度

保存时建议保留 3 位小数就够了：

```javascript
position: position.map((v) => parseFloat(v.toFixed(3)));
```

避免浮点精度问题导致视角有微小偏移。

### 3. 预览保存效果（配置页）

配置页面保存后，加一个**"预览恢复"**按钮，模拟巡检时的飞行效果，确认角度是否满意：

```javascript
function previewSavedViewpoint() {
  // 先随便飞到一个角度
  camera.position.set(50, 50, 50);
  controls.target.set(0, 0, 0);
  controls.update();

  // 再飞回保存的角度，看是否一致
  const vp = getCurrentViewpoint();
  setTimeout(() => flyToSavedViewpoint(vp), 100);
}
```

### 4. 如果没保存过视角的兜底

巡检时可能遇到没配视角的设备，建议：

```javascript
function flyToAutoViewpoint(mesh) {
  const box = new THREE.Box3().setFromObject(mesh);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const distance = Math.max(size.x, size.y, size.z) * 2.5;

  const offset = new THREE.Vector3(1, 0.8, 1).normalize().multiplyScalar(distance);

  flyToSavedViewpoint({
    position: center.clone().add(offset).toArray(),
    target: center.toArray(),
  });
}
```

---

## 五、完整流程图

```
配置页面：
  打开模型 → 自动聚焦到设备（默认机位）→ 用户手动微调角度
  → 点击"保存视角" → 提取 camera.position + controls.target
  → 后端存储 {deviceId, viewpoint}

巡检页面：
  加载任务 → 获取 device.viewpoint
  → 调用 flyToSavedViewpoint() → GSAP动画飞行
  → 到达位置 → 悬浮卡片显示 → 等待算法结果
```

---

## 六、一个小技巧：视角列表管理

如果同一个设备需要**多个视角**（比如正面看仪表盘、侧面看管道接口），可以存数组：

```json
{
  "deviceId": "AHU-01",
  "viewpoints": [
    { "name": "正面仪表盘", "position": [...], "target": [...] },
    { "name": "侧面管道", "position": [...], "target": [...] }
  ]
}
```

巡检时默认用第一个，或根据巡检项类型自动匹配。

---

**总结**：这个功能的核心就是**`camera.position` + `controls.target` 的存取**。配置页保存，巡检页恢复，中间用 GSAP 做平滑动画。确保两个页面的模型坐标系一致，就不会有问题。

你们配置页面和巡检页面是同一个 Three.js 组件复用，还是两套独立的代码？如果是独立的，需要特别注意 GLB 的加载参数（缩放、位置偏移）要保持一致。
