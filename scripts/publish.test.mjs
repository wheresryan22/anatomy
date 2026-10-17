import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { fingerprintOf, fingerprintOfSkill } from "./fingerprint.mjs";
import { publish, rewriteSkillPaths } from "./publish.mjs";

const SKILL = resolve(import.meta.dirname, "..");

function gallery() {
  const repo = mkdtempSync(join(tmpdir(), "anatomy-gallery-"));
  mkdirSync(join(repo, "figures"));
  mkdirSync(join(repo, "scripts"));
  writeFileSync(join(repo, "scripts", "validate.mjs"), "");
  return repo;
}

test("the fingerprint matches the gallery's algorithm", () => {
  assert.equal(fingerprintOf([["kit/a.mjs", "1"], ["kit/b.mjs", "2"], ["scripts/inline-kit.mjs", "3"]]), fingerprintOf([["kit/b.mjs", "2"], ["scripts/inline-kit.mjs", "3"], ["kit/a.mjs", "1"]]));
  assert.equal(fingerprintOf([["kit/a.mjs", "1"], ["kit/b.mjs", "2"], ["scripts/inline-kit.mjs", "3"]]), "sha256:a249319b0f2a8db4899fbb430c782c55b7699df73809c5c0e4c07495c72eae8c");
  assert.match(fingerprintOfSkill(SKILL), /^sha256:[0-9a-f]{64}$/);
});

test("skill paths are rewritten to the gallery's .skill link, and nothing else", () => {
  const source = "/work/fig";
  const text = 'import * as k from "../../kit/iso-kit.mjs";\nimport { kitScript } from "../../scripts/inline-kit.mjs";\nimport "./live.mjs";\nconst x = "/2";';
  const { text: out, outside } = rewriteSkillPaths(text, { fromDir: join(SKILL, "examples", "x"), toDir: "/g/figures/x/src", source: join(SKILL, "examples", "x"), skill: SKILL, skillLink: "/g/.skill" });
  assert.deepEqual(outside, []);
  assert.match(out, /from "\.\.\/\.\.\/\.\.\/\.skill\/kit\/iso-kit\.mjs"/);
  assert.match(out, /from "\.\.\/\.\.\/\.\.\/\.skill\/scripts\/inline-kit\.mjs"/);
  assert.match(out, /import "\.\/live\.mjs"/);
  assert.match(out, /"\/2"/);
  const away = rewriteSkillPaths('import "../../elsewhere/x.mjs";', { fromDir: source, toDir: "/g/figures/x/src", source, skill: SKILL, skillLink: "/g/.skill" });
  assert.deepEqual(away.outside, ["../../elsewhere/x.mjs"]);
});

test("publishing copies only the source, under the author, and it rebuilds byte for byte", () => {
  const repo = gallery();
  try {
    const { dest, figure } = publish({ source: join(SKILL, "examples", "dial-indicator"), into: repo, id: "dial-indicator", title: "Dial indicator", prompt: "/anatomy a dial indicator", author: "Octo-Cat", agent: "Codex", license: "MIT", build: "build.mjs", tags: [], date: "2026-10-12", noPreview: true });
    assert.equal(dest, join(repo, "figures", "octo-cat", "dial-indicator"));
    assert.equal(figure.author, "Octo-Cat");
    assert.ok(!existsSync(join(dest, "src", "dial-indicator.html")) && !existsSync(join(dest, "src", "dial-indicator-light.html")) && !existsSync(join(dest, "poster.png")), "no built pages or poster are left");
    assert.equal(figure.kind, "SVG");
    assert.equal(figure.skill.kit, fingerprintOfSkill(SKILL));
    assert.deepEqual(figure.build, [["src/build.mjs", "--light"], ["src/build.mjs"]]);
    assert.deepEqual(figure.pages, { dark: "src/dial-indicator.html", light: "src/dial-indicator-light.html" });
    for (const command of figure.build) assert.equal(spawnSync(process.execPath, command, { cwd: dest }).status, 0);
    for (const page of ["dial-indicator.html", "dial-indicator-light.html"]) assert.ok(readFileSync(join(dest, "src", page)).equals(readFileSync(join(SKILL, "examples", "dial-indicator", page))), page);
    assert.ok(existsSync(join(repo, ".skill", "kit", "iso-kit.mjs")));
    assert.throws(() => publish({ source: join(SKILL, "examples", "dial-indicator"), into: repo, id: "dial-indicator", title: "x", prompt: "x", author: "octo-cat", agent: "Codex", license: "MIT", build: "build.mjs", tags: [], noPreview: true }), /already exists/);
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test("publishing refuses a folder that is not a gallery clone", () => {
  const empty = mkdtempSync(join(tmpdir(), "not-gallery-"));
  try {
    assert.throws(() => publish({ source: join(SKILL, "examples", "dial-indicator"), into: empty, id: "x", title: "x", prompt: "x", author: "x", agent: "Codex", license: "MIT", build: "build.mjs", tags: [], noPreview: true }), /doesn't look like a clone of anatomy-community/);
  } finally {
    rmSync(empty, { recursive: true, force: true });
  }
});

test("publisher accepts only the gallery's supported licenses", () => {
  const repo = gallery();
  const command = (license, id) => spawnSync(process.execPath, [
    join(SKILL, "scripts", "publish.mjs"), join(SKILL, "examples", "dial-indicator"),
    "--into", repo, "--id", id, "--title", "Dial indicator", "--prompt", "/anatomy a dial indicator",
    "--author", "Octo-Cat", "--license", license, "--no-preview",
  ], { encoding: "utf8" });
  try {
    for (const license of ["MIT", "CC-BY-4.0"]) {
      const id = license.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const result = command(license, id);
      assert.equal(result.status, 0, result.stderr);
      const figure = JSON.parse(readFileSync(join(repo, "figures", "octo-cat", id, "figure.json"), "utf8"));
      assert.equal(figure.license, license);
    }
    const invalid = command("GPL-3.0", "unsupported-license");
    assert.equal(invalid.status, 1);
    assert.match(invalid.stderr, /--license must be one of: MIT, CC-BY-4\.0/);
    assert.ok(!existsSync(join(repo, "figures", "octo-cat", "unsupported-license")));
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

import { submitPlan } from "./publish.mjs";

test("--submit: people who can push get a branch; everyone else a fork made for them", () => {
  const owner = submitPlan({ login: "wheresryan22", canPush: true, upstream: "wheresryan22/anatomy-community", author: "wheresryan22", id: "token-bucket", title: "Token bucket" });
  assert.equal(owner.target, "wheresryan22/anatomy-community");
  assert.ok(!owner.steps.some((s) => s.gh?.[1] === "fork"));
  assert.deepEqual(owner.steps.at(-1).pr, { repo: "wheresryan22/anatomy-community", head: "figure/token-bucket", title: "Add Token bucket" });
  const guest = submitPlan({ login: "Octo-Cat", canPush: false, upstream: "wheresryan22/anatomy-community", author: "Octo-Cat", id: "token-bucket", title: "Token bucket" });
  assert.equal(guest.target, "Octo-Cat/anatomy-community");
  assert.deepEqual(guest.steps[0].gh, ["repo", "fork", "wheresryan22/anatomy-community", "--clone=false"]);
  assert.equal(guest.steps.at(-1).pr.head, "Octo-Cat:figure/token-bucket");
  assert.ok(guest.steps.some((s) => s.git?.[0] === "add" && s.git.at(-1) === "figures/octo-cat/token-bucket"), "only the figure's folder is added");
});

test("--pages records two same-theme pages under distinct keys instead of dropping one (issue #89)", () => {
  const repo = gallery();
  const source = mkdtempSync(join(tmpdir(), "anatomy-fig-"));
  try {
    const dark = (name) => `<!doctype html><html><body data-theme="dark"><h1>${name}</h1></body></html>\n`;
    writeFileSync(join(source, "main.html"), dark("main"));
    writeFileSync(join(source, "alt.html"), dark("alt"));
    writeFileSync(
      join(source, "build.mjs"),
      `import { writeFileSync } from "node:fs";\n` +
        `import { dirname, join } from "node:path";\n` +
        `import { fileURLToPath } from "node:url";\n` +
        `const dir = dirname(fileURLToPath(import.meta.url));\n` +
        `for (const name of ["main.html", "alt.html"]) writeFileSync(join(dir, name), "<!doctype html><html><body data-theme=\\"dark\\"><h1>" + name + "</h1></body></html>\\n");\n`
    );
    const { dest, figure } = publish({
      source, into: repo, id: "two-dark-pages", title: "Two dark pages", prompt: "x",
      author: "octo-cat", agent: "Codex", license: "MIT", build: "build.mjs",
      tags: [], date: "2026-10-18", noPreview: true, pages: ["main.html", "alt.html"],
    });
    assert.deepEqual(figure.pages, { dark: "src/main.html", alt: "src/alt.html" });
    assert.ok(!existsSync(join(dest, "src", "main.html")), "the overwritten page must not ship as a plain source file");
    assert.ok(!existsSync(join(dest, "src", "alt.html")), "built pages are inlined into figure.json, then removed");
  } finally {
    rmSync(repo, { recursive: true, force: true });
    rmSync(source, { recursive: true, force: true });
  }
});

test("a failed --force publish leaves the existing figure as it was", () => {
  const repo = gallery();
  const common = { source: join(SKILL, "examples", "dial-indicator"), into: repo, id: "dial-indicator", title: "Dial indicator", prompt: "/anatomy a dial indicator", author: "octo-cat", agent: "Codex", license: "MIT", build: "build.mjs", tags: [], date: "2026-10-12", noPreview: true };
  try {
    const { dest } = publish(common);
    const before = readFileSync(join(dest, "figure.json"), "utf8");
    assert.throws(() => publish({ ...common, force: true, pages: ["missing.html"] }), /page missing\.html not found/);
    assert.equal(readFileSync(join(dest, "figure.json"), "utf8"), before);
    assert.ok(existsSync(join(dest, "src", "build.mjs")));
    assert.deepEqual(readdirSync(join(repo, "figures", "octo-cat")), ["dial-indicator"]);
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});
