import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import test from "node:test";

const execute = promisify(execFile);
const drive = fileURLToPath(new URL("drive.mjs", import.meta.url));
const env = { ...process.env, CHROME_PATH: process.execPath };

test("drive rejects action arguments it cannot use before it starts Chrome", async () => {
  const directory = await mkdtemp(join(tmpdir(), "anatomy-drive-action-values-"));
  try {
    const cases = [
      [["wait", "soon"], /wait needs milliseconds of 0 or more/],
      [["wait", -5], /wait needs milliseconds of 0 or more/],
      [["wait"], /wait needs milliseconds of 0 or more/],
      [["slow", 0], /slow needs a factor above 0/],
      [["slow", "slow"], /slow needs a factor above 0/],
      [["move", null], /move needs fractions fx and fy/],
      [["move", null, 0.5], /move needs fractions fx and fy/],
      [["click", null, "left"], /click needs numeric fractions/],
      [["drag", null, 0.1, 0.1, 0.9], /drag needs fractions/],
      [["key"], /key needs the name of a key/],
      [["key", 7], /key needs the name of a key/],
      [["until"], /until needs a JS expression/],
      [["until", "true", 0], /until needs a JS expression/],
      [["eval"], /eval needs a JS expression/],
    ];
    for (const [action, message] of cases) {
      const file = join(directory, "actions.json");
      await writeFile(file, JSON.stringify([action]));
      const error = await execute(process.execPath, ["--experimental-websocket", drive, "figure.html", "--actions", file], { env, timeout: 30000 }).then(() => null, (failure) => failure);
      assert.equal(error?.code, 1, JSON.stringify(action));
      assert.match(error.stderr, message, JSON.stringify(action));
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("drive still accepts the documented action forms", async () => {
  const directory = await mkdtemp(join(tmpdir(), "anatomy-drive-action-values-"));
  try {
    const file = join(directory, "actions.json");
    await writeFile(file, JSON.stringify([["wait", 0], ["slow", 0.05], ["move", null, 0.5, 0.5], ["click", null], ["click", null, 0.2, 0.3], ["drag", null, 0.1, 0.1, 0.9, 0.9], ["drag", null, 0.1, 0.1, 0.9, 0.9, 5], ["key", "i"], ["key", "Enter", null, "NumpadEnter"], ["until", "true"], ["until", "true", 500], ["eval", "1"]]));
    const error = await execute(process.execPath, ["--experimental-websocket", drive, "figure.html", "--actions", file], { env, timeout: 30000 }).then(() => null, (failure) => failure);
    assert.doesNotMatch(error?.stderr ?? "", /needs (milliseconds|a factor|fractions|numeric|the name|a JS)/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
