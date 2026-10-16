import assert from "node:assert/strict";
import test from "node:test";
import * as G from "../kit/lathe.mjs";
import { turning } from "../kit/turn-build.mjs";
const near = (a, b) => a.every((x, i) => Math.abs(x - b[i]) < 1e-6);
const ball = (options) => {
  const T = turning({ origin: [150, 150], scale: 10, azimuth: 45, elevation: 30 }); T.layer("all");
  return T.ball({ name: "spinner", c: [0, 0, 6], r: 4, ...options });
};
test("bolts on a ball's flat face the way the flat does", () => {
  const n = G.unit3([1, 1, 1]);
  const part = ball({ flats: [{ n, d: 1 }], details: { bolts: [{ s: 1, r: 2.5, count: 6 }] } });
  assert.equal(part.dots.length, 6);
  for (const dot of part.dots) assert.ok(near(dot.n, n), `${dot.n}`);
});
test("bolts on a ball's dome take the sphere's normal", () => {
  for (const options of [{ flats: [{ n: [1, 0, 0], d: 2 }] }, { fixed: false }]) {
    const part = ball({ ...options, details: { bolts: [{ s: -2, r: Math.sqrt(12), count: 5, phase: 0.3 }] } });
    assert.equal(part.dots.length, 5);
    for (const dot of part.dots) assert.ok(near(dot.n, G.unit3([dot.p[0], dot.p[1], dot.p[2] - 6])), `${dot.n}`);
  }
});
