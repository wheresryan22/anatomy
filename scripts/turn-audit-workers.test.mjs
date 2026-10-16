import assert from "node:assert/strict";
import test from "node:test";
import * as k from "../kit/iso-kit.mjs";
import * as A from "../kit/audit.mjs";
import * as G from "../kit/lathe.mjs";
import { turning } from "../kit/turn-build.mjs";
import { orbit, orbitReport, orbitFailures, orbitOrExit } from "../kit/turn-audit.mjs";

const stripTiming = (result) => ({
  ...result,
  stats: { ...result.stats, seconds: 0 },
});

const stripReportTiming = (text) => text.replace(/turn audit · \d+\.\d+ s/g, "turn audit · 0.00 s");

function cleanScene() {
  const P = k.fitProjection(
    [
      [-40, -40, 0],
      [40, 40, 40],
    ],
    72,
    54,
    { pad: 6, azimuth: 42, elevation: 30 },
  );
  const R = A.recorder(P);
  const T = turning(P, { recorder: R });
  const dial = T.group("dial", { turn: { pivot: [0, 0] } });
  const arm = T.group("arm", { parent: dial, hinge: { point: [0, 0, 14], axis: [1, 0, 0], range: [-15, 0] } });
  const live = T.layer("live");
  T.stack(["back", "live", "front"]);
  const basePlan = { x: -28, y: -28, w: 56, d: 56, r: 4 };
  R.put({
    name: "stand.base",
    layer: "back",
    at: [0, 0, 0],
    svg: k.solidSvg(k.slabOf(basePlan, -6, 6, P)),
    shapes: [R.solid(A.slab(basePlan, -6, 6, { name: "stand.base", ground: true }))],
  });
  const vert = (x, y) => G.frameOf([x, y, 0], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
  T.round({
    name: "dial.platter",
    group: dial,
    layer: live,
    F: vert(0, 0),
    s0: 0,
    s1: 8,
    r: 18,
    material: "steel",
    details: { ribs: { s0: 1, s1: 7, count: 36, seams: true, tone: "lo" } },
  });
  T.prism({
    name: "dial.block",
    group: dial,
    layer: live,
    plan: { x: -6, y: -6, w: 12, d: 12, r: 1.5 },
    z: 8,
    h: 6,
    bevel: 0.6,
    material: "gold",
  });
  T.round({
    name: "arm.knuckle",
    group: arm,
    layer: live,
    F: G.frameOf([0, 0, 14], [1, 0, 0], [0, 1, 0], [0, 0, 1]),
    s0: -3,
    s1: 3,
    r: 2,
  });
  T.round({
    name: "arm.finger",
    group: arm,
    layer: live,
    F: vert(0, 0),
    s0: 16,
    s1: 24,
    r: 2,
    ends: ["flat", "dome"],
  });
  const follow = (v) => ({
    dial: v.dial ?? 0,
    arm: -15 * (v.lift ?? 0),
  });
  const poses = () => {
    const list = [];
    for (let i = 0; i < 24; i++) list.push(follow({ dial: i * 15, lift: (i % 6) / 5 }));
    return list;
  };
  T.build({ statics: R.items, poses });
  A.settle(R, P);
  return {
    T,
    R,
    P,
    options: {
      sweep: { at: (x) => follow({ dial: x }), from: 0, to: 360, frame: 15 },
      clips: [{ name: "flex", at: (t) => follow({ dial: 12 * t, lift: Math.sin(t * Math.PI) }), from: 0, to: 0.3, frame: 0.1 }],
      quick: true,
      step: 1,
      random: 20,
      depthAngles: 4,
      depthEvents: 2,
      posedStep: 45,
    },
  };
}

function faultyScene() {
  const P = k.fitProjection(
    [
      [-30, -30, 0],
      [30, 30, 30],
    ],
    72,
    54,
    { pad: 6, azimuth: 45, elevation: 30 },
  );
  const R = A.recorder(P);
  const T = turning(P, { recorder: R });
  const dial = T.group("dial", { turn: { pivot: [0, 0] } });
  const arm = T.group("arm", { parent: dial, hinge: { point: [0, 0, 6], axis: [0, 1, 0], range: [-45, 45] } });
  const live = T.layer("live");
  T.stack(["back", "live"]);
  const basePlan = { x: -24, y: -24, w: 48, d: 48, r: 2 };
  R.put({
    name: "stand.base",
    layer: "back",
    at: [0, 0, 0],
    svg: k.solidSvg(k.slabOf(basePlan, -4, 4, P)),
    shapes: [R.solid(A.slab(basePlan, -4, 4, { name: "stand.base", ground: true }))],
  });
  T.prism({
    name: "dial.wall",
    group: dial,
    layer: live,
    plan: { x: 2, y: -5, w: 6, d: 10, r: 0 },
    z: 0,
    h: 10,
  });
  T.prism({
    name: "arm.ram",
    group: arm,
    layer: live,
    plan: { x: -6, y: -3, w: 6, d: 6, r: 0 },
    z: 4,
    h: 8,
  });
  const follow = (v) => ({ dial: v.dial ?? 0, arm: v.arm ?? 0 });
  T.build({
    statics: R.items,
    poses: () => [follow({ dial: 0, arm: -45 })],
    strict: false,
  });
  const badStaticPlan = { x: -12, y: -12, w: 24, d: 24, r: 0 };
  R.put({
    name: "stand.intruder",
    layer: "back",
    at: [0, 0, 6],
    svg: k.solidSvg(k.slabOf(badStaticPlan, 4, 12, P)),
    shapes: [R.solid(A.slab(badStaticPlan, 4, 12, { name: "stand.intruder" }))],
  });
  return {
    T,
    R,
    P,
    options: {
      sweep: { at: (x) => follow({ dial: x, arm: -45 + (x / 360) * 90 }), from: 0, to: 360, frame: 15 },
      clips: [{ name: "ram", at: (t) => follow({ dial: 15 * t, arm: -45 + 30 * t }), from: 0, to: 0.3, frame: 0.1 }],
      quick: true,
      step: 1,
      random: 20,
      depthAngles: 4,
      depthEvents: 2,
      posedStep: 45,
    },
  };
}

test("orbit with worker threads matches single-threaded results and report", () => {
  const { T, R, P, options } = cleanScene();
  const singleLogs = [];
  const baseline = orbit(T, R, P, { ...options, log: (msg) => singleLogs.push(msg) });
  const baselineReport = stripReportTiming(orbitReport(baseline));

  for (const workers of [1, 2, true]) {
    const workerLogs = [];
    const parallel = orbit(T, R, P, { ...options, workers, log: (msg) => workerLogs.push(msg) });
    assert.deepEqual(stripTiming(parallel), stripTiming(baseline), `mismatch for workers=${workers}`);
    assert.equal(stripReportTiming(orbitReport(parallel)), baselineReport, `report mismatch for workers=${workers}`);
    assert.equal(orbitFailures(parallel), orbitFailures(baseline));
    assert.deepEqual(workerLogs, singleLogs, `log order mismatch for workers=${workers}`);
  }
});

test("orbit with worker threads matches single-threaded faults in deterministic order", () => {
  const { T, R, P, options } = faultyScene();
  const baseline = orbit(T, R, P, options);
  assert.ok(orbitFailures(baseline) > 0);
  assert.ok(baseline.unseparated.length > 0);
  assert.ok(baseline.posed.length > 0);
  assert.ok(baseline.layers.length > 0);
  const baselineReport = stripReportTiming(orbitReport(baseline));

  for (const workers of [2, 3]) {
    const parallel = orbit(T, R, P, { ...options, workers });
    assert.deepEqual(stripTiming(parallel), stripTiming(baseline), `fault mismatch for workers=${workers}`);
    assert.equal(stripReportTiming(orbitReport(parallel)), baselineReport, `fault report mismatch for workers=${workers}`);
  }
});

test("orbitOrExit parses --workers flags and matches single-threaded output", () => {
  const { T, R, P, options } = cleanScene();
  const capture = (argv) => {
    const lines = [];
    const origLog = console.log;
    const prevCode = process.exitCode;
    console.log = (...args) => lines.push(args.join(" "));
    try {
      const res = orbitOrExit(T, R, P, { ...options, argv });
      return { res, text: stripReportTiming(lines.join("\n")), exitCode: process.exitCode };
    } finally {
      console.log = origLog;
      process.exitCode = prevCode;
    }
  };
  const single = capture(["node", "build.mjs", "--audit"]);
  const flagAuto = capture(["node", "build.mjs", "--audit", "--workers"]);
  const flagEq = capture(["node", "build.mjs", "--audit", "--workers=2"]);
  const flagSpace = capture(["node", "build.mjs", "--audit", "--workers", "3"]);

  assert.equal(flagAuto.text, single.text);
  assert.equal(flagEq.text, single.text);
  assert.equal(flagSpace.text, single.text);
  assert.deepEqual(stripTiming(flagAuto.res), stripTiming(single.res));
  assert.deepEqual(stripTiming(flagEq.res), stripTiming(single.res));
  assert.deepEqual(stripTiming(flagSpace.res), stripTiming(single.res));
});

test("orbit rejects invalid worker counts", () => {
  const { T, R, P, options } = cleanScene();
  for (const bad of [0, -1, 1.5, NaN, "abc", "0", ""]) {
    assert.throws(() => orbit(T, R, P, { ...options, workers: bad }), /orbit: workers must be a positive integer or true/);
  }
  for (const badArg of ["--workers=0", "--workers=-2", "--workers=abc", "--workers="]) {
    assert.throws(
      () => orbitOrExit(T, R, P, { ...options, argv: ["node", "build.mjs", "--audit", badArg] }),
      /orbit: workers must be a positive integer or true/,
    );
  }
});
