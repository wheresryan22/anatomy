import assert from "node:assert/strict";
import test from "node:test";
import * as G from "../kit/lathe.mjs";
import { turning } from "../kit/turn-build.mjs";
import { TURN } from "../kit/turn.mjs";

const P = { origin: [150, 150], scale: 10, azimuth: 45, elevation: 30 };

test("splitting a prism across its axis partitions seams, dots, and attached planes by axial span", () => {
  const T = turning(P);
  T.layer("all");
  const group = T.group("dial", { turn: { pivot: [0, 0] } });
  const part = T.prism({
    name: "column",
    group,
    plan: { x: 0, y: 0, w: 6, d: 6, r: 0 },
    z: 0,
    h: 10,
    details: {
      seams: [2, 8],
      dots: [
        { at: [2, 3, 0], normal: [1, 0, 0] },
        { at: [8, 3, 0], normal: [1, 0, 0] },
      ],
    },
  });
  T.plane({ part, o: [3, 0, 2], u: [0, 1, 0], v: [0, 0, 1], normal: [1, 0, 0], svg: '<path d="M0 0L1 1"/>' });
  T.billboard({ part, at: [3, 0, 8], normal: [1, 0, 0], svg: '<path d="M0 0L2 2"/>' });
  const [a, b] = T.split(part, { n: [0, 0, 1], d: 5 });
  assert.deepEqual(a.details.seams, [2]);
  assert.deepEqual(b.details.seams, [8]);
  assert.deepEqual(a.localSeams, [2]);
  assert.deepEqual(b.localSeams, [8]);
  assert.equal(a.dots.length, 1);
  assert.equal(b.dots.length, 1);
  assert.equal(a.dots[0].p[2], 2);
  assert.equal(b.dots[0].p[2], 8);
  assert.equal(a.planes.length, 1);
  assert.equal(b.planes.length, 1);
  assert.equal(a.planes[0].o[2], 2);
  assert.equal(b.planes[0].o[2], 8);
  T.build();
  const scene = TURN.prepare(T.data, { unit: 1 });
  const cams = TURN.cams(scene, { dial: 0 });
  for (const run of scene.runs) {
    const f = TURN.emit(run, cams[run.group], TURN.frame(run));
    assert.ok(run.role.inner !== undefined && f.d[run.role.inner].length > 0);
    assert.ok(run.role.c0 !== undefined && f.o[run.role.c0] > 0);
    assert.ok(run.role.plane0 !== undefined && f.t[run.role.plane0].length > 0);
  }
});

test("splitting a prism along its axis partitions dots and attached planes across the cut plane while keeping seams on both halves", () => {
  const T = turning(P);
  T.layer("all");
  const group = T.group("dial", { turn: { pivot: [0, 0] } });
  const part = T.prism({
    name: "block",
    group,
    plan: { x: -4, y: -3, w: 8, d: 6, r: 0 },
    z: 0,
    h: 6,
    details: {
      seams: [3],
      dots: [
        { at: [3, -2, 3], normal: [0, 1, 0] },
        { at: [3, 2, 3], normal: [0, 1, 0] },
      ],
    },
  });
  T.plane({ part, o: [-2, 3, 3], u: [1, 0, 0], v: [0, 0, 1], normal: [0, 1, 0], svg: '<path d="M0 0L1 1"/>' });
  T.plane({ part, o: [2, 3, 3], u: [1, 0, 0], v: [0, 0, 1], normal: [0, 1, 0], svg: '<path d="M0 0L2 2"/>' });
  const [a, b] = T.split(part, { n: [1, 0, 0], d: 0 });
  assert.deepEqual(a.details.seams, [3]);
  assert.deepEqual(b.details.seams, [3]);
  assert.equal(a.dots.length, 1);
  assert.equal(b.dots.length, 1);
  assert.equal(a.dots[0].p[0], -2);
  assert.equal(b.dots[0].p[0], 2);
  assert.equal(a.planes.length, 1);
  assert.equal(b.planes.length, 1);
  assert.equal(a.planes[0].o[0], -2);
  assert.equal(b.planes[0].o[0], 2);
});

for (const fixed of [false, true])
  test(`splitting a ${fixed ? "default upright" : "live"} round partitions seams, bolts, dots, rings, rules, ribs, and planes across both halves`, () => {
    const T = turning(P);
    T.layer("all");
    const group = T.group("dial", { turn: { pivot: [0, 0] } });
    const F = G.frameAlong([0, 0, 0], [0, 0, 1]);
    const part = T.round({
      name: "barrel",
      group,
      F,
      s0: 0,
      s1: 10,
      r: [4, 6],
      fixed,
      details: {
        seams: [2, 8],
        bolts: [
          { s: 2, r: 4.4, count: 4 },
          { s: 8, r: 5.6, count: 6 },
        ],
        dots: [
          { at: [3, 4.6, 0], normal: [1, 0, 0] },
          { at: [7, 5.4, 0], normal: [1, 0, 0] },
        ],
        rings: [
          { at: [2, 0, 0], r: 2 },
          { at: [8, 0, 0], r: 3 },
        ],
        rules: [
          { points: [[1.5, 4.3, 0], [2.5, 4.5, 0]], normal: [1, 0, 0] },
          { points: [[7.5, 5.5, 0], [8.5, 5.7, 0]], normal: [1, 0, 0] },
        ],
        ribs: { s0: 1, s1: 9, count: 8, r0: 4.2, r1: 5.8, seams: true },
      },
    });
    T.billboard({ part, at: [4.2, 0, 1], normal: [1, 0, 0], svg: '<path d="M0 0L1 1"/>' });
    T.billboard({ part, at: [5.8, 0, 9], normal: [1, 0, 0], svg: '<path d="M0 0L2 2"/>' });
    const [a, b] = T.split(part, { n: [0, 0, 1], d: 5 });
    assert.deepEqual(a.details.seams, [2]);
    assert.deepEqual(b.details.seams, [8]);
    assert.equal(a.dots.length, 5);
    assert.equal(b.dots.length, 7);
    assert.ok(a.dots.every((dot) => dot.p[2] <= 5 + 1e-6));
    assert.ok(b.dots.every((dot) => dot.p[2] > 5 - 1e-6));
    assert.equal(a.planes.length, 3);
    assert.equal(b.planes.length, 3);
    assert.ok(a.planes.every((pl) => pl.o[2] <= 5 + 1e-6));
    assert.ok(b.planes.every((pl) => pl.o[2] > 5 - 1e-6));
    assert.equal(a.details.ribs.s0, 1);
    assert.equal(a.details.ribs.s1, 5);
    assert.equal(a.details.ribs.seams, "first");
    assert.ok(Math.abs(a.details.ribs.r0 - 4.2) < 1e-9);
    assert.ok(Math.abs(a.details.ribs.r1 - 5.0) < 1e-9);
    assert.equal(b.details.ribs.s0, 5);
    assert.equal(b.details.ribs.s1, 9);
    assert.equal(b.details.ribs.seams, "last");
    assert.ok(Math.abs(b.details.ribs.r0 - 5.0) < 1e-9);
    assert.ok(Math.abs(b.details.ribs.r1 - 5.8) < 1e-9);
    const [b1, b2] = T.split(b, { n: [0, 0, 1], d: 7.5 });
    assert.deepEqual(b1.details.seams, []);
    assert.deepEqual(b2.details.seams, [8]);
    assert.equal(b1.dots.length, 1);
    assert.equal(b2.dots.length, 6);
    T.build();
    const scene = TURN.prepare(T.data, { unit: 1 });
    const cams = TURN.cams(scene, { dial: 0 });
    for (const run of scene.runs) {
      const f = TURN.emit(run, cams[run.group], TURN.frame(run));
      assert.ok(f.d[run.role.fill].length > 0);
      assert.ok(run.role.r0 !== undefined);
    }
  });
