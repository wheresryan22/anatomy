import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { fingerprintOf, fingerprintOfSkill, KIT_FILES } from "./fingerprint.mjs";

const SKILL = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const git = (cwd, args) => execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@example.com", "-c", "commit.gpgsign=false", ...args], { cwd, maxBuffer: 1 << 30 });

function galleryFingerprint(repo) {
  const files = git(repo, ["ls-tree", "-r", "HEAD", "--", "kit", "scripts/inline-kit.mjs"]).toString().trim().split("\n").map((line) => {
    const [meta, path] = line.split("\t");
    return [path, meta.split(" ")[2]];
  }).filter(([path]) => KIT_FILES(path));
  return fingerprintOf(files.map(([path, blob]) => [path, git(repo, ["cat-file", "blob", blob])]));
}

test("a git checkout's fingerprint covers only the files git tracks, as the gallery's does", () => {
  const root = mkdtempSync(join(tmpdir(), "anatomy-fingerprint-"));
  const repo = join(root, "skill");
  try {
    cpSync(join(SKILL, "kit"), join(repo, "kit"), { recursive: true });
    cpSync(join(SKILL, "scripts", "inline-kit.mjs"), join(repo, "scripts", "inline-kit.mjs"));
    writeFileSync(join(repo, ".gitignore"), "shots/\naudit.txt\n");
    git(repo, ["init", "--quiet"]);
    git(repo, ["add", "."]);
    git(repo, ["commit", "--quiet", "-m", "kit"]);
    const committed = fingerprintOfSkill(repo);
    assert.equal(committed, galleryFingerprint(repo));
    writeFileSync(join(repo, "kit", "audit.txt"), "audit output\n");
    writeFileSync(join(repo, "kit", "lathe.mjs.orig"), "leftover\n");
    mkdirSync(join(repo, "kit", "shots"));
    writeFileSync(join(repo, "kit", "shots", "a.png"), "png");
    assert.equal(fingerprintOfSkill(repo), committed);
    writeFileSync(join(repo, "kit", "lathe.mjs"), "changed\n");
    assert.notEqual(fingerprintOfSkill(repo), committed, "an edited tracked file still changes it");
    const plain = join(root, "plain");
    cpSync(join(SKILL, "kit"), join(plain, "kit"), { recursive: true });
    cpSync(join(SKILL, "scripts", "inline-kit.mjs"), join(plain, "scripts", "inline-kit.mjs"));
    rmSync(join(plain, "kit", "audit.txt"), { force: true });
    rmSync(join(plain, "kit", "shots"), { recursive: true, force: true });
    assert.equal(fingerprintOfSkill(plain), committed, "a folder outside git falls back to the files on disk");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
