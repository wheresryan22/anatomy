import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../kit/iso-kit.mjs";
import * as G from "../../kit/lathe.mjs";
import { kitScript } from "../../scripts/inline-kit.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--light") ? "light" : "dark";

const WIDTH = 640;
const HEIGHT = 820;

const PLINTH = { x: -235, y: -185, w: 470, d: 370, r: 10 };
const FOOT_Z = -92;
const BASE_Z = -70;
const FLOOR_Z = -52;

const C = [-60, -10];
const PLATTER_R = 160;
const PLATTER_Z = 2;
const PLATTER_TOP = 30;
const MAT_TOP = 31.4;
const REC_R = 150;
const REC_TOP = 33.4;
const LABEL_R = 50;
const SPINDLE_TOP = 48;
const ROWS = [
  { n: 223, z: 7.5, base: 100 / 3 },
  { n: 216, z: 11, base: 100 / 3 },
  { n: 209, z: 14.5, base: 100 / 3 },
  { n: 165, z: 18, base: 45 },
  { n: 160, z: 21.5, base: 45 },
  { n: 155, z: 25, base: 45 },
];
const FLASH = 120;
const rowPitch = (n, base) => ((FLASH * 60) / n / base - 1) * 100;

const PIVOT = [168, -115];
const ARM_Z = 47;
const ARM_R = 4.2;
const SHELL = [196, 226];
const REST_S = 150;

const FADER = { x: 194, y: 34, w: 28, d: 138, r: 2 };
const FADER_X = 212;
const FADER_MID = 102.5;
const FADER_HALF = 55;
const PITCH_RANGE = 8;

const COILS = 12;

const RIDES = { chassis: { parent: null, lift: 190 }, platter: { parent: "chassis", lift: 120 }, mat: { parent: "platter", lift: 46 }, arm: { parent: "mat", lift: 0 } };
const TOP_LIFT = RIDES.chassis.lift + RIDES.platter.lift + RIDES.mat.lift;

const PARTS = [
  { id: "feet", fig: "×4", name: "Insulator feet", spec: "Four large rubber-damped feet carry the deck and soak up shock from the table." },
  { id: "base", fig: "", name: "Rubber base", spec: "A heavy rubber moulding under the chassis, damping resonance from below." },
  { id: "power", fig: "12 W", name: "Power transformer", spec: "Steps mains voltage down for the drive and control circuits. The deck draws about 12 W." },
  { id: "drive", fig: "0.7 s", name: "Drive board", spec: "Quartz oscillator, speed servo and motor driver. It also brakes the platter electronically." },
  { id: "operate", fig: "33 · 45", name: "Operating board", spec: "Start/stop and the 33 and 45 speed switches." },
  { id: "pitch", fig: "±8%", name: "Pitch control", spec: "A slide control on its own bracket: ±8% around either speed, still under quartz control." },
  { id: "chassis", fig: "Al", name: "Die-cast chassis", spec: "Aluminium die-cast top that carries the motor, arm and controls." },
  { id: "strobe", fig: "120 /s", name: "Strobe illuminator", spec: "An LED flashing in step with the quartz clock, aimed at the platter rim." },
  { id: "motor", fig: "1.5 kg·cm", name: "Stator and FG coil", spec: "Twelve coils of a brushless DC motor, with a frequency-generator ring that reports speed. 1.5 kg·cm starting torque." },
  { id: "platter", fig: "33.2 cm", name: "Platter and rotor", spec: "Aluminium die-cast, 33.2 cm across, about 2 kg, with the rotor magnet underneath and strobe dots on the rim. Up to speed in 0.7 s." },
  { id: "mat", fig: "", name: "Rubber mat", spec: "A thick rubber mat between platter and record damps vibration." },
  { id: "arm", fig: "230 mm", name: "Tonearm", spec: "Gimbal-suspended, 230 mm effective length, 12 g effective mass, helicoid height adjustment up to 6 mm, cueing lever and anti-skate." },
];

const P = k.fitProjection(
  [
    ...k.boxCorners(PLINTH, FOOT_Z, 0),
    ...Array.from({ length: 32 }, (_, i) => [C[0] + Math.sin(i / 5.093) * PLATTER_R, C[1] - Math.cos(i / 5.093) * PLATTER_R, REC_TOP + TOP_LIFT]),
  ],
  WIDTH,
  HEIGHT,
  { pad: 22, azimuth: 55, elevation: 32 },
);

const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const depth = ([x, y, z = 0]) => k.depthOf([x, y, z], P);
const byDepth = (points) => [...points].sort((a, b) => depth(a) - depth(b));
const polar = (r, a, cx = C[0], cy = C[1]) => [cx + Math.sin(a) * r, cy - Math.cos(a) * r];
const part = (asm, ride, inner, extra = "") => `<g data-asm="${asm}"${ride ? ` data-ride="${ride}"` : ""}${extra}>${inner}</g>`;
const box = (plan, z, h, tone = "mid", steps = 3, bevel = 0.3, style = {}) => S(k.slabOf(plan, z, h, P, steps, bevel), { tone, ...style });

function feet() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLINTH, FOOT_Z, BASE_Z - FOOT_Z + 52, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(PLINTH, 40))) {
    out.push(S(k.cylinder(x, y, 31, FOOT_Z, 4, P, 48), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 29, FOOT_Z + 4, BASE_Z - FOOT_Z - 4, P, 48), { tone: "lo" }));
    out.push(L(k.knurl(x, y, 29, FOOT_Z + 6, BASE_Z - 2, 64, P, 0.5), { tone: "faint" }));
    out.push(L(k.sideArc(x, y, 29, BASE_Z - 4, P, 40), { tone: "lo" }));
  }
  return out.join("");
}

function base() {
  const out = [S(k.slabOf(PLINTH, BASE_Z, FLOOR_Z - BASE_Z, P, 10, 1.2), { tone: "lo", inner: L(k.sideSeam(PLINTH, BASE_Z + 7, P, 10), { tone: "faint" }) })];
  out.push(L(k.planOutline(k.insetPlan(PLINTH, 9), FLOOR_Z, P, 10), { tone: "faint" }));
  out.push(`<path class="iso-halo" data-part="chassis-halo" opacity="0" d="${k.haloOf(k.insetPlan(PLINTH, 30), FLOOR_Z, 0.1, P)}" style="filter:blur(8px)"/>`);
  for (const [x, y] of byDepth(k.corners(PLINTH, 22))) {
    out.push(S(k.cylinder(x, y, 6, FLOOR_Z, 6, P, 24), { tone: "mid" }));
    out.push(L(k.ring(x, y, 2.2, FLOOR_Z + 6, P, 16), { tone: "lo" }));
  }
  return out.join("");
}

function transformer() {
  const out = [];
  const plate = { x: -212, y: 22, w: 72, d: 58, r: 2 };
  out.push(box(plate, FLOOR_Z, 2, "mid", 3, 0.3));
  out.push(D(k.corners(plate, 4).map(([x, y]) => at([x, y, FLOOR_Z + 2])), { size: 0.5 }));
  const back = { x: -194, y: 27, w: 34, d: 10, r: 4 };
  out.push(box(back, FLOOR_Z + 6, 26, "lo", 6, 0.3));
  const core = { x: -206, y: 35, w: 58, d: 34, r: 0.6 };
  const laminations = [-44, -40, -36, -32, -28, -24, -20].map((z) => L(k.sideSeam(core, z, P, 2), { tone: "lo" })).join("");
  out.push(S(k.slabOf(core, FLOOR_Z + 2, 36, P, 2, 0.4), { tone: "mid", inner: laminations }));
  for (const [x, y] of [[core.x + 5, core.y + 5], [core.x + core.w - 5, core.y + 5], [core.x + 5, core.y + core.d - 5], [core.x + core.w - 5, core.y + core.d - 5]]) {
    out.push(L(k.ring(x, y, 2, FLOOR_Z + 38, P, 12), { tone: "lo" }));
    out.push(D([at([x, y, FLOOR_Z + 38])], { size: 0.45 }));
  }
  const front = { x: -194, y: 67, w: 34, d: 11, r: 4 };
  out.push(box(front, FLOOR_Z + 6, 26, "lo", 6, 0.3));
  out.push(L(k.planOutline(k.insetPlan(front, 2), FLOOR_Z + 32, P, 6), { tone: "faint" }));
  const block = { x: -147, y: 40, w: 6, d: 24, r: 1 };
  out.push(box(block, FLOOR_Z + 2, 12, "mid"));
  out.push(D([44, 52, 60].map((y) => at([-144, y, FLOOR_Z + 14])), { size: 0.55, tone: "hi" }));
  return out.join("");
}

const BOARD = { x: -100, y: -22, w: 182, d: 122, r: 3 };
const BOARD_Z = FLOOR_Z + 5;
const BOARD_TOP = BOARD_Z + 1.6;

function driveBoard() {
  const out = [];
  for (const [x, y] of byDepth(k.corners(BOARD, 6))) out.push(S(k.cylinder(x, y, 2.4, FLOOR_Z, 5, P, 16), { tone: "mid" }));
  out.push(box(BOARD, BOARD_Z, 1.6, "lo", 4, 0.4));
  out.push(D(k.corners(BOARD, 6).map(([x, y]) => at([x, y, BOARD_TOP])), { size: 0.55 }));
  out.push(L([[-90, 18, -40, 18], [-90, 22, -60, 22], [-20, -8, 60, -8], [-20, -4, 30, -4], [-40, 88, 20, 88]].map(([x0, y0, x1, y1]) => k.lineOnTop([x0, y0], [x1, y1], BOARD_TOP, P)).join(""), { tone: "faint", free: true }));
  const items = [];
  const cap = (x, y, r, h) => items.push([[x, y, 0], () => S(k.cylinder(x, y, r, BOARD_TOP, h, P, 28), { tone: "mid", inner: L(k.sideArc(x, y, r, BOARD_TOP + h - 1.6, P, 20), { tone: "lo" }) }) + L(k.onTop([[x - r * 0.5, y], [x + r * 0.5, y]], BOARD_TOP + h, P) + k.onTop([[x, y - r * 0.5], [x, y + r * 0.5]], BOARD_TOP + h, P), { tone: "lo" })]);
  const chip = (x, y, w, d, pins) => items.push([[x + w / 2, y + d / 2, 0], () => {
    const pinsAt = Array.from({ length: pins }, (_, i) => x + 2 + (i * (w - 4)) / (pins - 1));
    return D(pinsAt.flatMap((px) => [at([px, y - 1, BOARD_TOP]), at([px, y + d + 1, BOARD_TOP])]), { size: 0.45, tone: "mid" }) + box({ x, y, w, d, r: 0.6 }, BOARD_TOP, 3, "lo", 2, 0.3) + D([at([x + 2.4, y + 2.4, BOARD_TOP + 3])], { size: 0.5 });
  }]);
  cap(-72, 0, 9, 22);
  cap(-48, 4, 5, 11);
  cap(-34, 4, 5, 11);
  cap(44, 0, 4, 8);
  cap(56, 0, 4, 8);
  cap(68, 0, 4, 8);
  for (let i = 0; i < 6; i++) {
    const x = -88 + i * 4.6;
    items.push([[x + 1, 41, 0], () => box({ x, y: 30, w: 2, d: 22, r: 0.4 }, BOARD_TOP, 16, "mid", 2, 0)]);
  }
  items.push([[-76, 54, 0], () => box({ x: -84, y: 52, w: 16, d: 5, r: 0.6 }, BOARD_TOP, 8, "lo", 2, 0.3) + D([-80, -76, -72].map((x) => at([x, 57.4, BOARD_TOP + 2])), { size: 0.45 })]);
  chip(-30, 38, 28, 12, 9);
  chip(10, 38, 22, 10, 7);
  items.push([[46, 46, 0], () => box({ x: 40, y: 44, w: 12, d: 4.6, r: 2.2 }, BOARD_TOP, 4.4, "hi", 4, 0.3) + D([at([43, 50, BOARD_TOP]), at([49, 50, BOARD_TOP])], { size: 0.45 })]);
  for (let i = 0; i < 6; i++) {
    const x = -2 + i * 7;
    items.push([[x + 1, 74, 0], () => box({ x, y: 71, w: 2.4, d: 6, r: 1 }, BOARD_TOP, 2, "mid", 2, 0)]);
  }
  for (const y of [68, 82]) items.push([[60, y, 0], () => S(k.cylinder(60, y, 3.2, BOARD_TOP, 2.6, P, 18), { tone: "mid" }) + L(k.lineOnTop([58, y], [62, y], BOARD_TOP + 2.6, P), { tone: "lo" })]);
  items.push([[-94, 70, 0], () => box({ x: -98, y: 62, w: 6, d: 16, r: 0.6 }, BOARD_TOP, 6, "lo") + D([65, 70, 75].map((y) => at([-95, y, BOARD_TOP + 6])), { size: 0.5, tone: "hi" })]);
  items.push([[-86, 92, 0], () => box({ x: -92, y: 90, w: 12, d: 5, r: 0.6 }, BOARD_TOP, 6, "lo") + D([-89, -86, -83].map((x) => at([x, 92.5, BOARD_TOP + 6])), { size: 0.5, tone: "hi" })]);
  items.push([[73, 94, 0], () => box({ x: 66, y: 91, w: 14, d: 5, r: 0.6 }, BOARD_TOP, 6, "lo") + D([69, 73, 77].map((x) => at([x, 93.5, BOARD_TOP + 6])), { size: 0.5, tone: "hi" })]);
  items.sort((a, b) => depth(a[0]) - depth(b[0]));
  out.push(...items.map(([, draw]) => draw()));
  return out.join("");
}

const OP = { x: -216, y: 128, w: 98, d: 38, r: 2 };
const OP_Z = FLOOR_Z + 4;
const OP_TOP = OP_Z + 1.6;

function operateBoard() {
  const out = [];
  for (const [x, y] of byDepth(k.corners(OP, 5))) out.push(S(k.cylinder(x, y, 2, FLOOR_Z, 4, P, 14), { tone: "mid" }));
  out.push(box(OP, OP_Z, 1.6, "lo", 3, 0.3));
  out.push(L(k.lineOnTop([OP.x + 6, OP.y + 31], [OP.x + 50, OP.y + 31], OP_TOP, P), { tone: "faint", free: true }));
  for (const [x, y] of byDepth([[-202, 154], [-160, 162], [-134, 162]])) {
    out.push(box({ x: x - 4, y: y - 4, w: 8, d: 8, r: 0.8 }, OP_TOP, 3.4, "mid", 2, 0.3));
    out.push(S(k.cylinder(x, y, 2, OP_TOP + 3.4, 1.4, P, 14), { tone: "hi" }));
  }
  out.push(box({ x: -128, y: 131, w: 8, d: 5, r: 0.6 }, OP_TOP, 5, "lo"));
  out.push(D([-126, -122].map((x) => at([x, 133.5, OP_TOP + 5])), { size: 0.5, tone: "hi" }));
  return out.join("");
}

const VR = { x: 205, y: 40, w: 14, d: 126, r: 1.5 };
const VR_Z = FLOOR_Z + 12;
const VR_TOP = VR_Z + 9;

function pitchControl() {
  const out = [];
  for (const y of [34, 164]) out.push(box({ x: 204, y, w: 16, d: 6, r: 0.8 }, FLOOR_Z, 12, "mid", 2, 0.3));
  out.push(box(VR, VR_Z, 9, "mid", 3, 0.5));
  const slot = { x: 211, y: VR.y + 8, w: 2, d: VR.d - 16, r: 1 };
  out.push(L(k.planOutline(slot, VR_TOP, P, 3), { tone: "lo" }));
  out.push(D([150, 156, 162].map((y) => at([VR.x, y, VR_Z + 4])), { size: 0.55, tone: "hi" }));
  out.push(`<g data-part="vrtab">${box({ x: 209, y: FADER_MID - 3, w: 6, d: 6, r: 0.8 }, VR_TOP, 5, "hi", 2, 0.3)}</g>`);
  return out.join("");
}

function wires() {
  const W = (points, tone = "lo") => k.wireSvg(at(points[0]), at(points[points.length - 1]), { via: points.slice(1, -1).map(at), tone, size: 1 });
  return [
    W([[-144, 52, FLOOR_Z + 14], [-132, 52, FLOOR_Z + 1], [-110, 70, FLOOR_Z + 1], [-95, 70, BOARD_TOP + 6]]),
    W([[-124, 133.5, OP_TOP + 5], [-112, 120, FLOOR_Z + 1], [-92, 108, FLOOR_Z + 1], [-86, 92.5, BOARD_TOP + 6]]),
    W([[VR.x, 156, VR_Z + 4], [194, 140, FLOOR_Z + 1], [100, 112, FLOOR_Z + 1], [73, 93.5, BOARD_TOP + 6]]),
  ].join("");
}

function chassis() {
  const out = [];
  out.push(
    S(k.slabOf(PLINTH, FLOOR_Z, -FLOOR_Z, P, 10, 1.6), {
      tone: "mid",
      inner: L(k.sideSeam(PLINTH, -14, P, 10), { tone: "lo" }) + L(k.sideSeam(PLINTH, FLOOR_Z + 6, P, 10), { tone: "faint" }),
    }),
  );
  out.push(L(k.planOutline(k.insetPlan(PLINTH, 7), 0, P, 10), { tone: "faint" }));
  const screws = k.corners(PLINTH, 14);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.4, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.55 }));
  const plate = { x: -214, y: -172, w: 64, d: 18, r: 1.5 };
  out.push(S(k.slabOf(plate, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  out.push(L([4.5, 8.5, 12.5].map((y, i) => k.lineOnTop([plate.x + 5, plate.y + y], [plate.x + (i === 0 ? 46 : 34), plate.y + y], 0.6, P)).join(""), { tone: "mid", free: true }));
  out.push(D([at([plate.x + 2.2, plate.y + 2.2, 0.6]), at([plate.x + plate.w - 2.2, plate.y + plate.d - 2.2, 0.6])], { size: 0.4 }));
  out.push(L(k.ring(C[0], C[1], PLATTER_R + 4, 0, P, 120), { tone: "faint" }));
  return out.join("");
}

function coilRing(index) {
  const a = (index / COILS) * Math.PI * 2;
  const half = (Math.PI / COILS) * 0.62;
  return [polar(46, a - half * 0.8), polar(46, a + half * 0.8), polar(80, a + half), polar(80, a - half)];
}

function stator() {
  const out = [`<path class="iso-halo" data-part="lift-halo" opacity="0" d="${k.haloOf({ x: C[0] - PLATTER_R + 10, y: C[1] - PLATTER_R + 10, w: PLATTER_R * 2 - 20, d: PLATTER_R * 2 - 20, r: PLATTER_R - 10 }, 0, 0.1, P)}" style="filter:blur(6px)"/>`];
  out.push(S(k.cylinder(C[0], C[1], 108, 0, 1.6, P, 96), { tone: "lo" }));
  out.push(D(Array.from({ length: 8 }, (_, i) => at([...polar(104, (i / 8) * Math.PI * 2 + 0.2), 1.6])), { size: 0.5 }));
  out.push(S(k.cylinder(C[0], C[1], 99, 1.6, 1.4, P, 96, 0.4), { tone: "mid" }));
  const fg = k.radialTicks(C[0], C[1], 98.5, 144, 12, 3, [2.4, 3.4], P);
  out.push(L(fg.minor, { tone: "lo" }), L(fg.major, { tone: "mid" }));
  out.push(S(k.cylinder(C[0], C[1], 92, 3, 1.4, P, 96, 0.5), { tone: "mid" }));
  out.push(L(k.ring(C[0], C[1], 86, 4.4, P, 96), { tone: "faint" }));
  const coils = Array.from({ length: COILS }, (_, i) => i).sort((a, b) => depth([...polar(63, (a / COILS) * Math.PI * 2), 0]) - depth([...polar(63, (b / COILS) * Math.PI * 2), 0]));
  for (const i of coils) {
    out.push(S(k.extrude(coilRing(i), 4.4, 9.6, P, { bevel: 0.4 }), { tone: "mid" }));
    const mid = (i / COILS) * Math.PI * 2;
    out.push(L(k.onTop([polar(52, mid - 0.06), polar(74, mid - 0.06)], 14, P), { tone: "lo", free: true }));
  }
  out.push(`<path data-part="coils" class="iso-line" data-tone="lit" d="" style="stroke-width:0.9"/>`);
  out.push(D([0.5, 4.5, 8.5].map((i) => at([...polar(88, (i / COILS) * Math.PI * 2), 4.4])), { size: 0.7, tone: "hi" }));
  out.push(S(k.cylinder(C[0], C[1], 18, 4.4, 15.6, P, 48, 0.6), { tone: "mid" }));
  out.push(L(k.ring(C[0], C[1], 12, 20, P, 40), { tone: "lo" }));
  out.push(D(Array.from({ length: 6 }, (_, i) => at([...polar(15, (i / 6) * Math.PI * 2), 20])), { size: 0.4 }));
  out.push(S(k.cylinder(C[0], C[1], 3.6, 20, SPINDLE_TOP - 20, P, 20), { tone: "hi", crease: "none" }));
  out.push(S(k.cylinder(C[0], C[1], 2.6, SPINDLE_TOP, 1.2, P, 16), { tone: "hi" }));
  return out.join("");
}

function platterBody() {
  const out = [];
  out.push(
    S(k.cylinder(C[0], C[1], PLATTER_R, PLATTER_Z, PLATTER_TOP - PLATTER_Z, P, 160, 1.2), {
      tone: "hi",
      crease: "lo",
      inner: L(k.sideArc(C[0], C[1], PLATTER_R, 28, P, 120), { tone: "mid" }) + L(k.sideArc(C[0], C[1], PLATTER_R, 4.5, P, 120), { tone: "mid" }),
    }),
  );
  out.push(`<g data-part="dots"></g>`);
  out.push(L(k.ring(C[0], C[1], 156, PLATTER_TOP, P, 140), { tone: "mid" }));
  out.push(L(k.ring(C[0], C[1], 152, PLATTER_TOP, P, 140), { tone: "faint" }));
  out.push(L(k.ring(C[0], C[1], 4.2, PLATTER_TOP, P, 20), { tone: "mid" }));
  out.push(L([60, 100, 130].map((r) => k.ring(C[0], C[1], r, PLATTER_TOP, P, 120)).join(""), { tone: "faint" }));
  return out.join("");
}

function matAndRecord() {
  const out = [];
  out.push(S(k.cylinder(C[0], C[1], 152, PLATTER_TOP, MAT_TOP - PLATTER_TOP, P, 140), { tone: "lo", crease: "none" }));
  out.push(S(k.cylinder(C[0], C[1], REC_R, MAT_TOP, REC_TOP - MAT_TOP, P, 140, 0.5), { tone: "lo", crease: "faint" }));
  const grooves = [];
  for (let r = 64; r <= 145; r += 2.7) grooves.push(k.ring(C[0], C[1], r, REC_TOP, P, 120));
  out.push(L(grooves.join(""), { tone: "faint" }));
  out.push(L([78, 97, 113, 130].map((r) => k.ring(C[0], C[1], r, REC_TOP, P, 120)).join(""), { tone: "lo" }));
  out.push(L(k.ring(C[0], C[1], 147.5, REC_TOP, P, 140), { tone: "lo" }));
  out.push(S(k.cylinder(C[0], C[1], LABEL_R, REC_TOP, 0.15, P, 72), { tone: "hi", flat: true }));
  out.push(L(k.ring(C[0], C[1], LABEL_R - 3, REC_TOP + 0.15, P, 72), { tone: "lo" }));
  out.push(L(k.ring(C[0], C[1], 4.2, REC_TOP + 0.15, P, 20), { tone: "mid" }));
  out.push(`<g data-part="label"></g>`);
  return out.join("");
}

const DYNAMIC = `
function rowDots(phase, n, z, tone) {
  const tv = towardViewer(P);
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = phase + (i / n) * Math.PI * 2;
    const nx = Math.sin(a), ny = -Math.cos(a);
    const facing = nx * tv[0] + ny * tv[1];
    if (facing < 0.02) continue;
    const s = Math.min(1, Math.max(0, (facing - 0.02) / 0.4));
    const [x, y] = iso([C[0] + nx * (PLATTER_R + 0.2), C[1] + ny * (PLATTER_R + 0.2), z], P);
    out.push([x, y, s * s * (3 - 2 * s)]);
  }
  return dotsSvg(out, { size: 0.62, tone });
}
function labelMarks(theta) {
  const z = REC_TOP + 0.2;
  const pt = (r, a) => [C[0] + Math.sin(a) * r, C[1] - Math.cos(a) * r];
  const arc = (r, a0, a1) => onTop(Array.from({ length: 9 }, (_, i) => pt(r, a0 + (a1 - a0) * i / 8)), z, P);
  const sector = (a0, a1, r0, r1) => { const n = 10, pts = []; for (let i = 0; i <= n; i++) pts.push(pt(r1, a0 + (a1 - a0) * i / n)); for (let i = n; i >= 0; i--) pts.push(pt(r0, a0 + (a1 - a0) * i / n)); return onTop(pts, z, P, true); };
  const fills = '<path d="' + sector(theta + 0.3, theta + 1.35, 14, LABEL_R - 6) + sector(theta + Math.PI + 0.3, theta + Math.PI + 1.35, 14, LABEL_R - 6) + '" style="fill:var(--anatomy-mid);stroke:none" opacity=".55"/>';
  return fills + lineSvg(onTop([pt(9, theta), pt(LABEL_R - 3, theta)], z, P), { tone: "mid", free: "start" }) +
    lineSvg(arc(36, theta + 0.35, theta + 1.25) + arc(30, theta + 0.35, theta + 1.0) + arc(24, theta + 0.35, theta + 0.8), { tone: "mid", free: true }) +
    lineSvg(arc(36, theta + Math.PI + 0.35, theta + Math.PI + 1.05), { tone: "mid", free: true });
}
function coilPath(theta) {
  const phase = Math.floor((theta / (Math.PI * 2)) * COILS * 1.5) % 3;
  return COIL_TOPS.filter((_, i) => i % 3 === phase).join("");
}
function spindleSeg(z0, z1, cap) {
  if (z1 - z0 < 0.4) return "";
  return solidSvg(cylinder(C[0], C[1], 3.6, z0, z1 - z0, P, 20), { tone: "hi", crease: "none" }) +
    (cap ? solidSvg(cylinder(C[0], C[1], 2.6, z1, 1.2, P, 16), { tone: "hi" }) : "");
}
`;

const COIL_TOPS = Array.from({ length: COILS }, (_, i) => k.onTop(coilRing(i), 14, P, true));
const CONSTS = { P, C, PLATTER_R, REC_TOP, LABEL_R, SPINDLE_TOP, COILS, COIL_TOPS };
const dyn = new Function(...Object.keys(k), ...Object.keys(CONSTS), `${DYNAMIC}; return { rowDots, labelMarks, coilPath, spindleSeg };`)(...Object.values(k), ...Object.values(CONSTS));

const ARM_REACH = SHELL[0] + 25;
const rotArm = (x, y, phi) => { const dx = x - PIVOT[0], dy = y - PIVOT[1], c = Math.cos(phi), sn = Math.sin(phi); return [PIVOT[0] + dx * c - dy * sn, PIVOT[1] + dx * sn + dy * c]; };
const PLAY_PHI = (() => { let lo = 0, hi = 1.2; const r = (phi) => { const [x, y] = rotArm(PIVOT[0], PIVOT[1] + ARM_REACH, phi); return Math.hypot(x - C[0], y - C[1]); }; for (let i = 0; i < 60; i++) { const mid = (lo + hi) / 2; if (r(mid) > 138) lo = mid; else hi = mid; } return (lo + hi) / 2; })();
const ARM_STEPS = 40;
const ARM_LIFT = 7;

function tonearmBase() {
  const out = [];
  const [px, py] = PIVOT;
  out.push(S(k.cylinder(px, py, 27, 0, 3, P, 64, 0.6), { tone: "mid" }));
  out.push(D(Array.from({ length: 4 }, (_, i) => at([px + Math.sin(i * 1.57 + 0.78) * 23.5, py - Math.cos(i * 1.57 + 0.78) * 23.5, 3])), { size: 0.45 }));
  out.push(S(k.cylinder(px, py, 20, 3, 11, P, 56), { tone: "mid" }));
  out.push(L(k.knurl(px, py, 20, 4, 13, 72, P), { tone: "lo" }));
  out.push(S(k.cylinder(px, py, 9, 14, 14, P, 32), { tone: "mid", crease: "none" }));
  out.push(L(k.sideArc(px, py, 9, 20, P, 20), { tone: "lo" }));
  return out.join("");
}

function tonearmTower() {
  const out = [];
  const [px, py] = PIVOT;
  const top = ARM_Z + 8;
  out.push(S(k.cylinder(px, py, 12, 28, top - 28, P, 40, 0.5), { tone: "mid" }));
  out.push(L(k.sideArc(px, py, 12, ARM_Z, P, 24), { tone: "faint" }));
  out.push(L(k.ring(px, py, 6, top, P, 24), { tone: "lo" }));
  out.push(D([at([px, py, top])], { size: 0.6, tone: "hi" }));
  const rest = py + REST_S, cradle = ARM_Z - ARM_R - 8;
  out.push(S(k.cylinder(px, rest, 6, 0, 3, P, 24), { tone: "mid" }));
  out.push(S(k.cylinder(px, rest, 3.4, 3, cradle - 3, P, 20), { tone: "mid", crease: "none" }));
  out.push(S(k.slabOf({ x: px - 8, y: rest - 4, w: 16, d: 8, r: 1.5 }, cradle, ARM_Z - ARM_R - cradle, P, 3, 0.3), { tone: "mid" }));
  const lever = [px + 40, py + 42];
  out.push(S(k.cylinder(lever[0], lever[1], 8, 0, 6, P, 28), { tone: "mid" }));
  out.push(S(k.slabOf({ x: lever[0] - 2, y: lever[1] - 2, w: 4, d: 20, r: 1.5 }, 6, 3, P, 3, 0.3), { tone: "mid" }));
  out.push(S(k.cylinder(lever[0], lever[1] + 20, 3.2, 6, 4, P, 18), { tone: "mid" }));
  const skate = [px + 40, py - 8];
  out.push(S(k.cylinder(skate[0], skate[1], 11, 0, 3, P, 36), { tone: "mid" }));
  out.push(S(k.cylinder(skate[0], skate[1], 8, 3, 7, P, 32), { tone: "mid" }));
  out.push(L(k.knurl(skate[0], skate[1], 8, 4, 10, 40, P), { tone: "lo" }));
  const ticks = k.radialTicks(skate[0], skate[1], 10.5, 24, 6, 3, [0.8, 1.6], P, -2.2, 4.4);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(L(k.lineOnTop(skate, [skate[0] + 7, skate[1]], 10, P), { tone: "hi" }));
  return out.join("");
}

function armSwing(phi) {
  const [px, py] = PIVOT;
  const F = G.frameAlong([px, py, ARM_Z], [-Math.sin(phi), Math.cos(phi), 0]);
  const R = (x, y) => rotArm(x, y, phi);
  const A = (x, y, z) => at([...R(x, y), z]);
  const slab = (plan, z, h, steps, bevel) => k.extrude(k.ringOf(plan, steps).map(([x, y]) => R(x, y)), z, h, P, { convex: true, bevel });
  const back = [
    S(G.disc(-34, -12, 5, F, P), { tone: "mid" }),
    S(G.disc(-64, -34, 17, F, P, { bevel: 0.6 }), { tone: "mid" }),
    k.fadedSvg(G.ribsOf(F, -61, -37, 17, 56, P, { fade: [0.05, 0.5], seams: true }), { tone: "lo" }),
    S(G.disc(-70, -64, 6, F, P), { tone: "mid" }),
  ].join("");
  const front = [
    S(slab({ x: px - 6, y: py + SHELL[0] + 6, w: 12, d: 18, r: 1 }, ARM_Z - 12, 9, 3, 0.3), { tone: "lo" }),
    L(k.pathOf([A(px, py + SHELL[0] + 22, ARM_Z - 12), A(px, py + SHELL[0] + 25, REC_TOP + 0.3)]), { tone: "hi" }),
    D([A(px, py + SHELL[0] + 25, REC_TOP + 0.3)], { size: 0.5, tone: "hi" }),
    S(G.disc(12, SHELL[0] + 2, ARM_R, F, P), { tone: "hi", crease: "none" }),
    L(G.arcOf(F, 22, ARM_R, P), { tone: "lo" }),
    S(slab({ x: px - 10, y: py + SHELL[0], w: 20, d: SHELL[1] - SHELL[0], r: 2.5 }, ARM_Z - 3, 4, 4, 0.4), { tone: "mid" }),
    D([A(px - 5, py + SHELL[0] + 10, ARM_Z + 1), A(px + 5, py + SHELL[0] + 10, ARM_Z + 1)], { size: 0.45 }),
    S(slab({ x: px + 10, y: py + SHELL[1] - 10, w: 12, d: 4, r: 1 }, ARM_Z, 1.2, 2, 0), { tone: "mid" }),
  ].join("");
  return { back, front };
}
const ARM_FRAMES = Array.from({ length: ARM_STEPS + 1 }, (_, i) => armSwing((i / ARM_STEPS) * PLAY_PHI));

function tonearm() {
  return tonearmBase() + `<g data-part="arm-back">${ARM_FRAMES[0].back}</g>` + tonearmTower() + `<g data-part="arm-front">${ARM_FRAMES[0].front}</g>`;
}

function fader() {
  const out = [];
  out.push(S(k.slabOf(FADER, 0, 0.8, P, 3, 0.3), { tone: "lo" }));
  const slot = { x: FADER_X - 2, y: FADER_MID - FADER_HALF - 6, w: 4, d: FADER_HALF * 2 + 12, r: 2 };
  out.push(S(k.slabOf(slot, 0.8, 0.01, P, 4), { tone: "faint", flat: true }));
  out.push(L(k.planOutline(slot, 0.8, P, 4), { tone: "lo" }));
  const ticks = k.topTicks(FADER_MID - FADER_HALF, FADER_MID + FADER_HALF, FADER_HALF / PITCH_RANGE, 4, FADER.x + 1.5, 0.8, [3, 6], P, "y");
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(L(k.lineOnTop([FADER.x + 1.5, FADER_MID], [FADER.x + 9, FADER_MID], 0.8, P), { tone: "hi" }));
  out.push(D([at([FADER.x + 4, FADER.y + 3, 0.8]), at([FADER.x + 4, FADER.y + FADER.d - 3, 0.8])], { size: 0.4 }));
  const plan = { x: FADER_X - 8, y: FADER_MID - 7, w: 16, d: 14, r: 2 };
  const cap = [S(k.slabOf(plan, 0.8, 8, P, 4, 0.6), { tone: "mid" }), L([-3.5, 0, 3.5].map((dy) => k.lineOnTop([plan.x, FADER_MID + dy], [plan.x + plan.w, FADER_MID + dy], 8.8, P)).join(""), { tone: "lo" })];
  out.push(`<g data-part="cap">${cap.join("")}</g>`);
  return out.join("");
}

function buttons() {
  const out = [];
  const start = { x: -224, y: 144, w: 44, d: 28, r: 2.5 };
  out.push(S(k.slabOf(start, 0, 4, P, 4, 0.6), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(start, 3.5), 4, P, 4), { tone: "faint" }));
  out.push(`<path data-start d="${k.slabOf(k.insetPlan(start, -3), 0, 7, P).fill}" fill="transparent" stroke="none"/>`);
  for (const [x, speed] of [[-170, 33], [-144, 45]]) {
    const plan = { x, y: 156, w: 20, d: 15, r: 1.5 };
    out.push(S(k.slabOf(plan, 0, 3, P, 3, 0.4), { tone: "mid" }));
    out.push(L([5, 8].map((dy) => k.lineOnTop([x + 5, 156 + dy], [x + (speed === 33 ? 12 : 15), 156 + dy], 3, P)).join(""), { tone: "lo", free: true }));
    out.push(`<g data-part="led${speed}">${D([at([x + 15, 160.5, 3])], { size: 0.7, tone: speed === 33 ? "hi" : "lo" })}</g>`);
    out.push(`<path data-speed="${speed}" d="${k.slabOf(k.insetPlan(plan, -3), 0, 6, P).fill}" fill="transparent" stroke="none"/>`);
  }
  return out.join("");
}

function strobeLamp() {
  const lamp = [-108, 168];
  return [
    S(k.cylinder(lamp[0], lamp[1], 9, 0, 3, P, 28), { tone: "lo" }),
    S(k.cylinder(lamp[0], lamp[1], 6.5, 3, 9, P, 28, 0.4), { tone: "mid" }),
    L(k.sideArc(lamp[0], lamp[1], 6.5, 8, P, 16), { tone: "lo" }),
    S(k.cylinder(lamp[0], lamp[1], 4, 12, 1, P, 20), { tone: "hi" }),
  ].join("");
}

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "A direct-drive turntable seen from the front right, which comes apart into layers: rubber base and feet with the power transformer, drive board, operating board and pitch control on it; the die-cast chassis with the motor's stator, the strobe lamp and the controls; the platter with its rotor; the rubber mat and record; and the tonearm. The platter turns clockwise, and the strobe dots on its rim stand still at their speeds.",
  body: [
    part("feet", "", feet()),
    part("base", "", base()),
    part("power", "", transformer()),
    part("drive", "", driveBoard()),
    part("operate", "", operateBoard()),
    part("pitch", "", pitchControl()),
    part("drive", "", wires()),
    part("chassis", "chassis", chassis()),
    part("motor", "chassis", stator()),
    `<g data-part="tip-low"></g>`,
    part("platter", "platter", platterBody()),
    `<g data-part="tip-mid"></g>`,
    part("mat", "mat", matAndRecord()),
    `<g data-part="tip-high"></g>`,
    part("arm", "arm", tonearm()),
    part("pitch", "chassis", fader()),
    part("operate", "chassis", buttons()),
    part("strobe", "chassis", strobeLamp()),
  ],
});

const live = `
const P = ${JSON.stringify(P)};
const C = ${JSON.stringify(C)};
const PLATTER_R = ${PLATTER_R}, REC_TOP = ${REC_TOP}, LABEL_R = ${LABEL_R}, SPINDLE_TOP = ${SPINDLE_TOP}, COILS = ${COILS}, PLATTER_TOP = ${PLATTER_TOP};
const COIL_TOPS = ${JSON.stringify(COIL_TOPS)};
const ROWS = ${JSON.stringify(ROWS.map((row) => ({ ...row, pitch: rowPitch(row.n, row.base) })))};
const RIDES = ${JSON.stringify(RIDES)};
const FLASH = ${FLASH}, RANGE = ${PITCH_RANGE}, HALF = ${FADER_HALF};
const ARM_FRAMES = ${JSON.stringify(ARM_FRAMES)}, ARM_STEPS = ${ARM_STEPS}, ARM_LIFT = ${ARM_LIFT};
${DYNAMIC}
const root = document.querySelector(".tt");
try { if (matchMedia("(pointer:coarse)").matches) { const h = root.querySelector('[data-corner="hint"]'); if (h) h.textContent = "Tap the deck to take it apart"; } } catch {}
const stage = root.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const $ = (name) => svg.querySelector('[data-part="' + name + '"]');
const dotsG = $("dots"), labelG = $("label"), capG = $("cap"), tabG = $("vrtab"), coilsP = $("coils"), halo = $("lift-halo"), chHalo = $("chassis-halo");
const tips = { low: $("tip-low"), mid: $("tip-mid"), high: $("tip-high") };
const armBackG = $("arm-back"), armFrontG = $("arm-front"), stopBtn = root.querySelector("[data-stop-btn]");
let running = true, armT = 0, armGoal = 0, armIdx = 0, needle = false;
const smooth = (x) => x * x * (3 - 2 * x);
const riders = Object.keys(RIDES).map((name) => ({ name, els: [...svg.querySelectorAll('[data-ride="' + name + '"]')] }));
const partButtons = [...root.querySelectorAll(".tt-part")];
const chips = [...root.querySelectorAll(".tt-chip")];
const chipInfo = root.querySelector("[data-chip-info]");
const PARTS = ${JSON.stringify(PARTS)};
const pitchIn = root.querySelector("#tt-pitch"), pitchOut = root.querySelector("[data-pitch-out]"), apartBtn = root.querySelector("[data-apart-btn]"), speedBtns = [...root.querySelectorAll("[data-speed-btn]")];
const groups = [...svg.querySelectorAll("[data-asm]")];
const readout = root.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const TOUR = [[0, 0], [8, 1], [17, 0]];
const TOUR_LEN = 22;
const SPEEDS = { 33: 100 / 3, 45: 45 };
const ORDER = { chassis: 0, arm: 1, platter: 2, mat: 3 };
let speed = 33;
const led33 = svg.querySelector('[data-part="led33"] .iso-dots'), led45 = svg.querySelector('[data-part="led45"] .iso-dots');
const tourAt = (t) => { let p = TOUR[0]; for (const step of TOUR) if (t >= step[0]) p = step; return p; };
let theta = 0, rpm = SPEEDS[33], pitch = 0, pitchTarget = 0, cap = 0;
const springs = Object.fromEntries(Object.keys(RIDES).map((name) => [name, { at: 0, rate: 0, goal: 0, wait: 0 }]));
let apart = 0, focus = "", pinned = "";
const phases = ROWS.map(() => 0);
let frame = 0, last = 0, clock = 0, touring = true, visible = false, idleTimer = 0;
function setApart(next) {
  if (next === apart) return;
  apart = next;
  sfx.apart(next);
  const names = Object.keys(ORDER).sort((a, b) => (next ? ORDER[b] - ORDER[a] : ORDER[a] - ORDER[b]));
  names.forEach((name, i) => { springs[name].goal = next * RIDES[name].lift; springs[name].wait = i * 0.09; });
  root.toggleAttribute("data-apart", !!next);
}
function setFocus(name) {
  if (name && name !== focus) sfx.tick(name);
  focus = name;
  stage.toggleAttribute("data-focus", !!name);
  groups.forEach((g) => g.toggleAttribute("data-on", g.getAttribute("data-asm") === name));
  partButtons.forEach((b) => b.toggleAttribute("data-on", b.dataset.part === name));
  chips.forEach((c) => { c.toggleAttribute("data-on", c.dataset.part === name); c.setAttribute("aria-pressed", String(c.dataset.part === name)); });
  const info = PARTS.find((p) => p.id === name);
  chipInfo.textContent = info ? info.spec : "Tap a part to pick it out.";
}
const lifted = (name) => { let z = 0, n = name; while (n) { z += springs[n].at; n = RIDES[n].parent; } return z; };
function apparent(omega, n) {
  const step = omega / FLASH, gap = (Math.PI * 2) / n;
  return (step - gap * Math.round(step / gap)) * FLASH;
}
function draw() {
  for (const { name, els } of riders) { const t = translateAlong(P, [0, 0, lifted(name)]); els.forEach((el) => el.setAttribute("transform", t)); }
  capG.setAttribute("transform", translateAlong(P, [0, (cap / RANGE) * HALF, 0]));
  tabG.setAttribute("transform", translateAlong(P, [0, (cap / RANGE) * HALF, 0]));
  halo.setAttribute("opacity", (clamp(springs.platter.at / 60, 0, 1) * 0.8).toFixed(3));
  chHalo.setAttribute("opacity", (clamp(springs.chassis.at / 90, 0, 1) * 0.7).toFixed(3));
  const ch = lifted("chassis"), pl = lifted("platter"), mt = lifted("mat");
  const top = SPINDLE_TOP + ch;
  tips.low.innerHTML = "";
  tips.mid.innerHTML = spindleSeg(PLATTER_TOP + pl, Math.min(PLATTER_TOP + mt, top), PLATTER_TOP + mt >= top);
  tips.high.innerHTML = spindleSeg(REC_TOP + 0.2 + mt, top, true);
  const swing = smooth(clamp(armT - 1, 0, 1)), liftK = armT < 1 ? armT : armT <= 2 ? 1 : 3 - armT;
  const idx = Math.round(swing * ARM_STEPS);
  if (idx !== armIdx) { armIdx = idx; armBackG.innerHTML = ARM_FRAMES[idx].back; armFrontG.innerHTML = ARM_FRAMES[idx].front; }
  const armLift = translateAlong(P, [0, 0, smooth(clamp(liftK, 0, 1)) * ARM_LIFT]);
  armBackG.setAttribute("transform", armLift); armFrontG.setAttribute("transform", armLift);
  const down = armT >= 3 - 1e-6;
  if (down && !needle) sfx.drop();
  needle = down; root.toggleAttribute("data-needle", needle); root.toggleAttribute("data-running", running);
  sfx.update(rpm, speed, pitchTarget, needle);
  const omega = (rpm / 60) * Math.PI * 2;
  let html = "", locked = -1;
  ROWS.forEach((row, i) => {
    const lock = Math.abs(apparent(omega, row.n)) < 0.012;
    if (lock) locked = i;
    html += rowDots(phases[i], row.n, row.z, lock ? "lit" : "mid");
  });
  dotsG.innerHTML = html;
  labelG.innerHTML = labelMarks(theta);
  coilsP.setAttribute("d", coilPath(theta));
  const sign = pitch > 0.05 ? "+" : pitch < -0.05 ? "\\u2212" : "";
  const fmt = (v) => (v > 0 ? "+" : "\\u2212") + Math.abs(v).toFixed(1) + "%";
  const target = SPEEDS[speed] * (1 + pitch / 100);
  const lock = !running ? (rpm < 0.05 ? "stopped" : "braking") : Math.abs(rpm - target) > 0.006 ? (rpm < target ? "speeding up" : "slowing down") : Math.abs(pitch) < 0.05 ? "quartz lock" : locked >= 0 ? fmt(ROWS[locked].pitch) + " row still" : "strobe drifting";
  led33.setAttribute("data-tone", speed === 33 ? "hi" : "lo");
  led45.setAttribute("data-tone", speed === 45 ? "hi" : "lo");
  const text = (speed === 33 ? "33\\u2153" : "45") + " \\u00b7 " + sign + Math.abs(pitch).toFixed(1) + "% \\u00b7 " + rpm.toFixed(2) + " rpm \\u00b7 " + lock;
  if (readout.textContent !== text) readout.textContent = text;
  if (!sliding && document.activeElement !== pitchIn) pitchIn.value = pitchTarget.toFixed(1);
  pitchOut.textContent = (pitchTarget > 0.05 ? "+" : pitchTarget < -0.05 ? "\\u2212" : "") + Math.abs(pitchTarget).toFixed(1) + "%";
  speedBtns.forEach((b) => b.setAttribute("aria-pressed", String(Number(b.dataset.speedBtn) === speed)));
  apartBtn.setAttribute("aria-pressed", String(!!apart));
  apartBtn.textContent = apart ? "Put it back" : "Take it apart";
  if (stopBtn && stopBtn.dataset.state !== String(running)) { stopBtn.dataset.state = String(running); stopBtn.innerHTML = (running ? '<svg class="tt-ico" viewBox="0 0 16 16" aria-hidden="true"><rect x="3.5" y="3.5" width="9" height="9" rx="1" fill="currentColor"/></svg><span>Stop</span>' : '<svg class="tt-ico" viewBox="0 0 16 16" aria-hidden="true"><path d="M5 3l8 5-8 5z" fill="currentColor"/></svg><span>Start</span>'); }
  stage.setAttribute("aria-valuenow", pitch.toFixed(1));
  stage.setAttribute("aria-valuetext", text + (apart ? ", taken apart" : ""));
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  const calm = still.matches;
  if (touring) { clock = (clock + dt) % TOUR_LEN; setApart(tourAt(clock)[1]); }
  cap = cap + (pitchTarget - cap) * (1 - Math.exp(-dt / 0.22));
  if (Math.abs(pitchTarget - cap) < 0.002) cap = pitchTarget;
  pitch = cap;
  const want = running ? SPEEDS[speed] * (1 + pitch / 100) : 0;
  rpm = running ? rpm + (want - rpm) * (1 - Math.exp(-dt / 0.35)) : Math.max(0, rpm - (rpm / 0.3 + 4) * dt);
  armGoal = (sfx.available ? sfx.isOn() : running) ? 3 : 0;
  if (armT !== armGoal) { const step = (armT < 1 || armT >= 2 ? 1 / 0.3 : 1 / 0.85) * dt; armT = armGoal > armT ? Math.min(armGoal, armT + step) : Math.max(armGoal, armT - step); }
  const omega = (rpm / 60) * Math.PI * 2;
  theta = (theta + omega * dt) % (Math.PI * 2);
  ROWS.forEach((row, i) => { phases[i] = (phases[i] + apparent(omega, row.n) * dt) % (Math.PI * 2); });
  for (const s of Object.values(springs)) {
    if (calm) { s.at = s.goal; s.rate = 0; s.wait = 0; continue; }
    if (s.wait > 0) { s.wait -= dt; continue; }
    for (let i = 0; i < 4; i++) { s.rate += ((s.goal - s.at) * 70 - s.rate * 16.7) * dt / 4; s.at += s.rate * dt / 4; }
    if (s.at < 0) { s.at = 0; s.rate = 0; }
  }
  draw();
  frame = visible ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const hold = () => { touring = false; clearTimeout(idleTimer); idleTimer = setTimeout(() => { touring = !still.matches; clock = 0; run(); }, 6000); run(); };
const setPitch = (p) => { const v = clamp(p, -RANGE, RANGE); pitchTarget = Math.abs(v) < 0.35 ? 0 : v; hold(); };
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); else { cancelAnimationFrame(frame); frame = 0; } }, { rootMargin: "120px 0px" }).observe(stage);
if (still.matches) touring = false;

stage.addEventListener("click", (event) => {
  const button = event.target.closest("[data-speed]");
  if (button) speed = Number(button.getAttribute("data-speed"));
  else if (event.target.closest("[data-start]")) setRunning(!running);
  else setApart(apart ? 0 : 1);
  hold();
});
stage.addEventListener("keydown", (event) => {
  const step = event.shiftKey ? 0.1 : 0.5;
  if (event.key === "ArrowUp" || event.key === "ArrowLeft") { event.preventDefault(); setPitch(pitchTarget - step); }
  else if (event.key === "ArrowDown" || event.key === "ArrowRight") { event.preventDefault(); setPitch(pitchTarget + step); }
  else if (event.key === "Home" || event.key === "0") { event.preventDefault(); setPitch(0); }
  else if (event.key === "3") { event.preventDefault(); speed = 33; hold(); }
  else if (event.key === "4" || event.key === "5") { event.preventDefault(); speed = 45; hold(); }
  else if (event.key === " " || event.key === "Enter") { event.preventDefault(); setApart(apart ? 0 : 1); hold(); }
  else if (event.key === "s" || event.key === "S") { event.preventDefault(); setRunning(!running); }
  else if (event.key === "Escape") { event.preventDefault(); setApart(0); setFocus(""); pinned = ""; hold(); }
});
let sliding = false;
const pitchFromX = (x) => { const r = pitchIn.getBoundingClientRect(), pad = 14; return Math.round((clamp((x - r.left - pad) / Math.max(1, r.width - pad * 2), 0, 1) * 2 - 1) * RANGE * 10) / 10; };
const slideTo = (x) => { const v = pitchFromX(x); pitchIn.value = String(Math.abs(v) < 0.5 ? 0 : v); setPitch(Number(pitchIn.value)); };
pitchIn.addEventListener("pointerdown", (e) => {
  sliding = true;
  if (e.pointerType === "mouse") return;
  e.preventDefault();
  try { pitchIn.setPointerCapture(e.pointerId); } catch {}
  slideTo(e.clientX);
});
pitchIn.addEventListener("pointermove", (e) => { if (sliding && e.pointerType !== "mouse") { e.preventDefault(); slideTo(e.clientX); } });
["pointerup", "pointercancel", "lostpointercapture"].forEach((t) => pitchIn.addEventListener(t, () => { sliding = false; }));
pitchIn.addEventListener("input", () => setPitch(Number(pitchIn.value)));
apartBtn.addEventListener("click", () => { setApart(apart ? 0 : 1); hold(); });
function setRunning(v) { running = v; sfx.press(); stopBtn && stopBtn.setAttribute("aria-pressed", String(!v)); hold(); }
if (stopBtn) stopBtn.addEventListener("click", () => setRunning(!running));
speedBtns.forEach((b) => b.addEventListener("click", () => { speed = Number(b.dataset.speedBtn); hold(); }));
chips.forEach((chip) => {
  const name = chip.dataset.part;
  chip.addEventListener("click", () => {
    pinned = pinned === name ? "" : name;
    setFocus(pinned);
    if (pinned) { setApart(1); try { chip.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" }); } catch {} }
    hold();
  });
});
partButtons.forEach((button) => {
  const name = button.dataset.part;
  button.addEventListener("pointerenter", () => setFocus(name));
  button.addEventListener("pointerleave", () => setFocus(pinned));
  button.addEventListener("focus", () => setFocus(name));
  button.addEventListener("blur", () => setFocus(pinned));
  button.addEventListener("click", () => { pinned = pinned === name ? "" : name; setFocus(pinned || name); setApart(1); hold(); });
});
const musicEl = document.getElementById("tt-music");
const soundBtn = root.querySelector("[data-sound-btn]");
const SPK = (on) => '<svg class="tt-ico" viewBox="0 0 16 16" aria-hidden="true"><path d="M2 6h3l4-3v10l-4-3H2z" fill="currentColor"/>' + (on ? '<path d="M11 5.5a3.5 3.5 0 0 1 0 5M12.8 3.5a6 6 0 0 1 0 9" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>' : '<path d="M11 6l4 4M15 6l-4 4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>') + '</svg>';
const sfx = (() => {
  let ctx = null, master, music = null, musicGain = null, motorGain = null, motor, noise, on = false, lastSpeed = null, lastPitch = null, slideAt = 0;
  const env = (g, t, a, peak, d) => { g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); };
  function burst({ at = 0, lo = 1500, hi = 6000, peak = 0.3, a = 0.002, d = 0.03 }) {
    const t = ctx.currentTime + at, src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(), c = Math.sqrt(lo * hi);
    src.buffer = noise; f.type = "bandpass"; f.frequency.value = c; f.Q.value = c / (hi - lo); env(g, t, a, peak, d);
    src.connect(f).connect(g).connect(master); src.start(t, Math.random() * 0.5); src.stop(t + a + d + 0.05);
  }
  function tone({ at = 0, f0, f1 = f0, peak = 0.2, a = 0.001, d = 0.012 }) {
    const t = ctx.currentTime + at, o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + a + d); env(g, t, a, peak, d);
    o.connect(g).connect(master); o.start(t); o.stop(t + a + d + 0.05);
  }
  const click = () => { burst({ peak: 0.35, d: 0.012 }); tone({ f0: 2600, peak: 0.12, d: 0.006 }); };
  async function start() {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = 0.85; master.connect(ctx.destination);
    noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const nd = noise.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    motor = ctx.createOscillator(); motor.type = "sawtooth";
    const mf = ctx.createBiquadFilter(), mg = ctx.createGain(); motorGain = mg; mf.type = "lowpass"; mf.frequency.value = 320; mg.gain.value = 0.025;
    motor.connect(mf).connect(mg).connect(master); motor.start();
    const bin = atob(musicEl.textContent.trim()), bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const buf = await ctx.decodeAudioData(bytes.buffer);
    music = ctx.createBufferSource(); music.buffer = buf; music.loop = true;
    const gain = ctx.createGain(); gain.gain.value = 0; musicGain = gain; music.connect(gain).connect(master);
    music.playbackRate.value = Math.max(0.001, rpm / (100 / 3)); music.start();
  }
  const label = () => { soundBtn.setAttribute("aria-pressed", String(on)); soundBtn.innerHTML = SPK(on) + "<span>" + (on ? "Sound: on" : "Sound: off") + "</span>"; };
  return {
    available: !!musicEl,
    async toggle() {
      on = !on; label();
      try { if (on) { if (!ctx) await start(); else await ctx.resume(); click(); } else if (ctx) await ctx.suspend(); }
      catch { on = false; label(); }
    },
    isOn: () => on,
    press() { if (on && ctx) click(); },
    drop() { if (!on || !ctx) return; tone({ f0: 95, f1: 45, peak: 0.3, a: 0.002, d: 0.09 }); burst({ lo: 1500, hi: 7000, peak: 0.07, d: 0.06 }); },
    update(rpmNow, speedNow, target, down) {
      if (!on || !ctx) return;
      const r = rpmNow / (100 / 3), now = ctx.currentTime;
      if (music) { music.playbackRate.cancelScheduledValues(now); music.playbackRate.value = Math.max(0.01, r); }
      if (musicGain) musicGain.gain.setTargetAtTime(down ? 0.8 * Math.min(1, r / 0.12) : 0, now, 0.04);
      motorGain.gain.setTargetAtTime(0.025 * Math.min(1, r), now, 0.05);
      motor.frequency.cancelScheduledValues(now); motor.frequency.value = Math.max(1, 96 * r);
      if (lastSpeed !== null && speedNow !== lastSpeed) click();
      lastSpeed = speedNow;
      if (lastPitch !== null && Math.abs(target - lastPitch) > 0.05 && now - slideAt > 0.25) { slideAt = now; burst({ lo: 900, hi: 3200, peak: 0.12, a: 0.12, d: 0.2 }); }
      lastPitch = target;
    },
    apart(next) {
      if (!on || !ctx) return;
      click();
      for (let i = 0; i < 4; i++) {
        if (next) burst({ at: i * 0.09, lo: 300, hi: 2400, peak: 0.14 - i * 0.02, a: 0.2, d: 0.3 });
        else { tone({ at: 0.35 + i * 0.11, f0: 130, f1: 70, peak: 0.45 - i * 0.06, a: 0.002, d: 0.14 }); burst({ at: 0.35 + i * 0.11, lo: 200, hi: 1800, peak: 0.12, d: 0.01 }); }
      }
    },
    tick(name) {
      if (!on || !ctx) return;
      const i = partButtons.findIndex((b) => b.dataset.part === name);
      tone({ f0: 1100 * 2 ** (i / 24), peak: 0.16, d: 0.012 });
    },
  };
})();
if (sfx.available) soundBtn.addEventListener("click", () => sfx.toggle());
else soundBtn.hidden = true;
draw();
`;

const css = `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fragment+Mono&family=Schibsted+Grotesk:wght@400;500;700&display=swap"><style>
.iso-dots[data-tone="lit"] circle{fill:var(--anatomy-lit);opacity:1}
[data-speed],[data-start]{cursor:pointer}
.tt{--tt-sans:"Schibsted Grotesk",ui-sans-serif,system-ui,sans-serif;--tt-mono:"Fragment Mono",ui-monospace,SFMono-Regular,Menlo,monospace;display:grid;grid-template-columns:minmax(0,1fr) minmax(240px,300px);gap:20px 32px;align-items:start;font-family:var(--tt-sans)}
.tt-head{grid-column:1/-1;display:grid;gap:6px;padding-block:8px 4px}
.tt-eyebrow{font:400 11px/1 var(--tt-mono);letter-spacing:.14em;text-transform:uppercase;color:var(--anatomy-muted)}
.tt-head h1{margin:0;font:700 clamp(28px,4.6vw,44px)/1.02 var(--tt-sans);letter-spacing:-.025em;color:var(--anatomy-strong);text-wrap:balance}
.tt-specs{display:flex;flex-wrap:wrap;gap:6px 18px;margin:4px 0 0;padding:0;list-style:none;font:400 12px/1.4 var(--tt-mono);color:var(--anatomy-text)}
.tt-specs b{font-weight:400;color:var(--anatomy-strong)}
.tt-main{min-width:0;display:grid;gap:14px}
.tt .iso-figure{margin:0;min-width:0}
.tt [data-asm]{transition:opacity .25s ease}
.tt .iso-stage[data-focus] [data-asm]:not([data-on]){opacity:.14}
.tt-controls{margin:10px 0 12px;display:flex;flex-wrap:wrap;align-items:center;gap:12px 22px;padding:12px 14px;border-top:1px solid var(--anatomy-faint);border-bottom:1px solid var(--anatomy-faint)}
.tt-label{font:400 10.5px/1 var(--tt-mono);letter-spacing:.12em;text-transform:uppercase;color:var(--anatomy-muted)}
.tt-seg{display:inline-flex;gap:0;border:1px solid var(--anatomy-lo);border-radius:4px;overflow:hidden}
.tt-seg button,.tt-apart{all:unset;cursor:pointer;font:500 13px/1 var(--tt-mono);color:var(--anatomy-text);padding:8px 12px;font-variant-numeric:tabular-nums}
.tt-seg button+button{border-left:1px solid var(--anatomy-lo)}
.tt-seg button[aria-pressed="true"]{background:var(--anatomy-strong);color:var(--anatomy-page)}
@media (hover:hover){.tt-seg button:hover:not([aria-pressed="true"]),.tt-apart:hover{background:var(--anatomy-card)}}
.tt-seg button:active,.tt-apart:active{transform:translateY(1px)}
.tt-pitch{display:flex;align-items:center;gap:10px;flex:1 1 200px;min-width:0}
.tt-pitch input{flex:1;min-width:0;accent-color:var(--anatomy-strong);touch-action:pan-y}
.tt-controls button,.tt-controls input,.tt .iso-stage{touch-action:manipulation;-webkit-tap-highlight-color:transparent}
.tt-pitch input{touch-action:pan-y}
.tt-pitch output{font:500 13px/1 var(--tt-mono);color:var(--anatomy-strong);min-width:4.2em;text-align:right;font-variant-numeric:tabular-nums}
.tt-apart{border:1px solid var(--anatomy-lo);border-radius:4px;margin-left:auto}
.tt-apart.tt-stop{margin-left:0;display:inline-flex;align-items:center;gap:7px}
.tt-apart.tt-sound{margin-left:0;display:inline-flex;align-items:center;gap:7px}
.tt-ico{width:15px;height:15px;flex:none}
.tt-sound[aria-pressed="true"]{background:var(--anatomy-card);color:var(--anatomy-strong);border-color:var(--anatomy-strong)}
.tt-apart[aria-pressed="true"]{border-color:var(--anatomy-strong);color:var(--anatomy-strong)}
.tt-seg button:focus-visible,.tt-apart:focus-visible,.tt-pitch input:focus-visible{outline:1px solid var(--anatomy-strong);outline-offset:2px}
.tt-side{min-width:0;position:sticky;top:calc(env(safe-area-inset-top,0px) + 16px)}
.tt-side h2{margin:0 0 4px;font:400 11px/1 var(--tt-mono);letter-spacing:.14em;text-transform:uppercase;color:var(--anatomy-strong)}
.tt-side p{margin:6px 0 14px;font-size:12.5px;line-height:1.5;color:var(--anatomy-muted)}
.tt-parts{list-style:none;margin:0;padding:0;border-top:1px solid var(--anatomy-faint)}
.tt-parts li{border-bottom:1px solid var(--anatomy-faint)}
.tt-part{all:unset;box-sizing:border-box;display:grid;grid-template-columns:28px minmax(0,1fr) auto;column-gap:8px;align-items:baseline;width:100%;padding:9px 8px;cursor:pointer;color:var(--anatomy-text)}
.tt-part:hover,.tt-part:focus-visible,.tt-part[data-on]{background:var(--anatomy-card)}
.tt-part[data-on] .tt-num{color:var(--anatomy-strong)}
.tt-part:focus-visible{outline:1px solid var(--anatomy-mid);outline-offset:-1px}
.tt-num{font:400 11px/1.5 var(--tt-mono);color:var(--anatomy-muted);font-variant-numeric:tabular-nums}
.tt-name{font:500 14px/1.35 var(--tt-sans);color:var(--anatomy-strong)}
.tt-fig{font:400 11.5px/1.5 var(--tt-mono);color:var(--anatomy-text);white-space:nowrap;font-variant-numeric:tabular-nums}
.tt-spec{grid-column:2/-1;font-size:12.5px;line-height:1.5;color:var(--anatomy-muted);display:grid;grid-template-rows:0fr;transition:grid-template-rows .25s ease}
.tt-spec>span{overflow:hidden}
.tt-part:hover .tt-spec,.tt-part:focus-visible .tt-spec,.tt-part[data-on] .tt-spec{grid-template-rows:1fr;margin-top:3px}
.tt-mobile{display:none}
.tt-chips{display:flex;gap:6px;overflow-x:auto;scroll-snap-type:x proximity;padding:2px 0 6px;scrollbar-width:none;-webkit-overflow-scrolling:touch}
.tt-chips::-webkit-scrollbar{display:none}
.tt-chip{all:unset;box-sizing:border-box;flex:none;scroll-snap-align:center;display:inline-flex;align-items:baseline;gap:6px;padding:7px 12px;border:1px solid var(--anatomy-lo);border-radius:999px;font:500 13px/1.2 var(--tt-sans);color:var(--anatomy-text);cursor:pointer;white-space:nowrap}
.tt-chip b{font:400 11px/1 var(--tt-mono);color:var(--anatomy-muted)}
.tt-chip[data-on]{background:var(--anatomy-strong);border-color:var(--anatomy-strong);color:var(--anatomy-page)}
.tt-chip[data-on] b{color:var(--anatomy-page)}
.tt-chip:focus-visible{outline:1px solid var(--anatomy-strong);outline-offset:2px}
.tt-chip-info{margin:4px 2px 0;font-size:13px;line-height:1.45;color:var(--anatomy-muted);min-height:2.9em}
@media (max-width:880px),(pointer:coarse){
.tt-controls{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:12px 10px;padding:4px 0 14px;border-top:0}
.tt-controls>.tt-label{display:none}
.tt-seg{grid-column:span 4;order:-2;display:grid;grid-template-columns:1fr 1fr}
.tt-seg button{min-width:0;text-align:center}
.tt-controls button{white-space:nowrap;min-width:0}
.tt .iso-plate{padding:40px 12px 64px}
.tt .iso-plate-corner[data-corner="hint"]{bottom:22px;left:0;right:0;white-space:normal;letter-spacing:.06em}
.tt .iso-plate-corner[data-corner="readout"]{left:0;right:auto;bottom:0;letter-spacing:0}
.tt-seg button,.tt-apart{box-sizing:border-box;min-height:44px;display:inline-flex;align-items:center;justify-content:center;padding:0 14px;font-size:14px}
.tt-apart{margin-left:0;order:1;width:100%}
.tt-pitch{grid-column:1/-1;order:0;gap:12px}
.tt-controls .tt-stop{grid-column:span 2;order:-1}
.tt-controls .tt-sound,.tt-controls [data-apart-btn]{grid-column:span 3}
.tt-pitch input{-webkit-appearance:none;appearance:none;height:44px;background:transparent;margin:0}
.tt-pitch input::-webkit-slider-runnable-track{height:4px;border-radius:2px;background:var(--anatomy-lo)}
.tt-pitch input::-webkit-slider-thumb{-webkit-appearance:none;width:28px;height:28px;margin-top:-12px;border-radius:50%;background:var(--anatomy-strong);border:3px solid var(--anatomy-page);box-shadow:0 0 0 1px var(--anatomy-strong)}
.tt-pitch input::-moz-range-track{height:4px;border-radius:2px;background:var(--anatomy-lo)}
.tt-pitch input::-moz-range-thumb{width:22px;height:22px;border-radius:50%;background:var(--anatomy-strong);border:3px solid var(--anatomy-page)}
.tt-pitch output{font-size:14px}
}
@media (max-width:600px){
.tt .iso-stage{--anatomy-weight:.95px}
[data-theme="light"] .tt .iso-line[data-tone="lo"]{stroke:#98989e}
[data-theme="light"] .tt .iso-line[data-tone="faint"]{stroke:#c2c2c6}
[data-theme="dark"] .tt .iso-line[data-tone="lo"]{stroke:#585858}
[data-theme="dark"] .tt .iso-line[data-tone="faint"]{stroke:#383838}
.tt .iso-dots circle{opacity:.5}
}
@media (max-width:880px){.tt-mobile{display:block}.tt-side{display:none}.tt{grid-template-columns:minmax(0,1fr)}.tt-side{position:static}.tt-spec{grid-template-rows:1fr;margin-top:3px}.tt-apart{margin-left:0}}
@media (prefers-reduced-motion:reduce){.tt [data-asm],.tt-spec{transition:none}}
</style>`;

const plate = k.plateHtml({
  fig: "Fig 1",
  title: "Direct-drive turntable",
  hint: "Click the deck to take it apart",
  readout: "33⅓ · 0.0% · 33.33 rpm · quartz lock",
  keys: [
    { mark: "lit", label: "Strobe row that stands still: the platter is at that row’s speed" },
    { mark: "raised", label: "Platter, turning clockwise; the deck comes apart in layers" },
    { mark: "edge", label: "Twelve stator coils, switched in three phases" },
  ],
  caption:
    "There is no belt: the spindle is the motor’s own shaft and the platter carries its rotor magnet, so twelve coils on the chassis push it round directly, while a frequency-generator ring reports the speed back to the quartz servo on the drive board. The strobe flashes 120 times a second, and a row of dots stands still only when the platter turns one dot per flash: 216 dots at 33⅓, 160 at 45, with neighbouring rows for about ±3% on each speed. The layers and figures follow the service manual of the classic direct-drive DJ deck this one is modelled on.",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Turntable: arrow keys change the pitch, 3 and 4 pick 33 or 45 rpm, space takes it apart, Escape puts it back" aria-valuemin="-8" aria-valuemax="8" aria-valuenow="0">${svg}</div>`,
});

const list = PARTS.map((p, i) => `<li><button type="button" class="tt-part" data-part="${p.id}"><span class="tt-num">${String(i + 1).padStart(2, "0")}</span><span class="tt-name">${p.name}</span><span class="tt-fig">${p.fig}</span><span class="tt-spec"><span>${p.spec}</span></span></button></li>`).join("");
const side = `<aside class="tt-side" aria-label="Parts"><h2>Parts</h2><p>Bottom to top. Hover a part to pick it out; click to pin it and take the deck apart.</p><ol class="tt-parts">${list}</ol></aside>`;
const head = `<header class="tt-head"><span class="tt-eyebrow">Teardown · Fig 1</span><h1>Direct-drive turntable</h1><ul class="tt-specs"><li><b>Quartz</b>-locked direct drive</li><li><b>33⅓ · 45</b> rpm</li><li><b>±8%</b> pitch</li><li><b>0.7 s</b> to speed</li><li><b>230 mm</b> tonearm</li></ul></header>`;
const controls = `<div class="tt-controls"><button type="button" class="tt-apart tt-sound" data-sound-btn aria-pressed="false"><svg class="tt-ico" viewBox="0 0 16 16" aria-hidden="true"><path d="M2 6h3l4-3v10l-4-3H2z" fill="currentColor"/><path d="M11 6l4 4M15 6l-4 4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg><span>Sound: off</span></button><span class="tt-label">Speed</span><span class="tt-seg" role="group" aria-label="Speed"><button type="button" data-speed-btn="33" aria-pressed="true">33⅓</button><button type="button" data-speed-btn="45" aria-pressed="false">45</button></span><button type="button" class="tt-apart tt-stop" data-stop-btn aria-pressed="false"><svg class="tt-ico" viewBox="0 0 16 16" aria-hidden="true"><rect x="3.5" y="3.5" width="9" height="9" rx="1" fill="currentColor"/></svg><span>Stop</span></button><label class="tt-pitch" for="tt-pitch"><span class="tt-label">Pitch</span><input id="tt-pitch" type="range" min="-8" max="8" step="0.1" value="0" list="tt-detents"><output data-pitch-out>0.0%</output></label><datalist id="tt-detents"><option value="0"></option></datalist><button type="button" class="tt-apart" data-apart-btn aria-pressed="false">Take it apart</button></div>`;
const soundArg = process.argv.find((a) => a.startsWith("--sound="));
const music = soundArg ? `<script type="text/plain" id="tt-music">${readFileSync(soundArg.slice(8)).toString("base64")}</script>` : "";
const chipRow = `<div class="tt-mobile"><div class="tt-chips" role="group" aria-label="Parts">${PARTS.map((p, i) => `<button type="button" class="tt-chip" data-part="${p.id}" aria-pressed="false"><b>${String(i + 1).padStart(2, "0")}</b>${p.name}</button>`).join("")}</div><p class="tt-chip-info" data-chip-info aria-live="polite">Tap a part to pick it out.</p></div>`;
const plateWithChips = plate.replace("<figcaption", `${controls}${chipRow}<figcaption`);
const body = `${css}<div class="tt">${head}<div class="tt-main">${plateWithChips}</div>${side}</div>${music}`;

const name = theme === "light" ? "turntable-light.html" : "turntable.html";
writeFileSync(join(HERE, name), k.pageHtml({ title: "Direct-drive turntable", theme, body, script: kitScript() + live, width: 1000 }));
console.log("wrote", name);
