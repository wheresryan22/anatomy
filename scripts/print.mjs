import { spawnSync } from "node:child_process";
import { closeSync, existsSync, mkdtempSync, openSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { FORMATS, PAPER, pagesOf, sheetHtml } from "./print-sheet.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const DRIVE = join(HERE, "drive.mjs");

function usage() {
  console.log(`Print a figure as an explained drawing on one A4 sheet: an HTML page and a PDF.

  node print.mjs <sheet.mjs> [--format poster|drawing|detailed|all] [--letter] [--png] [--out name]

  sheet.mjs     a module whose default export names the built page, the poses to capture, the parts and the text
                (see references/print.md and examples/raptor-engine/sheet.mjs)
  --format f    poster (one page, big title, numbers and a legend; the default), drawing (one page, parts list,
                specification and a strip of steps), detailed (two pages: the figure with every part, then the steps,
                close-ups and the why), or all
  --letter      US Letter instead of A4
  --png         also write a preview PNG of the sheet
  --out name    output base name (default: the spec's out, else the page name)

Writes <name>-<format>-a4.html and .pdf next to the spec.`);
}

export function chromePath() {
  const candidates = [
    process.env.CHROME_PATH,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    ...(process.env.LOCALAPPDATA ? [join(process.env.LOCALAPPDATA, "Google\\Chrome\\Application\\chrome.exe")] : []),
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  ].filter(Boolean);
  const playwright = join(homedir(), "Library/Caches/ms-playwright");
  if (existsSync(playwright)) {
    for (const dir of readdirSync(playwright).sort().reverse()) {
      for (const sub of ["chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing", "chrome-mac/Chromium.app/Contents/MacOS/Chromium", "chrome-linux/chrome"]) {
        candidates.push(join(playwright, dir, sub));
      }
    }
  }
  const linux = join(homedir(), ".cache/ms-playwright");
  if (existsSync(linux)) for (const dir of readdirSync(linux).sort().reverse()) for (const sub of ["chrome-linux64/chrome", "chrome-linux/chrome"]) candidates.push(join(linux, dir, sub));
  const win = join(homedir(), "AppData/Local/ms-playwright");
  if (existsSync(win)) for (const dir of readdirSync(win).sort().reverse()) for (const sub of ["chrome-win/chrome.exe", "chromium-win64/chrome.exe"]) candidates.push(join(win, dir, sub));
  return candidates.find((path) => existsSync(path));
}

export function captureScript(spec) {
  const config = {
    layers: spec.layers ?? ".iso-stage svg.iso-svg, .iso-plate svg.iso-svg",
    strip: spec.strip ?? [],
    parts: (spec.parts ?? []).filter((part) => part.select).map(({ id, select }) => ({ id, select })),
    frame: spec.rasterSelector ?? ".iso-stage",
  };
  return `(() => {
  const C = ${JSON.stringify(config)};
  const TONES = ["hi", "mid", "lo", "dot"];
  const layers = [...document.querySelectorAll(C.layers)].filter((svg) => svg.viewBox && svg.viewBox.baseVal && svg.viewBox.baseVal.width);
  if (!layers.length) return { __print: true, error: "no layers match " + C.layers };
  const base = layers[0];
  const vbox = base.viewBox.baseVal;
  const rect = base.getBoundingClientRect();
  const k = vbox.width / rect.width;
  const toVb = (b) => [vbox.x + (b.left - rect.left) * k, vbox.y + (b.top - rect.top) * k, vbox.x + (b.right - rect.left) * k, vbox.y + (b.bottom - rect.top) * k];
  const sets = C.parts.map((part) => ({ id: part.id, els: layers.map((svg) => [...svg.querySelectorAll(part.select)]) }));
  const boxes = {};
  const anchors = {};
  for (const set of sets) {
    let box = null;
    let best = null;
    for (const el of set.els.flat()) {
      const b = el.getBoundingClientRect();
      if (!b.width && !b.height) continue;
      const v = toVb(b);
      box = box ? [Math.min(box[0], v[0]), Math.min(box[1], v[1]), Math.max(box[2], v[2]), Math.max(box[3], v[3])] : v;
      for (const shape of el.matches("path,circle,ellipse,rect,polygon") ? [el] : el.querySelectorAll("path,circle,ellipse,rect,polygon")) {
        if (shape.closest(".iso-halo, [class*=halo]")) continue;
        const s = shape.getBoundingClientRect();
        const area = s.width * s.height;
        if (!best || area > best.area) best = { area, at: [(toVb(s)[0] + toVb(s)[2]) / 2, (toVb(s)[1] + toVb(s)[3]) / 2] };
      }
    }
    if (box) boxes[set.id] = box.map((n) => Math.round(n * 10) / 10);
    if (best) anchors[set.id] = best.at.map((n) => Math.round(n * 10) / 10);
  }
  const html = layers.map((svg, index) => {
    const live = new Map();
    for (const set of sets) for (const el of set.els[index]) live.set(el, set.id);
    const clone = svg.cloneNode(true);
    const walkLive = [...svg.querySelectorAll("*")];
    const walkClone = [...clone.querySelectorAll("*")];
    walkLive.forEach((el, at) => {
      const id = live.get(el);
      if (!id) return;
      const cs = getComputedStyle(el);
      const tokens = TONES.map((tone) => "--anatomy-" + tone + ":var(--on-" + id + "-" + tone + ",var(--part-" + tone + "," + (cs.getPropertyValue("--anatomy-" + tone).trim() || "currentColor") + "))").join(";");
      const target = walkClone[at];
      const own = target.getAttribute("style");
      target.setAttribute("style", (own ? own.replace(/;?\\s*$/, ";") : "") + tokens + ";display:var(--show-" + id + "," + (cs.display === "none" ? "none" : "inline") + ")");
      target.setAttribute("data-print-part", id);
    });
    for (const sel of C.strip) clone.querySelectorAll(sel).forEach((el) => el.remove());
    clone.querySelectorAll("title,desc").forEach((el) => el.remove());
    clone.querySelectorAll("[id]").forEach((el) => el.setAttribute("id", "ps" + index + "-" + el.id));
    let inner = clone.innerHTML;
    clone.querySelectorAll("[id]").forEach((el) => {
      const old = el.id.slice(("ps" + index + "-").length);
      inner = inner.split("url(#" + old + ")").join("url(#" + el.id + ")").split('href="#' + old + '"').join('href="#' + el.id + '"');
    });
    return inner;
  });
  let content = null;
  for (const svg of layers) for (const el of svg.children) {
    if (el.tagName === "defs" || el.tagName === "title" || el.tagName === "desc") continue;
    const b = el.getBoundingClientRect();
    if (!b.width || !b.height) continue;
    const v = toVb(b);
    content = content ? [Math.min(content[0], v[0]), Math.min(content[1], v[1]), Math.max(content[2], v[2]), Math.max(content[3], v[3])] : v;
  }
  const css = [...document.querySelectorAll("style")].map((s) => s.textContent).join("\\n");
  const r = (document.querySelector(C.frame) || base.parentElement).getBoundingClientRect();
  return { __print: true, vb: [vbox.x, vbox.y, vbox.width, vbox.height], content: content && [content[0], content[1], content[2] - content[0], content[3] - content[1]].map((n) => Math.round(n * 10) / 10), k, offset: [(rect.left - r.left), (rect.top - r.top)], layers: html, boxes, anchors, css, readout: (document.querySelector("[data-readout]") || {}).textContent || "" };
})()`;
}

function drive(page, actions, { reduced, width, height }) {
  const profile = mkdtempSync(join(tmpdir(), "iso-print-"));
  const file = join(profile, "actions.json");
  writeFileSync(file, JSON.stringify(actions));
  const args = [DRIVE, page, "--actions", file, "--width", String(width), "--height", String(height)];
  if (reduced) args.push("--reduced");
  const log = join(profile, "out.txt");
  const fd = openSync(log, "w");
  const run = spawnSync(process.execPath, args, { stdio: ["ignore", fd, "pipe"], encoding: "utf8", maxBuffer: 1 << 26 });
  closeSync(fd);
  const stdout = readFileSync(log, "utf8");
  rmSync(profile, { recursive: true, force: true });
  if (run.status !== 0) throw new Error(`drive.mjs failed:\n${(run.stderr || stdout || "").slice(-2000)}`);
  return stdout
    .split("\n")
    .filter((line) => line.startsWith("eval: "))
    .map((line) => JSON.parse(line.slice(6)));
}

export async function capture(spec, pagePath) {
  const options = { reduced: spec.reduced ?? true, width: spec.width ?? 1200, height: spec.height ?? 1200 };
  const views = Object.entries(spec.views ?? { rest: {} });
  const script = captureScript(spec);
  const actions = [["wait", spec.settle ?? 1200]];
  for (const [, view] of views) actions.push(...(view.actions ?? []), ["eval", script], ...(view.reset ?? []));
  const results = drive(pagePath, actions, options).filter((result) => result && result.__print);
  if (results.length !== views.length) throw new Error(`expected ${views.length} captures, got ${results.length}`);
  const out = { views: {}, css: "" };
  results.forEach((result, index) => {
    if (result.error) throw new Error(result.error);
    out.css = result.css;
    const [name, view] = views[index];
    out.views[name] = { vb: result.vb, content: result.content, layers: result.layers, boxes: result.boxes, anchors: result.anchors, k: result.k, offset: result.offset, readout: result.readout, raster: view.raster ? true : undefined };
  });
  const rasters = views.filter(([, view]) => view.raster);
  if (rasters.length) {
    const dir = mkdtempSync(join(tmpdir(), "iso-print-shots-"));
    const shots = [["wait", spec.settle ?? 1200]];
    for (const [name, view] of views) {
      shots.push(...(view.actions ?? []));
      if (view.raster) {
        const captured = out.views[name];
        const region = view.raster.region ?? captured.vb;
        const [vx, vy] = captured.vb;
        const box = [(region[0] - vx) / captured.k + captured.offset[0], (region[1] - vy) / captured.k + captured.offset[1], region[2] / captured.k, region[3] / captured.k].map((n) => Math.round(n));
        shots.push(["shot", join(dir, `${name}.png`), view.raster.selector ?? spec.rasterSelector ?? ".iso-stage", view.raster.scale ?? 2, box]);
        out.views[name].raster = { region, file: join(dir, `${name}.png`) };
      }
      shots.push(...(view.reset ?? []));
    }
    drive(pagePath, shots, options);
    for (const [name] of rasters) {
      const raster = out.views[name].raster;
      if (!existsSync(raster.file)) throw new Error(`raster shot for ${name} was not written`);
      raster.href = `data:image/png;base64,${readFileSync(raster.file).toString("base64")}`;
      delete raster.file;
    }
    rmSync(dir, { recursive: true, force: true });
  }
  return out;
}

export function printPdf(htmlFile, pdfFile, { png, paper, pages: expected = 1 } = {}) {
  const binary = chromePath();
  if (!binary) throw new Error("No Chrome found. Set CHROME_PATH to a Chrome or Chromium binary.");
  const profile = mkdtempSync(join(tmpdir(), "iso-print-pdf-"));
  const common = ["--headless=new", ...(process.platform === "linux" ? ["--no-sandbox"] : []), "--disable-gpu", "--hide-scrollbars", "--no-first-run", "--no-default-browser-check", "--mute-audio", "--allow-file-access-from-files", `--user-data-dir=${profile}`];
  const url = pathToFileURL(htmlFile).href;
  if (existsSync(pdfFile)) rmSync(pdfFile);
  spawnSync(binary, [...common, "--no-pdf-header-footer", `--print-to-pdf=${pdfFile}`, url], { stdio: "ignore", timeout: 120000 });
  if (png) spawnSync(binary, [...common, "--force-device-scale-factor=2", `--window-size=${paper.px[0]},${paper.px[1] * expected}`, `--screenshot=${png}`, `${url}?print`], { stdio: "ignore", timeout: 120000 });
  rmSync(profile, { recursive: true, force: true });
  if (!existsSync(pdfFile) || !statSync(pdfFile).size) throw new Error(`Chrome did not write ${pdfFile}`);
  const pages = (readFileSync(pdfFile, "latin1").match(/\/Type\s*\/Page(?![s\w])/g) ?? []).length;
  return { pages, bytes: statSync(pdfFile).size };
}

async function main() {
  const argv = process.argv.slice(2);
  if (!argv.length || argv.includes("--help") || argv.includes("-h")) {
    usage();
    process.exit(argv.length ? 0 : 1);
  }
  const rest = [];
  const options = { letter: false, png: false, out: null, format: null };
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === "--letter") options.letter = true;
    else if (arg === "--png") options.png = true;
    else if (arg === "--out") options.out = argv[++index];
    else if (arg === "--format") options.format = argv[++index];
    else rest.push(arg);
  }
  const specFile = resolve(rest[0]);
  const spec = (await import(pathToFileURL(specFile).href)).default;
  const dir = dirname(specFile);
  const pagePath = resolve(dir, spec.page);
  if (!existsSync(pagePath)) throw new Error(`no built page at ${pagePath}; build the figure with --light first`);
  const paper = options.letter ? PAPER.letter : PAPER.a4;
  const formats = options.format === "all" ? FORMATS : [options.format ?? spec.format ?? "poster"];
  for (const format of formats) if (!FORMATS.includes(format)) throw new Error(`unknown format "${format}"; use one of ${FORMATS.join(", ")} or all`);
  const base = options.out ?? spec.out ?? spec.page.replace(/(-light)?\.html$/, "");
  const captured = await capture(spec, pagePath);
  for (const part of spec.parts ?? []) {
    if (part.select && !captured.views[spec.main.view].boxes[part.id]) console.warn(`warning: part ${part.id} matched nothing in view ${spec.main.view}`);
  }
  let failed = false;
  for (const format of formats) {
    const name = `${base}-${format}-${options.letter ? "letter" : "a4"}`;
    const html = sheetHtml(captured, spec, paper, format);
    const htmlFile = join(dir, `${name}.html`);
    writeFileSync(htmlFile, html);
    const pdfFile = join(dir, `${name}.pdf`);
    const png = options.png ? join(dir, `${name}.png`) : null;
    const expected = pagesOf(format, spec);
    const { pages, bytes } = printPdf(htmlFile, pdfFile, { png, paper, pages: expected });
    console.log(`wrote ${name}.html (${(html.length / 1024).toFixed(0)} KB) and ${name}.pdf (${(bytes / 1024).toFixed(0)} KB, ${pages} page${pages === 1 ? "" : "s"})${png ? ` and ${name}.png` : ""}`);
    if (pages !== expected) {
      console.error(`${format} should print on ${expected} page${expected === 1 ? "" : "s"} but runs to ${pages}; shorten the text or the steps until it fits`);
      failed = true;
    }
  }
  if (failed) process.exit(1);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
