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
  const { Dots } = require(join(directory, "kit/react/draw.js"));
  const P = { origin: [0, 0], scale: 1, azimuth: 45, elevation: 30 };
  test("actual React renderer preserves the kit's faded bolt circle", () => {
    const points = G.dotsOf(G.frameAlong([0, 0, 0], [0, 0, 1]), 2, 4, 32, P, { fade: [0.04, 0.42] });
    assert.ok(points.some((point) => point.length === 3));
    const html = renderToStaticMarkup(React.createElement(Dots, { points }));
    const circles = [...html.matchAll(/<circle[^>]*>/g)].map(([circle]) => circle);
    assert.equal(circles.length, points.length);
    points.forEach((point, index) => {
      if (point[2] === undefined) assert.doesNotMatch(circles[index], /fill-opacity/);
      else assert.equal(Number(circles[index].match(/fill-opacity="([^"]+)"/)[1]), point[2]);
    });
  });
  test("actual React renderer preserves opacity while dots pulse", () => {
    const html = renderToStaticMarkup(React.createElement(Dots, { points: [[2, 3, 0.25]], pulse: true }));
    assert.match(html, /fill-opacity="0.25"/);
    assert.match(html, /data-pulse=""/);
    assert.match(html, /--pulse-at:0ms/);
  });
  test("actual React renderer clamps negative opacity to zero", () => {
    const html = renderToStaticMarkup(React.createElement(Dots, { points: [[0, 0, -0.5]] }));
    assert.match(html, /fill-opacity="0"/);
  });
  test("actual React renderer preserves ordinary opaque points", () => {
    const html = renderToStaticMarkup(React.createElement(Dots, { points: [[2.22, 3.33], [4, 5, 1]], size: 0.75, tone: "lo" }));
    assert.doesNotMatch(html, /fill-opacity/);
    assert.match(html, /cx="2.2" cy="3.3" r="0.75"/);
    assert.match(html, /data-tone="lo"/);
  });
} finally {
  rmSync(directory, { recursive: true, force: true });
}
