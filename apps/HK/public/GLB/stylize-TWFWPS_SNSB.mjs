/**
 * Applies the industrial PBR art direction to the supplied internal-equipment
 * GLB without altering its geometry, hierarchy, or node names.
 *
 * Usage:
 *   node stylize-TWFWPS_SNSB.mjs
 *
 * By default this intentionally updates TWFWPS_SNSB.glb, which is the asset
 * consumed by the water-plant scene. Pass two paths to use it as a converter.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const directory = path.dirname(fileURLToPath(import.meta.url));
const input = process.argv[2] ?? path.join(directory, 'TWFWPS_SNSB.glb');
const output = process.argv[3] ?? input;
const source = fs.readFileSync(input);

if (source.readUInt32LE(0) !== 0x46546c67 || source.readUInt32LE(4) !== 2) {
  throw new Error(`${input} is not a glTF 2.0 binary file.`);
}

const chunks = [];
let offset = 12;
while (offset < source.length) {
  const length = source.readUInt32LE(offset);
  const type = source.readUInt32LE(offset + 4);
  const data = source.subarray(offset + 8, offset + 8 + length);
  chunks.push({ type, data });
  offset += 8 + length;
}

const jsonChunk = chunks.find((chunk) => chunk.type === 0x4e4f534a);
if (!jsonChunk) throw new Error('The source GLB does not contain a JSON chunk.');
const gltf = JSON.parse(jsonChunk.data.toString('utf8').trim());

const finishes = {
  '01 - Default': {
    name: 'Concrete · cold graphite', color: [0.098, 0.118, 0.128], metal: 0.05, rough: 0.91,
    specular: 0.28,
  },
  neiqiang: {
    name: 'Concrete · deep charcoal', color: [0.145, 0.165, 0.175], metal: 0.04, rough: 0.86,
    specular: 0.3,
  },
  '12 - Default': {
    name: 'Steel · blackened', color: [0.018, 0.026, 0.034], metal: 0.86, rough: 0.3,
    specular: 0.62,
  },
  shebeiHuang: {
    name: 'Safety coating · signal amber', color: [1, 0.48, 0.018], metal: 0.28, rough: 0.27,
    specular: 0.5, clearcoat: 0.1, clearcoatRoughness: 0.2,
  },
  '14 - Default': {
    name: 'Steel · gunmetal', color: [0.052, 0.07, 0.09], metal: 0.78, rough: 0.36,
    specular: 0.7,
  },
  shebei: {
    name: 'Equipment · satin graphite', color: [0.105, 0.135, 0.155], metal: 0.8, rough: 0.26,
    specular: 0.72,
  },
  guandao: {
    name: 'Pipework · deep process blue', color: [0.012, 0.075, 0.145], metal: 0.48, rough: 0.22,
    specular: 0.62, clearcoat: 0.17, clearcoatRoughness: 0.16,
  },
  '06 - Default': {
    name: 'Control casing · technical blue', color: [0.018, 0.155, 0.29], metal: 0.56, rough: 0.2,
    specular: 0.68, clearcoat: 0.2, clearcoatRoughness: 0.15,
  },
  shebeiaaa: {
    name: 'Steel · carbon black', color: [0.006, 0.01, 0.014], metal: 0.9, rough: 0.22,
    specular: 0.74,
  },
};

for (const material of gltf.materials ?? []) {
  const finish = finishes[material.name];
  if (!finish) continue;
  material.name = finish.name;
  material.pbrMetallicRoughness = {
    ...(material.pbrMetallicRoughness ?? {}),
    baseColorFactor: [...finish.color, 1],
    metallicFactor: finish.metal,
    roughnessFactor: finish.rough,
  };
  material.extensions ??= {};
  material.extensions.KHR_materials_specular = {
    ...(material.extensions.KHR_materials_specular ?? {}),
    specularFactor: finish.specular,
    specularColorFactor: [0.86, 0.94, 1],
  };
  if (finish.clearcoat) {
    material.extensions.KHR_materials_clearcoat = {
      clearcoatFactor: finish.clearcoat,
      clearcoatRoughnessFactor: finish.clearcoatRoughness,
    };
  }
  material.extras = {
    ...(material.extras ?? {}),
    finish: 'industrial-pbr',
  };
}

gltf.extensionsUsed = [...new Set([...(gltf.extensionsUsed ?? []), 'KHR_materials_specular', 'KHR_materials_clearcoat'])];
gltf.asset.generator = `${gltf.asset.generator ?? 'glTF'} | Industrial PBR art direction`;
gltf.asset.extras = {
  ...(gltf.asset.extras ?? {}),
  artDirection: 'High-contrast industrial: graphite equipment, process-blue pipework, gunmetal steel, and signal-amber safety components.',
  materialRevision: 'industrial-pbr-v1',
};

const json = Buffer.from(JSON.stringify(gltf));
const padding = (4 - (json.length % 4)) % 4;
const jsonData = Buffer.concat([json, Buffer.alloc(padding, 0x20)]);
const rebuiltChunks = chunks.map((chunk) => {
  const data = chunk === jsonChunk ? jsonData : chunk.data;
  const header = Buffer.alloc(8);
  header.writeUInt32LE(data.length, 0);
  header.writeUInt32LE(chunk.type, 4);
  return Buffer.concat([header, data]);
});
const header = Buffer.alloc(12);
header.writeUInt32LE(0x46546c67, 0);
header.writeUInt32LE(2, 4);
header.writeUInt32LE(12 + rebuiltChunks.reduce((sum, chunk) => sum + chunk.length, 0), 8);
fs.writeFileSync(output, Buffer.concat([header, ...rebuiltChunks]));
console.log(`Industrial art direction applied: ${path.relative(process.cwd(), output)}`);
