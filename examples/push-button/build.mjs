import { existsSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../kit/iso-kit.mjs";
import { kitScript } from "../../scripts/inline-kit.mjs";
import { pdfButton } from "../../kit/pdf-button.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--light") ? "light" : "dark";

const WIDTH = 600;
const HEIGHT = 380;

const PLATE = { x: -120, y: -62, w: 240, d: 124, r: 8 };
const PLATE_H = 10;
const FOOT_H = 5;

const BASE = { x: -80, y: -20, w: 64, d: 40, r: 3 };
const BASE_H = 8;
const POSTS = [[-70, 0], [-26, 0]];
const POST_TOP = 24;
const STEM = [-48, 0];
const GAP = 7;
const BRIDGE = { x: -73, y: -5, w: 50, d: 10, r: 1.5 };
const BRIDGE_H = 2.5;
const BRIDGE_UP = POST_TOP + GAP;
const FRAME_TOP = 60;
const TOP_PLATE = { x: -82, y: -8, w: 68, d: 16, r: 2 };
const TOP_H = 4;
const CAP_UP = 76;
const CAP_R = 9;
const CAP_H = 6;
const SPRING_R = 4.6;
const SPRING_TURNS = 6;

const HOLDER = { x: 40, y: -44, w: 36, d: 28, r: 3 };
const CELL = [58, -30];
const CELL_R = 11;
const CELL_Z = 4;
const CELL_H = 44;

const SOCKET_BASE = { x: 52, y: 20, w: 28, d: 24, r: 3 };
const SOCKET = [66, 32];
const SOCKET_Z = 6;
const SOCKET_H = 9;
const GLOBE_R = 10;
const GLOBE_Z = SOCKET_Z + SOCKET_H + GLOBE_R - 1;

const VOLTS = 1.5;
const AMPS = 0.3;

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [STEM[0], STEM[1], CAP_UP + CAP_H + 2], [SOCKET[0], SOCKET[1], GLOBE_Z + GLOBE_R]],
  WIDTH,
  HEIGHT,
  { pad: 30, azimuth: 42 },
);

const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const piece = (id, html) => `<g data-piece="${id}">${html}</g>`;
const depth = (x, y, z = 0) => k.depthOf([x, y, z], P);

function plate() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
  for (const [x, y] of k.corners(PLATE, 22).sort((a, b) => depth(...a) - depth(...b))) {
    out.push(S(k.cylinder(x, y, 7, -PLATE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 5.4, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
  }
  out.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "lo" }));
  const screws = k.corners(PLATE, 10);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  const strip = { x: -112, y: PLATE.y + PLATE.d - 13, w: 150, d: 6, r: 1 };
  out.push(S(k.slabOf(strip, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const ticks = k.topTicks(strip.x + 4, strip.x + strip.w - 4, 4, 5, strip.y + 0.8, 0.6, [1.8, 3.4], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  const label = { x: 50, y: PLATE.y + PLATE.d - 15, w: 58, d: 9, r: 1.2 };
  out.push(S(k.slabOf(label, 0, 0.8, P, 3), { tone: "mid", crease: "none" }));
  out.push(k.faceTextSvg(k.topMatrix([label.x + 4, label.y + 6], 0.8, P, "x"), `${VOLTS} V · ${AMPS.toFixed(1)} A`, { size: 3.4, tone: "lo" }));
  out.push(D([at([label.x + 2, label.y + 4.5, 0.8]), at([label.x + label.w - 2, label.y + 4.5, 0.8])], { size: 0.4 }));
  return out.join("");
}

const WIRES = [
  [[74, -20, 4], [80, -12, 0.4], [96, -12, 0.4], [96, 52, 0.4], [76, 52, 0.4], [76, 44, 6]],
  [[56, 44, 6], [56, 52, 0.4], [-26, 52, 0.4], [-26, 28, 0.4], [-26, 20, BASE_H]],
  [[-70, 20, BASE_H], [-70, 30, 0.4], [-100, 30, 0.4], [-100, -42, 0.4], [30, -42, 0.4], [30, -20, 0.4], [42, -20, 4]],
];

function wires() {
  return WIRES.map((route, index) => {
    const points = route.map(at);
    return `<g class="pb-wire" data-wire="${index}">${k.wireSvg(points[0], points[points.length - 1], { via: points.slice(1, -1), tone: "lo", size: 1.1 })}</g>`;
  }).join("");
}

function holder() {
  const out = [];
  out.push(S(k.slabOf(HOLDER, 0, 4, P, 4, 0.6), { tone: "lo" }));
  out.push(S(k.cylinder(CELL[0], CELL[1], CELL_R + 2, 4, 2, P, 40), { tone: "lo" }));
  for (const [x, y] of [[42, -20], [74, -20]]) {
    out.push(L(k.ring(x, y, 2.4, 4, P, 16), { tone: "mid" }));
    out.push(D([at([x, y, 4])], { size: 0.55 }));
  }
  return out.join("");
}

function cell() {
  const out = [];
  const [x, y] = CELL;
  out.push(S(k.cylinder(x, y, CELL_R, CELL_Z, CELL_H, P, 48, 0.8), { tone: "mid" }));
  out.push(L([CELL_Z + 9, CELL_Z + CELL_H - 8].map((z) => k.sideArc(x, y, CELL_R, z, P, 32)).join(""), { tone: "faint" }));
  out.push(S(k.cylinder(x, y, 4, CELL_Z + CELL_H, 3, P, 24), { tone: "hi" }));
  out.push(k.faceTextSvg(k.topMatrix([x - 3, y + 8], CELL_Z + CELL_H, P, "x"), `${VOLTS} V`, { size: 2.6, tone: "lo" }));
  out.push(S(k.slabOf({ x: x + CELL_R - 0.5, y: y + 6, w: 2, d: 4, r: 0.5 }, 4, CELL_H + 2, P, 2), { tone: "hi", crease: "none" }));
  out.push(S(k.slabOf({ x: x + 4, y: y + 6.5, w: CELL_R - 3.5, d: 3, r: 0.5 }, CELL_Z + CELL_H + 1.4, 1.2, P, 2), { tone: "hi", crease: "none" }));
  return out.join("");
}

function socket() {
  const out = [];
  const [x, y] = SOCKET;
  out.push(S(k.slabOf(SOCKET_BASE, 0, SOCKET_Z, P, 4, 0.6), { tone: "mid" }));
  for (const [tx, ty] of [[56, 41], [76, 41]]) {
    out.push(L(k.ring(tx, ty, 2.2, SOCKET_Z, P, 16), { tone: "mid" }));
    out.push(D([at([tx, ty, SOCKET_Z])], { size: 0.55 }));
  }
  out.push(S(k.cylinder(x, y, 6.5, SOCKET_Z, SOCKET_H, P, 36, 0.6), { tone: "mid" }));
  out.push(L([2, 4, 6].map((dz) => k.sideArc(x, y, 6.5, SOCKET_Z + dz, P, 24)).join(""), { tone: "lo" }));
  return out.join("");
}

function globe() {
  const c = at([SOCKET[0], SOCKET[1], GLOBE_Z]);
  const r = P.scale * GLOBE_R;
  const neck = at([SOCKET[0], SOCKET[1], SOCKET_Z + SOCKET_H]);
  const f0 = [c[0] - r * 0.32, c[1] + r * 0.05];
  const f1 = [c[0] + r * 0.32, c[1] + r * 0.05];
  const zig = Array.from({ length: 9 }, (_, i) => [f0[0] + ((f1[0] - f0[0]) * i) / 8, f0[1] + (i % 2 ? -1.6 : 1.6)]);
  const supports = `M${(neck[0] - 2.4).toFixed(1)} ${neck[1].toFixed(1)}L${f0[0].toFixed(1)} ${f0[1].toFixed(1)}M${(neck[0] + 2.4).toFixed(1)} ${neck[1].toFixed(1)}L${f1[0].toFixed(1)} ${f1[1].toFixed(1)}`;
  return `<g class="pb-globe"><circle class="pb-glass" cx="${c[0].toFixed(1)}" cy="${c[1].toFixed(1)}" r="${r.toFixed(1)}"/><path class="iso-line" data-tone="lo" d="${supports}"/><path class="iso-line pb-filament" data-tone="mid" data-free="both" d="${k.pathOf(zig)}"/><path class="iso-line" data-tone="faint" data-free="both" d="M${(c[0] - r * 0.55).toFixed(1)} ${(c[1] - r * 0.35).toFixed(1)}Q${(c[0] - r * 0.4).toFixed(1)} ${(c[1] - r * 0.7).toFixed(1)} ${(c[0] - r * 0.05).toFixed(1)} ${(c[1] - r * 0.72).toFixed(1)}"/></g>`;
}

function glow() {
  const c = at([SOCKET[0], SOCKET[1], GLOBE_Z]);
  return `<defs><radialGradient id="pb-glow-g"><stop offset="0" class="pb-stop-0"/><stop offset=".35" class="pb-stop-1"/><stop offset="1" class="pb-stop-2"/></radialGradient></defs><circle class="pb-glow" cx="${c[0].toFixed(1)}" cy="${c[1].toFixed(1)}" r="${(P.scale * 34).toFixed(1)}" fill="url(#pb-glow-g)"/>`;
}

function switchBase() {
  const out = [];
  out.push(S(k.slabOf(BASE, 0, BASE_H, P, 4, 0.8), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(BASE, 3), BASE_H, P, 4), { tone: "faint" }));
  for (const [x] of POSTS) {
    out.push(L(k.ring(x, 20 - 3, 2.4, BASE_H, P, 16), { tone: "mid" }));
    out.push(D([at([x, 17, BASE_H])], { size: 0.55 }));
  }
  return out.join("");
}

function posts() {
  return POSTS.map(([x, y]) => S(k.cylinder(x, y, 4.5, BASE_H, POST_TOP - 2 - BASE_H, P, 28), { tone: "mid" }) + S(k.cylinder(x, y, 5, POST_TOP - 2, 2, P, 28), { tone: "hi" })).join("");
}

const column = (x0) => S(k.slabOf({ x: x0, y: -6, w: 6, d: 12, r: 1.2 }, BASE_H, FRAME_TOP - BASE_H, P, 3, 0.5), { tone: "mid" });
const COLUMNS = [-80, -22].map((x0) => ({ x0, depth: depth(x0 + 3, 0, 30) })).sort((a, b) => a.depth - b.depth);

function lower() {
  const out = [];
  out.push(S(k.slabOf(BRIDGE, BRIDGE_UP, BRIDGE_H, P, 3, 0.5), { tone: "hi", lit: true }));
  out.push(D([at([BRIDGE.x + 4, 0, BRIDGE_UP + BRIDGE_H]), at([BRIDGE.x + BRIDGE.w - 4, 0, BRIDGE_UP + BRIDGE_H])], { size: 0.5, tone: "lo" }));
  out.push(S(k.cylinder(STEM[0], STEM[1], 2.2, BRIDGE_UP + BRIDGE_H, CAP_UP - BRIDGE_UP - BRIDGE_H, P, 18), { tone: "hi", crease: "none" }));
  return out.join("");
}

function topPlate() {
  const out = [S(k.slabOf(TOP_PLATE, FRAME_TOP, TOP_H, P, 3, 0.5), { tone: "mid" })];
  out.push(L(k.ring(STEM[0], STEM[1], 3.2, FRAME_TOP + TOP_H, P, 20), { tone: "lo" }));
  out.push(D([at([TOP_PLATE.x + 3, 0, FRAME_TOP + TOP_H]), at([TOP_PLATE.x + TOP_PLATE.w - 3, 0, FRAME_TOP + TOP_H])], { size: 0.5 }));
  return out.join("");
}

function springPath(capBottom) {
  const from = FRAME_TOP + TOP_H + 0.6;
  const to = capBottom - 0.6;
  return Array.from({ length: SPRING_TURNS }, (_, i) => k.ring(STEM[0], STEM[1], SPRING_R, from + ((to - from) * (i + 0.5)) / SPRING_TURNS, P, 24)).join("");
}

function cap() {
  const out = [];
  out.push(S(k.cylinder(STEM[0], STEM[1], CAP_R, CAP_UP, CAP_H, P, 48, 1), { tone: "hi", lit: true }));
  out.push(L(k.knurl(STEM[0], STEM[1], CAP_R, CAP_UP + 0.6, CAP_UP + CAP_H - 1, 54, P, 0.3), { tone: "lo" }));
  out.push(L(k.ring(STEM[0], STEM[1], CAP_R - 2.6, CAP_UP + CAP_H, P, 40), { tone: "faint" }));
  return out.join("");
}

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "A push button on a bench plate, wired in a loop with a 1.5 volt cell in a holder and a small bulb in a socket. Inside the button's open frame, a spring holds a plunger and a copper bridge 7 units above two contact posts. Press the cap and the bridge comes down onto both posts, closing the loop, and the bulb lights.",
  body: [
    plate(),
    glow(),
    piece("wires", wires()),
    piece("cell", holder() + cell()),
    piece("frame", switchBase() + column(COLUMNS[0].x0)),
    piece("contacts", posts()),
    `<g data-piece="bridge" data-move>${lower()}</g>`,
    piece("frame", column(COLUMNS[1].x0) + topPlate()),
    `<g data-piece="spring"><path class="iso-line pb-spring" data-tone="mid" d="${springPath(CAP_UP)}"/></g>`,
    `<g data-piece="cap" data-move>${cap()}</g>`,
    piece("bulb", socket() + globe()),
  ],
});

const CSS = `
.pb-glass{fill:var(--anatomy-paper);fill-opacity:.55;stroke:var(--anatomy-hi);stroke-width:var(--anatomy-weight);vector-effect:non-scaling-stroke;transition:fill .25s var(--anatomy-ease)}
.pb-glow{opacity:var(--pb-on,0);pointer-events:none;mix-blend-mode:var(--pb-blend,screen)}
.pb-stop-0{stop-color:var(--pb-glow-0)}.pb-stop-1{stop-color:var(--pb-glow-1)}.pb-stop-2{stop-color:var(--pb-glow-2)}
.iso{--pb-glow-0:#ffd98a;--pb-glow-1:#ffb84a55;--pb-glow-2:#ff9d2a00;--pb-hot:#ffd98a}
.iso[data-theme="light"]{--pb-glow-0:#ffcf6a;--pb-glow-1:#ffb84a40;--pb-glow-2:#ff9d2a00;--pb-hot:#e08a12;--pb-blend:multiply}
.pb-filament{transition:stroke .15s}
.iso-stage[data-on] .pb-filament{stroke:var(--pb-hot);stroke-width:1.2}
.iso-stage[data-on] .pb-glass{fill:var(--pb-glow-0);fill-opacity:.35}
.iso-stage[data-on] .pb-wire .iso-line{stroke:var(--anatomy-lit)}
.iso-stage{cursor:pointer;touch-action:manipulation}
`;

const live = `
const P = ${JSON.stringify(P)};
const TRAVEL = ${GAP};
const STEM = ${JSON.stringify(STEM)};
const FRAME_TOP = ${FRAME_TOP}, TOP_H = ${TOP_H}, CAP_UP = ${CAP_UP}, SPRING_R = ${SPRING_R}, TURNS = ${SPRING_TURNS};
const VOLTS = ${VOLTS}, AMPS = ${AMPS};
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const movers = [...svg.querySelectorAll("[data-move]")];
const spring = svg.querySelector(".pb-spring");
const flows = [...svg.querySelectorAll(".pb-wire .iso-line")];
const readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
let target = 0, pos = 0, rate = 0, glowAt = 0, on = false;
let frame = 0, last = 0, clock = 0, touring = !still.matches, visible = false, idleTimer = 0, held = false;
const springPath = (capBottom) => {
  const from = FRAME_TOP + TOP_H + 0.6, to = capBottom - 0.6;
  let d = "";
  for (let i = 0; i < TURNS; i++) d += ring(STEM[0], STEM[1], SPRING_R, from + ((to - from) * (i + 0.5)) / TURNS, P, 24);
  return d;
};
function draw() {
  const dz = -TRAVEL * pos;
  const t = translateAlong(P, [0, 0, dz]);
  for (const g of movers) g.setAttribute("transform", t);
  spring.setAttribute("d", springPath(CAP_UP + dz));
  stage.style.setProperty("--pb-on", glowAt.toFixed(3));
  if (on) stage.setAttribute("data-on", ""); else stage.removeAttribute("data-on");
  for (const line of flows) { if (on) line.setAttribute("data-flow", ""); else line.removeAttribute("data-flow"); }
  const text = on ? "closed · " + VOLTS + " V · " + AMPS.toFixed(2) + " A" : pos > 0.02 ? "pressing · " + (TRAVEL * (1 - pos)).toFixed(1) + " px to contact" : "open · 0 A";
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-pressed", on ? "true" : "false");
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  const calm = still.matches;
  if (touring) { clock += dt; target = clock % 2.8 > 1.6 && clock % 2.8 < 2.5 ? 1 : 0; }
  if (calm) { pos = target; rate = 0; }
  else {
    const stiff = 520, drag = 30;
    for (let i = 0; i < 4; i++) { rate += ((target - pos) * stiff - rate * drag) * dt / 4; pos += rate * dt / 4; }
    if (pos > 1) { pos = 1; rate = -rate * 0.18; }
    if (pos < 0) { pos = 0; rate = -rate * 0.3; }
  }
  on = pos > 0.985;
  const want = on ? 1 : 0;
  glowAt = calm ? want : glowAt + (want - glowAt) * (1 - Math.exp(-dt / (want ? 0.06 : 0.22)));
  if (Math.abs(want - glowAt) < 0.002) glowAt = want;
  draw();
  const settled = !touring && Math.abs(target - pos) < 1e-3 && Math.abs(rate) < 1e-3 && glowAt === want;
  frame = visible && !settled ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const press = (down) => { touring = false; target = down ? 1 : 0; clearTimeout(idleTimer); if (!down) idleTimer = setTimeout(() => { touring = !still.matches; clock = 0; run(); }, 4000); run(); };
function finishMotion() {
  cancelAnimationFrame(frame);
  frame = 0;
  clearTimeout(idleTimer);
  touring = false;
  pos = target;
  rate = 0;
  on = pos > 0.985;
  glowAt = on ? 1 : 0;
  draw();
}
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
still.addEventListener("change", () => { if (still.matches) finishMotion(); });
if (still.matches) finishMotion();
stage.addEventListener("pointerdown", (event) => { held = true; stage.setPointerCapture?.(event.pointerId); press(true); });
stage.addEventListener("pointerup", () => { held = false; press(false); });
stage.addEventListener("pointercancel", () => { held = false; press(false); });
stage.addEventListener("keydown", (event) => { if (event.key === " " || event.key === "Enter") { event.preventDefault(); if (!event.repeat) press(true); } });
stage.addEventListener("keyup", (event) => { if (event.key === " " || event.key === "Enter") press(false); });
draw();
`;

const PDF = "push-button-poster-a4.pdf";
const body = k.plateHtml({
  fig: "Fig 1",
  title: "Push button",
  hint: "Press and hold",
  readout: "open · 0 A",
  keys: [
    { mark: "lit", label: "Cap and copper bridge: what moves when you press" },
    { mark: "raised", label: "Two contact posts: the gap the bridge closes" },
  ],
  caption: `A push button wired in a loop with a ${VOLTS} V cell and a small bulb. A spring holds the copper bridge ${GAP} px above two contact posts, so no current can flow. Press the cap and the bridge lands on both posts, the loop closes, and about ${AMPS} A lights the bulb. Let go and the spring lifts the bridge off again.`,
  body: `${existsSync(join(HERE, PDF)) ? pdfButton(PDF) : ""}<div class="iso-stage" tabindex="0" role="button" aria-pressed="false" aria-label="Push button: press and hold the figure, or hold Space, to close the circuit and light the bulb">${svg}</div>`,
});

const name = theme === "light" ? "push-button-light.html" : "push-button.html";
writeFileSync(join(HERE, name), k.pageHtml({ title: "Push button", theme, body: `<style>${CSS}</style>${body}`, script: kitScript() + live }));
console.log("wrote", name);
