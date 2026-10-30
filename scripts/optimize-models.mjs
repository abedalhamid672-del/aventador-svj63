/**
 * Rebuilds the two Sketchfab exports into web-ready, addressable GLBs.
 *
 *   node scripts/optimize-models.mjs
 *
 * SVJ:  bakes the 1/100 scale + Sketchfab axis fix into the geometry, regroups the
 *       1,464 loose wheel fragments into four spinnable wheels (pivot at hub centre),
 *       merges everything else per material, strips transmission, Meshopt + WebP.
 * M4:   centres it, normalises its length to 1 unit, drops the colour/ORM textures
 *       (the site overrides them with a gunmetal material) and keeps 1K normal maps.
 */
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import {
  clearNodeParent,
  clearNodeTransform,
  dedup,
  getBounds,
  join,
  meshopt,
  prune,
  textureCompress,
  transformMesh,
  weld,
} from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
import draco3d from 'draco3dgltf';
import sharp from 'sharp';
import fs from 'node:fs';

const SRC = 'assets-src';
const OUT = 'public/models';

const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({
    'meshopt.decoder': MeshoptDecoder,
    'meshopt.encoder': MeshoptEncoder,
    'draco3d.decoder': await draco3d.createDecoderModule(),
  });
await MeshoptDecoder.ready;
await MeshoptEncoder.ready;

const translation = ([x, y, z]) => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1];

/** Moves every mesh node to the scene root and bakes its world transform into the geometry. */
function bakeToWorld(doc, scene) {
  const meshNodes = doc.getRoot().listNodes().filter((n) => n.getMesh());
  const meshUse = new Map();
  for (const n of meshNodes) meshUse.set(n.getMesh(), (meshUse.get(n.getMesh()) ?? 0) + 1);
  for (const node of meshNodes) {
    // A shared mesh would get baked twice; clone it so each node owns its geometry.
    if (meshUse.get(node.getMesh()) > 1) node.setMesh(node.getMesh().clone());
    clearNodeParent(node);
    clearNodeTransform(node);
    if (!scene.listChildren().includes(node)) scene.addChild(node);
  }
  return meshNodes;
}

/** Slash-joined ancestor names, captured before the hierarchy is flattened. */
function ancestry(node) {
  const names = [];
  for (let cur = node; cur; cur = cur.getParentNode()) names.unshift(cur.getName());
  return names.join('/');
}

function centre(box) {
  return box.min.map((v, i) => (v + box.max[i]) / 2);
}

function unionBounds(nodes) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const n of nodes) {
    const b = getBounds(n);
    for (let i = 0; i < 3; i++) {
      min[i] = Math.min(min[i], b.min[i]);
      max[i] = Math.max(max[i], b.max[i]);
    }
  }
  return { min, max };
}

/** Friendly node names per material so gltfjsx output reads like a parts list. */
const PART_NAMES = {
  MAIN_PINT: 'Paint',
  Paint: 'PaintDecal',
  RED_PAINT: 'AccentRed',
  BLACK_PAINT: 'PaintBlack',
  RED_GLASS: 'Taillights',
  ORANGE_GLASS: 'Indicators',
  RIM_2: 'Rim',
  LightA: 'Lights',
  Carbon1M: 'Carbon',
  Wheel3DWheel1C: 'Tyre',
  WheelCarbon1: 'Carbon',
  CaliperGloss: 'Body',
};
const shortName = (materialName) =>
  materialName
    .replace(/^Lamborghini_AventadorSVJRoadsterRewardRecycled_2020_?/, '')
    .replace(/_?Material\d*$/, '')
    .replace(/^Wheel2A_3D_?/, 'Wheel')
    .replace(/^CallipersCalliper/, 'Caliper')
    .replace(/[^A-Za-z0-9]/g, '');
const partName = (materialName) => {
  const short = shortName(materialName);
  return PART_NAMES[materialName] ?? PART_NAMES[short] ?? short.replace(/(DefaultA|A)$/, '');
};
/** Material names must be unique across the car, so wheel materials keep a prefix. */
const MATERIAL_OVERRIDES = { WheelCarbon1: 'WheelCarbon', CaliperGloss: 'Caliper', Wheel3DWheel1C: 'Tyre' };
const materialName = (original) => MATERIAL_OVERRIDES[shortName(original)] ?? partName(original);

/**
 * Trademark artwork baked into the export (bull shield, model wordmarks, ALA logos).
 * The site is unofficial, so the textures are dropped and the shapes kept as plain graphite.
 */
const TRADEMARK_MATERIALS = /2020(BadgeA|ManufacturerPlateA)_Material$/;

/**
 * The wheel atlas also carries the shield (centre-lock caps) in its top-left corner. That region
 * is painted over with the atlas's own background grey, sampled just below it.
 */
const WHEEL_ATLAS_MATERIAL = /Wheel2A_3D_3DWheel1C_Material1$/;
const WHEEL_SHIELD_REGION = { x: 0, y: 0, w: 0.28, h: 0.345 }; // fractions of the texture

async function paintOverShield(texture) {
  const { data, info } = await sharp(Buffer.from(texture.getImage())).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const sample = (Math.round(height * 0.33) * width + Math.round(width * 0.01)) * channels;
  const fill = data.subarray(sample, sample + channels);
  const [x1, y1] = [Math.round(width * WHEEL_SHIELD_REGION.w), Math.round(height * WHEEL_SHIELD_REGION.h)];
  for (let y = 0; y < y1; y++) for (let x = 0; x < x1; x++) data.set(fill, (y * width + x) * channels);
  const png = await sharp(data, { raw: { width, height, channels } }).png().toBuffer();
  texture.setImage(new Uint8Array(png)).setMimeType('image/png');
}

async function buildSvj() {
  const doc = await io.read(`${SRC}/svj.raw.glb`);
  const root = doc.getRoot();
  const scene = root.getDefaultScene() ?? root.listScenes()[0];

  // The export is 1/100 scale (4.9 cm long). Scale the Sketchfab root so geometry lands in metres.
  const sketchfabRoot = root.listNodes().find((n) => n.getName() === 'Sketchfab_model');
  sketchfabRoot.setScale(sketchfabRoot.getScale().map((s) => s * 100));

  const parts = new Map(root.listNodes().filter((n) => n.getMesh()).map((n) => [n, ancestry(n)]));
  const meshNodes = bakeToWorld(doc, scene);
  for (const n of root.listNodes()) if (!n.getMesh() && n.listChildren().length === 0) n.dispose();
  for (const n of scene.listChildren()) if (!n.getMesh()) scene.removeChild(n);

  const isWheel = (part) => /\/Combined_Wheels_3D_/.test(part);
  const isCaliper = (part) => /\/Calliper/.test(part);

  // Car faces +Z, Y up, so +X is the car's left side.
  const quadrant = (node) => {
    const [x, , z] = centre(getBounds(node));
    return `${z > 0 ? 'F' : 'R'}${x > 0 ? 'L' : 'R'}`;
  };

  const carRoot = doc.createNode('SVJ');
  scene.addChild(carRoot);
  const body = doc.createNode('Body');
  carRoot.addChild(body);

  const wheelNodes = {};
  const caliperNodes = {};
  for (const node of meshNodes) {
    const part = parts.get(node);
    scene.removeChild(node);
    if (isWheel(part)) (wheelNodes[quadrant(node)] ??= []).push(node);
    else if (isCaliper(part)) (caliperNodes[quadrant(node)] ??= []).push(node);
    else body.addChild(node);
  }

  const hubs = {};
  for (const [q, nodes] of Object.entries(wheelNodes)) {
    const tyreBox = unionBounds(nodes);
    const hub = centre(tyreBox);
    hubs[q] = { hub, diameter: tyreBox.max[1] - tyreBox.min[1], width: tyreBox.max[0] - tyreBox.min[0] };
    // Re-pivot: geometry moves to local space around the hub so rotation.x spins the wheel.
    const wheel = doc.createNode(`Wheel_${q}`).setTranslation(hub);
    carRoot.addChild(wheel);
    for (const n of nodes) {
      transformMesh(n.getMesh(), translation(hub.map((v) => -v)));
      wheel.addChild(n);
    }
    const caliper = doc.createNode(`Caliper_${q}`).setTranslation(hub);
    carRoot.addChild(caliper);
    for (const n of caliperNodes[q] ?? []) {
      transformMesh(n.getMesh(), translation(hub.map((v) => -v)));
      caliper.addChild(n);
    }
  }

  // Strip transmission: it forces an extra full-scene render pass in three.js for little gain
  // on tinted glass. Alpha blending (already set) carries the look.
  for (const mat of root.listMaterials()) {
    if (mat.getExtension('KHR_materials_transmission')) {
      mat.setExtension('KHR_materials_transmission', null);
    }
  }
  for (const ext of root.listExtensionsUsed()) {
    if (ext.extensionName === 'KHR_materials_transmission') ext.dispose();
  }

  // KHR_materials_specular turns every material into three's MeshPhysicalMaterial, the heaviest
  // shader to compile, for specular tweaks of ~0.04 that are invisible here. Keep it only where a
  // material is physical anyway (clear coat).
  for (const mat of root.listMaterials()) {
    if (mat.getExtension('KHR_materials_specular') && !mat.getExtension('KHR_materials_clearcoat')) {
      mat.setExtension('KHR_materials_specular', null);
    }
  }

  for (const mat of root.listMaterials()) {
    const atlas = mat.getBaseColorTexture();
    if (WHEEL_ATLAS_MATERIAL.test(mat.getName()) && atlas) await paintOverShield(atlas);
  }

  for (const mat of root.listMaterials()) {
    if (!TRADEMARK_MATERIALS.test(mat.getName())) continue;
    mat
      .setBaseColorTexture(null)
      .setNormalTexture(null)
      .setBaseColorFactor([0.1, 0.1, 0.11, 1])
      .setMetallicFactor(0.6)
      .setRoughnessFactor(0.4);
  }

  await doc.transform(
    dedup(),
    join({ keepNamed: false }),
    weld(),
    prune({ keepLeaves: false }),
  );

  // Name the merged meshes after their material, scoped by their group. Two body meshes can
  // share a material when their attribute layouts differ; the second gets a numeric suffix.
  const taken = new Map();
  for (const group of carRoot.listChildren()) {
    const scope = group.getName() === 'Body' ? '' : `${group.getName()}_`;
    for (const n of group.listChildren()) {
      const mat = n.getMesh()?.listPrimitives()[0]?.getMaterial();
      if (!mat) continue;
      const base = `${scope}${partName(mat.getName())}`;
      const count = (taken.get(base) ?? 0) + 1;
      taken.set(base, count);
      const name = count === 1 ? base : `${base}${count}`;
      n.setName(name);
      n.getMesh().setName(name);
    }
  }
  for (const mat of root.listMaterials()) mat.setName(materialName(mat.getName()));

  await doc.transform(
    textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [1024, 1024] }),
    meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
  );
  await io.write(`${OUT}/svj.glb`, doc);
  return { hubs, bounds: getBounds(carRoot) };
}

async function buildM4() {
  const doc = await io.read(`${SRC}/m4.raw.glb`);
  const root = doc.getRoot();
  const scene = root.getDefaultScene() ?? root.listScenes()[0];

  const meshNodes = bakeToWorld(doc, scene);
  for (const n of root.listNodes()) if (!n.getMesh() && n.listChildren().length === 0) n.dispose();
  for (const n of scene.listChildren()) if (!n.getMesh()) scene.removeChild(n);

  // Centre on the origin and normalise the barrel axis (Z) to exactly 1 unit long.
  const box = unionBounds(meshNodes);
  const c = centre(box);
  const s = 1 / (box.max[2] - box.min[2]);
  const normalise = [s, 0, 0, 0, 0, s, 0, 0, 0, 0, s, 0, -c[0] * s, -c[1] * s, -c[2] * s, 1];

  const rifle = doc.createNode('M4');
  scene.addChild(rifle);
  for (const n of meshNodes) {
    transformMesh(n.getMesh(), normalise);
    n.setName(n.getName().replace(/_[a-z0-9]+_0$/, ''));
    scene.removeChild(n);
    rifle.addChild(n);
  }

  // The site replaces colour and roughness with a gunmetal shader; only surface detail survives.
  for (const mat of root.listMaterials()) {
    mat.setBaseColorTexture(null).setMetallicRoughnessTexture(null);
  }

  await doc.transform(
    dedup(),
    join({ keepNamed: false }),
    weld(),
    prune(),
    textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [1024, 1024] }),
    meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
  );
  await io.write(`${OUT}/m4.glb`, doc);
  return { bounds: getBounds(rifle) };
}

fs.mkdirSync(OUT, { recursive: true });
const svj = await buildSvj();
const m4 = await buildM4();
const size = (f) => `${(fs.statSync(f).size / 1048576).toFixed(2)} MB`;
console.log(JSON.stringify({ svj: { size: size(`${OUT}/svj.glb`), ...svj }, m4: { size: size(`${OUT}/m4.glb`), ...m4 } }, null, 2));
