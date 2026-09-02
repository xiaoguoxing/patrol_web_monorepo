import * as THREE from 'three';

/** 数值保留指定位小数 */
export function round(v: number, digits = 2): number {
  return parseFloat(v.toFixed(digits));
}

/** 保留两位小数（视角坐标序列化用） */
export const round2 = (v: number) => round(v, 2);

/** 对象是否可见（自身及祖先链 visible 都为 true） */
export function isVisible(object: THREE.Object3D): boolean {
  let node: THREE.Object3D | null = object;
  while (node) {
    if (!node.visible) return false;
    node = node.parent;
  }
  return true;
}

/** object 是否为 root 自身或其子孙节点 */
export function isObjectOrChildOf(root: THREE.Object3D, object: THREE.Object3D): boolean {
  let node: THREE.Object3D | null = object;
  while (node) {
    if (node === root) return true;
    node = node.parent;
  }
  return false;
}

/** 递归释放对象树下的几何体 / 材质 / 纹理 */
export function disposeObject(root: THREE.Object3D): void {
  root.traverse((object) => {
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
}

/** 创建 Canvas 纹理并设置通用格式（RGBA + sRGB，适配背景 / 环境贴图） */
export function createCanvasTexture(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const texture = new THREE.CanvasTexture(canvas);
  texture.format = THREE.RGBAFormat;
  texture.type = THREE.UnsignedByteType;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
