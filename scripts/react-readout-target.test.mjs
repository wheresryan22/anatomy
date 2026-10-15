import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile, mkdir, copyFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { delimiter, dirname, join, resolve } from "node:path";
import { promisify } from "node:util";
import test from "node:test";

const require = createRequire(import.meta.url);
const { build } = require("esbuild");
const nodePaths = (process.env.NODE_PATH ?? "").split(delimiter).filter(Boolean);
const resolveOptions = nodePaths.length ? { paths: nodePaths } : undefined;
const alias = Object.fromEntries(["react", "react-dom"].map(name => [name, dirname(require.resolve(name + "/package.json", resolveOptions))]));
const directory = await mkdtemp(join(tmpdir(), "anatomy-readout-target-"));
let observed;
try {
  const entry = `import React,{useLayoutEffect} from 'react';import {createRoot} from 'react-dom/client';import {flushSync} from 'react-dom';import {useReadout} from ${JSON.stringify(resolve("kit/react/live.tsx"))};
const modes=['readout','same','anchor','late','healthy'];const roots={};const sayers={};const old={};
function Probe({mode,phase}){const{anchor,say}=useReadout();sayers[mode]=say;useLayoutEffect(()=>{say(phase&&mode!=='same'?'reading 2':'reading 1')},[phase]);return React.createElement('section',{className:'iso-plate',key:mode==='anchor'?phase:'stable'},React.createElement('h2',null,mode),mode==='late'&&!phase?null:React.createElement('span',{'data-readout':true,key:mode==='readout'||mode==='same'?phase:'stable'},'rest'),React.createElement('div',{ref:anchor}));}
for(const mode of modes){roots[mode]=createRoot(document.getElementById(mode));flushSync(()=>roots[mode].render(React.createElement(Probe,{mode,phase:0})));old[mode]=document.querySelector('#'+mode+' [data-readout]')}
window.advance=()=>{for(const mode of modes)flushSync(()=>roots[mode].render(React.createElement(Probe,{mode,phase:1})));window.observed=Object.fromEntries(modes.map(mode=>[mode,{text:document.querySelector('#'+mode+' [data-readout]')?.textContent,oldText:old[mode]?.textContent,oldConnected:old[mode]?.isConnected}]));return window.observed};
window.repeat=async()=>{const node=document.querySelector('#healthy [data-readout]');let writes=0;const observer=new MutationObserver(records=>writes+=records.length);observer.observe(node,{childList:true});sayers.healthy('reading 2');sayers.healthy('reading 2');await Promise.resolve();observer.disconnect();return writes};`;
  await build({ stdin: { contents: entry, resolveDir: process.cwd(), loader: "jsx" }, bundle: true, outfile: join(directory, "fixture.js"), platform: "browser", nodePaths, alias });
  const page = join(directory, "fixture.html");
  await writeFile(page, '<!doctype html><style>body{font:18px system-ui;background:#f5f5f5;color:#222;padding:24px}body[data-theme="dark"]{background:#161616;color:#eee}.iso-plate{padding:16px;border:1px solid #888;margin:10px;display:inline-block;min-width:170px}h2{font-size:16px}[data-readout]{font:24px monospace}</style><h1>React readout after target replacement</h1><p>Expected: reading 2 in every card except same, which must show reading 1.</p><div id="readout"></div><div id="same"></div><div id="anchor"></div><div id="late"></div><div id="healthy"></div><script src="fixture.js"></script>');
  const actions = [["eval", "window.advance()"], ["eval", "window.repeat()"]];
  if (process.env.ANATOMY_PROOF_DIR) {
    await mkdir(process.env.ANATOMY_PROOF_DIR, {recursive:true});
    actions.push(["shot", join(process.env.ANATOMY_PROOF_DIR, "light.png"), "body"], ["eval", "document.body.dataset.theme='dark'"], ["shot", join(process.env.ANATOMY_PROOF_DIR, "dark.png"), "body"]);
  }
  const result = await promisify(execFile)(process.execPath, ["scripts/drive.mjs", page, JSON.stringify(actions)], {timeout:30000});
  const payloads = [...result.stdout.matchAll(/eval: (.*)/g)].map(match=>JSON.parse(match[1]));
  observed = payloads[0];
  observed.repeatWrites = payloads[1];
  console.log(JSON.stringify(observed));
} finally { await rm(directory, {recursive:true,force:true}); }

for(const mode of ["readout","anchor","late","healthy"])
  test(`readout writes to the current ${mode} target`,()=>assert.equal(observed[mode].text,"reading 2"));
test("replacement accepts the same text as the old target",()=>assert.equal(observed.same.text,"reading 1"));
for(const mode of ["readout","anchor"])
  test(`detached ${mode} target is no longer written`,()=>{
    assert.equal(observed[mode].oldConnected,false);
    assert.equal(observed[mode].oldText,"reading 1");
  });
test("unchanged targets still suppress duplicate writes",()=>assert.equal(observed.repeatWrites,0));
