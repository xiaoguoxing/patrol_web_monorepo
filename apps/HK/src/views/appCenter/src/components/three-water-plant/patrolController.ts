import * as THREE from 'three';
import type { PatrolViewpoint } from '../shared/constants';
import type { ModelPatrolSnapshot, PatrolTargetInfo } from './types';

interface PatrolControllerOptions {
  scene: THREE.Scene;
  /** 模型根节点（真实 GLB 的容器），巡检 id 在它下面递归查找 */
  root: THREE.Object3D;
  /** 巡检点位列表（modelId 定位设备，可带预设视角） */
  ids: PatrolViewpoint[];
  onChange: (snapshot: ModelPatrolSnapshot) => void;
}

/** 巡检阶段：transit 运镜中 / dwell 点位停留观察中 */
export type PatrolPhase = 'transit' | 'dwell';

/**
 * 基于真实模型节点的巡检控制器（GSAP 运镜版）
 *
 * 巡检对象 = 业务侧提供的模型 id 列表（array），如 ['pump-01', 'valve-03', ...]。
 * 每个 id 对应 GLB 模型内的一个节点（对象名），巡检时依次定位到该节点：
 *  - 取节点包围盒中心上方的点作为目标巡检点
 *  - 控制器只负责"节奏"：到达点位后停留（dwell）并材质闪烁高亮
 *  - 点位之间的镜头运镜由外部（WaterPlantScene + GSAP）完成：
 *      phase === 'transit' 时等待场景把镜头运镜到 pendingIndex 点位，
 *      到达后调用 completeTransit() 切入停留；
 *      phase === 'dwell'   时在当前点位停留计时，结束后重新进入 transit
 *  - 通过 onChange 上报当前巡检状态（用于界面展示）
 *
 * 注意：ids 为空时表示"尚未配置巡检对象"，控制器会上报 total=0，不启动巡检。
 */
export class PatrolController {
  private readonly onChange: (snapshot: ModelPatrolSnapshot) => void;
  private readonly targets: PatrolTargetInfo[] = [];
  private readonly objectsByTarget = new Map<string, THREE.Object3D>();
  /** 原材质快照：用于恢复模型闪烁前的材质 */
  private readonly flickerOriginal = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
  private flickerMaterials: THREE.MeshBasicMaterial[] = [];
  private phase: PatrolPhase = 'transit';
  /** 当前停留中的点位索引（-1 表示尚未完成首次运镜到达） */
  private currentIndex = -1;
  /** 正在运镜前往的点位索引（transit 阶段有效） */
  private pendingIndex = -1;
  private dwellRemaining = 0;
  private completed = 0;
  private readonly dwellTime = 3.4;

  constructor(options: PatrolControllerOptions) {
    this.onChange = options.onChange;
    // 解析巡检目标：按 modelId 在模型根节点下查找节点，取其包围盒中心作为目标点
    options.root.updateWorldMatrix(true, true);
    options.ids.forEach((item) => {
      const id = item.modelId;
      const object = options.root.getObjectByName(id);
      if (!object) {
        // GLB 节点名与业务 id 不一致时提示，便于核对
        console.warn(`[巡检] 模型内未找到节点: ${id}`);
        return;
      }
      const box = new THREE.Box3().setFromObject(object);
      const center = box.getCenter(new THREE.Vector3());
      const sphere = box.getBoundingSphere(new THREE.Sphere());
      this.targets.push({ id, name: item.name, position: center, radius: sphere.radius, viewpoint: item });
      this.objectsByTarget.set(id, object);
    });

    if (this.targets.length === 0) {
      this.emitSnapshot();
      return;
    }
    if (this.targets.length === 1) {
      // 单个巡检对象：无需运镜，直接开始停留并循环巡检
      this.beginDwell(0);
    } else {
      // 多个巡检对象：等待场景把镜头运镜到首个点位后由 completeTransit() 切入停留
      this.phase = 'transit';
      this.pendingIndex = 0;
      this.emitSnapshot();
    }
  }

  public tick(delta: number, elapsed: number) {
    if (this.targets.length === 0) return;
    // transit：镜头运动由 GSAP 驱动，控制器等待 completeTransit()
    if (this.phase === 'transit') return;
    if (this.dwellRemaining > 0) {
      this.dwellRemaining -= delta;
      this.animateDwell(elapsed);
      if (this.dwellRemaining <= 0) {
        this.dwellRemaining = 0;
        if (this.targets.length === 1) {
          // 单个巡检对象：停留结束后重复巡检该对象
          this.beginDwell(0);
        } else {
          // 停留结束：进入运镜阶段，等待场景把镜头带到下一个点位
          this.phase = 'transit';
          this.pendingIndex = (this.currentIndex + 1) % this.targets.length;
          this.restoreFlicker();
          this.emitSnapshot();
        }
      }
    }
  }

  /** 运镜完成（场景 GSAP 镜头到位后调用）：在当前目标点位开启停留与闪烁 */
  public completeTransit() {
    if (this.phase !== 'transit' || this.pendingIndex < 0) return;
    this.beginDwell(this.pendingIndex);
  }

  /** 手动切换到下一个巡检对象（运镜途中重复调用无效） */
  public advanceToNextTarget() {
    if (this.targets.length === 0) return;
    if (this.targets.length === 1) {
      // 单个对象：外部"开始下一轮"时直接重启停留
      if (this.phase === 'dwell') this.beginDwell(0);
      return;
    }
    if (this.phase === 'transit') return;
    this.phase = 'transit';
    this.pendingIndex = (this.currentIndex + 1) % this.targets.length;
    this.dwellRemaining = 0;
    this.restoreFlicker();
    this.emitSnapshot();
  }

  /** 当前巡检阶段 */
  public getPhase() {
    return this.phase;
  }

  /** 正在运镜前往的点位索引（transit 阶段有效，否则为 -1） */
  public getPendingIndex() {
    return this.pendingIndex;
  }

  /** 当前停留中的巡检目标位置（含高度），未停留时返回 undefined */
  public getFocusedTargetPosition() {
    return this.currentIndex >= 0 ? this.targets[this.currentIndex].position.clone() : undefined;
  }

  /** 当前目标设备的包围球半径（计算"设备整体入画"的最小观察距离用） */
  public getFocusedTargetRadius() {
    return this.currentIndex >= 0 ? this.targets[this.currentIndex].radius : undefined;
  }

  /** 当前停留目标的预设视角（配置视角页保存），未配置时返回 undefined */
  public getFocusedViewpoint() {
    return this.currentIndex >= 0 ? this.targets[this.currentIndex].viewpoint : undefined;
  }

  /** 全部巡检任务列表（按巡检顺序，返回副本避免外部修改内部状态） */
  public getTargets() {
    return this.targets.map((target) => ({ ...target, position: target.position.clone() }));
  }

  /** 当前巡检任务索引（尚未到达任何点位时为 -1） */
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
    return this.phase === 'dwell' && this.dwellRemaining > 0;
  }

  /** 切换到指定点位并开始停留 */
  private beginDwell(index: number) {
    // 先恢复上一个目标的原始材质，再为当前目标开启闪烁
    this.restoreFlicker();
    this.currentIndex = index;
    this.pendingIndex = -1;
    this.dwellRemaining = this.dwellTime;
    this.completed = (this.completed % Math.max(this.targets.length, 1)) + 1;
    this.phase = 'dwell';
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
      dwelling: this.phase === 'dwell',
    });
  }
}
