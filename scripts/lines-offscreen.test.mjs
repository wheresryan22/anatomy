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
const drive = fileURLToPath(new URL("drive.mjs", import.meta.url));
const figure = (path) => `<div class="iso-plate" style="width:400px"><svg viewBox="0 0 200 100" width="400" height="200"><path class="iso-line" d="${path}" stroke="black" fill="none"/><rect x="90" y="30" width="60" height="40" fill="gray"/><rect x="10" y="40" width="20" height="20" fill="gray"/></svg></div>`;

async function run(html, args) {
  const directory = await mkdtemp(join(tmpdir(), "anatomy-lines-offscreen-"));
  try {
    const page = join(directory, "figure.html");
    await writeFile(page, `<!doctype html><body style="margin:0">${html}</body>`);
    try {
      return { code: 0, ...await execute(process.execPath, [args[0], page, ...args.slice(1)], { timeout: 30000 }) };
    } catch (error) {
      return { code: error.code, stdout: error.stdout, stderr: error.stderr };
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

test("line ends tucked under a fill below the fold remain hidden", async () => {
  const result = await run(`<div style="height:3000px"></div>${figure("M20 50L100 50")}`, [lines, "--wait", "0"]);
  assert.equal(result.code, 0);
  assert.match(result.stdout, /line ends: 0 of 2/);
});

test("line ends tucked under a fill scrolled above or beside the viewport remain hidden, and the scroll is kept", async () => {
  const result = await run(`<div style="display:flex"><div style="width:3000px;flex:none"></div>${figure("M20 50L100 50")}</div><div style="height:3000px"></div>`, [drive, JSON.stringify([["eval", "scrollTo(0,2000),[scrollX,scrollY]"], ["lines"], ["eval", "[scrollX,scrollY]"]])]);
  assert.equal(result.code, 0);
  assert.match(result.stdout, /line ends: 0 of 2/);
  assert.equal(result.stdout.match(/eval: \[0,2000\]/g)?.length, 2);
});

test("floating line ends below the fold are still reported", async () => {
  const result = await run(`<div style="height:3000px"></div>${figure("M40 20L80 20")}`, [lines, "--wait", "0"]);
  assert.equal(result.code, 1);
  assert.match(result.stdout, /line ends: 2 of 2/);
});
