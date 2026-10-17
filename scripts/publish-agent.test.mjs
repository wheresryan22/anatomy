import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

const SKILL = resolve(import.meta.dirname, "..");

test("publisher accepts MiniMax Code and lists it when it rejects an agent", () => {
  const repo = mkdtempSync(join(tmpdir(), "anatomy-gallery-"));
  mkdirSync(join(repo, "figures"));
  mkdirSync(join(repo, "scripts"));
  writeFileSync(join(repo, "scripts", "validate.mjs"), "");
  const command = (agent, id) => spawnSync(process.execPath, [
    join(SKILL, "scripts", "publish.mjs"), join(SKILL, "examples", "dial-indicator"),
    "--into", repo, "--id", id, "--title", "Dial indicator", "--prompt", "/anatomy a dial indicator",
    "--author", "Octo-Cat", "--agent", agent, "--no-preview", "--no-session",
  ], { encoding: "utf8" });
  try {
    const accepted = command("MiniMax Code", "minimax-code");
    assert.equal(accepted.status, 0, accepted.stderr);
    const figure = JSON.parse(readFileSync(join(repo, "figures", "octo-cat", "minimax-code", "figure.json"), "utf8"));
    assert.equal(figure.agent, "MiniMax Code");
    const rejected = command("Nobody", "unsupported-agent");
    assert.equal(rejected.status, 1);
    assert.match(rejected.stderr, /--agent must be one of: .*MiniMax Code/);
    assert.ok(!existsSync(join(repo, "figures", "octo-cat", "unsupported-agent")));
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});
