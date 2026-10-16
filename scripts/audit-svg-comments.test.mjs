import assert from "node:assert/strict";
import test from "node:test";
import * as A from "../kit/audit.mjs";
import { turning } from "../kit/turn-build.mjs";
const P = { origin: [0, 0], scale: 1, azimuth: 45, elevation: 30 };
const chrome = [
  ["commented-out shape", '<rect width="10" height="10"/><!-- <rect x="50" y="50" width="10" height="10"/> -->', [0, 0, 10, 10]],
  ["greater-than inside a comment", '<rect width="10" height="10"/><!-- a > b <rect x="50" y="50" width="10" height="10"/> -->', [0, 0, 10, 10]],
  ["commented-out group across lines", '<rect width="10" height="10"/><!--\n<g transform="translate(40,40)">\n<rect width="10" height="10"/></g>\n-->', [0, 0, 10, 10]],
  ["commented-out clipPath end", '<defs><clipPath id="c"><rect width="10" height="10"/><!-- </clipPath> --><rect x="20" width="10" height="10"/></clipPath></defs><rect width="40" height="10" clip-path="url(#c)"/>', [0, 0, 30, 10]],
  ["commented-out group end", '<g transform="translate(20,0)"><!-- </g> --><rect width="10" height="10"/></g>', [20, 0, 30, 10]],
  ["markup inside CDATA", '<style><![CDATA[ /* <rect x="50" y="50" width="10" height="10"/> */ ]]></style><rect width="10" height="10"/>', [0, 0, 10, 10]],
  ["comment delimiters inside attribute values", '<rect data-x="<!--" width="10" height="10"/><rect x="20" y="20" width="10" height="10"/><rect data-y="-->" width="1" height="1"/>', [0, 0, 30, 30]],
];
chrome.forEach(([name, markup, box]) =>
  test(`markupBox skips what Chrome does not draw: ${name}`, () => {
    assert.deepEqual(A.markupBox(markup), box);
    const T = turning(P);
    T.layer("figure");
    const part = T.fixed({ name: "fixed", svg: markup, anchor: [0, 0, 0], shapes: [A.ball([0, 0, 0], 50)] });
    assert.deepEqual(part.spec.box, box.map((v, j) => v + (j < 2 ? -0.5 : 0.5)));
  }),
);
test("coverage ignores a commented-out shape", () => {
  const cam = A.cameraBasis(P);
  const F = { o: [0, 0, 0], a: cam.V, u: cam.R, v: cam.D };
  const square = [[0, 0], [10, 0], [10, 10], [0, 10]].map((p) => p.map((v) => v / cam.k));
  assert.deepEqual(A.coverage([{ name: "plane", svg: chrome[0][1], shapes: [A.prism(F, square, 0, 0.01)] }], P), []);
});
