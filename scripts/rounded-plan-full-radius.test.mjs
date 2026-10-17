import assert from "node:assert/strict";
import { test } from "node:test";
import { roundedPlan, slabOf } from "../kit/iso-kit.mjs";

const projection = { origin: [100, 100], scale: 5, azimuth: 45, elevation: 30 };
const pieces = (path) => (path.match(/M/g) ?? []).length;

test("a plan whose radius fills its short side repeats no vertex", () => {
  const ring = roundedPlan({ x: 0, y: 0, w: 10, d: 30, r: 5 }, 8);
  ring.forEach((point, index) => {
    const next = ring[(index + 1) % ring.length];
    assert.ok(Math.hypot(point[0] - next[0], point[1] - next[1]) > 1e-9);
  });
});

test("a slab with the full radius draws the same outline pieces as one a hair under it", () => {
  const full = slabOf({ x: 0, y: 0, w: 10, d: 10, r: 5 }, 0, 4, projection, 8);
  const near = slabOf({ x: 0, y: 0, w: 10, d: 10, r: 4.9999 }, 0, 4, projection, 8);
  assert.equal(pieces(full.outline), pieces(near.outline));
  assert.equal(pieces(full.crease), pieces(near.crease));
});

test("a radius larger than half the side is clamped without splitting the outline", () => {
  const clamped = slabOf({ x: 0, y: 0, w: 10, d: 10, r: 99 }, 0, 4, projection, 8);
  const full = slabOf({ x: 0, y: 0, w: 10, d: 10, r: 5 }, 0, 4, projection, 8);
  assert.equal(clamped.outline, full.outline);
  assert.equal(pieces(clamped.outline), 4);
});
