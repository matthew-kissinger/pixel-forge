# Kiln Round 1 — Primitive Fixes Handoff

**Status:** Waves 1–3 + Inspector v2 committed at [3072594](https://github.com/matthew-kissinger/pixel-forge/commit/3072594). First visual audit flagged 7 of 12 validation GLBs as broken. This doc is a self-contained handoff for the next session to land Round 1 primitive fixes.

**Read first:** [docs/kiln-vision.md](kiln-vision.md) for the cycle-level vision, DAG, validation asset suite, and full progress log. This doc focuses on the *next* five tasks.

---

## Context snapshot

- **42 primitives** exposed to agents across 10 categories in [packages/core/src/kiln/list-primitives.ts](../packages/core/src/kiln/list-primitives.ts)
- **Tests:** 252 pass / 6 skip / 0 fail (core), 114 pass (server). All packages typecheck clean.
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

## Round 1 — five primitive fixes

Each task: what, where, why, concrete signature, validation.

### Task 1 — `mergeVertices(geo)` and auto-merge in `subdivide()`

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

### Task 2 — CSG flat-shading option

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

### Task 3 — Parametric `gearGeo`

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

### Task 4 — Parametric `bladeGeo`

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

### Task 5 — Shape-aware UV unwraps

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

## Round 2 — validation script rewrites

Once Round 1 lands, revise the scripts:

- [scripts/validate-wave2a.ts](../scripts/validate-wave2a.ts): gear uses `gearGeo`; vending-machine cutter depth `0.12u` + add emissive glass pane mesh on window.
- [scripts/validate-wave2b.ts](../scripts/validate-wave2b.ts): sword uses `bladeGeo`; tower restructured — try stacked stone courses with visible mortar lines OR a simpler cylindrical keep with battlements.
- [scripts/validate-wave3.ts](../scripts/validate-wave3.ts): crate → `boxUnwrap`; barrel → `cylinderUnwrap`; sign → `planeUnwrap`.

Regen all 12 GLBs, open `http://localhost:3000/gallery/view/validation/<name>.glb` for each, cycle through views (press `C`), toggle wireframe (`W`), and confirm none of the Round 1 issues persist.

## Testing discipline

Between each task:

```bash
# Core tests (gate at 252+ pass / 0 fail)
cd packages/core && KILN_SPIKE_LIVE=0 IMAGE_PROVIDERS_LIVE=0 bun test

# Monorepo typecheck (gate at clean)
bun run typecheck
```

Add at least one unit test per new primitive in `packages/core/src/kiln/__tests__/`. Patterns already established in `solids.test.ts`, `uv.test.ts`, `textures.test.ts`.

## Files to touch

| File | Purpose |
|---|---|
| [packages/core/src/kiln/ops.ts](../packages/core/src/kiln/ops.ts) | add `mergeVertices`, wire into `subdivide` |
| [packages/core/src/kiln/solids.ts](../packages/core/src/kiln/solids.ts) | add `smooth` option to bool* + hull |
| [packages/core/src/kiln/gears.ts](../packages/core/src/kiln/gears.ts) | new `gearGeo` |
| [packages/core/src/kiln/blade.ts](../packages/core/src/kiln/blade.ts) | new `bladeGeo` |
| [packages/core/src/kiln/uv-shapes.ts](../packages/core/src/kiln/uv-shapes.ts) | new `boxUnwrap` / `cylinderUnwrap` / `planeUnwrap` |
| [packages/core/src/kiln/index.ts](../packages/core/src/kiln/index.ts) | export new primitives |
| [packages/core/src/kiln/list-primitives.ts](../packages/core/src/kiln/list-primitives.ts) | agent-facing catalog entries |
| [packages/core/src/kiln/prompt.ts](../packages/core/src/kiln/prompt.ts) | one-line examples in system prompt |
| [scripts/validate-wave2a.ts](../scripts/validate-wave2a.ts) | gear + vending rewrites |
| [scripts/validate-wave2b.ts](../scripts/validate-wave2b.ts) | sword + tower rewrites |
| [scripts/validate-wave3.ts](../scripts/validate-wave3.ts) | swap autoUnwrap for shape-aware |
| [docs/kiln-vision.md](kiln-vision.md) | log Round 1 completion at the end |

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
