import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import test from "node:test";

const execute = promisify(execFile);
const lines = fileURLToPath(new URL("lines.mjs", import.meta.url));
const env = { ...process.env, CHROME_PATH: process.execPath };

test("lines rejects option values it cannot use before it starts Chrome", async () => {
  const cases = [
    [["--tolerance", "loose"], /--tolerance needs a number, 0 or more/],
    [["--tolerance", "-1"], /--tolerance needs a number, 0 or more/],
    [["--wait", "soon"], /--wait needs a number, 0 or more/],
    [["--tolerance"], /--tolerance needs a value/],
    [["--out"], /--out needs a value/],
    [["--out", "--tolerance", "2"], /--out needs a value/],
    [["--select"], /--select needs a value/],
  ];
  for (const [flags, message] of cases) {
    const error = await execute(process.execPath, [lines, "figure.html", ...flags], { env, timeout: 30000 }).then(() => null, (failure) => failure);
    assert.equal(error?.code, 1, flags.join(" "));
    assert.match(error.stderr, message, flags.join(" "));
  }
});
