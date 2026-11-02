// QC and R&D laboratory: room fit-out and instruments.
// Instruments stand on a bench top at y = BENCH unless noted.

import * as THREE from 'three';
import { GEO } from '../core/kit.js';
import { motor, cabinet, legs4, bolts } from './parts.js';

export const BENCH = 0.92;

function bench(a, x, z, w, d, o = {}) {
  a.at(x, 0, z, o.ry || 0, () => {
    a.blk(0, 0, 0, w, 0.1, d - 0.08, { layer: 'dark' });
    a.blk(0, 0.1, 0, w, 0.76, d - 0.04, { layer: 'body' });
    const n = Math.max(1, Math.round(w / 0.6));
    for (let k = 0; k < n; k++) {
      const cx = -w / 2 + (w / n) * (k + 0.5);
      a.box(cx, 0.48, d / 2 - 0.015, w / n - 0.02, 0.7, 0.01, { layer: 'body' });
      a.box(cx, 0.78, d / 2 - 0.005, 0.12, 0.015, 0.015, { layer: 'dark' });
    }
    a.blk(0, 0.86, 0, w + 0.02, 0.04, d, { layer: 'dark' });
    if (o.shelf) {
      for (const sx of [-1, 1]) a.blk(sx * (w / 2 - 0.05), 0.9, -d / 2 + 0.12, 0.04, 0.9, 0.04, { layer: 'dark' });
      for (const y of [1.3, 1.7]) a.blk(0, y, -d / 2 + 0.15, w - 0.04, 0.025, 0.28, { layer: 'body' });
      for (let k = 0; k < Math.floor(w / 0.35); k++) a.cyl(-w / 2 + 0.25 + k * 0.35, 1.4, -d / 2 + 0.15, 0.045, 0.16, { layer: 'glass', seg: 12 });
    }
  });
}

function monitor(a, x, y, z, ry = 0) {
  a.at(x, y, z, ry, () => {
    a.blk(0, 0, 0, 0.22, 0.015, 0.16, { layer: 'dark' });
    a.blk(0, 0.015, -0.03, 0.04, 0.18, 0.03, { layer: 'dark' });
    a.box(0, 0.38, -0.02, 0.56, 0.34, 0.03, { layer: 'dark' });
    a.box(0, 0.38, -0.003, 0.52, 0.3, 0.004, { layer: 'rubber' });
    a.blk(0, 0, 0.2, 0.44, 0.02, 0.14, { layer: 'dark' });
  });
}

function stool(a, x, z) {
  a.cyl(x, 0.02, z, 0.25, 0.04, { layer: 'dark', seg: 5 });
  a.cyl(x, 0.33, z, 0.025, 0.6, { layer: 'steel', seg: 8 });
  a.cyl(x, 0.65, z, 0.19, 0.06, { layer: 'dark', seg: 20 });
}

function glassWall(a, x0, z0, x1, z1, doorAt = null) {
  const len = Math.hypot(x1 - x0, z1 - z0);
  const ang = Math.atan2(z1 - z0, x1 - x0);
  const n = Math.max(1, Math.round(len / 1.2));
  const dx = (x1 - x0) / len, dz = (z1 - z0) / len;
  for (let k = 0; k <= n; k++) {
    const t = (k / n) * len;
    a.blk(x0 + dx * t, 0, z0 + dz * t, 0.06, 3.2, 0.06, { layer: 'body', ry: -ang });
  }
  for (let k = 0; k < n; k++) {
    const t0 = (k / n) * len, t1 = ((k + 1) / n) * len, tm = (t0 + t1) / 2;
    const cx = x0 + dx * tm, cz = z0 + dz * tm;
    const isDoor = doorAt !== null && Math.abs(tm - doorAt) < len / n / 2;
    if (isDoor) {
      a.box(cx, 3.0, cz, t1 - t0, 0.4, 0.05, { ry: -ang, layer: 'body' });
      a.box(cx + dz * 0.2, 1.4, cz - dx * 0.2, (t1 - t0) * 0.9, 2.1, 0.02, { ry: -ang - 0.35, layer: 'glass' });
      continue;
    }
    a.box(cx, 0.5, cz, t1 - t0, 1.0, 0.05, { ry: -ang, layer: 'body' });
    a.box(cx, 1.9, cz, t1 - t0, 1.8, 0.012, { ry: -ang, layer: 'glass' });
    a.box(cx, 3.0, cz, t1 - t0, 0.4, 0.05, { ry: -ang, layer: 'body' });
  }
  a.box((x0 + x1) / 2, 3.22, (z0 + z1) / 2, len, 0.04, 0.08, { ry: -ang, layer: 'body' });
}

// Room shells and furniture for the three laboratory rooms.
export function labBlock(eq) {
  eq.body((a) => {
    // floor finish and partitions (local origin at the block's NW corner)
    for (const [x0, x1] of [[0, 10], [10, 18], [18, 26]]) a.blk((x0 + x1) / 2, 0, 5.5, x1 - x0 - 0.1, 0.02, 10.9, { layer: 'steel', edges: false });
    glassWall(a, 0, 11, 10, 11, 8.6);
    glassWall(a, 10, 11, 18, 11, 1.6);
    glassWall(a, 18, 11, 26, 11, 1.6);
    glassWall(a, 0, 0.15, 0, 11);
    glassWall(a, 10, 0.15, 10, 11, 9.4);
    glassWall(a, 18, 0.15, 18, 11, 9.4);
    // room 801: QC lab
    bench(a, 4.2, 0.55, 7.6, 0.75, { shelf: true });
    bench(a, 4.6, 6.0, 4.2, 1.4);
    for (const sx of [-1, 1]) a.blk(4.6 + sx * 1.95, 0.9, 6.0, 0.04, 0.56, 0.04, { layer: 'dark' });
    for (const y of [1.15, 1.4]) a.blk(4.6, y, 6.0, 3.9, 0.02, 0.3, { layer: 'body' });
    bench(a, 9.35, 6.2, 0.75, 4.0, { ry: Math.PI / 2 });
    // fume hood
    a.at(8.9, 0, 1.2, -Math.PI / 2, () => {
      a.blk(0, 0, 0, 1.5, 0.86, 0.85, { layer: 'body' });
      a.blk(0, 0.86, 0, 1.5, 0.04, 0.85, { layer: 'dark' });
      for (const sx of [-1, 1]) a.blk(sx * 0.72, 0.9, 0, 0.06, 1.5, 0.85, { layer: 'body' });
      a.blk(0, 2.4, 0, 1.5, 0.5, 0.85, { layer: 'body' });
      a.blk(0, 0.9, -0.4, 1.38, 1.5, 0.04, { layer: 'body' });
      a.box(0, 1.85, 0.38, 1.36, 0.8, 0.02, { layer: 'glass' });
      a.box(0, 1.44, 0.38, 1.38, 0.05, 0.04, { layer: 'dark' });
      a.cyl(0, 3.4, -0.1, 0.15, 1.0, { layer: 'steel', seg: 16 });
    });
    // desks, monitors and stools
    monitor(a, 2.4, BENCH, 0.7);
    monitor(a, 7.4, BENCH, 0.7);
    monitor(a, 15.6, BENCH, 9.9, Math.PI);
    monitor(a, 23.4, BENCH, 9.9, Math.PI);
    for (const [x, z] of [[2.4, 1.5], [4.0, 1.5], [7.4, 1.5], [4.0, 7.3], [5.4, 7.3], [15.6, 9.0], [23.4, 9.0]]) stool(a, x, z);
    // retention sample cabinet
    a.at(0.6, 0, 9.2, Math.PI / 2, () => {
      a.blk(0, 0, 0, 1.6, 2.1, 0.5, { layer: 'body' });
      for (const sx of [-1, 1]) a.box(sx * 0.4, 1.1, 0.255, 0.76, 1.9, 0.01, { layer: 'glass' });
      for (const y of [0.5, 0.95, 1.4, 1.85]) a.blk(0, y, 0, 1.5, 0.02, 0.45, { layer: 'dark' });
    });
    // room 802 and 803 work benches
    bench(a, 14.0, 10.15, 3.0, 0.75);
    bench(a, 22.2, 10.15, 3.6, 0.75);
    bench(a, 25.4, 5.0, 0.75, 3.0, { ry: Math.PI / 2 });
  });
  eq.anchor.set(13, 4.2, 5.5);
}

// Differential scanning calorimeter with autosampler, PC and N2 supply.
export function dsc(eq) {
  eq.body((a) => {
    a.blk(0, BENCH, 0, 0.55, 0.32, 0.5, { layer: 'body' });
    a.box(0, BENCH + 0.18, 0.27, 0.5, 0.2, 0.06, { layer: 'body', rx: -0.5 });
    a.box(0, BENCH + 0.2, 0.29, 0.22, 0.1, 0.005, { layer: 'rubber', rx: -0.5 });
    a.cyl(0.1, BENCH + 0.36, -0.05, 0.1, 0.08, { layer: 'steel', seg: 24 });
    a.dome(0.1, BENCH + 0.4, -0.05, 0.08, { layer: 'steel' });
    a.cyl(-0.12, BENCH + 0.335, 0.02, 0.17, 0.03, { layer: 'dark', seg: 32 });
    for (let k = 0; k < 16; k++) {
      const t = (k / 16) * Math.PI * 2;
      a.cyl(-0.12 + Math.cos(t) * 0.13, BENCH + 0.355, 0.02 + Math.sin(t) * 0.13, 0.012, 0.015, { layer: 'steel', seg: 6, edges: false });
    }
    a.rod([-0.12, BENCH + 0.32, -0.18], [-0.12, BENCH + 0.58, -0.18], 0.03, { layer: 'dark' });
    a.rod([-0.12, BENCH + 0.58, -0.18], [0.08, BENCH + 0.58, -0.07], 0.025, { layer: 'dark' });
    a.blk(0.4, BENCH, -0.1, 0.18, 0.22, 0.3, { layer: 'body' });
    // nitrogen cylinder chained to the bench
    a.cyl(-0.62, 0.7, 0.55, 0.115, 1.4, { layer: 'steel', seg: 18 });
    a.dome(-0.62, 1.4, 0.55, 0.115, { layer: 'steel' });
    a.cyl(-0.62, 1.55, 0.55, 0.04, 0.12, { layer: 'dark', seg: 10 });
    a.ring(-0.62, 1.1, 0.55, 0.13, 0.008, { axis: 'y', layer: 'dark' });
    a.pipe([[-0.62, 1.6, 0.55], [-0.62, 1.7, 0.55], [-0.62, 1.7, 0.0], [0.4, 1.7, 0.0], [0.4, BENCH + 0.22, 0.0]], 0.006, { layer: 'dark', bend: 0.05 });
  });
  eq.light(0.22, BENCH + 0.32, 0.18);
  eq.anchor.set(0, 1.9, 0);
}

export function sieveShaker(eq) {
  eq.body((a) => {
    a.blk(0, BENCH, 0, 0.45, 0.16, 0.42, { layer: 'body' });
    a.box(0, BENCH + 0.08, 0.215, 0.24, 0.08, 0.006, { layer: 'rubber' });
    for (const sx of [-1, 1]) a.rod([sx * 0.19, BENCH + 0.16, -0.05], [sx * 0.19, BENCH + 0.82, -0.05], 0.022, { layer: 'steel' });
    for (let k = 0; k < 7; k++) {
      const y = BENCH + 0.18 + k * 0.075;
      a.cyl(0, y + 0.035, -0.05, 0.11, 0.07, { layer: 'steel', seg: 28 });
      a.ring(0, y + 0.07, -0.05, 0.112, 0.006, { axis: 'y', layer: 'dark', ts: 28 });
    }
    a.blk(0, BENCH + 0.72, -0.05, 0.44, 0.05, 0.08, { layer: 'dark' });
    for (const sx of [-1, 1]) a.cyl(sx * 0.19, BENCH + 0.8, -0.05, 0.035, 0.05, { layer: 'dark', seg: 12 });
    // analytical balance
    a.blk(0.55, BENCH, 0, 0.24, 0.08, 0.36, { layer: 'body' });
    a.blk(0.55, BENCH + 0.08, -0.04, 0.22, 0.24, 0.24, { layer: 'glass' });
    a.box(0.55, BENCH + 0.05, 0.17, 0.16, 0.04, 0.01, { layer: 'rubber' });
  });
  eq.light(-0.17, BENCH + 0.16, 0.18);
  eq.anchor.set(0.2, 1.95, 0);
}

export function hotPlates(eq) {
  eq.body((a) => {
    for (const x of [-0.35, 0.05]) {
      a.blk(x, BENCH, 0, 0.32, 0.1, 0.3, { layer: 'body' });
      a.blk(x, BENCH + 0.1, -0.02, 0.26, 0.035, 0.24, { layer: 'steel' });
      a.box(x, BENCH + 0.05, 0.155, 0.12, 0.05, 0.005, { layer: 'rubber' });
    }
    // inclined plate for the flow test
    a.blk(0.45, BENCH, 0, 0.32, 0.06, 0.3, { layer: 'body' });
    a.box(0.45, BENCH + 0.2, -0.02, 0.26, 0.03, 0.28, { layer: 'steel', rx: -1.13 });
    a.rod([0.45, BENCH + 0.06, 0.1], [0.45, BENCH + 0.28, -0.04], 0.02, { layer: 'dark' });
    a.box(0.75, BENCH + 0.02, 0.05, 0.1, 0.04, 0.12, { layer: 'dark' });
  });
  eq.light(0.6, BENCH + 0.06, 0.12);
  eq.anchor.set(0.1, 1.7, 0);
}

export function adhesionTester(eq) {
  eq.body((a) => {
    a.rblk(0, BENCH, 0, 0.46, 0.1, 0.34, 0.03, { layer: 'dark' });
    a.box(0, BENCH + 0.16, -0.18, 0.46, 0.3, 0.03, { layer: 'dark', rx: -0.25 });
    a.blk(-0.08, BENCH + 0.1, 0.02, 0.24, 0.07, 0.11, { layer: 'body' });
    a.box(-0.08, BENCH + 0.15, 0.02, 0.12, 0.012, 0.07, { layer: 'rubber' });
    for (let k = 0; k < 5; k++) a.cyl(0.1 + (k % 3) * 0.04, BENCH + 0.12, 0.08 - Math.floor(k / 3) * 0.05, 0.01, 0.02, { layer: 'steel', seg: 8 });
    a.blk(0.45, BENCH, 0, 0.3, 0.012, 0.2, { layer: 'steel' });
    for (let k = 0; k < 3; k++) a.cyl(0.37 + k * 0.08, BENCH + 0.022, 0, 0.0125, 0.02, { layer: 'steel', seg: 10 });
  });
  eq.light(0.18, BENCH + 0.1, 0.12);
  eq.anchor.set(0.1, 1.6, 0);
}

// Electrostatic sample application booth with powder unit and panel rail.
export function sprayBooth(eq) {
  eq.body((a) => {
    a.blk(0, 0, 0, 1.7, 0.08, 1.2, { layer: 'dark' });
    for (const sx of [-1, 1]) a.blk(sx * 0.82, 0.08, 0, 0.06, 2.2, 1.2, { layer: 'body' });
    a.blk(0, 2.28, 0, 1.7, 0.3, 1.2, { layer: 'body' });
    a.blk(0, 0.08, -0.56, 1.58, 2.2, 0.08, { layer: 'body' });
    for (let k = -3; k <= 3; k++) a.box(k * 0.2, 1.2, -0.51, 0.012, 1.6, 0.01, { layer: 'dark', edges: false });
    for (let k = 0; k < 8; k++) a.box(0, 0.45 + k * 0.2, -0.51, 1.4, 0.012, 0.01, { layer: 'dark', edges: false });
    a.box(0, 2.24, 0.1, 1.2, 0.04, 0.4, { layer: 'glass' });
    a.cyl(0, 3.4, -0.2, 0.2, 1.9, { layer: 'steel', seg: 20 });
    // panel hanger rail with test panels
    a.rod([-0.6, 1.9, 0.1], [0.6, 1.9, 0.1], 0.02, { layer: 'steel' });
    for (const x of [-0.35, 0, 0.35]) {
      a.rod([x, 1.9, 0.1], [x, 1.7, 0.1], 0.006, { layer: 'steel', edges: false });
      a.box(x, 1.5, 0.1, 0.15, 0.3, 0.004, { layer: 'steel' });
    }
    // powder unit on a cart, gun on its holder
    a.at(1.25, 0, 0.5, 0, () => {
      a.blk(0, 0.08, 0, 0.5, 0.04, 0.5, { layer: 'dark' });
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) a.cyl(sx * 0.2, 0.05, sz * 0.2, 0.04, 0.03, { axis: 'z', layer: 'rubber', seg: 10 });
      a.rod([-0.2, 0.1, -0.2], [-0.2, 1.1, -0.2], 0.03, { layer: 'dark' });
      a.cyl(0, 0.4, 0, 0.14, 0.5, { layer: 'steel', seg: 20 });
      a.blk(0, 0.95, -0.15, 0.36, 0.3, 0.2, { layer: 'body' });
      a.box(0, 1.08, -0.04, 0.2, 0.1, 0.005, { layer: 'rubber' });
      a.box(0.05, 1.25, -0.2, 0.06, 0.2, 0.05, { layer: 'dark', rz: 0.5 });
      a.rod([0.05, 1.3, -0.2], [0.25, 1.4, -0.2], 0.025, { layer: 'dark' });
    });
  });
  eq.light(0.82, 2.6, 0.55);
  eq.anchor.set(0, 3.0, 0);
}

export function curingOven(eq) {
  eq.body((a) => {
    a.blk(0, 0, 0, 1.1, 0.12, 0.9, { layer: 'dark' });
    a.blk(0, 0.12, 0, 1.1, 1.75, 0.9, { layer: 'body' });
    a.box(-0.08, 0.95, 0.465, 0.88, 1.5, 0.03, { layer: 'body' });
    a.box(-0.08, 1.2, 0.482, 0.4, 0.5, 0.006, { layer: 'glass' });
    a.box(0.32, 0.95, 0.5, 0.03, 0.4, 0.04, { layer: 'dark' });
    a.blk(0.45, 1.87, 0.35, 0.18, 0.04, 0.12, { layer: 'dark' });
    a.box(0.45, 1.55, 0.465, 0.16, 0.42, 0.02, { layer: 'dark' });
    a.box(0.45, 1.65, 0.476, 0.12, 0.08, 0.004, { layer: 'rubber' });
    a.cyl(-0.3, 2.0, -0.2, 0.06, 0.26, { layer: 'steel', seg: 14 });
  });
  eq.light(0.45, 1.91, 0.2);
  eq.anchor.set(0, 2.6, 0);
}

export function cathodicDisbondment(eq) {
  eq.body((a) => {
    bench(a, 0, 0, 2.2, 0.8);
    a.blk(-0.5, BENCH, -0.05, 0.9, 0.45, 0.42, { layer: 'glass' });
    a.blk(-0.5, BENCH, -0.05, 0.92, 0.02, 0.44, { layer: 'dark' });
    for (let k = 0; k < 3; k++) {
      a.cyl(-0.8 + k * 0.3, BENCH + 0.35, -0.05, 0.06, 0.3, { layer: 'steel', seg: 16, axis: 'x' });
      a.cyl(-0.8 + k * 0.3, BENCH + 0.5, -0.05, 0.03, 0.12, { layer: 'glass', seg: 12 });
    }
    a.blk(-0.05, BENCH, -0.25, 0.12, 0.3, 0.08, { layer: 'dark' });
    for (let k = 0; k < 4; k++) {
      const x = 0.25 + k * 0.18;
      a.blk(x, BENCH, 0.05, 0.14, 0.012, 0.2, { layer: 'steel' });
      a.cyl(x, BENCH + 0.07, 0.05, 0.05, 0.12, { layer: 'glass', seg: 16 });
      a.cyl(x, BENCH + 0.135, 0.05, 0.055, 0.012, { layer: 'dark', seg: 16 });
      a.rod([x, BENCH + 0.14, 0.05], [x, BENCH + 0.3, 0.05], 0.006, { layer: 'steel', edges: false });
    }
    a.blk(0.6, BENCH, -0.25, 0.45, 0.22, 0.26, { layer: 'body' });
    a.box(0.6, BENCH + 0.14, -0.115, 0.3, 0.1, 0.006, { layer: 'rubber' });
  });
  eq.light(0.82, BENCH + 0.22, -0.2);
  eq.anchor.set(0, 1.8, 0);
}

export function blastCabinet(eq) {
  eq.body((a) => {
    legs4(a, 0, 0, 1.1, 0.8, 0, 0.85, 0.06, { brace: false });
    a.blk(0, 0.85, 0, 1.2, 0.85, 0.9, { layer: 'body' });
    a.box(0, 1.85, 0.12, 1.2, 0.04, 0.72, { layer: 'body', rx: 0.35 });
    a.box(0, 1.86, 0.14, 0.9, 0.01, 0.5, { layer: 'glass', rx: 0.35 });
    for (const sx of [-1, 1]) a.ring(sx * 0.27, 1.2, 0.455, 0.1, 0.02, { layer: 'dark', ts: 20 });
    a.add(GEO.cyl(0.5, 0.12, 0.45, 4), 0, 0.62, 0, { ry: Math.PI / 4, layer: 'body' });
    a.blk(1.0, 0, -0.1, 0.5, 1.9, 0.5, { layer: 'body' });
    a.pipe([[0.55, 1.6, -0.1], [0.75, 1.6, -0.1]], 0.06, { layer: 'steel' });
  });
  eq.light(1.0, 1.9, -0.1);
  eq.anchor.set(0.3, 2.6, 0);
}

export function autoclave(eq) {
  eq.body((a) => {
    legs4(a, 0, 0, 0.6, 0.6, 0, 0.5, 0.07, { brace: false });
    a.lathe(0, 0.45, 0, [[0.0001, 0], [0.25, 0.04], [0.36, 0.14], [0.36, 0.95], [0.4, 0.95], [0.4, 1.02]], { layer: 'steel', seg: 36 });
    a.lathe(0, 1.47, 0, [[0.4, 0], [0.4, 0.06], [0.33, 0.14], [0.18, 0.25], [0.0001, 0.28]], { layer: 'steel', seg: 36 });
    bolts(a, 0, 1.5, 0, 0.37, 16, 'y', 0.016);
    a.cyl(0.18, 1.78, 0, 0.05, 0.03, { axis: 'z', layer: 'dark', seg: 18, rx: 0.4 });
    a.cyl(-0.12, 1.78, 0.08, 0.025, 0.12, { layer: 'steel', seg: 10 });
    // lid davit
    a.rod([0.55, 0, -0.3], [0.55, 2.1, -0.3], 0.07, { layer: 'dark' });
    a.rod([0.55, 2.1, -0.3], [0.0, 2.1, -0.05], 0.05, { layer: 'dark' });
    a.rod([0.0, 2.1, -0.05], [0.0, 1.78, -0.05], 0.012, { layer: 'steel' });
    a.at(-0.75, 0, 0, Math.PI / 2, () => cabinet(a, 0.5, 1.5, 0.3, { hmi: false }));
  });
  eq.light(-0.75, 1.55, 0);
  eq.anchor.set(0, 2.5, 0);
}

export function impactTester(eq) {
  eq.body((a) => {
    a.blk(0, 0, 0, 0.7, 0.08, 0.7, { layer: 'dark' });
    a.blk(0, 0.08, 0, 0.4, 0.4, 0.4, { layer: 'body' });
    for (const sx of [-1, 1]) a.blk(sx * 0.12, 0.48, 0, 0.08, 0.06, 0.3, { layer: 'dark' });
    for (const sz of [-1, 1]) a.rod([0, 0.48, sz * 0.08], [0, 2.6, sz * 0.08], 0.03, { layer: 'steel' });
    a.blk(0, 2.6, 0, 0.25, 0.12, 0.3, { layer: 'dark' });
    a.cyl(0, 1.9, 0, 0.07, 0.2, { layer: 'dark', seg: 16 });
    a.box(0.08, 1.5, 0.1, 0.01, 1.8, 0.04, { layer: 'body' });
    a.rod([0, 2.72, 0], [0, 2.95, 0.4], 0.04, { layer: 'dark' });
    // chest freezer for low-temperature conditioning
    a.at(0.95, 0, 0.05, 0, () => {
      a.rblk(0, 0, 0, 1.0, 0.85, 0.65, 0.03, { layer: 'body' });
      a.blk(0, 0.85, 0, 1.0, 0.05, 0.65, { layer: 'body' });
      a.box(0, 0.7, 0.33, 0.4, 0.03, 0.02, { layer: 'dark' });
      a.box(0.35, 0.6, 0.326, 0.12, 0.08, 0.004, { layer: 'rubber' });
    });
  });
  eq.light(0.1, 2.72, 0.15);
  eq.anchor.set(0.4, 3.4, 0);
}

export function bendTester(eq) {
  eq.body((a) => {
    a.blk(0, 0, 0, 1.3, 0.12, 0.8, { layer: 'dark' });
    for (const sx of [-1, 1]) a.blk(sx * 0.5, 0.12, 0, 0.16, 1.9, 0.3, { layer: 'body' });
    a.blk(0, 2.0, 0, 1.2, 0.24, 0.36, { layer: 'body' });
    a.cyl(0, 1.75, 0, 0.12, 0.5, { layer: 'dark', seg: 20 });
    a.cyl(0, 1.2, 0, 0.06, 0.6, { layer: 'steel', seg: 14 });
    a.cyl(0, 0.85, 0, 0.09, 0.4, { axis: 'z', layer: 'steel', seg: 22 });
    for (const sx of [-1, 1]) a.cyl(sx * 0.28, 0.5, 0, 0.05, 0.4, { axis: 'z', layer: 'steel', seg: 16 });
    a.blk(0, 0.12, 0, 0.8, 0.3, 0.42, { layer: 'dark' });
    a.at(1.05, 0, 0, 0, () => {
      a.blk(0, 0, 0, 0.6, 0.5, 0.5, { layer: 'body' });
      a.at(0, 0.66, 0, 0, () => motor(a, 0.4, 0.11, { fins: 10 }));
      a.blk(0, 0.5, 0.3, 0.3, 0.4, 0.06, { layer: 'dark' });
    });
  });
  eq.light(1.05, 0.95, 0.3);
  eq.anchor.set(0.2, 2.8, 0);
}
