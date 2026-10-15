import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import * as G from "../kit/lathe.mjs";
const require = createRequire(import.meta.url);
const { Module } = require("node:module");
if (!process.env.NODE_PATH) {
  process.env.NODE_PATH = resolve("node_modules");
  Module?._initPaths?.();
}
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const directory = mkdtempSync(join(tmpdir(), "anatomy-react-solid-"));
try {
  for (const file of ["kit/iso-kit.ts", "kit/react/live.tsx", "kit/react/draw.tsx"]) {
    const output = join(directory, file.replace(/\.tsx?$/, ".js"));
    mkdirSync(dirname(output), { recursive: true });
    const result = ts.transpileModule(readFileSync(resolve(file), "utf8"), { fileName: file, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React } });
    writeFileSync(output, result.outputText);
  }
  const { Solid } = require(join(directory, "kit/react/draw.js"));
  const P = { origin: [0, 0], scale: 1, azimuth: 45, elevation: 30 };
  for (const lit of [false, true]) test(`actual React renderer preserves seamless sphere tone regions with lit=${lit}`, () => {
    const paths = G.sphereOf([0, 0, 0], 4, P);
    assert.equal(paths.seamless, true);
    assert.ok(paths.shades.some(Boolean));
    const html = renderToStaticMarkup(React.createElement("svg", null, React.createElement(Solid, { paths, lit })));
    assert.match(html, /data-seamless=""/);
    assert.equal(/data-lit=""/.test(html), lit);
    assert.match(html, /class="iso-shade"/);
  });
  test("actual React renderer preserves ordinary hard solids", () => {
    const paths = G.prismOf(G.frameAlong([0, 0, 0], [0, 0, 1]), [[-1, -1], [1, -1], [1, 1], [-1, 1]], 0, 2, P);
    assert.equal(Boolean(paths.seamless), false);
    const html = renderToStaticMarkup(React.createElement(Solid, { paths }));
    assert.doesNotMatch(html, /data-seamless/);
    assert.match(html, /class="iso-line iso-edge"/);
  });
  test("actual React renderer preserves seamless opt-out and child ordering", () => {
    const paths = { ...G.sphereOf([0, 0, 0], 4, P), seamless: false };
    const html = renderToStaticMarkup(React.createElement(Solid, { paths, inner: React.createElement("circle", { id: "inner" }) }, React.createElement("circle", { id: "child" })));
    assert.doesNotMatch(html, /data-seamless/);
    assert.ok(html.indexOf('id="inner"') < html.indexOf('class="iso-line iso-edge"'));
    assert.ok(html.indexOf('id="child"') > html.indexOf('class="iso-line iso-edge"'));
  });
} finally {
  rmSync(directory, { recursive: true, force: true });
}
