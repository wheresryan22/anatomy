# Contributing to Anatomy

Thank you for helping. Anatomy is judged by how its figures look at 4× zoom, so most of this guide is about checking your work before anyone else does.

By taking part you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Setup

You need:

- **Node.js 20.10 or later.** Nothing to install: the kit, the build scripts and the checks use only Node's built-in modules.
- **Google Chrome or Chromium** for the browser checks. The scripts find it in the usual places; otherwise set `CHROME_PATH` to the binary.
- **Claude Code**, Antigravity, OpenCode, Codex or MiniMax Code, to try the skill itself.

```sh
git clone https://github.com/wheresryan22/anatomy.git
cd anatomy
```

To use your working copy as the skill while you change it, link it into your personal skills folder (move any installed copy out of the way first):

```sh
ln -s "$PWD" ~/.claude/skills/anatomy
```

For Antigravity, for OpenCode, for Codex, or for MiniMax Code:

```sh
ln -s "$PWD" ~/.gemini/antigravity/skills/anatomy
```

```sh
ln -s "$PWD" ~/.config/opencode/skills/anatomy
```

```sh
ln -s "$PWD" ~/.agents/skills/anatomy
```

```sh
ln -s "$PWD" ~/.minimax/skills/anatomy
```

## Building the examples

Each framework-free example is one script that writes standalone pages next to itself. The built pages are committed.

```sh
node examples/dial-indicator/build.mjs
node examples/dial-indicator/build.mjs --light
node examples/desk-computer/build.mjs
node examples/desk-computer/build.mjs --light
node examples/arcade-cabinet/build.mjs
node examples/arcade-cabinet/build.mjs --light
node examples/ripple-tank/build.mjs
node examples/ripple-tank/build.mjs --light
node examples/raptor-engine/build.mjs
node examples/raptor-engine/build.mjs --light
node examples/turning-dial/build.mjs
node examples/turning-dial/build.mjs --light
node examples/turning-dial/build.mjs --light --verify
node examples/turning-dial/stress.mjs --light
```

The Raptor builds take a few minutes each; the rest take seconds. `examples/test-rig/` and `examples/spot-plate/` are React components with no committed page; wrap them into a standalone page in `shots/` with `node scripts/react-page.mjs examples/test-rig --light` when you want to run the browser checks on them (with `react`, `react-dom` and `esbuild` on `NODE_PATH` or installed in the project).

After a build, `git status --short` must show nothing unless you meant to change a figure. CI runs exactly these commands and then `git diff --exit-code`.

## The checks

Run the ones that match what you touched, and read every PNG they write: open it and look. Put screenshots in `shots/`, which is ignored.

**Browser driver regressions.** When changing `scripts/drive.mjs`, check that failed browser evaluations exit nonzero and successful evaluations still work.

```sh
node --test scripts/drive.test.mjs
```

**Geometry audit.** For figures with pipes, cables or round parts. It must end `audit passed`, with every failing line at 0.

```sh
node examples/raptor-engine/build.mjs --audit
```

**Line ends.** Every seam, rib, tick and pointer must end on a stroke, a dot or an outline. It must print `line ends: 0`; `--out` rings the failures.

```sh
node scripts/lines.mjs examples/dial-indicator/dial-indicator-light.html --out shots/lines-light.png
node scripts/lines.mjs examples/dial-indicator/dial-indicator.html --out shots/lines.png
```

**Capture.** Stills, phone width, hover, keys and 4× close-ups, with WebGL on.

```sh
node scripts/capture.mjs examples/ripple-tank/ripple-tank-light.html --out shots/desk.png
node scripts/capture.mjs examples/ripple-tank/ripple-tank-light.html --out shots/phone.png --width 390
node scripts/capture.mjs examples/ripple-tank/ripple-tank-light.html --out shots/joint.png --zoom 200,80,220,170
node scripts/capture.mjs examples/ripple-tank/ripple-tank-light.html --out shots/still.png --reduced
```

**Drive.** Scripted sessions: move, click, key, wait for a phase, and contact sheets slowed down to catch pops in a shader. `--no-webgl` checks the SVG fallback.

```sh
node scripts/drive.mjs examples/raptor-engine/raptor-engine-light.html '[["wait",1500],["key","i"],["wait",3000],["shot","shots/firing.png"]]'
node scripts/drive.mjs examples/raptor-engine/raptor-engine.html '[["wait",1500],["shot","shots/no-webgl.png"]]' --no-webgl
node scripts/drive.mjs examples/raptor-engine/raptor-engine-light.html --actions ignite.json
```

Anything with `until` or `eval` goes in an actions file. This `ignite.json` waits for the engine to rest, then films the start of ignition at 20× slow motion:

```json
[
  ["key", "Escape"],
  ["until", "document.querySelector('[data-readout]').textContent.includes('cold')", 15000],
  ["slow", 0.05],
  ["key", "i"],
  ["sheet", "shots/ignite.png", 100, 16],
  ["slow", 1]
]
```

**3D figures.** The orbit audit is slow (budget 30 to 40 s per part for a full run), so iterate with `--quick` and run the full audit in the background. Only a full run's `turn audit passed` counts.

```sh
node examples/turning-dial/build.mjs --light --audit --quick
node examples/turning-dial/build.mjs --light --audit > audit.txt 2>&1 &
node scripts/turn-check.mjs examples/turning-dial/build.mjs --fidelity
node scripts/turn-check.mjs examples/turning-dial/turning-dial-verify-light.html --order --step 1
node scripts/turn-check.mjs examples/turning-dial/turning-dial-light.html --lines
node scripts/turn-check.mjs examples/turning-dial/turning-dial-light.html --perf --width 390 --throttle 4
node scripts/turn-bench.mjs examples/turning-dial/build.mjs
```

[`references/verify.md`](references/verify.md) has every option, the review checklist and the common faults. [`references/3d.md`](references/3d.md) covers the 3D checks.

## House rules

These come from [`SKILL.md`](SKILL.md) and [`references/`](references). A pull request that breaks one will be asked to change.

- **No comments in code.** Not a header, not a note beside a tricky line, not a JSDoc. Put the explanation in names and structure. Tool directives such as `"use client"` are not comments and stay.
- **Kit changes are opt-in.** A change to `kit/` or `scripts/inline-kit.mjs` adds an option or a function whose default is the old behaviour. Every existing example must rebuild byte-identical; CI checks it. If a change is meant to alter a figure, say so in the pull request and commit the rebuilt pages with it.
- **Both themes work, and light ships.** Every colour is a token with a light value and a dark override, never a literal in a figure's CSS or shader. Light shaders are designed for paper (normal premultiplied alpha, never `screen`), not dark glows darkened. Build with `--light` and check both pages.
- **No overlaps.** No pipe or cable passes through anything, at rest, apart or in any frame of a motion. Every crossing is drawn in true depth order, proved by the audit, never tuned by eye. Fix an interlock in the geometry, never with a key bias, and record the true shape of what you draw: a stand-in shape that quiets the audit is a bug.
- **Lines resolve and textures fade.** Every line ends on something. A rib row, bolt circle, seam or rule line ends on a real edge or fades out; it never stops in the middle of a surface. Curved surfaces shade smoothly, with no tone staircase.
- **Shaders never pop.** Every uniform rides an envelope with an attack and a decay, a phase change is a crossfade, and every term reaches zero before any bound or canvas edge. The effect lives in world space in the figure's own camera, and the SVG still reads without WebGL.
- **Every number is true.** The readout, the motion and the caption come from one model with the real numbers. Docs follow the same rule: never write a number or a feature you have not checked.
- **Read every PNG.** Look at 4× close-ups of every joint in both themes before you ask for a review.

## Changing the skill's text

`SKILL.md` and `references/` are instructions Claude follows, so keep them short, exact and in the same plain voice. When you change a kit API, update [`references/kit.md`](references/kit.md) in the same pull request. When you add an example, give it a folder under `examples/` with a `build.mjs` that writes `<name>.html` and, with `--light`, `<name>-light.html`; add it to the list in `SKILL.md`, the table in the README and the build list in [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

## Pull requests

1. Open an issue first for anything larger than a fix, so we can agree on the approach.
2. Fork the repository and branch from `main`.
3. Make one change per pull request.
4. Rebuild every example and confirm that `git status --short` shows only what you meant to change.
5. Run the checks that apply, and attach screenshots in both themes for any visual change.
6. Add a line under `Unreleased` in [`CHANGELOG.md`](CHANGELOG.md).
7. Fill in the pull request template.

CI must pass before a merge.

## Reporting a bug or asking for a figure

Use the [issue forms](https://github.com/wheresryan22/anatomy/issues/new/choose). For a figure that came out wrong, include the prompt, the theme, where the figure lives (HTML, SVG or React), and a screenshot or close-up of the fault.
