import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

test("dial-indicator live script subscribes to reduced motion preference changes", () => {
  const dialScript = readFileSync(resolve("examples/dial-indicator/dial-indicator.html"), "utf8");
  assert.ok(dialScript.includes('still.addEventListener("change"'), "must register change listener on still");
  assert.ok(dialScript.includes("finishMotion()"), "must call finishMotion on preference change");
});

test("desk-computer and push-button live scripts register finishMotion change listener", () => {
  const pushScript = readFileSync(resolve("examples/push-button/push-button.html"), "utf8");
  assert.ok(pushScript.includes('still.addEventListener("change"'), "push-button must register change listener on still");
  const compScript = readFileSync(resolve("examples/desk-computer/desk-computer.html"), "utf8");
  assert.ok(compScript.includes('still.addEventListener("change"'), "desk-computer must register change listener on still");
});

test("motion guidance documents in-flight stillness settlement pattern", () => {
  const motionDoc = readFileSync(resolve("references/motion.md"), "utf8");
  assert.ok(motionDoc.includes("finishMotion"), "references/motion.md must document finishMotion");
  assert.ok(motionDoc.includes('still.addEventListener("change"'), "references/motion.md must show change listener pattern");
});
