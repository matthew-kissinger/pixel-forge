# Kiln Round 3 — Handoff

**Status:** ✅ Tasks 1–3 landed 2026-04-22. Round 1 ✅ + Round 2 ✅ + Round 3 ✅. Task 4 (minor polish candidates) deferred — tracked below. This doc captures everything a fresh agent session needs to pick up Round 3 follow-ups.

**Read first:** [docs/kiln-vision.md](kiln-vision.md) (cycle-level vision + DAG + full progress log) and [docs/kiln-round-1.md](kiln-round-1.md) (what landed in Rounds 1 and 2; validation assets + visual-audit tool).

---

## Where we are (as of Round 3 close)

- **48 primitives** in 12 categories. Agents generate code via `claude-opus-4-7` (default in [generate.ts:83](../packages/core/src/kiln/generate.ts:83)).
- **12 / 12 validation GLBs** pass the 6-view grid audit. Script: `bun run audit:glb`, output: `war-assets/validation/_grids/<name>-grid.png`.
- **Review page**: `bun run audit:review` builds + opens `war-assets/validation/_grids/review.html` — one page with all 12 grids and a TOC.
- **Core tests:** 284 pass / 6 skip / 0 fail. Monorepo typecheck clean.
- **Three.js**: **0.184** across packages/client, packages/core, and the unpkg import map in [scripts/visual-audit.ts](../scripts/visual-audit.ts).
- **Primitive usage counter**: `buildSandboxGlobals(usage?)` now wraps every primitive when a tally map is passed. `executeKilnCode` + `renderGLB` populate it into `render.meta.primitiveUsage`.

### Key files / modules

- [packages/core/src/kiln/primitives.ts](../packages/core/src/kiln/primitives.ts) — core geo/mat helpers + `buildSandboxGlobals()` (what agents see)
- [packages/core/src/kiln/gears.ts](../packages/core/src/kiln/gears.ts) — `gearGeo` + `bladeGeo` (parametric primitives)
- [packages/core/src/kiln/solids.ts](../packages/core/src/kiln/solids.ts) — CSG via manifold-3d; `{ smooth }` opts
- [packages/core/src/kiln/ops.ts](../packages/core/src/kiln/ops.ts) — arrayLinear/Radial, mirror, subdivide, mergeVertices, curves
- [packages/core/src/kiln/uv-shapes.ts](../packages/core/src/kiln/uv-shapes.ts) — boxUnwrap, cylinderUnwrap, planeUnwrap (preserve directional UVs)
- [packages/core/src/kiln/uv.ts](../packages/core/src/kiln/uv.ts) — autoUnwrap (xatlas WASM) for arbitrary geometry
- [packages/core/src/kiln/textures.ts](../packages/core/src/kiln/textures.ts) — loadTexture + pbrMaterial
- [packages/core/src/kiln/render.ts](../packages/core/src/kiln/render.ts) — scene → GLB via gltf-transform; `sandbox` is where agent code runs
- [packages/core/src/kiln/prompt.ts](../packages/core/src/kiln/prompt.ts) — system prompt + primitive catalog shipped to Claude
- [packages/core/src/kiln/list-primitives.ts](../packages/core/src/kiln/list-primitives.ts) — machine-readable catalog
- [scripts/visual-audit.ts](../scripts/visual-audit.ts) — offline 6-view grid renderer (**node/tsx only**, not bun — Playwright CDP pipe hangs under bun on Windows)
- [scripts/audit-review-page.ts](../scripts/audit-review-page.ts) — build the single-page HTML review

### Validation assets regen pipeline

```bash
# Regenerate all 12 GLBs (under bun):
bun scripts/validate-wave2a.ts && bun scripts/validate-wave2b.ts && bun scripts/validate-wave3.ts

# Then grid-audit them (runs under tsx/node):
bun run audit:glb

# Then open the review page:
bun run audit:review
```

---

## Round 3 — tasks

### 1 · Three.js 0.182 → 0.184 bump ⭐ ✅

**Why now:** clean boundary after Round 2. Minor bump (no breaking changes expected). The `examples/three-js/` clone is already at 0.184 so docs/changelog/examples are available. Changelog may fix small primitive quirks — not blocking, but worth landing before further primitive work.

**Where:**
- [packages/client/package.json](../packages/client/package.json) → `three`, `@types/three` both 0.184.0
- [packages/core/package.json](../packages/core/package.json) → same (if it pins a version; check first)
- Any other package.json that lists `three` or `@types/three`

**Validation gate:**
```bash
bun install
bun run typecheck                                    # must stay clean
cd packages/core && KILN_SPIKE_LIVE=0 IMAGE_PROVIDERS_LIVE=0 bun test  # 279 pass / 6 skip
bun scripts/validate-wave2a.ts && bun scripts/validate-wave2b.ts && bun scripts/validate-wave3.ts
bun run audit:glb                                    # visually verify no regressions
```

If any primitive looks different post-bump, diff against the pre-bump grids in git (they're gitignored but committed mental snapshots in `docs/kiln-vision.md`).

**Don't forget:** the grid-renderer page in [scripts/visual-audit.ts](../scripts/visual-audit.ts) loads three.js from unpkg — update the version string there too:

```ts
"three": "https://unpkg.com/three@0.184.0/build/three.module.js",
"three/addons/": "https://unpkg.com/three@0.184.0/examples/jsm/"
```

### 2 · Validation-asset polish ⭐ ✅

User feedback from Round 2 audit (2026-04-22):

- **Door:** handle proportions look off; no visible pane in the window cutout. Add a translucent glass pane (`glassMaterial`) in the window opening, slightly recessed. Re-tune knob shape (current lathe profile is too small/squat).
- **Vending machine:** body is bland — just a red box with recesses. Add more detail: side coin-slot recess, small "VEND" label via `planeUnwrap`'d front decal, bottom dispense tray cutout, a bezier-curve accent line. Maybe emissive trim on edges (`gameMaterial({ emissive })`). Keep tri count < 400.
- **Tower:** user said "i know we can do better than that". Current cylindrical keep + courses + merlons is OK but plain. Ideas:
  - Add a door cutout on the keep at ground level (boolDiff)
  - Arrow-slit windows up the side (narrow vertical `boolDiff` cutters)
  - Stone texture via `cylinderUnwrap` + procedural stone PNG (reuse `signTextPng`-style sharp SVG)
  - Conical roof option using `coneGeo` above the merlons
  - Base plinth / foundation course slightly wider than the keep

Regen each touched GLB, re-audit via `bun run audit:glb <name>.glb`, and look at the review page.

### 3 · Agent-usage instrumentation ✅

**Why:** we have no data on which of the 48 primitives agents actually use. Without that, adding/removing/renaming primitives is a guess. The goal is to drive Round 4+ prioritization from real usage, not vibes.

**Where:**
- [packages/core/src/kiln/primitives.ts](../packages/core/src/kiln/primitives.ts) — `buildSandboxGlobals()` returns the dict exposed to agent code
- [packages/core/src/kiln/render.ts](../packages/core/src/kiln/render.ts) — `sandbox` executes that code and returns a `render.meta` object

**Approach (sketch):**
```ts
// In buildSandboxGlobals():
const counts: Record<string, number> = {};
const wrap = <F extends (...a: unknown[]) => unknown>(name: string, fn: F): F => {
  return ((...args: Parameters<F>): ReturnType<F> => {
    counts[name] = (counts[name] ?? 0) + 1;
    return fn(...args) as ReturnType<F>;
  }) as F;
};

return {
  boxGeo: wrap('boxGeo', boxGeo),
  cylinderGeo: wrap('cylinderGeo', cylinderGeo),
  // ...wrap every primitive
  __usage: counts,  // not a primitive, but inspectable from render.ts
};
```

Then in render.ts, pull `sandbox.__usage` after the agent code runs and stuff it into `render.meta.primitiveUsage`. Surface in the gallery metadata panel.

**Validation:** add a test that runs a known build() and asserts `result.meta.primitiveUsage.boxGeo === N`.

**Landed as:** `buildSandboxGlobals(usage?)` wraps every non-namespace primitive. `executeKilnCode` and `renderGLB` thread a fresh counter through each call and expose it on `meta.primitiveUsage`. Coverage in [primitives.test.ts](../packages/core/src/kiln/__tests__/primitives.test.ts:470) + [render-edges.test.ts](../packages/core/src/kiln/__tests__/render-edges.test.ts) (`primitive usage tracking` describe block). Gallery-side surfacing deferred — meta already ships, only the UI panel needs to render it.

### 4 · Minor polish candidates (deferred — pick up next round)

- **`planeUnwrapSingle(geo, face)`** — current `planeUnwrap` projects xy across all verts, so box/quad back face reads mirrored (physically correct, but often unwanted for signs). Add a variant that only UV-maps one face and collapses the rest to u=v=0 (or full-black).
- **`cylinderUnwrap({ capMode: 'side' | 'solid' | 'custom' })`** — current preserves built-in UVs, so cylinder cap samples side-texture bands. Add `capMode: 'solid'` that collapses cap UVs to a single colour, and `capMode: 'custom'` that accepts a per-cap texture tile.
- **`pickProviderFor`** not on the public namespace — CLI mirrors routing logic in [cli/src/routing.ts](../packages/cli/src/routing.ts). Surface on the `image` namespace.
- **`createSoldierSetPipeline` partial regen** — always regens T-pose. Needs discriminated `tPose: Buffer | { prompt, refs? }`.

### 5 · Out of scope for Round 3

- Wave 2.5b gallery rearchitect (deferred until after Wave 3D)
- Wave 3C (FAL texture generation for validation assets) — do after polish so we're generating on a known-good base
- Wave 3D (projection bake)
- Wave 4 (image-to-3D)

---

## Testing discipline

Between each task:

```bash
bun run typecheck                                              # must stay clean
cd packages/core && KILN_SPIKE_LIVE=0 IMAGE_PROVIDERS_LIVE=0 bun test  # gate 279 pass / 6 skip
cd packages/server && bun test                                 # gate 114 pass
```

For any validation-asset touch, regen + re-audit:

```bash
bun scripts/validate-wave2a.ts     # or 2b/3 depending on what you touched
bun run audit:glb <name>.glb       # e.g. tower.glb, vending-machine.glb
bun run audit:review               # open review.html in browser
```

Add a unit test alongside every new primitive in `packages/core/src/kiln/__tests__/`.

---

## Winding-bug lesson (for any new primitive)

Three.js is right-handed (X right, Y up, Z out). Triangle (A,B,C) has normal `(B-A) × (C-A)`. For an outward-facing face:
- **Top (+Y) cap**: A→B→C must be **CW** viewed from +Y (i.e. CCW viewed from -Y).
- **Bottom (-Y) cap**: reverse of top.
- **Outer side wall** (normal points radially OUT from axis): in the top-to-bottom, increasing-angle sweep, use `(tA, tB, bB)` + `(tA, bB, bA)`.
- **Inner wall** (bore, normal INWARD): reverse of outer.

When in doubt, build the primitive, render it under `visual-audit.ts`, and look for **invisible faces under strict back-face culling**. `<model-viewer>` renders double-sided and will hide the bug — only the audit tool catches it.

Reference-commit the fix: [gears.ts:123-171](../packages/core/src/kiln/gears.ts:123) (flipped on the first audit of Round 2).

---

## Quick commands cheat-sheet

```bash
# Dev
bun run dev:server               # Hono API :3000 (inspector at /gallery/view/:category/:name)
bun run dev:client               # Vite :5173

# Build / quality
bun run typecheck
bun run lint

# Tests
cd packages/core && KILN_SPIKE_LIVE=0 IMAGE_PROVIDERS_LIVE=0 bun test   # 279/285
cd packages/server && bun test                                          # 114
cd packages/cli && bun test                                             # 16
cd packages/mcp && bun test                                             # 7

# Kiln validation
bun scripts/validate-wave2a.ts   # gear / vending / rock-hull
bun scripts/validate-wave2b.ts   # fence / pipe / sword / tower / door / rock-smooth
bun scripts/validate-wave3.ts    # crate / barrel / sign
bun run audit:glb                # 6-view grid PNGs per GLB
bun run audit:glb gear.glb       # subset
bun run audit:review             # open single-page HTML review

# Secret-scan (pre-commit)
bash scripts/secret-scan.sh              # staged files only
bash scripts/secret-scan.sh --all        # full repo
```

---

## Known gotchas

- **Bun + Playwright on Windows**: hangs on CDP pipe. `visual-audit.ts` runs under `tsx` (node) instead. Don't "fix" it back to bun without testing.
- **`bun:test mock.module` is importer-resolved** in monorepos with hoisted deps. See the note in [CLAUDE.md](../CLAUDE.md) Known Issues.
- **Three.js primitives are non-indexed** (BoxGeo 24 verts, etc.). Use `mergeVertices(geo, { positionOnly: true })` before subdivide / per-vertex deformation.
- **`<model-viewer>` renders double-sided by default**. Always confirm winding with `visual-audit.ts` before shipping a new primitive.
- **`manifoldToThree` defaults to flat** for boolUnion/Diff/Intersect and smooth for hull. Override with `{ smooth: true/false }` as the last arg in variadic calls.
- **CSG needs watertight, manifold input.** SphereGeo polar singularity may produce degenerate triangles manifold trims.
- **GLB bridge caches geometry/material by uuid** — `cloneGeometry`/`cloneMaterial`/`createInstance` produce true instances (single glTF mesh, many nodes).

Good luck.
