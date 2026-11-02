// Plant services drawn as one static layer: dust extraction main and branches,
// compressed air, chilled water, vacuum conveying to packing, transfer lines, cable trays.

import { Assembly } from '../core/kit.js';
import { LINE_Z, PACK_C, SLOTS } from './layout.js';

export function buildServices(look) {
  const mats = look.createSet('eq');
  const a = new Assembly('steel');
  const HDR_Y = 8.6, HDR_Z = 1.2;
  const sides = [1, 1, -1, -1];

  // dust extraction main along the north wall, out to the central collector
  a.pipe([[8, HDR_Y, HDR_Z], [76, HDR_Y, HDR_Z]], 0.28, { seg: 24 });
  a.pipe([[58.4, HDR_Y, HDR_Z], [58.4, HDR_Y, -4.6], [58.4, 5.5, -4.6], [58.65, 5.5, -4.6]], 0.28, { bend: 0.6, seg: 24 });
  for (let x = 12; x < 76; x += 6) a.rod([x, HDR_Y + 0.28, HDR_Z], [x, 9.9, HDR_Z], 0.025, { layer: 'dark' });
  const drop = (pts, r = 0.14) => a.pipe(pts, r, { bend: 0.3, seg: 18 });
  for (const d of SLOTS.dose) drop([[d.x, 3.5, d.z], [d.x, 8.0, d.z], [d.x, 8.0, HDR_Z], [d.x, HDR_Y - 0.2, HDR_Z]]);
  for (const m of SLOTS.mixer) drop([[m.x, 4.6, m.z - 0.9], [m.x, 8.0, m.z - 0.9], [m.x, 8.0, HDR_Z], [m.x, HDR_Y - 0.2, HDR_Z]]);
  drop([[51, 3.9, LINE_Z[3]], [51, 7.4, LINE_Z[3]], [51, 7.4, HDR_Z], [51, HDR_Y - 0.2, HDR_Z]], 0.18);
  for (const z of LINE_Z.slice(0, 3)) a.pipe([[51, 3.9, z], [51, 7.4, z]], 0.14, { seg: 18 });
  drop([[PACK_C[0] + 0.45, 3.85, PACK_C[1]], [PACK_C[0] + 0.45, 8.0, PACK_C[1]], [PACK_C[0] + 0.45, 8.0, HDR_Z], [PACK_C[0] + 0.45, HDR_Y - 0.2, HDR_Z]]);

  // APW pick-up to the fine-mill feed bins (dense-phase transfer)
  LINE_Z.forEach((z, i) => {
    const zs = z + 0.6 * sides[i];
    a.pipe([[51, 4.4, zs], [51, 4.8, zs], [56.2, 4.8, zs], [56.2, 4.8, z], [56.2, 3.05, z]], 0.05, { bend: 0.2 });
  });

  // vacuum conveying from each check sieve to its product hopper
  const hop = [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz]) => [PACK_C[0] + sx * 1.4, PACK_C[1] + sz * 1.4]);
  LINE_Z.forEach((z, i) => {
    const zl = z - 1.5 * sides[i];
    const h = 6.2 + i * 0.3;
    const [xh, zh] = hop[i];
    const xr = xh + 0.75;
    a.pipe([[61.46, 0.38, z], [61.46, 0.38, zl], [61.46, h, zl], [xr, h, zl], [xr, h, zh], [xr, 5.62, zh], [xh + 0.42, 5.62, zh]], 0.045, { bend: 0.25 });
    for (let x = 64; x < xr - 1; x += 3) a.rod([x, h + 0.05, zl], [x, 9.8, zl], 0.016, { layer: 'dark' });
  });

  // compressed air: from the receiver along the north wall to the bag filters
  const AIR = 7.45;
  a.pipe([[5.3, 4.5, 5.0], [5.3, AIR, 5.0], [5.3, AIR, 0.6], [74, AIR, 0.6]], 0.05, { bend: 0.2 });
  a.pipe([[64.15, AIR, 0.6], [64.15, AIR, LINE_Z[3]]], 0.04);
  for (const z of LINE_Z) a.pipe([[64.15, AIR, z], [64.15, 5.58, z]], 0.025);
  a.pipe([[74, AIR, 0.6], [74, AIR, PACK_C[1] - 2.3], [74, 4.2, PACK_C[1] - 2.3]], 0.03, { bend: 0.15 });

  // chilled water mains from the outdoor chillers to the extrusion lines
  for (const [dx, r] of [[0, 0.08], [0.32, 0.08]]) {
    const x = 35.0 + dx;
    a.pipe([[38.95 + dx, 1.05, -4.5], [38.95 + dx, 4.6 + dx, -4.5], [38.95 + dx, 4.6 + dx, 0.5], [x, 4.6 + dx, 0.5], [x, 4.6 + dx, LINE_Z[3] + 1.2]], r, { bend: 0.35, layer: 'body' });
    LINE_Z.forEach((z) => a.pipe([[x, 4.6 + dx, z - 0.9], [x, 0.74, z - 0.9], [35.61, 0.74, z - 0.9]], 0.035, { bend: 0.12 }));
  }

  // cable ladder tray along the column line B
  for (const sz of [-0.3, 0.3]) a.box(33, 5.6, 17.2 + sz, 66, 0.1, 0.03, { layer: 'dark' });
  for (let x = 0.2; x < 66; x += 0.6) a.box(x, 5.56, 17.2, 0.04, 0.02, 0.6, { layer: 'dark', edges: false });
  for (let x = 3; x < 66; x += 6) for (const sz of [-0.3, 0.3]) a.rod([x, 5.6, 17.2 + sz], [x, 9.5, 17.2 + sz], 0.016, { layer: 'dark' });

  const g = a.build(mats);
  g.name = 'services';
  return { group: g, mats };
}
