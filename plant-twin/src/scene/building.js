// Production hall: steel portal frames on a 6 m grid, translucent cladding that
// fades on the camera side, roof, doors and docks, floor markings, grid axes.

import * as THREE from 'three';
import { Assembly, GEO } from '../core/kit.js';
import { HALL, ZONES, AXES_X, AXES_Z } from '../plant/layout.js';

const { x0: X0, x1: X1, z0: Z0, z1: Z1, eave: EAVE, ridge: RIDGE } = HALL;
const ZM = (Z0 + Z1) / 2;

function roofY(z) {
  return EAVE + (RIDGE - EAVE) * (1 - Math.abs(z - ZM) / (ZM - Z0));
}

function textTexture(lines, o = {}) {
  const pad = 24, size = o.size || 64;
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d');
  const font = `${o.weight || 600} ${size}px "IBM Plex Sans Condensed", "Arial Narrow", sans-serif`;
  ctx.font = font;
  const w = Math.max(...lines.map((l) => ctx.measureText(l).width));
  c.width = Math.ceil(w + pad * 2);
  c.height = Math.ceil(lines.length * size * 1.15 + pad * 2);
  ctx.font = font;
  ctx.fillStyle = o.color || '#5b646a';
  ctx.textBaseline = 'top';
  lines.forEach((l, i) => ctx.fillText(l, pad, pad + i * size * 1.15));
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 8;
  t.colorSpace = THREE.SRGBColorSpace;
  return { tex: t, aspect: c.width / c.height };
}

function bubbleTexture(label, color) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  ctx.strokeStyle = color;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(64, 64, 56, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.font = '600 56px "IBM Plex Sans Condensed", "Arial Narrow", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, 64, 68);
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 8;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function flatLabel(group, tex, w, h, x, z, ry = 0, y = 0.012) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
  m.rotation.x = -Math.PI / 2;
  m.rotation.z = ry;
  m.position.set(x, y, z);
  m.renderOrder = 1;
  group.add(m);
  return m;
}

export function buildHall(look) {
  const root = new THREE.Group();
  root.name = 'building';
  const p = look.p;

  // ground and slab
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(420, 300), new THREE.MeshStandardMaterial({ color: p.ground, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(36, -0.02, 18);
  ground.receiveShadow = true;
  ground.name = 'ground';
  root.add(ground);
  const slab = new THREE.Mesh(new THREE.PlaneGeometry(X1 - X0, Z1 - Z0), new THREE.MeshStandardMaterial({ color: p.floor, roughness: 0.95 }));
  slab.rotation.x = -Math.PI / 2;
  slab.position.set((X0 + X1) / 2, 0, ZM);
  slab.receiveShadow = true;
  slab.name = 'slab';
  root.add(slab);

  // aprons and pads outside
  const apronMat = new THREE.MeshStandardMaterial({ color: '#d3d6d1', roughness: 1 });
  for (const [x, z, w, d] of [[91, 46, 18, 20], [-32, 27, 16, 12], [40, -5, 16, 9], [62, -5, 12, 9]]) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), apronMat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, -0.005, z);
    m.receiveShadow = true;
    m.name = 'apron';
    root.add(m);
  }

  // slab joints on the 6 m grid
  const jp = [];
  for (let x = X0; x <= X1 + 0.01; x += 3) jp.push(x, 0.004, Z0, x, 0.004, Z1);
  for (let z = Z0; z <= Z1 + 0.01; z += 3) jp.push(X0, 0.004, z, X1, 0.004, z);
  const joints = new THREE.LineSegments(
    new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(jp, 3)),
    new THREE.LineBasicMaterial({ color: p.floorLine, transparent: true, opacity: 0.7 }),
  );
  joints.name = 'joints';
  root.add(joints);

  // painted zone borders, walkways and zone names
  const paint = look.createSet('paint');
  const marks = new Assembly();
  for (const zn of ZONES) {
    if (zn.outdoor) continue;
    const { x0, x1, z0, z1 } = zn;
    const w = 0.07;
    marks.box((x0 + x1) / 2, 0.006, z0, x1 - x0, 0.004, w, { layer: 'dark', edges: false });
    marks.box((x0 + x1) / 2, 0.006, z1, x1 - x0, 0.004, w, { layer: 'dark', edges: false });
    marks.box(x0, 0.006, (z0 + z1) / 2, w, 0.004, z1 - z0, { layer: 'dark', edges: false });
    marks.box(x1, 0.006, (z0 + z1) / 2, w, 0.004, z1 - z0, { layer: 'dark', edges: false });
  }
  // pedestrian walkway along the central aisle, dashed
  for (const z of [14.3, 21.7]) for (let x = 0.5; x < 68; x += 1.2) marks.box(x + 0.4, 0.006, z, 0.8, 0.004, 0.1, { layer: 'dark', edges: false });
  const markings = marks.build(paint, { edges: false, castShadow: false });
  markings.name = 'floor-markings';
  root.add(markings);

  const zoneLabels = new THREE.Group();
  zoneLabels.name = 'zone-labels';
  for (const zn of ZONES) {
    if (zn.outdoor) continue;
    const { tex, aspect } = textTexture([`${zn.code}  ${zn.name.toUpperCase()}`], { size: 72, color: p.paintText, weight: 600 });
    const h = zn.labelH || 0.9;
    flatLabel(zoneLabels, tex, h * aspect, h, zn.x0 + 0.4 + (h * aspect) / 2, zn.z0 + 0.3 + h / 2);
  }
  root.add(zoneLabels);

  // grid axes with bubbles
  const axes = new THREE.Group();
  axes.name = 'axes';
  const ap = [];
  AXES_X.forEach(({ x, label }) => {
    ap.push(x, 0.01, Z1 + 0.5, x, 0.01, Z1 + 4.2);
    ap.push(x, 0.01, Z0 - 0.5, x, 0.01, Z0 - 1.6);
    flatLabel(axes, bubbleTexture(label, p.paint), 1.6, 1.6, x, Z1 + 5.0);
  });
  AXES_Z.forEach(({ z, label }) => {
    ap.push(X0 - 0.5, 0.01, z, X0 - 4.2, 0.01, z);
    flatLabel(axes, bubbleTexture(label, p.paint), 1.6, 1.6, X0 - 5.0, z);
  });
  axes.add(new THREE.LineSegments(
    new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(ap, 3)),
    new THREE.LineDashedMaterial({ color: p.paint, dashSize: 0.6, gapSize: 0.3, transparent: true, opacity: 0.8 }),
  ));
  axes.children[axes.children.length - 1].computeLineDistances();
  root.add(axes);

  // steel structure: columns and walls in one assembly, the roof frame in another
  const smats = look.createSet('struct');
  const s = new Assembly('struct');
  const rs = new Assembly('struct');
  const lum = new Assembly('struct');
  for (let x = X0; x <= X1 + 0.01; x += 6) {
    for (const z of [Z0, ZM, Z1]) {
      const zc = z === Z0 ? Z0 + 0.25 : z === Z1 ? Z1 - 0.25 : ZM;
      const h = z === ZM ? RIDGE - 0.35 : EAVE;
      s.add(GEO.ibeam(0.45, 0.25, 0.012, 0.018, h), x, h / 2, zc, { rx: -Math.PI / 2 });
      s.blk(x, 0, zc, 0.55, 0.03, 0.65);
    }
    for (const [za, zb] of [[Z0, ZM], [ZM, Z1]]) {
      const ya = roofY(za) - 0.3, yb = roofY(zb) - 0.3;
      const len = Math.hypot(zb - za, yb - ya);
      rs.add(GEO.ibeam(0.6, 0.22, 0.01, 0.016, len), x, (ya + yb) / 2, (za + zb) / 2, { rx: -Math.atan2(yb - ya, zb - za) });
    }
    rs.bar([x, EAVE - 1.6, Z0 + 0.3], [x, EAVE - 0.25, Z0 + 1.8], 0.1);
    rs.bar([x, EAVE - 1.6, Z1 - 0.3], [x, EAVE - 0.25, Z1 - 1.8], 0.1);
  }
  // eave beams stay with the walls; purlins and ridge go with the roof
  for (const z of [Z0 + 0.1, Z1 - 0.1]) s.box((X0 + X1) / 2, EAVE - 0.1, z, X1 - X0, 0.2, 0.1);
  for (const [za, zb] of [[Z0, ZM], [ZM, Z1]]) {
    for (let i = 1; i <= 10; i++) {
      const z = za + ((zb - za) * i) / 10;
      if (za === ZM && i === 10) continue;
      rs.box((X0 + X1) / 2, roofY(z) - 0.02, z, X1 - X0, 0.18, 0.07);
    }
  }
  // wall girts and wall bracing in the end bays
  for (const y of [2.6, 5.2, 7.8]) {
    for (const z of [Z0 + 0.05, Z1 - 0.05]) s.box((X0 + X1) / 2, y, z, X1 - X0, 0.16, 0.06);
    for (const x of [X0 + 0.05, X1 - 0.05]) s.box(x, y, ZM, 0.06, 0.16, Z1 - Z0);
  }
  for (const [xa, xb] of [[X0, X0 + 6], [X1 - 6, X1]]) {
    for (const z of [Z0 + 0.05, Z1 - 0.05]) {
      s.rod([xa, 0.4, z], [xb, EAVE - 0.5, z], 0.04);
      s.rod([xb, 0.4, z], [xa, EAVE - 0.5, z], 0.04);
    }
    for (const [za, zb] of [[Z0, ZM], [ZM, Z1]]) {
      rs.rod([xa, roofY(za) - 0.2, za], [xb, roofY(zb) - 0.2, zb], 0.035);
      rs.rod([xb, roofY(za) - 0.2, za], [xa, roofY(zb) - 0.2, zb], 0.035);
    }
  }
  // high-bay LED luminaires hang from the roof frame
  for (let x = X0 + 3; x < X1; x += 6) {
    for (const z of [4.5, 13.5, 22.5, 31.5]) {
      const y = roofY(z) - 1.6;
      lum.rod([x, y + 0.2, z], [x, roofY(z) - 0.35, z], 0.012, { edges: false });
      lum.lathe(x, y, z, [[0.0001, 0], [0.24, 0.0], [0.2, 0.1], [0.08, 0.18], [0.08, 0.2]], { seg: 20 });
    }
  }
  // plinth
  for (const z of [Z0 + 0.1, Z1 - 0.1]) s.box((X0 + X1) / 2, 0.3, z, X1 - X0, 0.6, 0.2);
  for (const x of [X0 + 0.1, X1 - 0.1]) s.box(x, 0.3, ZM, 0.2, 0.6, Z1 - Z0);
  // utilities room enclosure
  s.box(6, 2.0, 6.5, 0.2, 4.0, 13);
  s.box(3, 2.0, 13, 6, 4.0, 0.2);
  s.box(3, 4.05, 6.5, 6.2, 0.1, 13.2);
  const frame = s.build(smats);
  frame.name = 'steel-frame';
  root.add(frame);
  const roofFrame = rs.build(smats);
  const luminaires = lum.build(smats);
  luminaires.name = 'luminaires';
  roofFrame.add(luminaires);
  roofFrame.name = 'roof-frame';
  roofFrame.visible = false;
  root.add(roofFrame);

  // cladding: one translucent set per face so the near side can fade out
  const faces = [];
  const face = (name, normal, fn) => {
    const m = look.createSet('clad');
    const a = new Assembly('glass');
    fn(a);
    const g = a.build(m, { castShadow: false });
    g.name = name;
    root.add(g);
    faces.push({ name, normal: new THREE.Vector3(...normal), mats: m, group: g });
  };
  const doorPanel = (a, x, z, w, h, along) => {
    const o = along === 'x' ? {} : { ry: Math.PI / 2 };
    a.box(x, h / 2, z, w, h, 0.06, { ...o, layer: 'body' });
    for (let k = 1; k < Math.round(h / 0.6); k++) a.box(x, k * 0.6, z, w, 0.02, 0.08, { ...o, layer: 'dark', edges: false });
  };
  face('north', [0, 0, -1], (a) => {
    a.box((X0 + X1) / 2, (EAVE + 0.6) / 2, Z0, X1 - X0, EAVE - 0.6, 0.04, { layer: 'cladding' });
    for (let x = X0 + 3; x < X1; x += 6) a.box(x, 6.9, Z0 - 0.02, 4.6, 1.2, 0.02, { layer: 'glass' });
  });
  face('south', [0, 0, 1], (a) => {
    a.box((X0 + X1) / 2, (EAVE + 0.6) / 2, Z1, X1 - X0, EAVE - 0.6, 0.04, { layer: 'cladding' });
    for (let x = X0 + 3; x < X1; x += 6) a.box(x, 6.9, Z1 + 0.02, 4.6, 1.2, 0.02, { layer: 'glass' });
    for (const x of [88.5, 93.0]) doorPanel(a, x, Z1 + 0.05, 3.0, 3.4, 'x');
  });
  face('west', [-1, 0, 0], (a) => {
    const sh = new THREE.Shape();
    sh.moveTo(Z0, 0.6); sh.lineTo(Z1, 0.6); sh.lineTo(Z1, EAVE); sh.lineTo(ZM, RIDGE); sh.lineTo(Z0, EAVE); sh.closePath();
    a.add(GEO.prism('gable', () => sh, 0.04, 1), X0, 0, 0, { ry: -Math.PI / 2, layer: 'cladding' });
    doorPanel(a, X0 - 0.05, 27, 3.2, 3.6, 'z');
  });
  face('east', [1, 0, 0], (a) => {
    const sh = new THREE.Shape();
    sh.moveTo(Z0, 0.6); sh.lineTo(Z1, 0.6); sh.lineTo(Z1, EAVE); sh.lineTo(ZM, RIDGE); sh.lineTo(Z0, EAVE); sh.closePath();
    a.add(GEO.prism('gable', () => sh, 0.04, 1), X1, 0, 0, { ry: -Math.PI / 2, layer: 'cladding' });
  });
  // fire wall between the raw store and the hall, with two door openings
  face('firewall', [0, 0, 0], (a) => {
    const sh = new THREE.Shape();
    sh.moveTo(Z0, 0); sh.lineTo(Z1, 0); sh.lineTo(Z1, EAVE); sh.lineTo(ZM, RIDGE); sh.lineTo(Z0, EAVE); sh.closePath();
    for (const [za, zb, h] of [[15, 21, 4.2], [25.5, 28.5, 3.6]]) {
      const hole = new THREE.Path();
      hole.moveTo(za, 0.05); hole.lineTo(za, h); hole.lineTo(zb, h); hole.lineTo(zb, 0.05); hole.closePath();
      sh.holes.push(hole);
    }
    a.add(GEO.prism('firewall', () => sh, 0.2, 1), 0, 0, 0, { ry: -Math.PI / 2, layer: 'cladding' });
    for (const z of [15, 21, 25.5, 28.5]) a.blk(0, 0, z, 0.3, z < 22 ? 4.2 : 3.6, 0.12, { layer: 'struct' });
    a.blk(0, 4.2, 18, 0.3, 0.12, 6.2, { layer: 'struct' });
    a.blk(0, 3.6, 27, 0.3, 0.12, 3.2, { layer: 'struct' });
  });
  faces[faces.length - 1].fixed = true;

  // roof sheeting (toggle)
  const roofMats = look.createSet('clad');
  const r = new Assembly('cladding');
  for (const [za, zb] of [[Z0, ZM], [ZM, Z1]]) {
    const ya = roofY(za) + 0.08, yb = roofY(zb) + 0.08;
    r.box((X0 + X1) / 2, (ya + yb) / 2, (za + zb) / 2, X1 - X0 + 0.6, 0.04, Math.hypot(zb - za, yb - ya) + 0.3, { rx: -Math.atan2(yb - ya, zb - za) });
  }
  const roof = r.build(roofMats, { castShadow: false });
  roof.name = 'roof';
  roof.visible = false;
  root.add(roof);

  // docks: levellers, bumpers, shelters
  const dock = new Assembly();
  for (const x of [88.5, 93.0]) {
    dock.blk(x, -0.01, Z1 - 1.3, 2.0, 0.02, 2.4, { layer: 'dark' });
    for (const sx of [-1, 1]) {
      dock.blk(x + sx * 1.0, 0.1, Z1 + 0.2, 0.25, 0.3, 0.12, { layer: 'rubber' });
      dock.blk(x + sx * 1.75, 0, Z1 + 0.55, 0.3, 3.8, 1.0, { layer: 'dark' });
    }
    dock.blk(x, 3.8, Z1 + 0.55, 3.8, 0.6, 1.0, { layer: 'dark' });
  }
  dock.blk(X0 - 0.55, 0, 27, 1.0, 3.9, 3.8, { layer: 'dark' });
  const docks = dock.build(smats);
  docks.name = 'docks';
  root.add(docks);

  return { root, faces, roof, roofFrame, zoneLabels, axes };
}

export { roofY };
