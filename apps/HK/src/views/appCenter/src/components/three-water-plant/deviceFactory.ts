import * as THREE from 'three';
import type { DeviceBuildResult, PlantDevice } from './types';

const cyan = 0x00d4ff;

interface DeviceMaterials {
  steel: THREE.MeshStandardMaterial;
  body: THREE.MeshStandardMaterial;
  cabinet: THREE.MeshStandardMaterial;
  door: THREE.MeshStandardMaterial;
  edge: THREE.LineBasicMaterial;
}

const createMaterials = (): DeviceMaterials => ({
  steel: new THREE.MeshStandardMaterial({ color: 0x9fb4c8, roughness: 0.35, metalness: 0.85 }),
  body: new THREE.MeshStandardMaterial({ color: 0x2b7fbe, roughness: 0.4, metalness: 0.35 }),
  cabinet: new THREE.MeshStandardMaterial({
    color: 0x123a63,
    roughness: 0.5,
    metalness: 0.4,
    transparent: true,
    opacity: 0.85,
  }),
  door: new THREE.MeshStandardMaterial({ color: 0x1d4f7a, roughness: 0.45, metalness: 0.3 }),
  edge: new THREE.LineBasicMaterial({ color: cyan, transparent: true, opacity: 0.8 }),
});

const addBaseRing = (group: THREE.Group, radius: number) => {
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(radius, radius + 3, 32),
    new THREE.MeshBasicMaterial({ color: cyan, transparent: true, opacity: 0.35, side: THREE.DoubleSide })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 1.2;
  group.add(ring);
  return ring;
};

const addPump = (group: THREE.Group, materials: DeviceMaterials) => {
  const base = new THREE.Mesh(new THREE.BoxGeometry(28, 5, 16), materials.cabinet);
  base.position.y = 2.5;
  const body = new THREE.Mesh(new THREE.CylinderGeometry(7.5, 7.5, 24, 18), materials.body);
  body.rotation.z = Math.PI / 2;
  body.position.set(1, 10, 0);
  const inlet = new THREE.Mesh(new THREE.CylinderGeometry(6.5, 6.5, 5, 18), materials.steel);
  inlet.rotation.z = Math.PI / 2;
  inlet.position.set(-14, 10, 0);
  const motor = new THREE.Mesh(
    new THREE.CylinderGeometry(6.5, 6.5, 16, 18),
    new THREE.MeshStandardMaterial({ color: 0x4a6a8a, roughness: 0.45, metalness: 0.6 })
  );
  motor.rotation.z = Math.PI / 2;
  motor.position.set(19, 10, 0);
  group.add(base, body, inlet, motor);
  return addBaseRing(group, 16);
};

const addCabinet = (group: THREE.Group, materials: DeviceMaterials, alarm: boolean) => {
  const box = new THREE.Mesh(new THREE.BoxGeometry(16, 28, 12), materials.cabinet);
  box.position.y = 14;
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(box.geometry), materials.edge);
  const door = new THREE.Mesh(new THREE.BoxGeometry(14, 26, 0.6), materials.door);
  door.position.set(0, 14, 6.3);
  const lamp = new THREE.Mesh(
    new THREE.SphereGeometry(2, 14, 12),
    new THREE.MeshBasicMaterial({ color: alarm ? 0xff4d5e : 0x2ee6a8 })
  );
  lamp.position.set(0, 30, 0);
  group.add(box, edges, door, lamp);
  return addBaseRing(group, 13);
};

const addMeter = (group: THREE.Group, materials: DeviceMaterials) => {
  const base = new THREE.Mesh(new THREE.BoxGeometry(12, 3, 12), materials.steel);
  base.position.y = 1.5;
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(2, 2.6, 26, 12), materials.steel);
  pole.position.y = 14;
  const shell = new THREE.Mesh(new THREE.CylinderGeometry(12, 12, 5, 32), materials.steel);
  shell.position.y = 30;
  const face = new THREE.Mesh(
    new THREE.CircleGeometry(10.5, 32),
    new THREE.MeshPhongMaterial({ color: 0xdfeef7, side: THREE.DoubleSide, emissive: 0x1c2c3a })
  );
  face.rotation.x = -Math.PI / 2;
  face.position.y = 32.6;
  const hand = new THREE.Mesh(new THREE.BoxGeometry(8, 0.6, 0.15), new THREE.MeshBasicMaterial({ color: 0xff4d5e }));
  hand.position.set(Math.sin(0.9) * 4.5, 32.8, Math.cos(0.9) * 4.5);
  hand.rotation.y = 0.9 - Math.PI / 2;
  group.add(base, pole, shell, face, hand);
  return addBaseRing(group, 14);
};

const addLight = (group: THREE.Group, materials: DeviceMaterials) => {
  const box = new THREE.Mesh(new THREE.BoxGeometry(14, 20, 10), materials.cabinet);
  box.position.y = 10;
  group.add(box, new THREE.LineSegments(new THREE.EdgesGeometry(box.geometry), materials.edge));
  [0xff4d5e, 0xffd166, 0x2ee6a8].forEach((color, index) => {
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(2.6, 14, 12), new THREE.MeshBasicMaterial({ color }));
    lamp.position.set(-4.4 + index * 4.4, 15.5, 5.4);
    group.add(lamp);
  });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 8, 12), materials.steel);
  pole.position.y = 24;
  const top = new THREE.Mesh(new THREE.SphereGeometry(3.6, 16, 14), new THREE.MeshBasicMaterial({ color: 0xffd166 }));
  top.position.y = 29;
  group.add(pole, top);
  return addBaseRing(group, 12);
};

const addDoser = (group: THREE.Group, materials: DeviceMaterials) => {
  const base = new THREE.Mesh(new THREE.BoxGeometry(20, 4, 16), materials.cabinet);
  base.position.y = 2;
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(7, 7, 30, 20), materials.body);
  tank.position.y = 20;
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(7.6, 7.6, 2.4, 20), materials.door);
  lid.position.y = 35;
  const mixer = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 7, 12), materials.steel);
  mixer.position.y = 39.5;
  group.add(base, tank, lid, mixer);
  return addBaseRing(group, 13);
};

const addBlower = (group: THREE.Group, materials: DeviceMaterials, alarm: boolean) => {
  const base = new THREE.Mesh(new THREE.BoxGeometry(26, 4, 14), materials.cabinet);
  base.position.y = 2;
  const shell = new THREE.Mesh(new THREE.CylinderGeometry(9, 9, 9, 20), materials.body);
  shell.rotation.z = Math.PI / 2;
  shell.position.set(1, 12, 0);
  const inlet = new THREE.Mesh(new THREE.CylinderGeometry(6.5, 6.5, 6, 18), materials.steel);
  inlet.rotation.z = Math.PI / 2;
  inlet.position.set(-15, 12, 0);
  const motor = new THREE.Mesh(new THREE.CylinderGeometry(5.5, 5.5, 13, 18), materials.steel);
  motor.rotation.z = Math.PI / 2;
  motor.position.set(14, 12, 0);
  const lamp = new THREE.Mesh(
    new THREE.SphereGeometry(2.4, 14, 12),
    new THREE.MeshBasicMaterial({ color: alarm ? 0xff4d5e : 0x2ee6a8 })
  );
  lamp.position.set(1, 27.5, 0);
  group.add(base, shell, inlet, motor, lamp);
  return addBaseRing(group, 15);
};

export const buildDevices = (scene: THREE.Scene, devices: PlantDevice[]): DeviceBuildResult => {
  const materials = createMaterials();
  const groups = new Map<string, THREE.Group>();
  const rings = new Map<string, THREE.Mesh>();
  const pickables: THREE.Object3D[] = [];
  devices.forEach((device) => {
    const group = new THREE.Group();
    let ring: THREE.Mesh;
    switch (device.type) {
      case 'pump':
        ring = addPump(group, materials);
        break;
      case 'cabinet':
        ring = addCabinet(group, materials, device.alarm === true);
        break;
      case 'meter':
        ring = addMeter(group, materials);
        break;
      case 'light':
        ring = addLight(group, materials);
        break;
      case 'doser':
        ring = addDoser(group, materials);
        break;
      case 'blower':
        ring = addBlower(group, materials, device.alarm === true);
        break;
    }
    group.position.set(device.x, 0, device.z);
    group.userData.device = device;
    group.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.castShadow = true;
        object.userData.device = device;
      }
    });
    scene.add(group);
    groups.set(device.key, group);
    rings.set(device.key, ring);
    pickables.push(group);
  });
  return { groups, rings, pickables };
};
