// Discrete-time process model of the plant. Every number on screen comes from here.
// Time unit: seconds of simulated time. t = 0 is Monday 00:00.

import { SLOTS, route, FORKLIFT_HOME, LINE_Z } from '../plant/layout.js';

// Model assumptions. Replace with nameplate data when available.
export const DEFAULTS = {
  lines: 4,
  batchKg: 450, doseMin: 20, doseStations: 2,
  mixers: 3, dockMin: 2, turnMin: 1, mixMin: 8,
  containers: 12, forklifts: 2, vEmpty: 2.0, vLoaded: 1.4, handleSec: 35,
  extKgH: 250, beltMin: 3, acmKgH: 300, fineKgH: 280,
  warmupMin: 30, changeoverMin: 90, purgeKg: 25,
  surgeCapKg: 1500, cartonKg: 25, cartonSec: 45, cartonsPerPallet: 32, packSwitchMin: 15,
  lotKg: 4000, qcHours: 4, qcSlots: 2, qcFailPct: 3,
  shifts: 2, shiftHours: 8, daysPerWeek: 5, startHour: 6,
  dispatch: [10, 16], truckPallets: 22,
  availability: 0.88, changeoversPerMonth: 16,
};

export const RECIPES = {
  'FBE-1': { code: 'FBE-1', name: 'FBE однослойное', std: 'CSA Z245.20 / ISO 21809-2', rate: 1.0, mix: { resin: 0.58, hardener: 0.05, filler: 0.31, pigment: 0.04, additive: 0.02 } },
  'FBE-2B': { code: 'FBE-2B', name: 'FBE двухслойное, базовый слой', std: 'CSA Z245.20', rate: 0.95, mix: { resin: 0.6, hardener: 0.05, filler: 0.29, pigment: 0.04, additive: 0.02 } },
  'FBE-2T': { code: 'FBE-2T', name: 'FBE двухслойное, верхний слой', std: 'CSA Z245.20', rate: 0.9, mix: { resin: 0.55, hardener: 0.05, filler: 0.34, pigment: 0.04, additive: 0.02 } },
  'EP-3L': { code: 'EP-3L', name: 'Эпоксидный праймер 3LPE/3LPP', std: 'ISO 21809-1', rate: 1.0, mix: { resin: 0.66, hardener: 0.06, filler: 0.22, pigment: 0.04, additive: 0.02 } },
};
const RECIPE_KEYS = Object.keys(RECIPES);
const RAW = { resin: 'Эпоксидная смола', hardener: 'Отвердитель', filler: 'Наполнители', pigment: 'Пигменты', additive: 'Добавки' };
export const RAW_NAMES = RAW;

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

class Fifo {
  constructor() { this.q = []; this.kg = 0; }
  push(order, kg) {
    if (kg <= 0) return;
    const last = this.q[this.q.length - 1];
    if (last && last.order === order) last.kg += kg; else this.q.push({ order, kg });
    this.kg += kg;
  }
  take(kg) {
    const out = [];
    while (kg > 1e-9 && this.q.length) {
      const h = this.q[0];
      const t = Math.min(h.kg, kg);
      h.kg -= t; kg -= t; this.kg -= t;
      out.push({ order: h.order, kg: t });
      if (h.kg <= 1e-9) this.q.shift();
    }
    if (this.kg < 1e-6) { this.kg = 0; this.q.length = 0; }
    return out;
  }
  head() { return this.q[0]?.order || null; }
  has(order) { return this.q.some((s) => s.order === order && s.kg > 1e-6); }
}

const HIST = 240;

export class PlantModel {
  constructor(params = {}) {
    this.p = { ...DEFAULTS, ...params };
    this.reset();
  }

  reset() {
    const p = this.p;
    this.rng = mulberry32(20241021);
    this.t = p.startHour * 3600;
    this.seq = { order: 412, batch: 1, lot: 1, pallet: 1, event: 1 };
    this.events = [];
    this.orders = [];
    this.batches = [];
    this.lots = [];
    this.pallets = [];
    this.tasks = [];
    this.raw = { resin: 42000, hardener: 3600, filler: 31000, pigment: 4200, additive: 1600 };
    this.rawUsed = { resin: 0, hardener: 0, filler: 0, pigment: 0, additive: 0 };
    this.slot = { park: SLOTS.park.map((_, i) => i), dose: [-1, -1], mixer: [-1, -1, -1], buffer: SLOTS.buffer.map(() => -1), line: [-1, -1, -1, -1] };
    this.reserved = { dose: [false, false], mixer: [false, false, false], buffer: SLOTS.buffer.map(() => false), line: [false, false, false, false], park: SLOTS.park.map(() => false) };
    this.containers = SLOTS.park.map((s, i) => ({ i, tag: `CT-${String(i + 1).padStart(2, '0')}`, loc: { kind: 'park', i }, state: 'empty', batch: null, kg: 0, reserved: false }));
    this.dose = SLOTS.dose.map(() => ({ state: 'idle', t: 0, batch: null, reason: '' }));
    this.mixers = SLOTS.mixer.map(() => ({ state: 'idle', t: 0, phaseT: 0, angle: 0, ct: -1, temp: 22 }));
    this.forks = FORKLIFT_HOME.map(([x, z], i) => ({ i, state: 'idle', x, z, heading: [1, 0], task: null, motion: null, mt: 0, busy: 0, lift: 0.06, carry: -1, odo: 0, battery: 0.86 - i * 0.07 }));
    this.lines = LINE_Z.map((_, i) => ({
      i, order: null, lastRecipe: null, state: 'off', temp: 24, changeLeft: 0, hopper: 0, rate: 0,
      belt: [], beltKg: 0, chip: new Fifo(), fineBin: new Fifo(), surge: new Fifo(),
      ext: 0, acm: 0, fine: 0, acmState: 'off', fineState: 'off', coolState: 'off',
      dp: 9 + i * 0.7, run: 0, planned: 0, producedKg: 0, starvedFor: 0, blockedFor: 0,
    }));
    this.en = {
      ext: [true, true, true, true], cool: [true, true, true, true], acm: [true, true, true, true], fine: [true, true, true, true],
      feed: [true, true, true, true], dose: [true, true], mix: [true, true, true], pack: true, pal: true, lab: true, fork: [true, true],
    };
    this.packer = { state: 'off', h: -1, t: 0, prog: 0, lastWeight: 0, cartons: 0, lastRecipe: null, switchLeft: 0, side: 0, counts: [0, 0], pallet: null };
    this.wrap = { queue: [], t: 0, loaded: false };
    this.lab = { queue: [], running: [], done: 0, failed: 0 };
    this.truck = { present: false, left: 0, lastDay: -1, slot: -1, loaded: 0 };
    this.k = {
      packedKg: 0, shippedKg: 0, releasedKg: 0, scrapKg: 0, dosedKg: 0, producedKg: 0, cartons: 0,
      run: 0, planned: 0, hourBuckets: new Array(24).fill(0), hourOut: new Array(24).fill(0), lastHour: -1,
    };
    this.util = { dose: 0, mix: 0, ext: 0, acm: 0, fine: 0, pack: 0, lab: 0, log: 0 };
    this.hist = {};
    this.histT = 0;
    this.working = false;
    this.fl701 = 0;
    for (let i = 0; i < 8; i++) this.newOrder(true);
  }

  // --- calendar
  clock(t = this.t) {
    const day = Math.floor(t / 86400);
    const sec = t - day * 86400;
    return { day, dow: day % 7, h: Math.floor(sec / 3600), m: Math.floor((sec % 3600) / 60), hf: sec / 3600 };
  }
  isWorking(t = this.t) {
    const c = this.clock(t);
    if (c.dow >= this.p.daysPerWeek) return false;
    if (this.p.shifts >= 3) return true;
    return c.hf >= this.p.startHour && c.hf < this.p.startHour + this.p.shifts * this.p.shiftHours;
  }
  shiftNo(t = this.t) {
    if (!this.isWorking(t)) return 0;
    const c = this.clock(t);
    return Math.floor((((c.hf - this.p.startHour) % 24) + 24) % 24 / this.p.shiftHours) + 1;
  }

  log(level, tag, text) {
    this.events.unshift({ id: this.seq.event++, t: this.t, level, tag, text });
    if (this.events.length > 160) this.events.length = 160;
  }

  newOrder(initial = false) {
    const r = this.rng();
    const recipe = RECIPE_KEYS[r < 0.42 ? 0 : r < 0.6 ? 1 : r < 0.78 ? 2 : 3];
    const sizes = [4000, 6000, 8000, 10000, 12000, 16000];
    const kg = sizes[Math.floor(this.rng() * sizes.length)];
    const cust = ['Трубный завод А', 'Трубный завод Б', 'Изоляционный участок В', 'Завод покрытий Г'][Math.floor(this.rng() * 4)];
    const o = { id: `ЗП-${String(this.seq.order++).padStart(4, '0')}`, recipe, kg, customer: `${cust} (пример)`, state: 'queued', line: null,
      batchesNeeded: Math.ceil(kg / this.p.batchKg), batchesCreated: 0, batchesConsumed: 0, producedKg: 0, packedKg: 0, releasedKg: 0, shippedKg: 0, created: this.t, lot: null };
    this.orders.push(o);
    if (!initial) this.log('info', 'ПЛАН', `Новый заказ ${o.id}: ${RECIPES[recipe].code}, ${(kg / 1000).toFixed(0)} т`);
    return o;
  }

  // --- main step
  advance(seconds, maxStep = 5) {
    let left = seconds;
    while (left > 1e-6) {
      const dt = Math.min(maxStep, left);
      this.step(dt);
      left -= dt;
    }
  }

  step(dt) {
    const p = this.p;
    const was = this.working;
    this.t += dt;
    this.working = this.isWorking();
    if (was !== this.working) this.log('info', 'СМЕНА', this.working ? `Начало смены ${this.shiftNo()}` : 'Окончание работы, линии остановлены');
    this.assignOrders();
    this.requestBatches();
    this.runDosing(dt);
    this.runMixers(dt);
    this.runLines(dt);
    this.runPacking(dt);
    this.runLab(dt);
    this.runDispatch(dt);
    this.schedule();
    this.runForks(dt);
    this.kpi(dt);
    if (this.orders.filter((o) => o.state === 'queued').length < 5) this.newOrder();
  }

  assignOrders() {
    const p = this.p;
    for (const L of this.lines) {
      if (L.i >= p.lines) continue;
      const o = L.order;
      const finished = o && o.batchesCreated >= o.batchesNeeded && o.batchesConsumed >= o.batchesNeeded && L.hopper < 0.5;
      if (o && !finished) continue;
      if (o && finished) { o.state = 'produced'; L.lastRecipe = o.recipe; L.order = null; this.log('info', `EX-4${L.i + 1}1`, `Заказ ${o.id} выработан`); }
      const queued = this.orders.filter((q) => q.state === 'queued');
      if (!queued.length) continue;
      const pick = queued.slice(0, 3).find((q) => q.recipe === L.lastRecipe) || queued[0];
      pick.state = 'active';
      pick.line = L.i;
      pick.started = this.t;
      L.order = pick;
      if (L.lastRecipe && L.lastRecipe !== pick.recipe) {
        L.changeLeft = p.changeoverMin * 60;
        this.k.scrapKg += p.purgeKg;
        this.log('warn', `EX-4${L.i + 1}1`, `Переналадка ${L.lastRecipe} → ${pick.recipe}, чистка ${p.changeoverMin} мин`);
      }
      this.log('info', `EX-4${L.i + 1}1`, `Запуск заказа ${pick.id} (${pick.recipe})`);
    }
  }

  requestBatches() {
    for (const L of this.lines) {
      const o = L.order;
      if (!o || L.i >= this.p.lines) continue;
      const inPipe = this.batches.filter((b) => b.line === L.i && b.state !== 'consumed').length;
      if (o.batchesCreated < o.batchesNeeded && inPipe < 3) {
        o.batchesCreated++;
        this.batches.push({ id: `B-${String(this.seq.batch++).padStart(4, '0')}`, order: o, recipe: o.recipe, line: L.i, kg: this.p.batchKg, state: 'queued', created: this.t });
      }
    }
    if (this.batches.length > 400) this.batches = this.batches.filter((b) => b.state !== 'consumed' || this.t - b.created < 6 * 3600);
  }

  // --- dosing
  runDosing(dt) {
    const p = this.p;
    this.dose.forEach((D, s) => {
      if (D.state === 'dosing') {
        if (this.working && this.en.dose[s]) D.t -= dt;
        if (D.t <= 0) {
          const ct = this.containers[this.slot.dose[s]];
          ct.state = 'dosed'; ct.kg = D.batch.kg;
          D.batch.state = 'dosed';
          this.k.dosedKg += D.batch.kg;
          const mix = RECIPES[D.batch.recipe].mix;
          for (const k in mix) { this.raw[k] -= D.batch.kg * mix[k]; this.rawUsed[k] += D.batch.kg * mix[k]; }
          D.state = 'done';
        }
        return;
      }
      if (D.state === 'idle' && this.working && this.en.dose[s] && s < p.doseStations) {
        const b = this.batches.find((x) => x.state === 'queued');
        if (!b) { D.reason = 'нет заданий'; return; }
        const free = this.containers.find((c) => c.state === 'empty' && c.loc.kind === 'park' && !c.reserved);
        if (!free) { D.reason = 'нет свободной тары'; return; }
        b.state = 'assigned';
        D.batch = b; D.state = 'await'; D.reason = '';
        free.reserved = true;
        this.reserved.dose[s] = true;
        this.addTask(free.i, { kind: 'dose', i: s }, 5, () => {
          this.reserved.dose[s] = false;
          free.state = 'dosing'; free.batch = b; b.state = 'dosing'; b.container = free.i;
          D.state = 'dosing'; D.t = p.doseMin * 60;
        });
      }
    });
    // replenish raw stock from the warehouse when low
    for (const k in this.raw) if (this.raw[k] < 2500) { this.raw[k] += 18000; this.log('info', 'RK-101', `Пополнение: ${RAW[k]} +18 т со склада сырья`); }
  }

  // --- mixers
  runMixers(dt) {
    const p = this.p;
    const phases = [['dock', p.dockMin], ['turn', p.turnMin], ['mix', p.mixMin], ['turnback', p.turnMin], ['undock', p.dockMin]];
    this.mixers.forEach((M, j) => {
      if (M.ct >= 0 && M.state !== 'done' && M.state !== 'idle') {
        const go = this.working && this.en.mix[j];
        if (go) M.t += dt;
        let acc = 0, cur = null;
        for (const [name, min] of phases) {
          if (M.t < acc + min * 60) { cur = [name, (M.t - acc) / (min * 60)]; break; }
          acc += min * 60;
        }
        if (!cur) {
          M.state = 'done'; M.angle = 0;
          const ct = this.containers[M.ct];
          ct.state = 'mixed';
          if (ct.batch) ct.batch.state = 'mixed';
        } else {
          M.state = cur[0];
          M.angle = cur[0] === 'turn' ? Math.PI * ease(cur[1]) : cur[0] === 'mix' ? Math.PI : cur[0] === 'turnback' ? Math.PI * (1 - ease(cur[1])) : 0;
          if (go && cur[0] === 'mix') M.temp = Math.min(34, M.temp + dt * 0.012); else M.temp += (22 - M.temp) * Math.min(1, dt / 900);
        }
      } else M.temp += (22 - M.temp) * Math.min(1, dt / 900);
    });
  }

  // --- lines
  runLines(dt) {
    const p = this.p;
    for (const L of this.lines) {
      const i = L.i;
      const active = i < p.lines && this.working;
      const hasWork = !!L.order || L.hopper > 0.5;
      const hot = active && this.en.ext[i] && hasWork;
      const tau = hot ? p.warmupMin * 60 / 2.3 : 2400;
      L.temp += ((hot ? 108 : 24) - L.temp) * Math.min(1, dt / tau);
      // feed: docked container to feeder hopper
      const ci = this.slot.line[i];
      if (ci >= 0) {
        const ct = this.containers[ci];
        if (ct.state === 'feeding' && this.en.feed[i]) {
          const mv = Math.min(ct.kg, 80 - L.hopper, (1500 * dt) / 3600);
          if (mv > 0) { ct.kg -= mv; L.hopper += mv; L.hopperOrder = ct.batch.order; }
          if (ct.kg <= 1e-6) {
            ct.kg = 0; ct.state = 'return';
            ct.batch.state = 'consumed'; ct.batch.order.batchesConsumed++;
            ct.batch = null;
          }
        }
      }
      // extruder
      const R = p.extKgH * (L.order ? RECIPES[L.order.recipe].rate : L.hopperOrder ? RECIPES[L.hopperOrder.recipe].rate : 1);
      let out = 0;
      if (active && this.en.ext[i] && L.changeLeft > 0) L.changeLeft -= dt;
      const blocked = !this.en.cool[i] || L.beltKg > 60 || L.chip.kg > 220;
      if (active && this.en.ext[i] && L.temp >= 100 && L.changeLeft <= 0 && L.hopper > 0 && !blocked) {
        out = Math.min((R * dt) / 3600, L.hopper);
        L.hopper -= out;
        const ord = L.hopperOrder || L.order;
        L.belt.push({ t: this.t + p.beltMin * 60, kg: out, order: ord });
        L.beltKg += out;
        L.producedKg += out; this.k.producedKg += out;
        if (ord) ord.producedKg += out;
      }
      L.ext = out / dt * 3600;
      L.state = i >= p.lines || !this.working ? 'off' : !this.en.ext[i] ? 'stop' : L.changeLeft > 0 ? 'changeover'
        : hot && L.temp < 100 ? 'warmup' : out > 0 ? 'run' : blocked && L.hopper > 0 ? 'blocked' : 'starved';
      if (L.state === 'starved' && L.order) { L.starvedFor += dt; if (L.starvedFor > 900 && L.starvedFor - dt <= 900) this.log('warn', `EX-4${i + 1}1`, 'Простой более 15 мин: нет премикса'); } else L.starvedFor = 0;
      if (L.state === 'blocked') { L.blockedFor += dt; if (L.blockedFor > 600 && L.blockedFor - dt <= 600) this.log('warn', `EX-4${i + 1}1`, 'Линия заблокирована: переполнен буфер после экструдера'); } else L.blockedFor = 0;
      if (i < p.lines && this.working) { L.planned += dt; this.k.planned += dt; }
      if (out > 0) { const f = out / ((R * dt) / 3600); L.run += dt * f; this.k.run += dt * f; this.k.ideal = (this.k.ideal || 0) + (R * dt * f) / 3600; }
      // cooling belt transport
      if (this.en.cool[i] && (active || L.beltKg > 0)) {
        while (L.belt.length && L.belt[0].t <= this.t) { const b = L.belt.shift(); L.beltKg -= b.kg; L.chip.push(b.order, b.kg); }
      } else for (const b of L.belt) b.t += dt;
      if (L.beltKg < 1e-6) L.beltKg = 0;
      L.coolState = !this.en.cool[i] ? 'stop' : L.beltKg > 0.01 || out > 0 ? 'run' : active ? 'idle' : 'off';
      // ACM-50 + APW-30A
      let a = 0;
      if ((active || L.chip.kg > 0) && this.working && this.en.acm[i] && L.fineBin.kg < 120) {
        a = Math.min((p.acmKgH * dt) / 3600, L.chip.kg, 120 - L.fineBin.kg);
        for (const s of L.chip.take(a)) L.fineBin.push(s.order, s.kg);
      }
      L.acm = a / dt * 3600;
      L.acmState = !this.working || i >= p.lines ? (L.chip.kg > 0 ? 'idle' : 'off') : !this.en.acm[i] ? 'stop' : a > 0 ? 'run' : L.fineBin.kg >= 119 ? 'blocked' : 'idle';
      // fine mill, cyclone, sieve, bag filter, fan
      let f = 0;
      if (this.working && this.en.fine[i] && L.surge.kg < p.surgeCapKg) {
        f = Math.min((p.fineKgH * dt) / 3600, L.fineBin.kg, p.surgeCapKg - L.surge.kg);
        for (const s of L.fineBin.take(f)) L.surge.push(s.order, s.kg);
      }
      L.fine = f / dt * 3600;
      L.fineState = !this.working || i >= p.lines ? 'off' : !this.en.fine[i] ? 'stop' : f > 0 ? 'run' : L.surge.kg >= p.surgeCapKg - 1 ? 'blocked' : 'idle';
      if (f > 0) {
        L.dp += dt * 0.0011;
        if (L.dp > 14.5) { L.dp = 8.2 + this.rng() * 0.6; if (this.rng() < 0.08) this.log('warn', `BF-50${i + 1}`, 'ΔP рукавов 14,5 мбар: внеплановая регенерация'); }
      }
    }
  }

  // --- packing, palletizing, wrapping
  runPacking(dt) {
    const p = this.p;
    const P = this.packer;
    const surges = this.lines.map((L) => L.surge);
    if (!this.working) { P.state = 'off'; }
    else if (!this.en.pack) { P.state = 'stop'; }
    else if (P.state === 'switch') {
      P.switchLeft -= dt;
      if (P.switchLeft <= 0) P.state = 'fill';
    } else {
      const cur = P.h >= 0 ? surges[P.h] : null;
      if (!cur || cur.kg < p.cartonKg) {
        let best = -1, bestKg = 0;
        surges.forEach((s, i) => {
          const ready = s.kg >= Math.min(500, p.surgeCapKg * 0.3) || s.kg >= p.surgeCapKg * 0.8 || (s.kg >= p.cartonKg && !this.lines[i].order);
          if (ready && s.kg > bestKg) { best = i; bestKg = s.kg; }
        });
        if (best < 0) { P.state = 'idle'; }
        else if (best !== P.h) {
          const rec = surges[best].head()?.recipe;
          P.switchLeft = rec && P.lastRecipe && rec !== P.lastRecipe ? p.packSwitchMin * 60 : 120;
          P.h = best;
          P.state = 'switch';
          this.log('info', 'PK-601', `Переключение на бункер П${best + 1}${rec !== P.lastRecipe && P.lastRecipe ? ' с чисткой весового дозатора' : ''}`);
        } else P.state = 'fill';
      } else P.state = 'fill';
    }
    if (P.state === 'fill' && !this.en.pal) P.state = 'blocked';
    if (P.state === 'fill') {
      P.prog += dt / p.cartonSec;
      while (P.prog >= 1 && P.h >= 0 && surges[P.h].kg >= p.cartonKg) {
        P.prog -= 1;
        const parts = surges[P.h].take(p.cartonKg);
        const order = parts.sort((a, b) => b.kg - a.kg)[0].order;
        P.lastRecipe = order.recipe;
        P.lastWeight = p.cartonKg + Math.round(gauss(this.rng) * 0.4) / 1000;
        P.cartons++;
        this.k.cartons++;
        this.k.packedKg += p.cartonKg;
        order.packedKg += p.cartonKg;
        this.addCarton(order);
      }
      if (P.h < 0 || surges[P.h].kg < p.cartonKg) P.prog = Math.min(P.prog, 0.99);
    }
    // wrapper and transfer to quarantine
    const W = this.wrap;
    if (!W.loaded && W.queue.length && this.working) { W.loaded = true; W.t = 90; W.pallet = W.queue.shift(); }
    if (W.loaded) {
      W.t -= dt;
      if (W.t <= 0) {
        W.loaded = false;
        W.pallet.loc = 'qh';
        this.fl701 = this.t;
        this.checkRelease(W.pallet.lot);
        W.pallet = null;
      }
    }
    // close lots of orders that are fully produced and drained
    for (const lot of this.lots) {
      if (lot.closed) continue;
      const o = lot.order;
      const drained = o.state === 'produced' && !this.lines.some((L) => L.chip.has(o) || L.fineBin.has(o) || L.surge.has(o) || L.belt.some((b) => b.order === o));
      if (drained) { if (this.packer.pallet && this.packer.pallet.order === o) this.closePallet(); lot.closed = true; this.checkRelease(lot); }
    }
  }

  addCarton(order) {
    const p = this.p;
    const P = this.packer;
    // lot bookkeeping
    let lot = order.lot;
    if (!lot || lot.closed || lot.kg >= p.lotKg) {
      if (lot && !lot.closed) { lot.closed = true; this.checkRelease(lot); }
      lot = { id: `Л-${String(this.seq.lot++).padStart(4, '0')}`, order, recipe: order.recipe, kg: 0, pallets: [], closed: false, qc: 'queue', qcLeft: 0, released: false, started: this.t };
      order.lot = lot;
      this.lots.push(lot);
      this.lab.queue.push(lot);
      this.log('info', 'LB-800', `Отобрана проба лота ${lot.id} (${order.recipe}) в ОТК`);
    }
    lot.kg += p.cartonKg;
    // palletizing
    if (P.pallet && P.pallet.order !== order) this.closePallet();
    if (!P.pallet) {
      P.side = 1 - P.side;
      P.pallet = { id: `П-${String(this.seq.pallet++).padStart(5, '0')}`, order, lot, cartons: 0, kg: 0, loc: 'cell', side: P.side, made: this.t };
    }
    P.pallet.cartons++;
    P.pallet.kg += p.cartonKg;
    P.pallet.lot = lot;
    P.counts[P.side] = P.pallet.cartons;
    if (P.pallet.cartons >= p.cartonsPerPallet) this.closePallet();
  }

  closePallet() {
    const P = this.packer;
    if (!P.pallet) return;
    const pl = P.pallet;
    pl.loc = 'wrap';
    pl.lot.pallets.push(pl);
    this.pallets.push(pl);
    this.wrap.queue.push(pl);
    P.counts[pl.side] = 0;
    P.pallet = null;
  }

  checkRelease(lot) {
    if (!lot || lot.released || !lot.closed || lot.qc !== 'pass') return;
    if (lot.pallets.some((pl) => pl.loc === 'wrap' || pl.loc === 'cell')) return;
    lot.released = true;
    lot.releasedAt = this.t;
    for (const pl of lot.pallets) pl.loc = 'fg';
    this.k.releasedKg += lot.kg;
    lot.order.releasedKg += lot.kg;
    this.fl701 = this.t;
    this.log('info', 'QH-701', `Лот ${lot.id} выпущен ОТК: ${(lot.kg / 1000).toFixed(1)} т → склад продукции`);
  }

  // --- laboratory
  runLab(dt) {
    const p = this.p, L = this.lab;
    for (const r of L.running) r.left -= dt;
    for (const r of L.running.filter((r) => r.left <= 0)) {
      const lot = r.lot;
      if (lot.qc === 'retest' || this.rng() > p.qcFailPct / 100) {
        lot.qc = 'pass';
        L.done++;
        this.log('info', 'LB-800', `Лот ${lot.id}: испытания пройдены (Tg, время гелеобразования, гранулометрия)`);
        this.checkRelease(lot);
      } else {
        lot.qc = 'retest';
        L.failed++;
        L.queue.unshift(lot);
        this.log('alarm', 'LB-800', `Лот ${lot.id}: отклонение по времени гелеобразования, повторные испытания`);
      }
    }
    L.running = L.running.filter((r) => r.left > 0);
    if (this.working && this.en.lab) {
      while (L.running.length < p.qcSlots && L.queue.length) {
        const lot = L.queue.shift();
        if (lot.qc !== 'retest') lot.qc = 'test';
        L.running.push({ lot, left: (lot.qc === 'retest' ? 0.5 : 1) * p.qcHours * 3600, total: (lot.qc === 'retest' ? 0.5 : 1) * p.qcHours * 3600 });
      }
    }
  }

  // --- dispatch
  runDispatch(dt) {
    const T = this.truck;
    const c = this.clock();
    if (T.present) {
      T.left -= dt;
      if (T.left <= 0) { T.present = false; this.log('info', 'FG-702', `Отгружено ${T.loaded} поддонов`); }
      return;
    }
    if (c.dow >= this.p.daysPerWeek) return;
    for (const h of this.p.dispatch) {
      const key = c.day * 100 + h;
      if (c.h === h && T.lastKey !== key) {
        T.lastKey = key;
        const ready = this.pallets.filter((pl) => pl.loc === 'fg').slice(0, this.p.truckPallets);
        if (!ready.length) continue;
        for (const pl of ready) { pl.loc = 'shipped'; this.k.shippedKg += pl.kg; pl.order.shippedKg += pl.kg; }
        T.present = true; T.left = 2700; T.loaded = ready.length; T.slot = (T.slot + 1) % 2;
        this.fl701 = this.t;
      }
    }
    if (this.pallets.length > 600) this.pallets = this.pallets.filter((pl) => pl.loc !== 'shipped');
  }

  // --- logistics: tasks and forklifts
  addTask(ct, to, prio, onDone) {
    this.containers[ct].reserved = true;
    this.tasks.push({ ct, to, prio, onDone, created: this.t });
  }

  schedule() {
    const p = this.p;
    // mixer: pick up dosed containers
    this.dose.forEach((D, s) => {
      if (D.state !== 'done' || D.moving) return;
      const j = this.mixers.findIndex((M, jj) => jj < p.mixers && M.state === 'idle' && M.ct < 0 && !this.reserved.mixer[jj] && this.en.mix[jj]);
      if (j < 0) { D.reason = 'ожидание смесителя'; return; }
      D.moving = true;
      this.reserved.mixer[j] = true;
      const ct = this.slot.dose[s];
      this.addTask(ct, { kind: 'mixer', i: j }, 3, () => {
        this.reserved.mixer[j] = false;
        const M = this.mixers[j];
        M.ct = ct; M.t = 0; M.state = 'dock';
        this.containers[ct].state = 'mixing';
      });
    });
    // mixer: send mixed containers to their line or to the buffer
    this.mixers.forEach((M, j) => {
      if (M.state !== 'done' || M.moving) return;
      const ct = this.containers[M.ct];
      const li = ct.batch.line;
      let to = null;
      if (this.slot.line[li] < 0 && !this.reserved.line[li]) to = { kind: 'line', i: li };
      else {
        const k = this.slot.buffer.findIndex((v, kk) => v < 0 && !this.reserved.buffer[kk]);
        if (k >= 0) to = { kind: 'buffer', i: k };
      }
      if (!to) return;
      M.moving = true;
      this.reserved[to.kind][to.i] = true;
      this.addTask(M.ct, to, 2, () => this.arrive(ct, to));
    });
    // buffer to free line docks
    this.slot.buffer.forEach((ci, k) => {
      if (ci < 0) return;
      const ct = this.containers[ci];
      if (ct.reserved) return;
      const li = ct.batch.line;
      if (this.slot.line[li] < 0 && !this.reserved.line[li]) {
        this.reserved.line[li] = true;
        this.addTask(ci, { kind: 'line', i: li }, 1, () => this.arrive(ct, { kind: 'line', i: li }));
      }
    });
    // empty containers back to the park
    this.slot.line.forEach((ci) => {
      if (ci < 0) return;
      const ct = this.containers[ci];
      if (ct.state !== 'return' || ct.reserved) return;
      const k = this.slot.park.findIndex((v, kk) => v < 0 && !this.reserved.park[kk]);
      if (k < 0) return;
      this.reserved.park[k] = true;
      this.addTask(ci, { kind: 'park', i: k }, 0, () => { this.reserved.park[k] = false; ct.state = 'empty'; });
    });
  }

  arrive(ct, to) {
    this.reserved[to.kind][to.i] = false;
    if (to.kind === 'line') ct.state = 'feeding';
    else ct.state = 'mixed';
  }

  slotPos(loc) {
    const s = SLOTS[loc.kind][loc.i];
    return s;
  }

  // keyframes for a forklift move: [{x, z, y, t}], first segment optionally reversing
  motion(points, yStart, yEnd, v, t0, revFirst = true) {
    const p = this.p;
    const travelY = 0.18;
    const kf = [];
    let t = t0;
    const push = (x, z, y, rev = false) => { kf.push({ x, z, y, t, rev }); };
    const n = points.length;
    push(points[0][0], points[0][1], yStart);
    for (let k = 1; k < n; k++) {
      const [x0, z0] = points[k - 1], [x1, z1] = points[k];
      const d = Math.hypot(x1 - x0, z1 - z0);
      // lower after backing out of the first slot
      if (k === 2 && Math.abs(yStart - travelY) > 0.3) { t += Math.abs(yStart - travelY) / 0.3 + 2; push(x0, z0, travelY); }
      // raise before entering the last slot
      if (k === n - 1 && Math.abs(yEnd - travelY) > 0.3) { t += Math.abs(yEnd - travelY) / 0.3 + 2; push(x0, z0, yEnd); }
      t += d / v + 1.5;
      const y = k === n - 1 ? yEnd : k === 1 && n > 2 ? yStart : travelY;
      push(x1, z1, y, revFirst && k === 1);
    }
    return kf;
  }

  runForks(dt) {
    const p = this.p;
    for (const F of this.forks) {
      if (F.i >= p.forklifts || !this.en.fork[F.i]) continue;
      if (F.state === 'idle' && this.working) {
        this.tasks.sort((a, b) => a.prio - b.prio || a.created - b.created);
        const task = this.tasks.shift();
        if (task) {
          const ct = this.containers[task.ct];
          const from = ct.loc;
          const fs = this.slotPos(from);
          F.task = task;
          F.state = 'toPick';
          const pseudo = { x: F.x, z: F.z, ap: [F.x, F.z] };
          const pts = route(pseudo, fs);
          F.motion = this.motion(pts, F.lift, fs.y + 0.06, p.vEmpty, this.t, false);
          F.mt = this.t;
        }
      }
      if (F.state === 'idle') continue;
      F.busy += dt;
      const end = F.motion[F.motion.length - 1].t;
      if (this.t < end) { this.sampleFork(F); continue; }
      const task = F.task;
      const ct = this.containers[task.ct];
      if (F.state === 'toPick') {
        // pick up: free the source slot
        this.sampleFork(F);
        const from = ct.loc;
        const fs = this.slotPos(from);
        this.slot[from.kind][from.i] = -1;
        if (from.kind === 'dose') { this.dose[from.i].state = 'idle'; this.dose[from.i].moving = false; this.dose[from.i].batch = null; }
        if (from.kind === 'mixer') { const M = this.mixers[from.i]; M.state = 'idle'; M.ct = -1; M.moving = false; }
        if (from.kind === 'park') this.reserved.park[from.i] = false;
        const ts = this.slotPos(task.to);
        const pts = route(fs, ts);
        F.motion = this.motion(pts, fs.y + 0.06, ts.y + 0.06, p.vLoaded, this.t + p.handleSec);
        F.motion.unshift({ ...F.motion[0], t: this.t });
        F.state = 'carry';
        F.carry = task.ct;
        ct.loc = { kind: 'fork', i: F.i };
      } else if (F.state === 'carry') {
        this.sampleFork(F);
        this.slot[task.to.kind][task.to.i] = task.ct;
        ct.loc = { ...task.to };
        ct.reserved = false;
        F.carry = -1;
        task.onDone && task.onDone();
        // back out to the approach point
        const ts = this.slotPos(task.to);
        F.motion = [{ x: ts.x, z: ts.z, y: F.lift, t: this.t + p.handleSec * 0.6, rev: false }, { x: ts.ap[0], z: ts.ap[1], y: 0.06, t: this.t + p.handleSec * 0.6 + 6, rev: true }];
        F.motion.unshift({ ...F.motion[0], t: this.t });
        F.state = 'leave';
      } else if (F.state === 'leave') {
        this.sampleFork(F);
        F.state = 'idle'; F.task = null; F.motion = null;
      }
    }
    this.fl101 = this.working;
  }

  // position, heading, fork height of a forklift at the current time
  sampleFork(F) {
    const kf = F.motion;
    if (!kf) return;
    const t = this.t;
    let k = 1;
    while (k < kf.length - 1 && kf[k].t < t) k++;
    const a = kf[k - 1], b = kf[k];
    const u = b.t > a.t ? Math.max(0, Math.min(1, (t - a.t) / (b.t - a.t))) : 1;
    const dx = b.x - a.x, dz = b.z - a.z;
    const moving = Math.hypot(dx, dz) > 1e-3;
    const prev = { x: F.x, z: F.z };
    F.x = a.x + dx * u; F.z = a.z + dz * u;
    F.lift = a.y + (b.y - a.y) * u;
    F.odo += Math.hypot(F.x - prev.x, F.z - prev.z);
    if (moving) {
      const L = Math.hypot(dx, dz);
      F.heading = b.rev ? [-dx / L, -dz / L] : [dx / L, dz / L];
    }
    F.moving = moving && u > 0 && u < 1;
  }

  // --- KPI, utilisation, history
  kpi(dt) {
    const p = this.p;
    const a = 1 - Math.exp(-dt / 3600);
    const ema = (k, v) => { this.util[k] += (v - this.util[k]) * a; };
    if (this.working) {
      ema('dose', this.dose.filter((D, s) => s < p.doseStations && D.state === 'dosing').length / p.doseStations);
      ema('mix', this.mixers.filter((M, j) => j < p.mixers && M.ct >= 0 && M.state !== 'done').length / p.mixers);
      ema('ext', this.lines.filter((L) => L.i < p.lines).reduce((s, L) => s + L.ext / (p.extKgH * (L.order ? RECIPES[L.order.recipe].rate : 1)), 0) / p.lines);
      ema('acm', this.lines.filter((L) => L.i < p.lines).reduce((s, L) => s + L.acm / p.acmKgH, 0) / p.lines);
      ema('fine', this.lines.filter((L) => L.i < p.lines).reduce((s, L) => s + L.fine / p.fineKgH, 0) / p.lines);
      ema('pack', this.packer.state === 'fill' ? 1 : this.packer.state === 'switch' ? 0.5 : 0);
      ema('lab', this.lab.running.length / p.qcSlots);
      ema('log', this.forks.filter((F) => F.i < p.forklifts && F.state !== 'idle').length / p.forklifts);
    }
    const c = this.clock();
    const hk = c.day * 24 + c.h;
    if (hk !== this.k.lastHour) {
      this.k.hourBuckets.shift(); this.k.hourBuckets.push(0);
      this.k.hourOut.shift(); this.k.hourOut.push(0);
      this.k.lastHour = hk;
    }
    this.k.packedPrev = this.k.packedPrev ?? this.k.packedKg;
    this.k.hourBuckets[23] += this.k.packedKg - this.k.packedPrev;
    this.k.packedPrev = this.k.packedKg;
    this.k.hourOut[23] += this.lines.reduce((s, L) => s + (L.ext * dt) / 3600, 0);
    this.histT += dt;
    if (this.histT >= 60) {
      this.histT = 0;
      const rec = (key, v) => {
        let h = this.hist[key];
        if (!h) h = this.hist[key] = { v: new Float32Array(HIST), n: 0 };
        h.v.copyWithin(0, 1);
        h.v[HIST - 1] = v;
        h.n = Math.min(HIST, h.n + 1);
      };
      rec('plant:ext', this.lines.reduce((s, L) => s + L.ext, 0));
      rec('plant:pack', this.packer.state === 'fill' ? (p.cartonKg * 3600) / p.cartonSec : 0);
      this.lines.forEach((L, i) => {
        rec(`ext:${i}`, L.ext); rec(`temp:${i}`, L.temp); rec(`acm:${i}`, L.acm); rec(`fine:${i}`, L.fine); rec(`dp:${i}`, L.dp); rec(`surge:${i}`, L.surge.kg); rec(`belt:${i}`, L.beltKg);
      });
      this.mixers.forEach((M, j) => rec(`mixT:${j}`, M.temp));
      rec('lab:q', this.lab.queue.length + this.lab.running.length);
      this.forks.forEach((F) => rec(`fork:${F.i}`, F.state === 'idle' ? 0 : 1));
    }
  }

  // --- derived summaries
  oee() {
    const k = this.k;
    const A = k.planned > 0 ? k.run / k.planned : 0;
    const P = k.run > 0 && k.ideal ? Math.min(1, k.producedKg / k.ideal) : 0;
    const Q = k.producedKg > 0 ? Math.max(0, (k.producedKg - k.scrapKg) / k.producedKg) : 1;
    return { A, P, Q, oee: A * P * Q };
  }

  wip() {
    const ct = this.containers.reduce((s, c) => s + (c.state !== 'empty' ? c.kg || (c.batch ? c.batch.kg : 0) : 0), 0);
    return ct + this.lines.reduce((s, L) => s + L.hopper + L.beltKg + L.chip.kg + L.fineBin.kg + L.surge.kg, 0);
  }

  palletsAt(loc) {
    return this.pallets.filter((pl) => pl.loc === loc);
  }
}

function ease(u) {
  return u * u * (3 - 2 * u);
}

function gauss(rng) {
  const u = Math.max(1e-9, rng()), v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
