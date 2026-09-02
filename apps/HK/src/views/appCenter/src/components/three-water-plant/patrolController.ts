import * as THREE from 'three';
import type { ModelPatrolSnapshot, PatrolTargetInfo } from './types';

interface PatrolControllerOptions {
  scene: THREE.Scene;
  /** 模型根节点（真实 GLB 的容器），巡检 id 在它下面递归查找 */
  root: THREE.Object3D;
  /** 巡检对象模型 id 列表（对应 GLB 内的节点名） */
  ids: string[];
  onChange: (snapshot: ModelPatrolSnapshot) => void;
}

/**
 * 基于真实模型节点的巡检控制器
 *
 * 巡检对象 = 业务侧提供的模型 id 列表（array），如 ['pump-01', 'valve-03', ...]。
 * 每个 id 对应 GLB 模型内的一个节点（对象名），巡检时依次定位到该节点：
 *  - 取节点包围盒中心上方的点作为目标巡检点
 *  - 在目标点之间巡航（接近目标时减速），对外暴露当前巡航位置供相机跟随
 *  - 到达目标后停留（dwell）：模型本体材质闪烁高亮
 *  - 通过 onChange 上报当前巡检状态（用于界面展示）
 *
 * 注意：ids 为空时表示"尚未配置巡检对象"，控制器会上报 total=0，不启动巡检。
 */
export class PatrolController {
  private readonly onChange: (snapshot: ModelPatrolSnapshot) => void;
  private readonly targets: PatrolTargetInfo[] = [];
  private readonly objectsByTarget = new Map<string, THREE.Object3D>();
  private readonly path: THREE.CatmullRomCurve3;
  /** 原材质快照：用于恢复模型闪烁前的材质 */
  private readonly flickerOriginal = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
  private flickerMaterials: THREE.MeshBasicMaterial[] = [];
  private progress = 0;
  private currentIndex = -1;
  private completed = 0;
  private dwellRemaining = 0;
  private readonly speed = 0.028;
  private readonly dwellTime = 3.4;

  constructor(options: PatrolControllerOptions) {
    this.onChange = options.onChange;
    // 解析巡检目标：按 id 在模型根节点下查找节点，取其包围盒中心上方的点
    options.root.updateWorldMatrix(true, true);
    options.ids.forEach((id) => {
      const object = options.root.getObjectByName(id);
      if (!object) {
        // GLB 节点名与业务 id 不一致时提示，便于核对
        console.warn(`[巡检] 模型内未找到节点: ${id}`);
        return;
      }
      const box = new THREE.Box3().setFromObject(object);
      const center = box.getCenter(new THREE.Vector3());
      const sphere = box.getBoundingSphere(new THREE.Sphere());
      this.targets.push({ id, name: id, position: center, radius: sphere.radius });
      this.objectsByTarget.set(id, object);
    });

    // CatmullRomCurve3 至少需要两个点，构造一个安全曲线避免空/单点时报错
    let points: THREE.Vector3[];
    if (this.targets.length > 1) {
      points = this.targets.map((target) => target.position);
    } else if (this.targets.length === 1) {
      points = [this.targets[0].position, this.targets[0].position.clone().add(new THREE.Vector3(0, 0, 1))];
    } else {
      points = [new THREE.Vector3(), new THREE.Vector3(0, 0, 1)];
    }
    this.path = new THREE.CatmullRomCurve3(points, true, 'centripetal');

    if (this.targets.length === 0) {
      this.emitSnapshot();
      return;
    }
    this.advanceToNextTarget();
  }

  public tick(delta: number, elapsed: number) {
    if (this.targets.length === 0) return;
    if (this.dwellRemaining > 0) {
      this.dwellRemaining -= delta;
      if (this.dwellRemaining <= 0) {
        this.dwellRemaining = 0;
        if (this.targets.length === 1) {
          // 单个巡检对象：停留结束后重复巡检该对象
          this.focusTarget(0);
        } else {
          this.emitSnapshot();
        }
      }
    } else if (this.targets.length > 1) {
      // 段内接近目标时减速，让巡航更真实
      const inSegment = (this.progress * this.targets.length) % 1;
      const ease = 0.28 + 0.72 * (1 - inSegment) * (1 - inSegment);
      this.progress = (this.progress + delta * this.speed * ease) % 1;
      this.detectArrival();
    }
    if (this.dwellRemaining > 0 && this.currentIndex >= 0) {
      this.animateDwell(elapsed);
    } else {
      // 离开停留状态：恢复目标模型的原始材质
      this.restoreFlicker();
    }
  }

  /** 切换到下一个巡检对象 */
  public advanceToNextTarget() {
    if (this.targets.length === 0) return;
    const index = (this.currentIndex + 1) % this.targets.length;
    this.focusTarget(index);
  }

  /** 跳转到指定巡检任务（点击任务列表项定位对应设备用） */
  public jumpToTarget(index: number) {
    if (this.targets.length === 0) return;
    const safe = ((index % this.targets.length) + this.targets.length) % this.targets.length;
    this.focusTarget(safe);
  }

  /** 当前巡航位置（路径上的点），供相机第一人称式跟随 */
  public getPathPosition() {
    return this.path.getPoint(this.progress);
  }

  /** 当前停留中的巡检目标位置（含高度），未停留时返回 undefined */
  public getFocusedTargetPosition() {
    return this.currentIndex >= 0 ? this.targets[this.currentIndex].position.clone() : undefined;
  }

  /** 当前目标设备的包围球半径（计算"设备整体入画"的最小观察距离用） */
  public getFocusedTargetRadius() {
    return this.currentIndex >= 0 ? this.targets[this.currentIndex].radius : undefined;
  }

  /** 全部巡检任务列表（按巡检顺序，返回副本避免外部修改内部状态） */
  public getTargets() {
    return this.targets.map((target) => ({ ...target, position: target.position.clone() }));
  }

  /** 当前巡检任务索引（尚未开始时为 -1） */
  public getCurrentIndex() {
    return this.currentIndex;
  }

  /** 当前停留中的巡检目标模型对象（遮挡检测时用于排除目标自身），未停留时返回 undefined */
  public getFocusedObject() {
    if (this.currentIndex < 0) return undefined;
    return this.objectsByTarget.get(this.targets[this.currentIndex].id);
  }

  /** 已解析到的巡检目标数量（未配置或 id 未匹配时为 0） */
  public getTargetCount() {
    return this.targets.length;
  }

  public isDwelling() {
    return this.dwellRemaining > 0;
  }

  private detectArrival() {
    const nearestIndex = Math.round(this.progress * this.targets.length) % this.targets.length;
    const targetProgress = nearestIndex / this.targets.length;
    const distance = Math.min(Math.abs(this.progress - targetProgress), 1 - Math.abs(this.progress - targetProgress));
    if (distance < 0.003 && nearestIndex !== this.currentIndex) this.focusTarget(nearestIndex);
  }

  private focusTarget(index: number) {
    // 先恢复上一个目标的原始材质，再为当前目标开启闪烁
    this.restoreFlicker();
    this.currentIndex = index;
    this.progress = this.targets.length > 1 ? index / this.targets.length : 0;
    this.dwellRemaining = this.dwellTime;
    this.completed = (this.completed % Math.max(this.targets.length, 1)) + 1;
    const target = this.targets[index];
    const object = this.objectsByTarget.get(target.id);
    if (object) this.enableFlicker(object);
    this.emitSnapshot();
  }

  /** 把目标对象下所有 mesh 的材质替换为发光材质，用于选中闪烁 */
  private enableFlicker(object: THREE.Object3D) {
    this.flickerOriginal.clear();
    this.flickerMaterials = [];
    object.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      const original = child.material;
      this.flickerOriginal.set(child, original);
      const originals = Array.isArray(original) ? original : [original];
      const flicker = originals.map((mat) => {
        const fm = new THREE.MeshBasicMaterial({
          color: 0x00d4ff,
          transparent: true,
          opacity: 0.85,
          depthWrite: false,
          side: mat.side,
          toneMapped: false,
        });
        this.flickerMaterials.push(fm);
        return fm;
      });
      child.material = Array.isArray(original) ? flicker : flicker[0];
    });
  }

  /** 恢复目标模型的原始材质并释放闪烁材质 */
  private restoreFlicker() {
    if (this.flickerOriginal.size === 0) return;
    this.flickerOriginal.forEach((original, mesh) => {
      mesh.material = original;
    });
    this.flickerOriginal.clear();
    this.flickerMaterials.forEach((material) => material.dispose());
    this.flickerMaterials = [];
  }

  /** 停留期间：模型本体闪烁 */
  private animateDwell(elapsed: number) {
    const pulse = (Math.sin(elapsed * 7) + 1) / 2;
    this.flickerMaterials.forEach((material) => {
      material.opacity = 0.4 + pulse * 0.5;
    });
  }

  private emitSnapshot() {
    const target = this.currentIndex >= 0 ? this.targets[this.currentIndex] : undefined;
    this.onChange({
      target,
      completed: this.completed,
      total: this.targets.length,
      dwelling: this.dwellRemaining > 0,
    });
  }
}
