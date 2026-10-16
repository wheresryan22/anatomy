import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const SKILL = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const FAKE_GH = `import { appendFileSync } from "node:fs";
const args = process.argv.slice(2);
appendFileSync(process.env.FAKE_LOG, JSON.stringify(["gh", ...args]) + "\\n");
const is = (...words) => words.every((word, index) => args[index] === word);
if (is("api", "user")) console.log("Octo-Cat");
else if (is("api")) console.log("false");
else if (is("repo", "fork") || is("auth", "setup-git")) {}
else if (is("pr", "list")) console.log(process.env.FAKE_PRS);
else if (is("pr", "create")) console.log("https://github.com/wheresryan22/anatomy-community/pull/999");
else process.exit(1);
`;

const FAKE_GIT = `import { spawnSync } from "node:child_process";
import { join } from "node:path";
const args = process.argv.slice(2).map((arg) => arg.replace(/^https:\\/\\/github\\.com\\/(.+)$/, (_, path) => join(process.env.FAKE_REMOTES, path)));
if (args.some((arg) => /^https?:/.test(arg))) process.exit(1);
const result = spawnSync("git", args, { stdio: "inherit", env: { ...process.env, PATH: process.env.REAL_PATH } });
process.exit(result.status ?? 1);
`;

function sandbox() {
  const root = mkdtempSync(join(tmpdir(), "anatomy-submit-"));
  const bin = join(root, "bin");
  mkdirSync(bin);
  for (const [name, source] of [["gh", FAKE_GH], ["git", FAKE_GIT]]) {
    writeFileSync(join(bin, `${name}.mjs`), source);
    writeFileSync(join(bin, name), `#!/bin/sh\nexec "${process.execPath}" "${join(bin, `${name}.mjs`)}" "$@"\n`);
    chmodSync(join(bin, name), 0o755);
  }
  const env = {
    ...process.env,
    GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1",
    GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@example.com", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@example.com",
    FAKE_LOG: join(root, "log"), FAKE_REMOTES: join(root, "remotes"), REAL_PATH: process.env.PATH,
  };
  const git = (args, cwd) => assert.equal(spawnSync("git", args, { cwd, env, encoding: "utf8" }).status, 0, args.join(" "));
  const gallery = join(root, "gallery");
  mkdirSync(join(gallery, "figures"), { recursive: true });
  mkdirSync(join(gallery, "scripts"));
  writeFileSync(join(gallery, "figures", ".gitkeep"), "");
  writeFileSync(join(gallery, "scripts", "validate.mjs"), "");
  git(["init", "--quiet", "-b", "main"], gallery);
  git(["add", "."], gallery);
  git(["commit", "--quiet", "-m", "gallery"], gallery);
  git(["clone", "--quiet", "--bare", gallery, join(root, "remotes", "wheresryan22", "anatomy-community.git")], root);
  git(["init", "--quiet", "--bare", join(root, "remotes", "Octo-Cat", "anatomy-community.git")], root);
  const submit = (prs) => {
    writeFileSync(env.FAKE_LOG, "");
    const result = spawnSync(process.execPath, [
      join(SKILL, "scripts", "publish.mjs"), join(SKILL, "examples", "dial-indicator"),
      "--into", gallery, "--id", "dial-indicator", "--title", "Dial indicator", "--prompt", "/anatomy a dial indicator",
      "--author", "Octo-Cat", "--no-session", "--no-preview", "--submit", "--yes",
    ], { env: { ...env, PATH: `${bin}${delimiter}${process.env.PATH}`, FAKE_PRS: JSON.stringify(prs) }, encoding: "utf8" });
    const calls = readFileSync(env.FAKE_LOG, "utf8").trim().split("\n").map((line) => JSON.parse(line));
    return { ...result, created: calls.find((call) => call[1] === "pr" && call[2] === "create") };
  };
  return { root, submit };
}

const pr = (number, login) => ({ url: `https://github.com/wheresryan22/anatomy-community/pull/${number}`, headRepositoryOwner: { id: "U_x", login } });

test("--submit opens a pull request even when someone else's fork has an open one on the same branch name", { skip: process.platform === "win32" }, () => {
  const { root, submit } = sandbox();
  try {
    const theirs = submit([pr(72, "ar33b98")]);
    assert.equal(theirs.status, 0, theirs.stderr);
    assert.ok(theirs.created, "gh pr create was skipped");
    assert.equal(theirs.created[theirs.created.indexOf("--head") + 1], "Octo-Cat:figure/dial-indicator");
    assert.match(theirs.stdout, /Submitted: \S+\/pull\/999/);
    const mine = submit([pr(72, "ar33b98"), pr(80, "octo-cat")]);
    assert.equal(mine.status, 0, mine.stderr);
    assert.equal(mine.created, undefined);
    assert.match(mine.stdout, /Submitted: \S+\/pull\/80\n/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
