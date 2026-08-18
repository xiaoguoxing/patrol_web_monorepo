import * as THREE from 'three';
import { buildDevices } from './deviceFactory';
import { DEVICES, PATROL_ORDER, PATROL_RESULTS } from './mockData';
import { PatrolController } from './patrolController';
import { buildWaterPlant } from './plantFactory';
import type { PlantDevice, WaterPlantSceneCallbacks } from './types';

export class WaterPlantScene {
  private readonly container: HTMLElement;
  private readonly callbacks: WaterPlantSceneCallbacks;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(46, 1, 1, 4000);
  private readonly renderer: THREE.WebGLRenderer;
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2();
  private readonly viewTarget = new THREE.Vector3();
  private readonly followTarget = new THREE.Vector3();
  private readonly pickables: THREE.Object3D[];
  private readonly patrol: PatrolController;
  private animationFrame = 0;
  private lastTime = performance.now() / 1000;
  private theta = -55;
  private phi = 62;
  private radius = 760;
  private dragging = false;
  private dragButton = 0;
  private lastPointer = { x: 0, y: 0 };
  private downPointer = { x: 0, y: 0 };
  private followView = true;
  private disposed = false;

  constructor(container: HTMLElement, callbacks: WaterPlantSceneCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.domElement.className = 'three-water-plant__canvas';
    container.appendChild(this.renderer.domElement);
    this.addLights();
    buildWaterPlant(this.scene);
    const deviceResult = buildDevices(this.scene, DEVICES);
    this.pickables = deviceResult.pickables;
    this.patrol = new PatrolController({
      scene: this.scene,
      devices: DEVICES,
      order: PATROL_ORDER,
      results: PATROL_RESULTS,
      rings: deviceResult.rings,
      onChange: callbacks.onPatrolChange,
    });
    this.bindEvents();
    this.resize();
    this.animate();
  }

  public resize() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    if (!width || !height) return;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  public advanceToNextDevice() {
    this.patrol.advanceToNextDevice();
  }

  public togglePaused() {
    return this.patrol.togglePaused();
  }

  public togglePath() {
    return this.patrol.togglePath();
  }

  public toggleFollowView() {
    this.followView = !this.followView;
    return this.followView;
  }

  public dispose() {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.animationFrame);
    const canvas = this.renderer.domElement;
    canvas.removeEventListener('mousedown', this.handlePointerDown);
    canvas.removeEventListener('click', this.handleClick);
    canvas.removeEventListener('wheel', this.handleWheel);
    canvas.removeEventListener('contextmenu', this.handleContextMenu);
    window.removeEventListener('mousemove', this.handlePointerMove);
    window.removeEventListener('mouseup', this.handlePointerUp);
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.LineSegments) {
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => {
          Object.values(material).forEach((value: unknown) => {
            if (value instanceof THREE.Texture) value.dispose();
          });
          material.dispose();
        });
      }
    });
    this.renderer.renderLists.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    canvas.remove();
    this.scene.clear();
  }

  private addLights() {
    this.scene.add(new THREE.AmbientLight(0x9fc4ff, 0.55));
    this.scene.add(new THREE.HemisphereLight(0xbfe0ff, 0x123a4a, 0.75));
    const main = new THREE.DirectionalLight(0xfff2dd, 1.15);
    main.position.set(420, 720, 300);
    main.castShadow = true;
    main.shadow.mapSize.set(2048, 2048);
    main.shadow.camera.left = -900;
    main.shadow.camera.right = 900;
    main.shadow.camera.top = 900;
    main.shadow.camera.bottom = -900;
    main.shadow.camera.near = 1;
    main.shadow.camera.far = 2200;
    main.shadow.bias = -0.0006;
    main.shadow.normalBias = 0.6;
    this.scene.add(main);
    const fill = new THREE.DirectionalLight(0x7fc8ff, 0.4);
    fill.position.set(-500, 300, -400);
    this.scene.add(fill);
  }

  private bindEvents() {
    const canvas = this.renderer.domElement;
    canvas.addEventListener('mousedown', this.handlePointerDown);
    canvas.addEventListener('click', this.handleClick);
    canvas.addEventListener('wheel', this.handleWheel, { passive: false });
    canvas.addEventListener('contextmenu', this.handleContextMenu);
    window.addEventListener('mousemove', this.handlePointerMove);
    window.addEventListener('mouseup', this.handlePointerUp);
  }

  private readonly handlePointerDown = (event: MouseEvent) => {
    this.dragging = true;
    this.dragButton = event.button;
    this.lastPointer = { x: event.clientX, y: event.clientY };
    this.downPointer = { x: event.clientX, y: event.clientY };
  };

  private readonly handlePointerMove = (event: MouseEvent) => {
    if (!this.dragging) return;
    const dx = event.clientX - this.lastPointer.x;
    const dy = event.clientY - this.lastPointer.y;
    this.lastPointer = { x: event.clientX, y: event.clientY };
    if (this.dragButton === 0) {
      this.theta -= dx * 0.3;
      this.phi = THREE.MathUtils.clamp(this.phi + dy * 0.25, 22, 84);
    } else if (this.dragButton === 2) {
      this.panCamera(dx, dy);
    }
  };

  private readonly handlePointerUp = () => {
    this.dragging = false;
  };

  private readonly handleWheel = (event: WheelEvent) => {
    event.preventDefault();
    this.radius = THREE.MathUtils.clamp(this.radius * (event.deltaY > 0 ? 1.09 : 0.92), 200, 1300);
  };

  private readonly handleContextMenu = (event: MouseEvent) => event.preventDefault();

  private readonly handleClick = (event: MouseEvent) => {
    if (Math.abs(event.clientX - this.downPointer.x) > 5 || Math.abs(event.clientY - this.downPointer.y) > 5) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hit = this.raycaster.intersectObjects(this.pickables, true)[0];
    const device = hit?.object.userData.device as PlantDevice | undefined;
    if (!device) {
      this.callbacks.onDeviceSelect(undefined);
      return;
    }
    const position = new THREE.Vector3(device.x, 34, device.z).project(this.camera);
    this.callbacks.onDeviceSelect({
      device,
      clientX: ((position.x + 1) / 2) * rect.width,
      clientY: ((1 - position.y) / 2) * rect.height,
    });
  };

  private panCamera(dx: number, dy: number) {
    const theta = THREE.MathUtils.degToRad(this.theta);
    const phi = THREE.MathUtils.degToRad(this.phi);
    const forward = new THREE.Vector3(
      -Math.sin(phi) * Math.sin(theta),
      -Math.cos(phi),
      -Math.sin(phi) * Math.cos(theta)
    );
    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
    const up = new THREE.Vector3().crossVectors(right, forward).normalize();
    const scale = this.radius * 0.0012;
    this.viewTarget.addScaledVector(right, -dx * scale);
    this.viewTarget.addScaledVector(up, dy * scale);
    this.viewTarget.x = THREE.MathUtils.clamp(this.viewTarget.x, -700, 700);
    this.viewTarget.z = THREE.MathUtils.clamp(this.viewTarget.z, -700, 700);
    this.viewTarget.y = 0;
  }

  private updateCamera() {
    this.followTarget.copy(this.patrol.getCursorPosition());
    this.followTarget.y = 0;
    if (this.followView && !this.dragging) {
      const targetTheta = -THREE.MathUtils.radToDeg(Math.atan2(this.followTarget.x, this.followTarget.z)) - 180;
      let offset = targetTheta - this.theta;
      while (offset > 180) offset -= 360;
      while (offset < -180) offset += 360;
      this.theta += offset * 0.06;
      const dwelling = this.patrol.isDwelling();
      this.phi += ((dwelling ? 34 : 62) - this.phi) * 0.08;
      this.radius += ((dwelling ? 210 : 760) - this.radius) * 0.08;
      this.viewTarget.lerp(this.followTarget, 0.1);
    }
    const theta = THREE.MathUtils.degToRad(this.theta);
    const phi = THREE.MathUtils.degToRad(this.phi);
    this.camera.position.set(
      this.viewTarget.x + this.radius * Math.sin(phi) * Math.sin(theta),
      this.viewTarget.y + this.radius * Math.cos(phi),
      this.viewTarget.z + this.radius * Math.sin(phi) * Math.cos(theta)
    );
    this.camera.lookAt(this.viewTarget);
  }

  private readonly animate = () => {
    if (this.disposed) return;
    const now = performance.now() / 1000;
    const delta = Math.min(0.1, now - this.lastTime);
    this.lastTime = now;
    this.patrol.tick(delta, now);
    this.updateCamera();
    this.renderer.render(this.scene, this.camera);
    this.animationFrame = requestAnimationFrame(this.animate);
  };
}
