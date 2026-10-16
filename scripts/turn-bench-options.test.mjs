import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import test from "node:test";

const execute = promisify(execFile);
const bench = fileURLToPath(new URL("turn-bench.mjs", import.meta.url));

test("turn-bench rejects option values it cannot use before it loads the build", async () => {
  const cases = [
    [["--rounds", "many"], /--rounds needs a whole number of at least 1/],
    [["--rounds", "0"], /--rounds needs a whole number of at least 1/],
    [["--rounds", "2.5"], /--rounds needs a whole number of at least 1/],
    [["--rounds"], /--rounds needs a whole number of at least 1/],
    [["--unit", "0"], /--unit needs a number above 0/],
    [["--unit", "big"], /--unit needs a number above 0/],
  ];
  for (const [flags, message] of cases) {
    const error = await execute(process.execPath, [bench, "missing-build.mjs", ...flags], { timeout: 30000 }).then(() => null, (failure) => failure);
    assert.equal(error?.code, 1, flags.join(" "));
    assert.match(error.stderr, message, flags.join(" "));
  }
});
