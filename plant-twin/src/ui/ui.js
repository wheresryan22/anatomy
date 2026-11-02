// Application chrome: KPIs, equipment register, inspector, toolbar, capacity planning.

import * as THREE from 'three';
import { ZONES, SOURCE_LABEL } from '../plant/layout.js';
import { RECIPES } from '../sim/model.js';
import { readings, STATUS_TEXT } from '../sim/telemetry.js';
import { capacity } from '../sim/capacity.js';
import { STATUS_COLORS } from '../core/look.js';
import { WalkMode, SPOTS } from '../view/walk.js';
import { HALL, ZONES as ZN, EQUIPMENT } from '../plant/layout.js';

const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const DOW = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const t1 = (kg) => (kg / 1000).toLocaleString('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const i0 = (v) => Math.round(v).toLocaleString('ru-RU');
const pct = (v) => `${Math.round(v * 100)} %`;
const hhmm = (t) => { const s = t % 86400; return `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}`; };

const UTIL_LABELS = [['dose', 'Дозировка'], ['mix', 'Смешение'], ['log', 'Логистика'], ['ext', 'Экструзия'], ['acm', 'ACM + APW'], ['fine', 'Тонкий помол'], ['pack', 'Фасовка'], ['lab', 'ОТК']];
const CONTROL = { ext: 'ext', feed: 'feed', cool: 'cool', acm: 'acm', fine: 'fine', dose: 'dose', mix: 'mix', pack: 'pack', pal: 'pal', lab: 'lab', fork: 'fork' };
const HEAT = [new THREE.Color('#a9bfdc'), new THREE.Color('#f0c75e'), new THREE.Color('#d9572b')];

function heat(u) {
  u = Math.max(0, Math.min(1, u));
  const c = new THREE.Color();
  return u < 0.5 ? c.lerpColors(HEAT[0], HEAT[1], u * 2) : c.lerpColors(HEAT[1], HEAT[2], (u - 0.5) * 2);
}

const ICON_PLAY = '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M4 2.5v11l9-5.5z"/></svg>';
const ICON_PAUSE = '<svg viewBox="0 0 16 16" fill="currentColor"><rect x="3.5" y="2.5" width="3" height="11"/><rect x="9.5" y="2.5" width="3" height="11"/></svg>';

export class UI {
  constructor({ model, viewer, plant }) {
    this.m = model;
    this.v = viewer;
    this.plant = plant;
    this.playing = true;
    this.speed = 60;
    this.tab = 'plant';
    this.util = new Map();
    this.buildKpis();
    this.buildTree();
    this.buildToolbar();
    this.bindSim();
    this.bindTabs();
    this.bindHover();
    this.bindWalk();
    viewer.on('select', (e) => this.onSelect(e));
    this.renderInspector();
    this._acc = 0;
    this._acc2 = 0;
  }

  // ---------- header
  buildKpis() {
    const items = [
      ['ext', 'Экструзия, сейчас'], ['day', 'Упаковано за 24 ч'], ['oee', 'OEE экструзии'], ['wip', 'Незавершённое'],
      ['qc', 'Лоты в ОТК'], ['ship', 'Отгружено'], ['neck', 'Узкое место'],
    ];
    $('#kpis').innerHTML = items.map(([k, l]) => `<div class="kpi"><small>${l}</small><strong id="k-${k}">—</strong></div>`).join('');
  }

  updateKpis() {
    const m = this.m;
    const ext = m.lines.reduce((s, L) => s + L.ext, 0);
    const day = m.k.hourBuckets.reduce((a, b) => a + b, 0);
    const o = m.oee();
    const top = UTIL_LABELS.reduce((a, b) => (m.util[b[0]] > m.util[a[0]] ? b : a));
    $('#k-ext').innerHTML = `${i0(ext)}<em>кг/ч</em>`;
    $('#k-day').innerHTML = `${t1(day)}<em>т</em>`;
    $('#k-oee').innerHTML = `${Math.round(o.oee * 100)}<em>%</em>`;
    $('#k-wip').innerHTML = `${t1(m.wip())}<em>т</em>`;
    $('#k-qc').innerHTML = `${m.lab.running.length}<em>в работе</em> ${m.lab.queue.length}<em>в очереди</em>`;
    $('#k-ship').innerHTML = `${t1(m.k.shippedKg)}<em>т</em>`;
    $('#k-neck').innerHTML = `${top[1]}<em>${pct(m.util[top[0]])}</em>`;
    const c = m.clock();
    $('#clock').textContent = `${DOW[c.dow]} ${hhmm(m.t)}`;
    $('#shift').textContent = m.working ? `Смена ${m.shiftNo()} · день ${c.day + 1}` : `Вне смены · день ${c.day + 1}`;
  }

  bindSim() {
    const play = $('#play');
    const sync = () => { play.innerHTML = this.playing ? ICON_PAUSE : ICON_PLAY; play.setAttribute('aria-label', this.playing ? 'Пауза' : 'Пуск'); };
    play.addEventListener('click', () => { this.playing = !this.playing; sync(); });
    sync();
    const sp = $('#speed');
    sp.value = String(this.speed);
    sp.addEventListener('change', () => (this.speed = +sp.value));
    window.addEventListener('keydown', (e) => {
      if (e.target.closest('input, select, textarea')) return;
      if (this.walk.active) return;
      if (e.code === 'Space') { e.preventDefault(); this.playing = !this.playing; sync(); }
      if (e.key === 'Escape') this.v.select(null);
      if (e.key === 'f' || e.key === 'F') { if (this.v.selected) this.v.focus(this.v.selected); }
    });
  }

  bindTabs() {
    const tabs = [['#tab-plant', 'plant'], ['#tab-cap', 'cap']];
    for (const [sel, name] of tabs) {
      $(sel).addEventListener('click', () => {
        this.tab = name;
        for (const [s2, n2] of tabs) $(s2).setAttribute('aria-selected', String(n2 === name));
        $('#cap').hidden = name !== 'cap';
        if (name === 'cap') this.renderCapacity();
      });
    }
    $('#mTree').addEventListener('click', () => $('#body').classList.toggle('tree-open'));
    $('#mInsp').addEventListener('click', () => $('#body').classList.toggle('insp-open'));
  }

  // ---------- equipment register
  buildTree() {
    const byZone = new Map();
    for (const e of this.plant.list) {
      if (!byZone.has(e.def.zone)) byZone.set(e.def.zone, []);
      byZone.get(e.def.zone).push(e);
    }
    const html = ZONES.filter((z) => byZone.has(z.code)).map((z) => {
      const list = byZone.get(z.code);
      return `<details class="zone" ${['400', '300', '600'].includes(z.code) ? 'open' : ''} data-zone="${z.code}"><summary><span class="code">${z.code}</span><span>${esc(z.name)}</span><span class="cnt">${list.length}</span></summary>
        ${list.map((e) => `<button type="button" class="eqrow" data-tag="${e.tag}" data-q="${esc((e.tag + ' ' + e.def.name + ' ' + e.def.model).toLowerCase())}"><i class="dot"></i><b>${e.tag}</b><span>${esc(e.def.name)}</span></button>`).join('')}
      </details>`;
    }).join('');
    const root = $('#treeList');
    root.innerHTML = html;
    root.addEventListener('click', (ev) => {
      const b = ev.target.closest('.eqrow');
      if (!b) return;
      this.v.select(this.plant.byTag.get(b.dataset.tag), true);
      $('#body').classList.remove('tree-open');
    });
    this.rows = [...root.querySelectorAll('.eqrow')].map((el) => ({ el, e: this.plant.byTag.get(el.dataset.tag), dot: el.firstChild }));
    $('#search').addEventListener('input', (ev) => {
      const q = ev.target.value.trim().toLowerCase();
      for (const { el } of this.rows) el.hidden = q && !el.dataset.q.includes(q);
      for (const d of root.querySelectorAll('details')) {
        const any = [...d.querySelectorAll('.eqrow')].some((r) => !r.hidden);
        d.hidden = !any;
        if (q && any) d.open = true;
      }
    });
  }

  updateTree() {
    for (const r of this.rows) {
      const s = r.e.status;
      if (r.dot.dataset.s !== s) { r.dot.dataset.s = s; r.dot.style.background = STATUS_COLORS[s] || STATUS_COLORS.off; }
      r.el.setAttribute('aria-current', String(r.e === this.v.selected));
    }
  }

  // ---------- toolbar and legend
  buildToolbar() {
    const tb = $('#toolbar');
    const zones = ZONES.map((z) => `<option value="${z.code}">${z.code} · ${esc(z.name)}</option>`).join('');
    tb.innerHTML = `
      <div class="group tree-toggle"><button type="button" id="treeBtn">Оборудование</button></div>
      <div class="group desk-only" role="group" aria-label="Панели"><span>Панели</span>
        <button type="button" class="panelbtn" data-panel="left" aria-pressed="true">Реестр</button><button type="button" class="panelbtn" data-panel="right" aria-pressed="true">Инспектор</button>
      </div>
      <div class="group" role="group" aria-label="Вид"><span>Вид</span>
        <button type="button" data-view="overview">Обзор</button><button type="button" data-view="plan">План</button><button type="button" data-view="iso">Изометрия</button><button type="button" id="walkBtn" class="walk-btn">Прогулка</button>
        <select id="zoneSel" aria-label="Перейти к участку" style="border:0;background:none;font:500 12px var(--f-sans);color:var(--ink-2);padding:0 4px;max-width:170px"><option value="">Участок…</option>${zones}</select>
      </div>
      <div class="group" role="group" aria-label="Режим отображения"><span>Режим</span>
        <button type="button" data-mode="model" aria-pressed="true">Модель</button><button type="button" data-mode="xray" aria-pressed="false">Рентген</button>
        <button type="button" data-mode="status" aria-pressed="false">Статус</button><button type="button" data-mode="load" aria-pressed="false">Загрузка</button>
      </div>
      <div class="group" role="group" aria-label="Картинка"><span>Картинка</span>
        <button type="button" data-style="light" aria-pressed="true">Схема</button><button type="button" data-style="real" aria-pressed="false">Реалистично</button>
        <select id="qualitySel" aria-label="Качество изображения" style="border:0;background:none;font:500 12px var(--f-sans);color:var(--ink-2);padding:0 4px">
          <option value="standard">Качество: стандарт</option><option value="high">Качество: высокое</option><option value="max">Качество: максимум</option>
        </select>
      </div>
      <div class="group layers" role="group" aria-label="Слои"><span>Слои</span>
        <button type="button" data-layer="walls" aria-pressed="true">Стены</button><button type="button" data-layer="roof" aria-pressed="false">Кровля</button>
        <button type="button" data-layer="services" aria-pressed="true">Сети</button><button type="button" data-layer="people" aria-pressed="true">Люди</button>
        <button type="button" data-layer="labels" aria-pressed="true">Подписи</button><button type="button" data-layer="axes" aria-pressed="true">Разметка</button>
      </div>`;
    tb.addEventListener('click', (ev) => {
      const b = ev.target.closest('button');
      if (!b) return;
      if (b.id === 'treeBtn') { $('#body').classList.toggle('tree-open'); return; }
      if (b.id === 'walkBtn') { this.startWalk(0); return; }
      if (b.dataset.view) this.v.view(b.dataset.view);
      if (b.dataset.mode) {
        for (const x of tb.querySelectorAll('[data-mode]')) x.setAttribute('aria-pressed', String(x === b));
        this.v.setMode(b.dataset.mode);
        if (b.dataset.mode === 'load') this.v.applyMode(this.loadTints());
        this.renderLegend();
      }
      if (b.dataset.style) this.setStyle(b.dataset.style);
      if (b.dataset.panel) this.togglePanel(b.dataset.panel);
      if (b.dataset.layer) {
        const on = b.getAttribute('aria-pressed') !== 'true';
        b.setAttribute('aria-pressed', String(on));
        this.v.setLayer(b.dataset.layer, on);
      }
    });
    const q = $('#qualitySel');
    q.value = this.v.quality;
    q.addEventListener('change', () => { this.v.setQuality(q.value); store('epk.quality', q.value); });
    const savedQ = load('epk.quality');
    if (savedQ && savedQ !== this.v.quality) { q.value = savedQ; this.v.setQuality(savedQ); }
    for (const side of ['left', 'right']) if (load(`epk.hide.${side}`) === '1') this.togglePanel(side);
    const savedS = load('epk.style');
    if (savedS === 'real') this.setStyle('real');
    $('#zoneSel').addEventListener('change', (ev) => {
      const z = ZONES.find((q) => q.code === ev.target.value);
      ev.target.value = '';
      if (!z) return;
      const box = new THREE.Box3(new THREE.Vector3(z.x0, 0, z.z0), new THREE.Vector3(z.x1, 4, z.z1));
      this.v.frameBox(box, 1.05, new THREE.Vector3(-0.45, 0.85, 0.75));
    });
    this.renderLegend();
  }

  // collapse the register (left) or the inspector (right) to give the 3D view more room
  togglePanel(side) {
    const body = $('#body');
    const hidden = body.classList.toggle(`hide-${side}`);
    const b = document.querySelector(`[data-panel="${side}"]`);
    if (b) b.setAttribute('aria-pressed', String(!hidden));
    store(`epk.hide.${side}`, hidden ? '1' : '0');
  }

  setStyle(name) {
    this.v.look.setStyle(name);
    for (const x of document.querySelectorAll('[data-style]')) x.setAttribute('aria-pressed', String(x.dataset.style === name));
    store('epk.style', name);
  }

  renderLegend() {
    const mode = this.v.mode;
    const lg = $('#legend');
    if (mode === 'load') {
      lg.innerHTML = '<span>Загрузка оборудования</span><span>0 %<i class="grad"></i>100 %</span>';
      return;
    }
    if (mode === 'xray') {
      lg.innerHTML = '<span>Рентген: корпуса прозрачны, видны внутренние узлы и трассы</span>';
      return;
    }
    const items = [['run', 'Работа'], ['idle', 'Ожидание'], ['blocked', 'Блокировка'], ['stop', 'Стоп'], ['warmup', 'Прогрев'], ['changeover', 'Переналадка']];
    lg.innerHTML = `<span>${mode === 'status' ? 'Окраска по статусу' : 'Сигнальные колонны'}</span>` + items.map(([k, l]) => `<span><i style="background:${STATUS_COLORS[k]}"></i>${l}</span>`).join('');
  }

  bindHover() {
    const tip = $('#tip');
    const stage = $('#stage');
    let pos = [0, 0];
    stage.addEventListener('pointermove', (e) => {
      const r = stage.getBoundingClientRect();
      pos = [e.clientX - r.left, e.clientY - r.top];
      tip.style.left = `${pos[0]}px`;
      tip.style.top = `${pos[1]}px`;
    });
    this.v.on('hover', (e) => {
      if (!e) { tip.hidden = true; return; }
      tip.innerHTML = `<b>${e.tag}</b>${esc(e.def.name)} · ${esc(STATUS_TEXT[e.status] || '')}`;
      tip.hidden = false;
    });
  }

  // ---------- inspector
  onSelect(e) {
    this.renderInspector();
    if (e && matchMedia('(max-width: 760px)').matches) $('#body').classList.add('insp-open');
  }

  renderInspector() {
    const e = this.v.selected;
    const host = $('#inspBody');
    if (!e) {
      host.innerHTML = `<div class="insp">
        <div><div class="eyebrow">Сводка цеха</div><h2 class="eqtitle" style="font-size:17px">Цех эпоксидных порошковых красок</h2>
        <p class="note">Наружная антикоррозионная изоляция труб: CSA Z245.20, ISO 21809. 4 экструзионные линии, 3 смесителя CMR-1000, автоматическая фасовка, лаборатория ОТК.</p></div>
        <div class="sec"><h3>Загрузка участков, среднее за 1 ч</h3><div class="bars" id="ovBars"></div></div>
        <div class="sec"><h3>Линии</h3><table class="lines" id="ovLines"></table></div>
        <div class="sec"><h3>Очередь заказов (демо-портфель)</h3><table class="lines" id="ovOrders"></table></div>
        <div class="sec"><h3>События</h3><ul class="events" id="ovEvents"></ul></div>
        <p class="note">Все показатели рассчитывает модель процесса на допущениях: производительности, циклы и время испытаний взяты типовыми и меняются во вкладке «Мощность и загрузка». Выберите станок в сцене или в реестре.</p>
      </div>`;
      this.updateInspector();
      return;
    }
    const d = e.def;
    const zone = ZONES.find((z) => z.code === d.zone);
    const ctl = d.sim && CONTROL[d.sim.k];
    host.innerHTML = `<div class="insp">
      <div>
        <div class="eyebrow">${zone ? `${zone.code} · ${esc(zone.name)}` : ''}</div>
        <div class="title-row"><h2 class="eqtitle">${e.tag}<span class="num">${esc(d.model)}</span></h2><span id="stPill"></span></div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center"><span style="font-weight:500">${esc(d.name)}</span><span class="badge ${d.src}">${esc(SOURCE_LABEL[d.src])}</span></div>
        <p class="desc">${esc(d.desc || '')}</p>
      </div>
      <div class="sec"><h3>Показания модели</h3><table class="kv" id="live"></table><div id="sparkBox"></div></div>
      <div class="sec"><h3>Паспорт</h3><table class="kv">${(d.spec || []).map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join('')}</table></div>
      <div class="actions">
        ${ctl ? '<button type="button" class="btn danger" id="aStop">Остановить</button>' : ''}
        <button type="button" class="btn" id="aIso" aria-pressed="${this.v.isolate}">${this.v.isolate ? 'Показать всё' : 'Изолировать'}</button>
        <button type="button" class="btn" id="aFocus">Показать</button>
        <button type="button" class="btn" id="aClose">Закрыть</button>
      </div>
      ${ctl ? '<p class="note">Остановка действует только в двойнике: удобно проверить, как простой станка распространяется по цеху.</p>' : ''}
    </div>`;
    $('#aIso').addEventListener('click', () => { this.v.setIsolate(!this.v.isolate); this.renderInspector(); });
    $('#aFocus').addEventListener('click', () => this.v.focus(e));
    $('#aClose').addEventListener('click', () => { this.v.setIsolate(false); this.v.select(null); });
    if (ctl) $('#aStop').addEventListener('click', () => {
      const m = this.m, i = d.sim.i;
      const arr = Array.isArray(m.en[ctl]);
      const cur = arr ? m.en[ctl][i] : m.en[ctl];
      if (arr) m.en[ctl][i] = !cur; else m.en[ctl] = !cur;
      m.log(cur ? 'alarm' : 'info', e.tag, cur ? 'Остановлен оператором в двойнике' : 'Пущен оператором в двойнике');
      this.updateInspector();
    });
    this.updateInspector();
  }

  updateInspector() {
    const m = this.m;
    const e = this.v.selected;
    if (!e) {
      const top = UTIL_LABELS.reduce((a, b) => (m.util[b[0]] > m.util[a[0]] ? b : a))[0];
      const bars = $('#ovBars');
      if (bars) bars.innerHTML = UTIL_LABELS.map(([k, l]) => `<div class="barrow ${k === top ? 'hot' : ''}"><span>${l}</span><div class="track"><div class="fill" style="width:${Math.round(m.util[k] * 100)}%"></div></div><span class="v">${pct(m.util[k])}</span></div>`).join('');
      const lines = $('#ovLines');
      if (lines) lines.innerHTML = `<tr><th>Линия</th><th>Заказ</th><th>Статус</th><th style="text-align:right">кг/ч</th></tr>` + m.lines.map((L) => `<tr><td>${L.i + 1}</td><td>${L.order ? `${L.order.id} · ${L.order.recipe}` : '—'}</td><td>${pill(L.state)}</td><td class="r">${i0(L.ext)}</td></tr>`).join('');
      const ord = $('#ovOrders');
      if (ord) ord.innerHTML = `<tr><th>Заказ</th><th>Продукт</th><th style="text-align:right">т</th></tr>` + m.orders.filter((o) => o.state === 'queued').slice(0, 5).map((o) => `<tr><td>${o.id}</td><td>${o.recipe} · ${esc(RECIPES[o.recipe].name)}</td><td class="r">${t1(o.kg)}</td></tr>`).join('');
      const ev = $('#ovEvents');
      if (ev) ev.innerHTML = m.events.slice(0, 14).map((x) => `<li class="${x.level}"><time>${hhmm(x.t)}</time><span><b>${esc(x.tag)}</b>${esc(x.text)}</span></li>`).join('');
      return;
    }
    const r = readings(m, e.def);
    const pillEl = $('#stPill');
    if (pillEl) pillEl.innerHTML = pill(r.status);
    const live = $('#live');
    if (live) live.innerHTML = r.rows.map(([k, v, u]) => `<tr><td>${esc(k)}</td><td>${esc(v)}${u ? `<em>${esc(u)}</em>` : ''}</td></tr>`).join('') || '<tr><td>Нет измеряемых параметров</td><td></td></tr>';
    const sb = $('#sparkBox');
    if (sb) sb.innerHTML = r.spark ? spark(m.hist[r.spark.key], r.spark.label) : '';
    const stop = $('#aStop');
    if (stop) {
      const ctl = CONTROL[e.def.sim.k];
      const arr = Array.isArray(m.en[ctl]);
      const on = arr ? m.en[ctl][e.def.sim.i] : m.en[ctl];
      stop.textContent = on ? 'Остановить' : 'Пустить';
      stop.className = on ? 'btn danger' : 'btn primary';
    }
  }

  // utilisation per equipment for the load view
  loadTints() {
    const m = this.m;
    const map = new Map();
    for (const e of this.plant.list) {
      const s = e.def.sim;
      if (!s) continue;
      const L = m.lines[s.i ?? 0];
      let u = null;
      switch (s.k) {
        case 'ext': case 'feed': case 'cool': u = L.ext / m.p.extKgH; break;
        case 'acm': u = L.acm / m.p.acmKgH; break;
        case 'fine': u = L.fine / m.p.fineKgH; break;
        case 'dose': u = m.dose[s.i].state === 'dosing' ? 1 : 0; break;
        case 'mix': u = m.mixers[s.i].ct >= 0 && m.mixers[s.i].state !== 'done' ? 1 : 0; break;
        case 'surge': u = L.surge.kg / m.p.surgeCapKg; break;
        case 'pack': case 'pal': u = m.util.pack; break;
        case 'fork': u = m.forks[s.i].state === 'idle' ? 0 : 1; break;
        case 'lab': u = m.util.lab; break;
        case 'qh': u = m.palletsAt('qh').length / 108; break;
        case 'fg': u = m.palletsAt('fg').length / 108; break;
        default: u = null;
      }
      if (u === null) continue;
      const prev = this.util.get(e) ?? u;
      const v = prev + (u - prev) * 0.25;
      this.util.set(e, v);
      map.set(e, '#' + heat(v).getHexString());
    }
    return map;
  }

  // ---------- capacity planning
  renderCapacity() {
    const m = this.m, p = m.p;
    const host = $('#cap');
    const f = (id, label, val, unit, step = 1, min = 0) => `<div class="field"><label for="${id}">${label} <span class="unit">${unit}</span></label><input id="${id}" type="number" inputmode="decimal" step="${step}" min="${min}" value="${val}"></div>`;
    host.innerHTML = `<div class="wrap">
      <div><div class="eyebrow">Планирование загрузки</div><h1>Сколько цех может выпустить и что его ограничивает</h1>
      <p class="lead">Расчёт по тем же допущениям, что и симуляция. Измените параметры: двойник сразу работает с новыми значениями. Замените допущения паспортными данными оборудования.</p></div>
      <div class="cards" id="capCards"></div>
      <div class="grid2">
        <div class="panel"><h2>Пропускная способность участков, кг/ч</h2><div class="bars capbars" id="capBars"></div></div>
        <div class="panel"><h2>Режим работы и цель</h2><div class="form">
          <div class="field"><label for="cShifts">Смен в сутки</label><select id="cShifts">${[1, 2, 3].map((v) => `<option ${v === p.shifts ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
          <div class="field"><label for="cDays">Рабочих дней в неделю</label><select id="cDays">${[5, 6, 7].map((v) => `<option ${v === p.daysPerWeek ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
          ${f('cAvail', 'Доступность оборудования', Math.round(p.availability * 100), '%', 1, 50)}
          ${f('cCo', 'Переналадок рецептуры в месяц', p.changeoversPerMonth, 'шт')}
          ${f('cTarget', 'Целевой объём заказов', this.target ?? 300, 'т/мес', 10)}
          ${f('cLines', 'Линий в работе', p.lines, 'из 4', 1, 1)}
        </div></div>
      </div>
      <div class="grid2">
        <div class="panel"><h2>Допущения модели</h2><div class="form">
          ${f('aExt', 'TSE-70C, производительность', p.extKgH, 'кг/ч', 10)}
          ${f('aAcm', 'ACM-50, производительность', p.acmKgH, 'кг/ч', 10)}
          ${f('aFine', 'Тонкий помол, производительность', p.fineKgH, 'кг/ч', 10)}
          ${f('aBatch', 'Партия премикса', p.batchKg, 'кг', 10)}
          ${f('aDose', 'Дозирование партии', p.doseMin, 'мин')}
          ${f('aMix', 'Смешение в CMR-1000', p.mixMin, 'мин')}
          ${f('aCarton', 'Такт фасовки короба 25 кг', p.cartonSec, 'с')}
          ${f('aChange', 'Переналадка линии', p.changeoverMin, 'мин', 5)}
          ${f('aLot', 'Размер лота ОТК', p.lotKg, 'кг', 500)}
          ${f('aQc', 'Испытания лота', p.qcHours, 'ч', 0.5)}
        </div></div>
        <div class="panel"><h2>Выпуск в месяц по режимам, т</h2><table class="scen" id="capScen"></table><p class="note" id="capNote" style="margin-top:10px"></p></div>
      </div>
    </div>`;
    const bind = (id, fn) => $(`#${id}`, host).addEventListener('change', (ev) => { fn(+ev.target.value); this.updateCapacity(); });
    bind('cShifts', (v) => (p.shifts = v));
    bind('cDays', (v) => (p.daysPerWeek = v));
    bind('cAvail', (v) => (p.availability = Math.max(0.5, Math.min(1, v / 100))));
    bind('cCo', (v) => (p.changeoversPerMonth = Math.max(0, v)));
    bind('cTarget', (v) => (this.target = Math.max(0, v)));
    bind('cLines', (v) => (p.lines = Math.max(1, Math.min(4, Math.round(v)))));
    bind('aExt', (v) => (p.extKgH = Math.max(50, v)));
    bind('aAcm', (v) => (p.acmKgH = Math.max(50, v)));
    bind('aFine', (v) => (p.fineKgH = Math.max(50, v)));
    bind('aBatch', (v) => (p.batchKg = Math.max(100, v)));
    bind('aDose', (v) => (p.doseMin = Math.max(5, v)));
    bind('aMix', (v) => (p.mixMin = Math.max(2, v)));
    bind('aCarton', (v) => (p.cartonSec = Math.max(15, v)));
    bind('aChange', (v) => (p.changeoverMin = Math.max(0, v)));
    bind('aLot', (v) => (p.lotKg = Math.max(500, v)));
    bind('aQc', (v) => (p.qcHours = Math.max(0.5, v)));
    this.updateCapacity();
  }

  updateCapacity() {
    const p = this.m.p;
    const c = capacity(p);
    const target = this.target ?? 300;
    const load = c.netT > 0 ? target / c.netT : 0;
    const maxK = Math.max(...c.stages.map((s) => s.kgh));
    $('#capCards').innerHTML = `
      <div class="card"><small>Мощность при текущем режиме</small><strong>${i0(c.netT)}<em>т/мес</em></strong><p>${p.shifts} смен · ${p.daysPerWeek} дн/нед · ${i0(c.hoursMonth)} ч/мес</p></div>
      <div class="card key"><small>Узкое место</small><strong style="font-size:18px">${esc(c.bottleneck.name)}</strong><p>${i0(c.bottleneck.kgh)} кг/ч</p></div>
      <div class="card"><small>Загрузка целевым объёмом</small><strong>${Math.round(load * 100)}<em>%</em></strong><p>${i0(target)} т/мес из ${i0(c.netT)}</p></div>
      <div class="card"><small>Потери на переналадки и прогрев</small><strong>${i0(c.changeoverT + c.warmupT)}<em>т/мес</em></strong><p>${p.changeoversPerMonth} переналадок по ${p.changeoverMin} мин</p></div>`;
    $('#capBars').innerHTML = c.stages.map((s) => `<div class="barrow ${s === c.bottleneck ? 'hot' : ''}"><span>${esc(s.name)}<small>${esc(s.note)}</small></span><div class="track"><div class="fill" style="width:${Math.round((s.kgh / maxK) * 100)}%"></div></div><span class="v">${i0(s.kgh)}</span></div>`).join('');
    const rows = [1, 2, 3].map((sh) => {
      const r5 = c.scenarios.find((s) => s.shifts === sh && s.days === 5);
      const r7 = c.scenarios.find((s) => s.shifts === sh && s.days === 7);
      return `<tr class="${sh === p.shifts ? 'cur' : ''}"><td>${sh} ${sh === 1 ? 'смена' : 'смены'}</td><td>${i0(r5.t)}</td><td>${i0(r7.t)}</td></tr>`;
    }).join('');
    $('#capScen').innerHTML = `<tr><th>Режим</th><th>5 дней</th><th>7 дней</th></tr>${rows}`;
    const need = c.scenarios.filter((s) => s.days === 5).find((s) => s.t >= target);
    $('#capNote').textContent = load > 1
      ? `Целевой объём ${i0(target)} т/мес больше мощности текущего режима. ${need ? `Хватит режима ${need.shifts} смены, 5 дней.` : 'Нужен режим 7 дней или снятие узкого места.'}`
      : `Чтобы загрузить цех полностью при текущем режиме, нужен портфель около ${i0(c.netT)} т/мес. Сейчас ограничивает участок «${c.bottleneck.name}».`;
  }

  // ---------- first-person walk
  bindWalk() {
    const w = (this.walk = new WalkMode(this.v));
    this.v.walk = w;
    const spot = $('#wSpot');
    spot.innerHTML = SPOTS.map(([name], i) => `<option value="${i}">${esc(name)}</option>`).join('');
    spot.addEventListener('change', () => { w.teleport(+spot.value); spot.blur(); });
    $('#wExit').addEventListener('click', () => w.exit());
    w.on('change', (on) => {
      document.body.classList.toggle('walking', on);
      $('#walkhud').hidden = !on;
      if (on) {
        this._roofWas = this.v.hall.roof.visible;
        this.v.setLayer('roof', true);
        this.v.select(null);
        spot.value = String(w.spot || 0);
        this.drawMinimapBase();
      } else {
        this.v.setLayer('roof', !!this._roofWas);
        $('#aim').hidden = true;
      }
    });
    w.on('lock', (locked) => { $('#walkStart').hidden = locked || matchMedia('(pointer: coarse)').matches; });
    w.on('aim', (e) => {
      const el = $('#aim');
      if (!e) { el.hidden = true; return; }
      el.innerHTML = `<i class="dot" style="background:${STATUS_COLORS[e.status] || STATUS_COLORS.off}"></i><b>${e.tag}</b><span>${esc(e.def.name)}</span><em>${matchMedia('(pointer: coarse)').matches ? 'нажмите' : 'E'} — карточка</em>`;
      el.hidden = false;
    });
    w.on('pick', (e) => {
      this.v.select(e, false);
      if (matchMedia('(max-width: 760px)').matches) $('#body').classList.add('insp-open');
    });
    // virtual stick for touch screens
    const stick = $('#stick'), knob = stick.firstElementChild;
    let id = null, c = null;
    const move = (t) => {
      const dx = t.clientX - c[0], dy = t.clientY - c[1];
      const r = Math.min(1, Math.hypot(dx, dy) / 46);
      const a = Math.atan2(dy, dx);
      w.stick.x = Math.cos(a) * r; w.stick.y = Math.sin(a) * r;
      knob.style.transform = `translate(${w.stick.x * 46}px, ${w.stick.y * 46}px)`;
    };
    stick.addEventListener('touchstart', (e) => { const t = e.changedTouches[0]; id = t.identifier; const r = stick.getBoundingClientRect(); c = [r.left + r.width / 2, r.top + r.height / 2]; move(t); e.preventDefault(); }, { passive: false });
    stick.addEventListener('touchmove', (e) => { for (const t of e.changedTouches) if (t.identifier === id) move(t); e.preventDefault(); }, { passive: false });
    const end = (e) => { for (const t of e.changedTouches) if (t.identifier === id) { id = null; w.stick.x = w.stick.y = 0; knob.style.transform = ''; } };
    stick.addEventListener('touchend', end);
    stick.addEventListener('touchcancel', end);
  }

  async startWalk(spot) {
    if (this.walk.active) return;
    const busy = $('#walkBusy');
    busy.hidden = false;
    await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 30)));
    try { await this.walk.enter(spot); } catch (err) { console.error(err); busy.textContent = 'Не удалось подготовить прогулку: нет связи с библиотекой столкновений.'; setTimeout(() => (busy.hidden = true), 4000); return; }
    busy.hidden = true;
  }

  // plan of the hall for the mini-map, drawn once
  drawMinimapBase() {
    const cv = $('#minimap');
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = cv.clientWidth || 260, Hh = cv.clientHeight || 86;
    cv.width = W * dpr; cv.height = Hh * dpr;
    const pad = 6;
    const sx = (W - pad * 2) / (HALL.x1 - HALL.x0), sz = (Hh - pad * 2) / (HALL.z1 - HALL.z0);
    const k = Math.min(sx, sz);
    const ox = pad + ((W - pad * 2) - (HALL.x1 - HALL.x0) * k) / 2, oz = pad + ((Hh - pad * 2) - (HALL.z1 - HALL.z0) * k) / 2;
    this.mm = { k, ox, oz, dpr, W, H: Hh };
    const base = document.createElement('canvas');
    base.width = cv.width; base.height = cv.height;
    const g = base.getContext('2d');
    g.scale(dpr, dpr);
    g.fillStyle = 'rgba(255,255,255,0.94)';
    g.fillRect(0, 0, W, Hh);
    const P = (x, z) => [ox + (x - HALL.x0) * k, oz + (z - HALL.z0) * k];
    g.strokeStyle = '#c9cec9'; g.lineWidth = 1;
    for (const z of ZN) { if (z.outdoor) continue; const [a, b] = P(z.x0, z.z0), [c, d] = P(z.x1, z.z1); g.strokeRect(a, b, c - a, d - b); }
    g.strokeStyle = '#4b555c'; g.lineWidth = 1.4;
    { const [a, b] = P(HALL.x0, HALL.z0), [c, d] = P(HALL.x1, HALL.z1); g.strokeRect(a, b, c - a, d - b); }
    g.fillStyle = '#9aa3a9';
    for (const e of EQUIPMENT) {
      if (!e.pos || e.type === 'container' || e.type === 'forklift' || e.zone === '910') continue;
      const [a, b] = P(e.pos[0], e.pos[2]);
      g.fillRect(a - 1.2, b - 1.2, 2.4, 2.4);
    }
    this.mmBase = base;
  }

  drawMinimap() {
    if (!this.mmBase) return;
    const cv = $('#minimap');
    const g = cv.getContext('2d');
    const { k, ox, oz, dpr } = this.mm;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.drawImage(this.mmBase, 0, 0);
    g.scale(dpr, dpr);
    const [x, z, yaw] = this.walk.where();
    const px = ox + (x - HALL.x0) * k, pz = oz + (z - HALL.z0) * k;
    g.fillStyle = 'rgba(36, 86, 201, 0.18)';
    g.beginPath(); g.moveTo(px, pz); g.arc(px, pz, 16, yaw - 0.55, yaw + 0.55); g.closePath(); g.fill();
    g.fillStyle = '#2456c9';
    g.beginPath(); g.arc(px, pz, 3.2, 0, Math.PI * 2); g.fill();
  }

  // ---------- per-frame
  tick() {
    const now = performance.now();
    if (this.walk && this.walk.active) this.drawMinimap();
    if (now - this._acc > 250) {
      this._acc = now;
      this.updateKpis();
      this.updateTree();
      this.updateInspector();
    }
    if (now - this._acc2 > 600) {
      this._acc2 = now;
      if (this.v.mode === 'status') this.v.applyMode();
      if (this.v.mode === 'load') this.v.applyMode(this.loadTints());
    }
  }
}

function store(k, v) { try { localStorage.setItem(k, v); } catch { /* storage is optional */ } }
function load(k) { try { return localStorage.getItem(k); } catch { return null; } }

function pill(s) {
  return `<span class="pill"><i class="dot" style="background:${STATUS_COLORS[s] || STATUS_COLORS.off}"></i>${esc(STATUS_TEXT[s] || s)}</span>`;
}

function spark(h, label) {
  if (!h || h.n < 2) return `<div class="spark-cap"><span>${esc(label)}</span><span>накопление данных…</span></div>`;
  const n = h.n;
  const v = Array.from(h.v.slice(h.v.length - n));
  const max = Math.max(1e-6, ...v), min = Math.min(0, ...v);
  const W = 300, H = 60;
  const pts = v.map((y, i) => [(i / (n - 1)) * W, H - 4 - ((y - min) / (max - min || 1)) * (H - 10)]);
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join('');
  const last = v[v.length - 1];
  return `<svg class="spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="${esc(label)}">
    <line class="grid" x1="0" y1="${H - 4}" x2="${W}" y2="${H - 4}"/><line class="grid" x1="0" y1="6" x2="${W}" y2="6"/>
    <path class="area" d="${d}L${W},${H - 4}L0,${H - 4}Z"/><path class="ln" d="${d}"/>
    <circle cx="${pts[pts.length - 1][0]}" cy="${pts[pts.length - 1][1]}" r="2.6" fill="var(--accent)"/></svg>
    <div class="spark-cap"><span>${esc(label)} · ${n} мин</span><span class="num">${last.toLocaleString('ru-RU', { maximumFractionDigits: 1 })} (макс ${max.toLocaleString('ru-RU', { maximumFractionDigits: 1 })})</span></div>`;
}
