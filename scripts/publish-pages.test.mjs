import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { publish } from "./publish.mjs";

function gallery() {
  const repo = mkdtempSync(join(tmpdir(), "anatomy-gallery-"));
  mkdirSync(join(repo, "figures"));
  mkdirSync(join(repo, "scripts"));
  writeFileSync(join(repo, "scripts", "validate.mjs"), "");
  return repo;
}

function figure(pages) {
  const source = mkdtempSync(join(tmpdir(), "anatomy-pages-"));
  const build = `import { writeFileSync } from "node:fs";\nimport { join } from "node:path";\nfor (const [name, text] of ${JSON.stringify(Object.entries(pages))}) writeFileSync(join(import.meta.dirname, name), text);\n`;
  writeFileSync(join(source, "build.mjs"), build);
  for (const [name, text] of Object.entries(pages)) writeFileSync(join(source, name), text);
  return source;
}

const common = (source, repo, pages) => ({ source, into: repo, id: "two-views", title: "Two views", prompt: "/anatomy two views", author: "octo-cat", agent: "Codex", license: "MIT", build: "build.mjs", tags: [], date: "2026-10-16", noPreview: true, noSession: true, pages });

test("two listed pages that share a theme are both recorded", () => {
  const repo = gallery();
  const source = figure({ "main.html": '<!doctype html><body data-theme="dark"></body>', "alt.html": '<!doctype html><body data-theme="dark"></body>' });
  try {
    const { dest, figure: made } = publish(common(source, repo, ["main.html", "alt.html"]));
    assert.deepEqual(made.pages, { dark: "src/main.html", alt: "src/alt.html" });
    assert.deepEqual(made.build, [["src/build.mjs"]]);
    for (const page of ["main.html", "alt.html"]) assert.ok(!existsSync(join(dest, "src", page)), `${page} is a built page, not source`);
  } finally {
    rmSync(repo, { recursive: true, force: true });
    rmSync(source, { recursive: true, force: true });
  }
});

test("listed pages that would still share a key are rejected, naming both", () => {
  const repo = gallery();
  const source = figure({ "x_y.html": "<!doctype html><body></body>", "x-y.html": "<!doctype html><body></body>" });
  try {
    assert.throws(() => publish(common(source, repo, ["x_y.html", "x-y.html"])), /pages x_y\.html and x-y\.html would both be recorded as "x-y"/);
    assert.ok(!existsSync(join(repo, "figures", "octo-cat", "two-views")));
  } finally {
    rmSync(repo, { recursive: true, force: true });
    rmSync(source, { recursive: true, force: true });
  }
});
