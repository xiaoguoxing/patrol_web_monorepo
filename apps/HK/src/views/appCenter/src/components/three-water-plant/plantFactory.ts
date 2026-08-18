import * as THREE from 'three';

const cyan = 0x00d4ff;

const enableShadows = (object: THREE.Object3D) => {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) child.castShadow = true;
  });
};

const addBuilding = (
  root: THREE.Group,
  x: number,
  z: number,
  width: number,
  depth: number,
  height: number,
  rows: number,
  columns: number
) => {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    new THREE.MeshPhongMaterial({ color: 0x0e4a8a, transparent: true, opacity: 0.42, side: THREE.DoubleSide })
  );
  body.position.y = height / 2;
  group.add(
    body,
    new THREE.LineSegments(
      new THREE.EdgesGeometry(body.geometry),
      new THREE.LineBasicMaterial({ color: cyan, transparent: true, opacity: 0.75 })
    )
  );
  const windowMaterial = new THREE.MeshBasicMaterial({ color: 0x8fe0ff, transparent: true, opacity: 0.9 });
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const windowMesh = new THREE.Mesh(
        new THREE.PlaneGeometry((width / columns) * 0.32, (height / rows) * 0.2),
        windowMaterial
      );
      windowMesh.position.set(
        -width / 2 + (width * (column + 0.5)) / columns,
        (height * (row + 0.62)) / rows,
        depth / 2 + 0.5
      );
      group.add(windowMesh);
    }
  }
  group.position.set(x, 0, z);
  enableShadows(group);
  root.add(group);
};

const addTank = (root: THREE.Group, x: number, z: number) => {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(30, 30, 110, 24),
    new THREE.MeshPhongMaterial({ color: 0x12527f, transparent: true, opacity: 0.6, side: THREE.DoubleSide })
  );
  body.position.y = 55;
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(30, 0.8, 8, 36),
    new THREE.MeshBasicMaterial({ color: cyan, transparent: true, opacity: 0.8 })
  );
  ring.position.y = 55;
  ring.rotation.x = Math.PI / 2;
  const cap = new THREE.Mesh(
    new THREE.SphereGeometry(20, 20, 12),
    new THREE.MeshPhongMaterial({ color: 0x1a6aa8, transparent: true, opacity: 0.7 })
  );
  cap.position.y = 110;
  group.add(body, ring, cap);
  group.position.set(x, 0, z);
  enableShadows(group);
  root.add(group);
};

const addRoad = (root: THREE.Group, x: number, z: number, width: number, depth: number) => {
  const horizontal = width >= depth;
  const length = horizontal ? width : depth;
  const roadWidth = horizontal ? depth : width;
  const road = new THREE.Mesh(
    new THREE.PlaneGeometry(width, depth),
    new THREE.MeshPhongMaterial({ color: 0x0a2e4a, transparent: true, opacity: 0.85 })
  );
  road.rotation.x = -Math.PI / 2;
  road.position.set(x, 0.06, z);
  root.add(road);
  const center = new THREE.Vector3(x, 0.1, z);
  const direction = horizontal ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 0, 1);
  const side = horizontal ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(1, 0, 0);
  const start = center.clone().addScaledVector(direction, -length / 2);
  const end = center.clone().addScaledVector(direction, length / 2);
  const dash = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([start, end]),
    new THREE.LineDashedMaterial({ color: 0xcfe9ff, dashSize: 4, gapSize: 5, transparent: true, opacity: 0.45 })
  );
  dash.computeLineDistances();
  root.add(dash);
  [roadWidth / 2 - 0.6, -roadWidth / 2 + 0.6].forEach((offset) => {
    const edgeStart = center
      .clone()
      .addScaledVector(side, offset)
      .addScaledVector(direction, -length / 2);
    const edgeEnd = center
      .clone()
      .addScaledVector(side, offset)
      .addScaledVector(direction, length / 2);
    root.add(
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([edgeStart, edgeEnd]),
        new THREE.LineBasicMaterial({ color: cyan, transparent: true, opacity: 0.35 })
      )
    );
  });
};

const addFilterBasin = (root: THREE.Group, x: number, z: number, radius: number) => {
  const group = new THREE.Group();
  const wall = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, 7, 48, 1, true),
    new THREE.MeshPhongMaterial({ color: 0x1d5f8f, transparent: true, opacity: 0.8, side: THREE.DoubleSide })
  );
  wall.position.y = 3.5;
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(radius, 1.4, 8, 48),
    new THREE.MeshBasicMaterial({ color: cyan, transparent: true, opacity: 0.8 })
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 7;
  const water = new THREE.Mesh(
    new THREE.CircleGeometry(radius - 2, 48),
    new THREE.MeshPhongMaterial({ color: 0x0a6f8f, emissive: 0x0a4a6a, transparent: true, opacity: 0.85 })
  );
  water.rotation.x = -Math.PI / 2;
  water.position.y = 1.8;
  group.add(wall, rim, water);
  [0.45, 0.68, 0.9].forEach((ratio) => {
    const wave = new THREE.Mesh(
      new THREE.TorusGeometry(radius * ratio, 0.5, 6, 48),
      new THREE.MeshBasicMaterial({ color: cyan, transparent: true, opacity: 0.22 })
    );
    wave.rotation.x = Math.PI / 2;
    wave.position.y = 2.1;
    group.add(wave);
  });
  group.position.set(x, 0, z);
  root.add(group);
};

const addTree = (root: THREE.Group, x: number, z: number) => {
  const group = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(3.2, 4.4, 13, 8),
    new THREE.MeshStandardMaterial({ color: 0x6b4d28, roughness: 0.9 })
  );
  trunk.position.y = 6.5;
  const leafBottom = new THREE.Mesh(
    new THREE.SphereGeometry(12, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0x1e7a46, roughness: 0.95 })
  );
  leafBottom.position.y = 19;
  const leafTop = new THREE.Mesh(
    new THREE.SphereGeometry(8.4, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0x2f9e5a, roughness: 0.95 })
  );
  leafTop.position.y = 27;
  group.add(trunk, leafBottom, leafTop);
  group.position.set(x, 0, z);
  enableShadows(group);
  root.add(group);
};

const createFloorTexture = (glowOnly: boolean) => {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('无法创建科技网格纹理');
  if (glowOnly) {
    context.fillStyle = '#000';
    context.fillRect(0, 0, 1024, 1024);
  } else {
    const gradient = context.createRadialGradient(512, 512, 60, 512, 512, 560);
    gradient.addColorStop(0, 'rgba(16,64,96,.95)');
    gradient.addColorStop(1, 'rgba(4,26,44,.95)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 1024, 1024);
  }
  context.strokeStyle = glowOnly ? 'rgba(0,180,255,.10)' : 'rgba(0,212,255,.14)';
  context.lineWidth = 1;
  for (let offset = 0; offset <= 1024; offset += 64) {
    context.beginPath();
    context.moveTo(offset + 0.5, 0);
    context.lineTo(offset + 0.5, 1024);
    context.stroke();
    context.beginPath();
    context.moveTo(0, offset + 0.5);
    context.lineTo(1024, offset + 0.5);
    context.stroke();
  }
  context.strokeStyle = glowOnly ? 'rgba(0,210,255,.55)' : 'rgba(0,212,255,.32)';
  context.lineWidth = 2;
  for (let offset = 0; offset <= 1024; offset += 256) {
    context.beginPath();
    context.moveTo(offset, 0);
    context.lineTo(offset, 1024);
    context.stroke();
    context.beginPath();
    context.moveTo(0, offset);
    context.lineTo(1024, offset);
    context.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  texture.anisotropy = 8;
  return texture;
};

export const buildWaterPlant = (scene: THREE.Scene) => {
  const root = new THREE.Group();
  root.name = 'water-plant';
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(1600, 1600),
    new THREE.MeshStandardMaterial({
      map: createFloorTexture(false),
      emissive: 0xffffff,
      emissiveMap: createFloorTexture(true),
      emissiveIntensity: 0.45,
      roughness: 0.82,
      metalness: 0.15,
    })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.6;
  floor.receiveShadow = true;
  root.add(floor);
  const outerRing = new THREE.Mesh(
    new THREE.RingGeometry(806, 824, 96),
    new THREE.MeshBasicMaterial({ color: cyan, transparent: true, opacity: 0.22, side: THREE.DoubleSide })
  );
  outerRing.rotation.x = -Math.PI / 2;
  outerRing.position.y = -0.55;
  root.add(outerRing);
  addBuilding(root, -180, -140, 240, 200, 150, 2, 5);
  addBuilding(root, 60, 140, 200, 170, 120, 2, 4);
  addBuilding(root, -240, 20, 150, 100, 90, 1, 4);
  addBuilding(root, 260, -80, 150, 120, 130, 1, 3);
  addBuilding(root, 260, 150, 180, 110, 95, 1, 3);
  addTank(root, 400, -90);
  addTank(root, 280, 60);
  addRoad(root, 0, -7, 24, 485);
  addRoad(root, 110, 235, 460, 24);
  addRoad(root, 0, -310, 700, 24);
  addFilterBasin(root, 70, -230, 48);
  addFilterBasin(root, 250, -230, 62);
  addFilterBasin(root, 430, -230, 48);
  [
    [-400, 230],
    [-400, 90],
    [-400, -40],
    [410, 250],
    [390, 60],
    [-150, -345],
    [60, -345],
    [250, -350],
    [400, -345],
    [-160, 300],
    [40, 300],
    [-70, 300],
    [150, -120],
    [200, 25],
    [-30, 30],
    [330, 260],
    [60, 25],
  ].forEach(([x, z]) => addTree(root, x, z));
  scene.add(root);
  return root;
};
