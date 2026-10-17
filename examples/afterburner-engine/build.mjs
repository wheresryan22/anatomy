import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../kit/iso-kit.mjs";
import * as G from "../../kit/lathe.mjs";
import { kitScript } from "../../scripts/inline-kit.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const THEME = process.argv.includes("--light") ? "light" : "dark";
const OUT = join(HERE, THEME === "light" ? "afterburner-engine-light.html" : "afterburner-engine.html");

const W = 940;
const H = 660;
const X0 = -150;
const LEN = 300;
const ZC = 66;
const DECK = { x: -200, y: -96, w: 400, d: 192, r: 10 };
const DECK_H = 14;
const FOOT_H = 6;
const SPREAD = 0.42;
const DEG = Math.PI / 180;

const AXIS = G.frameOf([X0, 0, ZC], [1, 0, 0], [0, 0, 1], [0, 1, 0]);

const P = k.fitProjection(
  [
    ...k.boxCorners(DECK, -DECK_H - FOOT_H, 0),
    [X0, 0, ZC + 46],
    [X0 + LEN, 0, ZC + 34],
    [X0 + LEN, -34, ZC],
    [X0 + LEN + 70, 0, ZC],
    [X0, -46, ZC],
    [X0, 46, ZC],
  ],
  W,
  H,
  { pad: 30, azimuth: 40, elevation: 26 },
);

const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const Ln = (d, style) => k.lineSvg(d, style);
const Dt = (points, style) => k.dotsSvg(points, style);
const wx = (s) => X0 + s;
const pt = (s, r, deg) => G.pointOf(AXIS, s, r, deg * DEG);
const run = (points) => k.pathOf(points.map(at));
const loop = (s, r, steps = 32) => {
  const points = [];
  for (let i = 0; i < steps; i++) points.push(pt(s, r, (360 * i) / steps));
  return k.pathOf(points.map(at), true);
};
const turned = (profile, tone = "hi", options = {}) => S(G.solidOf(profile, AXIS, P, options), { tone });
const ring = (s, rIn, rOut, tone = "mid", w = 1.5) => S(G.ringBand(s - w, s + w, rIn, rOut, AXIS, P), { tone });
const seam = (s, r, tone = "lo") => Ln(G.arcOf(AXIS, s, r, P), { tone });
const spokes = (s, r0, r1, count, tone = "lo", phase = 0) => Ln(G.spokesOf(AXIS, s, r0, r1, count, P, { phase }), { tone });
const ribs = (s0, s1, r, count, tone = "faint") => Ln(G.ribsOf(AXIS, s0, s1, r, count, P, { least: 0.2 }), { tone });
const pins = (s, r, count, tone = "mid") => Dt(G.dotsOf(AXIS, s, r, count, P, { all: true }), { size: 0.45, tone });
const lug = (s, r) => S(k.slabOf({ x: wx(s) - 5, y: -7, w: 10, d: 14, r: 2 }, ZC + r - 3, 9, P, 4, 0.6), { tone: "mid" });
const tube = (from, to, r, tone = "hi") => S(G.solidOf([[0, r], [to - from, r]], G.frameOf([wx(from), 0, ZC + 26], [1, 0, 0], [0, 0, 1], [0, 1, 0]), P), { tone });

const engine = [];
function part(id, cx, svg, { move = 1, zOff = 0 } = {}) {
  const depth = k.depthOf([cx, 0, ZC + zOff], P);
  engine.push({
    id,
    depth,
    html: `<g class="part" data-part="${id}" data-x="${cx}" data-move="${move}" data-depth="${depth}">${svg}</g>`,
  });
}

function intake() {
  part("nose-cone", wx(4), turned([[0, 14], [6, 9, 1], [14, 2]], "hi"));
  part("intake-lip", wx(24), turned([[0, 46], [8, 46], [14, 41, 1], [30, 34, 1], [50, 31]], "hi") + ring(2, 40, 47, "lo", 1) + seam(8, 46) + seam(30, 34, "faint"));
  part("intake-struts", wx(26), ribs(4, 46, 38, 6, "mid") + ring(46, 26, 31, "lo", 1));
}

function fan() {
  part("fan-case", wx(71), turned([[50, 31], [92, 29]], "hi") + seam(60, 31) + ribs(52, 90, 30, 16));
  part("fan-hub", wx(56), S(G.disc(52, 60, 12, AXIS, P), { tone: "mid" }) + spokes(60, 3, 11, 6, "lo"));
  part("fan-blades", wx(58), spokes(56, 12, 30, 22, "lo", 0.1) + Ln(G.arcOf(AXIS, 56, 30, P), { tone: "faint" }));
  part("fan-vanes", wx(94), spokes(92, 22, 28, 16, "lo", 0.2));
}

function compressor() {
  part("compressor-case", wx(120), turned([[92, 29], [100, 27, 1], [150, 20]], "hi") + ribs(100, 150, 25, 14));
  [104, 112, 120, 128, 136, 144].forEach((s, i) => {
    part(`stage-${i + 1}`, wx(s), ring(s, 20, 27, "mid", 1.6) + spokes(s, 9, 19, 12, "faint", i * 0.13));
  });
  part("bleed-valve", wx(118), S(k.cylinder(wx(118), 0, 4.2, ZC + 24, 11, P, 20), { tone: "mid" }) + S(k.cylinder(wx(118), 0, 6, ZC + 34, 3, P, 20), { tone: "hi" }));
  part("bleed-line", wx(118), tube(118, 136, 1.8, "mid"));
}

function combustor() {
  part("combustor-liner", wx(167), turned([[150, 20], [160, 21, 1], [172, 25, 1], [184, 20]], "hi") + seam(166, 23));
  part("fuel-ring", wx(156), S(G.disc(154, 158, 22, AXIS, P), { tone: "lo" }) + pins(156, 22, 14));
  part("igniter", wx(164), S(k.cylinder(wx(164), 0, 2.4, ZC + 19, 12, P, 16), { tone: "hi" }));
}

function turbines() {
  part("hpt-case", wx(197), turned([[184, 21], [210, 21]], "hi") + ribs(186, 208, 21, 14, "faint"));
  part("hpt-blades", wx(200), spokes(200, 6, 20, 26, "lo", 0.05) + spokes(206, 6, 20, 26, "faint", 0.1));
  part("lpt-case", wx(225), turned([[210, 22], [240, 23]], "hi") + ribs(212, 238, 22, 14, "faint"));
  part("lpt-blades", wx(230), spokes(232, 6, 21, 24, "lo", 0.08) + spokes(238, 6, 21, 24, "faint", 0.16));
  part("hpt-bearing", wx(186), ring(186, 6, 13, "mid", 1.2) + S(G.disc(184, 188, 9, AXIS, P), { tone: "mid" }));
  part("lpt-bearing", wx(236), ring(236, 6, 13, "mid", 1.2) + S(G.disc(234, 238, 9, AXIS, P), { tone: "mid" }));
  part("shroud", wx(218), ring(218, 21, 24, "lo", 1));
}

function mounts() {
  part("mount-front", wx(92), lug(92, 29));
  part("mount-rear", wx(212), lug(212, 23));
}

function afterburner() {
  part("afterburner-liner", wx(261), turned([[240, 23], [246, 26, 1], [276, 26, 1], [282, 24]], "hi") + ribs(244, 280, 26, 22, "faint") + seam(246, 26));
  part("fuel-line", wx(256), tube(236, 276, 2.2, "hi"));
  part("spray-bar-1", wx(252), ring(252, 18, 25, "lo", 1) + Dt(G.dotsOf(AXIS, 252, 21, 10, P, { all: true }), { size: 0.5, tone: "lit" }));
  part("spray-bar-2", wx(262), ring(262, 17, 25, "lo", 1) + Dt(G.dotsOf(AXIS, 262, 21, 10, P, { all: true }), { size: 0.5, tone: "lit" }));
  part("spray-bar-3", wx(270), ring(270, 17, 25, "lo", 1) + Dt(G.dotsOf(AXIS, 270, 21, 10, P, { all: true }), { size: 0.5, tone: "lit" }));
  part("flameholder-1", wx(256), spokes(256, 9, 24, 8, "mid", 0.3));
  part("flameholder-2", wx(266), spokes(266, 9, 24, 8, "mid", 0.6));
}

function nozzle() {
  part("nozzle-dry", wx(291), turned([[282, 24], [288, 16, 1], [293, 14, 1], [300, 26]], "hi") + seam(292, 14) + spokes(296, 16, 25, 16, "faint", 0.2));
  part("nozzle-wet", wx(291), turned([[282, 24], [290, 18, 1], [296, 17, 1], [300, 32]], "hi") + seam(296, 17) + spokes(298, 18, 31, 16, "faint", 0.2));
  part("nozzle-flaps", wx(296), ribs(288, 300, 24, 20, "faint"));
  part("nozzle-actuator-top", wx(288), S(k.cylinder(wx(288), 0, 2.6, ZC + 26, 12, P, 16), { tone: "mid" }));
  part("nozzle-actuator-side", wx(288), S(k.cylinder(wx(288), -30, 2.6, ZC - 4, 10, P, 16), { tone: "mid" }));
}

function clamps() {
  part("clamp-compressor", wx(91), ring(91, 28, 36, "lo", 2) + S(G.ringBand(89, 93, 36, 40, AXIS, P), { tone: "mid" }), { move: 0 });
  part("clamp-turbine", wx(210), ring(210, 22, 28, "lo", 2), { move: 0 });
}

intake();
fan();
compressor();
combustor();
turbines();
mounts();
afterburner();
nozzle();
clamps();

const engineParts = [...engine].sort((a, b) => a.depth - b.depth);

function stand() {
  const out = [];
  out.push(`<path class="iso-halo" d="${k.haloOf(DECK, -DECK_H - FOOT_H, DECK_H + FOOT_H, P)}"/>`);
  for (const [x, y] of k.corners(DECK, 22)) out.push(S(k.cylinder(x, y, 6, -DECK_H - FOOT_H, FOOT_H, P, 24), { tone: "lo" }));
  out.push(S(k.slabOf(DECK, -DECK_H, DECK_H, P, 8, 1.6), { tone: "mid" }));
  out.push(Ln(k.planOutline(k.insetPlan(DECK, 6), 0, P), { tone: "faint" }));
  const strip = { x: -180, y: DECK.y + DECK.d - 16, w: 360, d: 7, r: 1 };
  out.push(S(k.slabOf(strip, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const ticks = k.topTicks(strip.x + 4, strip.x + strip.w - 4, 4, 5, strip.y + 0.8, 0.6, [2, 3.6], P);
  out.push(Ln(ticks.minor, { tone: "lo" }), Ln(ticks.major, { tone: "mid" }));
  for (const [x, y] of k.corners(DECK, 10)) out.push(Ln(k.ring(x, y, 2.2, 0, P, 16), { tone: "lo" }), Dt([at([x, y, 0])], { size: 0.5 }));
  for (const [x, z] of [
    [wx(91), ZC - 36],
    [wx(210), ZC - 27],
  ]) {
    out.push(S(k.cylinder(x, 0, 7, 0, z, P, 22), { tone: "mid" }));
    out.push(S(k.slabOf({ x: x - 12, y: -14, w: 24, d: 28, r: 3 }, 0, 4, P, 4, 0.5), { tone: "lo" }));
    out.push(Dt([at([x - 9, -8, 4]), at([x + 9, 8, 4])], { size: 0.45 }));
  }
  return `<g id="stand">${out.join("")}</g>`;
}

function airflow() {
  const cold = [];
  for (const [r, deg] of [
    [14, 0],
    [14, 120],
    [14, 240],
    [22, 60],
    [22, 180],
    [22, 300],
  ]) {
    const line = [];
    for (let s = -18; s <= 150; s += 8) line.push(pt(s, r, deg));
    cold.push(Ln(run(line), { tone: "mid", flow: true, className: "flow-cold" }));
  }
  const hot = [];
  for (const deg of [30, 150, 270, 330]) {
    const line = [];
    for (let s = 160; s <= LEN; s += 6) line.push(pt(s, 10 + (s - 160) * 0.02, deg));
    hot.push(Ln(run(line), { tone: "lo", flow: true, className: "flow-hot" }));
  }
  return `<g id="airflow">${cold.join("")}${hot.join("")}</g>`;
}

function plume() {
  const layer = (scale, length, cls) => {
    const meridian = [];
    for (let i = 0; i <= 8; i++) {
      const u = i / 8;
      meridian.push([LEN + 1 + length * u, Math.max(0.5, 30 * scale * (1 - u) ** 0.85)]);
    }
    return `<path class="${cls}" d="${G.outlineOf(meridian, AXIS, P, { fill: "hull", rims: "none" }).fill}"/>`;
  };
  const layers = [layer(1.0, 120, "pl-outer"), layer(0.7, 104, "pl-mid"), layer(0.36, 84, "pl-core")];
  const streaks = [];
  for (let i = 0; i < 10; i++) {
    const deg = i * 36 + 18;
    const line = [];
    for (let t = 0; t <= 96; t += 4) line.push(pt(LEN + t, 12 + t * 0.12 + Math.sin(t * 0.25 + i) * 1.6, deg));
    streaks.push(Ln(run(line), { tone: "lit", flow: true, className: "ab-streak" }));
  }
  const shocks = [0, 1, 2, 3, 4].map((i) => `<path class="ab-shock" style="animation-delay:${i * 0.18}s" d="${loop(LEN + 18 + i * 19, 20 - i * 2.6)}"/>`);
  const sparks = [252, 262, 270].map(
    (s, i) => `<g class="ab-spark" style="animation-delay:${i * 0.15}s">${Dt(G.dotsOf(AXIS, s, 21, 10, P, { all: true }), { size: 0.7, tone: "lit", pulse: true })}</g>`,
  );
  return `<g id="afterburner-plume">${layers.join("")}${streaks.join("")}${shocks.join("")}${sparks.join("")}</g>`;
}

function figure() {
  const parts = engineParts.map((p) => p.html).join("");
  return k.figureSvg({
    width: W,
    height: H,
    label:
      "Military turbofan on a test stand. From the intake on the left to the nozzle on the right: fan, six-stage compressor, combustor, high- and low-pressure turbines, afterburner with spray bars and flame holders, and a nozzle that opens in afterburner.",
    body: [stand(), `<g id="engine">${parts}</g>`, airflow(), plume()],
  });
}

const css = `
<style>
.ab-ui{display:grid;gap:14px;margin-top:14px;font:14px/1.5 ui-sans-serif,system-ui,sans-serif;color:var(--anatomy-text)}
.ab-modes{display:flex;flex-wrap:wrap;gap:8px}
.ab-modes button{font:inherit;color:var(--anatomy-text);background:transparent;border:1px solid var(--anatomy-lo);border-radius:2px;padding:7px 12px;cursor:pointer}
.ab-modes button[aria-pressed="true"]{background:var(--anatomy-text);color:var(--anatomy-page);border-color:var(--anatomy-text)}
.ab-modes button:focus-visible,.ab-range input:focus-visible{outline:2px solid var(--anatomy-text);outline-offset:2px}
.ab-range{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:12px}
.ab-range input{width:100%}
.ab-range span{color:var(--anatomy-mid);font-size:12px;letter-spacing:.04em;text-transform:uppercase}
.ab-panel{border-top:1px solid var(--anatomy-faint);padding-top:12px;min-height:6.5em}
.ab-panel h2{font-size:15px;font-weight:600;margin:0 0 4px}
.ab-panel p,.ab-panel ol{margin:0;color:var(--anatomy-mid);max-width:70ch}
.ab-panel ol{padding-left:1.2em;display:grid;gap:2px}
.pl-outer,.pl-mid,.pl-core,.ab-streak{opacity:0;transition:opacity .5s ease}
.pl-outer{fill:#ff5a1f;stroke:none}
.pl-mid{fill:#ffa640;stroke:none}
.pl-core{fill:#fff0cc;stroke:none}
.ab-streak{stroke:#ffe2b0 !important;stroke-width:1.2px}
.ab-shock{fill:#fff7e4;stroke:none;opacity:0}
.ab-spark{opacity:0;transition:opacity .45s ease}
.iso-stage[data-mode="ab"] .pl-outer{opacity:.5;animation:pl-flick .8s ease-in-out infinite alternate}
.iso-stage[data-mode="ab"] .pl-mid{opacity:.72;animation:pl-flick 1.1s ease-in-out infinite alternate-reverse}
.iso-stage[data-mode="ab"] .pl-core{opacity:.9;animation:pl-flick .6s ease-in-out infinite alternate}
.iso-stage[data-mode="ab"] .ab-streak{opacity:.8}
.iso-stage[data-mode="ab"] .ab-spark{opacity:1}
.iso-stage[data-mode="ab"] .ab-shock{animation:ab-shock 1.4s ease-in-out infinite}
@keyframes pl-flick{0%{opacity:.4}100%{opacity:.85}}
@keyframes ab-shock{0%{opacity:0}40%{opacity:.95}100%{opacity:0}}
.iso-line[data-flow]{animation-duration:var(--flow-speed,1.6s)}
.iso-stage[data-mode="ab"] .part[data-part="nozzle-dry"]{opacity:0}
.part[data-part="nozzle-wet"]{opacity:0;transition:opacity .5s ease}
.iso-stage[data-mode="ab"] .part[data-part="nozzle-wet"]{opacity:1}
.part{transition:opacity .4s ease}
.part:hover .iso-edge{stroke:var(--anatomy-lit);stroke-width:2.2px}
</style>`;

const body = k.plateHtml({
  fig: "Fig 1",
  title: "Afterburner turbofan",
  hint: "Drag the slider to take it apart",
  readout: "Idle · thrust ~5% · lowest fuel flow",
  keys: [
    { mark: "raised", label: "Solid parts" },
    { mark: "dashed", label: "Cold air" },
    { mark: "lit", label: "Hot gas and flame" },
  ],
  caption:
    "A military turbofan on a test stand. Values are illustrative. Afterburner burns extra fuel behind the turbine: the nozzle opens, flame and shock cells appear, and thrust climbs well above dry power at a much higher fuel cost.",
  body: `<div class="iso-stage" data-mode="idle" role="img" aria-label="Military turbofan on a test stand, with its afterburner and nozzle">${figure()}</div>${controls()}${css}`,
});

function controls() {
  return `<div class="ab-ui">
<div class="ab-modes" role="group" aria-label="Engine power">
<button type="button" data-mode-button="idle" aria-pressed="true">Idle</button>
<button type="button" data-mode-button="mil" aria-pressed="false">Military</button>
<button type="button" data-mode-button="max" aria-pressed="false">Max dry</button>
<button type="button" data-mode-button="ab" aria-pressed="false">Afterburner</button>
</div>
<label class="ab-range"><span>Assembled</span><input id="ex" type="range" min="0" max="100" value="0" aria-label="Separate the parts along the engine axis"><span>Disassembled</span></label>
<section class="ab-panel" aria-live="polite">
<h2 id="p-title"></h2>
<p id="p-text"></p>
<ol id="p-steps" hidden></ol>
</section>
</div>`;
}

const live = `
const P = ${JSON.stringify(P)};
const ZC = ${ZC};
const SPREAD = ${SPREAD};
const NOZZLE_X = ${wx(291)};
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const engine = svg.querySelector("#engine");
const airflow = svg.querySelector("#airflow");
const plume = svg.querySelector("#afterburner-plume");
const parts = [...engine.querySelectorAll(".part")];
const readout = document.querySelector("[data-readout]");
const slider = document.getElementById("ex");
const pTitle = document.getElementById("p-title");
const pText = document.getElementById("p-text");
const pSteps = document.getElementById("p-steps");
const reduced = matchMedia("(prefers-reduced-motion: reduce)");
const modes = {
  idle: { readout: "Idle · thrust ~5% · lowest fuel flow", speed: "3.2s", title: "Idle", text: "The engine turns slowly. The fan and compressor move only enough air to keep it running, so it makes little thrust and burns very little fuel." },
  mil: { readout: "Military · thrust ~65% · afterburner off", speed: "2s", title: "Military power", text: "Full dry power. Air and hot gas move fast through every stage, but the nozzle stays closed and nothing burns after the turbine." },
  max: { readout: "Max dry · thrust 100% · afterburner off", speed: "1.4s", title: "Max dry power", text: "The highest thrust the engine makes without afterburner. This is the dry limit: the turbine has no more energy to give to the nozzle." },
  ab: { readout: "Afterburner · thrust ~150% · extreme fuel flow", speed: "0.6s", title: "Afterburner", steps: ["Fuel is sprayed through the spray bars into the hot gas leaving the turbine.", "The gas still has oxygen, so the fuel burns. Flame holders keep the flame lit at high speed.", "Shock cells form as the gas accelerates out of the nozzle.", "The nozzle opens to fit the expanded gas, and thrust rises to about 150%."] },
};
function place() {
  const f = Number(slider.value) / 100;
  for (const g of parts) {
    const x = Number(g.dataset.x);
    const move = g.dataset.move === "1" ? 1 : 0;
    const dx = move * f * x * SPREAD;
    g.setAttribute("transform", translateAlong(P, [dx, 0, 0]));
    g.dataset.depth = String(depthOf([x + dx, 0, ZC], P));
  }
  parts.sort((a, b) => Number(a.dataset.depth) - Number(b.dataset.depth)).forEach((g) => engine.appendChild(g));
  const nozzleShift = [f * NOZZLE_X * SPREAD, 0, 0];
  plume.setAttribute("transform", translateAlong(P, nozzleShift));
  airflow.style.opacity = String(1 - 0.65 * f);
  plume.style.opacity = String(1 - 0.5 * f);
}
function setMode(next) {
  const m = modes[next];
  stage.dataset.mode = next;
  svg.style.setProperty("--flow-speed", reduced.matches ? "0s" : m.speed);
  readout.textContent = m.readout;
  pTitle.textContent = m.title;
  pText.textContent = m.text || "";
  pText.hidden = Boolean(m.steps);
  pSteps.hidden = !m.steps;
  pSteps.replaceChildren(...(m.steps || []).map((step) => { const li = document.createElement("li"); li.textContent = step; return li; }));
  document.querySelectorAll("[data-mode-button]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.modeButton === next)));
}
slider.addEventListener("input", place);
document.querySelectorAll("[data-mode-button]").forEach((b) => b.addEventListener("click", () => setMode(b.dataset.modeButton)));
setMode("idle");
place();
`;

mkdirSync(HERE, { recursive: true });
writeFileSync(OUT, k.pageHtml({ title: "Afterburner turbofan", theme: THEME, body, script: kitScript() + live, width: 760 }));
console.log("parts:", engineParts.length, "wrote", OUT);
