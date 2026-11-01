import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const drive = fileURLToPath(new URL("drive.mjs", import.meta.url));

function chromeProcessesUsing(profile) {
  const table = execFileSync("ps", ["-axo", "pid=,command="], { encoding: "utf8" });
  return table.split("\n").filter((line) => line.includes(`--user-data-dir=${profile}`)).map((line) => Number(line.trim().split(/\s+/)[0]));
}

function driveProfilesUnder(folder) {
  return readdirSync(folder).filter((name) => name.startsWith("iso-drive-")).map((name) => join(folder, name));
}

async function poll(check, timeout, what) {
  const deadline = Date.now() + timeout;
  for (;;) {
    const value = check();
    if (value) return value;
    if (Date.now() > deadline) throw new Error(`timed out waiting for ${what}`);
    await new Promise((done) => setTimeout(done, 100));
  }
}

test("a terminated drive run kills its Chrome and removes its profile", { skip: process.platform === "win32" && "SIGTERM carries no handler on Windows" }, async () => {
  const scratch = mkdtempSync(join(tmpdir(), "drive-signal-"));
  const page = join(scratch, "figure.html");
  writeFileSync(page, '<!doctype html><div class="iso-plate">Figure</div>');
  const envWithProfilesInScratch = { ...process.env, TMPDIR: scratch };
  const child = spawn(process.execPath, [drive, page, JSON.stringify([["wait", 60000]])], { env: envWithProfilesInScratch, stdio: ["ignore", "pipe", "pipe"] });
  try {
    const profile = await poll(() => driveProfilesUnder(scratch)[0], 20000, "the driver's profile");
    await poll(() => chromeProcessesUsing(profile).length > 0, 20000, "Chrome to start");
    child.kill("SIGTERM");
    const exit = await new Promise((done) => child.on("exit", (code, signal) => done({ code, signal })));
    assert.equal(exit.signal, "SIGTERM");
    await poll(() => chromeProcessesUsing(profile).length === 0, 10000, "Chrome to be gone");
    assert.equal(existsSync(profile), false);
  } finally {
    child.kill("SIGKILL");
    for (const pid of driveProfilesUnder(scratch).flatMap((profile) => chromeProcessesUsing(profile))) {
      try {
        process.kill(pid, "SIGKILL");
      } catch {}
    }
    rmSync(scratch, { recursive: true, force: true });
  }
});
