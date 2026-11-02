// Extrusion line, flow along local +X. `side` = +1 puts operator-side
// equipment (cabinets, panels) toward +Z, -1 toward -Z.

import * as THREE from 'three';
import { GEO } from '../core/kit.js';
import { motor, gearbox, cabinet, stackPole, platform, stair, handrail, hopper, rotaryValve, legs4, loadCell, bolts, flangeY } from './parts.js';

export const DECK = 2.6;
export const DOCK_X = 0.9;
export const DOCK_Y = DECK + 0.42;
const CL = 1.15; // extruder centre-line height

// Feed station: steel platform, container docking frame, twin-screw feeder below deck.
export function feedStation(eq) {
  const s = eq.def.side;
  const z2 = -s; // stair side
  eq.body((a) => {
    platform(a, 0.2, 3.4, -1.6, 1.6, DECK, {
      maxSpan: 3.2,
      rails: [
        [[0.2, -1.6 * s], [0.2, -0.8 * s]],
        [[0.2, 0.8 * s], [0.2, 1.6 * s]],
        [[0.2, 1.6 * s], [3.4, 1.6 * s]],
        [[3.4, 1.6 * s], [3.4, -1.6 * s]],
        [[0.2, 1.6 * z2], [2.4, 1.6 * z2]],
      ],
    });
    stair(a, 0.55, 0, 2.05 * z2, DECK, 0, 0.75);
    // container docking frame with corner guides
    a.at(DOCK_X, DECK, 0, 0, () => {
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        a.blk(sx * 0.6, 0, sz * 0.6, 0.08, 0.42, 0.08);
        a.add(GEO.cyl(0.0, 0.06, 0.16, 4), sx * 0.6, 0.5, sz * 0.6, { ry: Math.PI / 4, layer: 'dark' });
      }
      for (const sz of [-1, 1]) a.blk(0, 0.34, sz * 0.6, 1.28, 0.08, 0.08);
      for (const sx of [-1, 1]) a.blk(sx * 0.6, 0.34, 0, 0.08, 0.08, 1.28);
      // pneumatic valve actuator and docking cone
      a.lathe(0, 0.04, 0, [[0.16, 0], [0.16, 0.06], [0.3, 0.2], [0.32, 0.22]], { layer: 'steel', seg: 24 });
      a.blk(0.28, 0.08, 0, 0.18, 0.12, 0.12, { layer: 'dark' });
      a.cyl(0.45, 0.14, 0, 0.035, 0.22, { axis: 'x', layer: 'steel', seg: 12 });
      a.blk(-0.4, 0.42, 0.62, 0.3, 0.04, 0.04, { layer: 'dark' });
    });
    // flexible sleeve through the deck to the feeder hopper
    a.cyl(DOCK_X, DECK - 0.2, 0, 0.13, 0.36, { layer: 'rubber', seg: 18 });
    for (const y of [DECK - 0.32, DECK - 0.24, DECK - 0.16, DECK - 0.08]) a.ring(DOCK_X, y, 0, 0.135, 0.01, { axis: 'y', layer: 'rubber' });
    // loss-in-weight twin-screw feeder hung under the deck
    hopper(a, DOCK_X, 1.98, 0, 0.32, 0.18, 0.26, 0.11, { layer: 'steel' });
    for (const sx of [-1, 1]) {
      a.rod([DOCK_X + sx * 0.36, 2.2, 0], [DOCK_X + sx * 0.36, DECK - 0.24, 0], 0.03, { layer: 'dark' });
      loadCell(a, DOCK_X + sx * 0.36, 2.06, 0);
    }
    a.blk(1.85, 1.72, 0, 2.15, 0.24, 0.3, { layer: 'steel' });
    a.blk(1.85, 1.96, 0, 2.2, 0.03, 0.34, { layer: 'steel' });
    for (let x = 1.0; x < 2.9; x += 0.45) a.box(x, 1.84, 0.153, 0.02, 0.22, 0.008, { layer: 'dark', edges: false });
    a.at(0.55, 1.84, 0, Math.PI, () => {
      gearbox(a, 0.26, 0.3, 0.28);
      a.at(0.36, -0.02, 0, 0, () => motor(a, 0.42, 0.11, { fins: 10 }));
    });
    a.cyl(2.76, 1.58, 0, 0.08, 0.26, { layer: 'steel', seg: 16 });
    a.ring(2.76, 1.5, 0, 0.09, 0.012, { axis: 'y', layer: 'steel' });
    for (const x of [1.2, 2.6]) a.rod([x, 1.98, 0], [x, DECK - 0.24, 0], 0.025, { layer: 'dark' });
    // feeder controller on the deck rail
    a.blk(3.15, DECK, 1.35 * s, 0.4, 0.55, 0.22, { layer: 'body' });
    a.box(3.15, DECK + 0.38, 1.35 * s - 0.115 * s, 0.26, 0.18, 0.01, { layer: 'rubber' });
  });
  eq.light(3.15, DECK + 0.55, 1.35 * s);
  eq.anchor.set(1.8, DECK + 2.2, 0);
  eq.dock = { x: DOCK_X, y: DOCK_Y, z: 0 };
}

// TSE-70C co-rotating twin-screw extruder.
export function extruder(eq) {
  const s = eq.def.side;
  const x0 = 2.68, sec = 0.32, nSec = 9;
  eq.body((a) => {
    // fabricated bed with levelling feet
    for (const sz of [-1, 1]) a.blk(3.0, 0.08, sz * 0.42, 5.9, 0.42, 0.1, { layer: 'dark' });
    for (let x = 0.15; x <= 5.95; x += 0.97) a.blk(x, 0.08, 0, 0.1, 0.42, 0.84, { layer: 'dark' });
    a.blk(1.4, 0.5, 0, 2.6, 0.04, 0.94, { layer: 'dark' });
    a.blk(4.3, 0.5, 0, 3.1, 0.04, 0.94, { layer: 'dark' });
    for (const x of [0.15, 2.1, 4.0, 5.9]) for (const sz of [-1, 1]) {
      a.cyl(x, 0.04, sz * 0.42, 0.06, 0.08, { layer: 'dark', seg: 10 });
      a.cyl(x, 0.006, sz * 0.42, 0.08, 0.012, { layer: 'dark', seg: 10 });
    }
    // main drive motor on its stool
    a.blk(0.85, 0.54, 0, 0.85, 0.08, 0.7, { layer: 'dark' });
    a.at(0.85, CL - 0.1, 0, 0, () => motor(a, 1.05, 0.32, { feet: true, feetH: 0.15, fins: 18 }));
    // coupling guard
    a.box(1.56, CL - 0.1, 0, 0.36, 0.44, 0.46, { layer: 'body' });
    for (let k = 0; k < 4; k++) a.box(1.56, CL - 0.26 + k * 0.1, 0.232, 0.28, 0.012, 0.004, { layer: 'dark', edges: false });
    // gearbox with oil cooler and torque limiter housing
    a.at(2.17, 1.0, 0, 0, () => gearbox(a, 0.95, 1.0, 0.92, { cooler: true }));
    a.cyl(2.17, 1.62, -0.3, 0.05, 0.12, { layer: 'steel', seg: 12 });
    a.blk(2.17, 0.54, 0.62 * s, 0.4, 0.5, 0.25, { layer: 'dark' });
    a.rod([2.0, 0.85, 0.5 * s], [2.0, 0.85, 0.74 * s], 0.04, { layer: 'steel' });
    // barrel: nine sections with clamp-on heaters and cooling
    for (let i = 0; i < nSec; i++) {
      const x = x0 + sec * (i + 0.5);
      a.box(x, CL, 0, sec - 0.01, 0.28, 0.4, { layer: 'steel' });
      for (const sz of [-1, 1]) {
        a.box(x, CL, sz * 0.225, sec - 0.05, 0.34, 0.05, { layer: 'dark' });
        for (let k = -1; k <= 1; k++) a.box(x, CL + k * 0.1, sz * 0.253, sec - 0.08, 0.018, 0.008, { layer: 'dark', edges: false });
      }
      a.box(x, CL - 0.17, 0, sec - 0.05, 0.05, 0.34, { layer: 'dark' });
      // flange between sections
      if (i > 0) a.box(x - sec / 2, CL, 0, 0.026, 0.36, 0.5, { layer: 'steel' });
      if (i > 0) for (const sy of [-1, 1]) for (const sz of [-1, 1]) a.cyl(x - sec / 2, CL + sy * 0.15, sz * 0.21, 0.014, 0.06, { axis: 'x', layer: 'steel', seg: 6, edges: false });
      // thermocouple on top
      if (i !== 0 && i !== 6) {
        a.cyl(x + 0.06, CL + 0.18, -0.08, 0.012, 0.08, { layer: 'steel', seg: 8 });
        a.cyl(x + 0.06, CL + 0.24, -0.08, 0.022, 0.04, { layer: 'dark', seg: 8 });
      }
      // cooling water branch and solenoid valve
      a.blk(x, 0.82, -0.36, 0.07, 0.07, 0.07, { layer: 'dark' });
      a.rod([x, 0.89, -0.36], [x, CL - 0.12, -0.36], 0.018, { layer: 'steel' });
      a.rod([x, CL - 0.12, -0.36], [x, CL - 0.12, -0.25], 0.018, { layer: 'steel' });
    }
    const x1 = x0 + sec * nSec;
    // cooling water manifolds and heater cable duct
    a.pipe([[x0 - 0.2, 0.74, -0.42], [x1 + 0.05, 0.74, -0.42]], 0.025, { layer: 'steel' });
    a.pipe([[x0 - 0.2, 0.68, -0.34], [x1 + 0.05, 0.68, -0.34]], 0.025, { layer: 'steel' });
    a.blk((x0 + x1) / 2, CL + 0.36, 0.34, x1 - x0, 0.07, 0.09, { layer: 'dark' });
    for (let i = 0; i < nSec; i++) a.rod([x0 + sec * (i + 0.5), CL + 0.36, 0.3], [x0 + sec * (i + 0.5), CL + 0.15, 0.25], 0.012, { layer: 'rubber', edges: false });
    // feed throat on section 1
    a.blk(x0 + sec * 0.5, CL + 0.14, 0, 0.24, 0.1, 0.32, { layer: 'steel' });
    a.blk(x0 + sec * 0.5, CL + 0.24, 0, 0.3, 0.03, 0.36, { layer: 'steel' });
    // atmospheric vent on section 7
    a.at(x0 + sec * 6.5, CL + 0.14, 0, 0, () => {
      a.blk(0, 0, 0, 0.22, 0.12, 0.28, { layer: 'steel' });
      a.cyl(0, 0.24, 0, 0.07, 0.24, { layer: 'steel', seg: 16 });
      a.lathe(0, 0.36, 0, [[0.11, 0], [0.11, 0.03], [0.07, 0.08], [0.0001, 0.1]], { layer: 'steel', seg: 16 });
    });
    // barrel supports
    for (const x of [3.55, 5.0]) {
      a.blk(x, 0.54, 0, 0.16, CL - 0.19 - 0.54, 0.5, { layer: 'dark' });
      a.blk(x, CL - 0.2, 0, 0.24, 0.03, 0.56, { layer: 'dark' });
    }
    // adapter, breaker plate and slot die
    a.box(x1 + 0.08, CL, 0, 0.16, 0.36, 0.46, { layer: 'steel' });
    a.lathe(x1 + 0.17, CL, 0, [[0.2, 0], [0.12, 0.12]], { layer: 'steel', rz: -Math.PI / 2, seg: 20 });
    a.box(x1 + 0.34, CL, 0, 0.1, 0.16, 0.56, { layer: 'steel' });
    for (const sz of [-1, 1]) a.box(x1 + 0.34, CL, sz * 0.2, 0.12, 0.2, 0.06, { layer: 'dark' });
    a.box(x1 + 0.4, CL, 0, 0.02, 0.012, 0.46, { layer: 'rubber', edges: false });
    a.cyl(x1 + 0.12, CL + 0.24, 0, 0.018, 0.12, { layer: 'steel', seg: 8 });
    a.cyl(x1 + 0.12, CL + 0.32, 0, 0.035, 0.05, { layer: 'dark', seg: 10 });
    // transparent barrel guard on a tube frame
    a.box((x0 + x1) / 2, CL + 0.1, 0, x1 - x0 + 0.05, 0.62, 0.7, { layer: 'glass' });
    for (const x of [x0, x1]) for (const sz of [-1, 1]) a.rod([x, 0.62, sz * 0.36], [x, CL + 0.42, sz * 0.36], 0.03, { layer: 'dark' });
    a.rod([x0, CL + 0.42, -0.36], [x1, CL + 0.42, -0.36], 0.03, { layer: 'dark' });
    a.rod([x0, CL + 0.42, 0.36], [x1, CL + 0.42, 0.36], 0.03, { layer: 'dark' });
    // floor cable trench to the control cabinet
    a.blk(3.9, 0, 1.25 * s, 0.4, 0.012, 1.7, { layer: 'dark' });
    // free-standing control cabinet with HMI, facing the line
    a.at(3.9, 0, 2.25 * s, s > 0 ? Math.PI : 0, () => {
      cabinet(a, 1.6, 2.0, 0.5, { hmi: true, vents: true });
      stackPole(a, 0.62, 2.03, 0, 0.18);
    });
  });
  eq.light(3.9 + (s > 0 ? -0.62 : 0.62), 2.21, 2.25 * s);
  eq.anchor.set(4.0, 2.6, 0);
}

// Squeeze / chill roll pair taking the melt from the die.
export function chillRoll(eq) {
  const s = eq.def.side;
  eq.body((a) => {
    a.blk(0.45, 0, 0, 1.1, 0.1, 1.4, { layer: 'dark' });
    for (const sz of [-1, 1]) {
      a.blk(0.45, 0.1, sz * 0.6, 0.9, 1.45, 0.05, { layer: 'body' });
      a.blk(0.45, 1.55, sz * 0.6, 0.94, 0.05, 0.09, { layer: 'body' });
      a.box(0.45, 1.0, sz * 0.66, 0.3, 0.2, 0.08, { layer: 'dark' });
      a.box(0.45, 1.36, sz * 0.66, 0.3, 0.2, 0.08, { layer: 'dark' });
      // nip adjusting screw with handwheel
      a.rod([0.45, 1.46, sz * 0.66], [0.45, 1.85, sz * 0.66], 0.035, { layer: 'steel' });
      a.ring(0.45, 1.85, sz * 0.66, 0.11, 0.012, { axis: 'y', layer: 'dark', ts: 20 });
      for (let k = 0; k < 3; k++) {
        const t = (k / 3) * Math.PI * 2;
        a.rod([0.45, 1.85, sz * 0.66], [0.45 + Math.cos(t) * 0.11, 1.85, sz * 0.66 + Math.sin(t) * 0.11], 0.012, { layer: 'dark' });
      }
    }
    // drive and rotary unions
    a.at(0.45, 1.0, 0.86 * s, s > 0 ? -Math.PI / 2 : Math.PI / 2, () => gearbox(a, 0.3, 0.34, 0.3));
    a.at(0.45, 0.55, 0.86 * s, 0, () => motor(a, 0.5, 0.13, { fins: 10 }), 0, Math.PI / 2);
    for (const y of [1.0, 1.36]) {
      a.cyl(0.45, y, -0.76 * s, 0.05, 0.14, { axis: 'z', layer: 'steel', seg: 12 });
      a.pipe([[0.45, y, -0.83 * s], [0.45, y, -0.95 * s], [0.45, y - 0.85, -0.95 * s]], 0.022, { layer: 'rubber', bend: 0.12 });
    }
    // take-off plate to the belt
    a.box(0.85, 1.02, 0, 0.42, 0.015, 0.84, { layer: 'steel', rz: -0.06 });
  });
  // the rolls turn
  const rollPivot = (y) => {
    const g = new THREE.Group();
    g.position.set(0.45, y, 0);
    eq.group.add(g);
    eq.part((a) => {
      a.cyl(0, 0, 0, 0.16, 1.1, { axis: 'z', layer: 'steel', seg: 32 });
      for (const sz of [-1, 1]) {
        a.cyl(0, 0, sz * 0.58, 0.07, 0.06, { axis: 'z', layer: 'steel' });
        for (let k = 0; k < 6; k++) {
          const t = (k / 6) * Math.PI * 2;
          a.cyl(Math.cos(t) * 0.11, Math.sin(t) * 0.11, sz * 0.555, 0.012, 0.02, { axis: 'z', layer: 'dark', seg: 6 });
        }
        a.box(0.11, 0, sz * 0.555, 0.04, 0.012, 0.02, { layer: 'dark' });
      }
    }, g);
    return g;
  };
  const r1 = rollPivot(0.99), r2 = rollPivot(1.33);
  // the melt from the die into the nip
  const melt = eq.part((a) => a.box(0.2, 1.16, 0, 0.5, 0.02, 0.46, { layer: 'product' }), eq.group, { edges: false });
  eq.live = { r1, r2, melt };
  eq.light(0.45, 1.62, -0.6);
  eq.anchor.set(0.45, 2.2, 0);
  eq.update = (st, dt) => {
    const run = st.flow > 0;
    melt.visible = run;
    if (run) { r1.rotation.z -= dt * 1.4; r2.rotation.z += dt * 1.4; }
  };
}

// CCB-1000 steel-frame cooling belt with air-cooled tunnel.
export function coolingBelt(eq) {
  const s = eq.def.side;
  const L = 8.0, topY = 1.0, W = 1.0;
  const fans = [];
  eq.body((a) => {
    for (const sz of [-1, 1]) {
      a.blk(L / 2, 0.76, sz * 0.62, L, 0.2, 0.06, { layer: 'body' });
      a.blk(L / 2, 0.96, sz * 0.62, L, 0.03, 0.12, { layer: 'body' });
      a.blk(L / 2, 0.3, sz * 0.6, L - 0.3, 0.07, 0.07, { layer: 'body' });
    }
    const legsX = [0.35, 1.95, 3.55, 5.15, 6.75, 7.75];
    legsX.forEach((x, i) => {
      for (const sz of [-1, 1]) {
        a.blk(x, 0, sz * 0.6, 0.08, 0.76, 0.08, { layer: 'body' });
        a.blk(x, 0, sz * 0.6, 0.18, 0.012, 0.18, { layer: 'dark' });
      }
      a.blk(x, 0.3, 0, 0.06, 0.06, 1.2, { layer: 'body' });
      if (i < legsX.length - 1 && i % 2 === 0) for (const sz of [-1, 1]) a.bar([x, 0.36, sz * 0.6], [legsX[i + 1], 0.74, sz * 0.6], 0.04, { layer: 'body' });
    });
    // pulleys, bearing units, take-up
    for (const x of [0.15, L - 0.15]) {
      a.cyl(x, topY - 0.16, 0, 0.16, W + 0.06, { axis: 'z', layer: 'steel' });
      for (const sz of [-1, 1]) a.box(x, topY - 0.16, sz * 0.68, 0.22, 0.16, 0.06, { layer: 'dark' });
    }
    for (const sz of [-1, 1]) a.rod([-0.05, topY - 0.16, sz * 0.7], [0.4, topY - 0.16, sz * 0.7], 0.03, { layer: 'steel' });
    // belt: top run, return run
    a.box(L / 2, topY - 0.006, 0, L - 0.3, 0.012, W, { layer: 'rubber' });
    a.box(L / 2, topY - 0.32, 0, L - 0.3, 0.01, W, { layer: 'rubber' });
    for (let x = 1.2; x < L - 0.6; x += 1.6) a.cyl(x, topY - 0.3, 0, 0.05, W + 0.04, { axis: 'z', layer: 'steel', seg: 12 });
    // under-belt cooling water trays with spray headers
    a.blk(L / 2, topY - 0.14, 0, L - 1.0, 0.1, W - 0.02, { layer: 'steel' });
    for (const sz of [-0.3, 0.3]) a.pipe([[0.6, topY - 0.2, sz], [L - 0.6, topY - 0.2, sz]], 0.02, { layer: 'steel' });
    a.pipe([[0.6, topY - 0.2, -0.3], [0.6, topY - 0.2, -0.78 * s], [0.6, 0.05, -0.78 * s]], 0.03, { layer: 'steel', bend: 0.1 });
    a.pipe([[L - 0.6, topY - 0.2, 0.3], [L - 0.6, topY - 0.2, -0.78 * s], [L - 0.6, 0.05, -0.78 * s]], 0.03, { layer: 'steel', bend: 0.1 });
    // air-cooled tunnel hoods, two fans each
    for (const [h0, h1] of [[0.9, 3.0], [3.15, 5.25], [5.4, 7.5]]) {
      const hx = (h0 + h1) / 2, hl = h1 - h0;
      a.blk(hx, topY + 0.43, 0, hl, 0.03, 1.34, { layer: 'steel' });
      for (const sz of [-1, 1]) {
        a.blk(hx, topY + 0.02, sz * 0.66, hl, 0.42, 0.025, { layer: 'steel' });
        a.blk(hx, topY + 0.12, sz * 0.69, hl * 0.9, 0.02, 0.04, { layer: 'steel' });
        a.blk(hx - hl / 2 + 0.2, topY + 0.25, sz * 0.69, 0.1, 0.03, 0.05, { layer: 'dark' });
        a.blk(hx + hl / 2 - 0.2, topY + 0.25, sz * 0.69, 0.1, 0.03, 0.05, { layer: 'dark' });
      }
      for (const fx of [h0 + hl * 0.27, h0 + hl * 0.73]) {
        a.lathe(fx, topY + 0.46, 0, [[0.3, 0], [0.3, 0.03], [0.27, 0.05], [0.27, 0.2], [0.29, 0.22]], { layer: 'steel', seg: 28 });
        a.ring(fx, topY + 0.67, 0, 0.27, 0.008, { axis: 'y', layer: 'dark', ts: 28 });
        a.ring(fx, topY + 0.67, 0, 0.16, 0.008, { axis: 'y', layer: 'dark', ts: 24 });
        a.rod([fx - 0.27, topY + 0.67, 0], [fx + 0.27, topY + 0.67, 0], 0.012, { layer: 'dark' });
        a.rod([fx, topY + 0.67, -0.27], [fx, topY + 0.67, 0.27], 0.012, { layer: 'dark' });
        a.cyl(fx, topY + 0.6, 0, 0.08, 0.12, { layer: 'dark', seg: 16 });
        fans.push(fx);
      }
    }
    // drive at the head end
    a.at(L - 0.15, topY - 0.16, 0.8 * s, s > 0 ? -Math.PI / 2 : Math.PI / 2, () => gearbox(a, 0.34, 0.38, 0.32));
    a.at(L - 0.5, topY - 0.16, 0.85 * s, Math.PI, () => motor(a, 0.55, 0.14, { fins: 12 }));
    // local panel and pull-wire emergency stop
    a.blk(4.0, 0, 0.95 * s, 0.08, 1.0, 0.08, { layer: 'dark' });
    a.blk(4.0, 1.0, 0.95 * s, 0.4, 0.5, 0.2, { layer: 'body' });
    for (let k = 0; k < 3; k++) a.cyl(3.88 + k * 0.12, 1.3, 0.95 * s - 0.11 * s, 0.025, 0.03, { axis: 'z', layer: k === 2 ? 'rubber' : 'steel', seg: 12 });
    a.rod([0.3, 1.18, 0.74 * s], [L - 0.3, 1.18, 0.74 * s], 0.008, { layer: 'dark', edges: false });
    for (const x of [0.3, L - 0.3]) a.blk(x, 0.96, 0.74 * s, 0.1, 0.24, 0.08, { layer: 'dark' });
  });
  // live: fan blades and the product sheet / flakes moving on the belt
  const blades = fans.map((fx) => {
    const g = new THREE.Group();
    g.position.set(fx, topY + 0.56, 0);
    eq.group.add(g);
    eq.part((a) => {
      for (let k = 0; k < 5; k++) a.box(0, 0, 0, 0.5, 0.008, 0.09, { ry: (k / 5) * Math.PI * 2, rx: 0.32, layer: 'dark' });
    }, g, { edges: false });
    return g;
  });
  const sheet = eq.part((a) => a.box(1.6, topY + 0.006, 0, 3.0, 0.006, 0.8, { layer: 'product' }), eq.group, { edges: false });
  const flakeGeo = GEO.box(0.16, 0.008, 0.12);
  const flakes = new THREE.InstancedMesh(flakeGeo, eq.mats.get('product'), 64);
  flakes.castShadow = false;
  eq.group.add(flakes);
  const seeds = Array.from({ length: 64 }, (_, i) => [(i * 0.618) % 1, ((i * 0.37) % 1) - 0.5, (i * 1.7) % (Math.PI * 2)]);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), sc = new THREE.Vector3();
  let phase = 0;
  eq.anchor.set(L / 2, 2.2, 0);
  eq.light(4.0, 1.5, 0.95 * s);
  eq.update = (st, dt) => {
    const run = st.flow > 0;
    for (const b of blades) b.rotation.y += dt * (run ? 18 : 0.3);
    sheet.visible = run;
    if (run) phase = (phase + dt * 0.06) % 1;
    for (let i = 0; i < 64; i++) {
      const u = (seeds[i][0] + phase) % 1;
      const x = 3.1 + u * (L - 3.4);
      p.set(x, topY + 0.008, seeds[i][1] * 0.82);
      q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, seeds[i][2]);
      sc.setScalar(run || st.belt > 0 ? 1 : 0.0001);
      flakes.setMatrixAt(i, m4.compose(p, q, sc));
    }
    flakes.instanceMatrix.needsUpdate = true;
  };
}

// Flake breaker (kibbler), inclined screw and chip bin feeding the mill.
export function crusher(eq) {
  const s = eq.def.side;
  eq.body((a) => {
    legs4(a, 0.55, 0, 0.7, 0.8, 0, 0.45, 0.08, { brace: false });
    a.blk(0.55, 0.45, 0, 0.82, 0.6, 0.92, { layer: 'steel' });
    a.lathe(0.55, 1.05, 0, [[0.38, 0], [0.38, 0.03], [0.5, 0.22]], { layer: 'steel', seg: 4, ry: Math.PI / 4 });
    for (const sz of [-1, 1]) a.cyl(0.55, 0.78, sz * 0.5, 0.1, 0.1, { axis: 'z', layer: 'dark' });
    // V-belt guard and motor
    a.rblk(0.75, 0.45, 0.6 * s, 0.75, 0.55, 0.12, 0.12, { layer: 'body' });
    a.at(0.95, 0.42, 0.95 * s, s > 0 ? -Math.PI / 2 : Math.PI / 2, () => motor(a, 0.55, 0.15, { feet: true, feetH: 0.12 }));
    a.blk(0.95, 0, 0.95 * s, 0.5, 0.2, 0.4, { layer: 'dark' });
    // discharge boot and inclined screw to the chip bin
    a.blk(0.55, 0.15, 0, 0.36, 0.3, 0.36, { layer: 'steel' });
    a.rod([0.75, 0.3, 0], [1.75, 1.95, 0], 0.18, { layer: 'steel', seg: 18 });
    a.at(1.8, 2.0, 0, 0, () => motor(a, 0.4, 0.1, { fins: 10 }), 0, 1.03);
    a.cyl(1.8, 1.92, 0, 0.08, 0.16, { layer: 'steel', seg: 14 });
    a.rod([1.1, 0, 0], [1.1, 0.85, 0], 0.06, { layer: 'dark' });
    // chip bin on legs with level probes
    legs4(a, 1.8, 0, 0.7, 0.7, 0, 1.0, 0.07);
    const top = hopper(a, 1.8, 0.82, 0, 0.42, 0.55, 0.42, 0.09, { layer: 'steel' });
    for (const y of [1.3, 1.7]) a.cyl(1.8 - 0.47, y, 0, 0.025, 0.12, { axis: 'x', layer: 'dark', seg: 8 });
    a.cyl(1.95, top + 0.08, 0.15, 0.06, 0.16, { layer: 'dark', seg: 12 });
    // dosing screw to the mill inlet
    a.rod([1.8, 0.82, 0], [2.95, 1.12, 0], 0.13, { layer: 'steel', seg: 16 });
    a.at(1.45, 0.73, 0, 0, () => motor(a, 0.38, 0.09, { fins: 10 }), 0, 0.26);
  });
  eq.light(0.55, 1.35, 0.6 * s);
  eq.anchor.set(1.3, 2.6, 0);
}

// ACM-50 air classifying mill: rotor housing, classifier and drives.
export function acm(eq) {
  const s = eq.def.side;
  eq.body((a) => {
    // skid with anti-vibration mounts
    a.blk(0, 0, -0.35 * s, 1.8, 0.2, 2.1, { layer: 'dark' });
    for (const sx of [-0.75, 0.75]) for (const sz of [-1.25, 0.55]) a.cyl(sx, 0.24, sz * s, 0.08, 0.08, { layer: 'rubber', seg: 12 });
    // bearing housing and grinding chamber
    a.blk(0, 0.28, 0, 1.0, 0.42, 1.0, { layer: 'body' });
    a.lathe(0, 0.7, 0, [[0.56, 0], [0.56, 0.04], [0.5, 0.04], [0.5, 0.72], [0.56, 0.72], [0.56, 0.76]], { layer: 'body', seg: 36 });
    bolts(a, 0, 0.745, 0, 0.53, 16, 'y', 0.01);
    // hinged inspection door with handwheel
    a.cyl(0.52, 1.06, 0, 0.3, 0.05, { axis: 'x', layer: 'body' });
    bolts(a, 0.555, 1.06, 0, 0.26, 10, 'x', 0.012);
    a.ring(0.6, 1.06, 0, 0.12, 0.012, { axis: 'x', layer: 'dark', ts: 20 });
    a.rod([0.56, 1.06, 0], [0.6, 1.06, 0], 0.025, { layer: 'dark' });
    for (const y of [0.88, 1.24]) a.box(0.5, y, -0.31, 0.08, 0.08, 0.06, { layer: 'dark' });
    // explosion relief vent
    a.box(0, 1.08, -0.52 * s, 0.32, 0.36, 0.04, { layer: 'dark' });
    a.box(0, 1.08, -0.545 * s, 0.26, 0.3, 0.01, { layer: 'steel' });
    // feed inlet from the dosing screw
    a.cyl(-0.58, 1.12, 0, 0.09, 0.2, { axis: 'x', layer: 'steel', seg: 16 });
    // transition and classifier housing
    a.lathe(0, 1.46, 0, [[0.5, 0], [0.38, 0.16], [0.38, 0.6], [0.42, 0.6], [0.42, 0.63]], { layer: 'body', seg: 36 });
    a.cyl(0, 2.105, 0, 0.42, 0.03, { layer: 'body', seg: 36 });
    bolts(a, 0, 2.125, 0, 0.39, 12, 'y', 0.01);
    // classifier drive on top, shaft down
    a.at(0, 2.5, 0, 0, () => motor(a, 0.72, 0.2, { fins: 14 }), 0, -Math.PI / 2);
    a.cyl(0, 2.16, 0, 0.13, 0.08, { layer: 'dark' });
    // main motor, vertical, belt-coupled under a guard
    a.at(0, 1.08, -1.05 * s, 0, () => motor(a, 0.95, 0.3, { fins: 18 }), 0, -Math.PI / 2);
    a.blk(0, 0.2, -1.05 * s, 0.75, 0.12, 0.75, { layer: 'dark' });
    a.blk(0, 0.58, -1.05 * s, 0.72, 0.04, 0.72, { layer: 'dark' });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) a.blk(sx * 0.32, 0.32, -1.05 * s + sz * 0.32, 0.06, 0.26, 0.06, { layer: 'dark' });
    a.rblk(0, 0.32, -0.55 * s, 0.6, 0.24, 1.35, 0.2, { layer: 'body' });
    // outlet duct to the APW separator
    a.pipe([[0.36, 1.9, 0], [1.2, 1.9, 0], [1.2, 3.0, 0], [1.2, 3.0, 0.26], [1.92, 3.0, 0.26]], 0.1, { layer: 'steel', bend: 0.18, flanges: true });
    // gauges
    a.cyl(-0.3, 1.9, 0.32, 0.05, 0.03, { axis: 'z', layer: 'dark', seg: 14 });
    a.rod([-0.3, 1.74, 0.36], [-0.3, 1.86, 0.32], 0.015, { layer: 'steel' });
    // local control station
    a.blk(0.95, 0, 0.95 * s, 0.08, 1.05, 0.08, { layer: 'dark' });
    a.blk(0.95, 1.05, 0.95 * s, 0.55, 0.7, 0.25, { layer: 'body' });
    a.box(0.95, 1.5, 0.95 * s + 0.13 * s, 0.32, 0.2, 0.01, { layer: 'rubber' });
  });
  eq.light(1.15, 1.75, 0.95 * s);
  eq.anchor.set(0, 3.2, 0);
}

// APW-30A separator: cyclone body, tangential inlet, airlock below.
export function apw(eq) {
  const s = eq.def.side;
  eq.body((a) => {
    legs4(a, 0, 0, 0.96, 0.96, 0, 2.15, 0.09);
    a.blk(0, 2.1, 0, 1.08, 0.1, 1.08, { layer: 'body' });
    a.lathe(0, 1.15, 0, [[0.1, 0], [0.1, 0.05], [0.42, 1.05], [0.42, 2.15], [0.46, 2.15], [0.46, 2.19]], { layer: 'steel', seg: 36 });
    a.cyl(0, 3.355, 0, 0.46, 0.03, { layer: 'steel', seg: 36 });
    bolts(a, 0, 3.375, 0, 0.43, 14, 'y', 0.01);
    // tangential inlet
    a.blk(-0.4, 2.86, 0.26, 0.36, 0.3, 0.2, { layer: 'steel' });
    // vortex finder outlet to the dust main
    a.cyl(0, 3.6, 0, 0.13, 0.5, { layer: 'steel', seg: 20 });
    flangeY(a, 0, 3.86, 0, 0.13);
    // access hatch and level probe
    a.box(0.43, 2.8, 0, 0.04, 0.3, 0.26, { layer: 'dark' });
    a.cyl(0.3, 1.6, 0, 0.022, 0.14, { axis: 'x', layer: 'dark', seg: 8 });
    // airlock and pick-up shoe
    a.at(0, 0.98, 0, 0, () => rotaryValve(a, 0.26));
    a.blk(0, 0.62, 0, 0.3, 0.18, 0.3, { layer: 'steel' });
    a.pipe([[0, 0.71, 0.15], [0, 0.71, 0.6 * s], [0, 4.4, 0.6 * s]], 0.05, { layer: 'steel', bend: 0.15 });
    a.blk(0.5, 1.2, 0.5 * s, 0.32, 0.4, 0.16, { layer: 'body' });
  });
  eq.light(0.5, 1.6, 0.5 * s);
  eq.anchor.set(0, 4.1, 0);
}
