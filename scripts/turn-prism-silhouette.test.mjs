import assert from "node:assert/strict";
import test from "node:test";
import * as G from "../kit/lathe.mjs";
import { roundedPolygon, turning } from "../kit/turn-build.mjs";
import { TURN } from "../kit/turn.mjs";
const square = [[0, 0], [4, 0], [4, 4], [0, 4]];
const outline = (polygon, F) => {
  const T = turning({ origin: [150, 150], scale: 10, azimuth: 45, elevation: 30 }); T.layer("all");
  const group = T.group("dial", { turn: { pivot: [0, 0] } });
  T.prism({ name: "block", group, F, s0: 0, s1: 3, polygon });
  const scene = TURN.prepare(T.build({ poses: [{ dial: 0 }] }).data, { unit: 1 });
  const run = scene.runs[0];
  return (deg) => TURN.emit(run, TURN.cams(scene, { dial: deg })[run.group], TURN.frame(run)).d[run.role.fill];
};
test("a repeated vertex is dropped from a sharp-cornered polygon", () => {
  assert.deepEqual(roundedPolygon([[0, 0], [4, 0], [4, 0], [4, 4], [0, 4], [0, 0]]), square);
});
test("a repeated vertex does not cut a corner off a sharp prism's outline", () => {
  for (const F of [G.frameAlong([0, 0, 0], [0, 0, 1]), G.frameAlong([0, 0, 5], G.unit3([0.3, 0, 1]))]) {
    const clean = outline(square, F);
    for (const polygon of [[...square, [0, 0]], [[0, 0], [4, 0], [4, 0], [4, 4], [0, 4]]]) {
      const repeated = outline(polygon, F);
      for (let deg = 0; deg < 360; deg += 5) assert.equal(repeated(deg), clean(deg), `dial ${deg}`);
    }
  }
});
