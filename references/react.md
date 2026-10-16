# React and Next.js

## File layout for one figure
```
components/iso/                 the kit: iso-kit.ts, iso.css, react/draw.tsx, react/live.tsx
components/figures/rig/
  model.ts       pure model: true numbers, springs, readout text (no DOM)
  view.ts        world layout constants, the projection P (fitProjection), helpers like at(point)
  geometry.ts    every static path, computed once at module load
  frame.ts       paths for the parts that change shape: frameOf(state) -> { glass, coils, needle, ... }
  art.tsx        server component: static parts as JSX constants, passed to the live component
  live.tsx       "use client": refs, loop, pointer and keyboard, aria, writes the readout
  rig.css        scoped tokens and styles (e.g. .rig { … })
  figure.tsx     <Plate fig title hint readout keys caption><RigArt /></Plate>
```
`examples/test-rig/` follows this layout. It uses `rig.ts`, `view.ts`, `geometry.ts`, `pose.ts`, `art.tsx`, `live.tsx` and `figure.tsx`.

## The server/client split
- Geometry is pure TypeScript, so it runs on the server and the client receives finished path strings. No geometry code is shipped unless a moving part needs to rebuild per frame. Then `frame.ts` is imported by `live.tsx` and ships to the client.
- `art.tsx` builds the static parts as JSX (`<Solid paths={BASE_ART.slab} tone="mid" />` and so on) and passes them as element props, such as `base`, `rail`, `carriage` and `dial`, to the `"use client"` live component. The live component places them in painter's order and wraps the moving ones in `<g ref>`.
- Only the live component and `kit/react/live.tsx` are client code. `draw.tsx` is server-safe.

## The large-page key-warning trap
On a big page the server payload is large, and React streams some element props as deferred (lazy) chunks. The client renders `{props.dial}` among siblings. It can't mark a lazy as key-checked, so once the lazy resolves to an element without a key, React logs "Each child in a list should have a unique key", pointing at your live component or at `IsoFigure`. The same figure on a small test page logs nothing, so checking one figure at a time misses it.

There are two fixes, and you should do both from the start:

1. **Give the root of every element prop a stable key:** `const DIAL = (<g key="dial">…</g>)`, and `<React.Fragment key="sled">` for fragments. Keys on a single element cost nothing.
2. **Keep `"use client"` components out of server-built art.** Every client component element inside a server tree becomes a lazy reference, which makes all of its ancestors lazy too. If parts of the art need interactivity (hover-to-highlight, for example), make them plain `<g data-part="…">` and handle events with delegation in the live component.

Any array you build with `.map` needs keys as usual.

## Styles
- Import `iso.css` once, globally or in the figure. Put `className="iso"` on a wrapper (or `<body>`) for the tokens, plus `data-theme="light"` for the light theme.
- Scope per-figure tokens to the figure's class (`.rig { --rig-glass-top: … }`) and override kit tokens inside `.iso-plate` only when the card needs it.
- Don't put figure tokens on `:root`.

## Readout
`useReadout()` finds the nearest `.iso-plate [data-readout]` from its `anchor`, and `say(text)` writes it without re-rendering. Render the resting text on the server so it is right before hydration.

## Hydration
Render the rest pose on the server and on the client's first render; start motion only in effects. Don't read `window` while rendering. `asksForStillness()` is safe because it is only called inside effects and loops.

## Standalone page for the browser checks
`scripts/react-page.mjs` wraps a React figure (`figure.tsx` or a folder containing one) into a standalone HTML page so you can run `capture.mjs`, `drive.mjs` and `lines.mjs` without starting a Next.js server. It uses `react`, `react-dom` and `esbuild` from the project's `node_modules` (or `NODE_PATH`), server-renders the resting pose with `renderToString`, hydrates it on the client with `hydrateRoot`, inlines `iso.css` plus any stylesheet imported by the figure, and resolves `@/` and `~/` imports (falling back to `kit/` for `@/components/iso/…` before the kit has been copied in). It also checks every prop crossing a `"use client"` boundary and prints a `key-warning trap:` line if an element prop is missing a root `key` or wraps a client component.

```sh
node scripts/react-page.mjs examples/test-rig --out shots/test-rig.html
node scripts/react-page.mjs examples/test-rig --light --out shots/test-rig-light.html
node scripts/capture.mjs shots/test-rig-light.html --out shots/test-rig-light.png
node scripts/drive.mjs shots/test-rig-light.html '[["key","ArrowLeft"],["wait",600],["shot","shots/pulled.png"]]'
node scripts/lines.mjs shots/test-rig-light.html --out shots/test-rig-lines.png
```
When `--out` is left off, the page is written to `shots/<name>.html` (`shots/<name>-light.html` with `--light`). Pass `--export Name` if the entry file exports more than one component and has no default export, `--css file.css` to add an external stylesheet, or `--width 760` to change the card column width.

