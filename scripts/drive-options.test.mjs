import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import test from "node:test";

const execute = promisify(execFile);
const drive = fileURLToPath(new URL("drive.mjs", import.meta.url));
const env = { ...process.env, CHROME_PATH: process.execPath };

test("drive rejects option values it cannot use before it starts Chrome", async () => {
  const cases = [
    [["--width", "wide"], /--width needs a number above 0/],
    [["--width", "0"], /--width needs a number above 0/],
    [["--height", "-1"], /--height needs a number above 0/],
    [["--scale", "0"], /--scale needs a number above 0/],
    [["--theme", "sepia"], /--theme must be dark or light/],
    [["--width"], /--width needs a value/],
    [["--preload"], /--preload needs a value/],
    [["--actions"], /--actions needs a value/],
  ];
  for (const [flags, message] of cases) {
    const error = await execute(process.execPath, ["--experimental-websocket", drive, "figure.html", "[]", ...flags], { env, timeout: 30000 }).then(() => null, (failure) => failure);
    assert.equal(error?.code, 1, flags.join(" "));
    assert.match(error.stderr, message, flags.join(" "));
  }
});
