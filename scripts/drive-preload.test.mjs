import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import test from "node:test";

const execute = promisify(execFile);

test("every --preload runs before the page, in the order given", async () => {
  const directory = await mkdtemp(join(tmpdir(), "anatomy-drive-preload-"));
  try {
    const page = join(directory, "figure.html");
    await writeFile(page, '<!doctype html><div class="iso-plate">Owned figure</div><script>window.__order.push("page")</script>');
    await writeFile(join(directory, "a.js"), 'window.__order = ["a"]');
    await writeFile(join(directory, "b.js"), '(window.__order ||= []).push("b")');
    const actions = JSON.stringify([["eval", "window.__order.join(',')"]]);
    const { stdout } = await execute(process.execPath, [fileURLToPath(new URL("drive.mjs", import.meta.url)), page, actions, "--preload", join(directory, "a.js"), "--preload", join(directory, "b.js")], { timeout: 30000 });
    assert.match(stdout, /eval: "a,b,page"/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
