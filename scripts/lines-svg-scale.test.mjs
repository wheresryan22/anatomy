import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import test from "node:test";

const execute = promisify(execFile);
const lines = fileURLToPath(new URL("lines.mjs", import.meta.url));
const FIGURE = '<svg width="800" height="400" viewBox="0 0 100 50"><path class="iso-line" data-free="both" fill="none" stroke="black" d="M10 10L90 10"/><path class="iso-line" data-free="both" fill="none" stroke="black" d="M10 40L90 40"/><path class="iso-line" fill="none" stroke="black" d="M50 39.5L50 10.5"/></svg>';
const ICON = '<svg width="25" height="25" viewBox="0 0 100 100"><path fill="none" stroke="black" d="M10 10L90 90L10 90Z"/></svg>';

async function check(body) {
  const directory = await mkdtemp(join(tmpdir(), "anatomy-lines-scale-"));
  try {
    const page = join(directory, "figure.html");
    await writeFile(page, `<!doctype html><body style="margin:0">${body}</body>`);
    try {
      return { code: 0, ...await execute(process.execPath, [lines, page, "--wait", "0"], { timeout: 30000 }) };
    } catch (error) {
      return { code: error.code, stdout: error.stdout, stderr: error.stderr };
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

test("a line end within tolerance of its figure's own scale passes", async () => {
  const result = await check(FIGURE);
  assert.equal(result.code, 0, result.stdout);
});

test("another, smaller SVG on the page does not set the figure's tolerance", async () => {
  for (const body of [FIGURE + ICON, ICON + FIGURE]) {
    const result = await check(body);
    assert.equal(result.code, 0, result.stdout);
  }
});
