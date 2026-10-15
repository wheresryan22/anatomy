import assert from "node:assert/strict";
import test from "node:test";
import { markupBox } from "../kit/audit.mjs";

const close = (observed, expected, name) => {
  assert.equal(observed.length, 4, name);
  expected.forEach((value, i) => assert.ok(Math.abs(observed[i] - value) < 0.01, `${name} bound ${i}: ${observed[i]} != ${value}`));
};

for (const [name, markup, expected] of [
  ["semicircle swept clockwise", '<path d="M0 0A5 5 0 0 1 10 0"/>', [0, -5, 10, 0]],
  ["semicircle swept counterclockwise", '<path d="M0 0A5 5 0 0 0 10 0"/>', [0, 0, 10, 5]],
  ["relative arc", '<path d="M0 0a5 5 0 0 1 10 0"/>', [0, -5, 10, 0]],
  ["arc flags written without separators", '<path d="M0 0a5 5 0 1010 0"/>', [0, 0, 10, 5]],
  ["large arc past a half turn", '<path d="M0 0A10 10 0 1 1 10 0"/>', [-5, -18.66, 15, 0]],
  ["radii too small are scaled up", '<path d="M0 0A1 1 0 0 1 10 0"/>', [0, -5, 10, 0]],
  ["rotated ellipse", '<path d="M0 0A10 2 90 0 1 4 0"/>', [0, -10, 4, 0]],
  ["arc inside a rotated group", '<g transform="rotate(90)"><path d="M0 0A5 5 0 0 1 10 0"/></g>', [0, 0, 5, 10]],
  ["arc after a line", '<path d="M0 0L10 0A5 5 0 0 1 20 0"/>', [0, -5, 20, 0]],
  ["zero radius is a straight line", '<path d="M0 0A0 5 0 0 1 10 0"/>', [0, 0, 10, 0]],
]) test(`markupBox bounds the bulge of an elliptical arc: ${name}`, () => close(markupBox(markup), expected, name));
