import assert from "node:assert/strict";
import test from "node:test";
import * as G from "../kit/lathe.mjs";
import { turning } from "../kit/turn-build.mjs";
const prism = (polygon, options = {}) => {
  const T = turning({ origin: [0, 0], scale: 1, azimuth: 45, elevation: 30 }); T.layer("all");
  const F = G.frameAlong([0, 0, 0], [0, 0, 1]);
  return T.prism({ name: "part", F, s0: 0, s1: 2, polygon, ...options });
};
const regular = (count, step, radius = 3) => Array.from({ length: count }, (_, i) => [radius * Math.cos(Math.PI / 2 + i * step), radius * Math.sin(Math.PI / 2 + i * step)]);
test("a pentagram is not a convex prism", () => {
  assert.throws(() => prism(regular(5, (4 * Math.PI) / 5)), /part is not convex/);
});
test("a heptagram is not a convex prism, in either winding", () => {
  assert.throws(() => prism(regular(7, (4 * Math.PI) / 7)), /part is not convex/);
  assert.throws(() => prism(regular(7, (4 * Math.PI) / 7).reverse()), /part is not convex/);
});
test("a bowtie and an L shape are still rejected", () => {
  assert.throws(() => prism([[0, 0], [2, 2], [2, 0], [0, 2]]), /part is not convex/);
  assert.throws(() => prism([[0, 0], [4, 0], [4, 1], [1, 1], [1, 4], [0, 4]]), /part is not convex/);
});
test("convex polygons are still accepted, whichever way they wind", () => {
  for (const polygon of [regular(3, (2 * Math.PI) / 3), regular(5, (2 * Math.PI) / 5), regular(12, (2 * Math.PI) / 12), regular(6, (2 * Math.PI) / 6).reverse(), [[0, 0], [5, 0], [10, 0], [10, 10], [0, 10]]]) {
    assert.equal(prism(polygon).world.ring.length, polygon.length);
  }
  assert.ok(prism([[0, 0], [10, 0], [10, 10], [0, 10]], { round: 2, steps: 6 }).world.ring.length > 4);
});
test("a repeated vertex does not make a convex polygon look concave", () => {
  assert.equal(prism([[0, 0], [4, 0], [4, 0], [4, 4], [0, 4], [0, 0]]).world.ring.length, 4);
});
