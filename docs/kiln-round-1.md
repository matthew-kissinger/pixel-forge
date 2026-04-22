# Kiln Round 1 + Round 2 — Primitive Fixes Handoff

**Status:** Round 1 primitives **✅ landed** 2026-04-22. All five fixes shipped with tests; 279 core tests pass / 6 skip / 0 fail. Round 2 validation scripts **✅ landed** 2026-04-22 — all 12 validation GLBs regenerated and audited via the new [visual-audit.ts](../scripts/visual-audit.ts) offline grid renderer. One winding bug was caught by the audit (gear had inverted normals on all four faces — invisible from certain angles under strict back-face culling) and fixed.

**Read first:** [docs/kiln-vision.md](kiln-vision.md) for the cycle-level vision, DAG, validation asset suite, and full progress log. This doc focuses on the *Round 1/2 tasks*.

---

## Context snapshot (post Round 1)

- **48 primitives** across 12 categories in [packages/core/src/kiln/list-primitives.ts](../packages/core/src/kiln/list-primitives.ts) (was 42)
- **Tests:** 279 pass / 6 skip / 0 fail (core), 114 pass (server). All packages typecheck clean.
- **New Kiln modules:** [gears.ts](../packages/core/src/kiln/gears.ts), [uv-shapes.ts](../packages/core/src/kiln/uv-shapes.ts); `mergeVertices` + CSG `{ smooth }` option added in-place.
- **Validation artifacts:** 12 GLBs in `war-assets/validation/` (gitignored). Regen with `bun scripts/validate-wave2a.ts && bun scripts/validate-wave2b.ts && bun scripts/validate-wave3.ts`.
- **Inspector:** `GET /gallery/view/:category/:name` on `packages/server`. 7 camera presets (keys 1–7), wireframe (W), studio/void/checker scene (B/N/M), cycle-all-views (C), metadata panel.

## What the audit found

From visual inspection in the new fullscreen inspector:

| Asset | Verdict | Root cause |
|---|---|---|
| gear | ❌ Lumpy blob, 4 scalloped lobes | `manifoldToThree` smooths normals; cutters at r=1.1 barely overlap body r=1.0 |
| vending-machine | ⚠️ Shallow | Cuts are 0.05u deep, no glass pane |
| rock-hull | ✅ — | — |
| fence | ✅ — | — |
| pipe | ✅ — | — |
| sword | ❌ Blade is flat rectangle | `boxGeo(0.08, 1.5, 0.01)` — no tip, no taper |
| tower | ❌ Vertical columns with gaps | Bricks 0.3 wide vs 0.39 arc-length per brick at r=1 |
| door | ✅ Good (window lets sky through) | — |
| rock-smooth | ❌ 3 disconnected shards | `subdivide(boxGeo)` on non-indexed input splits faces |
| crate-textured | ⚠️ Plank direction inconsistent | `autoUnwrap` packs atlas with arbitrary rotation |
| barrel-textured | ❌ Bands run diagonally | Same |
| sign-textured | ❌ "KILN" text split/cropped | Same |

## Round 1 — five primitive fixes ✅ ALL LANDED

All five tasks shipped. Each kept the original signature goals but hardened against real codebase findings (see "Deviations" note at the end of this section).

### Task 1 ✅ — `mergeVertices(geo)` and auto-merge in `subdivide()`

**Why:** `boxGeo` / `cylinderGeo` / `sphereGeo` are non-indexed (each face has its own verts). `subdivide()` (Loop via `three-subdivide`) processes them as disconnected face islands → rock-smooth ends up as 3 floating shards.

**Where:** Append to [packages/core/src/kiln/ops.ts](../packages/core/src/kiln/ops.ts).

**Signature:**
```ts
import { BufferGeometryUtils } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
export function mergeVertices(geo: THREE.BufferGeometry, tolerance = 1e-4): THREE.BufferGeometry {
  return BufferGeometryUtils.mergeVertices(geo, tolerance);
}
```

Then in `subdivide()`, auto-merge if the input is non-indexed:
```ts
export function subdivide(geometry, iterations = 1, opts = {}) {
  const input = geometry.index ? geometry : mergeVertices(geometry);
  return LoopSubdivision.modify(input, iterations, opts);
}
```

**Expose:** add to [index.ts](../packages/core/src/kiln/index.ts), [list-primitives.ts](../packages/core/src/kiln/list-primitives.ts) (category `"mesh-ops"`), mention in [prompt.ts](../packages/core/src/kiln/prompt.ts).

**Validate:** regenerate `rock-smooth.glb`. Open `/gallery/view/validation/rock-smooth.glb` — should be one connected lumpy mesh, not shards.

### Task 2 ✅ — CSG flat-shading option

**Why:** `manifoldToThree` always calls `geo.computeVertexNormals()` which averages adjacent-face normals. On mechanical parts (gear, vending machine) that kills the faceted look and produces a lumpy blob.

**Where:** [packages/core/src/kiln/solids.ts](../packages/core/src/kiln/solids.ts) — `manifoldToThree` helper.

**Change:** accept `{ smooth?: boolean }` on `boolUnion`, `boolDiff`, `boolIntersect`, `hull`. Default **`smooth: false`** (hard edges). On flat: convert to non-indexed before computing normals so each face gets its own normal.

```ts
function manifoldToThree(m, material, name, opts: { smooth?: boolean } = {}) {
  // ... existing extraction ...
  if (opts.smooth) {
    geo.computeVertexNormals();           // current behavior
  } else {
    // Flat shading: duplicate verts per triangle so each face gets own normal.
    const nonIndexed = geo.toNonIndexed();
    nonIndexed.computeVertexNormals();
    return new THREE.Mesh(nonIndexed, material);
  }
  // ...
}
```

Update call sites:
```ts
export async function boolUnion(name, ...parts: THREE.Object3D[], opts?: { smooth?: boolean }): Promise<THREE.Mesh>
```

(Variadic + opts is awkward — consider a different overload or separate object param. Pick what reads cleanest.)

**Validate:** regenerate gear.glb / vending-machine.glb. Expect hard mechanical edges.

### Task 3 ✅ — Parametric `gearGeo`

**Why:** The current gear is built by CSG'ing 8 box cutters out of a cylinder at r=1.1 — produces notches not teeth. Game gears want **additive teeth** on a base disc with a center bore.

**Where:** New file [packages/core/src/kiln/gears.ts](../packages/core/src/kiln/gears.ts) (or append to ops.ts).

**Signature:**
```ts
export interface GearOptions {
  teeth?: number;        // default 12
  rootRadius?: number;   // radius at tooth root (between teeth), default 0.8
  tipRadius?: number;    // radius at tooth tip, default 1.0
  boreRadius?: number;   // center hole, default 0.2
  height?: number;       // thickness along Y, default 0.3
  toothWidthFrac?: number; // 0..1, how much of each tooth sector is the tooth, default 0.5
}
export function gearGeo(opts: GearOptions = {}): THREE.BufferGeometry
```

**Algorithm (stylized, no involute — game-asset grade):**

1. Build a **4N-vertex polygon** in XZ plane (N = teeth count). For each tooth i:
   - Sector spans `base = i * 2π/N` to `base + 2π/N`
   - Four angles within the sector: `base`, `base + α`, `base + (2π/N) − α`, `base + 2π/N`
     where `α = (1 − toothWidthFrac) * (π/N)` (so the tooth spans the middle `toothWidthFrac` of the sector)
   - Alternating radii: `[rootR, tipR, tipR, rootR]`
2. Extrude the polygon along Y: top cap (fan from center) + bottom cap + side walls (one quad per boundary edge).
3. Punch a bore: subtract a central `cylinderGeo(boreR, boreR, height, 16)` via `boolDiff` — or triangulate both caps as an annulus fan to avoid CSG entirely.

Prefer the all-direct version (no CSG) — simpler, faster, no manifold init cost for a primitive.

**Expose:** category `"primitives"` (or new `"gears"`). Add to index.ts, list-primitives.ts, prompt.ts with a one-line example.

**Validate:** update `scripts/validate-wave2a.ts`:
```ts
const gearMesh = new THREE.Mesh(gearGeo({ teeth: 12, rootRadius: 0.8, tipRadius: 1.0, boreRadius: 0.2, height: 0.3 }), steel);
```
Expect a clean gear silhouette with 12 visible teeth around the rim, center bore, hard edges.

### Task 4 ✅ — Parametric `bladeGeo`

**Why:** Sword is `boxGeo(0.08, 1.5, 0.01)` — a flat rectangle with no tip. Needs a tapered blade with a point.

**Where:** Same file as gearGeo or [packages/core/src/kiln/blade.ts](../packages/core/src/kiln/blade.ts).

**Signature:**
```ts
export interface BladeOptions {
  length?: number;       // total blade length, default 1.5
  baseWidth?: number;    // width at guard, default 0.1
  thickness?: number;    // cross-section depth (z), default 0.015
  tipLength?: number;    // length of the pointed tip section, default 0.25
  edgeBevel?: number;    // 0..1, how much the cross-section pinches to a centerline. 0 = flat rectangle, 1 = diamond-shaped cross-section. Default 0.5
}
export function bladeGeo(opts: BladeOptions = {}): THREE.BufferGeometry
```

**Algorithm:**

1. Define 4 profile points on top face (XY plane, Y = length axis, blade tip at +Y):
   - base-left  `(-W/2, 0)`
   - base-right `(+W/2, 0)`
   - shoulder-left  `(-W/2, L − tipL)`
   - shoulder-right `(+W/2, L − tipL)`
   - tip `(0, L)`
2. For cross-section bevel: each top-face vert has a corresponding ridge vert on the centerline at ±`thickness/2` along Z, and flat-face verts at the full width at `±thickness/2 * (1 − edgeBevel)`. For `edgeBevel = 1` you get a pure diamond.
3. Mirror front-face points to back-face (negate Z), triangulate as a closed hull.

For a first cut, **flat blade + pointed tip only** is fine — `thickness = 0.015`, no bevel. That alone makes the sword look like a sword.

**Validate:** update `scripts/validate-wave2b.ts` sword:
```ts
const blade = createPart('Blade', bladeGeo({ length: 1.5, baseWidth: 0.08, thickness: 0.015, tipLength: 0.25 }), steel, {
  position: [0, 0.75, 0], parent: root,
});
```
Expect a pointed blade, not a ruler.

### Task 5 ✅ — Shape-aware UV unwraps

**Why:** `autoUnwrap` (xatlas) packs all charts into an atlas with arbitrary per-chart rotation/scale. For box / cylinder / plane primitives that carry directional textures (wood planks, metal bands, text), we need UVs that preserve orientation.

**Where:** New [packages/core/src/kiln/uv-shapes.ts](../packages/core/src/kiln/uv-shapes.ts) or append to [uv.ts](../packages/core/src/kiln/uv.ts).

**Signatures:**
```ts
/** Unwrap a box: 6 faces packed in a 3x2 grid, each axis-aligned. */
export function boxUnwrap(geo: THREE.BufferGeometry): THREE.BufferGeometry

/** Unwrap a cylinder: side unrolled into a rectangle (bottom half of atlas),
 *  caps as circles in the top half. Side texture "around" axis = U, "along" axis = V. */
export function cylinderUnwrap(geo: THREE.BufferGeometry): THREE.BufferGeometry

/** Unwrap a plane/quad: map 0–1 directly to XY extent. */
export function planeUnwrap(geo: THREE.BufferGeometry): THREE.BufferGeometry
```

**Implementation notes:**

- `boxUnwrap`: Three's built-in `BoxGeometry` has a known face order (right/left/top/bottom/front/back, each 4 verts × 2 tris). Either rebuild UVs directly (knowing the vertex order) OR operate on `THREE.BoxGeometry` inputs only and copy a hand-authored UV array. A common crate layout: front / back / left / right in a horizontal strip (texture continuous across the four sides), top / bottom stacked on the end.
- `cylinderUnwrap`: similar — Three's `CylinderGeometry` has known vertex order (sides first, then top cap, then bottom cap). Assign U based on angular index, V based on height.
- `planeUnwrap`: trivial — `u = (x − bboxMinX) / bboxWidth`, `v = (y − bboxMinY) / bboxHeight`.

**Accept non-Three-builtin inputs:** if input geometry doesn't match the expected face layout (e.g. a subdivided or CSG'd box), fall back to `autoUnwrap` with a warning in `userData`.

**Validate:** update `scripts/validate-wave3.ts`:
- Crate: `await boxUnwrap(boxGeo(1, 1, 1))` — expect planks to line up across front/back/left/right.
- Barrel: `await cylinderUnwrap(cylinderGeo(0.5, 0.5, 1.2, 24))` — expect bands to wrap horizontally.
- Sign: `await planeUnwrap(boxGeo(1, 0.6, 0.05))` — expect "KILN" readable front-facing.

---

## Deviations from the original plan (for the record)

Implementation found five spots where the doc assumptions didn't match the codebase:

1. **`BufferGeometryUtils` is named-export only**, not a namespace object. Correct import: `import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'`.
2. **Three's `mergeVertices` hashes ALL attributes**, so a boxGeo's 24 verts (6 faces × 4) never collapsed to 8 even though positions coincide (each face has its own normals/UVs). Added a `{ positionOnly: true }` option that strips non-position attributes before hashing — required for the rock-smooth fix.
3. **BoxGeometry and CylinderGeometry already carry correct directional UVs** in Three.js. `autoUnwrap` (xatlas) rotates them during atlas-packing which is what scrambles plank / band orientation. Shape-aware unwraps therefore preserve the built-in UVs instead of rebuilding them — a near-trivial implementation.
4. **CSG variadic `...parts` + `{ smooth }` opts.** Rather than changing signatures, we detect an options object on the last arg: `boolUnion('X', a, b, { smooth: true })`. `boolUnion/Diff/Intersect` default to flat (hard edges); `hull` defaults to smooth (organic). Override either direction with `{ smooth: ... }`.
5. **Blade bevel**: the full-diamond mode pinches the cross-section to `z = 0` at the centerline ridge; verified by test. Flat mode (`edgeBevel: 0`) keeps a pure prism.

## Round 2 — validation script rewrites ✅ LANDED

All three validation scripts rewritten and regenerated 2026-04-22:

- [scripts/validate-wave2a.ts](../scripts/validate-wave2a.ts): ✅ gear uses `gearGeo({ teeth: 12, ... })`; vending-machine has 0.12u-deep cutters + emissive green glass pane on window; CSG calls take `{ smooth: false }`.
- [scripts/validate-wave2b.ts](../scripts/validate-wave2b.ts): ✅ sword uses `bladeGeo({ length: 1.5, baseWidth: 0.08, tipLength: 0.3, edgeBevel: 0.6 })`; rock-smooth `mergeVertices(..., { positionOnly: true })` before jittering; tower is now a cylindrical stone keep with three course rings + 12 battlement merlons.
- [scripts/validate-wave3.ts](../scripts/validate-wave3.ts): ✅ crate → `boxUnwrap`, barrel → `cylinderUnwrap`, sign → `planeUnwrap` (all sync; `autoUnwrap` + `await` calls dropped).

All 12 validation GLBs regenerated and audited offline via the new `visual-audit.ts` script (see next section). One winding bug found+fixed along the way — the initial `gearGeo` had inverted triangle winding on all four faces (top cap, bottom cap, outer wall, inner bore) which made the gear invisible from certain angles under a strict back-face-culled renderer. `<model-viewer>` hid the bug by rendering double-sided. Grid audit caught it; [gears.ts:123-171](../packages/core/src/kiln/gears.ts:123) fixed.

## Visual-audit tool ✅ new 2026-04-22

Offline QA renderer to catch back-face-culling / winding issues that the `<model-viewer>`-based inspector masks. Uses Playwright-driven headless Three.js with `FrontSide` materials so inverted-winding triangles are invisible (= immediately obvious in the grid).

```bash
bun run audit:glb                      # all GLBs in war-assets/validation/
bun run audit:glb gear.glb sword.glb   # specific files
```

Writes `war-assets/validation/_grids/<name>-grid.png` — six cells (Front / Right / Back / Left / Top / 3-4) per asset. Runs fully self-contained (no dev-server needed); pulls three.js 0.182 from unpkg for headless rendering. Note the script runs under `tsx` (node), not bun — Bun's spawning doesn't play well with Playwright's CDP pipe on Windows.

## Round 3 — scoped

All follow-up work moved to its own handoff doc: **[docs/kiln-round-3.md](kiln-round-3.md)** — three.js 0.184 bump + examples refresh, validation-asset polish (door / vending / tower per user feedback), agent-usage instrumentation, and a handful of smaller primitive-API polish items.

## Testing discipline

Between each task:

```bash
# Core tests (gate at 252+ pass / 0 fail)
cd packages/core && KILN_SPIKE_LIVE=0 IMAGE_PROVIDERS_LIVE=0 bun test

# Monorepo typecheck (gate at clean)
bun run typecheck
```

Add at least one unit test per new primitive in `packages/core/src/kiln/__tests__/`. Patterns already established in `solids.test.ts`, `uv.test.ts`, `textures.test.ts`.

## Files touched in Round 1

| File | Status | Purpose |
|---|---|---|
| [packages/core/src/kiln/ops.ts](../packages/core/src/kiln/ops.ts) | ✅ | `mergeVertices` + `subdivide` auto-weld (with `{ positionOnly }` option) |
| [packages/core/src/kiln/solids.ts](../packages/core/src/kiln/solids.ts) | ✅ | `{ smooth }` option on `boolUnion`/`boolDiff`/`boolIntersect`/`hull` |
| [packages/core/src/kiln/gears.ts](../packages/core/src/kiln/gears.ts) | ✅ new | `gearGeo` + `bladeGeo` (co-located — both parametric primitives) |
| [packages/core/src/kiln/uv-shapes.ts](../packages/core/src/kiln/uv-shapes.ts) | ✅ new | `boxUnwrap` / `cylinderUnwrap` / `planeUnwrap` |
| [packages/core/src/kiln/index.ts](../packages/core/src/kiln/index.ts) | ✅ | export 6 new primitives |
| [packages/core/src/kiln/list-primitives.ts](../packages/core/src/kiln/list-primitives.ts) | ✅ | 6 new catalog entries; CSG entries updated for `smooth` option |
| [packages/core/src/kiln/prompt.ts](../packages/core/src/kiln/prompt.ts) | ✅ | one-line primitives added to API block |
| [packages/core/src/kiln/primitives.ts](../packages/core/src/kiln/primitives.ts) | ✅ | sandbox globals wired up for new primitives |
| [packages/core/src/kiln/\_\_tests\_\_/ops.test.ts](../packages/core/src/kiln/__tests__/ops.test.ts) | ✅ new | mergeVertices + subdivide-auto-weld coverage |
| [packages/core/src/kiln/\_\_tests\_\_/gears.test.ts](../packages/core/src/kiln/__tests__/gears.test.ts) | ✅ new | gearGeo + bladeGeo shape invariants |
| [packages/core/src/kiln/\_\_tests\_\_/uv-shapes.test.ts](../packages/core/src/kiln/__tests__/uv-shapes.test.ts) | ✅ new | UV preservation across boxUnwrap/cylinderUnwrap/planeUnwrap |
| [packages/core/src/kiln/\_\_tests\_\_/solids.test.ts](../packages/core/src/kiln/__tests__/solids.test.ts) | ✅ | 4 new cases for flat vs smooth shading |
| [scripts/validate-wave2a.ts](../scripts/validate-wave2a.ts) | ✅ Round 2 | gear uses `gearGeo`; vending deepened + emissive glass |
| [scripts/validate-wave2b.ts](../scripts/validate-wave2b.ts) | ✅ Round 2 | sword uses `bladeGeo`; rock-smooth welded; tower = keep |
| [scripts/validate-wave3.ts](../scripts/validate-wave3.ts) | ✅ Round 2 | shape-aware unwraps replace `autoUnwrap` |
| [scripts/visual-audit.ts](../scripts/visual-audit.ts) | ✅ Round 2 new | offline 6-view grid renderer (catches winding bugs) |
| [docs/kiln-vision.md](kiln-vision.md) | ✅ | Round 1 + 2 completion logged |

## Useful commands

```bash
# Start server with live-reload for inspector iteration
bun run dev:server

# Regenerate all 12 validation GLBs
bun scripts/validate-wave2a.ts && bun scripts/validate-wave2b.ts && bun scripts/validate-wave3.ts

# Open an asset in the fullscreen inspector
# http://localhost:3000/gallery/view/validation/<name>.glb
```

## Open questions / non-goals for Round 1

- **Don't** fix Wave 2.5b gallery rearchitect in this round — it's scoped for after Wave 3D.
- **Don't** start Wave 3C (FAL texture generation) until Round 2 assets look correct with procedural textures.
- **Do** add a quick `docs/kiln-vision.md` progress entry when Round 1 is done so the next session knows where we are.

Good luck. The bones are strong; we just need to polish the edges.
