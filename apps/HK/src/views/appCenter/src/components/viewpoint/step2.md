问：自动聚焦到设备（默认机位），自动聚焦到设备，我想做成鼠标点击某个几何组摄像头自动跟过去，这样既能选定设备，也能调整角度

答：
这个交互设计非常自然——**点哪看哪，一步到位**。以下是完整的实现方案：

---

## 一、核心交互流程

```
用户点击模型中的设备
  → Raycaster 检测到点击的几何体
  → 向上遍历找到设备根节点（或绑定的Group）
  → 自动计算最佳观察角度
  → 相机平滑飞过去
  → 设备高亮选中
  → 用户可在此基础上微调 → 保存
```

---

## 二、完整代码实现

### 1. 点击检测 + 设备识别

```javascript
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let selectedDevice = null; // 当前选中的设备

// 点击事件
function onMouseClick(event) {
  // 计算鼠标在归一化设备坐标中的位置
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  // 检测与场景中所有物体的交集
  const intersects = raycaster.intersectObjects(scene.children, true);

  if (intersects.length > 0) {
    // 向上遍历，找到带有 deviceId 的设备根节点
    const deviceMesh = findDeviceRoot(intersects[0].object);

    if (deviceMesh && deviceMesh.userData.deviceId) {
      selectDevice(deviceMesh);
    }
  }
}

// 向上遍历查找设备根节点
function findDeviceRoot(object) {
  let current = object;
  while (current) {
    // 假设你在加载GLB时，给每个设备Group设置了 userData.deviceId
    if (current.userData && current.userData.isDevice) {
      return current;
    }
    current = current.parent;
  }
  return null;
}

// 绑定点击
renderer.domElement.addEventListener('click', onMouseClick);
```

> **关键**：加载 GLB 时，需要给每个设备设置 `userData.isDevice = true` 和 `userData.deviceId`，否则无法识别。

---

### 2. 自动计算最佳观察位置

点击设备后，根据设备**包围盒大小和朝向**自动计算机位：

```javascript
function selectDevice(deviceMesh) {
  // 取消之前的高亮
  if (selectedDevice) setHighlight(selectedDevice, false);

  selectedDevice = deviceMesh;
  setHighlight(deviceMesh, true);

  // 计算最佳观察位
  const viewpoint = computeViewpoint(deviceMesh);

  // 平滑飞过去
  flyToViewpoint(viewpoint);

  // 更新UI：显示当前选中设备名称
  document.getElementById('device-name').textContent = deviceMesh.userData.deviceName || '未命名设备';
}

function computeViewpoint(mesh) {
  const box = new THREE.Box3().setFromObject(mesh);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());

  // 设备最大维度
  const maxDim = Math.max(size.x, size.y, size.z);

  // 基础距离：确保设备占屏幕约40-60%
  const distance = maxDim * 2.2;

  // 根据设备类型调整观察角度（可选）
  const deviceType = mesh.userData.deviceType;
  let offsetDir;

  switch (deviceType) {
    case 'cabinet': // 配电柜/控制箱 - 正面平视
      offsetDir = new THREE.Vector3(0, 0.2, 1).normalize();
      break;
    case 'ahu': // 空调机组 - 右前方45度俯视
      offsetDir = new THREE.Vector3(1, 0.8, 1).normalize();
      break;
    case 'pump': // 水泵 - 侧面平视
      offsetDir = new THREE.Vector3(1, 0.1, 0).normalize();
      break;
    case 'valve': // 阀门 - 顶部俯视
      offsetDir = new THREE.Vector3(0, 1, 0.2).normalize();
      break;
    default: // 默认右前上方45度
      offsetDir = new THREE.Vector3(1, 0.8, 1).normalize();
  }

  // 计算相机位置
  const position = center.clone().add(offsetDir.multiplyScalar(distance));

  return {
    position: position.toArray().map((v) => parseFloat(v.toFixed(3))),
    target: center.toArray().map((v) => parseFloat(v.toFixed(3))),
    distance: parseFloat(distance.toFixed(3)),
  };
}
```

---

### 3. 平滑飞行（GSAP）

```javascript
import gsap from 'gsap';

function flyToViewpoint(viewpoint) {
  const endPos = new THREE.Vector3(...viewpoint.position);
  const endTarget = new THREE.Vector3(...viewpoint.target);

  // 动画当前值
  const anim = {
    px: camera.position.x,
    py: camera.position.y,
    pz: camera.position.z,
    tx: controls.target.x,
    ty: controls.target.y,
    tz: controls.target.z,
  };

  gsap.to(anim, {
    px: endPos.x,
    py: endPos.y,
    pz: endPos.z,
    tx: endTarget.x,
    ty: endTarget.y,
    tz: endTarget.z,
    duration: 0.8,
    ease: 'power2.inOut',
    onUpdate: () => {
      camera.position.set(anim.px, anim.py, anim.pz);
      controls.target.set(anim.tx, anim.ty, anim.tz);
      controls.update(); // 必须调用！
    },
  });
}
```

---

### 4. 高亮选中效果

```javascript
// 存储原始材质，用于恢复
const originalMaterials = new Map();

function setHighlight(mesh, isHighlight) {
  mesh.traverse((child) => {
    if (child.isMesh) {
      if (isHighlight) {
        // 保存原始材质
        if (!originalMaterials.has(child.uuid)) {
          originalMaterials.set(child.uuid, child.material.clone());
        }
        // 设置高亮材质（自发光）
        child.material = child.material.clone();
        child.material.emissive = new THREE.Color(0x4488ff);
        child.material.emissiveIntensity = 0.3;
      } else {
        // 恢复原始材质
        if (originalMaterials.has(child.uuid)) {
          child.material = originalMaterials.get(child.uuid);
        }
      }
    }
  });
}
```

---

### 5. 保存按钮：提取当前视角

```javascript
function onSaveViewpoint() {
  if (!selectedDevice) {
    alert('请先点击选中一个设备');
    return;
  }

  const viewpoint = {
    position: camera.position.toArray().map((v) => parseFloat(v.toFixed(3))),
    target: controls.target.toArray().map((v) => parseFloat(v.toFixed(3))),
    fov: camera.fov,
  };

  const deviceId = selectedDevice.userData.deviceId;

  // 发送到后端
  api
    .saveDeviceViewpoint({
      deviceId: deviceId,
      viewpoint: viewpoint,
    })
    .then(() => {
      // 视觉反馈
      showToast(`已保存 ${selectedDevice.userData.deviceName} 的视角`);
    });
}
```

---

## 三、配置页面完整 UI 布局

```
┌─────────────────────────────────────────────┐
│  [返回列表]  配置巡检对象视角                  │
├─────────────────────────────────────────────┤
│                                             │
│                                             │
│           [Three.js 画布 - 占满]             │
│                                             │
│    ┌─────────────────────────────────┐      │
│    │  💡 点击设备自动聚焦，滚轮缩放   │      │
│    │     左键旋转，右键平移          │      │
│    └─────────────────────────────────┘      │
│                                             │
├─────────────────────────────────────────────┤
│  当前选中: [AHU-01]  [状态: 未保存视角]      │
│                                             │
│  [自动聚焦]  [预览保存效果]  [💾 保存视角]   │
└─────────────────────────────────────────────┘
```

---

## 四、加载 GLB 时的关键设置

为了让上述代码工作，加载 GLB 时需要给设备打标记：

```javascript
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const loader = new GLTFLoader();
loader.load('/model/building.glb', (gltf) => {
  const model = gltf.scene;

  // 假设你的模型中，设备有特定的命名规则或层级结构
  model.traverse((child) => {
    // 方式1：按名称识别（如包含"AHU"、"PUMP"等）
    if (child.name && /^(AHU|PUMP|VALVE|CABINET)/i.test(child.name)) {
      child.userData.isDevice = true;
      child.userData.deviceId = child.name;
      child.userData.deviceName = child.name;
      child.userData.deviceType = inferType(child.name); // 'ahu' | 'pump' 等
    }

    // 方式2：按层级识别（如在特定Group下）
    // if (child.parent && child.parent.name === 'EquipmentLayer') { ... }
  });

  scene.add(model);
});

function inferType(name) {
  if (name.includes('AHU')) return 'ahu';
  if (name.includes('PUMP')) return 'pump';
  if (name.includes('VALVE')) return 'valve';
  if (name.includes('CABINET')) return 'cabinet';
  return 'default';
}
```

---

## 五、进阶优化

### 1. 点击空白处取消选中

```javascript
function onMouseClick(event) {
  // ... raycaster 检测 ...

  if (intersects.length === 0) {
    // 点击空白处，取消选中
    if (selectedDevice) {
      setHighlight(selectedDevice, false);
      selectedDevice = null;
      document.getElementById('device-name').textContent = '请点击设备';
    }
    return;
  }
  // ...
}
```

### 2. 鼠标悬停预览（Hover）

```javascript
let hoveredDevice = null;

function onMouseMove(event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(scene.children, true);

  if (intersects.length > 0) {
    const device = findDeviceRoot(intersects[0].object);
    if (device && device !== hoveredDevice) {
      document.body.style.cursor = 'pointer';
      // 可选：hover时轻微高亮
    }
  } else {
    document.body.style.cursor = 'default';
  }
}

renderer.domElement.addEventListener('mousemove', onMouseMove);
```

### 3. 已保存视角的设备标记

配置页面加载时，从后端获取已保存视角的设备列表，在模型中用**小绿点**或**名称标签**标记出来，方便知道哪些配过了。

---

## 六、总结

| 步骤 | 用户操作          | 系统行为                                            |
| ---- | ----------------- | --------------------------------------------------- |
| 1    | 点击模型中的设备  | Raycaster 检测 → 识别设备 → 高亮                    |
| 2    | —                 | 自动计算最佳机位 → GSAP 平滑飞行                    |
| 3    | 滚轮/旋转微调角度 | OrbitControls 正常响应                              |
| 4    | 点击"保存视角"    | 提取 `camera.position` + `controls.target` → 存后端 |

这样配置视角的体验就很流畅了：**点设备 → 自动飞过去 → 微调 → 保存**。不需要手动输入任何坐标。

你们 GLB 加载后，设备的命名规则是什么？是按 `AHU-01` 这种格式，还是有其他层级结构？这会影响 `findDeviceRoot` 的实现。
