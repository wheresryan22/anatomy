// Builds the whole plant from the register and keeps the 3D state in step with the model.

import * as THREE from 'three';
import { Equipment } from '../eq/equipment.js';
import * as process from '../eq/process.js';
import * as milling from '../eq/milling.js';
import * as prep from '../eq/prep.js';
import * as packing from '../eq/packing.js';
import * as lab from '../eq/lab.js';
import * as util from '../eq/utilities.js';
import * as actors from '../eq/actors.js';
import { EQUIPMENT, SLOTS, LINE_Z, AISLE_Z, ZONES } from './layout.js';
import { buildServices } from './services.js';
import { statusOf } from '../sim/telemetry.js';

const BUILDERS = {
  feedStation: process.feedStation, extruder: process.extruder, chillRoll: process.chillRoll, coolingBelt: process.coolingBelt,
  crusher: process.crusher, acm: process.acm, apw: process.apw,
  fineMill: milling.fineMill, cyclone: milling.cyclone, sieve: milling.sieve, bagFilter: milling.bagFilter, fan: milling.fan,
  container: prep.container, mixer: prep.mixer, dosingStation: prep.dosingStation, bigBag: prep.bigBagStation,
  additiveBooth: prep.additiveBooth, recipeTerminal: prep.recipeTerminal, receiving: prep.receiving, rawRacks: prep.rawRacks,
  surgeHopper: packing.surgeHopper, packer: packing.packer, packConveyor: packing.packConveyor, palletizer: packing.palletizer,
  wrapper: packing.wrapper, palletRacks: packing.palletRacks,
  labBlock: lab.labBlock, dsc: lab.dsc, sieveShaker: lab.sieveShaker, hotPlates: lab.hotPlates, adhesionTester: lab.adhesionTester,
  sprayBooth: lab.sprayBooth, curingOven: lab.curingOven, cathodicDisbondment: lab.cathodicDisbondment, blastCabinet: lab.blastCabinet,
  autoclave: lab.autoclave, impactTester: lab.impactTester, bendTester: lab.bendTester,
  compressor: util.compressor, dryer: util.dryer, receiver: util.receiver, mcc: util.mcc, chiller: util.chiller, dustCollector: util.dustCollector,
  forklift: actors.forklift,
};

// Loops for the cosmetic movers: [x, z] polylines walked back and forth.
const WALKS = [
  [[8, 15.0], [27, 15.0], [27, 20.6], [52, 20.6]],
  [[68.5, 14.0], [68.5, 34.0]],
  [[36, 8.6], [52, 8.6]],
  [[36, 27.6], [52, 27.6]],
  [[2.5, 16.6], [26, 16.6]],
];
const STANDING = [
  [8.6, 27.9, 0.6, 'work'], [13.6, 27.9, 0.4, 'work'], [16.6, 32.9, Math.PI / 2, 'work'], [12.0, 23.2, Math.PI / 2, 'stand'],
  [12.6, 9.0, Math.PI, 'stand'], [17.6, 9.4, Math.PI * 0.8, 'stand'],
  [33.9, 0, 0, 'cab', 0], [33.9, 0, 0, 'cab', 1], [33.9, 0, 0, 'cab', 2], [33.9, 0, 0, 'cab', 3],
  [74.3, 23.85, -Math.PI / 2, 'work'], [71.7, 24.5, 0.3, 'stand'],
  [71.2, 1.6, Math.PI, 'work'], [74.3, 7.2, 0, 'seated'], [77.4, 1.5, Math.PI, 'seated'], [82.2, 2.4, Math.PI, 'work'],
  [92.2, 2.0, Math.PI, 'work'], [85.6, 9.0, 0, 'seated'],
  [58.6, 2.6, 0.8, 'stand'], [2.2, 6.4, 1.2, 'stand'], [87.2, 31.5, -Math.PI / 2, 'stand'],
];

export class Plant {
  constructor(look) {
    this.look = look;
    this.root = new THREE.Group();
    this.root.name = 'plant';
    this.list = [];
    this.byTag = new Map();
    for (const def of EQUIPMENT) {
      const e = new Equipment(def, look);
      BUILDERS[def.type](e);
      this.root.add(e.group);
      this.list.push(e);
      this.byTag.set(def.tag, e);
    }
    this.containers = this.list.filter((e) => e.def.type === 'container');
    this.mixers = this.list.filter((e) => e.def.type === 'mixer');
    this.forks = ['FL-301', 'FL-302'].map((t) => this.byTag.get(t));
    const svc = buildServices(look);
    this.services = svc.group;
    this.servicesMats = svc.mats;
    this.root.add(this.services);

    // people and trucks share one neutral material set
    this.peopleMats = look.createSet('eq');
    this.people = new THREE.Group();
    this.people.name = 'people';
    this.root.add(this.people);
    this.walkers = WALKS.map((path, k) => {
      const rig = actors.walker(this.peopleMats);
      this.people.add(rig.group);
      const len = path.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - path[i][0], p[1] - path[i][1]), 0);
      return { g: rig.group, rig, path, len, u: (k * 0.37) % 1, speed: 1.15 + (k % 3) * 0.15, phase: k };
    });
    for (const [x, z, ry, pose, line] of STANDING) {
      let px = x, pz = z;
      if (pose === 'cab') { const s = line < 2 ? 1 : -1; px = 33.9; pz = LINE_Z[line] + 1.55 * s; }
      const g = actors.person(this.peopleMats, pose === 'cab' ? 'work' : pose);
      g.position.set(px, 0, pz);
      g.rotation.y = pose === 'cab' ? (line < 2 ? -Math.PI / 2 : Math.PI / 2) : ry;
      this.people.add(g);
    }
    this.truckMats = look.createSet('eq');
    this.trucks = [88.5, 93.0].map((x) => {
      const g = actors.truck(this.truckMats);
      g.position.set(x, 0, 36.25);
      g.rotation.y = -Math.PI / 2;
      g.visible = false;
      this.root.add(g);
      return g;
    });
    const raw = actors.truck(this.truckMats);
    raw.position.set(-24.3, 0, 27);
    raw.rotation.y = Math.PI;
    this.root.add(raw);

    // cosmetic forklift loops
    this.loopers = [
      { e: this.byTag.get('FL-101'), path: [[-6, AISLE_Z], [-17, AISLE_Z], [-17, 10.6], [-17, AISLE_Z], [3, AISLE_Z], [3, 20.8]], u: 0, speed: 1.6 },
      { e: this.byTag.get('FL-701'), path: [[83.0, 32.2], [86.5, 32.2], [86.5, 28.6], [89.3, 28.6], [89.3, 16.0], [89.3, 30.8], [92.0, 30.8], [92.0, 33.4]], u: 0, speed: 1.5 },
    ];
    for (const l of this.loopers) l.len = l.path.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - l.path[i][0], p[1] - l.path[i][1]), 0);

    this.pickables = [];
    for (const e of this.list) for (const m of e.pickMeshes()) { m.userData.eq = e; this.pickables.push(m); }
    this._v = new THREE.Vector3();
    this._racksSig = '';
  }

  zoneBox(code) {
    const z = ZONES.find((q) => q.code === code);
    return z;
  }

  sync(model, dt, time) {
    for (const e of this.list) {
      const st = statusOf(model, e.def);
      e.setStatus(st, time);
    }
    // per-type live state
    model.lines.forEach((L, i) => {
      const n = i + 1;
      const run = L.state === 'run';
      this.byTag.get(`CR-4${n}1`).update({ flow: run ? L.ext : 0 }, dt);
      this.byTag.get(`CB-4${n}1`).update({ flow: run ? L.ext : 0, belt: L.beltKg }, dt);
      this.byTag.get(`SH-60${n}`).update({ fill: L.surge.kg / model.p.surgeCapKg }, dt);
    });
    const P = model.packer;
    const filling = P.state === 'fill';
    this.byTag.get('CV-601').update({ active: filling || P.state === 'switch', running: filling }, dt);
    this.byTag.get('RP-601').update({ countA: P.counts[0], countB: P.counts[1], side: P.side, running: filling }, dt);
    this.byTag.get('SW-601').update({ loaded: model.wrap.loaded, running: model.wrap.loaded }, dt);
    for (const tag of ['CH-901', 'CH-902']) this.byTag.get(tag).update({ running: model.working }, dt);
    // pallets in the racks
    const qh = model.pallets.filter((p) => p.loc === 'qh').map((p) => (p.lot.qc === 'retest' ? 'reject' : p.lot.qc === 'pass' ? 'test' : 'hold'));
    const fg = model.pallets.filter((p) => p.loc === 'fg').map(() => 'ok');
    this.byTag.get('QH-701').setPallets(qh);
    this.byTag.get('FG-702').setPallets(fg);
    // trucks at the docks
    this.trucks.forEach((g, k) => { g.visible = model.truck.present && model.truck.slot === k; });
    // mixers turn
    model.mixers.forEach((M, j) => { this.mixers[j].live.cradle.rotation.x = M.angle; });
    // containers follow the logistics
    model.containers.forEach((c, i) => this.placeContainer(this.containers[i], c, model));
    // forklifts follow their motion
    model.forks.forEach((F, i) => {
      const e = this.forks[i];
      const [hx, hz] = F.heading;
      e.group.position.set(F.x - hx * 0.95, 0, F.z - hz * 0.95);
      e.group.rotation.y = Math.atan2(-hz, hx);
      e.setLift(Math.max(0, F.lift - 0.1));
    });
    // cosmetic loops
    for (const l of this.loopers) {
      if (l.e.status === 'run') l.u = (l.u + (dt * l.speed) / (2 * l.len)) % 1;
      const d = l.u < 0.5 ? l.u * 2 * l.len : (1 - l.u) * 2 * l.len;
      const [x, z, hx, hz] = along(l.path, d);
      const back = l.u >= 0.5;
      l.e.group.position.set(x, 0, z);
      l.e.group.rotation.y = Math.atan2(back ? hz : -hz, back ? -hx : hx);
      l.e.setLift(0.06);
    }
    for (const w of this.walkers) {
      w.u = (w.u + (dt * w.speed) / (2 * w.len)) % 1;
      const d = w.u < 0.5 ? w.u * 2 * w.len : (1 - w.u) * 2 * w.len;
      const [x, z, hx, hz] = along(w.path, d);
      const back = w.u >= 0.5;
      w.g.position.set(x, 0, z);
      w.g.rotation.y = Math.atan2(back ? hz : -hz, back ? -hx : hx);
      // a step is about 0.7 m, so one gait cycle covers 1.4 m
      w.phase += (dt * w.speed * Math.PI) / 0.7;
      actors.walkPose(w.rig, w.phase);
    }
  }

  placeContainer(e, c, model) {
    const g = e.group;
    if (c.loc.kind === 'mixer') {
      const cradle = this.mixers[c.loc.i].live.cradle;
      if (g.parent !== cradle) cradle.add(g);
      g.position.set(0, prep.MIX_DOCK_LOCAL, 0);
      g.rotation.set(0, 0, 0);
      return;
    }
    if (g.parent !== this.root) this.root.add(g);
    if (c.loc.kind === 'fork') {
      const F = model.forks[c.loc.i];
      g.position.set(F.x, F.lift, F.z);
      g.rotation.set(0, Math.atan2(-F.heading[1], F.heading[0]), 0);
      return;
    }
    const s = SLOTS[c.loc.kind][c.loc.i];
    g.position.set(s.x, s.y, s.z);
    g.rotation.set(0, 0, 0);
  }
}

function along(path, d) {
  for (let i = 1; i < path.length; i++) {
    const [x0, z0] = path[i - 1], [x1, z1] = path[i];
    const L = Math.hypot(x1 - x0, z1 - z0);
    if (d <= L || i === path.length - 1) {
      const u = L > 0 ? Math.min(1, d / L) : 0;
      return [x0 + (x1 - x0) * u, z0 + (z1 - z0) * u, (x1 - x0) / (L || 1), (z1 - z0) / (L || 1)];
    }
    d -= L;
  }
  const p = path[path.length - 1];
  return [p[0], p[1], 1, 0];
}
