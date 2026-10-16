import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import Module, { createRequire } from "node:module";
import { basename, delimiter, dirname, extname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { format } from "node:util";
import { ISO_CSS, pageHtml } from "../kit/iso-kit.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const SKILL = resolve(HERE, "..");
const KIT_DIR = join(SKILL, "kit");
const EXTENSIONS = ["", ".tsx", ".ts", ".jsx", ".js", ".mjs", ".cjs", ".json", ".css"];

const KIT_FILES = {
  "iso-kit": "iso-kit.ts",
  "iso.css": "iso.css",
  "react/draw": "react/draw.tsx",
  "react/live": "react/live.tsx",
  lathe: "lathe.mjs",
  tube: "tube.mjs",
  audit: "audit.mjs",
  gl: "gl.mjs",
  "gl-shared": "gl-shared.mjs",
  turn: "turn.mjs",
  "turn-build": "turn-build.mjs",
  "turn-audit": "turn-audit.mjs",
  "turn-fixed": "turn-fixed.mjs",
  "canvas-painter": "canvas-painter.mjs",
};

function usage(message) {
  if (message) console.error(`react-page: ${message}\n`);
  console.log(`Build a React or Next.js figure into a standalone HTML page for capture.mjs, drive.mjs and lines.mjs.

  node scripts/react-page.mjs <figure-dir | file.tsx> [options]

  --out <file.html>     output HTML path (default: shots/<name>.html or shots/<name>-light.html)
  --light               build the light-theme page (sets data-theme="light")
  --theme <dark|light>  choose the theme explicitly (default: dark, or light with --light)
  --export <Name>       component export name from the entry module
  --title <text>        document <title> (default: Plate title or figure name)
  --width <px>          page max-width in CSS px (default: 650)
  --css <file.css>      extra stylesheet to inline (may be repeated)

Requires react, react-dom and esbuild in node_modules or NODE_PATH.`);
  process.exit(message ? 1 : 0);
}

export function parseArgs(argv) {
  const options = { theme: "dark", width: 650, css: [] };
  const rest = [];
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    const next = () => {
      const value = argv[++index];
      if (value === undefined || value.startsWith("--")) throw new Error(`${arg} needs a value`);
      return value;
    };
    if (arg === "--help" || arg === "-h") options.help = true;
    else if (arg === "--light") options.theme = "light";
    else if (arg === "--theme") options.theme = next();
    else if (arg === "--out") options.out = next();
    else if (arg === "--export") options.exportName = next();
    else if (arg === "--title") options.title = next();
    else if (arg === "--width") options.width = Number(next());
    else if (arg === "--css") options.css.push(next());
    else if (arg.startsWith("--")) throw new Error(`unknown option ${arg}`);
    else rest.push(arg);
  }
  options.target = rest[0];
  if (rest.length > 1) throw new Error(`unexpected argument ${rest[1]}`);
  if (options.theme !== "dark" && options.theme !== "light") throw new Error("--theme must be dark or light");
  if (!Number.isFinite(options.width) || options.width <= 0) throw new Error("--width needs a number above 0");
  return options;
}

function resolveEntry(target) {
  const full = resolve(target);
  if (!existsSync(full)) throw new Error(`target not found: ${target}`);
  const stat = statSync(full);
  if (!stat.isDirectory()) return { entryPath: full, figureDir: dirname(full), baseName: basename(full).replace(/\.[jt]sx?$/, "") === "figure" || basename(full).replace(/\.[jt]sx?$/, "") === "index" ? basename(dirname(full)) : basename(full, extname(full)) };
  for (const candidate of ["figure.tsx", "figure.jsx", "index.tsx", "index.jsx"]) {
    const file = join(full, candidate);
    if (existsSync(file)) return { entryPath: file, figureDir: full, baseName: basename(full) };
  }
  const tsx = readdirSync(full).filter((name) => /\.[jt]sx$/.test(name) && !/\.test\.[jt]sx$/.test(name)).sort();
  if (tsx.length === 1) return { entryPath: join(full, tsx[0]), figureDir: full, baseName: basename(full) };
  throw new Error(`could not find figure.tsx in ${target}`);
}

function collectNodePaths(startDirs) {
  const found = [];
  const seen = new Set();
  const add = (dir) => {
    if (!dir) return;
    const full = resolve(dir);
    if (seen.has(full) || !existsSync(full)) return;
    seen.add(full);
    found.push(full);
  };
  for (const part of (process.env.NODE_PATH ?? "").split(delimiter).filter(Boolean)) add(part);
  for (const start of startDirs) {
    let current = resolve(start);
    while (true) {
      add(join(current, "node_modules"));
      const parent = dirname(current);
      if (parent === current) break;
      current = parent;
    }
  }
  return found;
}

function loadToolchain(nodePaths) {
  const req = createRequire(import.meta.url);
  const resolvePkg = (specifier) => {
    try {
      return req.resolve(specifier, { paths: nodePaths });
    } catch {
      return null;
    }
  };
  const esbuildPath = resolvePkg("esbuild");
  const reactPkg = resolvePkg("react/package.json");
  const reactDomPkg = resolvePkg("react-dom/package.json");
  if (!esbuildPath || !reactPkg || !reactDomPkg) {
    throw new Error("missing react, react-dom or esbuild. Run inside a React project or set NODE_PATH to a node_modules directory.");
  }
  const esbuild = req(esbuildPath);
  const reactDir = dirname(reactPkg);
  const reactDomDir = dirname(reactDomPkg);
  return {
    esbuild,
    nodePaths,
    alias: {
      react: reactDir,
      "react-dom": reactDomDir,
    },
  };
}

function fileExistsWithExt(basePath) {
  for (const ext of EXTENSIONS) {
    const candidate = basePath + ext;
    if (existsSync(candidate) && !statSync(candidate).isDirectory()) return candidate;
  }
  if (existsSync(basePath) && statSync(basePath).isDirectory()) {
    for (const ext of EXTENSIONS.slice(1)) {
      const indexFile = join(basePath, `index${ext}`);
      if (existsSync(indexFile)) return indexFile;
    }
  }
  return null;
}

function isClientModule(filePath) {
  if (!filePath || !existsSync(filePath) || statSync(filePath).isDirectory()) return false;
  if (filePath === KIT_DIR || filePath.startsWith(KIT_DIR + "/") || filePath.startsWith(KIT_DIR + "\\")) return false;
  if (/(?:^|[\\/])(?:iso|kit)[\\/]react[\\/]live\.[jt]sx?$/.test(filePath)) return false;
  if (!/\.[jt]sx?$/.test(filePath)) return false;
  const text = readFileSync(filePath, "utf8");
  return /^\s*["']use client["']\s*;?/.test(text);
}

function loadConfigPaths(dir) {
  for (const name of ["tsconfig.json", "jsconfig.json"]) {
    const file = join(dir, name);
    if (!existsSync(file) || statSync(file).isDirectory()) continue;
    try {
      const parsed = JSON.parse(readFileSync(file, "utf8"));
      const compilerOptions = parsed?.compilerOptions;
      if (compilerOptions && typeof compilerOptions === "object") {
        return {
          baseDir: resolve(dir, compilerOptions.baseUrl || "."),
          paths: compilerOptions.paths && typeof compilerOptions.paths === "object" ? compilerOptions.paths : null,
        };
      }
    } catch {}
  }
  return null;
}

function resolveAliasPath(specifier, resolveDir) {
  let current = resolve(resolveDir);
  while (true) {
    const config = loadConfigPaths(current);
    if (config?.paths) {
      for (const [pattern, targets] of Object.entries(config.paths)) {
        if (!Array.isArray(targets)) continue;
        const star = pattern.indexOf("*");
        if (star === -1) {
          if (specifier !== pattern) continue;
          for (const target of targets) {
            const found = fileExistsWithExt(resolve(config.baseDir, target));
            if (found) return found;
          }
        } else {
          const prefix = pattern.slice(0, star);
          const suffix = pattern.slice(star + 1);
          if (!specifier.startsWith(prefix) || !specifier.endsWith(suffix)) continue;
          const matched = specifier.slice(prefix.length, specifier.length - suffix.length);
          for (const target of targets) {
            const mapped = target.replace("*", matched);
            const found = fileExistsWithExt(resolve(config.baseDir, mapped));
            if (found) return found;
          }
        }
      }
    }
    if (specifier.startsWith("@/") || specifier.startsWith("~/")) {
      const sub = specifier.slice(2);
      const direct = fileExistsWithExt(join(current, sub)) ?? fileExistsWithExt(join(current, "src", sub));
      if (direct) return direct;
    }
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return null;
}

function matchKitFallback(specifier) {
  const cleaned = specifier.replace(/\.(?:tsx?|mjs|js)$/, "");
  const match = cleaned.match(/(?:^|\/)(?:components\/)?(?:iso|kit)\/(iso-kit|iso\.css|lathe|tube|audit|gl|gl-shared|turn|turn-build|turn-audit|turn-fixed|canvas-painter|react\/draw|react\/live)$/);
  if (!match) return null;
  const mapped = KIT_FILES[match[1]];
  return mapped ? join(KIT_DIR, mapped) : null;
}

const CLIENT_RUNTIME_ID = "anatomy-client-boundary-runtime";

function clientRuntimeSource() {
  return `
import * as React from "react";
const reported = new Set();
function report(problem) {
  if (reported.has(problem)) return;
  reported.add(problem);
  if (typeof globalThis.__anatomyReactProblem === "function") globalThis.__anatomyReactProblem(problem);
  if (typeof window !== "undefined") console.error(problem);
}
function checkNestedClient(node, propName, ownerName, seen) {
  if (!node || typeof node !== "object" || seen.has(node)) return;
  seen.add(node);
  if (Array.isArray(node)) {
    for (const item of node) checkNestedClient(item, propName, ownerName, seen);
    return;
  }
  if (!React.isValidElement(node)) return;
  const type = node.type;
  if (type && (type.__anatomyClient || (typeof type === "object" && type.type && type.type.__anatomyClient))) {
    const clientName = type.__anatomyClientName || (type.type && type.type.__anatomyClientName) || type.displayName || type.name || "ClientComponent";
    report(\`key-warning trap: Client component \${clientName} is nested inside server-built element prop "\${propName}" passed to \${ownerName}.\`);
    return;
  }
  if (typeof type === "function" && !(type.prototype && type.prototype.isReactComponent)) {
    try {
      checkNestedClient(type(node.props), propName, ownerName, seen);
      return;
    } catch {}
  }
  if (node.props && node.props.children) checkNestedClient(node.props.children, propName, ownerName, seen);
}
function inspectProps(props, name) {
  if (!props || typeof props !== "object") return;
  for (const [key, item] of Object.entries(props)) {
    if (key !== "children" && React.isValidElement(item) && item.key == null) {
      report(\`key-warning trap: Each child in a list should have a unique "key" prop: element prop "\${key}" passed to \${name} is missing a root key.\`);
    } else if (Array.isArray(item) && item.some((child) => React.isValidElement(child) && child.key == null)) {
      report(\`key-warning trap: Each child in a list should have a unique "key" prop: array prop "\${key}" passed to \${name} contains an element without a key.\`);
    }
    if (React.isValidElement(item) || Array.isArray(item)) {
      checkNestedClient(item, key, name, new Set());
    }
  }
}
export function __wrapClient(value, name) {
  if (value && typeof value === "object" && value.$$typeof && typeof value.type === "function") {
    const inner = __wrapClient(value.type, name);
    const memoized = React.memo(inner, value.compare);
    memoized.__anatomyClient = true;
    memoized.__anatomyClientName = name;
    return memoized;
  }
  if (value && typeof value === "object" && value.$$typeof && typeof value.render === "function") {
    const forwarded = React.forwardRef(function AnatomyClientForwardRef(props, ref) {
      inspectProps(props, name);
      return value.render(props, ref);
    });
    forwarded.__anatomyClient = true;
    forwarded.__anatomyClientName = name;
    forwarded.displayName = value.displayName || value.render.displayName || value.render.name || name;
    return forwarded;
  }
  if (typeof value !== "function" || (value.prototype && value.prototype.isReactComponent)) return value;
  const wrapped = function AnatomyClientBoundary(props) {
    inspectProps(props, name);
    return value(props);
  };
  wrapped.__anatomyClient = true;
  wrapped.__anatomyClientName = name;
  wrapped.displayName = value.displayName || value.name || name;
  return wrapped;
}
`;
}

function createAnatomyPlugin(esbuild, cssFiles) {
  const exportCache = new Map();
  return {
    name: "anatomy-react-page",
    setup(build) {
      build.onResolve({ filter: /^anatomy-client-boundary-runtime$/ }, () => ({
        path: CLIENT_RUNTIME_ID,
        namespace: "anatomy-client-runtime",
      }));

      build.onLoad({ filter: /.*/, namespace: "anatomy-client-runtime" }, () => ({
        contents: clientRuntimeSource(),
        loader: "js",
        resolveDir: SKILL,
      }));

      build.onResolve({ filter: /.*/ }, (args) => {
        if (args.pluginData?.raw) return null;
        if (args.resolveDir) {
          const direct = args.path.startsWith(".")
            ? fileExistsWithExt(resolve(args.resolveDir, args.path))
            : resolveAliasPath(args.path, args.resolveDir);
          if (direct) {
            if (!isClientModule(args.importer) && isClientModule(direct)) {
              return { path: direct, namespace: "anatomy-client-wrap" };
            }
            return { path: direct };
          }
        }
        const fallback = matchKitFallback(args.path);
        if (fallback && existsSync(fallback)) return { path: fallback };
        return null;
      });

      build.onLoad({ filter: /.*/, namespace: "anatomy-client-wrap" }, async (args) => {
        let exported = exportCache.get(args.path);
        if (!exported) {
          const meta = await esbuild.build({
            entryPoints: [args.path],
            bundle: false,
            write: false,
            format: "esm",
            metafile: true,
            logLevel: "silent",
          });
          const output = Object.values(meta.metafile.outputs)[0];
          exported = output ? output.exports : [];
          exportCache.set(args.path, exported);
        }
        const named = exported.filter((name) => name !== "default");
        const lines = [
          `import * as __M from ${JSON.stringify("./" + basename(args.path))};`,
          `import { __wrapClient } from "${CLIENT_RUNTIME_ID}";`,
          ...named.map((name) => `export const ${name} = __wrapClient(__M[${JSON.stringify(name)}], ${JSON.stringify(name)});`),
        ];
        if (exported.includes("default")) {
          lines.push(`export default __wrapClient(__M.default, ${JSON.stringify(basename(args.path, extname(args.path)))});`);
        }
        return {
          contents: lines.join("\n"),
          loader: "js",
          resolveDir: dirname(args.path),
          pluginData: { raw: true },
        };
      });

      build.onLoad({ filter: /\.css$/ }, (args) => {
        const text = readFileSync(args.path, "utf8");
        if (resolve(args.path) !== resolve(KIT_DIR, "iso.css") && text.trim() !== ISO_CSS.trim()) {
          cssFiles.add(resolve(args.path));
        }
        return { contents: "", loader: "empty" };
      });
    },
  };
}

function isComponentExport(value) {
  if (typeof value === "function") return true;
  return Boolean(value && typeof value === "object" && value.$$typeof);
}

function pickExportName(mod, requested) {
  if (requested) {
    if (!isComponentExport(mod[requested])) {
      throw new Error(`export "${requested}" not found or not a component (available: ${Object.keys(mod).join(", ") || "none"})`);
    }
    return requested;
  }
  if (isComponentExport(mod.default)) return "default";
  const entries = Object.entries(mod).filter(([, value]) => isComponentExport(value));
  const figureMatch = entries.find(([name]) => /Figure$|Art$/.test(name));
  if (figureMatch) return figureMatch[0];
  const pascalMatch = entries.find(([name]) => /^[A-Z]/.test(name));
  if (pascalMatch) return pascalMatch[0];
  if (entries.length === 1) return entries[0][0];
  throw new Error(`no component export found (available: ${Object.keys(mod).join(", ") || "none"}); pass --export <Name>`);
}

function decodeHtml(text) {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function inferTitle(bodyHtml, fallback) {
  const titleMatch = bodyHtml.match(/<span class="iso-plate-corner" data-corner="title">([^<]+)<\/span>/);
  if (titleMatch) return decodeHtml(titleMatch[1].trim());
  const figMatch = bodyHtml.match(/<span class="iso-plate-corner" data-corner="fig">([^<]+)<\/span>/);
  if (figMatch) return decodeHtml(figMatch[1].trim());
  return fallback;
}

export async function buildReactPage(options) {
  const {
    target,
    theme = "dark",
    exportName: requestedExport,
    title: requestedTitle,
    width = 650,
    css = [],
    out: requestedOut,
  } = options;
  if (!target) throw new Error("missing target figure folder or .tsx file");
  const { entryPath, figureDir, baseName } = resolveEntry(target);
  const resolvedExtraCss = css.map((extra) => {
    const full = resolve(extra);
    if (!existsSync(full) || statSync(full).isDirectory()) throw new Error(`css file not found: ${extra}`);
    return full;
  });
  const nodePaths = collectNodePaths([figureDir, process.cwd(), SKILL]);
  const { esbuild, alias } = loadToolchain(nodePaths);
  const cssFiles = new Set();
  const plugin = createAnatomyPlugin(esbuild, cssFiles);

  const ssrEntry = `
import * as React from "react";
import { renderToString } from "react-dom/server";
import * as Entry from ${JSON.stringify(entryPath)};
export { React, renderToString, Entry };
`;

  const ssrBuild = await esbuild.build({
    stdin: {
      contents: ssrEntry,
      resolveDir: figureDir,
      sourcefile: join(figureDir, "__anatomy_ssr_entry.tsx"),
      loader: "tsx",
    },
    bundle: true,
    write: false,
    platform: "node",
    format: "cjs",
    target: "es2022",
    jsx: "automatic",
    nodePaths,
    alias,
    external: ["react", "react-dom"],
    plugins: [plugin],
    logLevel: "silent",
  });

  const ssrCode = ssrBuild.outputFiles[0].text;
  const problems = [];
  const addProblem = (message) => {
    const clean = String(message).trim();
    if (clean && !problems.includes(clean)) problems.push(clean);
  };
  const prevHook = globalThis.__anatomyReactProblem;
  const prevConsoleError = console.error;
  globalThis.__anatomyReactProblem = addProblem;
  console.error = (...args) => {
    const text = format(...args);
    if (/Each child in a list should have a unique "key" prop/.test(text) && problems.some((item) => item.includes('unique "key" prop'))) {
      return;
    }
    addProblem(text);
  };
  let body = "";
  let exportName = "";
  try {
    const mod = new Module(entryPath);
    mod.filename = entryPath;
    mod.paths = [...nodePaths, ...Module._nodeModulePaths(figureDir)];
    mod._compile(ssrCode, entryPath);
    const { React, renderToString, Entry } = mod.exports;
    exportName = pickExportName(Entry, requestedExport);
    const Component = Entry[exportName];
    body = renderToString(React.createElement(Component));
  } finally {
    globalThis.__anatomyReactProblem = prevHook;
    console.error = prevConsoleError;
  }

  for (const extra of resolvedExtraCss) cssFiles.add(extra);
  const extraCss = [...cssFiles].map((file) => readFileSync(file, "utf8")).join("\n");

  const clientEntry = `
import * as React from "react";
import { hydrateRoot } from "react-dom/client";
import * as Entry from ${JSON.stringify(entryPath)};
const Component = Entry[${JSON.stringify(exportName)}];
const mount = document.querySelector(".iso-page");
if (mount && Component) {
  hydrateRoot(mount, React.createElement(Component), {
    onRecoverableError(error) {
      console.error(error);
    },
  });
}
`;

  const clientBuild = await esbuild.build({
    stdin: {
      contents: clientEntry,
      resolveDir: figureDir,
      sourcefile: join(figureDir, "__anatomy_client_entry.tsx"),
      loader: "tsx",
    },
    bundle: true,
    write: false,
    platform: "browser",
    format: "esm",
    target: "es2022",
    jsx: "automatic",
    legalComments: "none",
    nodePaths,
    alias,
    plugins: [plugin],
    logLevel: "silent",
  });

  const script = clientBuild.outputFiles[0].text;
  const title = requestedTitle ?? inferTitle(body, baseName);
  const rawHtml = pageHtml({ title, theme, body, script, width });
  const html = extraCss ? rawHtml.replace("</style>", `\n${extraCss}</style>`) : rawHtml;

  const fileName = theme === "light" ? `${baseName}-light.html` : `${baseName}.html`;
  let outPath = requestedOut ? resolve(requestedOut) : resolve("shots", fileName);
  if (requestedOut && ((existsSync(outPath) && statSync(outPath).isDirectory()) || !/\.html?$/i.test(requestedOut))) {
    outPath = join(outPath, fileName);
  }
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, html);

  return {
    outPath,
    html,
    body,
    title,
    theme,
    exportName,
    entryPath,
    cssFiles: [...cssFiles],
    problems,
  };
}

async function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    usage(error.message);
  }
  if (options.help) usage();
  if (!options.target) usage("missing target figure folder or .tsx file");
  try {
    const result = await buildReactPage(options);
    console.log("wrote", result.outPath);
    for (const problem of result.problems) console.error(problem);
    if (result.problems.length) process.exit(1);
  } catch (error) {
    console.error(`react-page: ${error.message ?? error}`);
    process.exit(1);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await main();
}
