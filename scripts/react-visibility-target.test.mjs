import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { delimiter, dirname, join, resolve } from "node:path";
import test from "node:test";
import { promisify } from "node:util";
const require = createRequire(import.meta.url);
const { build } = require("esbuild");
const nodePaths = (process.env.NODE_PATH ?? "").split(delimiter).filter(Boolean);
const resolveOptions = nodePaths.length ? { paths: nodePaths } : undefined;
const alias = Object.fromEntries(["react", "react-dom"].map(name => [name, dirname(require.resolve(name+"/package.json", resolveOptions))]));
const directory = await mkdtemp(join(tmpdir(), "anatomy-visibility-target-"));
let observed;
try {
  const entry = `import React,{StrictMode,useRef,useState,useEffect} from 'react';import {createRoot} from 'react-dom/client';import {flushSync} from 'react-dom';import {useInView} from ${JSON.stringify(resolve("kit/react/live.tsx"))};
function Probe({mode}){const ref=useRef(null);const [phase,setPhase]=useState(false);const visible=useInView(ref);useEffect(()=>{const timer=setTimeout(()=>setPhase(true),150);return()=>clearTimeout(timer)},[]);const absent=mode==='late'&&!phase;const distant=(mode==='swap'&&!phase)||(mode==='moved'&&phase);return React.createElement('section',{id:'probe-'+mode,'data-visible':String(visible),'data-phase':String(phase)},absent?null:React.createElement('div',{ref,key:mode==='swap'?String(phase):'stable','data-target':mode,style:{position:'absolute',top:distant?'5000px':'20px',left:'20px',width:'20px',height:'20px'}},mode));}
for(const mode of ['swap','late','healthy','moved','strict'])flushSync(()=>createRoot(document.getElementById(mode)).render(mode==='strict'?React.createElement(StrictMode,null,React.createElement(Probe,{mode})):React.createElement(Probe,{mode})));setTimeout(()=>{window.visibilityObserved=Object.fromEntries(['swap','late','healthy','moved','strict'].map(mode=>[mode,{visible:document.querySelector('#probe-'+mode).dataset.visible,phase:document.querySelector('#probe-'+mode).dataset.phase,top:document.querySelector('[data-target="'+mode+'"]').getBoundingClientRect().top}]))},700);`;
  await build({ stdin: { contents: entry, resolveDir: process.cwd(), loader: "jsx" }, bundle: true, outfile: join(directory,"fixture.js"), platform: "browser", nodePaths, alias });
  const page = join(directory,"figure.html");
  await writeFile(page,'<!doctype html><div class="iso-plate"><div id="swap"></div><div id="late"></div><div id="healthy"></div><div id="moved"></div><div id="strict"></div></div><script src="fixture.js"></script>');
  const result = await promisify(execFile)(process.execPath,["scripts/drive.mjs",page,JSON.stringify([["eval","window.visibilityObserved"]])],{timeout:30000});
  const payload = result.stdout.match(/eval: (.*)/);
  assert.ok(payload, result.stdout);
  observed = JSON.parse(payload[1]);
  assert.ok(observed, result.stdout);
} finally { await rm(directory,{recursive:true,force:true}); }
test("native visibility observes a replacement node on the same ref",()=>{
  assert.equal(observed.swap.phase,"true");assert.equal(observed.swap.top,20);assert.equal(observed.swap.visible,"true");
});
test("native visibility observes a target mounted after the initial empty ref",()=>{
  assert.equal(observed.late.phase,"true");assert.equal(observed.late.top,20);assert.equal(observed.late.visible,"true");
});
test("an unchanged visible target stays observed",()=>assert.equal(observed.healthy.visible,"true"));
test("the same target becoming distant retains real visibility updates",()=>{
  assert.equal(observed.moved.top,5000);assert.equal(observed.moved.visible,"false");
});
test("native StrictMode effect replay preserves ordinary observation",()=>assert.equal(observed.strict.visible,"true"));
