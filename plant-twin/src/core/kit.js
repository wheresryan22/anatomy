// Geometry kit: describes a machine as many small primitives, then merges them
// into one mesh per material layer plus one LineSegments of feature edges.
// A machine of a thousand parts costs a handful of draw calls.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const EDGE_ANGLE = 28;
const UP = new THREE.Vector3(0, 1, 0);
const ONE = new THREE.Vector3(1, 1, 1);

const r4 = (v) => (typeof v === 'number' ? Math.round(v * 1e4) / 1e4 : v);
const key = (...a) => a.map(r4).join('|');

const BASE = new Map();
const EDGES = new Map();

function normalize(g) {
  const n = g.index ? g.toNonIndexed() : g;
  for (const name of Object.keys(n.attributes)) {
    if (name !== 'position' && name !== 'normal') n.deleteAttribute(name);
  }
  if (!n.getAttribute('normal')) n.computeVertexNormals();
  n.clearGroups();
  return n;
}

export function cachedGeo(k, make) {
  let g = BASE.get(k);
  if (!g) {
    g = normalize(make());
    g.userData.k = k;
    BASE.set(k, g);
  }
  return g;
}

function edgesOf(g) {
  let e = EDGES.get(g.userData.k);
  if (!e) {
    const eg = new THREE.EdgesGeometry(g, EDGE_ANGLE);
    e = eg.attributes.position.array.slice();
    eg.dispose();
    EDGES.set(g.userData.k, e);
  }
  return e;
}

export function roundedRect(w, d, r) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -d / 2;
  r = Math.min(r, w / 2, d / 2);
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + d - r);
  s.quadraticCurveTo(x + w, y + d, x + w - r, y + d);
  s.lineTo(x + r, y + d);
  s.quadraticCurveTo(x, y + d, x, y + d - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

function iShape(h, b, tw, tf) {
  const s = new THREE.Shape();
  s.moveTo(-b / 2, -h / 2);
  s.lineTo(b / 2, -h / 2);
  s.lineTo(b / 2, -h / 2 + tf);
  s.lineTo(tw / 2, -h / 2 + tf);
  s.lineTo(tw / 2, h / 2 - tf);
  s.lineTo(b / 2, h / 2 - tf);
  s.lineTo(b / 2, h / 2);
  s.lineTo(-b / 2, h / 2);
  s.lineTo(-b / 2, h / 2 - tf);
  s.lineTo(-tw / 2, h / 2 - tf);
  s.lineTo(-tw / 2, -h / 2 + tf);
  s.lineTo(-b / 2, -h / 2 + tf);
  s.closePath();
  return s;
}

function cShape(h, b, t) {
  const s = new THREE.Shape();
  s.moveTo(0, -h / 2);
  s.lineTo(b, -h / 2);
  s.lineTo(b, -h / 2 + t);
  s.lineTo(t, -h / 2 + t);
  s.lineTo(t, h / 2 - t);
  s.lineTo(b, h / 2 - t);
  s.lineTo(b, h / 2);
  s.lineTo(0, h / 2);
  s.closePath();
  return s;
}

// Base geometries. Prismatic shapes are extruded along Z and centred.
export const GEO = {
  box: (w, h, d) => cachedGeo(key('box', w, h, d), () => new THREE.BoxGeometry(w, h, d)),
  cyl: (rt, rb, h, s = 24, open = false) =>
    cachedGeo(key('cyl', rt, rb, h, s, open), () => new THREE.CylinderGeometry(rt, rb, h, s, 1, open)),
  sph: (r, ws = 18, hs = 12) => cachedGeo(key('sph', r, ws, hs), () => new THREE.SphereGeometry(r, ws, hs)),
  dome: (r, s = 24) =>
    cachedGeo(key('dome', r, s), () => new THREE.SphereGeometry(r, s, Math.max(4, s >> 2), 0, Math.PI * 2, 0, Math.PI / 2)),
  tor: (R, r, arc = Math.PI * 2, rs = 8, ts = 24) =>
    cachedGeo(key('tor', R, r, arc, rs, ts), () => new THREE.TorusGeometry(R, r, rs, ts, arc)),
  lathe: (pts, s = 32) =>
    cachedGeo(key('lathe', s, ...pts.flat()), () => new THREE.LatheGeometry(pts.map((p) => new THREE.Vector2(p[0], p[1])), s)),
  rbox: (w, h, d, r, cs = 4) =>
    cachedGeo(key('rbox', w, h, d, r, cs), () => {
      const g = new THREE.ExtrudeGeometry(roundedRect(w, d, r), { depth: h, bevelEnabled: false, curveSegments: cs });
      g.rotateX(-Math.PI / 2);
      g.translate(0, -h / 2, 0);
      return g;
    }),
  prism: (k, shapeFn, depth, cs = 12) =>
    cachedGeo(key('prism', k, depth, cs), () => {
      const g = new THREE.ExtrudeGeometry(shapeFn(), { depth, bevelEnabled: false, curveSegments: cs });
      g.translate(0, 0, -depth / 2);
      return g;
    }),
  ibeam: (h, b, tw, tf, len) => GEO.prism(key('I', h, b, tw, tf), () => iShape(h, b, tw, tf), len, 1),
  channel: (h, b, t, len) => GEO.prism(key('C', h, b, t), () => cShape(h, b, t), len, 1),
};

const AXIS_Q = {
  y: new THREE.Quaternion(),
  x: new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -Math.PI / 2),
  z: new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2),
};

const _v = new THREE.Vector3();

export class Assembly {
  constructor(layer = 'body') {
    this.items = [];
    this.stack = [new THREE.Matrix4()];
    this.layer = layer;
  }

  get T() {
    return this.stack[this.stack.length - 1];
  }

  use(layer) {
    this.layer = layer;
    return this;
  }

  push(x = 0, y = 0, z = 0, ry = 0, rx = 0, rz = 0) {
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3(x, y, z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, 'YXZ')),
      ONE,
    );
    this.stack.push(this.T.clone().multiply(m));
    return this;
  }

  pop() {
    if (this.stack.length > 1) this.stack.pop();
    return this;
  }

  // Run fn inside a local frame.
  at(x, y, z, ry, fn, rx = 0, rz = 0) {
    this.push(x, y, z, ry || 0, rx, rz);
    const prev = this.layer;
    fn(this);
    this.layer = prev;
    return this.pop();
  }

  addMatrix(g, m, o = {}) {
    this.items.push({ g, m: this.T.clone().multiply(m), layer: o.layer || this.layer, edges: o.edges !== false });
    return this;
  }

  add(g, x, y, z, o = {}) {
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(o.rx || 0, o.ry || 0, o.rz || 0, 'YXZ'));
    if (o.axis) q.multiply(AXIS_Q[o.axis]);
    const s = o.scale ? new THREE.Vector3(o.scale[0], o.scale[1], o.scale[2]) : ONE;
    return this.addMatrix(g, new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), q, s), o);
  }

  // Centre-anchored box.
  box(x, y, z, w, h, d, o) {
    return this.add(GEO.box(w, h, d), x, y, z, o);
  }

  // Bottom-anchored box: y is the underside.
  blk(x, y, z, w, h, d, o) {
    return this.add(GEO.box(w, h, d), x, y + h / 2, z, o);
  }

  rblk(x, y, z, w, h, d, r, o) {
    return this.add(GEO.rbox(w, h, d, r), x, y + h / 2, z, o);
  }

  // Centre-anchored cylinder; o.axis 'x' | 'y' | 'z', o.rt top radius.
  cyl(x, y, z, r, h, o = {}) {
    return this.add(GEO.cyl(o.rt ?? r, r, h, o.seg ?? 24, o.open), x, y, z, o);
  }

  // Profile [[radius, y], ...] revolved around the local Y axis, y is the base.
  lathe(x, y, z, pts, o = {}) {
    return this.add(GEO.lathe(pts, o.seg ?? 32), x, y, z, o);
  }

  sph(x, y, z, r, o = {}) {
    return this.add(GEO.sph(r, o.seg ?? 18, o.hs ?? 12), x, y, z, o);
  }

  dome(x, y, z, r, o = {}) {
    return this.add(GEO.dome(r, o.seg ?? 24), x, y, z, o);
  }

  // Torus ring; default lies in the XY plane, o.axis 'y' lays it flat.
  ring(x, y, z, R, r, o = {}) {
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(o.rx || 0, o.ry || 0, o.rz || 0, 'YXZ'));
    if (o.axis === 'y') q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2));
    if (o.axis === 'x') q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2));
    const g = GEO.tor(R, r, o.arc ?? Math.PI * 2, o.rs ?? 6, o.ts ?? 28);
    return this.addMatrix(g, new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), q, ONE), o);
  }

  // Straight member between two points. Square section by default, o.round for rod/pipe.
  bar(a, b, w, o = {}) {
    const A = new THREE.Vector3(a[0], a[1], a[2]);
    const B = new THREE.Vector3(b[0], b[1], b[2]);
    const dir = B.clone().sub(A);
    const L = dir.length();
    if (L < 1e-5) return this;
    dir.divideScalar(L);
    let q;
    if (Math.abs(dir.y) > 0.9999) q = new THREE.Quaternion().setFromUnitVectors(UP, dir);
    else {
      // keep the section's local X horizontal so rectangular members do not twist
      const yAxis = dir;
      const xAxis = new THREE.Vector3().crossVectors(UP, yAxis).normalize();
      const zAxis = new THREE.Vector3().crossVectors(xAxis, yAxis).normalize();
      q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis));
    }
    const g = o.round ? GEO.cyl(w / 2, w / 2, L, o.seg ?? 12) : GEO.box(w, L, o.d ?? w);
    const mid = A.add(B).multiplyScalar(0.5);
    return this.addMatrix(g, new THREE.Matrix4().compose(mid, q, ONE), o);
  }

  rod(a, b, d, o = {}) {
    return this.bar(a, b, d, { ...o, round: true });
  }

  // Polyline of rods with ball joints (handrails, conduits).
  rail(pts, d, o = {}) {
    for (let i = 0; i < pts.length - 1; i++) this.rod(pts[i], pts[i + 1], d, o);
    if (o.joints !== false) for (let i = 1; i < pts.length - 1; i++) this.sph(pts[i][0], pts[i][1], pts[i][2], d * 0.62, { seg: 8, hs: 6, ...o });
    return this;
  }

  // Pipe along a polyline. Right-angle corners get a proper bend; other corners a ball joint.
  pipe(pts, r, o = {}) {
    const P = pts.map((p) => new THREE.Vector3(p[0], p[1], p[2]));
    const n = P.length;
    const trim = new Array(n).fill(0);
    const bendR = o.bend ?? r * 3;
    const seg = o.seg ?? 16;
    for (let i = 1; i < n - 1; i++) {
      const d1 = P[i].clone().sub(P[i - 1]);
      const d2 = P[i + 1].clone().sub(P[i]);
      const l1 = d1.length(), l2 = d2.length();
      d1.normalize(); d2.normalize();
      const dot = d1.dot(d2);
      if (dot > 0.999) continue;
      if (Math.abs(dot) < 0.02) {
        const R = Math.min(bendR, l1 * 0.48, l2 * 0.48);
        trim[i] = R;
        const X = d2.clone().negate();
        const Y = d1.clone();
        const Z = new THREE.Vector3().crossVectors(X, Y);
        const C = P[i].clone().addScaledVector(d1, -R).addScaledVector(d2, R);
        const m = new THREE.Matrix4().makeBasis(X, Y, Z).setPosition(C);
        this.addMatrix(GEO.tor(R, r, Math.PI / 2, Math.max(6, seg >> 1), 8), m, o);
      } else {
        this.sph(P[i].x, P[i].y, P[i].z, r, { seg, hs: seg >> 1, ...o });
      }
    }
    for (let i = 0; i < n - 1; i++) {
      const d = P[i + 1].clone().sub(P[i]).normalize();
      const a = P[i].clone().addScaledVector(d, trim[i]);
      const b = P[i + 1].clone().addScaledVector(d, -trim[i + 1]);
      this.rod(a.toArray(), b.toArray(), r * 2, { ...o, seg });
    }
    if (o.flanges) {
      const ends = [[P[0], P[1]], [P[n - 1], P[n - 2]]];
      for (const [p, q] of ends) {
        const d = q.clone().sub(p).normalize();
        const a = p.clone().addScaledVector(d, r * 0.25);
        const b = p.clone().addScaledVector(d, r * 0.75);
        this.rod(a.toArray(), b.toArray(), r * 3.2, { ...o, seg });
      }
    }
    return this;
  }

  // Merge into meshes, one per layer, and one LineSegments of edges.
  build(mats, opts = {}) {
    const group = new THREE.Group();
    const byLayer = new Map();
    for (const it of this.items) {
      if (!byLayer.has(it.layer)) byLayer.set(it.layer, []);
      byLayer.get(it.layer).push(it);
    }
    const meshes = [];
    for (const [layer, list] of byLayer) {
      const geos = list.map((it) => it.g.clone().applyMatrix4(it.m));
      const merged = mergeGeometries(geos, false);
      for (const g of geos) g.dispose();
      merged.computeBoundingSphere();
      merged.computeBoundingBox();
      const mesh = new THREE.Mesh(merged, mats.get(layer));
      mesh.userData.layer = layer;
      mesh.castShadow = layer !== 'glass' && layer !== 'cladding' && opts.castShadow !== false;
      mesh.receiveShadow = opts.receiveShadow !== false;
      if (layer === 'glass' || layer === 'cladding') mesh.renderOrder = 2;
      group.add(mesh);
      meshes.push(mesh);
    }
    let lines = null;
    if (opts.edges !== false) {
      let count = 0;
      for (const it of this.items) if (it.edges) count += edgesOf(it.g).length;
      if (count) {
        const out = new Float32Array(count);
        let o = 0;
        for (const it of this.items) {
          if (!it.edges) continue;
          const e = edgesOf(it.g);
          const m = it.m;
          for (let i = 0; i < e.length; i += 3) {
            _v.set(e[i], e[i + 1], e[i + 2]).applyMatrix4(m);
            out[o++] = _v.x; out[o++] = _v.y; out[o++] = _v.z;
          }
        }
        const bg = new THREE.BufferGeometry();
        bg.setAttribute('position', new THREE.BufferAttribute(out, 3));
        bg.computeBoundingSphere();
        lines = new THREE.LineSegments(bg, mats.get('edge'));
        lines.raycast = () => {};
        lines.userData.isEdge = true;
        lines.renderOrder = 1;
        group.add(lines);
      }
    }
    mats.track(meshes, lines);
    group.userData.meshes = meshes;
    return group;
  }
}

// Convenience: build an assembly from a function in one call.
export function make(mats, fn, opts) {
  const a = new Assembly();
  fn(a);
  return a.build(mats, opts);
}
