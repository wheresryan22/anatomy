// Plant utilities: compressed air, cooling water, motor control, central dust extraction.

import * as THREE from 'three';
import { GEO, cachedGeo } from '../core/kit.js';
import { motor, gearbox, cabinet, stackPole, legs4, ladder, handrail, rotaryValve, bolts, flangeY } from './parts.js';

export function compressor(eq) {
  eq.body((a) => {
    a.blk(0, 0, 0, 1.6, 0.1, 1.05, { layer: 'dark' });
    a.blk(0, 0.1, 0, 1.5, 1.65, 1.0, { layer: 'body' });
    for (const sx of [-1, 0, 1]) a.box(sx * 0.5, 0.92, 0.505, 0.48, 1.55, 0.01, { layer: 'body' });
    for (let k = 0; k < 9; k++) a.box(-0.5, 0.45 + k * 0.08, 0.512, 0.36, 0.02, 0.006, { layer: 'dark', edges: false });
    for (let k = 0; k < 6; k++) a.box(0.5, 1.15 + k * 0.08, 0.512, 0.36, 0.02, 0.006, { layer: 'dark', edges: false });
    a.blk(0.35, 1.75, 0, 0.7, 0.12, 0.8, { layer: 'dark' });
    a.ring(0.35, 1.88, 0, 0.3, 0.012, { axis: 'y', layer: 'dark' });
    a.box(0.5, 0.75, 0.515, 0.2, 0.14, 0.01, { layer: 'rubber' });
    a.cyl(-0.55, 1.95, -0.3, 0.05, 0.4, { layer: 'steel', seg: 14 });
  });
  eq.light(-0.6, 1.75, 0.38);
  eq.anchor.set(0, 2.4, 0);
}

export function dryer(eq) {
  eq.body((a) => {
    a.blk(0, 0, 0, 0.75, 1.25, 0.9, { layer: 'body' });
    for (let k = 0; k < 8; k++) a.box(0, 0.3 + k * 0.08, 0.452, 0.55, 0.02, 0.006, { layer: 'dark', edges: false });
    a.box(0.2, 1.05, 0.455, 0.18, 0.1, 0.006, { layer: 'rubber' });
    a.pipe([[-0.3, 1.25, -0.2], [-0.3, 1.6, -0.2], [-1.1, 1.6, -0.2]], 0.035, { layer: 'steel', bend: 0.1 });
    for (const x of [-0.6, -0.85]) {
      a.cyl(x, 1.45, -0.2, 0.06, 0.25, { layer: 'steel', seg: 14 });
      a.cyl(x, 1.62, -0.2, 0.07, 0.06, { layer: 'dark', seg: 14 });
    }
  });
  eq.light(0.3, 1.25, 0.3);
  eq.anchor.set(-0.3, 2.2, 0);
}

export function receiver(eq) {
  eq.body((a) => {
    for (let k = 0; k < 3; k++) {
      const t = (k / 3) * Math.PI * 2;
      a.rod([Math.cos(t) * 0.4, 0, Math.sin(t) * 0.4], [Math.cos(t) * 0.36, 0.5, Math.sin(t) * 0.36], 0.07, { layer: 'dark' });
      a.blk(Math.cos(t) * 0.4, 0, Math.sin(t) * 0.4, 0.16, 0.01, 0.16, { layer: 'dark' });
    }
    a.lathe(0, 0.35, 0, [[0.0001, 0], [0.32, 0.06], [0.48, 0.2], [0.5, 0.3], [0.5, 2.3], [0.48, 2.4], [0.32, 2.54], [0.0001, 2.6]], { layer: 'steel', seg: 36 });
    a.box(0, 1.6, 0.505, 0.18, 0.12, 0.01, { layer: 'dark' });
    a.cyl(0, 3.05, 0, 0.03, 0.14, { layer: 'steel', seg: 10 });
    a.cyl(0.15, 2.85, 0.42, 0.05, 0.02, { axis: 'z', layer: 'dark', seg: 14 });
    a.lathe(-0.5, 1.3, 0, [[0.16, 0], [0.18, 0.05], [0.18, 0.3], [0.16, 0.35]], { layer: 'steel', rz: Math.PI / 2, seg: 18 });
    a.pipe([[0, 0.3, 0], [0.6, 0.3, 0]], 0.02, { layer: 'steel' });
    a.pipe([[0.45, 1.0, 0], [0.9, 1.0, 0], [0.9, 4.5, 0]], 0.04, { layer: 'steel', bend: 0.12 });
  });
  eq.anchor.set(0, 3.5, 0);
}

export function mcc(eq) {
  const n = eq.def.n ?? 8;
  eq.body((a) => {
    for (let i = 0; i < n; i++) a.at(-((n - 1) * 0.8) / 2 + i * 0.8, 0, 0, 0, () => cabinet(a, 0.8, 2.2, 0.6, { vents: i % 2 === 0, hmi: i === 0 }));
    // cable ladder tray rising from the line-up
    for (const sx of [-1, 1]) a.blk(0, 2.4, sx * 0.25, n * 0.8, 0.08, 0.02, { layer: 'dark' });
    for (let x = -(n * 0.8) / 2; x <= (n * 0.8) / 2; x += 0.3) a.blk(x, 2.4, 0, 0.03, 0.02, 0.5, { layer: 'dark', edges: false });
    for (const x of [-(n * 0.8) / 2, (n * 0.8) / 2]) for (const sz of [-1, 1]) a.rod([x, 2.48, sz * 0.25], [x, 9.0, sz * 0.25], 0.02, { layer: 'dark' });
    a.blk(-(n * 0.8) / 2 + 0.4, 2.48, 0, 0.5, 6.5, 0.02, { layer: 'dark' });
  });
  eq.light(-((n - 1) * 0.8) / 2 + 0.2, 2.22, 0.2);
  eq.anchor.set(0, 3.2, 0);
}

// Outdoor air-cooled chiller with condenser fans and pump skid.
export function chiller(eq) {
  const fans = [];
  eq.body((a) => {
    a.blk(0, 0, 0, 5.0, 0.15, 2.0, { layer: 'dark' });
    a.blk(0, 0.15, 0, 4.4, 0.12, 1.5, { layer: 'dark' });
    for (const sz of [-1, 1]) {
      a.box(-0.4, 1.2, sz * 0.62, 3.4, 1.8, 0.06, { layer: 'body', rx: sz * 0.22 });
      for (let k = 0; k < 14; k++) a.box(-0.4, 0.45 + k * 0.11, sz * (0.62 + (0.45 + k * 0.11 - 1.2) * Math.tan(0.22) * 0) + sz * 0.035, 3.3, 0.012, 0.004, { layer: 'dark', edges: false, rx: sz * 0.22 });
    }
    a.blk(-0.4, 2.1, 0, 3.4, 0.08, 1.5, { layer: 'body' });
    for (const x of [-1.5, -0.4, 0.7]) {
      a.lathe(x, 2.18, 0, [[0.5, 0], [0.5, 0.05], [0.46, 0.08], [0.46, 0.38], [0.5, 0.42]], { layer: 'body', seg: 32 });
      a.ring(x, 2.62, 0, 0.46, 0.01, { axis: 'y', layer: 'dark', ts: 32 });
      a.ring(x, 2.62, 0, 0.28, 0.01, { axis: 'y', layer: 'dark', ts: 28 });
      a.rod([x - 0.46, 2.62, 0], [x + 0.46, 2.62, 0], 0.012, { layer: 'dark' });
      a.rod([x, 2.62, -0.46], [x, 2.62, 0.46], 0.012, { layer: 'dark' });
      a.cyl(x, 2.4, 0, 0.12, 0.18, { layer: 'dark', seg: 16 });
      fans.push(x);
    }
    // compressor bay and control panel
    a.blk(1.85, 0.27, 0, 1.1, 1.75, 1.5, { layer: 'body' });
    for (const sz of [-1, 1]) for (let k = 0; k < 6; k++) a.box(1.85, 0.6 + k * 0.18, sz * 0.755, 0.9, 0.03, 0.006, { layer: 'dark', edges: false });
    a.box(2.41, 1.3, 0.3, 0.01, 0.6, 0.5, { layer: 'dark' });
    // pump skid
    a.at(2.95, 0.15, 0, 0, () => {
      a.blk(0, 0, 0, 0.9, 0.08, 1.6, { layer: 'dark' });
      for (const sz of [-0.4, 0.4]) {
        a.cyl(0, 0.4, sz, 0.17, 0.2, { axis: 'x', layer: 'body', seg: 20 });
        a.at(0.3, 0.4, sz, 0, () => motor(a, 0.42, 0.13, { fins: 12 }));
        a.pipe([[0, 0.57, sz], [0, 0.9, sz], [-0.6, 0.9, sz]], 0.05, { layer: 'steel', bend: 0.12 });
      }
    });
  });
  const blades = fans.map((x) => {
    const g = new THREE.Group();
    g.position.set(x, 2.5, 0);
    eq.group.add(g);
    eq.part((a) => { for (let k = 0; k < 4; k++) a.box(0, 0, 0, 0.86, 0.01, 0.16, { ry: (k / 4) * Math.PI, rx: 0.3, layer: 'dark' }); }, g, { edges: false });
    return g;
  });
  eq.light(2.41, 1.9, 0.6);
  eq.anchor.set(0, 3.4, 0);
  eq.update = (st, dt) => { for (const b of blades) b.rotation.y += dt * (st.running ? 9 : 0.2); };
}

function scrollShape(r0, r1, yTop) {
  const sh = new THREE.Shape();
  sh.moveTo(0.02, yTop);
  sh.lineTo(0.02, r0);
  for (let i = 0; i <= 48; i++) {
    const th = Math.PI / 2 + (i / 48) * Math.PI * 1.5;
    const r = r0 + (r1 - r0) * (i / 48);
    sh.lineTo(r * Math.cos(th), r * Math.sin(th));
  }
  sh.lineTo(r1, yTop);
  sh.closePath();
  return sh;
}

// Central pulse-jet dust collector with its fan and stack (outdoors).
export function dustCollector(eq) {
  eq.body((a) => {
    a.blk(1.2, 0, 0, 7.4, 0.3, 3.6, { layer: 'dark' });
    legs4(a, 0, 0, 2.5, 2.5, 0.3, 3.0, 0.16);
    a.add(GEO.cyl(1.84, 0.2, 1.3, 4), 0, 2.35, 0, { ry: Math.PI / 4, layer: 'body' });
    a.at(0, 1.55, 0, 0, () => rotaryValve(a, 0.3));
    a.cyl(0, 0.75, 0, 0.3, 0.88, { layer: 'dark', seg: 20 });
    a.blk(0, 3.0, 0, 2.6, 4.0, 2.6, { layer: 'body' });
    for (const y of [4.0, 5.0, 6.0]) a.blk(0, y, 0, 2.66, 0.06, 2.66, { layer: 'body' });
    a.blk(0, 7.0, 0, 2.6, 0.7, 2.6, { layer: 'body' });
    a.cyl(0.9, 7.95, 0, 0.14, 2.4, { axis: 'z', layer: 'steel' });
    for (let k = 0; k < 8; k++) {
      const z = -1.05 + k * 0.3;
      a.cyl(0.9, 8.15, z, 0.05, 0.12, { layer: 'dark', seg: 12 });
      a.pipe([[0.9, 7.95, z], [0.5, 7.95, z], [0.5, 7.7, z]], 0.02, { layer: 'steel', bend: 0.08 });
    }
    a.cyl(-1.4, 5.5, 0, 0.35, 0.3, { axis: 'x', layer: 'steel', seg: 24 });
    a.box(0, 5.2, 1.31, 1.2, 1.0, 0.03, { layer: 'dark' });
    handrail(a, [-1.3, -1.3], [1.3, -1.3], 7.7, { pitch: 1.3 });
    handrail(a, [1.3, -1.3], [1.3, 1.3], 7.7, { pitch: 1.3 });
    handrail(a, [-1.3, 1.3], [-1.3, -1.3], 7.7, { pitch: 1.3 });
    a.at(0, 0.3, 1.45, 0, () => ladder(a, 0, 0, 0, 7.4, 0.45, { cage: true, cageDir: 1 }));
    // clean-air duct to the fan
    a.pipe([[1.3, 7.35, 0], [3.4, 7.35, 0], [3.4, 7.35, 1.1], [3.4, 1.6, 1.1], [3.4, 1.6, 0.5]], 0.32, { layer: 'steel', bend: 0.5, flanges: true });
    // fan and stack
    a.blk(3.4, 0.3, -0.4, 1.6, 0.18, 2.6, { layer: 'dark' });
    a.add(GEO.prism('dcScroll', () => scrollShape(0.62, 0.98, 1.15), 0.7, 48), 3.4, 1.6, 0, { layer: 'body' });
    a.lathe(3.4, 1.6, 0.35, [[0.44, 0], [0.44, 0.03], [0.34, 0.08], [0.32, 0.15]], { rx: Math.PI / 2, layer: 'body', seg: 32 });
    a.blk(3.4, 0.48, -1.35, 0.8, 0.5, 0.8, { layer: 'dark' });
    a.at(3.4, 1.6, -1.35, -Math.PI / 2, () => motor(a, 1.0, 0.36, { feet: true, feetH: 0.3, fins: 18 }));
    a.cyl(3.4 + 0.5, 9.0, 0, 0.36, 13.6, { layer: 'steel', seg: 28 });
    a.cyl(3.4 + 0.5, 15.9, 0, 0.36, 0.1, { layer: 'steel', open: true, seg: 28 });
    for (const y of [5.0, 9.0, 13.0]) a.ring(3.9, y, 0, 0.37, 0.02, { axis: 'y', layer: 'steel', ts: 28 });
    a.cyl(3.9, 11.0, 0.37, 0.05, 0.12, { axis: 'z', layer: 'dark', seg: 10 });
    a.at(-1.9, 0.3, 1.2, 0, () => { cabinet(a, 0.8, 1.8, 0.4, { hmi: true }); stackPole(a, 0.25, 1.83, 0, 0.14); });
  });
  eq.light(-1.9 + 0.25, 2.27, 1.2);
  eq.anchor.set(1.2, 9.5, 0);
}
