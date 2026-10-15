import assert from "node:assert/strict";
import test from "node:test";
import { turning } from "../kit/turn-build.mjs";
import { TURN } from "../kit/turn.mjs";
import { orbit, samplesOf } from "../kit/turn-audit.mjs";
const clip = (from, to) => ({ from, to, periodic: false });
const P = { origin: [150, 150], scale: 10, azimuth: 45, elevation: 30 };
const R = { items: [], solids: [], tubes: [], routes: [] };
test("a clip is sampled through its final instant and never past it", () => {
  for (const [from, to, frame] of [[0, 1, 0.4], [0, 1, 0.3], [0, 0.42, 1 / 60], [0.5, 1.01, 1 / 60], [0, 2.5, 4 / 60]]) {
    const xs = samplesOf(clip(from, to), frame);
    assert.equal(xs[0], from);
    assert.equal(xs[xs.length - 1], to);
    assert.ok(xs.every((x, i) => x >= from && x <= to && (i === 0 || x > xs[i - 1])), `${from}..${to} by ${frame}: ${xs}`);
    assert.ok(xs.every((x, i) => i === 0 || x - xs[i - 1] <= frame + 1e-9));
  }
});
test("a clip whose length is a whole number of frames keeps its frames", () => {
  assert.deepEqual(samplesOf(clip(0, 1), 0.25), [0, 0.25, 0.5, 0.75, 1]);
  assert.equal(samplesOf(clip(0, 1), 1 / 60).length, 61);
  assert.equal(samplesOf(clip(0, 1.5), 1 / 60).length, 91);
});
test("an empty clip has a single sample", () => {
  assert.deepEqual(samplesOf(clip(2, 2), 1 / 60), [2]);
});
test("a periodic sweep still stops one frame short of the repeat", () => {
  const xs = samplesOf({ from: 0, to: 360, periodic: true }, 90);
  assert.deepEqual(xs, [0, 90, 180, 270]);
  assert.equal(samplesOf({ from: 0, to: 360, periodic: true }, 0.3).length, 1200);
});
test("orbit never evaluates a short or partial-frame clip outside its [from, to] range", () => {
  const T = turning(P);
  T.layer("parts");
  const g = T.group("hinge", { hinge: { point: [0, 0, 0], axis: [1, -1, 0], range: [0, 0] } });
  T.prism({ name: "post", group: null, plan: { x: 0, y: 0, w: 4, d: 4, r: 0 }, z: 0, h: 4 });
  T.prism({ name: "arm", group: g, plan: { x: -3, y: -3, w: 6, d: 4, r: 0 }, z: 0, h: 3 });
  T.build();
  const seenShort = [];
  const seenRagged = [];
  orbit(T, R, P, {
    only: ["order", "continuity"],
    random: 10,
    clips: [
      {
        name: "short",
        from: 0.2,
        to: 0.205,
        frame: 1,
        at: (t) => {
          seenShort.push(t);
          return { hinge: ((t - 0.2) / 0.005) * 90 };
        },
      },
      {
        name: "ragged",
        from: 0,
        to: 1,
        frame: 0.4,
        at: (t) => {
          seenRagged.push(t);
          return { hinge: t < 0.8 ? 0 : ((t - 0.8) / 0.2) * 90 };
        },
      },
    ],
  });
  assert.ok(seenShort.includes(0.2) && seenShort.includes(0.205));
  assert.ok(seenShort.every((t) => t >= 0.2 && t <= 0.205), `short clip sampled out of bounds: ${seenShort}`);
  assert.ok(seenRagged.includes(0) && seenRagged.includes(1));
  assert.ok(seenRagged.every((t) => t >= 0 && t <= 1), `ragged clip sampled out of bounds: ${seenRagged}`);
});
test("continuity catches a step jump in a clip's final partial frame at its actual step start", () => {
  const T = turning(P);
  T.layer("parts");
  const g = T.group("hinge", { hinge: { point: [0, 0, 0], axis: [1, 0, 0], range: [0, 0] } });
  T.prism({ name: "arm", group: g, plan: { x: 0, y: 0, w: 6, d: 4, r: 0 }, z: 0, h: 3 });
  T.build();
  const result = orbit(T, R, P, {
    only: ["continuity"],
    clips: [
      {
        name: "pop",
        from: 0,
        to: 1,
        frame: 0.4,
        at: (t) => ({ hinge: t < 0.9 ? (t / 0.8) * 40 : 30 }),
      },
    ],
  });
  const hit = result.continuity.find((f) => f.group === "pop" && f.part === "arm");
  assert.ok(hit, `expected continuity failure in final partial frame, got ${JSON.stringify(result.continuity)}`);
  assert.equal(hit.at, 0.8);
});
test("continuity sweeps hinge and slide groups through their end without stepping past it", () => {
  const T = turning(P);
  T.layer("parts");
  const hinge = T.group("flap", { hinge: { point: [0, 0, 0], axis: [1, 0, 0], range: [0, 0.12] } });
  const lockedHinge = T.group("lockedFlap", { hinge: { point: [0, 0, 0], axis: [1, 0, 0], range: [5, 5] } });
  const slide = T.group("carriage", { slide: { direction: [1, 0, 0], travel: 0.025 } });
  const lockedSlide = T.group("lockedCarriage", { slide: { direction: [1, 0, 0], travel: 0 } });
  T.prism({ name: "flapArm", group: hinge, plan: { x: 0, y: 0, w: 4, d: 2, r: 0 }, z: 0, h: 1 });
  T.prism({ name: "lockedArm", group: lockedHinge, plan: { x: 8, y: 0, w: 4, d: 2, r: 0 }, z: 0, h: 1 });
  T.prism({ name: "sled", group: slide, plan: { x: 0, y: 8, w: 4, d: 2, r: 0 }, z: 0, h: 1 });
  T.prism({ name: "lockedSled", group: lockedSlide, plan: { x: 8, y: 8, w: 4, d: 2, r: 0 }, z: 0, h: 1 });
  T.build();
  const seen = { flap: [], lockedFlap: [], carriage: [], lockedCarriage: [] };
  const origCams = TURN.cams;
  TURN.cams = (scene, values) => {
    for (const key of Object.keys(seen)) if (values && key in values && values[key] !== null) seen[key].push(values[key]);
    return origCams(scene, values);
  };
  try {
    orbit(T, R, P, { only: ["continuity"], step: 0.05 });
  } finally {
    TURN.cams = origCams;
  }
  assert.ok(seen.flap.includes(0) && seen.flap.includes(0.12));
  assert.ok(seen.flap.every((v) => v >= 0 && v <= 0.12), `flap out of bounds: ${seen.flap}`);
  assert.ok(seen.lockedFlap.every((v) => v === 0 || v === 5), `lockedFlap stepped outside [5, 5]: ${seen.lockedFlap}`);
  assert.ok(!seen.lockedFlap.some((v) => v > 5));
  assert.ok(seen.carriage.includes(0) && seen.carriage.includes(0.025));
  assert.ok(seen.carriage.every((v) => v >= 0 && v <= 0.025), `carriage out of bounds: ${seen.carriage}`);
  assert.ok(seen.lockedCarriage.every((v) => v === 0), `lockedCarriage stepped outside [0, 0]: ${seen.lockedCarriage}`);
});
