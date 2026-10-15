import assert from "node:assert/strict";
import test from "node:test";
import { markupBox } from "../kit/audit.mjs";

for (const [name, d, native, hull] of [
  ["smooth cubic after a cubic", "M0 0C0 10 10 10 10 0S20 0 20 0", [0, -4.4444, 20, 7.5], [0, -10, 20, 10]],
  ["relative smooth cubic", "M0 0C0 10 10 10 10 0s10 0 10 0", [0, -4.4444, 20, 7.5], [0, -10, 20, 10]],
  ["smooth quadratic after a quadratic", "M0 0Q5 10 10 0T20 0", [0, -5, 20, 5], [0, -10, 20, 10]],
  ["relative smooth quadratic", "M0 0Q5 10 10 0t10 0", [0, -5, 20, 5], [0, -10, 20, 10]],
  ["chained smooth quadratics", "M0 0Q5 10 10 0T20 0T30 0", [0, -5, 30, 5], [0, -10, 30, 10]],
  ["smooth cubic after a line has no reflection", "M0 0L10 0S20 -9 20 0", [0, -4, 20, 0], [0, -9, 20, 0]],
  ["smooth quadratic after a line has no reflection", "M0 0Q5 10 10 0L20 0T30 0", [0, 0, 30, 5], [0, 0, 30, 10]],
]) test(`markupBox contains the curve a smooth command draws: ${name}`, () => {
  const box = markupBox(`<path d="${d}"/>`);
  assert.deepEqual(box.map((v) => Math.round(v * 1e6) / 1e6), hull);
  assert.ok(box[0] <= native[0] && box[1] <= native[1] && box[2] >= native[2] && box[3] >= native[3], `${box} must contain native ${native}`);
});
