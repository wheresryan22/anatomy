import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import test from "node:test";

const execute = promisify(execFile);
const check = fileURLToPath(new URL("turn-check.mjs", import.meta.url));
const env = { ...process.env, CHROME_PATH: process.execPath };

test("turn-check rejects option values it cannot use before it starts a browser or a build", async () => {
  const cases = [
    ["build.mjs", "--fidelity", "--angles", "7,abc", /--angles must be a comma-separated list of numbers/],
    ["build.mjs", "--fidelity", "--angles", "7,", /--angles must be a comma-separated list of numbers/],
    ["figure.html", "--width", "wide", /--width must be a finite number of at least 1/],
    ["figure.html", "--width", "0", /--width must be a finite number of at least 1/],
    ["figure.html", "--height", "-5", /--height must be a finite number of at least 1/],
    ["figure.html", "--scale", "0", /--scale must be a finite number of at least 0.1/],
    ["figure.html", "--throttle", "0.5", /--throttle must be a finite number of at least 1/],
    ["figure.html", "--throttle", "fast", /--throttle must be a finite number of at least 1/],
    ["figure.html", "--perf", "--scale", /--scale must be a finite number of at least 0.1/],
  ];
  for (const [target, ...rest] of cases) {
    const message = rest.pop();
    const error = await execute(process.execPath, ["--experimental-websocket", check, target, ...rest], { env, timeout: 30000 }).then(() => null, (failure) => failure);
    assert.equal(error?.code, 1, rest.join(" "));
    assert.match(error.stderr, message, rest.join(" "));
  }
});
