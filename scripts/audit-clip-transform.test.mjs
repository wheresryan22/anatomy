import assert from "node:assert/strict";
import test from "node:test";
import * as A from "../kit/audit.mjs";
import { turning } from "../kit/turn-build.mjs";
const P = { origin: [0, 0], scale: 1, azimuth: 45, elevation: 30 };
const chrome = [
  ["translated clipPath", '<defs><clipPath id="c" transform="translate(30,0)"><rect width="10" height="10"/></clipPath></defs><rect x="25" width="20" height="10" clip-path="url(#c)"/>', [30, 0, 40, 10]],
  ["scaled clipPath around a translated child", '<defs><clipPath id="c" transform="scale(2)"><rect transform="translate(10,0)" width="10" height="10"/></clipPath></defs><rect width="60" height="60" clip-path="url(#c)"/>', [20, 0, 40, 20]],
  ["rotated clipPath", '<defs><clipPath id="c" transform="rotate(90)"><rect y="-30" width="10" height="20"/></clipPath></defs><rect width="60" height="60" clip-path="url(#c)"/>', [10, 0, 30, 10]],
  [
    "translated clipPath used inside a translated group",
    '<defs><clipPath id="c" transform="translate(10,0)"><rect width="10" height="10"/></clipPath></defs><g transform="translate(20,20)"><rect width="40" height="40" clip-path="url(#c)"/></g>',
    [30, 20, 40, 30],
  ],
  [
    "plain clipPath after a translated one",
    '<defs><clipPath id="a" transform="translate(30,0)"><rect width="10" height="10"/></clipPath><clipPath id="b"><rect width="10" height="10"/></clipPath></defs><rect width="60" height="60" clip-path="url(#a)"/><rect y="40" width="60" height="60" clip-path="url(#b)"/>',
    [30, 0, 40, 10],
  ],
];
chrome.forEach(([name, markup, box]) =>
  test(`markupBox clips through the clipPath's own transform: ${name}`, () => {
    assert.deepEqual(A.markupBox(markup), box);
    const T = turning(P);
    T.layer("figure");
    const part = T.fixed({ name: "fixed", svg: markup, anchor: [0, 0, 0], shapes: [A.ball([0, 0, 0], 50)] });
    assert.deepEqual(part.spec.box, box.map((v, j) => v + (j < 2 ? -0.5 : 0.5)));
  }),
);
test("coverage sees a part drawn through a translated clipPath", () => {
  const cam = A.cameraBasis(P);
  const F = { o: [0, 0, 0], a: cam.V, u: cam.R, v: cam.D };
  const square = [[30, 0], [40, 0], [40, 10], [30, 10]].map((p) => p.map((v) => v / cam.k));
  assert.equal(A.coverage([{ name: "plane", svg: chrome[0][1], shapes: [A.ball([0, 0, 0], 0.01)] }], P).length, 1);
  assert.deepEqual(A.coverage([{ name: "plane", svg: chrome[0][1], shapes: [A.prism(F, square, 0, 0.01)] }], P), []);
});
