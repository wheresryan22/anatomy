// Mobile equipment and people: counterbalance forklift, articulated figures, truck.

import * as THREE from 'three';
import { Assembly, GEO, cachedGeo } from '../core/kit.js';

const capsule = (r, h) => cachedGeo(`cap|${r}|${h}`, () => new THREE.CapsuleGeometry(r, h, 4, 12));

// Seated or standing figure drawn into an assembly, feet at y.
export function figure(a, x, y, z, ry = 0, pose = 'stand', o = {}) {
  const L = o.layer || 'dark';
  a.at(x, y, z, ry, () => {
    if (pose === 'seated') {
      for (const sz of [-0.1, 0.1]) {
        a.add(capsule(0.065, 0.32), 0.18, 0.45, sz, { rz: Math.PI / 2, layer: L });
        a.add(capsule(0.06, 0.34), 0.36, 0.22, sz, { layer: L });
      }
      a.add(capsule(0.16, 0.3), -0.02, 0.8, 0, { layer: L });
      a.add(capsule(0.05, 0.3), 0.12, 0.85, 0.22, { rz: 1.0, layer: L });
      a.add(capsule(0.05, 0.3), 0.12, 0.85, -0.22, { rz: 1.0, layer: L });
      a.sph(0, 1.2, 0, 0.11, { layer: L });
      a.dome(0, 1.25, 0, 0.125, { layer: 'body' });
      return;
    }
    const step = o.step || 0;
    for (const s of [-1, 1]) {
      a.add(capsule(0.07, 0.68), step * s * 0.08, 0.45, s * 0.1, { rz: step * s * 0.18, layer: L });
      a.add(capsule(0.05, 0.5), -step * s * 0.06, 1.12, s * 0.24, { rz: -step * s * 0.2, rx: s * 0.08, layer: L });
    }
    a.add(capsule(0.17, 0.42), 0, 1.13, 0, { layer: L });
    a.box(0, 1.17, 0, 0.36, 0.05, 0.36, { layer: 'body', edges: false });
    a.sph(0, 1.6, 0, 0.11, { layer: L });
    a.dome(0, 1.64, 0, 0.125, { layer: 'body' });
    a.cyl(0.05, 1.645, 0, 0.14, 0.01, { layer: 'body', seg: 20 });
    if (pose === 'work') a.add(capsule(0.05, 0.42), 0.25, 1.25, 0.2, { rz: 1.25, layer: L });
  });
}

// Counterbalance forklift; origin under the front axle, forks toward +X.
export function forklift(eq) {
  eq.body((a) => {
    a.rblk(-0.72, 0.16, 0, 1.6, 0.74, 1.08, 0.1, { layer: 'body' });
    a.rblk(-1.42, 0.14, 0, 0.5, 0.98, 1.1, 0.2, { layer: 'dark' });
    for (const sz of [-1, 1]) {
      a.cyl(0, 0.3, sz * 0.44, 0.3, 0.22, { axis: 'z', layer: 'rubber', seg: 24 });
      a.cyl(0, 0.3, sz * 0.555, 0.15, 0.02, { axis: 'z', layer: 'steel', seg: 16 });
      a.cyl(-1.28, 0.23, sz * 0.42, 0.23, 0.18, { axis: 'z', layer: 'rubber', seg: 22 });
      a.cyl(-1.28, 0.23, sz * 0.515, 0.11, 0.02, { axis: 'z', layer: 'steel', seg: 14 });
      a.box(0, 0.62, sz * 0.44, 0.7, 0.04, 0.26, { layer: 'body' });
    }
    // overhead guard
    for (const sz of [-1, 1]) {
      a.rod([0.0, 0.88, sz * 0.47], [-0.18, 2.15, sz * 0.47], 0.06, { layer: 'dark' });
      a.rod([-1.12, 0.95, sz * 0.47], [-1.12, 2.15, sz * 0.47], 0.06, { layer: 'dark' });
      a.rod([-0.18, 2.15, sz * 0.47], [-1.12, 2.15, sz * 0.47], 0.05, { layer: 'dark' });
    }
    for (let k = 0; k < 6; k++) a.box(-0.28 - k * 0.15, 2.15, 0, 0.05, 0.02, 0.94, { layer: 'dark' });
    // seat, steering, dash
    a.rblk(-0.86, 0.92, 0, 0.46, 0.1, 0.48, 0.06, { layer: 'dark' });
    a.box(-1.08, 1.22, 0, 0.08, 0.5, 0.46, { layer: 'dark', rz: 0.15 });
    a.box(-0.2, 1.0, 0, 0.3, 0.18, 0.7, { layer: 'body', rz: 0.4 });
    a.rod([-0.3, 1.0, 0], [-0.42, 1.35, 0], 0.05, { layer: 'dark' });
    a.ring(-0.44, 1.38, 0, 0.17, 0.016, { axis: 'y', rz: 0.35, layer: 'dark' });
    figure(a, -0.82, 0.62, 0, 0, 'seated');
    // outer mast and tilt cylinders
    for (const sz of [-1, 1]) {
      a.blk(0.32, 0.1, sz * 0.3, 0.09, 2.1, 0.12, { layer: 'dark' });
      a.rod([-0.05, 0.75, sz * 0.36], [0.28, 0.95, sz * 0.36], 0.06, { layer: 'steel' });
    }
    a.blk(0.32, 2.1, 0, 0.09, 0.08, 0.72, { layer: 'dark' });
    a.blk(0.32, 0.4, 0, 0.09, 0.08, 0.72, { layer: 'dark' });
  });
  const inner = eq.part((a) => {
    for (const sz of [-1, 1]) a.blk(0.42, 0, sz * 0.24, 0.07, 2.0, 0.1, { layer: 'dark' });
    a.blk(0.42, 1.92, 0, 0.07, 0.08, 0.56, { layer: 'dark' });
    a.rod([0.4, 0.2, 0], [0.4, 1.6, 0], 0.08, { layer: 'steel' });
  });
  const carriage = eq.part((a) => {
    a.blk(0.5, 0, 0, 0.06, 0.42, 0.95, { layer: 'dark' });
    for (let k = 0; k < 5; k++) a.blk(0.5, 0.42, -0.4 + k * 0.2, 0.04, 0.62, 0.04, { layer: 'dark' });
    a.blk(0.5, 1.02, 0, 0.04, 0.04, 0.95, { layer: 'dark' });
    for (const sz of [-0.3, 0.3]) {
      a.blk(0.56, 0, sz, 0.05, 0.5, 0.12, { layer: 'steel' });
      a.blk(1.1, -0.04, sz, 1.1, 0.045, 0.12, { layer: 'steel' });
    }
  });
  eq.live = { inner, carriage };
  eq.light(-0.65, 2.18, 0);
  eq.anchor.set(-0.5, 2.9, 0);
  eq.setLift = (h) => {
    carriage.position.y = 0.09 + h;
    inner.position.y = Math.max(0, h - 1.2) * 0.9;
  };
  eq.setLift(0.06);
}

// Tractor with a box semi-trailer; origin at the trailer's rear centre, body toward +X.
export function truck(mats) {
  const a = new Assembly();
  const tl = 13.6;
  a.blk(tl / 2, 1.2, 0, tl, 2.75, 2.55, { layer: 'body' });
  for (let k = 1; k < 12; k++) a.box(tl * (k / 12), 2.575, 1.28, 0.02, 2.7, 0.01, { layer: 'dark', edges: false });
  a.blk(tl / 2, 0.95, 0, tl - 0.4, 0.25, 1.0, { layer: 'dark' });
  for (const sx of [0.9, 2.2, 3.5]) for (const sz of [-1, 1]) a.cyl(sx, 0.52, sz * 0.95, 0.52, 0.36, { axis: 'z', layer: 'rubber', seg: 24 });
  for (const sz of [-1, 1]) a.blk(9.6, 0, sz * 0.8, 0.12, 0.95, 0.12, { layer: 'dark' });
  a.blk(0.02, 1.2, 0, 0.06, 2.75, 2.55, { layer: 'dark' });
  // tractor
  a.at(tl + 1.0, 0, 0, 0, () => {
    a.blk(0.3, 0.6, 0, 3.4, 0.4, 1.1, { layer: 'dark' });
    a.blk(1.6, 0.9, 0, 2.1, 2.7, 2.5, { layer: 'body' });
    a.box(2.66, 2.85, 0, 0.02, 1.0, 2.3, { layer: 'glass' });
    for (const sz of [-1, 1]) a.box(1.6, 2.85, sz * 1.255, 1.4, 0.9, 0.01, { layer: 'glass' });
    a.blk(1.6, 3.6, 0, 1.9, 0.5, 2.3, { layer: 'body' });
    for (const [sx, r] of [[2.0, 0.52], [-0.4, 0.52], [-1.6, 0.52]]) for (const sz of [-1, 1]) a.cyl(sx, r, sz * 0.95, r, 0.36, { axis: 'z', layer: 'rubber', seg: 24 });
  });
  const g = a.build(mats);
  return g;
}

// A walking person with hip, knee and shoulder joints; faces +X, feet at y = 0.
// Drive it with walkPose(w, phase): one full cycle of `phase` (2π) is two steps.
export function walker(mats) {
  const L = 'dark';
  const g = new THREE.Group();
  const build = (fn, parent) => { const a = new Assembly(); fn(a); const m = a.build(mats); parent.add(m); return m; };
  const body = new THREE.Group();
  g.add(body);
  build((a) => {
    a.add(capsule(0.17, 0.42), 0, 1.13, 0, { layer: L });
    a.box(0, 1.17, 0, 0.36, 0.05, 0.36, { layer: 'body', edges: false });
    a.add(capsule(0.12, 0.1), 0, 0.86, 0, { layer: L });
    a.sph(0, 1.6, 0, 0.11, { layer: L });
    a.dome(0, 1.64, 0, 0.125, { layer: 'body' });
    a.cyl(0.05, 1.645, 0, 0.14, 0.01, { layer: 'body', seg: 20 });
  }, body);
  const legs = [-1, 1].map((s) => {
    const hip = new THREE.Group();
    hip.position.set(0, 0.86, s * 0.1);
    body.add(hip);
    build((a) => a.add(capsule(0.075, 0.3), 0, -0.22, 0, { layer: L }), hip);
    const knee = new THREE.Group();
    knee.position.set(0, -0.44, 0);
    hip.add(knee);
    build((a) => {
      a.add(capsule(0.065, 0.3), 0, -0.2, 0, { layer: L });
      a.box(0.05, -0.41, 0, 0.24, 0.07, 0.1, { layer: L });
    }, knee);
    return { hip, knee };
  });
  const arms = [-1, 1].map((s) => {
    const sh = new THREE.Group();
    sh.position.set(0, 1.4, s * 0.24);
    body.add(sh);
    build((a) => a.add(capsule(0.05, 0.5), 0, -0.3, 0, { layer: L }), sh);
    return sh;
  });
  return { group: g, body, legs, arms };
}

export function walkPose(w, phase) {
  w.legs.forEach(({ hip, knee }, i) => {
    const p = phase + i * Math.PI;
    hip.rotation.z = 0.42 * Math.sin(p);
    knee.rotation.z = -0.75 * Math.max(0, Math.cos(p));
  });
  w.arms.forEach((sh, i) => { sh.rotation.z = -0.35 * Math.sin(phase + i * Math.PI); });
  // the body rises over the standing leg twice per cycle
  w.body.position.y = 0.03 * Math.abs(Math.cos(phase)) - 0.03;
}

// A person as its own movable group.
export function person(mats, pose = 'stand', o = {}) {
  const a = new Assembly();
  figure(a, 0, 0, 0, 0, pose, o);
  return a.build(mats);
}
