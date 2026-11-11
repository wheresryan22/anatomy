import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";

const files = ["capture.mjs", "drive.mjs", "print.mjs", "turn-check.mjs"];

function chromePathBody(name) {
  const source = readFileSync(fileURLToPath(new URL(name, import.meta.url)), "utf8");
  const match = source.match(/function chromePath\(\) \{[\s\S]*?\n\}/);
  assert.ok(match, `${name} has no chromePath()`);
  return match[0];
}

test("every chromePath() also looks in the Windows Playwright cache", () => {
  for (const name of files) assert.match(chromePathBody(name), /AppData\/Local\/ms-playwright/, `${name} is missing the Windows Playwright lookup`);
});
