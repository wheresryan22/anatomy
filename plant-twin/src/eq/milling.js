// Fine milling train per line: feed bin + mill, product cyclone, check sieve,
// pulse-jet bag filter and the system fan with its discharge stack.

import * as THREE from 'three';
import { GEO } from '../core/kit.js';
import { motor, gearbox, hopper, legs4, rotaryValve, bolts, flangeY, ladder, handrail } from './parts.js';

export function fineMill(eq) {
  const s = eq.def.side;
  eq.body((a) => {
    // feed bin on legs with airlock and feed screw
    legs4(a, -1.6, 0, 0.7, 0.7, 0, 1.72, 0.07);
    const top = hopper(a, -1.6, 1.6, 0, 0.42, 0.7, 0.45, 0.09, { layer: 'steel' });
    a.cyl(-1.6, top + 0.08, 0, 0.09, 0.16, { layer: 'steel', seg: 16 });
    flangeY(a, -1.6, top + 0.16, 0, 0.09);
    a.cyl(-1.42, top + 0.2, 0.18, 0.11, 0.4, { layer: 'dark', seg: 18 });
    for (const y of [1.95, 2.45]) a.cyl(-1.6 + 0.47, y, 0, 0.025, 0.12, { axis: 'x', layer: 'dark', seg: 8 });
    a.at(-1.6, 1.47, 0, 0, () => rotaryValve(a, 0.22));
    a.pipe([[-1.6, 1.3, 0], [0.33, 1.3, 0]], 0.075, { layer: 'steel' });
    a.at(-2.0, 1.3, 0, Math.PI, () => motor(a, 0.4, 0.09, { fins: 10 }));
    // skid
    a.blk(0, 0, 0, 2.3, 0.2, 1.3, { layer: 'dark' });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) a.cyl(sx * 1.05, 0.04, sz * 0.55, 0.07, 0.08, { layer: 'rubber', seg: 12 });
    // main motor, coupling guard, bearing housing
    a.blk(-0.45, 0.2, 0, 0.82, 0.395, 0.72, { layer: 'dark' });
    a.at(-0.45, 1.0, 0, 0, () => motor(a, 1.0, 0.3, { feet: true, feetH: 0.18, fins: 18 }));
    a.box(0.12, 1.0, 0, 0.3, 0.42, 0.46, { layer: 'body' });
    for (let k = 0; k < 4; k++) a.box(0.12, 0.84 + k * 0.1, 0.232, 0.24, 0.012, 0.004, { layer: 'dark', edges: false });
    a.cyl(0.29, 1.0, 0, 0.2, 0.12, { axis: 'x', layer: 'dark' });
    // horizontal-rotor grinding housing on a pedestal
    a.blk(0.6, 0.2, 0, 0.62, 0.22, 0.9, { layer: 'dark' });
    a.cyl(0.6, 1.0, 0, 0.62, 0.55, { axis: 'x', layer: 'body', seg: 40 });
    for (const x of [0.34, 0.86]) a.cyl(x, 1.0, 0, 0.66, 0.035, { axis: 'x', layer: 'body', seg: 40 });
    bolts(a, 0.89, 1.0, 0, 0.6, 18, 'x', 0.012);
    // front door with handwheel and hinges
    a.cyl(0.93, 1.0, 0, 0.52, 0.05, { axis: 'x', layer: 'body', seg: 36 });
    a.ring(0.98, 1.0, 0, 0.16, 0.014, { axis: 'x', layer: 'dark', ts: 24 });
    for (let k = 0; k < 4; k++) {
      const t = (k / 4) * Math.PI * 2;
      a.rod([0.98, 1.0, 0], [0.98, 1.0 + Math.sin(t) * 0.16, Math.cos(t) * 0.16], 0.014, { layer: 'dark' });
    }
    for (const y of [0.7, 1.3]) a.box(0.92, y, -0.64 * s, 0.1, 0.1, 0.1, { layer: 'dark' });
    // inlet port on the back plate
    a.cyl(0.36, 1.3, 0, 0.09, 0.08, { axis: 'x', layer: 'steel', seg: 16 });
    // integrated classifier and its drive
    a.blk(0.6, 1.52, 0, 0.5, 0.14, 0.5, { layer: 'body' });
    a.lathe(0.6, 1.66, 0, [[0.34, 0], [0.34, 0.54], [0.38, 0.54], [0.38, 0.57]], { layer: 'body', seg: 32 });
    bolts(a, 0.6, 2.235, 0, 0.35, 12, 'y', 0.01);
    a.cyl(0.6, 2.25, 0, 0.12, 0.06, { layer: 'dark' });
    a.at(0.6, 2.58, 0, 0, () => motor(a, 0.6, 0.17, { fins: 14 }), 0, -Math.PI / 2);
    // product outlet duct to the cyclone inlet
    a.pipe([[0.94, 2.0, 0], [1.5, 2.0, 0], [1.5, 4.02, 0], [1.5, 4.02, 0.3], [2.1, 4.02, 0.3]], 0.11, { layer: 'steel', bend: 0.2, flanges: true });
    // local panel
    a.blk(-0.4, 0, -0.95 * s, 0.08, 1.05, 0.08, { layer: 'dark' });
    a.blk(-0.4, 1.05, -0.95 * s, 0.55, 0.65, 0.24, { layer: 'body' });
    a.box(-0.4, 1.45, -0.95 * s - 0.125 * s, 0.32, 0.2, 0.01, { layer: 'rubber' });
  });
  eq.light(-0.2, 1.7, -0.95 * s);
  eq.anchor.set(0, 3.0, 0);
}

export function cyclone(eq) {
  eq.body((a) => {
    legs4(a, 0, 0, 1.3, 1.3, 0, 2.9, 0.1);
    for (const sz of [-1, 1]) a.blk(0, 2.82, sz * 0.65, 1.42, 0.14, 0.1, { layer: 'body' });
    for (const sx of [-1, 1]) a.blk(sx * 0.65, 2.82, 0, 0.1, 0.14, 1.42, { layer: 'body' });
    a.lathe(0, 1.25, 0, [[0.12, 0], [0.12, 0.06], [0.55, 1.6], [0.55, 3.05], [0.6, 3.05], [0.6, 3.09]], { layer: 'steel', seg: 40 });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) a.bar([sx * 0.65, 2.9, sz * 0.65], [sx * 0.4, 3.1, sz * 0.4], 0.06, { layer: 'body' });
    a.cyl(0, 4.355, 0, 0.6, 0.03, { layer: 'steel', seg: 40 });
    bolts(a, 0, 4.375, 0, 0.57, 16, 'y', 0.011);
    // tangential inlet
    a.blk(-0.5, 3.85, 0.3, 0.44, 0.34, 0.24, { layer: 'steel' });
    // vortex finder and outlet duct to the bag filter
    a.pipe([[0, 4.37, 0], [0, 5.1, 0], [1.6, 5.1, 0], [1.6, 4.2, 0], [2.2, 4.2, 0]], 0.18, { layer: 'steel', bend: 0.3 });
    flangeY(a, 0, 4.6, 0, 0.18);
    // inspection hatch, pressure tapping, knocker
    a.box(0.56, 3.6, 0, 0.04, 0.3, 0.24, { layer: 'dark' });
    a.cyl(-0.4, 2.2, 0.2, 0.02, 0.12, { layer: 'dark', seg: 8, rz: 0.5 });
    a.blk(0.3, 1.9, 0, 0.12, 0.1, 0.1, { layer: 'dark' });
    // airlock and sock to the sieve
    a.at(0, 1.1, 0, 0, () => rotaryValve(a, 0.24));
    a.cyl(0, 0.92, 0, 0.1, 0.12, { layer: 'rubber', seg: 16 });
    for (const y of [0.88, 0.94]) a.ring(0, y, 0, 0.102, 0.008, { axis: 'y', layer: 'rubber' });
  });
  eq.light(0.65, 3.0, 0.65);
  eq.anchor.set(0, 5.4, 0);
}

export function sieve(eq) {
  const s = eq.def.side;
  eq.body((a) => {
    for (let k = 0; k < 3; k++) {
      const t = (k / 3) * Math.PI * 2 + 0.3;
      a.blk(Math.cos(t) * 0.42, 0, Math.sin(t) * 0.42, 0.1, 0.18, 0.1, { layer: 'dark' });
    }
    a.ring(0, 0.2, 0, 0.42, 0.03, { axis: 'y', layer: 'dark' });
    a.cyl(0, 0.27, 0, 0.2, 0.3, { layer: 'dark', seg: 24 });
    for (let k = 0; k < 6; k++) {
      const t = (k / 6) * Math.PI * 2;
      const x = Math.cos(t) * 0.44, z = Math.sin(t) * 0.44;
      for (let i = 0; i < 4; i++) a.ring(x, 0.24 + i * 0.04, z, 0.045, 0.009, { axis: 'y', layer: 'steel', ts: 12 });
    }
    a.cyl(0, 0.425, 0, 0.52, 0.05, { layer: 'steel', seg: 40 });
    for (const [y0, h] of [[0.45, 0.12], [0.57, 0.12]]) {
      a.cyl(0, y0 + h / 2, 0, 0.5, h, { layer: 'steel', seg: 40 });
      a.ring(0, y0 + h, 0, 0.51, 0.014, { axis: 'y', layer: 'dark', ts: 36 });
    }
    a.lathe(0, 0.69, 0, [[0.5, 0], [0.5, 0.03], [0.2, 0.12], [0.08, 0.14], [0.08, 0.2]], { layer: 'steel', seg: 36 });
    // product and oversize spouts
    a.rod([0.48, 0.5, 0], [0.78, 0.36, 0], 0.11, { layer: 'steel' });
    a.blk(0.86, 0.12, 0, 0.22, 0.26, 0.22, { layer: 'steel' });
    a.rod([-0.48, 0.62, 0], [-0.72, 0.45, 0], 0.08, { layer: 'steel' });
    a.cyl(-0.85, 0.22, 0, 0.2, 0.44, { layer: 'dark', seg: 20 });
    a.cyl(-0.85, 0.45, 0, 0.21, 0.02, { layer: 'dark', seg: 20 });
  });
  eq.light(0.86, 0.38, 0.0);
  eq.anchor.set(0, 1.5, 0.4 * s);
}

export function bagFilter(eq) {
  const s = eq.def.side;
  eq.body((a) => {
    legs4(a, 0, 0, 1.5, 1.5, 0, 1.65, 0.12);
    a.add(GEO.cyl(1.131, 0.17, 0.7, 4), 0, 1.3, 0, { ry: Math.PI / 4, layer: 'body' });
    a.at(0, 0.8, 0, 0, () => rotaryValve(a, 0.22));
    a.cyl(0, 0.33, 0, 0.26, 0.5, { layer: 'dark', seg: 20 });
    a.cyl(0, 0.61, 0, 0.09, 0.08, { layer: 'rubber', seg: 14 });
    // housing, stiffeners, door and relief vent
    a.blk(0, 1.65, 0, 1.6, 3.0, 1.6, { layer: 'body' });
    for (const y of [2.4, 3.15, 3.9]) a.blk(0, y, 0, 1.66, 0.05, 1.66, { layer: 'body' });
    a.box(0.81, 2.45, 0, 0.03, 0.85, 0.6, { layer: 'body' });
    for (const y of [2.15, 2.75]) a.box(0.84, y, 0.22, 0.04, 0.06, 0.1, { layer: 'dark' });
    a.box(0, 3.55, -0.81 * s, 0.9, 0.8, 0.03, { layer: 'dark' });
    a.box(0, 3.55, -0.83 * s, 0.8, 0.7, 0.01, { layer: 'steel' });
    // inlet from the cyclone
    a.cyl(-0.9, 4.2, 0, 0.2, 0.2, { axis: 'x', layer: 'steel', seg: 20 });
    // clean-air plenum, lids, pulse-jet header with diaphragm valves
    a.blk(0, 4.65, 0, 1.6, 0.55, 1.6, { layer: 'body' });
    for (const sx of [-1, 1]) {
      a.blk(sx * 0.4, 5.2, 0, 0.78, 0.03, 1.56, { layer: 'body' });
      a.box(sx * 0.4, 5.25, 0.6, 0.2, 0.04, 0.03, { layer: 'dark' });
    }
    a.cyl(0.55, 5.47, 0, 0.11, 1.5, { axis: 'z', layer: 'steel' });
    for (const sz of [-0.6, 0.6]) a.blk(0.55, 5.23, sz, 0.08, 0.14, 0.08, { layer: 'dark' });
    for (let k = 0; k < 6; k++) {
      const z = -0.6 + k * 0.24;
      a.cyl(0.55, 5.62, z, 0.045, 0.1, { layer: 'dark', seg: 12 });
      a.blk(0.55, 5.67, z, 0.06, 0.05, 0.06, { layer: 'dark' });
      a.pipe([[0.55, 5.47, z], [0.3, 5.47, z], [0.3, 5.22, z]], 0.018, { layer: 'steel', bend: 0.06 });
    }
    a.blk(0.55, 5.23, 0.85, 0.3, 0.4, 0.12, { layer: 'body' });
    // differential pressure gauge
    a.box(-0.82, 2.0, 0.3, 0.04, 0.2, 0.2, { layer: 'dark' });
    a.cyl(-0.85, 2.0, 0.3, 0.06, 0.01, { axis: 'x', layer: 'steel', seg: 16 });
    // clean-air outlet duct to the fan
    a.pipe([[0.8, 4.92, 0], [2.2, 4.92, 0], [2.2, 4.92, 0.7], [2.2, 0.9, 0.7], [2.2, 0.9, 0.32]], 0.16, { layer: 'steel', bend: 0.26, flanges: true });
    // ladder with cage and roof rail
    ladder(a, 0, 0, 0.92 * s, 5.2, 0.45, { cage: true, cageDir: s });
    handrail(a, [-0.8, -0.8], [0.8, -0.8], 5.2, { pitch: 0.8 });
    handrail(a, [-0.8, 0.8], [-0.8, -0.8], 5.2, { pitch: 0.8 });
    handrail(a, [0.8, -0.8], [0.8, 0.8], 5.2, { pitch: 0.8 });
  });
  eq.light(0.82, 2.95, -0.4);
  eq.anchor.set(0, 6.2, 0);
}

function scrollShape() {
  const r0 = 0.42, r1 = 0.66, yTop = 0.78;
  const sh = new THREE.Shape();
  sh.moveTo(0.02, yTop);
  sh.lineTo(0.02, r0);
  const N = 48;
  for (let i = 0; i <= N; i++) {
    const th = Math.PI / 2 + (i / N) * Math.PI * 1.5;
    const r = r0 + (r1 - r0) * (i / N);
    sh.lineTo(r * Math.cos(th), r * Math.sin(th));
  }
  sh.lineTo(r1, yTop);
  sh.closePath();
  return sh;
}

export function fan(eq) {
  const s = eq.def.side;
  eq.body((a) => {
    // inertia base on spring mounts
    a.blk(0, 0.08, -0.5, 1.1, 0.14, 1.9, { layer: 'dark' });
    for (const sx of [-1, 1]) for (const sz of [-1.35, 0.35]) {
      a.cyl(sx * 0.48, 0.04, sz, 0.06, 0.08, { layer: 'steel', seg: 12 });
    }
    // volute casing
    a.add(GEO.prism('fanScroll', scrollShape, 0.45, 48), 0, 0.9, 0, { layer: 'body' });
    a.box(0.34, 1.7, 0, 0.72, 0.04, 0.55, { layer: 'body' });
    a.lathe(0, 0.9, 0.225, [[0.3, 0], [0.3, 0.025], [0.22, 0.05], [0.2, 0.08]], { rx: Math.PI / 2, layer: 'body', seg: 32 });
    a.box(0.3, 0.6, 0.23, 0.2, 0.16, 0.01, { layer: 'dark' });
    // drain and casing stand
    a.blk(0.0, 0.22, 0, 0.9, 0.06, 0.5, { layer: 'dark' });
    a.cyl(-0.1, 0.27, 0.0, 0.025, 0.1, { layer: 'steel', seg: 8 });
    // bearing pedestal, shaft, coupling guard, motor
    a.blk(0, 0.22, -0.45, 0.28, 0.58, 0.22, { layer: 'dark' });
    a.cyl(0, 0.9, -0.45, 0.11, 0.24, { axis: 'z', layer: 'dark' });
    a.rod([0, 0.9, -0.62], [0, 0.9, -0.22], 0.07, { layer: 'steel' });
    a.box(0, 0.9, -0.66, 0.3, 0.3, 0.2, { layer: 'body' });
    a.blk(0, 0.22, -1.05, 0.6, 0.28, 0.62, { layer: 'dark' });
    a.at(0, 0.9, -1.05, -Math.PI / 2, () => motor(a, 0.75, 0.26, { feet: true, feetH: 0.18, fins: 16 }));
    // discharge stack with silencer and rain cap
    a.lathe(0.34, 1.72, 0, [[0.3, 0], [0.2, 0.22]], { layer: 'steel', seg: 4, ry: Math.PI / 4 });
    a.cyl(0.34, 7.3, 0, 0.2, 11.0, { layer: 'steel', seg: 24 });
    a.cyl(0.34, 3.8, 0, 0.32, 1.6, { layer: 'steel', seg: 28 });
    for (const y of [3.0, 4.6]) a.lathe(0.34, y, 0, y < 4 ? [[0.2, -0.12], [0.32, 0]] : [[0.32, 0], [0.2, 0.12]], { layer: 'steel', seg: 28 });
    for (const y of [6.0, 8.5]) a.ring(0.34, y, 0, 0.21, 0.015, { axis: 'y', layer: 'steel', ts: 24 });
    a.cyl(0.34, 12.85, 0, 0.2, 0.1, { layer: 'steel', open: true, seg: 24 });
    a.lathe(0.34, 13.1, 0, [[0.36, 0], [0.0001, 0.2]], { layer: 'steel', seg: 24 });
    for (let k = 0; k < 3; k++) {
      const t = (k / 3) * Math.PI * 2;
      a.rod([0.34 + Math.cos(t) * 0.2, 12.8, Math.sin(t) * 0.2], [0.34 + Math.cos(t) * 0.3, 13.1, Math.sin(t) * 0.3], 0.02, { layer: 'steel' });
    }
    a.cyl(0.54, 5.4, 0, 0.03, 0.1, { axis: 'x', layer: 'dark', seg: 8 });
    // local isolator
    a.blk(0.75, 0, -1.25, 0.08, 1.2, 0.08, { layer: 'dark' });
    a.blk(0.75, 1.2, -1.25, 0.3, 0.38, 0.18, { layer: 'body' });
    a.cyl(0.75, 1.4, -1.15, 0.05, 0.04, { axis: 'z', layer: 'dark', seg: 12 });
  });
  eq.light(0.75, 1.58, -1.25);
  eq.anchor.set(0, 2.4, -0.4);
}
