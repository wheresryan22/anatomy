// Exports the plant to export/epk-plant.glb plus the equipment register (JSON and CSV).
// Runs the built page in headless Chromium through Playwright, so the export matches the twin exactly.
// Usage: npm run build && node tools/export-unreal.mjs
// Env: CHROME_PATH (Chromium binary), PLAYWRIGHT (path to the playwright package), THREE_DIR (local three@0.160.0, optional)

import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { writeFile, mkdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');

const bundle = await build({
  entryPoints: [path.join(root, 'src/export/entry.js')],
  bundle: true, format: 'esm', write: false, minify: true, target: 'es2020',
  external: ['three', 'three/addons/*'],
});

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || undefined,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, acceptDownloads: true });
page.on('pageerror', (e) => console.error('page error:', e.message));
if (process.env.THREE_DIR) {
  await page.route('https://cdn.jsdelivr.net/npm/three@0.160.0/**', (r) => {
    const f = path.join(process.env.THREE_DIR, r.request().url().split('three@0.160.0/')[1]);
    existsSync(f) ? r.fulfill({ path: f, contentType: 'application/javascript' }) : r.abort();
  });
}
await page.goto('file://' + path.join(root, 'dist/index.html'));
await page.waitForFunction(() => window.twin && !document.getElementById('loading'), null, { timeout: 300000 });
await page.evaluate(() => { window.twin.ui.playing = false; });
await page.addScriptTag({ type: 'module', content: bundle.outputFiles[0].text });
await page.waitForFunction(() => !!window.__epkExport, null, { timeout: 60000 });

const outDir = path.join(root, 'export');
await mkdir(outDir, { recursive: true });
const [download] = await Promise.all([
  page.waitForEvent('download', { timeout: 600000 }),
  page.evaluate(async () => {
    const { glb, stats } = await window.__epkExport.exportPlant(window.twin);
    window.__epkStats = stats;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([glb], { type: 'model/gltf-binary' }));
    a.download = 'epk-plant.glb';
    document.body.appendChild(a);
    a.click();
  }),
]);
await download.saveAs(path.join(outDir, 'epk-plant.glb'));
const stats = await page.evaluate(() => window.__epkStats);
const rows = await page.evaluate(() => window.__epkExport.manifest(window.twin));
await browser.close();

await writeFile(path.join(outDir, 'equipment.json'), JSON.stringify(rows, null, 2) + '\n');
const q = (v) => `"${String(v).replace(/"/g, '""')}"`;
const csv = ['Name,Title,Model,Zone,Source,Description,Spec,X_m,Y_m,Z_m']
  .concat(rows.map((r) => [r.tag, r.name, r.model, r.zone, r.source, r.description, r.spec.map(([k, v]) => `${k}: ${v}`).join('; '), ...r.position_m].map(q).join(',')))
  .join('\n');
await writeFile(path.join(outDir, 'equipment.csv'), '﻿' + csv + '\n');
const size = (await stat(path.join(outDir, 'epk-plant.glb'))).size;
console.log(`export/epk-plant.glb ${(size / 1048576).toFixed(1)} MB · ${stats.nodes} nodes · ${stats.meshes} meshes · ${Math.round(stats.tris).toLocaleString()} triangles · ${stats.materials} shared materials`);
console.log(`export/equipment.json, export/equipment.csv · ${rows.length} items`);
