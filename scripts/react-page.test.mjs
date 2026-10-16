import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { buildReactPage } from "./react-page.mjs";

const runFile = promisify(execFile);
const tempDir = mkdtempSync(join(tmpdir(), "anatomy-react-page-"));

test.after(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

test("builds examples/test-rig in dark and light themes and drives interactions cleanly", async () => {
  const dark = await buildReactPage({ target: "examples/test-rig", out: tempDir });
  const light = await buildReactPage({ target: "examples/test-rig", theme: "light", out: tempDir });

  assert.equal(dark.exportName, "TestRigFigure");
  assert.equal(dark.title, "Press and pull");
  assert.deepEqual(dark.problems, []);
  assert.deepEqual(light.problems, []);
  assert.match(dark.html, /<body class="iso" data-theme="dark">/);
  assert.match(light.html, /<body class="iso" data-theme="light">/);
  assert.match(dark.html, /--ms-glass-top: #262626/);
  assert.match(dark.body, /120\.0 × 32\.0 · lean 0\.0 px/);

  const actions = [
    ["wait", 300],
    ["key", " "],
    ["key", "ArrowLeft"],
    ["wait", 500],
    ["eval", "({ readout: document.querySelector('[data-readout]')?.textContent, held: document.querySelector('.ms')?.hasAttribute('data-held'), valueText: document.querySelector('.ms')?.getAttribute('aria-valuetext') })"],
  ];
  const driven = await runFile(process.execPath, ["scripts/drive.mjs", light.outPath, JSON.stringify(actions), "--reduced"], {
    timeout: 30000,
    maxBuffer: 16 * 1024 * 1024,
  });
  assert.match(driven.stdout, /console: clean/);
  const match = driven.stdout.match(/eval: (.*)/);
  assert.ok(match, driven.stdout);
  const state = JSON.parse(match[1]);
  assert.equal(state.held, true);
  assert.match(state.readout, /× .* · lean /);
  assert.match(state.valueText, /^Pressed:/);
});

test("builds examples/spot-plate in dark and light themes and drives slider states cleanly", async () => {
  const dark = await buildReactPage({ target: "examples/spot-plate", out: tempDir });
  const light = await buildReactPage({ target: "examples/spot-plate", theme: "light", out: tempDir });

  assert.equal(dark.exportName, "SpotPlateFigure");
  assert.equal(dark.title, "Spot plate");
  assert.deepEqual(dark.problems, []);
  assert.deepEqual(light.problems, []);
  assert.match(dark.html, /--ml-plate-top: #1c1c1c/);
  assert.match(dark.body, /merge 20 px · 3 of 6 joined/);

  const actions = [
    ["wait", 300],
    ["key", "End"],
    ["wait", 300],
    ["eval", "({ readout: document.querySelector('[data-readout]')?.textContent, joinedCount: document.querySelectorAll('.ml-glass[data-joined]').length })"],
  ];
  const driven = await runFile(process.execPath, ["scripts/drive.mjs", light.outPath, JSON.stringify(actions), "--reduced"], {
    timeout: 30000,
    maxBuffer: 16 * 1024 * 1024,
  });
  assert.match(driven.stdout, /console: clean/);
  const match = driven.stdout.match(/eval: (.*)/);
  assert.ok(match, driven.stdout);
  const state = JSON.parse(match[1]);
  assert.equal(state.readout, "merge 48 px · 6 of 6 joined");
  assert.equal(state.joinedCount, 6);
});

test("resolves Next.js @/components/iso imports and catches missing element-prop keys and nested client components", async () => {
  const figDir = mkdtempSync(join(tempDir, "nextjs-fig-"));
  writeFileSync(
    join(figDir, "piece.tsx"),
    `"use client";
export function ClientPiece() {
  return <g data-piece="client"><path d="M0 0L5 5" /></g>;
}
`,
  );
  writeFileSync(
    join(figDir, "live.tsx"),
    `"use client";
import * as React from "react";
import { IsoFigure } from "@/components/iso/react/draw";
import { useReadout } from "@/components/iso/react/live";
export function LiveRig({ base, dial, part }: { base: React.ReactNode; dial: React.ReactNode; part?: React.ReactNode }) {
  const { anchor } = useReadout<HTMLDivElement>();
  return (
    <div ref={anchor}>
      <IsoFigure width={200} height={120} label="probe">
        {base}
        {dial}
        {part}
      </IsoFigure>
    </div>
  );
}
`,
  );
  writeFileSync(
    join(figDir, "figure.tsx"),
    `import { Plate, Solid } from "@/components/iso/react/draw";
import { fitProjection, slabOf } from "@/components/iso/iso-kit";
import { LiveRig } from "./live";
import { ClientPiece } from "./piece";
const P = fitProjection([[-20, -20, 0], [20, 20, 10]], 200, 120);
const SLAB = slabOf({ x: -16, y: -12, w: 32, d: 24, r: 2 }, 0, 6, P);
const KEYED_BASE = <g key="base"><Solid paths={SLAB} tone="mid" /></g>;
const KEYED_DIAL = <g key="dial"><Solid paths={SLAB} tone="hi" /></g>;
const UNKEYED_DIAL = <g><Solid paths={SLAB} tone="hi" /></g>;
const NESTED_CLIENT = <g key="part"><ClientPiece /></g>;
export function CleanFigure() {
  return (
    <Plate fig="Fig 1" title="Clean probe" readout="ready">
      <LiveRig base={KEYED_BASE} dial={KEYED_DIAL} />
    </Plate>
  );
}
export function UnkeyedFigure() {
  return (
    <Plate fig="Fig 2" title="Unkeyed probe" readout="ready">
      <LiveRig base={KEYED_BASE} dial={UNKEYED_DIAL} />
    </Plate>
  );
}
export function NestedClientFigure() {
  return (
    <Plate fig="Fig 3" title="Nested client probe" readout="ready">
      <LiveRig base={KEYED_BASE} dial={KEYED_DIAL} part={NESTED_CLIENT} />
    </Plate>
  );
}
`,
  );

  const clean = await buildReactPage({
    target: figDir,
    exportName: "CleanFigure",
    out: join(figDir, "clean.html"),
  });
  assert.deepEqual(clean.problems, []);
  assert.equal(clean.title, "Clean probe");

  const unkeyed = await buildReactPage({
    target: figDir,
    exportName: "UnkeyedFigure",
    out: join(figDir, "unkeyed.html"),
  });
  assert.equal(unkeyed.problems.length, 1);
  assert.match(unkeyed.problems[0], /key-warning trap:.*element prop "dial" passed to LiveRig is missing a root key/);

  const nested = await buildReactPage({
    target: figDir,
    exportName: "NestedClientFigure",
    out: join(figDir, "nested.html"),
  });
  assert.equal(nested.problems.length, 1);
  assert.match(nested.problems[0], /key-warning trap:.*Client component ClientPiece is nested inside server-built element prop "part" passed to LiveRig/);

  await assert.rejects(
    runFile(process.execPath, [resolve("scripts/react-page.mjs"), figDir, "--export", "UnkeyedFigure", "--out", join(figDir, "cli-unkeyed.html")]),
    (error) => error.code === 1 && /key-warning trap:.*element prop "dial" passed to LiveRig is missing a root key/.test(error.stderr),
  );
});

test("resolves tsconfig paths, wraps forwardRef client components, checks array element keys, and validates options before building", async () => {
  const projDir = mkdtempSync(join(tempDir, "tsconfig-proj-"));
  const sharedDir = mkdtempSync(join(projDir, "shared-"));
  const star = "*";
  writeFileSync(
    join(projDir, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: {
        baseUrl: ".",
        paths: {
          [`@shared/${star}`]: [`./${sharedDir.slice(projDir.length + 1)}/${star}`],
        },
      },
    }),
  );
  writeFileSync(
    join(sharedDir, "forward-live.tsx"),
    `"use client";
import * as React from "react";
import { IsoFigure } from "@/components/iso/react/draw";
export const ForwardLive = React.forwardRef<HTMLDivElement, { items: React.ReactNode[] }>(function ForwardLive({ items }, ref) {
  return (
    <div ref={ref}>
      <IsoFigure width={200} height={120} label="forward">
        {items}
      </IsoFigure>
    </div>
  );
});
`,
  );
  writeFileSync(
    join(projDir, "figure.tsx"),
    `import { Plate, Solid } from "@/components/iso/react/draw";
import { fitProjection, slabOf } from "@/components/iso/iso-kit";
import { ForwardLive } from "@shared/forward-live";
const P = fitProjection([[-20, -20, 0], [20, 20, 10]], 200, 120);
const SLAB = slabOf({ x: -16, y: -12, w: 32, d: 24, r: 2 }, 0, 6, P);
export default function ArrayKeyFigure() {
  return (
    <Plate fig="Fig 4" title="Array probe" readout="ok">
      <ForwardLive items={[<g key="a"><Solid paths={SLAB} tone="mid" /></g>, <g><Solid paths={SLAB} tone="hi" /></g>]} />
    </Plate>
  );
}
`,
  );

  const built = await buildReactPage({ target: projDir, out: join(projDir, "out.html") });
  assert.equal(built.problems.length, 1);
  assert.match(built.problems[0], /key-warning trap:.*array prop "items" passed to ForwardLive contains an element without a key/);

  await assert.rejects(
    () => buildReactPage({ target: projDir, css: [join(projDir, "missing.css")], out: join(projDir, "out2.html") }),
    /css file not found/,
  );

  await assert.rejects(
    runFile(process.execPath, [resolve("scripts/react-page.mjs")]),
    (error) => error.code === 1 && /missing target figure folder or \.tsx file/.test(error.stderr),
  );
});

