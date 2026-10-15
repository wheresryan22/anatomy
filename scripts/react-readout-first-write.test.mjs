import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { delimiter, dirname, join, resolve } from "node:path";
import { promisify } from "node:util";
import test from "node:test";
const require = createRequire(import.meta.url);
const { build } = require("esbuild");
const nodePaths = (process.env.NODE_PATH ?? "").split(delimiter).filter(Boolean);
const resolveOptions = nodePaths.length ? { paths: nodePaths } : undefined;
const alias = Object.fromEntries(["react", "react-dom"].map(name => [name, dirname(require.resolve(name+"/package.json", resolveOptions))]));
const directory = mkdtempSync(join(tmpdir(), "anatomy-react-readout-"));
let observed;
try {
  const entry = `import React,{useEffect,useLayoutEffect} from 'react';import {createRoot} from 'react-dom/client';import {flushSync} from 'react-dom';import {useReadout} from ${JSON.stringify(resolve("kit/react/live.tsx"))};
const changes={};function Probe({mode}){const{anchor,say}=useReadout();useLayoutEffect(()=>{const node=anchor.current.closest('.iso-plate').querySelector('[data-readout]');const observer=new MutationObserver(records=>changes[mode]=(changes[mode]??0)+records.length);observer.observe(node,{childList:true});if(mode==='layout')say('layout');return()=>observer.disconnect();},[]);useEffect(()=>{if(mode==='empty')say('');if(mode==='healthy'||mode==='repeat')say(mode);setTimeout(()=>{if(mode==='layout')say('layout');if(mode==='repeat')say('repeat');},20);},[]);return React.createElement('div',{className:'iso-plate',id:mode},React.createElement('span',{'data-readout':true},'rest'),React.createElement('div',{ref:anchor}));}
flushSync(()=>createRoot(document.getElementById('root')).render(React.createElement(React.Fragment,null,...['layout','empty','healthy','repeat'].map(mode=>React.createElement(Probe,{key:mode,mode})))));setTimeout(()=>{const values=Object.fromEntries(['layout','empty','healthy','repeat'].map(mode=>[mode,document.querySelector('#'+mode+' [data-readout]').textContent]));window.readoutObserved={values,changes};document.getElementById('results').textContent=JSON.stringify(window.readoutObserved);},100);`;
  await build({ stdin: { contents: entry, resolveDir: process.cwd(), loader: "jsx" }, bundle: true, outfile: join(directory, "fixture.js"), platform: "browser", nodePaths, alias });
  writeFileSync(join(directory, "fixture.html"), '<!doctype html><html><body><div id="root"></div><pre id="results"></pre><script src="fixture.js"></script></body></html>');
  const result = await promisify(execFile)(process.execPath, ["scripts/drive.mjs", join(directory, "fixture.html"), JSON.stringify([["eval", "({observed:window.readoutObserved,html:document.body.innerHTML})"]])], { timeout: 30000, maxBuffer: 16 * 1024 * 1024 });
  const payload = result.stdout.match(/eval: (.*)/);
  assert.ok(payload, "actual ReactDOM client must complete and publish its native DOM observations");
  const inspection = JSON.parse(payload[1]);
  observed = inspection.observed;
  console.log("actual client inspection:", JSON.stringify(inspection));
  assert.ok(observed?.values, `actual native observations are required: ${result.stdout}`);
} finally {
  rmSync(directory, { recursive: true, force: true });
}
test("native ReactDOM readout accepts its first empty text", () => assert.equal(observed.values.empty, ""));
test("native ReactDOM readout accepts layout-effect text before passive binding", () => assert.equal(observed.values.layout, "layout"));
test("native ReactDOM readout preserves ordinary passive-effect text", () => assert.equal(observed.values.healthy, "healthy"));
test("native ReactDOM readout preserves duplicate-write suppression", () => {
  assert.equal(observed.values.repeat, "repeat");
  assert.equal(observed.changes.repeat, 1);
});
