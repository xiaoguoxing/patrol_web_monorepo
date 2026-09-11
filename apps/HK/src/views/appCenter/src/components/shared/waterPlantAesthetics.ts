import * as THREE from 'three';

/**
 * 水厂三维模型 PBR 美术材质体系与视觉优化模块
 *
 * 依据工业水厂国标规范（GB 7231 工业管道与设备识别标色体系）及现代数字孪生标准，
 * 为水厂 CAD/BIM 导出模型（TWFWPS_SNSB.glb 内部构造 + TWFWPS_WLM.glb 外立面）
 * 赋予分级明确、质感真实的工业级 PBR 材质：
 * - 输水主管：自来水务净水蓝，光滑搪瓷漆质感
 * - 水泵主体：工业机械湖蓝，高强度耐蚀漆
 * - 电机动力：安全警示黄 + 铸铁深灰接线箱双色对比
 * - 水阀执行：高反差精密铸钢与红色控制手轮
 * - 变频控制：现代电气威图灰白哑光质感
 * - 行车天车：重工黄色主梁与端架，凸显工业空间体量
 * - 地面平台：现代化环氧自流平蓝灰，柔和反光倒影
 * - 外立面幕墙：半透明科技海蓝微透玻璃
 */

/** 材质分类枚举 */
export type WaterPlantComponentCategory =
  | 'PUMP_BODY'
  | 'PUMP_MOUNT_STEEL'
  | 'PUMP_OUTLET'
  | 'MOTOR_BODY'
  | 'MOTOR_ACCESSORY'
  | 'VALVE_BODY'
  | 'PIPE_WATER_MAIN'
  | 'PIPE_STEEL_AUX'
  | 'ELECTRICAL_CABINET'
  | 'CRANE_GIRDER'
  | 'CRANE_STRUCTURE'
  | 'FLOOR_MAIN'
  | 'EQUIPMENT_BASE'
  | 'INTERIOR_WALL'
  | 'GENERAL_EQUIPMENT';

/** 内部构件材质池（复用 Material 实例以最小化 GPU Draw Call） */
class MaterialPool {
  private materials = new Map<WaterPlantComponentCategory, THREE.MeshStandardMaterial>();

  public get(category: WaterPlantComponentCategory): THREE.MeshStandardMaterial {
    let mat = this.materials.get(category);
    if (!mat) {
      mat = this.createMaterial(category);
      this.materials.set(category, mat);
    }
    return mat;
  }

  public dispose() {
    this.materials.forEach((mat) => mat.dispose());
    this.materials.clear();
  }

  private createMaterial(category: WaterPlantComponentCategory): THREE.MeshStandardMaterial {
    switch (category) {
      case 'PUMP_BODY':
        // 1#~9# 水泵主体：工业水泵湖蓝 / 耐磨氟碳漆，圆弧壳体高光明显
        return new THREE.MeshStandardMaterial({
          color: 0x0284c7,
          roughness: 0.32,
          metalness: 0.25,
          envMapIntensity: 1.2,
        });

      case 'PUMP_MOUNT_STEEL':
        // 水泵底座基架、联轴器护罩：深灰工业耐磨钢
        return new THREE.MeshStandardMaterial({
          color: 0x334155,
          roughness: 0.35,
          metalness: 0.6,
          envMapIntensity: 1.0,
        });

      case 'PUMP_OUTLET':
        // 水泵出水短接管：水务蓝配微深金属感
        return new THREE.MeshStandardMaterial({
          color: 0x0284c7,
          roughness: 0.28,
          metalness: 0.2,
          envMapIntensity: 1.1,
        });

      case 'MOTOR_BODY':
        // 1#~9# 电机动力单元：醒目安全黄 / 琥珀黄，散热翅片高光反光清晰
        return new THREE.MeshStandardMaterial({
          color: 0xf59e0b,
          roughness: 0.3,
          metalness: 0.18,
          envMapIntensity: 1.2,
        });

      case 'MOTOR_ACCESSORY':
        // 电机接线盒、端盖、轴承压盖：铸铁石墨深灰
        return new THREE.MeshStandardMaterial({
          color: 0x1e293b,
          roughness: 0.35,
          metalness: 0.55,
          envMapIntensity: 1.0,
        });

      case 'VALVE_BODY':
        // 1#~10# 水阀：精密铸钢深灰阀体（高反差，视角配置一眼定位）
        return new THREE.MeshStandardMaterial({
          color: 0x1e293b,
          roughness: 0.28,
          metalness: 0.55,
          envMapIntensity: 1.3,
        });

      case 'PIPE_WATER_MAIN':
        // 输水主管（国标供水蓝）：清澈水务自来水蓝，平滑反光
        return new THREE.MeshStandardMaterial({
          color: 0x0284c7,
          roughness: 0.26,
          metalness: 0.2,
          envMapIntensity: 1.25,
        });

      case 'PIPE_STEEL_AUX':
        // 镀锌钢辅管、仪表管路、法兰弯头：高反光金属质感
        return new THREE.MeshStandardMaterial({
          color: 0x94a3b8,
          roughness: 0.24,
          metalness: 0.72,
          envMapIntensity: 1.4,
        });

      case 'ELECTRICAL_CABINET':
        // 变频与配电柜：现代电气控制室威图浅灰白，细腻半哑光
        return new THREE.MeshStandardMaterial({
          color: 0xf1f5f9,
          roughness: 0.45,
          metalness: 0.08,
          envMapIntensity: 0.9,
        });

      case 'CRANE_GIRDER':
        // 桥式起重机 21 米主梁：工业重工亮黄色
        return new THREE.MeshStandardMaterial({
          color: 0xeab308,
          roughness: 0.36,
          metalness: 0.12,
          envMapIntensity: 1.1,
        });

      case 'CRANE_STRUCTURE':
        // 行车端梁与滑轨骨架：工业重工金黄色
        return new THREE.MeshStandardMaterial({
          color: 0xca8a04,
          roughness: 0.38,
          metalness: 0.15,
          envMapIntensity: 1.0,
        });

      case 'FLOOR_MAIN':
        // 厂房中央地面与检修走道：高标环氧自流平蓝灰，柔和映出设备倒影
        return new THREE.MeshStandardMaterial({
          color: 0xcbd5e1,
          roughness: 0.32,
          metalness: 0.05,
          envMapIntensity: 1.0,
        });

      case 'EQUIPMENT_BASE':
        // 混凝土设备基础垫层：哑光混凝土实感灰
        return new THREE.MeshStandardMaterial({
          color: 0x64748b,
          roughness: 0.85,
          metalness: 0.0,
          envMapIntensity: 0.6,
        });

      case 'INTERIOR_WALL':
        // 室内柱面与隔断内墙：建筑纯净暖白，促进光线漫反射
        return new THREE.MeshStandardMaterial({
          color: 0xf8fafc,
          roughness: 0.8,
          metalness: 0.0,
          envMapIntensity: 0.7,
        });

      case 'GENERAL_EQUIPMENT':
      default:
        // 其他常规辅助机械与构件：坚固工业冷灰
        return new THREE.MeshStandardMaterial({
          color: 0x64748b,
          roughness: 0.35,
          metalness: 0.35,
          envMapIntensity: 1.0,
        });
    }
  }
}

const pool = new MaterialPool();

/** 根据节点名称与原始特征识别构件类别 */
export function classifyComponent(
  nodeName: string,
  matNames: string[],
  boxSize?: THREE.Vector3
): WaterPlantComponentCategory {
  // 1. 电机主体 (1#~9# 电机)
  if (/^Object0(1[6-9]|2[0-3])$/.test(nodeName) || nodeName === 'Rectangle004') {
    return 'MOTOR_BODY';
  }
  // 电机配件/接线盒/压盖
  if (/^Mesh00[89]$|^Mesh010$|^Mesh01[4-7]$|^Circle006$/.test(nodeName)) {
    return 'MOTOR_ACCESSORY';
  }

  // 2. 水阀主体 (1#~10# 水阀)
  if (/^Rectangle0(19|2[0-8])$/.test(nodeName)) {
    return 'VALVE_BODY';
  }

  // 3. 水泵主体 (1#~9# 水泵)
  if (/^(Line009|Line012|Line013|Object011|Line019|Line021|Rectangle008|Line023|Line024)$/.test(nodeName)) {
    return 'PUMP_BODY';
  }

  // 4. 配电/变频控制柜 (10 台控制柜)
  if (/^11166929452[0-9]$/.test(nodeName)) {
    return 'ELECTRICAL_CABINET';
  }

  // 5. 桥式行车 / 起重吊梁
  if (nodeName === '111669292202') {
    return 'CRANE_GIRDER';
  }
  if (/^111669290961$|^111669292210$|^111669292211$/.test(nodeName)) {
    return 'CRANE_STRUCTURE';
  }

  // 6. 地面平台与基础
  if (nodeName === 'Rectangle001' || nodeName === '115964264798') {
    return 'FLOOR_MAIN';
  }
  if (/^Object00[2-6]$|^Mesh02[6-8]$|^Object024$|^Object025$|^Rectangle013$|^Rectangle029$/.test(nodeName)) {
    return 'EQUIPMENT_BASE';
  }
  if (nodeName === 'Rectangle002' || nodeName === 'Shape011' || nodeName === 'Circle008') {
    return 'INTERIOR_WALL';
  }

  // 7. 管道系统：主管道 vs 金属辅管
  if (
    matNames.includes('guandao') ||
    /^Line\d+$/.test(nodeName) ||
    /^Circle\d+$/.test(nodeName) ||
    /^Shape00[2-4]$|^Shape010$/.test(nodeName)
  ) {
    if (boxSize) {
      const maxDim = Math.max(boxSize.x, boxSize.y, boxSize.z);
      if (maxDim > 1000) {
        return 'PIPE_WATER_MAIN';
      }
    }
    return 'PIPE_STEEL_AUX';
  }

  // 8. 水泵基架与出水短接
  if (/^Mesh00[1-7]$|^Object01[2-4]$/.test(nodeName)) {
    return 'PUMP_MOUNT_STEEL';
  }
  if (/^Shape00[5-8]$/.test(nodeName)) {
    return 'PUMP_OUTLET';
  }

  return 'GENERAL_EQUIPMENT';
}

/**
 * 为加载的模型应用水厂专业 PBR 美术渲染升级
 * - 针对 TWFWPS_SNSB 内部结构：遍历 Mesh 节点并赋予精准 PBR 材质
 * - 针对 TWFWPS_WLM 外立面：保留原贴图结构，赋予现代建筑科技海蓝微透玻璃质感
 */
export function applyWaterPlantAesthetics(root: THREE.Object3D, isFacade: boolean): void {
  const tempBox = new THREE.Box3();
  const tempSize = new THREE.Vector3();

  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;

    // 开启阴影投射与接收，产生真实的接触暗部与体积感
    object.castShadow = true;
    object.receiveShadow = true;

    if (isFacade) {
      // 外立面处理：保留贴图（如玻璃窗格纹理），增加科技蓝微反光
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((mat) => {
        if (mat instanceof THREE.MeshStandardMaterial) {
          mat.color.setHex(0x7dd3fc);
          mat.roughness = 0.15;
          mat.metalness = 0.12;
          mat.envMapIntensity = 1.3;
          mat.transparent = true;
          mat.opacity = 0.38;
          mat.side = THREE.DoubleSide;
          mat.depthWrite = true;
        }
      });
      return;
    }

    // 内部结构处理
    tempBox.setFromObject(object);
    tempBox.getSize(tempSize);

    const oldMats = Array.isArray(object.material) ? object.material : [object.material];
    const matNames = oldMats.map((m) => m.name || '');

    const category = classifyComponent(object.name, matNames, tempSize);
    const newMaterial = pool.get(category);

    object.material = newMaterial;
  });
}

/** 选中物体材质发光辅助高亮缓存 */
interface EmissiveState {
  mesh: THREE.Mesh;
  originalMaterial: THREE.Material | THREE.Material[];
  highlightMaterial: THREE.MeshStandardMaterial;
}
const activeEmissives: EmissiveState[] = [];

/**
 * 为当前选中的物体设置高级自发光微光辅助（配置视角交互增强）
 * - 保持模型原材质几何与属性完整
 * - 取消选中时平滑完全还原，杜绝材质破坏 bug
 */
export function setObjectSelectedEmissive(target: THREE.Object3D | null): void {
  // 1. 还原之前选中的构件材质
  if (activeEmissives.length > 0) {
    activeEmissives.forEach((state) => {
      state.mesh.material = state.originalMaterial;
      state.highlightMaterial.dispose();
    });
    activeEmissives.length = 0;
  }

  if (!target) return;

  // 2. 为当前选中构件所有子 Mesh 赋予柔和的科技蓝自发光克隆材质
  target.traverse((child) => {
    if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
      const clonedMat = child.material.clone();
      clonedMat.emissive.setHex(0x005588);
      clonedMat.emissiveIntensity = 0.75;
      activeEmissives.push({
        mesh: child,
        originalMaterial: child.material,
        highlightMaterial: clonedMat,
      });
      child.material = clonedMat;
    }
  });
}

/** 销毁材质池资源 */
export function disposeWaterPlantAesthetics(): void {
  if (activeEmissives.length > 0) {
    activeEmissives.forEach((state) => {
      state.mesh.material = state.originalMaterial;
      state.highlightMaterial.dispose();
    });
    activeEmissives.length = 0;
  }
  pool.dispose();
}
