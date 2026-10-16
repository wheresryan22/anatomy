import assert from "node:assert/strict";
import test from "node:test";
import * as G from "../kit/lathe.mjs";
import { turning } from "../kit/turn-build.mjs";
import { TURN } from "../kit/turn.mjs";
const ribsDrawn = (make) => {
  const T = turning({ origin: [150, 150], scale: 10, azimuth: 45, elevation: 30 }); T.layer("all");
  const dial = T.group("dial", { turn: { pivot: [0, 0] } });
  make(T, dial);
  const scene = TURN.prepare(T.build({ poses: [{ dial: 0 }] }).data, { unit: 1 });
  const run = scene.runs[0];
  const f = TURN.emit(run, TURN.cams(scene, { dial: 30 })[run.group], TURN.frame(run));
  return run.roles.filter((role, i) => /^r\d+$/.test(role.name) && f.d[i] && !/NaN/.test(f.d[i])).length;
};
const ribs = { s0: 0.5, s1: 3.5, count: 40 };
const profile = [[0, 3], [2, 3.4], [4, 3]];
test("ribs on a lathe are drawn like ribs on a round", () => {
  for (const [F, fixed] of [[G.frameAlong([0, 0, 0], [0, 0, 1]), undefined], [G.frameAlong([0, 0, 0], [0, 0, 1]), false], [G.frameAlong([0, 0, 5], [1, 0, 0]), undefined]]) {
    const round = ribsDrawn((T, group) => T.round({ name: "knob", group, F, s0: 0, s1: 4, r: 3, fixed, details: { ribs } }));
    const lathe = ribsDrawn((T, group) => T.lathe({ name: "knob", group, F, profile, fixed, details: { ribs } }));
    assert.ok(round > 0);
    assert.equal(lathe, round);
  }
});
test("lathe ribs take their radius from the profile unless given one", () => {
  const T = turning({ origin: [150, 150], scale: 10, azimuth: 45, elevation: 30 }); T.layer("all");
  const F = G.frameAlong([0, 0, 5], [1, 0, 0]);
  assert.deepEqual(T.lathe({ name: "a", F, profile, details: { ribs } }).details.ribs, { ...ribs, r0: 3.1, r1: 3.1 });
  assert.deepEqual(T.lathe({ name: "b", F, profile, details: { ribs: { ...ribs, r0: 2.5 } } }).details.ribs, { ...ribs, r0: 2.5, r1: 3.1 });
});
