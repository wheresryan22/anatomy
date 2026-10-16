import assert from "node:assert/strict";
import test from "node:test";
import * as A from "../kit/audit.mjs";
import { turning } from "../kit/turn-build.mjs";
const P = { origin: [0, 0], scale: 1, azimuth: 45, elevation: 30 };
const chrome = [
  ["px x", '<rect x="10px" y="20" width="30" height="40"/>', [10, 20, 40, 60]],
  ["px on every length", '<rect x="10px" y="20px" width="30px" height="40px"/>', [10, 20, 40, 60]],
  ["upper case PX", '<rect x="10PX" y="20" width="30" height="40"/>', [10, 20, 40, 60]],
  ["exponent with px", '<rect x="1e1px" y="20" width="30" height="40"/>', [10, 20, 40, 60]],
  ["circle radius in px", '<circle cx="10" cy="10" r="5px"/>', [5, 5, 15, 15]],
  ["ellipse in px", '<ellipse cx="20px" cy="20" rx="5px" ry="3"/>', [15, 17, 25, 23]],
  ["line end in px", '<line x1="0" y1="0" x2="10px" y2="10"/>', [0, 0, 10, 10]],
  ["px rect beside a plain one", '<rect x="10" y="20" width="30" height="40"/><rect x="0" y="0" width="1px" height="1"/>', [0, 0, 40, 60]],
  ["px clip", '<defs><clipPath id="c"><rect width="10px" height="10"/></clipPath></defs><rect width="20" height="20" clip-path="url(#c)"/>', [0, 0, 10, 10]],
  ["space before px is invalid", '<rect x="10 px" y="20" width="30" height="40"/>', [0, 20, 30, 60]],
  ["trailing dot is invalid", '<rect x="10." y="20" width="30" height="40"/>', [0, 20, 30, 60]],
  ["text is invalid", '<rect x="abc" y="20" width="30" height="40"/>', [0, 20, 30, 60]],
];
chrome.forEach(([name, markup, box]) => test(`markupBox reads lengths as Chrome does: ${name}`, () => assert.deepEqual(A.markupBox(markup), box)));
test("a length markupBox cannot resolve leaves that shape out instead of poisoning the box", () => {
  assert.deepEqual(A.markupBox('<rect x="10" y="20" width="30" height="40"/><rect width="50%" height="1"/>'), [10, 20, 40, 60]);
  assert.deepEqual(A.markupBox('<rect x="10" y="20" width="30" height="40"/><circle r="1em"/>'), [10, 20, 40, 60]);
  assert.equal(A.markupBox('<rect x="1mm" width="5" height="10"/>'), null);
});
test("a clip with an unresolvable length does not hide what it clips", () => {
  assert.deepEqual(A.markupBox('<defs><clipPath id="c"><rect width="50%" height="10"/></clipPath></defs><rect width="20" height="20" clip-path="url(#c)"/>'), [0, 0, 20, 20]);
});
test("coverage and fixed parts accept px lengths", () => {
  const svg = chrome[7][1];
  assert.deepEqual(A.coverage([{ name: "px", svg, shapes: [A.ball([0, 0, 0], 500)] }], P), []);
  const T = turning(P);
  T.layer("figure");
  const part = T.fixed({ name: "fixed", svg, anchor: [0, 0, 0], shapes: [A.ball([0, 0, 0], 50)] });
  assert.deepEqual(part.spec.box, [-0.5, -0.5, 40.5, 60.5]);
});
