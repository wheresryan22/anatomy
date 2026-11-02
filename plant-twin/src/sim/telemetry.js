// Status and simulated readings for each piece of equipment, derived from the model.
// Values are model outputs, not live sensor data.

import { RECIPES, RAW_NAMES } from './model.js';

export const STATUS_TEXT = {
  run: 'В работе', idle: 'Ожидание', wait: 'Ожидание', starved: 'Нет материала', blocked: 'Блокировка выхода',
  stop: 'Остановлен', off: 'Вне смены', warmup: 'Прогрев', changeover: 'Переналадка',
};

const ZONE_SP = [25, 45, 85, 100, 105, 105, 105, 105, 100];

function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0) / 4294967296;
}
// smooth, deterministic jitter in [-1, 1]
function jit(t, tag, f = 1) {
  const k = hash(tag) * 100;
  return Math.sin(t / (97 * f) + k) * 0.6 + Math.sin(t / (31 * f) + k * 1.7) * 0.4;
}

const n0 = (v) => Math.round(v).toLocaleString('ru-RU');
const n1 = (v) => v.toLocaleString('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const n3 = (v) => v.toLocaleString('ru-RU', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
const hm = (sec) => { const m = Math.max(0, Math.round(sec / 60)); return `${Math.floor(m / 60)} ч ${String(m % 60).padStart(2, '0')} мин`; };

export function statusOf(m, def) {
  const s = def.sim;
  if (!s) return 'idle';
  const i = s.i;
  const W = m.working;
  switch (s.k) {
    case 'ext': return m.lines[i].state;
    case 'feed': {
      const L = m.lines[i];
      if (!m.en.feed[i]) return 'stop';
      if (!W || i >= m.p.lines) return 'off';
      return m.slot.line[i] >= 0 && m.containers[m.slot.line[i]].state === 'feeding' ? 'run' : L.order ? 'starved' : 'idle';
    }
    case 'cool': return m.lines[i].coolState;
    case 'acm': return m.lines[i].acmState;
    case 'fine': return m.lines[i].fineState;
    case 'dose': {
      const D = m.dose[i];
      if (!m.en.dose[i]) return 'stop';
      if (D.state === 'dosing') return 'run';
      if (D.state === 'await') return 'wait';
      if (D.state === 'done') return 'blocked';
      return W ? 'idle' : 'off';
    }
    case 'mix': {
      const M = m.mixers[i];
      if (!m.en.mix[i]) return 'stop';
      if (M.ct >= 0 && M.state !== 'done') return 'run';
      if (M.state === 'done') return 'blocked';
      return W ? 'idle' : 'off';
    }
    case 'surge': {
      const P = m.packer;
      return P.h === i && P.state === 'fill' ? 'run' : m.lines[i].surge.kg > 0 ? 'idle' : W ? 'idle' : 'off';
    }
    case 'pack': {
      const st = m.packer.state;
      return st === 'fill' ? 'run' : st === 'switch' ? 'changeover' : st;
    }
    case 'pal': return !m.en.pal ? 'stop' : m.packer.state === 'fill' ? 'run' : W ? 'idle' : 'off';
    case 'wrap': return m.wrap.loaded ? 'run' : W ? 'idle' : 'off';
    case 'fork': {
      const F = m.forks[i];
      if (!m.en.fork[i]) return 'stop';
      return F.state === 'idle' ? (W ? 'idle' : 'off') : 'run';
    }
    case 'ct': {
      const c = m.containers[i];
      return c.state === 'empty' ? 'off' : ['dosing', 'mixing', 'feeding'].includes(c.state) || c.loc.kind === 'fork' ? 'run' : 'wait';
    }
    case 'lab': return !m.en.lab ? 'stop' : m.lab.running.length ? 'run' : W ? 'idle' : 'off';
    case 'qh': case 'fg': return 'run';
    case 'fl101': return W ? 'run' : 'off';
    case 'fl701': return m.t - m.fl701 < 900 ? 'run' : W ? 'idle' : 'off';
    default: return W ? 'run' : 'idle';
  }
}

// Readings shown in the inspector: rows of [label, value, unit] and the sparkline key.
export function readings(m, def) {
  const s = def.sim || {};
  const i = s.i ?? 0;
  const t = m.t;
  const tag = def.tag;
  const rows = [];
  let spark = null;
  const row = (l, v, u = '') => rows.push([l, v, u]);
  const L = m.lines[i];
  switch (s.k) {
    case 'ext': {
      const R = m.p.extKgH * (L.order ? RECIPES[L.order.recipe].rate : 1);
      const f = R ? L.ext / R : 0;
      const heat = Math.max(0, Math.min(1, (L.temp - 24) / 84));
      row('Заказ', L.order ? `${L.order.id} · ${L.order.recipe}` : '—');
      row('Производительность', n0(L.ext), 'кг/ч');
      row('Обороты шнеков', n0(f * 480 + (f ? jit(t, tag) * 4 : 0)), 'об/мин');
      row('Крутящий момент', n0(f ? 62 + f * 18 + jit(t, tag, 2) * 3 : 0), '%');
      row('Температура расплава', n1(L.temp + (f ? 6 + jit(t, tag + 'm') * 0.8 : 0)), '°C');
      row('Давление в головке', n1(f * 17 + (f ? jit(t, tag + 'p') : 0)), 'бар');
      row('Зоны 1–9', ZONE_SP.map((sp) => Math.round(22 + (sp - 22) * heat)).join(' · '), '°C');
      row('Питатель', n1(L.hopper), 'кг');
      if (L.changeLeft > 0) row('До конца переналадки', hm(L.changeLeft));
      spark = { key: `ext:${i}`, label: 'Производительность, кг/ч' };
      break;
    }
    case 'feed': {
      const ci = m.slot.line[i];
      const ct = ci >= 0 ? m.containers[ci] : null;
      row('Контейнер на стыковке', ct ? `${ct.tag} · ${ct.batch ? ct.batch.id : 'пустой'}` : '—');
      row('Остаток в контейнере', ct ? n0(ct.kg) : '0', 'кг');
      row('Бункер питателя', n1(L.hopper), 'кг');
      row('Расход питателя', n0(L.ext), 'кг/ч');
      spark = { key: `ext:${i}`, label: 'Подача на экструдер, кг/ч' };
      break;
    }
    case 'cool': {
      const run = L.coolState === 'run';
      row('На ленте', n1(L.beltKg), 'кг');
      row('Скорость ленты', n1(run ? 6.5 + jit(t, tag) * 0.2 : 0), 'м/мин');
      row('Температура полотна на выходе', n1(run ? 29 + jit(t, tag, 3) * 1.2 : 22), '°C');
      row('Вода подача / возврат', run ? `${n1(12 + jit(t, 'ch') * 0.2)} / ${n1(16.2 + jit(t, tag) * 0.4)}` : '12,0 / 12,4', '°C');
      spark = { key: `belt:${i}`, label: 'Масса на ленте, кг' };
      break;
    }
    case 'acm': {
      const run = L.acmState === 'run';
      row('Подача', n0(L.acm), 'кг/ч');
      row('Бункер чипсов', n0(L.chip.kg), 'кг');
      row('Ротор', n0(run ? 6800 + jit(t, tag) * 40 : 0), 'об/мин');
      row('Классификатор', n0(run ? 2400 + jit(t, tag + 'c') * 25 : 0), 'об/мин');
      row('Нагрузка привода', n0(run ? (L.acm / m.p.acmKgH) * 70 + 18 + jit(t, tag, 2) * 3 : 0), '%');
      spark = { key: `acm:${i}`, label: 'Подача на мельницу, кг/ч' };
      break;
    }
    case 'fine': {
      const run = L.fineState === 'run';
      if (def.type === 'bagFilter') {
        row('ΔP рукавов', n1(L.dp), 'мбар');
        row('Импульсная продувка', run ? 'по ΔP, 6 клапанов' : '—');
        row('Давление воздуха', n1(6.4 + jit(t, 'air') * 0.1), 'бар');
        spark = { key: `dp:${i}`, label: 'ΔP рукавов, мбар' };
      } else if (def.type === 'fan') {
        row('Расход воздуха', n0(run ? 3200 + jit(t, tag) * 60 : 0), 'м³/ч');
        row('Ток двигателя', n1(run ? 58 + jit(t, tag, 2) * 1.5 : 0), 'А');
        row('Разрежение', n0(run ? 42 + L.dp * 0.6 : 0), 'мбар');
        spark = { key: `dp:${i}`, label: 'ΔP фильтра, мбар' };
      } else if (def.type === 'sieve') {
        row('Проход', n0(L.fine), 'кг/ч');
        row('Сход на сетке 125 мкм', n1(run ? 0.4 + jit(t, tag) * 0.12 : 0), '%');
        spark = { key: `fine:${i}`, label: 'Проход, кг/ч' };
      } else if (def.type === 'cyclone') {
        row('Поток продукта', n0(L.fine), 'кг/ч');
        row('ΔP циклона', n1(run ? 11.5 + jit(t, tag) * 0.4 : 0), 'мбар');
        row('Шлюзовой затвор', n0(run ? 18 : 0), 'об/мин');
        spark = { key: `fine:${i}`, label: 'Поток, кг/ч' };
      } else {
        row('Производительность', n0(L.fine), 'кг/ч');
        row('Бункер питания', n0(L.fineBin.kg), 'кг');
        row('Ротор', n0(run ? 5200 + jit(t, tag) * 30 : 0), 'об/мин');
        row('Классификатор', n0(run ? 3600 + jit(t, tag + 'c') * 30 : 0), 'об/мин');
        row('d50 (модель)', n1(run ? 38.5 + jit(t, tag, 4) * 1.4 : 0), 'мкм');
        spark = { key: `fine:${i}`, label: 'Производительность, кг/ч' };
      }
      break;
    }
    case 'dose': {
      const D = m.dose[i];
      if (def.type === 'bigBag') {
        row('Шнек', D.state === 'dosing' ? 'подача наполнителя' : 'стоп');
        row('Остаток МКР (модель)', n0(400 + jit(t, tag, 9) * 300), 'кг');
      } else if (def.type === 'additiveBooth') {
        row('Режим', D.state === 'dosing' ? 'навески добавок к партии' : 'ожидание');
      } else {
        row('Партия', D.batch ? `${D.batch.id} · ${D.batch.recipe}` : '—');
        const prog = D.state === 'dosing' ? 1 - D.t / (m.p.doseMin * 60) : D.state === 'done' ? 1 : 0;
        row('Набрано', D.batch ? `${n1(prog * D.batch.kg)} из ${n0(D.batch.kg)}` : '—', 'кг');
        row('Компоненты', D.batch ? `${Math.min(6, Math.floor(prog * 6))} из 6` : '—');
        if (D.state === 'idle' && D.reason) row('Причина ожидания', D.reason);
      }
      break;
    }
    case 'mix': {
      const M = m.mixers[i];
      const ph = { idle: 'ожидание', dock: 'стыковка', turn: 'поворот 0→180°', mix: 'смешение', turnback: 'поворот 180→0°', undock: 'расстыковка', done: 'готов, ждёт вывоза' };
      const ct = M.ct >= 0 ? m.containers[M.ct] : null;
      row('Фаза', ph[M.state] || M.state);
      row('Контейнер', ct ? `${ct.tag} · ${ct.batch ? ct.batch.id : ''}` : '—');
      row('Угол поворота', n0((M.angle * 180) / Math.PI), '°');
      row('Инструмент', n0(M.state === 'mix' ? 1150 + jit(t, def.tag) * 10 : 0), 'об/мин');
      row('Температура премикса', n1(M.temp), '°C');
      spark = { key: `mixT:${i}`, label: 'Температура премикса, °C' };
      break;
    }
    case 'surge': {
      const S = L.surge;
      row('Уровень', `${n0(S.kg)} кг · ${n0((S.kg / m.p.surgeCapKg) * 100)} %`);
      row('Продукт', S.head() ? `${S.head().id} · ${S.head().recipe}` : '—');
      row('Поступление', n0(L.fine), 'кг/ч');
      spark = { key: `surge:${i}`, label: 'Запас в бункере, кг' };
      break;
    }
    case 'pack': {
      const P = m.packer;
      if (def.type === 'packConveyor') {
        row('Коробов за всё время', n0(P.cartons));
        row('Металлодетектор', 'норма');
        row('Чеквейер, последний короб', P.lastWeight ? n3(P.lastWeight) : '—', 'кг');
      } else {
        row('Бункер в работе', P.h >= 0 ? `П${P.h + 1}` : '—');
        row('Последний короб, нетто', P.lastWeight ? n3(P.lastWeight) : '—', 'кг');
        row('Такт', n0(m.p.cartonSec), 'с');
        row('Производительность', n0(P.state === 'fill' ? (m.p.cartonKg * 3600) / m.p.cartonSec : 0), 'кг/ч');
        if (P.state === 'switch') row('Переключение продукта', hm(P.switchLeft));
      }
      spark = { key: 'plant:pack', label: 'Фасовка, кг/ч' };
      break;
    }
    case 'pal': {
      const P = m.packer;
      row('Поддон A / B', `${P.counts[0]} / ${P.counts[1]} коробов`);
      row('Схема', `8 × ${m.p.cartonsPerPallet / 8}`);
      row('Текущий лот', P.pallet ? P.pallet.lot.id : '—');
      break;
    }
    case 'wrap': row('Очередь на обмотку', String(m.wrap.queue.length), 'под.'); row('Обмотка', m.wrap.loaded ? 'идёт' : '—'); break;
    case 'qh': {
      const pl = m.palletsAt('qh');
      const lots = new Set(pl.map((x) => x.lot.id));
      row('Поддонов', String(pl.length));
      row('Продукции', n1(pl.reduce((a, x) => a + x.kg, 0) / 1000), 'т');
      row('Лотов ждут решения ОТК', String(lots.size));
      break;
    }
    case 'fg': {
      const pl = m.palletsAt('fg');
      row('Поддонов', String(pl.length));
      row('Готово к отгрузке', n1(pl.reduce((a, x) => a + x.kg, 0) / 1000), 'т');
      row('Отгружено всего', n1(m.k.shippedKg / 1000), 'т');
      row('Ближайшая отгрузка', m.p.dispatch.map((h) => `${h}:00`).join(', '));
      break;
    }
    case 'lab': {
      const lab = m.lab;
      if (def.type === 'labBlock') {
        row('Испытания идут', lab.running.map((r) => `${r.lot.id} (${hm(r.left)})`).join(', ') || '—');
        row('Очередь', String(lab.queue.length), 'лотов');
        row('Выпущено / повтор', `${lab.done} / ${lab.failed}`);
        spark = { key: 'lab:q', label: 'Лоты в ОТК' };
      } else {
        const r = lab.running[hash(def.tag) > 0.5 ? 1 : 0] || lab.running[0];
        row('Образец', r ? `лот ${r.lot.id}` : '—');
        row('Метод', def.spec?.[0]?.[1] || '—');
      }
      break;
    }
    case 'fork': {
      const F = m.forks[i];
      const task = F.task;
      const where = (loc) => ({ park: 'склад тары', dose: 'дозировка', mixer: 'смеситель', buffer: 'буфер премикса', line: 'линия' }[loc.kind] + (loc.kind === 'line' || loc.kind === 'mixer' || loc.kind === 'dose' ? ` ${loc.i + 1}` : ''));
      row('Задание', task ? `${m.containers[task.ct].tag} → ${where(task.to)}` : 'свободен');
      row('Высота вил', n1(F.lift), 'м');
      row('АКБ', n0(Math.max(20, (F.battery - F.odo / 40000) * 100)), '%');
      row('Пробег за смену', n1(F.odo / 1000), 'км');
      row('Очередь заданий', String(m.tasks.length));
      spark = { key: `fork:${i}`, label: 'Занятость' };
      break;
    }
    case 'ct': {
      const c = m.containers[i];
      const st = { empty: 'пустой', dosing: 'дозирование', dosed: 'набран', mixing: 'смешение', mixed: 'премикс готов', feeding: 'на экструдере', return: 'пустой, на возврат' };
      row('Состояние', st[c.state] || c.state);
      row('Партия', c.batch ? `${c.batch.id} · ${c.batch.recipe} · линия ${c.batch.line + 1}` : '—');
      row('Масса', n0(c.kg || (c.batch ? c.batch.kg : 0)), 'кг');
      break;
    }
    case 'fl101': row('Режим', m.working ? 'подача сырья' : 'стоянка'); for (const k in m.raw) row(RAW_NAMES[k], n1(m.raw[k] / 1000), 'т'); break;
    case 'fl701': row('Режим', m.t - m.fl701 < 900 ? 'перемещение поддонов' : 'ожидание'); break;
    case 'air': row('Давление в сети', n1(7.1 + jit(t, 'air') * 0.12), 'бар'); row('Точка росы', n1(3.1 + jit(t, 'dew') * 0.3), '°C'); row('Загрузка', n0(m.working ? 64 + jit(t, tag) * 8 : 12), '%'); break;
    case 'chill': row('Вода подача / возврат', `${n1(12 + jit(t, tag) * 0.2)} / ${n1(m.working ? 16.4 : 12.6)}`, '°C'); row('Загрузка', n0(m.working ? 58 + jit(t, tag, 3) * 6 : 8), '%'); break;
    case 'dc': row('ΔP', n1(11 + jit(t, tag) * 0.8), 'мбар'); row('Расход', n0(m.working ? 22000 + jit(t, tag, 2) * 400 : 0), 'м³/ч'); break;
    case 'mcc': row('Приводов в работе', String(m.working ? 40 + Math.round(jit(t, tag) * 3) : 4)); row('Нагрузка', n0(m.working ? 610 + jit(t, tag) * 20 : 25), 'кВт'); break;
    default: break;
  }
  return { rows, spark, status: statusOf(m, def) };
}
