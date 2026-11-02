// Raw materials, dosing and premixing: IBC containers, container mixers,
// dosing stations with platform scales, big-bag stations, minor-ingredient booth.

import * as THREE from 'three';
import { GEO } from '../core/kit.js';
import { motor, gearbox, cabinet, stackPole, hmiPedestal, legs4, pallet, sackStack, bigBag, drum, loadCell, bolts } from './parts.js';

export const MIX_PIVOT = 1.85;
export const MIX_DOCK_LOCAL = -1.8; // container base in cradle frame

// Stainless IBC container, 1000 l class, base at y = 0.
export function container(eq) {
  eq.body((a) => {
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) a.blk(sx * 0.52, 0, sz * 0.52, 0.07, 0.64, 0.07, { layer: 'dark' });
    for (const sz of [-1, 1]) {
      a.blk(0, 0.08, sz * 0.52, 1.12, 0.1, 0.07, { layer: 'dark' });
      a.blk(0, 0.56, sz * 0.52, 1.12, 0.06, 0.07, { layer: 'dark' });
    }
    for (const sx of [-1, 1]) {
      a.blk(sx * 0.52, 0.08, 0, 0.07, 0.1, 1.12, { layer: 'dark' });
      a.blk(sx * 0.52, 0.56, 0, 0.07, 0.06, 1.12, { layer: 'dark' });
    }
    a.add(GEO.cyl(0.79, 0.11, 0.34, 4), 0, 0.45, 0, { ry: Math.PI / 4, layer: 'steel' });
    a.rblk(0, 0.62, 0, 1.12, 1.08, 1.12, 0.1, { layer: 'steel' });
    for (const y of [0.98, 1.34]) a.rblk(0, y, 0, 1.135, 0.025, 1.135, 0.1, { layer: 'steel' });
    a.rblk(0, 1.7, 0, 1.15, 0.025, 1.15, 0.1, { layer: 'steel' });
    // butterfly valve and lever
    a.cyl(0, 0.24, 0, 0.1, 0.07, { layer: 'steel', seg: 18 });
    a.cyl(0, 0.16, 0, 0.075, 0.1, { layer: 'steel', seg: 16 });
    a.box(0.14, 0.24, 0, 0.2, 0.025, 0.03, { layer: 'dark' });
    // manhole with swing clamps, vent cap, lugs, ID plate
    a.cyl(0, 1.75, 0, 0.3, 0.05, { layer: 'steel', seg: 28 });
    a.cyl(0, 1.79, 0, 0.27, 0.03, { layer: 'steel', seg: 28 });
    for (let k = 0; k < 4; k++) {
      const t = (k / 4) * Math.PI * 2 + Math.PI / 4;
      a.box(Math.cos(t) * 0.31, 1.78, Math.sin(t) * 0.31, 0.06, 0.05, 0.03, { layer: 'dark', ry: -t });
    }
    a.cyl(0.38, 1.77, 0.38, 0.05, 0.09, { layer: 'steel', seg: 14 });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) a.ring(sx * 0.5, 1.76, sz * 0.5, 0.05, 0.012, { ry: Math.PI / 4 * sx * sz, layer: 'steel', ts: 12 });
    a.box(0.565, 1.2, 0, 0.01, 0.14, 0.28, { layer: 'dark' });
    a.box(-0.565, 1.2, 0, 0.01, 0.14, 0.28, { layer: 'dark' });
  });
  eq.anchor.set(0, 2.25, 0);
}

function fence(a, pts, h = 2.0) {
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, z0] = pts[i], [x1, z1] = pts[i + 1];
    const len = Math.hypot(x1 - x0, z1 - z0);
    const n = Math.max(1, Math.ceil(len / 1.4));
    const ang = Math.atan2(z1 - z0, x1 - x0);
    for (let k = 0; k <= n; k++) {
      const t = k / n;
      const x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t;
      a.blk(x, 0, z, 0.06, h, 0.06, { layer: 'dark' });
      a.blk(x, 0, z, 0.14, 0.01, 0.14, { layer: 'dark' });
      if (k < n) {
        const xm = x0 + (x1 - x0) * (t + 0.5 / n), zm = z0 + (z1 - z0) * (t + 0.5 / n);
        const seg = len / n - 0.08;
        a.box(xm, 0.15 + (h - 0.25) / 2, zm, seg, h - 0.25, 0.01, { ry: -ang, layer: 'glass' });
        for (const y of [0.15, h - 0.1]) a.box(xm, y, zm, seg, 0.025, 0.025, { ry: -ang, layer: 'dark' });
      }
    }
  }
}

// CMR-1000 container mixer: pedestals, trunnion cradle, mixing head that
// turns 180 degrees with the docked container.
export function mixer(eq) {
  eq.body((a) => {
    for (const sx of [-1, 1]) {
      a.blk(sx * 1.3, 0, 0, 0.7, 0.04, 1.2, { layer: 'dark' });
      for (const ox of [-0.25, 0.25]) for (const oz of [-0.48, 0.48]) a.cyl(sx * 1.3 + ox, 0.06, oz, 0.025, 0.04, { layer: 'steel', seg: 6 });
      a.blk(sx * 1.3, 0.04, 0, 0.45, 1.61, 0.9, { layer: 'body' });
      for (const oz of [-0.3, 0.3]) a.blk(sx * (1.3 + 0.24), 0.2, oz, 0.03, 1.3, 0.12, { layer: 'body' });
      a.blk(sx * 1.3, 1.65, 0, 0.52, 0.1, 0.56, { layer: 'dark' });
      a.cyl(sx * 1.3, MIX_PIVOT, 0, 0.27, 0.42, { axis: 'x', layer: 'dark' });
      bolts(a, sx * 1.51, MIX_PIVOT, 0, 0.21, 8, 'x', 0.014);
    }
    // slewing drive
    a.at(1.8, MIX_PIVOT, 0, 0, () => gearbox(a, 0.36, 0.5, 0.52));
    a.at(1.8, 1.27, 0, 0, () => motor(a, 0.6, 0.17, { fins: 12 }), 0, Math.PI / 2);
    a.blk(1.8, 0.04, 0, 0.36, 0.9, 0.36, { layer: 'dark' });
    // docking guides on the floor
    for (const sx of [-1, 1]) a.blk(sx * 0.66, 0, 0.5, 0.05, 0.06, 2.2, { layer: 'dark' });
    a.blk(0, 0, -0.62, 1.4, 0.06, 0.05, { layer: 'dark' });
    // safety fence and light curtain at the loading side
    fence(a, [[-2.15, 1.25], [-2.15, -2.3], [2.15, -2.3], [2.15, 1.25]]);
    for (const sx of [-1, 1]) {
      a.blk(sx * 1.8, 0, 1.6, 0.07, 1.9, 0.07, { layer: 'dark' });
      a.box(sx * 1.8 - sx * 0.036, 1.0, 1.6, 0.005, 1.6, 0.03, { layer: 'rubber', edges: false });
    }
    // controls outside the fence
    a.at(2.95, 0, -1.3, 0, () => { cabinet(a, 0.8, 1.9, 0.45, { vents: true }); stackPole(a, 0.25, 1.93, 0, 0.16); });
    a.at(2.6, 0, 1.6, -Math.PI / 6, () => hmiPedestal(a));
    // fixed extraction connection above the head
    a.cyl(0, 4.25, -0.9, 0.15, 0.7, { layer: 'steel', seg: 18 });
    a.pipe([[0, 3.9, -0.9], [0, 3.9, -0.2]], 0.1, { layer: 'rubber', seg: 14 });
  });

  const cradle = new THREE.Group();
  cradle.position.set(0, MIX_PIVOT, 0);
  eq.group.add(cradle);
  eq.part((a) => {
    for (const sx of [-1, 1]) {
      a.box(sx * 1.02, -0.7, 0, 0.05, 2.3, 1.5, { layer: 'body' });
      for (const y of [-1.4, -0.7, 0.0]) a.box(sx * 0.985, y, 0, 0.03, 0.06, 1.4, { layer: 'body' });
      a.cyl(sx * 1.12, 0, 0, 0.1, 0.16, { axis: 'x', layer: 'steel' });
      a.box(sx * 0.8, 0.15, 0, 0.42, 0.18, 0.42, { layer: 'dark' });
      // lifting frame and cylinders
      a.box(sx * 0.62, -1.82, 0, 0.12, 0.08, 1.3, { layer: 'dark' });
      for (const sz of [-1, 1]) a.box(sx * 0.82, -1.82, sz * 0.55, 0.4, 0.08, 0.1, { layer: 'dark' });
      a.rod([sx * 0.85, -1.76, 0.0], [sx * 0.85, -0.95, 0.0], 0.045, { layer: 'steel' });
      a.cyl(sx * 0.85, -0.6, 0, 0.065, 0.7, { layer: 'dark', seg: 14 });
    }
    // mixing head with chopper drive
    a.lathe(0, -0.12, 0, [[0.64, 0], [0.64, 0.04], [0.6, 0.04], [0.6, 0.44], [0.5, 0.52], [0.3, 0.56], [0.3, 0.6]], { layer: 'body', seg: 40 });
    a.ring(0, -0.1, 0, 0.62, 0.025, { axis: 'y', layer: 'dark', ts: 40 });
    bolts(a, 0, -0.06, 0, 0.62, 16, 'y', 0.012);
    a.at(0, 0.86, 0, 0, () => motor(a, 0.72, 0.24, { fins: 16 }), 0, -Math.PI / 2);
    a.cyl(0, 0.3, 0.62, 0.07, 0.14, { axis: 'z', layer: 'steel', seg: 14 });
    a.cyl(0.45, 0.2, 0.45, 0.05, 0.12, { layer: 'steel', seg: 12, rz: 0.4 });
    a.box(-0.6, 0.2, 0, 0.04, 0.24, 0.3, { layer: 'dark' });
  }, cradle);
  eq.live.cradle = cradle;
  eq.light(2.95 + 0.25, 2.09, -1.3);
  eq.anchor.set(0, 3.9, 0);
  eq.dock = { local: new THREE.Vector3(0, MIX_DOCK_LOCAL, 0) };
}

// Dosing station: floor scale under a dust hood, weighing terminal, slitting table.
export function dosingStation(eq) {
  eq.body((a) => {
    a.blk(0, 0, 0, 1.5, 0.09, 1.5, { layer: 'dark' });
    a.blk(0, 0.09, 0, 1.44, 0.012, 1.44, { layer: 'steel' });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) a.cyl(sx * 0.66, 0.045, sz * 0.66, 0.04, 0.09, { layer: 'steel', seg: 10 });
    a.box(0, 0.05, -1.0, 1.5, 0.014, 0.52, { layer: 'dark', rx: 0.17 });
    // terminal with display and label printer
    a.rod([0.98, 0, 0.7], [0.98, 1.3, 0.7], 0.06, { layer: 'dark' });
    a.blk(0.98, 0, 0.7, 0.3, 0.02, 0.3, { layer: 'dark' });
    a.box(0.98, 1.42, 0.62, 0.34, 0.26, 0.1, { layer: 'body', rx: -0.3 });
    a.box(0.98, 1.43, 0.57, 0.28, 0.17, 0.01, { layer: 'rubber', rx: -0.3 });
    a.blk(0.98, 1.0, 0.82, 0.26, 0.16, 0.22, { layer: 'body' });
    // extraction hood with strip curtain, hangers and duct stub
    a.add(GEO.cyl(0.32, 1.0, 0.45, 4), 0, 2.45, 0, { ry: Math.PI / 4, layer: 'steel' });
    for (const [x, z, ry] of [[0, -0.7, 0], [0, 0.7, 0], [-0.7, 0, Math.PI / 2], [0.7, 0, Math.PI / 2]]) {
      a.box(x, 2.08, z, 1.38, 0.3, 0.01, { ry, layer: 'glass' });
    }
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) a.rod([sx * 0.23, 2.67, sz * 0.23], [sx * 0.23, 4.2, sz * 0.23], 0.02, { layer: 'dark' });
    a.cyl(0, 3.1, 0, 0.15, 0.85, { layer: 'steel', seg: 18 });
    a.cyl(0, 3.0, 0, 0.2, 0.04, { layer: 'steel', seg: 18 });
    a.cyl(0, 2.6, 0.4, 0.08, 0.6, { layer: 'steel', seg: 14 });
    // bag slitting table
    a.at(-1.35, 0, 0.55, 0, () => {
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) a.blk(sx * 0.4, 0, sz * 0.35, 0.05, 0.8, 0.05, { layer: 'steel' });
      a.blk(0, 0.8, 0, 0.9, 0.04, 0.8, { layer: 'steel' });
      for (let k = -3; k <= 3; k++) a.box(k * 0.11, 0.85, 0, 0.012, 0.012, 0.76, { layer: 'dark', edges: false });
    });
  });
  eq.light(0.98, 1.58, 0.82);
  eq.anchor.set(0, 3.3, 0);
  eq.dock = { y: 0.1 };
}

// Big-bag discharger with hoist frame and flexible screw to the dosing hood.
export function bigBagStation(eq) {
  const reach = eq.def.reach ?? -4.4;
  eq.body((a) => {
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      a.blk(sx * 0.8, 0, sz * 0.8, 0.3, 0.02, 0.3, { layer: 'dark' });
      a.blk(sx * 0.8, 0.02, sz * 0.8, 0.12, 3.6, 0.12, { layer: 'body' });
    }
    for (const sz of [-1, 1]) a.blk(0, 3.5, sz * 0.8, 1.72, 0.14, 0.12, { layer: 'body' });
    for (const sx of [-1, 1]) a.blk(sx * 0.8, 3.5, 0, 0.12, 0.14, 1.72, { layer: 'body' });
    for (const sz of [-1, 1]) a.bar([-0.8, 0.4, sz * 0.8], [0.8, 1.45, sz * 0.8], 0.06, { layer: 'body' });
    a.add(GEO.ibeam(0.2, 0.12, 0.008, 0.012, 1.9), 0, 3.75, 0, { ry: Math.PI / 2, layer: 'dark' });
    // electric hoist and lifting frame
    a.blk(0.1, 3.36, 0, 0.36, 0.28, 0.3, { layer: 'dark' });
    a.cyl(-0.18, 3.5, 0, 0.09, 0.22, { axis: 'x', layer: 'dark' });
    a.rod([0.1, 3.36, 0], [0.1, 3.05, 0], 0.012, { layer: 'steel' });
    a.blk(0, 3.0, 0, 1.0, 0.05, 0.06, { layer: 'dark' });
    a.blk(0, 3.0, 0, 0.06, 0.05, 1.0, { layer: 'dark' });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) a.rod([sx * 0.45, 3.0, sz * 0.45], [sx * 0.42, 2.82, sz * 0.42], 0.02, { layer: 'body' });
    // the bag itself
    a.rblk(0, 1.78, 0, 0.95, 1.04, 0.95, 0.16, { layer: 'body' });
    a.lathe(0, 1.55, 0, [[0.12, 0], [0.14, 0.12], [0.47, 0.24]], { layer: 'body', seg: 16 });
    // discharge funnel, massagers, iris valve, screw boot
    for (const sz of [-1, 1]) a.blk(0, 1.5, sz * 0.8, 1.6, 0.1, 0.1, { layer: 'body' });
    a.add(GEO.cyl(0.95, 0.17, 0.45, 4), 0, 1.28, 0, { ry: Math.PI / 4, layer: 'steel' });
    for (const sx of [-1, 1]) {
      a.blk(sx * 0.56, 1.62, 0, 0.12, 0.3, 0.42, { layer: 'dark' });
      a.cyl(sx * 0.66, 1.77, 0, 0.05, 0.22, { axis: 'x', layer: 'steel', seg: 12 });
    }
    a.cyl(0, 1.0, 0, 0.16, 0.12, { layer: 'dark', seg: 20 });
    a.blk(0, 0.62, 0, 0.32, 0.3, 0.32, { layer: 'steel' });
    // flexible screw conveyor up into the dosing hood
    a.rod([0, 0.78, 0], [0, 2.95, reach], 0.14, { layer: 'steel', seg: 16 });
    const tilt = Math.atan2(reach, 2.17), sl = Math.hypot(reach, 2.17);
    a.at(0, 2.95 + (0.3 * 2.17) / sl, reach + (0.3 * reach) / sl, 0, () => motor(a, 0.42, 0.1, { fins: 10 }), tilt, Math.PI / 2);
    a.cyl(0, 2.78, reach, 0.07, 0.36, { layer: 'steel', seg: 14 });
    for (const sx of [-1, 1]) a.bar([sx * 0.4, 0, reach / 2], [0, 1.85, reach / 2], 0.05, { layer: 'body' });
    // panel on a column
    a.blk(0.94, 1.2, 0.8, 0.12, 0.5, 0.36, { layer: 'body' });
  });
  eq.light(0.94, 1.72, 0.8);
  eq.anchor.set(0, 4.3, 0);
}

// Minor-ingredient weighing in a downflow booth.
export function additiveBooth(eq) {
  eq.body((a) => {
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) a.blk(sx * 1.2, 0, sz * 0.8, 0.08, 2.5, 0.08, { layer: 'body' });
    a.blk(0, 2.5, 0, 2.5, 0.45, 1.7, { layer: 'body' });
    for (const sx of [-0.6, 0.6]) {
      a.cyl(sx, 3.02, 0, 0.26, 0.14, { layer: 'dark', seg: 24 });
      a.ring(sx, 3.1, 0, 0.26, 0.01, { axis: 'y', layer: 'dark' });
    }
    a.box(0, 2.48, 0, 2.36, 0.03, 1.56, { layer: 'dark' });
    for (const sx of [-1, 1]) a.box(sx * 1.2, 1.3, 0, 0.012, 2.3, 1.56, { layer: 'glass' });
    a.box(0, 1.3, -0.8, 2.32, 2.3, 0.02, { layer: 'body' });
    for (let k = -4; k <= 4; k++) a.box(k * 0.26, 2.05, 0.8, 0.12, 0.85, 0.004, { layer: 'glass' });
    // bench with cabinets
    a.blk(0, 0, -0.35, 2.1, 0.82, 0.62, { layer: 'body' });
    for (let k = -1; k <= 1; k++) {
      a.box(k * 0.7, 0.45, -0.035, 0.66, 0.7, 0.01, { layer: 'body' });
      a.box(k * 0.7 + 0.25, 0.62, -0.025, 0.1, 0.02, 0.02, { layer: 'dark' });
    }
    a.blk(0, 0.82, -0.35, 2.16, 0.04, 0.7, { layer: 'dark' });
    // analytical balance under a draft shield, bench scale, terminal
    a.blk(-0.55, 0.86, -0.4, 0.3, 0.09, 0.4, { layer: 'body' });
    a.blk(-0.55, 0.95, -0.45, 0.26, 0.28, 0.26, { layer: 'glass' });
    a.box(-0.55, 0.9, -0.17, 0.2, 0.05, 0.05, { layer: 'rubber', rx: -0.4 });
    a.blk(0.35, 0.86, -0.4, 0.45, 0.06, 0.45, { layer: 'steel' });
    a.blk(0.35, 0.86, -0.67, 0.25, 0.25, 0.06, { layer: 'body' });
    a.box(0.35, 1.06, -0.635, 0.2, 0.1, 0.006, { layer: 'rubber' });
    a.blk(0.85, 0.86, -0.55, 0.36, 0.26, 0.04, { layer: 'dark' });
    // ingredient bin rack beside the booth
    a.at(1.85, 0, -0.3, 0, () => {
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) a.blk(sx * 0.3, 0, sz * 0.25, 0.04, 1.7, 0.04, { layer: 'dark' });
      for (const y of [0.3, 0.8, 1.3]) {
        a.blk(0, y, 0, 0.64, 0.03, 0.54, { layer: 'dark' });
        for (const sx of [-0.15, 0.15]) a.rblk(sx, y + 0.03, 0, 0.26, 0.26, 0.4, 0.04, { layer: 'body' });
      }
    });
  });
  eq.light(1.1, 2.95, 0.75);
  eq.anchor.set(0, 3.5, 0);
}

export function recipeTerminal(eq) {
  eq.body((a) => {
    hmiPedestal(a, 1.3);
    a.blk(0.4, 0, 0, 0.36, 1.0, 0.36, { layer: 'body' });
    a.blk(0.4, 1.0, 0, 0.3, 0.16, 0.26, { layer: 'dark' });
    a.box(-0.22, 1.15, 0.1, 0.05, 0.14, 0.05, { layer: 'dark', rx: 0.3 });
  });
  eq.light(0.4, 1.16, 0);
  eq.anchor.set(0.1, 2.2, 0);
}

// Raw material receiving buffer: staged pallets, sampling table, pallet truck.
export function receiving(eq) {
  eq.body((a) => {
    const spots = [[-1.4, -6], [-1.4, -4.2], [-1.4, 2.4], [-1.4, 4.2], [-1.4, 6], [1.4, -6], [1.4, -4.2], [1.4, 2.4], [1.4, 4.2], [1.4, 6]];
    spots.forEach(([x, z], i) => {
      if (i % 3 === 1) bigBag(a, x, 0, z, 1.0);
      else if (i % 5 === 3) { pallet(a, x, 0, z, Math.PI / 2); for (const dx of [-0.3, 0.3]) for (const dz of [-0.3, 0.3]) drum(a, x + dx, 0.12, z + dz); }
      else sackStack(a, x, 0, z, 5, Math.PI / 2);
      // painted floor bay
      for (const [w, d, ox, oz] of [[1.5, 0.05, 0, -0.75], [1.5, 0.05, 0, 0.75], [0.05, 1.5, -0.75, 0], [0.05, 1.5, 0.75, 0]]) a.blk(x + ox, 0, z + oz, w, 0.004, d, { layer: 'dark', edges: false });
    });
    // sampling table and sample retention shelf
    a.at(2.0, 0, -1.0, 0, () => {
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) a.blk(sx * 0.55, 0, sz * 0.35, 0.05, 0.88, 0.05, { layer: 'steel' });
      a.blk(0, 0.88, 0, 1.2, 0.03, 0.8, { layer: 'steel' });
      a.blk(0, 0.25, 0, 1.1, 0.02, 0.7, { layer: 'steel' });
      for (let k = 0; k < 5; k++) a.cyl(-0.4 + k * 0.18, 0.98, 0.2, 0.05, 0.14, { layer: 'body', seg: 12 });
      a.blk(0.35, 0.91, -0.15, 0.3, 0.08, 0.25, { layer: 'body' });
    });
    // hand pallet truck
    a.at(-0.2, 0, 0.6, Math.PI / 2, () => {
      for (const sz of [-0.22, 0.22]) a.blk(0.5, 0.03, sz, 1.15, 0.05, 0.16, { layer: 'dark' });
      a.blk(-0.1, 0.03, 0, 0.2, 0.25, 0.6, { layer: 'dark' });
      a.rod([-0.12, 0.28, 0], [-0.45, 1.1, 0], 0.035, { layer: 'dark' });
      a.ring(-0.48, 1.17, 0, 0.09, 0.015, { layer: 'dark' });
      a.cyl(-0.1, 0.06, 0, 0.08, 0.1, { axis: 'z', layer: 'rubber' });
    });
  });
  eq.anchor.set(0, 2.2, 0);
}

// Selective pallet racking for the raw material store.
export function rawRacks(eq) {
  const rows = eq.def.rows;
  const bays = eq.def.bays ?? 7, bayW = 2.85, levels = [0, 1.7, 3.4, 5.1], h = 6.4, depth = 1.1;
  const x0 = -(bays * bayW) / 2;
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  eq.body((a) => {
    for (const zc of rows) {
      for (let b = 0; b <= bays; b++) {
        const x = x0 + b * bayW;
        for (const sz of [-1, 1]) {
          a.blk(x, 0, zc + (sz * depth) / 2, 0.09, h, 0.07, { layer: 'body' });
          a.blk(x, 0, zc + (sz * depth) / 2, 0.16, 0.01, 0.14, { layer: 'dark' });
        }
        for (let y = 0.3; y < h - 0.6; y += 1.2) {
          a.bar([x, y, zc - depth / 2], [x, y + 0.6, zc + depth / 2], 0.03, { layer: 'body' });
          a.bar([x, y + 0.6, zc + depth / 2], [x, y + 1.2, zc - depth / 2], 0.03, { layer: 'body' });
        }
        a.bar([x, 0.15, zc - depth / 2], [x, 0.15, zc + depth / 2], 0.03, { layer: 'body' });
        a.bar([x, h - 0.1, zc - depth / 2], [x, h - 0.1, zc + depth / 2], 0.03, { layer: 'body' });
      }
      for (let b = 0; b < bays; b++) {
        const xc = x0 + (b + 0.5) * bayW;
        levels.forEach((y, li) => {
          if (li > 0) for (const sz of [-1, 1]) a.blk(xc, y - 0.12, zc + (sz * depth) / 2, bayW - 0.09, 0.12, 0.05, { layer: 'dark' });
          for (const ox of [-0.9, 0, 0.9]) {
            const r = rnd();
            if (r < 0.2) continue;
            const px = xc + ox;
            a.blk(px, y, zc, 0.8, 0.144, 1.2, { layer: 'dark' });
            if (r < 0.62) {
              a.rblk(px, y + 0.144, zc, 0.78, 0.84, 1.15, 0.06, { layer: 'body' });
              for (let k = 1; k < 6; k++) a.box(px, y + 0.144 + k * 0.14, zc, 0.79, 0.006, 1.16, { layer: 'body', edges: true });
            } else if (r < 0.85) {
              a.rblk(px, y + 0.144, zc, 0.78, 1.05, 0.95, 0.14, { layer: 'body' });
              a.lathe(px, y + 1.19, zc, [[0.36, 0], [0.12, 0.12], [0.08, 0.2]], { layer: 'body', seg: 12 });
            } else {
              for (const dz of [-0.3, 0.3]) a.cyl(px, y + 0.144 + 0.44, zc + dz, 0.29, 0.88, { layer: 'steel', seg: 18 });
            }
          }
        });
      }
      // end-of-row protection
      for (const x of [x0 - 0.25, x0 + bays * bayW + 0.25]) a.blk(x, 0, zc, 0.12, 0.4, depth + 0.2, { layer: 'dark' });
    }
  });
  eq.anchor.set(0, 7.2, 0);
}
