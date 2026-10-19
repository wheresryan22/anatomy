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

const ring = '<defs><g id="ring"><circle cx="0" cy="0" r="10" fill="none" stroke="black"/></g><path id="tick" class="iso-line" fill="none" stroke="black" d="M0 0L0 40"/></defs>';
const line = (d) => `<path class="iso-line" fill="none" stroke="black" d="${d}"/>`;

async function check(body, command = (page) => [lines, page, "--wait", "0"]) {
  const directory = await mkdtemp(join(tmpdir(), "anatomy-lines-use-"));
  try {
    const page = join(directory, "figure.html");
    await writeFile(page, `<!doctype html><div class="iso-plate"><svg width="200" height="100" viewBox="0 0 200 100">${ring}${body}</svg></div>`);
    try {
      return { code: 0, ...await execute(process.execPath, command(page), { timeout: 30000 }) };
    } catch (error) {
      return { code: error.code, stdout: error.stdout, stderr: error.stderr };
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

test("line ends on a used outline are rooted", async () => {
  const result = await check(`<use href="#ring" x="30" y="50"/><use href="#ring" x="170" y="50"/>${line("M40 50L160 50")}`);
  assert.equal(result.code, 0);
  assert.match(result.stdout, /line ends: 0 of 2/);
});

test("line ends beside a used outline are floating", async () => {
  const result = await check(`<use href="#ring" x="30" y="50"/>${line("M40 20L100 20")}`);
  assert.equal(result.code, 1);
  assert.match(result.stdout, /line ends: 2 of 2/);
});

test("a used outline follows the transform of its use", async () => {
  const result = await check(`<use href="#ring" transform="scale(2)" x="15" y="25"/><use href="#ring" x="170" y="50"/>${line("M50 50L160 50")}`);
  assert.equal(result.code, 0);
  assert.match(result.stdout, /line ends: 0 of 2/);
});

test("a floating line inside used content is reported", async () => {
  const result = await check('<use href="#tick" x="100" y="30"/>');
  assert.equal(result.code, 1);
  assert.match(result.stdout, /line ends: 2 of 2 ends on 1 lines float/);
});

test("the check leaves the use elements in place", async () => {
  const result = await check('<use href="#ring" x="30" y="50"/><use href="#ring" x="170" y="50"/>', (page) => [drive, page, JSON.stringify([["lines"], ["eval", "document.querySelectorAll('use').length + ',' + document.querySelectorAll('svg g').length"]])]);
  assert.equal(result.code, 0);
  assert.match(result.stdout, /eval: "2,1"/);
});
