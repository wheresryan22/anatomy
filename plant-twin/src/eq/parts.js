// Standard industrial components shared by the machine builders.
// Every function draws into an Assembly `a` in the current local frame.

import * as THREE from 'three';

const TAU = Math.PI * 2;

// IEC foot-mounted motor, axis along local X, centred; shaft toward +X.
export function motor(a, len, r, o = {}) {
  const L = o.layer || 'dark';
  const x0 = -len / 2;
  const cowl = len * 0.26;
  const body0 = x0 + cowl - 0.01;
  const body1 = len / 2 - len * 0.08;
  // fan cowl and grille
  a.cyl(x0 + cowl / 2, 0, 0, r * 1.03, cowl, { axis: 'x', layer: L });
  a.ring(x0 - 0.003, 0, 0, r * 0.72, r * 0.035, { axis: 'x', layer: L, ts: 24 });
  a.ring(x0 - 0.003, 0, 0, r * 0.42, r * 0.035, { axis: 'x', layer: L, ts: 20 });
  a.cyl(x0, 0, 0, r * 0.14, 0.012, { axis: 'x', layer: L });
  // frame with cooling fins
  a.cyl((body0 + body1) / 2, 0, 0, r, body1 - body0, { axis: 'x', layer: L });
  const finH = r * 0.17;
  const nf = o.fins ?? 14;
  for (let i = 0; i < nf; i++) {
    const t = (i / nf) * TAU + Math.PI / nf;
    if (o.feet && Math.sin(t) < -0.75) continue;
    a.box((body0 + body1) / 2 + 0.01, Math.cos(t) * (r + finH / 2), Math.sin(t) * (r + finH / 2), (body1 - body0) * 0.9, finH, 0.012, { rx: t, layer: L });
  }
  // drive-end shield and shaft
  a.cyl(body1 + len * 0.04, 0, 0, r * 0.93, len * 0.08, { axis: 'x', layer: L });
  a.cyl(len / 2 + len * 0.06, 0, 0, r * 0.15, len * 0.12, { axis: 'x', layer: 'steel', seg: 16 });
  // terminal box and lifting eye
  const tb = Math.min(0.34 * r * 2, 0.36);
  a.blk(len * 0.04, r * 0.92, 0, tb, tb * 0.6, tb * 0.9, { layer: L });
  a.blk(len * 0.04, r * 0.92 + tb * 0.6, 0, tb * 1.06, 0.015, tb * 0.96, { layer: L });
  a.cyl(len * 0.04 - tb * 0.62, r * 0.92 + tb * 0.3, tb * 0.2, 0.025, 0.06, { axis: 'x', layer: 'rubber', seg: 10 });
  a.ring(-len * 0.12, r + 0.035, 0, 0.03, 0.009, { layer: 'steel', ts: 12 });
  if (o.feet) {
    const fh = o.feetH ?? r * 0.45;
    for (const fx of [-len * 0.18, len * 0.22]) {
      a.blk(fx, -r - fh + r * 0.15, 0, len * 0.12, fh, r * 1.7, { layer: L });
      a.blk(fx, -r - fh + r * 0.15, 0, len * 0.18, 0.025, r * 2.0, { layer: L });
    }
  }
}

// Helical gear unit, centred; input on -X, output on +X.
export function gearbox(a, w, h, d, o = {}) {
  const L = o.layer || 'dark';
  a.box(0, 0, 0, w, h, d, { layer: L });
  a.box(0, h / 2 + 0.012, 0, w * 0.7, 0.024, d * 0.6, { layer: L });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) a.cyl(sx * w * 0.3, h / 2 + 0.03, sz * d * 0.26, 0.012, 0.02, { layer: 'steel', seg: 8 });
  for (const sz of [-1, 1]) {
    for (let i = 0; i < 3; i++) a.box(-w * 0.3 + i * w * 0.3, -h * 0.05, sz * (d / 2 + 0.015), 0.018, h * 0.8, 0.03, { layer: L });
    a.box(0, -h / 2 + 0.04, sz * (d / 2 + 0.03), w * 1.06, 0.06, 0.06, { layer: L });
  }
  a.cyl(-w / 2 - 0.04, h * 0.12, 0, h * 0.18, 0.08, { axis: 'x', layer: L });
  a.cyl(w / 2 + 0.05, -h * 0.05, 0, h * 0.26, 0.1, { axis: 'x', layer: L });
  a.cyl(w * 0.2, h / 2 + 0.07, -d * 0.3, 0.02, 0.08, { layer: 'steel', seg: 8 });
  a.sph(w * 0.2, h / 2 + 0.11, -d * 0.3, 0.025, { layer: 'steel', seg: 10, hs: 6 });
  if (o.cooler) {
    a.blk(-w * 0.1, h / 2 + 0.024, d * 0.18, w * 0.36, 0.12, d * 0.22, { layer: L });
    a.rod([-w * 0.28, h / 2 + 0.1, d * 0.18], [-w * 0.28, h / 2 + 0.3, d * 0.42], 0.025, { layer: 'steel' });
  }
}

// Electrical enclosure standing on the floor, door facing +Z.
export function cabinet(a, w, h, d, o = {}) {
  a.blk(0, 0, 0, w, 0.1, d * 0.92, { layer: 'dark' });
  a.blk(0, 0.1, 0, w, h - 0.1, d, { layer: o.layer || 'body' });
  a.blk(0, h, 0, w + 0.04, 0.03, d + 0.04, { layer: o.layer || 'body' });
  const doors = Math.max(1, Math.round(w / 0.8));
  const dw = w / doors;
  for (let i = 0; i < doors; i++) {
    const cx = -w / 2 + dw * (i + 0.5);
    a.box(cx, 0.1 + (h - 0.1) / 2, d / 2 + 0.006, dw - 0.03, h - 0.2, 0.012, { layer: o.layer || 'body' });
    a.box(cx + dw / 2 - 0.08, 0.1 + (h - 0.1) * 0.52, d / 2 + 0.03, 0.025, 0.16, 0.03, { layer: 'dark' });
    for (let k = 0; k < 4; k++) a.box(cx, 0.32 + k * 0.035, d / 2 + 0.014, dw * 0.5, 0.012, 0.01, { layer: 'dark' });
  }
  if (o.hmi) {
    const hx = -w / 2 + dw * 0.5;
    a.box(hx, 1.45, d / 2 + 0.02, Math.min(0.42, dw * 0.6), 0.3, 0.03, { layer: 'dark' });
    a.box(hx, 1.45, d / 2 + 0.037, Math.min(0.36, dw * 0.52), 0.24, 0.006, { layer: 'rubber' });
    for (let k = 0; k < 3; k++) a.cyl(hx - 0.1 + k * 0.1, 1.2, d / 2 + 0.03, 0.022, 0.03, { axis: 'z', layer: k === 2 ? 'rubber' : 'steel', seg: 12 });
  }
  if (o.vents) for (const sx of [-1, 1]) for (let k = 0; k < 5; k++) a.box(sx * (w / 2 + 0.006), h * 0.25 + k * 0.03, 0, 0.012, 0.012, d * 0.5, { layer: 'dark' });
}

// Industrial PC / HMI on a swivel arm, centred on the pole base.
export function hmiPedestal(a, h = 1.35) {
  a.blk(0, 0, 0, 0.36, 0.02, 0.36, { layer: 'dark' });
  a.cyl(0, h / 2, 0, 0.04, h, { layer: 'dark', seg: 12 });
  a.box(0, h + 0.18, 0.03, 0.46, 0.34, 0.07, { layer: 'dark', rx: -0.2 });
  a.box(0, h + 0.18, 0.068, 0.4, 0.27, 0.006, { layer: 'rubber', rx: -0.2 });
  a.box(0, h - 0.05, 0.14, 0.42, 0.03, 0.2, { layer: 'dark', rx: -0.35 });
}

// Pole of a stack light; the lamps are added separately as live meshes.
export function stackPole(a, x, y, z, h = 0.3) {
  a.cyl(x, y + 0.01, z, 0.04, 0.02, { layer: 'dark', seg: 12 });
  a.cyl(x, y + h / 2, z, 0.016, h, { layer: 'dark', seg: 10 });
  return [x, y + h, z];
}

// Ladder rising along +Y on a face; rungs span local X.
export function ladder(a, x, y0, z, h, w = 0.45, o = {}) {
  for (const s of [-1, 1]) a.rod([x + (s * w) / 2, y0, z], [x + (s * w) / 2, y0 + h + 1.0, z], 0.04, { layer: o.layer || 'body' });
  for (let y = y0 + 0.3; y < y0 + h; y += 0.3) a.rod([x - w / 2, y, z], [x + w / 2, y, z], 0.024, { layer: o.layer || 'body' });
  if (o.cage && h > 2.6) {
    const n = o.cageDir || 1;
    for (let y = y0 + 2.3; y <= y0 + h + 1.0; y += 0.9) {
      a.ring(x, y, z + n * 0.36, 0.36, 0.012, { axis: 'y', arc: Math.PI, ry: n > 0 ? 0 : Math.PI, layer: o.layer || 'body', ts: 16 });
    }
    for (const t of [0.25, 0.5, 0.75]) {
      const ang = t * Math.PI;
      const px = x + Math.cos(ang) * 0.36;
      const pz = z + n * 0.36 + n * Math.sin(ang) * 0.36;
      a.rod([px, y0 + 2.3, pz], [px, y0 + h + 1.0, pz], 0.02, { layer: o.layer || 'body' });
    }
  }
}

// Guard rail along a straight run on a deck at height y.
export function handrail(a, p0, p1, y, o = {}) {
  const [x0, z0] = p0, [x1, z1] = p1;
  const len = Math.hypot(x1 - x0, z1 - z0);
  const n = Math.max(1, Math.ceil(len / (o.pitch ?? 1.4)));
  const L = o.layer || 'body';
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const px = x0 + (x1 - x0) * t, pz = z0 + (z1 - z0) * t;
    a.rod([px, y, pz], [px, y + 1.1, pz], 0.042, { layer: L, seg: 10 });
  }
  a.rod([x0, y + 1.1, z0], [x1, y + 1.1, z1], 0.042, { layer: L, seg: 10 });
  a.rod([x0, y + 0.55, z0], [x1, y + 0.55, z1], 0.034, { layer: L, seg: 10 });
  if (o.toe !== false) {
    const ang = Math.atan2(z1 - z0, x1 - x0);
    a.box((x0 + x1) / 2, y + 0.05, (z0 + z1) / 2, len, 0.1, 0.008, { ry: -ang, layer: L });
  }
}

// Straight steel stair: bottom at (x, y0, z), climbing along heading `ry`
// (0 = toward +X) to height y0 + rise. Width across.
export function stair(a, x, y0, z, rise, ry = 0, width = 0.8, o = {}) {
  const run = rise * (o.slope ?? 0.9);
  const L = o.layer || 'body';
  a.at(x, y0, z, ry, () => {
    for (const s of [-1, 1]) {
      a.bar([0, 0, (s * width) / 2], [run, rise, (s * width) / 2], 0.012, { d: 0.2, layer: L });
      a.rod([0, 0.95, (s * (width + 0.06)) / 2], [run, rise + 0.95, (s * (width + 0.06)) / 2], 0.04, { layer: L, seg: 10 });
      a.rod([0, 0.5, (s * (width + 0.06)) / 2], [run, rise + 0.5, (s * (width + 0.06)) / 2], 0.03, { layer: L, seg: 10 });
      for (const t of [0, 0.5, 1]) a.rod([run * t, rise * t, (s * (width + 0.06)) / 2], [run * t, rise * t + 0.95, (s * (width + 0.06)) / 2], 0.04, { layer: L, seg: 10 });
    }
    const steps = Math.round(rise / 0.2);
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      a.box(run * t + 0.02, rise * t - 0.02, 0, 0.26, 0.035, width - 0.03, { layer: 'dark' });
    }
  });
}

// Steel platform with columns, beams, grating deck and rails.
// rails: list of [[x0,z0],[x1,z1]] runs in deck coordinates.
export function platform(a, x0, x1, z0, z1, h, o = {}) {
  const L = o.layer || 'body';
  const xs = spread(x0, x1, o.maxSpan ?? 3.2);
  const zs = spread(z0, z1, o.maxSpan ?? 3.2);
  const cols = [];
  for (const x of xs) for (const z of zs) {
    const edge = x === xs[0] || x === xs[xs.length - 1] || z === zs[0] || z === zs[zs.length - 1];
    if (edge || o.innerCols) cols.push([x, z]);
  }
  for (const [x, z] of cols) {
    a.blk(x, 0, z, 0.28, 0.02, 0.28, { layer: 'dark' });
    a.blk(x, 0.02, z, 0.12, h - 0.24, 0.12, { layer: L });
  }
  const bh = 0.2;
  for (const z of [z0, z1]) a.blk((x0 + x1) / 2, h - bh - 0.04, z, x1 - x0, bh, 0.1, { layer: L });
  for (const x of [x0, x1]) a.blk(x, h - bh - 0.04, (z0 + z1) / 2, 0.1, bh, z1 - z0, { layer: L });
  for (let x = x0 + 0.6; x < x1 - 0.3; x += 0.6) a.blk(x, h - 0.16, (z0 + z1) / 2, 0.05, 0.12, z1 - z0 - 0.1, { layer: L, edges: false });
  a.blk((x0 + x1) / 2, h - 0.04, (z0 + z1) / 2, x1 - x0, 0.04, z1 - z0, { layer: 'dark' });
  // knee braces on the outer columns
  for (const [x, z] of cols) {
    const dx = x === x0 ? 1 : x === x1 ? -1 : 0;
    if (dx) a.bar([x, h - 0.9, z], [x + dx * 0.6, h - 0.25, z], 0.06, { layer: L });
  }
  for (const r of o.rails || []) handrail(a, r[0], r[1], h, { layer: L });
}

export function spread(a, b, max) {
  const n = Math.max(1, Math.ceil((b - a) / max));
  return Array.from({ length: n + 1 }, (_, i) => a + ((b - a) * i) / n);
}

// Circle of bolt heads on a face normal to `axis`.
export function bolts(a, x, y, z, R, n, axis = 'y', r = 0.012, o = {}) {
  for (let i = 0; i < n; i++) {
    const t = (i / n) * TAU;
    const c = Math.cos(t) * R, s = Math.sin(t) * R;
    const p = axis === 'y' ? [x + c, y, z + s] : axis === 'x' ? [x, y + c, z + s] : [x + c, y + s, z];
    a.cyl(p[0], p[1], p[2], r, 0.02, { axis, layer: o.layer || 'steel', seg: 6, edges: false });
  }
}

// Flange pair on a vertical pipe at height y.
export function flangeY(a, x, y, z, r, o = {}) {
  a.cyl(x, y, z, r * 1.55, 0.035, { layer: o.layer || 'steel' });
  bolts(a, x, y + 0.02, z, r * 1.3, 8, 'y', 0.01);
}

// Rotary airlock valve with geared motor, centred, ports up and down.
export function rotaryValve(a, s = 0.3, o = {}) {
  a.box(0, 0, 0, s, s * 0.9, s, { layer: o.layer || 'steel' });
  a.cyl(0, 0, 0, s * 0.52, s * 1.08, { axis: 'z', layer: o.layer || 'steel' });
  for (const sy of [-1, 1]) {
    a.blk(0, sy > 0 ? s * 0.45 : -s * 0.45 - 0.04, 0, s * 0.9, 0.04, s * 0.9, { layer: 'steel' });
  }
  a.at(0, 0, s * 0.54 + 0.1, Math.PI / 2, () => gearbox(a, 0.16, 0.18, 0.16));
  a.at(0, 0, s * 0.54 + 0.32, -Math.PI / 2, () => motor(a, 0.28, 0.075, { fins: 10 }));
}

// Silo / hopper made from a lathe profile. Base at y, outlet radius rOut.
export function hopper(a, x, y, z, R, hCyl, hCone, rOut, o = {}) {
  const L = o.layer || 'steel';
  const pts = [
    [rOut, 0], [rOut, 0.06], [rOut * 1.5, 0.06], [rOut * 1.5, 0.09], [rOut, 0.09],
    [R, 0.09 + hCone], [R, 0.09 + hCone + hCyl], [R + 0.03, 0.09 + hCone + hCyl], [R + 0.03, 0.12 + hCone + hCyl],
  ];
  a.lathe(x, y, z, pts, { layer: L, seg: o.seg ?? 32 });
  const top = y + 0.12 + hCone + hCyl;
  if (o.cone) a.lathe(x, top, z, [[R + 0.03, 0], [R * 0.25, o.cone], [0.0001, o.cone]], { layer: L, seg: o.seg ?? 32 });
  else a.cyl(x, top + 0.012, z, R + 0.03, 0.024, { layer: L, seg: o.seg ?? 32 });
  return top + (o.cone || 0.024);
}

// Four legs with cross bracing under a square footprint.
export function legs4(a, x, z, w, d, y0, y1, s = 0.1, o = {}) {
  const L = o.layer || 'body';
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    a.blk(x + (sx * w) / 2, y0, z + (sz * d) / 2, s * 2.2, 0.02, s * 2.2, { layer: 'dark' });
    a.blk(x + (sx * w) / 2, y0, z + (sz * d) / 2, s, y1 - y0, s, { layer: L });
  }
  if (o.brace !== false && y1 - y0 > 1.0) {
    const yb = y0 + (y1 - y0) * 0.3;
    for (const sz of [-1, 1]) a.bar([x - w / 2, yb, z + (sz * d) / 2], [x + w / 2, yb, z + (sz * d) / 2], s * 0.7, { layer: L });
    for (const sx of [-1, 1]) a.bar([x + (sx * w) / 2, yb, z - d / 2], [x + (sx * w) / 2, yb, z + d / 2], s * 0.7, { layer: L });
    for (const sz of [-1, 1]) a.bar([x - w / 2, yb, z + (sz * d) / 2], [x + w / 2, y1 - 0.1, z + (sz * d) / 2], s * 0.5, { layer: L });
  }
}

// Load cell under a mounting foot.
export function loadCell(a, x, y, z) {
  a.blk(x, y, z, 0.16, 0.03, 0.12, { layer: 'dark' });
  a.blk(x, y + 0.03, z, 0.12, 0.05, 0.05, { layer: 'steel' });
  a.blk(x, y + 0.08, z, 0.16, 0.03, 0.12, { layer: 'dark' });
}

// Euro pallet 1.2 x 0.8 m with base at y.
export function pallet(a, x, y, z, ry = 0) {
  a.at(x, y, z, ry, () => {
    for (const sz of [-0.35, 0, 0.35]) a.blk(0, 0, sz, 1.2, 0.022, 0.1, { layer: 'dark' });
    for (const sx of [-0.55, 0, 0.55]) for (const sz of [-0.35, 0, 0.35]) a.blk(sx, 0.022, sz, 0.14, 0.078, 0.1, { layer: 'dark', edges: false });
    for (const sx of [-0.55, -0.28, 0, 0.28, 0.55]) a.blk(sx, 0.1, 0, 0.1, 0.022, 0.8, { layer: 'dark' });
  });
}

// Stack of 25 kg sacks on a pallet: n layers in a 5-sack pattern.
export function sackStack(a, x, y, z, layers = 6, ry = 0, o = {}) {
  pallet(a, x, y, z, ry);
  const L = o.layer || 'body';
  a.at(x, y + 0.122, z, ry, () => {
    for (let k = 0; k < layers; k++) {
      const yy = k * 0.14;
      const flip = k % 2 ? -1 : 1;
      a.rblk(-0.3 * flip, yy, -0.2, 0.58, 0.13, 0.38, 0.05, { layer: L });
      a.rblk(-0.3 * flip, yy, 0.2, 0.58, 0.13, 0.38, 0.05, { layer: L });
      a.rblk(0.3 * flip, yy, -0.27, 0.58, 0.13, 0.25, 0.05, { layer: L, ry: 0 });
      a.rblk(0.3 * flip, yy, 0.03, 0.58, 0.13, 0.33, 0.05, { layer: L });
      a.rblk(0.3 * flip, yy, 0.3, 0.58, 0.13, 0.2, 0.05, { layer: L });
    }
  });
}

// Bulk bag (FIBC) standing on a pallet, base at y.
export function bigBag(a, x, y, z, h = 1.05, o = {}) {
  pallet(a, x, y, z, 0);
  const L = o.layer || 'body';
  a.rblk(x, y + 0.122, z, 0.95, h, 0.95, 0.16, { layer: L });
  a.lathe(x, y + 0.122 + h, z, [[0.47, 0], [0.2, 0.14], [0.12, 0.22], [0.12, 0.3]], { layer: L, seg: 16 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) a.ring(x + sx * 0.4, y + 0.122 + h + 0.12, z + sz * 0.4, 0.09, 0.02, { layer: L, ry: Math.PI / 4 * sx * sz, ts: 12 });
}

// 200 l steel drum, base at y.
export function drum(a, x, y, z) {
  a.cyl(x, y + 0.44, z, 0.29, 0.88, { layer: 'steel', seg: 20 });
  for (const yy of [0.3, 0.6]) a.ring(x, y + yy, z, 0.293, 0.012, { axis: 'y', layer: 'steel', ts: 24 });
  a.cyl(x + 0.15, y + 0.89, z, 0.03, 0.02, { layer: 'dark', seg: 8 });
}

// Simple carton 0.4 x 0.3 x 0.32 (25 kg powder box).
export function carton(a, x, y, z, o = {}) {
  a.blk(x, y, z, 0.4, 0.32, 0.3, { layer: o.layer || 'body' });
  a.box(x, y + 0.321, z, 0.4, 0.002, 0.05, { layer: 'dark', edges: false });
}

export const deg = (d) => (d * Math.PI) / 180;
export { THREE };
