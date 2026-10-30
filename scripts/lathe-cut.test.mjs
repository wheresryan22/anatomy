import assert from "node:assert/strict";
import test from "node:test";
import { cut, len3, sub3 } from "../kit/lathe.mjs";
import { tubePieces } from "../kit/tube.mjs";

const line = [[0, 0, 0], [2, 0, 0], [4, 0, 0], [6, 0, 0]];
const repeated = (points) => points.some((p, index) => index > 0 && len3(sub3(p, points[index - 1])) === 0);

test("cut emits no repeated point when a boundary lands on a vertex", () => {
  assert.deepEqual(cut(line, 2, 5), [[2, 0, 0], [4, 0, 0], [5, 0, 0]]);
  assert.deepEqual(cut(line, 1, 4), [[1, 0, 0], [2, 0, 0], [4, 0, 0]]);
  assert.deepEqual(cut(line, 2, 4), [[2, 0, 0], [4, 0, 0]]);
  assert.deepEqual(cut(line, 0, 6), line);
  assert.deepEqual(cut([[0, 0, 0], [2, 0, 0], [2, 0, 0], [4, 0, 0]], 1, 3), [[1, 0, 0], [2, 0, 0], [3, 0, 0]]);
});

test("cut keeps a single point for an empty span and the path ends", () => {
  assert.deepEqual(cut(line, 3, 3), [[3, 0, 0]]);
  assert.deepEqual(cut(line, 2, 2), [[2, 0, 0]]);
  assert.deepEqual(cut(line, 0, 0), [[0, 0, 0]]);
  assert.deepEqual(cut(line, 6, 6.01), [[6, 0, 0]]);
  assert.deepEqual(cut(line, 7, 8), []);
});

test("a gap that lands on a vertex leaves elliptical caps on both sides", () => {
  const P = { origin: [200, 200], scale: 4, azimuth: 45, elevation: 30 };
  const pieces = tubePieces([[0, 0, 0], [20, 0, 0]], 1, P, { spacing: 2, gaps: [[4, 10]] });
  assert.equal(pieces.length, 2);
  for (const piece of pieces) {
    assert.equal(repeated(piece.points), false);
    const rings = piece.body.split("M").slice(2);
    assert.equal(rings.length, 2);
    for (const ring of rings) {
      const numbers = ring.match(/-?\d+(?:\.\d+)?/g).map(Number);
      const xs = numbers.filter((_, index) => index % 2 === 0);
      const ys = numbers.filter((_, index) => index % 2 === 1);
      assert.ok(Math.max(...xs) - Math.min(...xs) > 1, `cap width ${ring.slice(0, 40)}`);
      assert.ok(Math.max(...ys) - Math.min(...ys) > 1, `cap height ${ring.slice(0, 40)}`);
    }
  }
});
