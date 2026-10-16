import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import test from "node:test";
import { fixedScript, turnScript } from "./inline-kit.mjs";

const execute = promisify(execFile);
const sourcePage = "examples/turning-dial/turning-dial-verify-light.html";

async function buildCanvasPage(dir) {
  let html = await readFile(sourcePage, "utf8");
  html = html.replace(turnScript(), fixedScript());
  html = html.replace(
    "const controller = TURN.mount(stage, DATA.turn, {",
    'let canvasPainter = null;\nconst controller = TURN.mount(stage, DATA.turn, {\n  painter: "canvas",',
  );
  html = html.replace(
    "    show(value);\n    paint();\n  },\n});",
    "    show(value);\n    if (canvasPainter) canvasPainter.paint();\n    paint();\n  },\n});\ncanvasPainter = CANVAS2D.mount(stage, controller);\ncanvasPainter.paint();",
  );
  const pagePath = join(dir, "turning-dial-canvas.html");
  await writeFile(pagePath, html);
  const statesPath = join(dir, "states.json");
  await writeFile(statesPath, JSON.stringify([0, 90, 180, 270]));
  return { pagePath, statesPath };
}

test("turn-check --order, --pops, --lines, and --perf pass on a painter: canvas page", async () => {
  const dir = await mkdtemp(join(tmpdir(), "anatomy-turn-check-canvas-"));
  try {
    const { pagePath, statesPath } = await buildCanvasPage(dir);
    const { stdout } = await execute(
      process.execPath,
      ["scripts/turn-check.mjs", pagePath, "--order", "--pops", "--lines", "--perf", "--states", statesPath],
      { timeout: 120000 },
    );
    assert.match(stdout, /live layers lock, dial, hand/);
    assert.match(stdout, /order control.*fails as it should/);
    assert.match(stdout, /order: 4 states · 0 with a live pair drawn out of order/);
    assert.match(stdout, /pops control.*fails as it should/);
    assert.match(stdout, /pops, first difference: 4 steps · 0 with a surviving region/);
    assert.match(stdout, /lines control \(a planted floating line\): fails as it should/);
    assert.match(stdout, /lines: 24 angles · 0 floating ends/);
    assert.match(stdout, /0 live elements · 0 writes and 0 moves per frame/);
    assert.match(stdout, /turn check passed/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
