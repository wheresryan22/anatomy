import { spawnSync } from "node:child_process";
import { cpSync, existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, readlinkSync, renameSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { fingerprintOfSkill } from "./fingerprint.mjs";
import { describe, fromThisSession, parseMinutes, parseTokens } from "./session.mjs";

const SKILL = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_TYPES = [".mjs", ".js", ".css", ".html", ".json", ".md", ".txt", ".svg"];
const SKIP_DIRS = ["node_modules", "shots", ".git"];
const ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const AGENTS = ["Claude Code", "OpenCode", "Codex", "Antigravity", "Other"];
const LICENSES = ["MIT", "CC-BY-4.0"];
const KINDS = ["SVG", "SVG + WebGL", "SVG + 3D", "SVG + WebGL + 3D"];

const posix = (path) => path.split(sep).join("/");
const inside = (root, path) => path === root || path.startsWith(root + sep);

function usage(message) {
  if (message) console.error(`publish: ${message}\n`);
  console.log(`Copy a figure into a local clone of the community gallery, ready for a pull request.

  node scripts/publish.mjs <figure folder> --into <anatomy-community clone> --id <kebab-id> --title "..." --prompt "..." --author <github user>
      [--agent "Claude Code"|OpenCode|Codex|Antigravity|Other] [--model "..."] [--minutes 45] [--tokens 1.2M] [--no-session]
      [--license MIT|CC-BY-4.0] [--tags a,b]
      [--build build.mjs] [--pages a.html,b.html] [--kind "SVG + WebGL"] [--audit] [--no-preview] [--force]
      [--submit [--yes] [--dry-run] [--upstream owner/repo]]

The figure must be plain HTML: a build script that writes standalone pages next to itself, in any theme.
Only the source is copied, to figures/<author>/<id>/: the gallery's CI builds the pages and the poster.
In Claude Code, the time to make and the tokens spent are read from this session's own log (from the request that
made the figure up to the request to publish it, with idle gaps over 10 minutes left out); --minutes and --tokens
override them, and --no-session leaves them out. Other agents pass them if they know them.
Without --submit nothing is pushed: the command prints the git and gh commands to run when you are ready.
With --submit it also sends the figure as a pull request, using the GitHub CLI (gh): it shows the plan and asks
first (--yes skips the question, --dry-run only shows the plan). People who can push to the gallery get a branch
there; everyone else gets a fork, made for them.`);
  process.exit(message ? 1 : 0);
}

function parse(argv) {
  const options = { agent: "Claude Code", license: "MIT", build: "build.mjs", tags: [], upstream: "wheresryan22/anatomy-community" };
  const take = (index) => {
    const value = argv[index + 1];
    if (value === undefined || value.startsWith("--")) usage(`${argv[index]} needs a value`);
    return value;
  };
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") usage();
    else if (["--into", "--id", "--title", "--prompt", "--author", "--agent", "--model", "--license", "--build", "--kind", "--date"].includes(arg)) options[arg.slice(2)] = take(index++);
    else if (arg === "--tags") options.tags = take(index++).split(",").map((tag) => tag.trim()).filter(Boolean);
    else if (arg === "--pages") options.pages = take(index++).split(",").map((page) => page.trim());
    else if (arg === "--minutes") {
      options.minutes = parseMinutes(take(index++));
      if (!options.minutes) usage("--minutes takes a duration like 45, 45m, 2h or 1h30m");
    } else if (arg === "--tokens") {
      options.tokens = parseTokens(take(index++));
      if (!options.tokens) usage("--tokens takes a count like 380000, 450k or 1.2M");
    } else if (arg === "--no-session") options.noSession = true;
    else if (arg === "--audit") options.audit = true;
    else if (arg === "--force") options.force = true;
    else if (arg === "--no-preview") options.noPreview = true;
    else if (arg === "--submit") options.submit = true;
    else if (arg === "--yes") options.yes = true;
    else if (arg === "--dry-run") options.dryRun = true;
    else if (arg === "--upstream") options.upstream = take(index++);
    else if (arg.startsWith("--")) usage(`unknown option ${arg}`);
    else if (!options.source) options.source = arg;
    else usage(`unexpected argument ${arg}`);
  }
  for (const key of ["source", "into", "id", "title", "prompt", "author"]) if (!options[key]) usage(`missing ${key === "source" ? "the figure folder" : `--${key}`}`);
  if (!ID.test(options.id)) usage("--id must be kebab-case, like token-bucket-bench");
  if (!AGENTS.includes(options.agent)) usage(`--agent must be one of: ${AGENTS.join(", ")}`);
  if (!LICENSES.includes(options.license)) usage(`--license must be one of: ${LICENSES.join(", ")}`);
  if (options.kind && !KINDS.includes(options.kind)) usage(`--kind must be one of: ${KINDS.join(", ")}`);
  return options;
}

function listFiles(root, dir = root, out = []) {
  for (const name of readdirSync(dir).sort()) {
    const full = join(dir, name);
    const stat = lstatSync(full);
    if (name.startsWith(".") || stat.isSymbolicLink()) continue;
    if (stat.isDirectory()) {
      if (!SKIP_DIRS.includes(name)) listFiles(root, full, out);
    } else out.push(posix(relative(root, full)));
  }
  return out;
}

function detectPages(source, files, given) {
  const html = files.filter((file) => !file.includes("/") && file.endsWith(".html"));
  if (given) {
    const named = given.filter(Boolean);
    for (const page of named) if (!files.includes(page)) throw new Error(`page ${page} not found in ${source}; build the figure first`);
    const pages = {};
    for (const page of named) {
      const theme = themeOf(source, page);
      const key = theme === "light" || theme === "dark" ? theme : page.replace(/\.html$/, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 24);
      if (Object.hasOwn(pages, key) && pages[key] !== page) {
        throw new Error(`page key collision "${key}": ${pages[key]} and ${page}; give the pages distinct data-theme values or filename slugs`);
      }
      pages[key] = page;
    }
    return pages;
  }
  const pairs = html.filter((file) => !file.endsWith("-light.html") && html.includes(file.replace(/\.html$/, "-light.html")));
  if (pairs.length === 1) return { light: pairs[0].replace(/\.html$/, "-light.html"), dark: pairs[0] };
  const singles = html.filter((file) => !/-verify(?:-light)?\.html$/.test(file) && !/^turning-stress/.test(file));
  if (!pairs.length && singles.length === 1) return { [themeOf(source, singles[0]) === "light" ? "light" : "page"]: singles[0] };
  throw new Error(`can't tell which pages are the figure (found: ${html.join(", ") || "none"}); pass --pages a.html,b.html`);
}

const themeOf = (source, page) => (readFileSync(join(source, page), "utf8").match(/<body[^>]*\bdata-theme="([a-z-]+)"/) ?? [])[1] ?? "";

function detectKind(text) {
  const webgl = /getContext\(\s*["']webgl2?["']|\bGLSL_ISO\b|\bglLayer\b/.test(text);
  const turning = /\bTURN\.mount\b|\bturnScript\b|\bTURN_CSS\b|class="[^"]*iso-turn/.test(text);
  return `SVG${webgl ? " + WebGL" : ""}${turning ? " + 3D" : ""}`;
}

export function rewriteSkillPaths(text, { fromDir, toDir, source, skill, skillLink }) {
  const outside = [];
  const rewritten = text.replace(/(["'])((?:\.{1,2}\/|\/)[^"'\n]*)\1/g, (literal, quote, path) => {
    const target = resolve(fromDir, path);
    const dotted = (from, to) => {
      const r = posix(relative(from, to));
      return r.startsWith(".") ? r : `./${r}`;
    };
    if (!/\.[a-z]+$/i.test(path) && !inside(skill, target)) return literal;
    if (inside(source, target)) return isAbsolute(path) ? `${quote}${dotted(fromDir, target)}${quote}` : literal;
    if (inside(skill, target)) return `${quote}${dotted(toDir, join(skillLink, relative(skill, target)))}${quote}`;
    if (/\.(m?js|css|json|html|svg)$/.test(path)) outside.push(path);
    return literal;
  });
  return { text: rewritten, outside };
}

function run(args, cwd) {
  const result = spawnSync(process.execPath, args, { cwd, encoding: "utf8", maxBuffer: 64 << 20 });
  if (result.status !== 0) throw new Error(`${args.map((a) => basename(a)).join(" ")} failed:\n${`${result.stdout}${result.stderr}`.trim().split("\n").slice(-12).join("\n")}`);
  return result.stdout;
}

export function publish(options) {
  const log = options.log ?? (() => {});
  const source = resolve(options.source);
  const repo = resolve(options.into);
  if (!existsSync(join(source, options.build))) throw new Error(`no ${options.build} in ${source}`);
  if (!existsSync(join(repo, "figures")) || !existsSync(join(repo, "scripts", "validate.mjs"))) throw new Error(`${repo} doesn't look like a clone of anatomy-community (no figures/ or scripts/validate.mjs)`);
  if (inside(SKILL, source) && !inside(join(SKILL, "examples"), source)) throw new Error("the figure folder is inside the skill itself; publish the folder where the figure was built");
  const author = options.author.replace(/^@/, "");
  if (!/^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/.test(author)) throw new Error("--author must be a GitHub username");
  const dest = join(repo, "figures", author.toLowerCase(), options.id);
  if (existsSync(dest)) {
    if (!options.force) throw new Error(`figures/${author.toLowerCase()}/${options.id} already exists; pick another --id or pass --force to replace it`);
  }
  const replaced = existsSync(dest) ? `${dest}.replaced` : null;
  if (replaced) {
    rmSync(replaced, { recursive: true, force: true });
    renameSync(dest, replaced);
  }
  try {
    const all = listFiles(source);
    const typed = all.filter((file) => SOURCE_TYPES.includes(extname(file).toLowerCase()));
    const pages = detectPages(source, typed, options.pages);
    const lightPage = pages.light ?? null;
    for (const page of Object.values(pages)) if (page && !typed.includes(page)) throw new Error(`page ${page} not found in ${source}; build the figure first`);
    const outputs = new Set(Object.values(pages).filter(Boolean));
    const files = typed.filter((file) => !outputs.has(file) && !/-verify(?:-light)?\.html$/.test(file));
    const skipped = all.filter((file) => !files.includes(file) && !outputs.has(file));

    const skillLink = join(repo, ".skill");
    const kit = fingerprintOfSkill(SKILL);
    const outside = [];
    for (const file of files) {
      const from = join(source, file);
      const to = join(dest, "src", file);
      mkdirSync(dirname(to), { recursive: true });
      if (/\.m?js$/.test(file)) {
        const result = rewriteSkillPaths(readFileSync(from, "utf8"), { fromDir: dirname(from), toDir: dirname(to), source, skill: SKILL, skillLink });
        outside.push(...result.outside.map((path) => `${file}: ${path}`));
        writeFileSync(to, result.text);
      } else cpSync(from, to);
    }
    if (outside.length) {
      rmSync(dest, { recursive: true, force: true });
      throw new Error(`these files reach outside the figure folder and the skill; move what they need into the folder:\n  ${outside.join("\n  ")}`);
    }

    let linked = "existing";
    if (!existsSync(skillLink)) {
      symlinkSync(SKILL, skillLink, process.platform === "win32" ? "junction" : "dir");
      linked = "created";
    } else if (fingerprintOfSkill(skillLink) !== kit) {
      const where = lstatSync(skillLink).isSymbolicLink() ? readlinkSync(skillLink) : skillLink;
      throw new Error(`${repo}/.skill (${where}) is a different kit version than this skill; remove it and run again`);
    }

    const build = [];
    if (pages.light) build.push([`src/${options.build}`, "--light"]);
    if (Object.keys(pages).some((name) => name !== "light")) build.push([`src/${options.build}`]);
    for (const command of build) {
      log(`building ${command.includes("--light") ? "the light page" : "the page"} (heavy figures take a minute or two)…`);
      run(command, dest);
    }
    let preview = null;
    if (!options.noPreview) {
      log("taking a preview…");
      const shots = join(repo, "shots", `${author.toLowerCase()}-${options.id}`);
      mkdirSync(shots, { recursive: true });
      preview = join(shots, "preview.png");
      run([join(SKILL, "scripts", "capture.mjs"), join(dest, "src", lightPage ?? Object.values(pages)[0]), "--reduced", "--width", "1200", "--out", preview], dest);
    }
    const measured = options.noSession || (options.minutes && options.tokens) ? null : fromThisSession({ prompt: options.prompt });
    const minutes = options.minutes ?? measured?.minutes;
    const tokens = options.tokens ?? measured?.tokens;
    if (measured) log(`time and tokens from this session: ${describe(measured)}`);
    const pageText = Object.values(pages).filter(Boolean).map((page) => readFileSync(join(dest, "src", page), "utf8")).join("\n");
    for (const page of outputs) rmSync(join(dest, "src", page), { force: true });
    const figure = {
      id: options.id,
      title: options.title.trim(),
      author,
      prompt: options.prompt.trim(),
      kind: options.kind ?? detectKind(pageText),
      agent: options.agent,
      ...(options.model ? { model: options.model } : {}),
      ...(minutes ? { minutes } : {}),
      ...(tokens ? { tokens } : {}),
      skill: { kit },
      build,
      pages: Object.fromEntries(Object.entries(pages).filter(([, page]) => page).map(([key, page]) => [key, `src/${page}`])),
      preview: lightPage ? "light" : Object.keys(pages)[0],
      ...(options.audit ? { audit: true } : {}),
      license: options.license,
      ...(options.tags.length ? { tags: options.tags } : {}),
      created: options.date ?? new Date().toISOString().slice(0, 10),
    };
    writeFileSync(join(dest, "figure.json"), JSON.stringify(figure, null, 2) + "\n");

    if (replaced) rmSync(replaced, { recursive: true, force: true });
    return { dest, figure, skipped, linked, preview, measured };
  } catch (error) {
    rmSync(dest, { recursive: true, force: true });
    if (replaced) renameSync(replaced, dest);
    throw error;
  }
}

export function submitPlan({ login, canPush, upstream, author, id, title }) {
  const name = upstream.split("/")[1];
  const target = canPush ? upstream : `${login}/${name}`;
  const folder = `figures/${author.toLowerCase()}/${id}`;
  const branch = `figure/${id}`;
  const steps = [
    ...(canPush ? [] : [{ say: `make (or reuse) your fork, ${target}`, gh: ["repo", "fork", upstream, "--clone=false"] }]),
    { say: "let git use your GitHub CLI login", gh: ["auth", "setup-git"] },
    { say: `start ${branch} from the gallery's latest main`, git: ["fetch", "--quiet", `https://github.com/${upstream}.git`, "main"] },
    { git: ["switch", "--quiet", "-C", branch, "FETCH_HEAD"] },
    { say: `add ${folder} and nothing else`, publish: true },
    { git: ["add", "--", folder] },
    { git: ["commit", "--quiet", "-m", `Add ${title}`, "--", folder] },
    { say: `push it to ${target}`, git: ["push", "--quiet", "--force", `https://github.com/${target}.git`, `HEAD:refs/heads/${branch}`] },
    { say: `open the pull request on ${upstream}`, pr: { repo: upstream, head: canPush ? branch : `${login}:${branch}`, title: `Add ${title}` } },
  ];
  return { target, branch, folder, steps };
}

async function confirm(question) {
  if (!process.stdin.isTTY) return false;
  const { createInterface } = await import("node:readline/promises");
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(question);
  rl.close();
  return /^y(es)?$/i.test(answer.trim());
}

async function submit(options) {
  const gh = (args) => spawnSync("gh", args, { encoding: "utf8" });
  const repo = resolve(options.into);
  const who = gh(["api", "user", "--jq", ".login"]);
  if (who.error || who.status !== 0) throw new Error("--submit needs the GitHub CLI, signed in: install it from https://cli.github.com and run gh auth login");
  const login = who.stdout.trim();
  const author = options.author.replace(/^@/, "");
  if (login.toLowerCase() !== author.toLowerCase()) throw new Error(`you're signed in to GitHub as ${login}, but --author is ${author}; they must match`);
  const perm = gh(["api", `repos/${options.upstream}`, "--jq", ".permissions.push"]);
  if (perm.status !== 0) throw new Error(`can't see ${options.upstream} with your GitHub login`);
  const plan = submitPlan({ login, canPush: perm.stdout.trim() === "true", upstream: options.upstream, author, id: options.id, title: options.title.trim() });
  console.log(`\nSubmitting as @${login}:`);
  for (const step of plan.steps) if (step.say) console.log(`  · ${step.say}`);
  if (!options.noSession && !(options.minutes && options.tokens)) {
    const measured = fromThisSession({ prompt: options.prompt });
    const shown = { minutes: options.minutes ?? measured?.minutes, tokens: options.tokens ?? measured?.tokens };
    console.log(shown.minutes && shown.tokens ? `  · record ${describe(shown)} to make it${measured ? " (read from this session)" : ""}` : "  · no time or token count (not run inside Claude Code; pass --minutes and --tokens to add them)");
  } else if (options.minutes || options.tokens) console.log(`  · record${options.minutes ? ` ${options.minutes} min` : ""}${options.tokens ? ` ${options.tokens} tokens` : ""}`);
  console.log(`  (in ${repo})`);
  if (options.dryRun) return console.log("\ndry run: nothing was done");
  if (!options.yes && !(await confirm("\nGo ahead? [y/N] "))) throw new Error("not submitted (answer y, or pass --yes after asking)");
  const run = (tool, args) => {
    const result = spawnSync(tool, args, { cwd: repo, encoding: "utf8" });
    if (result.status !== 0) throw new Error(`${tool} ${args.slice(0, 2).join(" ")} failed:\n${`${result.stdout}${result.stderr}`.trim()}`);
    return result.stdout.trim();
  };
  let published;
  for (const step of plan.steps) {
    if (step.gh) run("gh", step.gh);
    if (step.git) run("git", step.git);
    if (step.publish) {
      const onMain = run("git", ["ls-tree", "--name-only", "HEAD", "--", plan.folder]) !== "";
      published = publish({ ...options, force: options.force || !onMain, log: (line) => console.log(`  ${line}`) });
    }
    if (step.pr) {
      const open = gh(["pr", "list", "--repo", step.pr.repo, "--head", plan.branch, "--state", "open", "--json", "url", "--jq", ".[0].url"]).stdout.trim();
      const url = open || run("gh", ["pr", "create", "--repo", step.pr.repo, "--base", "main", "--head", step.pr.head, "--title", step.pr.title, "--body", `${published.figure.prompt}\n\nPublished with Anatomy's publish.mjs.`]);
      console.log(`\nSubmitted: ${url}\nThe checks run there, and a preview of your figure appears on it when they finish.`);
    }
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const options = parse(process.argv.slice(2));
  if (options.submit) {
    submit(options).catch((error) => {
      console.error(`publish: ${error.message}`);
      process.exit(1);
    });
  } else try {
    console.log(`publishing ${options.id}…`);
    const { dest, figure, skipped, linked, preview } = publish({ ...options, log: (line) => console.log(`  ${line}`) });
    const repo = resolve(options.into);
    console.log(`published figures/${figure.author.toLowerCase()}/${figure.id} (${figure.kind}, kit ${figure.skill.kit.slice(7, 19)}): source only, the gallery builds the pages`);
    if (figure.minutes && figure.tokens) console.log(`  made in ${describe(figure)}`);
    if (skipped.length) console.log(`  left out (not a source type): ${skipped.join(", ")}`);
    console.log(`  .skill link: ${linked}`);
    if (preview) console.log(`  preview: ${preview} (not committed; CI makes the real one)`);
    const where = `figures/${figure.author.toLowerCase()}/${figure.id}`;
    console.log(`\nCheck it:\n  cd ${repo}\n  node scripts/validate.mjs ${where}`);
    console.log(`\nWhen you are happy with it, from your fork of anatomy-community:\n  git switch -c figure/${figure.id}\n  git add ${where}\n  git commit -m "Add ${figure.title.replace(/"/g, "'")}"\n  git push -u origin figure/${figure.id}\n  gh pr create --repo wheresryan22/anatomy-community --fill`);
  } catch (error) {
    console.error(`publish: ${error.message}`);
    process.exit(1);
  }
}
