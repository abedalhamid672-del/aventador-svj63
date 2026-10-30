// Dev tool: measures candidate hotspot anchors (car space, metres) from public/models/svj.glb.
//   node tools/measure-anchors.mjs
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';

await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const doc = await io.read('public/models/svj.glb');

/** World-space vertex positions of a named mesh node. */
function points(name) {
  const node = doc.getRoot().listNodes().find((n) => n.getName() === name);
  if (!node) throw new Error(`No node ${name}`);
  const m = node.getWorldMatrix();
  const out = [];
  for (const prim of node.getMesh().listPrimitives()) {
    const pos = prim.getAttribute('POSITION');
    const v = [0, 0, 0];
    for (let i = 0; i < pos.getCount(); i++) {
      pos.getElement(i, v);
      out.push([
        m[0] * v[0] + m[4] * v[1] + m[8] * v[2] + m[12],
        m[1] * v[0] + m[5] * v[1] + m[9] * v[2] + m[13],
        m[2] * v[0] + m[6] * v[1] + m[10] * v[2] + m[14],
      ]);
    }
  }
  return out;
}

const r = (p) => p.map((x) => +x.toFixed(3));
const centroid = (ps) => r(ps.reduce((a, p) => a.map((x, i) => x + p[i]), [0, 0, 0]).map((x) => x / ps.length));
const extreme = (ps, axis, sign) => r(ps.reduce((best, p) => (sign * p[axis] > sign * best[axis] ? p : best)));

const body = ['Paint', 'Carbon', 'Carbon2', 'Coloured', 'PaintBlack', 'Base'].flatMap(points);
const rear = body.filter((p) => p[2] < -1.7);
const front = body.filter((p) => p[2] > 1.9 && p[1] < 0.35);
const lights = points('Lights');

console.log(JSON.stringify({
  bodyMaxZ: extreme(body, 2, 1),
  bodyMinZ: extreme(body, 2, -1),
  wingTop: extreme(rear, 1, 1),
  wingTopCentre: centroid(rear.filter((p) => p[1] > extreme(rear, 1, 1)[1] - 0.04)),
  splitterLeading: extreme(front, 2, 1),
  splitterCentre: centroid(front.filter((p) => Math.abs(p[0]) < 0.4 && p[1] < 0.2)),
  headlightLeft: centroid(lights.filter((p) => p[2] > 1.3 && p[0] > 0.2)),
  taillightLeft: centroid(points('Taillights').filter((p) => p[0] > 0.2)),
  engineTop: extreme(points('Engine'), 1, 1),
  engineCentre: centroid(points('Engine')),
  coverCentre: centroid(points('Carbon2')),
}, null, 1));
