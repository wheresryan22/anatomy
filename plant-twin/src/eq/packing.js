// Automatic packing: four product surge hoppers with vacuum receivers,
// net-weigh filler, carton line, palletizing robot, stretch wrapper, racks.

import * as THREE from 'three';
import { Assembly, GEO } from '../core/kit.js';
import { motor, gearbox, cabinet, stackPole, hmiPedestal, platform, ladder, hopper, legs4, loadCell, pallet, bolts, flangeY, handrail } from './parts.js';

export const CONVEYOR_Y = 0.72;
export const HOPPER_OFFSET = 1.4;

// Product surge hopper with sight glass and vacuum receiver.
export function surgeHopper(eq) {
  eq.body((a) => {
    hopper(a, 0, 2.7, 0, 0.62, 1.4, 0.8, 0.1, { layer: 'steel', seg: 36 });
    for (let k = 0; k < 4; k++) {
      const t = (k / 4) * Math.PI * 2 + Math.PI / 4;
      a.box(Math.cos(t) * 0.7, 3.8, Math.sin(t) * 0.7, 0.18, 0.2, 0.06, { ry: -t, layer: 'dark' });
    }
    a.box(0.47, 3.0, 0.47, 0.08, 0.06, 0.1, { layer: 'dark', ry: -Math.PI / 4 });
    a.cyl(0.3, 3.15, -0.3, 0.035, 0.05, { layer: 'dark', seg: 10, rx: 0.6 });
    // sight glass frame
    a.box(0, 4.15, 0.64, 0.12, 1.32, 0.03, { layer: 'dark' });
    a.box(0, 4.15, 0.655, 0.06, 1.24, 0.01, { layer: 'glass' });
    // butterfly valve and vacuum receiver with filter head
    a.cyl(0, 5.06, 0, 0.16, 0.06, { layer: 'steel', seg: 18 });
    a.box(0.22, 5.06, 0, 0.16, 0.06, 0.08, { layer: 'dark' });
    a.lathe(0, 5.09, 0, [[0.16, 0], [0.32, 0.18], [0.32, 0.72], [0.35, 0.72], [0.35, 0.75]], { layer: 'steel', seg: 32 });
    a.lathe(0, 5.84, 0, [[0.35, 0], [0.33, 0.1], [0.2, 0.22], [0.0001, 0.25]], { layer: 'steel', seg: 32 });
    a.cyl(0.15, 6.1, 0, 0.05, 0.1, { layer: 'dark', seg: 12 });
    a.box(0.15, 6.18, 0, 0.1, 0.06, 0.06, { layer: 'dark' });
    a.cyl(0.33, 5.62, 0, 0.07, 0.18, { axis: 'x', layer: 'steel', seg: 14 });
    a.cyl(-0.2, 5.98, 0.1, 0.06, 0.18, { layer: 'steel', seg: 14 });
  });
  const level = eq.part((a) => a.box(0, 0, 0, 0.04, 1.2, 0.012, { layer: 'product' }), eq.group, { edges: false });
  level.position.set(0, 3.55, 0.662);
  eq.light(0.0, 6.3, 0.0);
  eq.anchor.set(0, 6.9, 0);
  eq.update = (st) => {
    const f = Math.max(0.001, Math.min(1, st.fill || 0));
    level.scale.y = f;
    level.position.y = 3.55 + 0.6 * f;
  };
}

// Net-weigh filler under the hopper cluster, its platform and feed screws.
export function packer(eq) {
  const H = HOPPER_OFFSET;
  eq.body((a) => {
    platform(a, -2.3, 2.3, -2.3, 2.3, 3.9, {
      maxSpan: 2.3,
      rails: [[[-2.3, -2.3], [2.3, -2.3]], [[-2.3, 2.3], [2.3, 2.3]], [[-2.3, -2.3], [-2.3, 2.3]], [[2.3, -1.2], [2.3, 2.3]]],
    });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      for (const d of [-1, 1]) {
        a.blk(sx * H + d * 0.72, 3.62, sz * H, 0.1, 0.18, 1.5, { layer: 'body' });
        a.blk(sx * H, 3.62, sz * H + d * 0.72, 1.5, 0.18, 0.1, { layer: 'body' });
      }
    }
    a.at(2.42, 0, -1.75, Math.PI / 2, () => ladder(a, 0, 0, 0, 3.9, 0.45, { cage: true, cageDir: 1 }));
    // filler frame
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) a.blk(sx * 0.58, 0, sz * 0.58, 0.1, 2.75, 0.1, { layer: 'body' });
    for (const y of [1.15, 2.7]) {
      for (const sz of [-1, 1]) a.blk(0, y, sz * 0.58, 1.26, 0.1, 0.1, { layer: 'body' });
      for (const sx of [-1, 1]) a.blk(sx * 0.58, y, 0, 0.1, 0.1, 1.26, { layer: 'body' });
    }
    // collector, weigh hopper on three load cells, fine-dribble feeder
    a.lathe(0, 2.45, 0, [[0.16, 0], [0.46, 0.2], [0.46, 0.25]], { layer: 'steel', seg: 28 });
    hopper(a, 0, 1.75, 0, 0.32, 0.22, 0.3, 0.09, { layer: 'steel', seg: 28 });
    for (let k = 0; k < 3; k++) {
      const t = (k / 3) * Math.PI * 2;
      a.box(Math.cos(t) * 0.38, 2.15, Math.sin(t) * 0.38, 0.14, 0.04, 0.08, { ry: -t, layer: 'dark' });
      loadCell(a, Math.cos(t) * 0.5, 2.08, Math.sin(t) * 0.5);
    }
    a.box(0.35, 2.32, 0.25, 0.4, 0.06, 0.12, { layer: 'steel', rz: -0.12 });
    a.blk(0.55, 2.2, 0.25, 0.14, 0.1, 0.14, { layer: 'dark' });
    // slide gate, filling spout with dust collar and extraction
    a.blk(0, 1.62, 0, 0.32, 0.1, 0.22, { layer: 'dark' });
    a.cyl(0.24, 1.67, 0, 0.03, 0.2, { axis: 'x', layer: 'steel', seg: 10 });
    a.cyl(0, 1.38, 0, 0.09, 0.42, { layer: 'steel', seg: 18 });
    a.lathe(0, 1.12, 0, [[0.09, 0], [0.2, 0.06], [0.2, 0.12], [0.09, 0.16]], { layer: 'steel', seg: 22 });
    a.pipe([[0.2, 1.24, 0], [0.45, 1.24, 0], [0.45, 3.85, 0]], 0.05, { layer: 'steel', bend: 0.1 });
    // feed screws from each hopper
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      a.pipe([[sx * H, 2.6, sz * H], [sx * 0.3, 2.6, sz * 0.3]], 0.07, { layer: 'steel' });
      a.cyl(sx * H, 2.66, sz * H, 0.1, 0.1, { layer: 'dark', seg: 14 });
      const d = new THREE.Vector3(-sx, 0, -sz).normalize();
      const ry = Math.atan2(-d.z, d.x);
      a.at(sx * (H + 0.32), 2.6, sz * (H + 0.32), ry, () => { motor(a, 0.36, 0.085, { fins: 10 }); });
    }
    a.at(-1.3, 0, 1.4, Math.PI * 0.75, () => hmiPedestal(a, 1.3));
    a.at(-1.4, 0, -1.5, 0, () => cabinet(a, 1.2, 2.0, 0.5, { vents: true }));
  });
  eq.light(0.58, 2.8, 0.58);
  eq.anchor.set(0, 7.2, 0);
}

// Carton line from the filler to the robot: rollers, liner sealer, case taper,
// print-and-apply labeller, checkweigher, metal detector, reject.
export function packConveyor(eq) {
  const y = CONVEYOR_Y;
  eq.body((a) => {
    for (const sz of [-1, 1]) a.blk(2.75, y - 0.12, sz * 0.34, 8.5, 0.12, 0.04, { layer: 'body' });
    for (let x = -1.4; x <= 7.0; x += 1.4) for (const sz of [-1, 1]) {
      a.blk(x, 0, sz * 0.32, 0.06, y - 0.12, 0.06, { layer: 'body' });
      a.blk(x, 0, sz * 0.32, 0.14, 0.01, 0.14, { layer: 'dark' });
    }
    for (let x = -1.45; x <= 6.95; x += 0.1) {
      if (x > 4.75 && x < 5.65) continue;
      a.cyl(x, y - 0.03, 0, 0.028, 0.64, { axis: 'z', layer: 'steel', seg: 10, edges: false });
    }
    // filling station vibrating platform
    a.blk(0, y - 0.02, 0, 0.6, 0.05, 0.6, { layer: 'dark' });
    // liner sealer
    a.at(1.3, 0, -0.75, 0, () => {
      a.blk(0, 0, 0, 0.5, 1.0, 0.4, { layer: 'body' });
      a.box(0, 1.15, 0.2, 0.06, 0.3, 0.5, { layer: 'dark', rx: 0.5 });
    });
    // case taper portal
    a.at(2.7, 0, 0, 0, () => {
      for (const sz of [-1, 1]) a.blk(0, 0, sz * 0.48, 1.1, 1.55, 0.18, { layer: 'body' });
      a.blk(0, 1.4, 0, 1.1, 0.25, 1.14, { layer: 'body' });
      a.blk(0, 1.22, 0, 0.32, 0.18, 0.16, { layer: 'dark' });
      a.cyl(-0.25, 1.32, 0, 0.11, 0.06, { axis: 'z', layer: 'dark' });
      for (const sz of [-1, 1]) a.box(-0.6, 1.1, sz * 0.2, 0.3, 0.02, 0.02, { layer: 'steel', rz: 0.3 });
      a.blk(0.4, 1.65, 0.45, 0.3, 0.3, 0.12, { layer: 'dark' });
    });
    // print-and-apply labeller
    a.at(4.0, 0, 0.75, 0, () => {
      a.blk(0, 0, 0, 0.25, 0.9, 0.25, { layer: 'dark' });
      a.blk(0, 0.9, 0, 0.55, 0.5, 0.36, { layer: 'body' });
      a.cyl(-0.12, 1.15, 0.2, 0.12, 0.06, { axis: 'z', layer: 'steel' });
      a.box(0, 0.92, -0.32, 0.12, 0.05, 0.3, { layer: 'dark' });
    });
    // checkweigher with display
    a.blk(5.2, y - 0.1, 0, 0.9, 0.1, 0.6, { layer: 'rubber' });
    a.blk(5.2, 0, 0, 0.7, y - 0.1, 0.5, { layer: 'body' });
    a.rod([5.2, y, -0.55], [5.2, 1.5, -0.55], 0.05, { layer: 'dark' });
    a.box(5.2, 1.6, -0.52, 0.36, 0.26, 0.08, { layer: 'body' });
    a.box(5.2, 1.6, -0.475, 0.3, 0.2, 0.006, { layer: 'rubber' });
    // metal detector aperture
    a.at(6.2, 0, 0, 0, () => {
      a.blk(0, y + 0.42, 0, 0.42, 0.18, 0.9, { layer: 'body' });
      for (const sz of [-1, 1]) a.blk(0, 0.25, sz * 0.38, 0.42, y + 0.35, 0.14, { layer: 'body' });
      a.blk(0, 0.25, 0, 0.42, y - 0.36, 0.9, { layer: 'body' });
      a.box(0.22, y + 0.3, 0.42, 0.01, 0.2, 0.06, { layer: 'rubber' });
    });
    // reject pusher and bin
    a.cyl(6.75, y + 0.15, -0.52, 0.05, 0.36, { axis: 'z', layer: 'steel', seg: 12 });
    a.blk(6.75, 0, 0.62, 0.6, 0.55, 0.5, { layer: 'dark' });
  });
  // moving cartons
  const cartons = [];
  for (let i = 0; i < 12; i++) {
    const g = eq.part((a) => {
      a.blk(0, 0, 0, 0.4, 0.32, 0.3, { layer: 'body' });
      a.box(0, 0.321, 0, 0.4, 0.004, 0.05, { layer: 'dark', edges: false });
    });
    g.visible = false;
    cartons.push(g);
  }
  eq.live.cartons = cartons;
  let phase = 0;
  eq.light(5.2, 1.75, -0.52);
  eq.anchor.set(2.7, 2.4, 0);
  eq.update = (st, dt) => {
    if (st.running) phase += dt * 0.32;
    const spacing = 0.85;
    for (let i = 0; i < cartons.length; i++) {
      const d = ((phase + i * spacing) % (cartons.length * spacing));
      const x = d - 0.05;
      const c = cartons[i];
      c.visible = st.active && x < 7.2;
      c.position.set(Math.max(0, x), y, 0);
    }
  };
}

// Palletizing robot cell with two pallet positions.
export function palletizer(eq) {
  const L1 = 1.25, L2 = 1.4;
  eq.body((a) => {
    a.blk(0, 0, 0, 1.0, 0.04, 1.0, { layer: 'dark' });
    a.blk(0, 0.04, 0, 0.8, 0.42, 0.8, { layer: 'body' });
    a.cyl(0, 0.62, 0, 0.42, 0.32, { layer: 'dark', seg: 32 });
    bolts(a, 0, 0.785, 0, 0.36, 12, 'y', 0.014);
    // pallet positions with roller beds
    for (const sz of [-1, 1]) {
      a.at(0, 0, sz * 2.15, 0, () => {
        a.blk(0.6, 0, 0, 1.6, 0.18, 1.2, { layer: 'dark' });
        for (let x = -0.1; x <= 1.3; x += 0.2) a.cyl(x, 0.2, 0, 0.04, 1.1, { axis: 'z', layer: 'steel', seg: 10, edges: false });
      });
    }
    // empty pallet dispenser
    a.at(1.7, 0, 0, Math.PI / 2, () => {
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) a.blk(sx * 0.7, 0, sz * 0.5, 0.08, 1.6, 0.08, { layer: 'body' });
      for (let k = 0; k < 8; k++) pallet(a, 0, k * 0.144, 0, 0);
    });
    // fence with light-curtain exits
    const F = [[-1.3, -3.4], [3.0, -3.4], [3.0, 3.4], [-1.3, 3.4], [-1.3, 0.6]];
    for (let i = 0; i < F.length - 1; i++) {
      const [x0, z0] = F[i], [x1, z1] = F[i + 1];
      const len = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.ceil(len / 1.4)), ang = Math.atan2(z1 - z0, x1 - x0);
      for (let k = 0; k <= n; k++) {
        const t = k / n, x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t;
        a.blk(x, 0, z, 0.06, 2.2, 0.06, { layer: 'dark' });
        if (k < n) {
          const xm = x0 + (x1 - x0) * (t + 0.5 / n), zm = z0 + (z1 - z0) * (t + 0.5 / n);
          const skip = x0 === 3.0 && Math.abs(zm) > 1.6;
          if (!skip) a.box(xm, 1.15, zm, len / n - 0.08, 1.9, 0.01, { ry: -ang, layer: 'glass' });
          for (const yy of [0.2, 2.1]) a.box(xm, yy, zm, len / n - 0.08, 0.025, 0.025, { ry: -ang, layer: 'dark' });
        }
      }
    }
    for (const sz of [-1, 1]) for (const dz of [-0.7, 0.7]) a.blk(3.0, 0, sz * 2.15 + dz, 0.07, 1.7, 0.07, { layer: 'dark' });
    a.at(3.6, 0, -0.6, -Math.PI / 2, () => { cabinet(a, 1.2, 2.0, 0.5, { hmi: true, vents: true }); stackPole(a, 0.45, 2.03, 0, 0.16); });
  });
  // kinematic chain
  const j1 = new THREE.Group(); j1.position.set(0, 0.78, 0); eq.group.add(j1);
  eq.part((a) => {
    a.blk(0, 0, 0, 0.66, 0.5, 0.62, { layer: 'body' });
    for (const sz of [-1, 1]) a.cyl(0.18, 0.58, sz * 0.36, 0.17, 0.12, { axis: 'z', layer: 'dark' });
    a.at(-0.3, 0.42, 0.32, 0, () => motor(a, 0.4, 0.11, { fins: 10 }), 0, Math.PI / 2);
    a.cyl(-0.2, 0.25, -0.38, 0.06, 0.5, { layer: 'dark', rz: 0.6, seg: 12 });
  }, j1);
  const j2 = new THREE.Group(); j2.position.set(0.18, 0.58, 0); j1.add(j2);
  eq.part((a) => {
    a.blk(0, -0.05, 0, 0.26, L1 + 0.1, 0.24, { layer: 'body' });
    a.cyl(0, L1, 0, 0.16, 0.34, { axis: 'z', layer: 'dark' });
  }, j2);
  const j3 = new THREE.Group(); j3.position.set(0, L1, 0); j2.add(j3);
  eq.part((a) => {
    a.box(L2 / 2 - 0.1, 0, 0, L2 + 0.3, 0.2, 0.2, { layer: 'body' });
    a.box(-0.35, 0, 0, 0.3, 0.32, 0.3, { layer: 'dark' });
    a.cyl(L2, 0, 0, 0.1, 0.24, { axis: 'z', layer: 'dark' });
  }, j3);
  const wrist = new THREE.Group(); wrist.position.set(L2, 0, 0); j3.add(wrist);
  eq.part((a) => {
    a.cyl(0, -0.12, 0, 0.09, 0.24, { layer: 'dark', seg: 16 });
    a.blk(0, -0.36, 0, 0.5, 0.08, 0.42, { layer: 'body' });
    for (const sx of [-1, 1]) a.blk(sx * 0.2, -0.72, 0, 0.04, 0.38, 0.38, { layer: 'dark' });
    a.blk(0, -0.48, 0.19, 0.3, 0.12, 0.04, { layer: 'dark' });
  }, wrist);
  const held = eq.part((a) => a.blk(0, -0.74, 0, 0.36, 0.32, 0.3, { layer: 'body' }), wrist);
  held.visible = false;
  // pallet loads grow with the sim's carton count
  const stacks = [-1, 1].map((sz) => {
    const g = new THREE.Group();
    g.position.set(0.6, 0.2, sz * 2.15);
    eq.group.add(g);
    eq.part((a) => pallet(a, 0, 0, 0, 0), g);
    return g;
  });
  eq.live = { j1, j2, j3, wrist, stacks };
  const layerMeshes = [new Map(), new Map()];
  const loadFor = (side, n) => {
    const g = stacks[side];
    for (const [k, m] of layerMeshes[side]) { m.visible = k < n; }
    for (let k = 0; k < n; k++) {
      if (layerMeshes[side].has(k)) continue;
      const lay = Math.floor(k / 8), i = k % 8;
      const cx = -0.45 + (i % 4) * 0.3, cz = -0.2 + Math.floor(i / 4) * 0.4;
      const m = eq.part((a) => {
        a.blk(0, 0, 0, 0.3, 0.32, 0.4, { layer: 'body' });
        a.box(0, 0.321, 0, 0.05, 0.004, 0.4, { layer: 'dark', edges: false });
      }, g);
      m.position.set(cx, 0.144 + lay * 0.32, cz);
      layerMeshes[side].set(k, m);
    }
  };
  // two-link IK in the turret plane; h is the carton underside height
  const solve = (r, h) => {
    const ex = r - 0.18, ey = h + 0.74 - 1.36;
    const d = Math.min(L1 + L2 - 0.01, Math.hypot(ex, ey));
    const c2 = (d * d - L1 * L1 - L2 * L2) / (2 * L1 * L2);
    const t2 = Math.acos(Math.max(-1, Math.min(1, c2)));
    const a1 = Math.atan2(ey, ex) + Math.atan2(L2 * Math.sin(t2), L1 + L2 * Math.cos(t2));
    const a2 = a1 - t2;
    j2.rotation.z = a1 - Math.PI / 2;
    j3.rotation.z = a2 - (a1 - Math.PI / 2);
    wrist.rotation.z = -a2;
  };
  let t = 0;
  eq.anchor.set(0, 3.6, 0);
  eq.light(3.6, 2.19, -0.15);
  eq.update = (st, dt) => {
    loadFor(0, st.countA || 0);
    loadFor(1, st.countB || 0);
    const side = st.side ?? 0;
    const sz = side === 0 ? -1 : 1;
    if (st.running) t = (t + dt / 5.5) % 1;
    const n = (side === 0 ? st.countA : st.countB) || 0;
    const i = n % 8;
    const px = 0.6 - 0.45 + (i % 4) * 0.3, pz = sz * 2.15 - 0.2 + Math.floor(i / 4) * 0.4;
    const pick = { yaw: Math.PI, r: 1.45, h: CONVEYOR_Y };
    const place = { yaw: Math.atan2(-pz, px), r: Math.hypot(px, pz), h: 0.344 + Math.floor(n / 8) * 0.32 };
    const travel = Math.max(pick.h, place.h) + 0.55;
    let yaw, r, h, carrying;
    if (t < 0.12) { const u = smooth(t / 0.12); yaw = pick.yaw; r = pick.r; h = travel + (pick.h - travel) * u; carrying = false; }
    else if (t < 0.24) { const u = smooth((t - 0.12) / 0.12); yaw = pick.yaw; r = pick.r; h = pick.h + (travel - pick.h) * u; carrying = true; }
    else if (t < 0.55) { const u = smooth((t - 0.24) / 0.31); yaw = pick.yaw + (place.yaw - pick.yaw) * u; r = pick.r + (place.r - pick.r) * u; h = travel; carrying = true; }
    else if (t < 0.67) { const u = smooth((t - 0.55) / 0.12); yaw = place.yaw; r = place.r; h = travel + (place.h - travel) * u; carrying = true; }
    else if (t < 0.75) { const u = smooth((t - 0.67) / 0.08); yaw = place.yaw; r = place.r; h = place.h + (travel - place.h) * u; carrying = false; }
    else { const u = smooth((t - 0.75) / 0.25); yaw = place.yaw + (pick.yaw - place.yaw) * u; r = place.r + (pick.r - place.r) * u; h = travel; carrying = false; }
    j1.rotation.y = yaw;
    solve(r, h);
    held.visible = !!st.running && carrying;
  };
}

function smooth(u) {
  return u * u * (3 - 2 * u);
}

// Turntable stretch wrapper.
export function wrapper(eq) {
  eq.body((a) => {
    a.blk(0, 0, 0, 2.2, 0.08, 2.2, { layer: 'dark' });
    a.cyl(0, 0.12, 0, 1.0, 0.08, { layer: 'dark', seg: 40 });
    a.blk(1.35, 0, 0, 0.3, 0.12, 0.5, { layer: 'dark' });
    a.blk(1.35, 0.12, 0, 0.22, 2.9, 0.22, { layer: 'body' });
    a.blk(1.35, 3.0, 0, 0.3, 0.1, 0.3, { layer: 'body' });
    a.at(1.35, 0, -0.75, 0, () => { cabinet(a, 0.5, 1.4, 0.3, {}); });
  });
  const table = new THREE.Group(); table.position.set(0, 0.16, 0); eq.group.add(table);
  eq.part((a) => {
    a.cyl(0, 0.02, 0, 0.95, 0.04, { layer: 'steel', seg: 40 });
    pallet(a, 0, 0.04, 0, 0);
    a.blk(0, 0.184, 0, 1.2, 1.28, 0.8, { layer: 'body' });
    for (let k = 1; k < 4; k++) a.box(0, 0.184 + k * 0.32, 0, 1.21, 0.004, 0.81, { layer: 'dark', edges: false });
    a.blk(0, 0.15, 0, 1.24, 1.36, 0.84, { layer: 'glass' });
  }, table);
  const carriage = eq.part((a) => {
    a.blk(0, 0, 0, 0.3, 0.45, 0.4, { layer: 'dark' });
    a.cyl(-0.22, 0.22, 0, 0.06, 0.5, { layer: 'body', seg: 16 });
  });
  carriage.position.set(1.3, 0.4, 0);
  eq.live = { table, carriage };
  let t = 0;
  eq.light(1.35, 1.4, -0.75);
  eq.anchor.set(0, 3.4, 0);
  eq.update = (st, dt) => {
    table.visible = !!st.loaded;
    if (st.running) {
      t += dt;
      table.rotation.y += dt * 1.2;
      carriage.position.y = 0.4 + (Math.sin(t * 0.35) * 0.5 + 0.5) * 1.1;
    }
  };
}

// Pallet racking, rows run along local Z. Loads are rebuilt from the sim.
export function palletRacks(eq) {
  const rows = eq.def.rows, bays = 6, bayW = 2.7, levels = [0, 1.6, 3.2], h = 4.6, depth = 1.1;
  const z0 = -(bays * bayW) / 2;
  eq.body((a) => {
    for (const xc of rows) {
      for (let b = 0; b <= bays; b++) {
        const z = z0 + b * bayW;
        for (const sx of [-1, 1]) {
          a.blk(xc + (sx * depth) / 2, 0, z, 0.07, h, 0.09, { layer: 'body' });
          a.blk(xc + (sx * depth) / 2, 0, z, 0.14, 0.01, 0.16, { layer: 'dark' });
        }
        for (let y = 0.3; y < h - 0.6; y += 1.2) {
          a.bar([xc - depth / 2, y, z], [xc + depth / 2, y + 0.6, z], 0.03, { layer: 'body' });
          a.bar([xc + depth / 2, y + 0.6, z], [xc - depth / 2, y + 1.2, z], 0.03, { layer: 'body' });
        }
      }
      for (let b = 0; b < bays; b++) {
        const zc = z0 + (b + 0.5) * bayW;
        for (const y of levels.slice(1)) for (const sx of [-1, 1]) a.blk(xc + (sx * depth) / 2, y - 0.12, zc, 0.05, 0.12, bayW - 0.09, { layer: 'dark' });
      }
      for (const z of [z0 - 0.25, z0 + bays * bayW + 0.25]) a.blk(xc, 0, z, depth + 0.2, 0.4, 0.12, { layer: 'dark' });
    }
  });
  const slots = [];
  for (const xc of rows) for (let b = 0; b < bays; b++) for (const y of levels) for (let k = 0; k < 3; k++) slots.push([xc, y, z0 + b * bayW + 0.45 + k * 0.9]);
  eq.slots = slots;
  let loads = null;
  let sig = '';
  eq.anchor.set((rows[0] + rows[rows.length - 1]) / 2, 5.4, 0);
  // pallets: array of 'hold' | 'test' | 'ok' | 'reject' per occupied slot
  eq.setPallets = (list) => {
    const s = list.join('');
    if (s === sig) return;
    sig = s;
    if (loads) {
      eq.group.remove(loads);
      loads.traverse((o) => o.geometry && o.geometry.dispose());
      eq.mats.meshes = eq.mats.meshes.filter((m) => m.parent && m.parent !== loads);
      eq.mats.lines = eq.mats.lines.filter((l) => l.parent !== loads);
    }
    if (!list.length) { loads = null; return; }
    const a = new Assembly();
    list.forEach((state, i) => {
      if (i >= slots.length) return;
      const [x, y, z] = slots[i];
      a.blk(x, y, z, 1.2, 0.144, 0.8, { layer: 'dark' });
      a.blk(x, y + 0.144, z, 1.18, 1.28, 0.78, { layer: 'body' });
      for (let k = 1; k < 4; k++) a.box(x, y + 0.144 + k * 0.32, z, 1.19, 0.004, 0.79, { layer: 'dark', edges: false });
      if (state !== 'ok') a.box(x - 0.6, y + 1.0, z, 0.01, 0.22, 0.3, { layer: state === 'reject' ? 'rubber' : 'product' });
    });
    loads = a.build(eq.mats);
    eq.group.add(loads);
  };
}
