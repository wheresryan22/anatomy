import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { chmod, mkdtemp, readFile, rm, writeFile, access, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import test from "node:test";

const execute = promisify(execFile);

for (const name of ["capture", "drive", "turn-check"]) {
  test(`${name} removes its profile when Chrome exits before startup`, async () => {
    const directory = await mkdtemp(join(tmpdir(), "anatomy-chrome-startup-"));
    let profile;
    try {
      // On Windows there is no /bin/sh executable. Use node.exe as an early-exit
      // Chrome substitute and check the actual profile directories disappear.
      // This exercises the same launcher cleanup path without a POSIX-only shim.
      if (process.platform === "win32") {
        const prefix = { capture: "iso-capture-", drive: "iso-drive-", "turn-check": "turn-check-" }[name];
        const snapshot = async () => (await readdir(tmpdir())).filter((part) => part.startsWith(prefix)).sort();
        const before = await snapshot();
        const started = performance.now();
        let result;
        try {
          await execute(process.execPath, [fileURLToPath(new URL(name + ".mjs", import.meta.url)), join(directory, "figure.html"), ...(name === "drive" ? ["[]"] : name === "turn-check" ? ["--lines"] : [])], { timeout: 30000, env: { ...process.env, CHROME_PATH: process.execPath } });
        } catch (error) { result = error; }
        assert.equal(result?.code, 1);
        assert.match(result.stderr, /Chrome exited before startup/);
        assert.deepEqual(await snapshot(), before, "Chrome profile leaked after failed launch");
        assert.ok(performance.now() - started < 10000);
        return;
      }
      const binary = join(directory, "chrome");
      const receipt = join(directory, "profile.txt");
      await writeFile(binary, '#!/bin/sh\nfor arg in "$@"; do\n  case "$arg" in --user-data-dir=*) printf "%s" "${arg#--user-data-dir=}" > "$ANATOMY_PROFILE_RECEIPT";; esac\ndone\nexit 7\n');
      await chmod(binary, 0o755);
      const started = performance.now();
      let result;
      try {
        await execute(process.execPath, [fileURLToPath(new URL(`${name}.mjs`, import.meta.url)), join(directory, "figure.html"), ...(name === "drive" ? ["[]"] : name === "turn-check" ? ["--lines"] : [])], { timeout: 30000, env: { ...process.env, CHROME_PATH: binary, ANATOMY_PROFILE_RECEIPT: receipt } });
      } catch (error) {
        result = error;
      }
      profile = await readFile(receipt, "utf8");
      assert.equal(result?.code, 1);
      await assert.rejects(access(profile), { code: "ENOENT" });
      assert.ok(performance.now() - started < 10000);
      assert.match(result.stderr, /Chrome exited before startup.*7/);
    } finally {
      if (profile) await rm(profile, { recursive: true, force: true });
      await rm(directory, { recursive: true, force: true });
    }
  });
}
