// Analytic capacity of the plant from the same assumptions the simulation uses.

import { RECIPES } from './model.js';

export function capacity(p, share = { 'FBE-1': 0.4, 'FBE-2B': 0.2, 'FBE-2T': 0.2, 'EP-3L': 0.2 }) {
  const rate = Object.entries(share).reduce((s, [k, v]) => s + v * RECIPES[k].rate, 0) / Object.values(share).reduce((a, b) => a + b, 0);
  const tripsMin = 4 * (p.handleSec * 2 + 60) / 60;
  const stages = [
    { key: 'dose', name: 'Дозировка', note: `${p.doseStations} поста × ${p.batchKg} кг за ${p.doseMin} мин`, kgh: (p.doseStations * p.batchKg * 60) / p.doseMin },
    { key: 'mix', name: 'Смешение CMR-1000', note: `${p.mixers} × ${p.batchKg} кг, цикл ${p.mixMin + 2 * p.dockMin + 2 * p.turnMin} мин`, kgh: (p.mixers * p.batchKg * 60) / (p.mixMin + 2 * p.dockMin + 2 * p.turnMin) },
    { key: 'log', name: 'Логистика контейнеров', note: `${p.forklifts} погрузчика, ≈${tripsMin.toFixed(0)} мин на партию`, kgh: (p.forklifts * p.batchKg * 60) / tripsMin },
    { key: 'ext', name: 'Экструзия TSE-70C', note: `${p.lines} × ${p.extKgH} кг/ч × ${rate.toFixed(2)} (микс рецептур)`, kgh: p.lines * p.extKgH * rate },
    { key: 'acm', name: 'ACM-50 + APW-30A', note: `${p.lines} × ${p.acmKgH} кг/ч`, kgh: p.lines * p.acmKgH },
    { key: 'fine', name: 'Тонкий помол', note: `${p.lines} × ${p.fineKgH} кг/ч`, kgh: p.lines * p.fineKgH },
    { key: 'pack', name: 'Фасовка', note: `${p.cartonKg} кг за ${p.cartonSec} с, −20 % на переключения`, kgh: ((p.cartonKg * 3600) / p.cartonSec) * 0.8 },
    { key: 'qc', name: 'ОТК, выпуск лотов', note: `${p.qcSlots} комплекта × ${p.lotKg / 1000} т за ${p.qcHours} ч`, kgh: (p.qcSlots * p.lotKg) / p.qcHours },
  ];
  const min = stages.reduce((a, s) => (s.kgh < a.kgh ? s : a), stages[0]);
  const hoursDay = p.shifts >= 3 ? 24 : p.shifts * p.shiftHours;
  const hoursMonth = (hoursDay * p.daysPerWeek * 52) / 12;
  const changeoverLossKg = p.changeoversPerMonth * (p.changeoverMin / 60) * p.extKgH * rate;
  const warmupLossKg = ((p.daysPerWeek * 52) / 12) * p.lines * (p.warmupMin / 60) * p.extKgH * rate * (p.shifts >= 3 ? 0.15 : 1);
  const gross = min.kgh * hoursMonth * p.availability;
  const net = Math.max(0, gross - (min.key === 'ext' ? changeoverLossKg + warmupLossKg : 0));
  const scenarios = [];
  for (const sh of [1, 2, 3]) for (const d of [5, 7]) {
    const h = ((sh >= 3 ? 24 : sh * p.shiftHours) * d * 52) / 12;
    const g = min.kgh * h * p.availability;
    const loss = min.key === 'ext' ? changeoverLossKg + ((d * 52) / 12) * p.lines * (p.warmupMin / 60) * p.extKgH * rate * (sh >= 3 ? 0.15 : 1) : 0;
    scenarios.push({ shifts: sh, days: d, t: Math.max(0, g - loss) / 1000 });
  }
  return { stages, bottleneck: min, hoursMonth, grossT: gross / 1000, netT: net / 1000, changeoverT: changeoverLossKg / 1000, warmupT: warmupLossKg / 1000, scenarios, rate };
}
