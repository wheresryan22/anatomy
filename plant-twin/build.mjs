// Bundles src/ into one HTML file. three.js stays on the CDN through the import map.
// Usage: node build.mjs   →  dist/index.html (full page) and dist/artifact.html (body fragment)

import { build } from 'esbuild';
import { readFile, writeFile, mkdir } from 'node:fs/promises';

const root = new URL('.', import.meta.url).pathname;
const out = await build({
  entryPoints: [`${root}src/main.js`],
  bundle: true,
  format: 'esm',
  minify: true,
  write: false,
  target: 'es2020',
  external: ['three', 'three/addons/*', 'three-mesh-bvh'],
  legalComments: 'none',
});
const js = out.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const css = (await readFile(`${root}src/styles.css`, 'utf8')).trim();
const html = await readFile(`${root}index.html`, 'utf8');

const head = html.slice(html.indexOf('<title>'), html.indexOf('<link rel="stylesheet" href="src/styles.css">'));
const importmap = html.slice(html.indexOf('<script type="importmap">'), html.indexOf('</script>', html.indexOf('<script type="importmap">')) + 9);
const app = html.slice(html.indexOf('<!--APP-->') + 10, html.indexOf('<!--/APP-->')).trim();

const fragment = `${head.trim()}\n<style>\n${css}\n</style>\n${importmap}\n${app}\n<script type="module">\n${js}</script>\n`;
const page = `<!doctype html>\n<html lang="ru">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n${head.trim()}\n<style>\n${css}\n</style>\n${importmap}\n</head>\n<body>\n${app}\n<script type="module">\n${js}</script>\n</body>\n</html>\n`;

await mkdir(`${root}dist`, { recursive: true });
await writeFile(`${root}dist/index.html`, page);
await writeFile(`${root}dist/artifact.html`, fragment);
console.log(`dist/index.html ${(page.length / 1024).toFixed(0)} KB, dist/artifact.html ${(fragment.length / 1024).toFixed(0)} KB`);
