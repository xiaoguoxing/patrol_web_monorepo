import * as THREE from 'three';
import type { InspectionResult, PatrolSnapshot, PlantDevice } from './types';

interface PatrolControllerOptions {
  scene: THREE.Scene;
  devices: PlantDevice[];
  order: string[];
  results: Record<string, InspectionResult>;
  rings: Map<string, THREE.Mesh>;
  onChange: (snapshot: PatrolSnapshot) => void;
}

export class PatrolController {
  private readonly devices: PlantDevice[];
  private readonly results: Record<string, InspectionResult>;
  private readonly rings: Map<string, THREE.Mesh>;
  private readonly onChange: (snapshot: PatrolSnapshot) => void;
  private readonly path: THREE.CatmullRomCurve3;
  private readonly pathLine: THREE.Line;
  private readonly cursor: THREE.Mesh;
  private progress = 0;
  private currentIndex = -1;
  private completed = 0;
  private dwellRemaining = 0;
  private paused = false;
  private pathVisible = true;
  private readonly speed = 0.028;
  private readonly dwellTime = 3.4;

  constructor(options: PatrolControllerOptions) {
    this.devices = options.order
      .map((key) => options.devices.find((device) => device.key === key))
      .filter((device): device is PlantDevice => device !== undefined);
    this.results = options.results;
    this.rings = options.rings;
    this.onChange = options.onChange;
    this.path = new THREE.CatmullRomCurve3(
      this.devices.map((device) => new THREE.Vector3(device.x, 0.6, device.z)),
      true,
      'centripetal'
    );
    this.pathLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(this.path.getPoints(400)),
      new THREE.LineBasicMaterial({ color: 0x00d4ff, transparent: true, opacity: 0.55 })
    );
    this.cursor = new THREE.Mesh(new THREE.SphereGeometry(6, 16, 16), new THREE.MeshBasicMaterial({ color: 0x00d4ff }));
    const halo = new THREE.Mesh(
      new THREE.SphereGeometry(11, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0x00d4ff, transparent: true, opacity: 0.22 })
    );
    halo.scale.setScalar(1.7);
    this.cursor.add(halo);
    options.scene.add(this.pathLine, this.cursor);
    this.advanceToNextDevice();
  }

  public tick(delta: number, elapsed: number) {
    if (!this.paused) {
      if (this.dwellRemaining > 0) {
        this.dwellRemaining -= delta;
        if (this.dwellRemaining <= 0) {
          this.dwellRemaining = 0;
          this.emitSnapshot();
        }
      } else {
        this.progress = (this.progress + delta * this.speed) % 1;
        this.detectArrival();
      }
    }
    const position =
      this.dwellRemaining > 0 && this.currentIndex >= 0
        ? new THREE.Vector3(this.devices[this.currentIndex].x, 0.6, this.devices[this.currentIndex].z)
        : this.path.getPoint(this.progress);
    this.cursor.position.copy(position);
    this.cursor.position.y = 7 + Math.sin(elapsed * 4) * 1.5;
    this.cursor.scale.setScalar(1 + Math.sin(elapsed * 6) * 0.12);
  }

  public advanceToNextDevice() {
    const index = (this.currentIndex + 1) % this.devices.length;
    this.focusDevice(index);
  }

  public togglePaused() {
    this.paused = !this.paused;
    this.emitSnapshot();
    return this.paused;
  }

  public togglePath() {
    this.pathVisible = !this.pathVisible;
    this.pathLine.visible = this.pathVisible;
    return this.pathVisible;
  }

  public getCursorPosition() {
    return this.cursor.position.clone();
  }

  public isDwelling() {
    return this.dwellRemaining > 0;
  }

  private detectArrival() {
    const nearestIndex = Math.round(this.progress * this.devices.length) % this.devices.length;
    const targetProgress = nearestIndex / this.devices.length;
    const distance = Math.min(Math.abs(this.progress - targetProgress), 1 - Math.abs(this.progress - targetProgress));
    if (distance < 0.003 && nearestIndex !== this.currentIndex) this.focusDevice(nearestIndex);
  }

  private focusDevice(index: number) {
    this.currentIndex = index;
    this.progress = index / this.devices.length;
    this.dwellRemaining = this.dwellTime;
    this.completed = (this.completed % this.devices.length) + 1;
    this.rings.forEach((ring, key) => {
      const material = ring.material;
      if (material instanceof THREE.MeshBasicMaterial) material.opacity = key === this.devices[index].key ? 1 : 0.35;
    });
    this.emitSnapshot();
  }

  private emitSnapshot() {
    if (this.currentIndex < 0) return;
    const device = this.devices[this.currentIndex];
    this.onChange({
      device,
      result: this.results[device.key],
      completed: this.completed,
      total: this.devices.length,
      dwelling: this.dwellRemaining > 0,
      paused: this.paused,
      cursor: this.cursor.position.clone(),
    });
  }
}
