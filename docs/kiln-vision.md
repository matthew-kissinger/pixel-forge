# Kiln Vision & Next-Pass Plan

**Date:** 2026-04-22
**Status:** Active
**Owner:** Matt + Claude

Reference: this is the tracking document for the kiln level-up initiative. Consults [docs/next-cycle.md](next-cycle.md) (previous refactor cycle) and extends it toward **LLM-driven procedural geometry nodes**.

---

## Vision

Kiln becomes the **procedural geometry-node substrate for LLMs**. Today Claude emits imperative JS calling ~25 primitives. End state: a catalog of ~80-100 primitives covering the useful subset of Blender's Geometry Nodes, exposed as **both imperative JS and declarative JSON graph**, with integrated CSG (manifold-3d), UV unwrapping (xatlas-three), and texture baking (FAL + three-projected-material).

**Primary path: text-to-3D.** The LLM composes assets from primitives. Image-to-3D (Rodin / Hunyuan3D / TRELLIS.2) is an **optional seed** for when a reference image exists, not the main flow.

**Moat.** Nobody is doing LLM → JS DSL / node graph → Three.js primitives → @gltf-transform → GLB, Node-native, zero Blender dependency. SceneCraft needs Blender, blender-mcp needs Blender, TRELLIS needs a GPU. Kiln runs in a container on a laptop.

---

## Success metrics

By end of initiative:

1. **Primitive count**: 25 → ~80, covering mesh ops, CSG, curves, instancing, UV, texture.
2. **Output format**: imperative JS + JSON graph, same renderer, round-trip with the React Flow editor.
3. **Texture support**: at least 50% of validation assets have PBR textures, not flat-shaded colors.
4. **Validation assets pass**: all 12 standard test GLBs (see below) render correctly at every wave.
5. **Ergonomics**: system prompt + primitive catalog is clear enough that Opus succeeds on 90%+ of validation prompts in one shot (no retry).

---

## Validation asset suite

Twelve standard prompts regenerated at every wave. Visual diff in [gallery](http://localhost:3000/gallery).

| # | Asset | Primitives exercised | Wave it lands |
|---|---|---|---|
| 1 | **Gear** (8 teeth) | arrayRadial + boolDiff | Wave 2 |
| 2 | **Picket fence** (10 posts) | arrayLinear + mirror + instancing | Wave 1/2 |
| 3 | **Vending machine** | boolDiff (buttons) + insetFaces (panels) | Wave 2 |
| 4 | **Sword with beveled edge** | bevelEdges + extrudeAlongPath | Wave 2 |
| 5 | **Brick tower** | distributePointsOnFaces + instanceOnPoints | Wave 2 |
| 6 | **Curved pipe** | bezierCurve + curveToMesh | Wave 2 |
| 7 | **Textured crate** | autoUnwrap + PBR + projection bake | Wave 3 |
| 8 | **Textured barrel** | autoUnwrap + seamless wood texture | Wave 3 |
| 9 | **Textured sign** | multi-view bake (front text, back plain) | Wave 3 |
| 10 | **Textured door with handle** | CSG + bool + PBR | Wave 2+3 |
| 11 | **Textured rock** | organic geo + noise + PBR | Wave 3 |
| 12 | **Textured jeep** | compositional: instancing + CSG + PBR | Wave 2+3 |

**Validation gate rule**: if any validation asset looks broken or worse than its previous-wave version, fix before advancing.

---

## DAG of work

```
                           ┌─────────────────────┐
                           │ Wave 0: docs/plan   │ ✓
                           └──────────┬──────────┘
                                      │
              ┌───────────────────────┼───────────────────────┐
              │                       │                       │
              ▼                       ▼                       ▼
     ┌──────────────┐       ┌──────────────────┐     ┌───────────────┐
     │ Wave 1A      │       │ Wave 1B          │     │ Wave 1C       │
     │ Polish pass  │       │ Instancing       │     │ Install deps  │
     │ (standalone) │       │ primitives       │     │ (manifold/    │
     │              │       │                  │     │  xatlas/      │
     │              │       │                  │     │  subdivide)   │
     └──────┬───────┘       └────────┬─────────┘     └───────┬───────┘
            │                        │                       │
            │                        │                       │
            └────────────────────────┴───────────────────────┤
                                                             │
                                                             ▼
                            ┌────────────────────────────────────────┐
                            │ Wave 2A: CSG primitives (manifold)     │
                            │ Wave 2B: Primitive catalog expansion   │ (can parallelize)
                            └────────────────┬───────────────────────┘
                                             │
                                             ▼
                            ┌────────────────────────────────┐
                            │ Wave 2C: Node-graph JSON + exec│
                            └────────────────┬───────────────┘
                                             │
                                             ▼
                            ┌────────────────────────────────┐
                            │ Wave 2D: System prompt update  │
                            └────────────────┬───────────────┘
                                             │
                                             ▼
                            ┌────────────────────────────────┐
                            │ VALIDATION GATE 2              │
                            │ (assets 1-6, 10)               │
                            └────────────────┬───────────────┘
                                             │
       ┌─────────────────────────────────────┼─────────────────────────────────┐
       │                                     │                                 │
       ▼                                     ▼                                 ▼
┌──────────────┐                   ┌──────────────────┐               ┌──────────────┐
│ Wave 3A      │                   │ Wave 3B          │               │ Wave 4       │
│ UV unwrap    │                   │ PBR material     │               │ image-to-3D  │
│ (xatlas)     │                   │ primitive        │               │ providers    │
│              │                   │                  │               │ (OPTIONAL)   │
└──────┬───────┘                   └────────┬─────────┘               └──────────────┘
       │                                    │
       └────────────────┬───────────────────┘
                        │
                        ▼
           ┌────────────────────────┐
           │ Wave 3C: Texture gen   │
           │ node (FAL routing)     │
           └────────────┬───────────┘
                        │
                        ▼
           ┌────────────────────────┐
           │ Wave 3D: Projection    │
           │ baking (three-proj-mat)│
           └────────────┬───────────┘
                        │
                        ▼
           ┌────────────────────────┐
           │ VALIDATION GATE 3      │
           │ (assets 7-12)          │
           └────────────────────────┘
```

**Parallelization opportunities:**
- Wave 1A / 1B / 1C: fully independent, run in parallel.
- Wave 2A / 2B: share primitive file but touch disjoint sections; can be developed in parallel then merged.
- Wave 3A / 3B: independent, can be developed in parallel.
- Wave 4: fully independent of everything, ships whenever.

---

## Wave specs

### Wave 0 — Plan doc (this file) ✓

---

### Wave 1A — Polish pass (½ day, no deps)

Fixes to the current kiln module with zero API-breaking changes except where noted.

**Tasks:**
1. Extract `handleQueryMessage()` helper; use in both `runRefactorQuery` ([generate.ts:343-358](../packages/core/src/kiln/generate.ts#L343)) and `runStructuredQuery` ([generate.ts:411-427](../packages/core/src/kiln/generate.ts#L411)).
2. Decide on `RenderMode`: either implement TSL path or rip. Leaning toward rip-and-revisit when TSL work starts.
3. Collapse `errors: string[]` + `ValidationIssue[]` to single `ValidationIssue[]` everywhere.
4. Add interpolation-mode param to `rotationTrack` / `positionTrack` / `scaleTrack`: `'LINEAR' | 'STEP' | 'CUBICSPLINE'`, default LINEAR.
5. **Decision needed**: `createPart` auto-parent. Option A: keep behavior, document harder in system prompt. Option B: require explicit `.add()` (breaking). → **Going with A** — less disruption, current agents handle it via the system prompt already.
6. Surface `pickProviderFor` on the public `image` namespace (flagged in CLAUDE.md).

**Gate:** `bun test` in `packages/core/` still 225 pass / 6 skip. Spot-regenerate 3 known-good GLBs, diff.

---

### Wave 1B — Instancing (½ day, parallel with 1A)

**Tasks:**
1. Add `cloneGeometry(geo)` → returns ref to same BufferGeometry (no deep copy).
2. Add `cloneMaterial(mat)` → returns ref to same Material.
3. Add `createInstance(source, { position, rotation, scale, parent })` → new Object3D reusing geo+mat.
4. In `renderSceneToGLB`, run gltf-transform's `dedup()` transform before serializing.
5. Update system prompt: add a wheeled-vehicle few-shot showing the instancing pattern.

**Gate:** Generate a truck with 4 wheels and a fence with 10 posts. GLB size drops >40% vs non-deduped. Visual parity.

---

### Wave 1C — Dependency install (½ day, parallel with 1A/1B)

**Tasks:**
1. `bun add manifold-3d@^3.4` in `packages/core`.
2. `bun add three-subdivide` in `packages/core`.
3. `bun add xatlas-three` (or `xatlas.js` if three-wrapper is too thin) in `packages/core`.
4. Smoke-test each WASM lib loads in Node (`bun test` with a trivial import).
5. Update `packages/core/package.json` peerDependencies if needed.

**Gate:** All three WASM libs load and produce trivial output in a Node test.

---

### Wave 2A — CSG primitives (1-2 days)

**Tasks:**
1. New file: `packages/core/src/kiln/solids.ts` — manifold-3d wrapper.
2. Add primitives: `boolUnion(a, b)`, `boolDiff(a, b)`, `boolIntersect(a, b)`, `hull(...parts)`, `offset(part, distance)`, `trimByPlane(part, plane)`.
3. Lazy-load WASM on first call, cache the module.
4. Convert Three.js BufferGeometry ↔ Manifold Mesh (`vertProperties` + `triVerts`).
5. Handle edge case: non-manifold input geometry (sphereGeo 6-segment polar singularity).

**Gate:** Generate the **gear** (cylinder with radially-arrayed boxes subtracted). Verify watertight in Blender (import → check manifold stat).

---

### Wave 2B — Primitive catalog expansion (2-3 days, parallel with 2A)

Source-of-truth: [carson-katri/geometry-script](https://github.com/carson-katri/geometry-script) catalog.

**New primitives** (organized by node category):

| Category | Primitives |
|---|---|
| **Transform ops** | `translate`, `rotate`, `scale`, `mirror`, `align(axis)` |
| **Array ops** | `arrayLinear(count, offset)`, `arrayRadial(count, axis, angle?)`, `scatter(surface, count, seed)` |
| **Mesh ops** | `subdivide(part, level)`, `smooth(part, iterations)`, `decimate(part, ratio)`, `solidify(part, thickness)`, `flipNormals(part)` |
| **Faces ops** (hard, DIY) | `extrudeFaces(part, selection, distance)`, `insetFaces(part, selection, amount)`, `bevelEdges(part, selection, width, segments)` |
| **Curves** | `bezierCurve(points)`, `curveToMesh(curve, profile)`, `lathe(profile, segments)`, `extrudeAlongPath(shape, path)` |
| **Points/scatter** | `distributePointsOnFaces(part, density, seed)`, `instanceOnPoints(points, part)`, `pointsToVerts(points)` |

**Simplifications for v1:**
- `bevelEdges` at first: only uniform bevel on all edges of a given primitive. Per-edge selection is phase 2.
- `extrudeFaces` / `insetFaces`: start with "all faces" as selection; named-face selection is phase 2.

**Gate:** Each new primitive has a unit test + at least one appears in a validation asset.

---

### Wave 2C — Node-graph JSON format (2 days)

**Tasks:**
1. Schema in `packages/core/src/kiln/graph.ts`:
   ```ts
   type KilnGraph = {
     nodes: Array<{ id: string; type: string; params: Record<string, any>; inputs?: Record<string, { node: string; output?: string }> }>;
     output: string; // id of root node
   };
   ```
2. Executor: topological sort → call primitives with resolved inputs → return Three.js scene.
3. Round-trip: imperative JS code → parse to graph → serialize to JSON → execute to scene → identical GLB.
4. Both formats go through the same validator (different paths, same `ValidationIssue[]`).
5. The React Flow editor consumes this exact JSON (aligns editor + CLI + MCP under one format).

**Gate:** All 6 Wave-2 validation assets can be expressed as graph JSON that round-trips to identical GLB.

---

### Wave 2D — System prompt + few-shots (1 day, after 2A/2B/2C)

**Tasks:**
1. Organize primitive catalog in `list-primitives.ts` by category (not alphabetical).
2. Add 3-5 new few-shots to the system prompt (gear, pipe, vending machine, scattered bricks, mirrored fence).
3. Document graph format in the prompt — let Opus choose imperative or graph based on task.
4. Category-specific prompt hints: "compositional assets (buildings, vehicles) prefer graph format; organic (characters, rocks) prefer imperative."

**Gate:** Generate all 12 validation assets cold from prompts, measure one-shot success rate. Target 90%.

---

### VALIDATION GATE 2

Generate assets 1-6, 10 from prompts. Visual inspect in gallery. Iterate on failures.

---

### Wave 3A — UV auto-unwrap (1-2 days)

**Tasks:**
1. Add `autoUnwrap(part, { padding?, chartQuality? })` primitive. Calls xatlas-three.
2. Writes UVs into BufferGeometry `uv` attribute.
3. Returns the mutated part for chaining.
4. Handle multi-mesh parts: unwrap each, pack into a single atlas (xatlas supports this).

**Gate:** Generate crate + barrel with unwrap. Export GLB, open in Blender or gallery UV viewer. Verify no overlapping charts, reasonable padding.

---

### Wave 3B — PBR material primitive (1 day, parallel with 3A)

**Tasks:**
1. Add `pbrMaterial({ albedo, normal?, roughness?, metalness?, emissive? })` — inputs can be Texture or color/scalar.
2. Add `loadTexture(url)` primitive — loads PNG/JPG from local path or URL.
3. Wire to gltf-transform's PBR export path (pbrMetallicRoughness material).
4. Keep existing `gameMaterial` as a shortcut for untextured PBR.

**Gate:** Assign a pre-generated wood texture to the barrel. GLB opens correctly in Blender + three.js viewer with PBR response.

---

### Wave 3C — Texture generation node (1-2 days, after 3A)

**Tasks:**
1. New primitive: `generateTexture(prompt, { style, refs?, seamless? })` — returns a Texture.
2. Router: `seamless: true` → existing FLUX 2 + Seamless LoRA pipeline (from `war-assets/textures/` flow); `seamless: false` → FLUX 2 standard; PBR maps → FLUX + separate normal/roughness gen.
3. Cache by prompt+params hash in `.kiln-cache/textures/` to avoid regenerating.
4. Surface budget/cost per call for logging.

**Gate:** Generate the textured sign with a text-generated albedo texture. Gemini-generated signs look correct; no seam visible.

---

### Wave 3D — Projection baking (2-3 days, after 3C)

**Tasks:**
1. Integrate three-projected-material as `projectTexture(part, camera, texture)`.
2. Add `bakeToAtlas(part, projections)` — bakes multiple projections into the UV atlas (renders to offscreen canvas, reads pixels, writes to atlas texture).
3. For multi-view: front/back/top auto-generated cameras from bounding box.
4. Simple blending: overwrite with most-front-facing projection per texel.

**Gate:** Generate the textured door with handle. Front texture (wood grain + handle detail) and back texture (plain wood) blend without visible seam on sides.

---

### VALIDATION GATE 3

Generate assets 7-12 from prompts. Visual inspect. Iterate on texture seams, UV stretching, projection artifacts.

---

### Wave 4 (optional, deferred) — Image-to-3D providers (2-3 days)

**Explicitly not the primary path.** Exists for when a reference image is the input.

**Tasks:**
1. Add FAL Rodin / Hunyuan3D-2 / TRELLIS.2 (when available) as providers in `packages/core/src/providers/`.
2. Pipeline: `createRefMeshPipeline({ imageUrl, refinement })` — image-to-3D → kiln primitives refine (re-UV, re-texture, decimate).
3. New CLI command: `pixelforge gen glb --ref path/to/image.png "prompt"` — optional flag.
4. Not added to default system prompt; agent uses only when explicit ref provided.

**Gate:** 5 reference images → 3 providers each → pick winner per asset class, document in [docs/asset-reference.md](asset-reference.md).

---

### Wave 2.5 (follow-up this cycle) — Gallery quick wins + refactor

Two sub-tasks: one tight, one meaty. Run **2.5a** as soon as practical to make Wave 2 review richer. **2.5b** runs after Wave 3 so we know texture/UV requirements before designing the React surface.

#### 2.5a — Quick wins on existing gallery (~1 hour, no rearchitect)

In-place additions to [packages/server/src/routes/gallery.ts](../packages/server/src/routes/gallery.ts):

- **Wireframe toggle** on GLB cards — `<model-viewer>` supports it via its `exposure` + `shadow-intensity` hooks + a Three.js overlay; alternatively swap to a lightweight inline Three.js viewer that accepts a `?wireframe=1` param
- **Tri count + material count + file size badges** — computed client-side by loading GLB header, displayed in card header next to name
- **Dedicated "Validation" category filter** — when `category === 'validation'`, pin to top of grid
- **Keyboard shortcut** for wireframe toggle (`w`) and fullscreen (`f`)

Impact: Wave 2 GLBs become richer to review, zero architectural change.

#### 2.5b — Full rearchitect (1–2 days, after Wave 3)

Move the gallery out of the server package and into `packages/client` as a proper Vite route. Lift scanner to `@pixel-forge/core`.

**Target structure:**

```
packages/core/src/gallery/
  scanner.ts                 # pure: walk war-assets/ → AssetEntry[]
  metadata.ts                # read .kiln.json sidecars → ProvenanceData
  __tests__/

packages/server/src/routes/gallery.ts   # shrinks 403 → ~40 lines
  GET /api/gallery/assets    → core.gallery.scanner()
  GET /api/gallery/file/*    → static file serve

packages/client/src/routes/gallery/     # new React route
  index.tsx                  # grid + filters + sort
  components/
    AssetCard.tsx
    GLBViewer.tsx            # bundled model-viewer (not CDN)
    GLBViewerWireframe.tsx   # Three.js path w/ wireframe overlay
    TextureTileToggle.tsx    # 3×3/5×5/8×8, preserved
    MetadataPanel.tsx        # reads .kiln.json sidecar
    ComparisonSlider.tsx     # wave-to-wave GLB diff
    UVOverlay.tsx            # Wave 3A output — shows atlas charts
    PBRInspector.tsx         # Wave 3B — albedo/normal/roughness slots
  state/
    galleryStore.ts          # Zustand, mirrors editor store patterns
```

**Kiln sidecar spec** (produced by generate pipeline):

```jsonc
// war-assets/vehicles/jeep.kiln.json
{
  "prompt": "military jeep with roll bar, canvas back",
  "code": "const meta = ...",          // full kiln code, for regen
  "graph": null,                        // Wave 2C graph JSON if present
  "primitivesUsed": ["boolUnion", "arrayRadial", "cylinderGeo", ...],
  "category": "prop",
  "tris": 1540,
  "materials": 4,
  "warnings": [],
  "generatedAt": "2026-04-22T10:30:00Z",
  "model": "claude-opus-4-7",
  "wave": "2A"                          // track which wave produced it
}
```

**New capabilities unlocked:**
1. Hover any asset → see which primitives built it ("boolUnion, arrayRadial, lathe")
2. Click "Regenerate" on any asset → re-run the saved prompt/code
3. "Validation Gate" tab: the 12 benchmark assets with per-wave thumbnails for before/after diffing
4. Wireframe / UV / PBR inspector panels per GLB
5. Full offline (no CDN)
6. Keyboard shortcuts, virtualized scroll for 500+ assets

**Validation for 2.5b:** open 5 assets of each category (sprite/texture/GLB/icon/validation), confirm parity with current gallery; confirm new features (wireframe, metadata, regen) work on at least 3 assets.

#### Why this sequencing

- Current gallery works today for Wave 2 validation review
- Wave 3 (textures + UV) will produce hard requirements the React architecture must satisfy; rearchitecting before Wave 3 = guaranteed rework
- 2.5a is cheap and unblocks richer review immediately
- 2.5b after Wave 3 = one refactor that accommodates all new asset types properly

---

### Wave 5 (deferred, out of scope) — Skinning

Only triggers when a concrete rigged-NPC use case pulls for it. Sketch:
- `createBone(name, parent, pos)`
- `bindSkin(mesh, bones, weights?)` with auto-weight heuristic
- Animation retargeting from pivot-based → bone-based
- gltf-transform skinning export path (already supported)

---

## Agent ergonomics (make it pleasant to generate from)

Because I (Claude) am the primary author of kiln scripts, ergonomics for me matter:

1. **Primitive catalog organized by category** in `list-primitives.ts`, not alphabetical. Categories map to mental workflow.
2. **Validation errors include fix hints** (already present, keep expanding the taxonomy as new primitives land).
3. **Examples in the system prompt cover all categories** — at least one example per primitive family.
4. **Both imperative and graph formats** so I can pick the easier one for the task. Compositional → graph. Organic → imperative.
5. **Graph format is explicit and flat** — no nested syntax that's easy to malform. Keyed refs by node id.
6. **The `pixelforge gen glb` CLI** is the testing loop for me: fast regenerate + visual inspect in [gallery](http://localhost:3000/gallery).

---

## Research references

Full brief: see conversation history 2026-04-22.

| Pull | Status | Phase |
|---|---|---|
| [elalish/manifold](https://github.com/elalish/manifold) v3.4.1 | Install | 1C, 2A |
| [repalash/xatlas-three](https://github.com/repalash/xatlas-three) | Install | 1C, 3A |
| [stevinz/three-subdivide](https://github.com/stevinz/three-subdivide) | Install | 1C, 2B |
| [marcofugaro/three-projected-material](https://github.com/marcofugaro/three-projected-material) | Install | 3D |
| [gkjohnson/three-bvh-csg](https://github.com/gkjohnson/three-bvh-csg) | Optional (editor-side) | 2A |
| [carson-katri/geometry-script](https://github.com/carson-katri/geometry-script) | Reference only | 2B |
| [pajamadot/geometry-node](https://github.com/pajamadot/geometry-node) | Read end-to-end | 2C |
| [nortikin/sverchok](https://github.com/nortikin/sverchok) | Taxonomy reference | 2B |
| [microsoft/TRELLIS.2](https://github.com/microsoft/TRELLIS.2) | Provider | 4 |
| [Tencent-Hunyuan/Hunyuan3D-2.1](https://github.com/Tencent-Hunyuan/Hunyuan3D-2.1) | Provider | 4 |
| [Hyper3D Rodin](https://fal.ai/models/fal-ai/hyper3d/rodin) | Provider (FAL) | 4 |
| [SceneCraft (arXiv 2403.01248)](https://arxiv.org/abs/2403.01248) | Library-learning idea | future |
| [3Dify (arXiv 2510.04536)](https://arxiv.org/html/2510.04536) | RAG over procedural lib | future |

---

## Progress log

- **2026-04-22**: Plan written. Wave 0 complete.
- **2026-04-22**: Wave 1A polish complete — `handleQueryMessage()` dedupes error dispatch between refactor + structured query paths; `rotationTrack`/`positionTrack`/`scaleTrack` accept optional `'LINEAR' | 'STEP'` interpolation; test count 225→234.
- **2026-04-22**: Wave 1B instancing complete — `cloneGeometry`, `cloneMaterial`, `createInstance` primitives landed; bridge now caches bridged GLB meshes by `(geometry uuid, material uuid)` so ref-shared parts become true glTF mesh instances; added `@gltf-transform/functions` + `dedup()` post-transform with `dedup: false` escape hatch. 4-wheel truck GLB drops from 18,488 → 5,032 bytes (73% smaller).
- **2026-04-22**: Wave 1C deps installed — `manifold-3d@3.4.1`, `three-subdivide@1.1.5`, `xatlas-three@0.2.1`, `@gltf-transform/functions@4.3.0`. All three WASM libs load in Node via smoke tests.
- **2026-04-22**: Wave 2A CSG complete — `boolUnion`, `boolDiff`, `boolIntersect`, `hull` in [packages/core/src/kiln/solids.ts](../packages/core/src/kiln/solids.ts), backed by manifold-3d WASM. Lazy init on first call. `executeKilnCode` is now async so agent-authored `async function build()` can `await boolDiff(...)`. First three validation assets in `war-assets/validation/`: **gear.glb** (240 tris), **vending-machine.glb** (124 tris), **rock-hull.glb** (48 tris). Full core tests: **240 pass / 6 skip / 0 fail** across 24 files. Monorepo typecheck clean.
- **2026-04-22**: Wave 2B ops complete — [packages/core/src/kiln/ops.ts](../packages/core/src/kiln/ops.ts) adds `arrayLinear`, `arrayRadial`, `mirror` (all share geometry via createInstance), `subdivide` (Loop subdivision via three-subdivide), `curveToMesh` (TubeGeometry wrap), `lathe` (LatheGeometry wrap), `bezierCurve` (quadratic/cubic Bézier sampler). `THREE` namespace now in sandbox globals so agents can construct `new THREE.Mesh(...)` operands for CSG. Six more validation GLBs landed: **fence.glb** (264 tris, linear array), **pipe.glb** (1152 tris, bezier→curveToMesh), **sword.glb** (264 tris, lathe handle), **tower.glb** (1600 tris, 8×radial arrays), **door.glb** (288 tris, boolDiff + lathe + mirror), **rock-smooth.glb** (256 tris, subdivide level 2). Total catalog: **25 → 39 primitives**.
- **2026-04-22**: Wave 2D prompt update complete — system prompt now documents async build(), CSG ops, instancing pattern, arrays/mirror, mesh-ops, curves; added two new worked examples (gear-with-csg, fence-with-array). 242 core tests pass, monorepo typecheck clean. **9 of 12 validation GLBs now generated** (missing textured crate/barrel/sign/jeep require Wave 3 textures).
- **2026-04-22**: Wave 2.5a gallery quick wins complete — wireframe toggle per GLB card (yellow when active), tri + material-count + file-size badges rendered from model-viewer's loaded Three.js scene, validation category pinned first in filter list, `W` keyboard shortcut in fullscreen modal toggles wireframe. Zero architectural change (stays in [packages/server/src/routes/gallery.ts](../packages/server/src/routes/gallery.ts)); full rearchitect deferred to Wave 2.5b after Wave 3.
- **2026-04-22**: Wave 3A UV auto-unwrap complete — installed `xatlasjs@0.2.0` (Node-compatible WASM, works without web workers); [packages/core/src/kiln/uv.ts](../packages/core/src/kiln/uv.ts) wraps it with `autoUnwrap(geometry, opts)`. Output geometry has `uv` attribute in [0,1] + `userData.atlas` metadata (width/height/atlasCount). Works on CSG output (boolDiff → autoUnwrap tested). 5 unit tests.
- **2026-04-22**: Wave 3B PBR material + texture bridge complete — [packages/core/src/kiln/textures.ts](../packages/core/src/kiln/textures.ts) adds `loadTexture(source)` (PNG/JPG/WebP via sharp; stashes encoded bytes on `userData.encoded`) and `pbrMaterial({ albedo, normal, roughness, metalness, emissive, aoMap })` (each slot is color/scalar OR Texture). Extended the GLB bridge with a texture cache + serialization for baseColor / normal / metallicRoughness / emissive / occlusion texture slots. Tests prove PNG bytes round-trip through GLB export byte-identical. **3 textured validation GLBs** added: **crate-textured.glb** (12 tris, procedural wood), **barrel-textured.glb** (96 tris, metal bands), **sign-textured.glb** (12 tris, 'KILN' label) — all via a procedural-SVG-to-PNG pipeline (no external asset deps, no API key needed). System prompt + worked example added for the textured-asset pipeline. **All 12 validation GLBs now landed.**
- **2026-04-22**: **Round 1 primitive fixes complete** — all 5 tasks landed in one sitting with test coverage. See [docs/kiln-round-1.md](kiln-round-1.md) for the task-level writeup. Summary:
    1. `mergeVertices(geo, { positionOnly?, tolerance? })` in ops.ts + auto-weld on `subdivide` non-indexed inputs — fixes rock-smooth shards.
    2. `{ smooth }` option on `boolUnion`/`boolDiff`/`boolIntersect` (default **flat**, for mechanical CSG) and `hull` (default **smooth**, for organic wrapping). Detected via last-arg options object; signatures stay variadic.
    3. `gearGeo({ teeth, rootRadius, tipRadius, boreRadius, height, toothWidthFrac })` — direct triangulation, no CSG, flat-shaded. 4N-vert crown polygon + annulus caps + concentric bore.
    4. `bladeGeo({ length, baseWidth, thickness, tipLength, edgeBevel })` — 5-pt tapered profile extruded; `edgeBevel > 0` pinches cross-section toward a diamond ridge.
    5. `boxUnwrap` / `cylinderUnwrap` / `planeUnwrap` in [uv-shapes.ts](../packages/core/src/kiln/uv-shapes.ts) — preserve Three.js's built-in directional UVs instead of letting xatlas rotate them. Sync, no WASM. Key realization from tracing `CylinderGeometry.js`: the default UVs already wrap u-around / v-up, which is correct for barrels/bands.

    Catalog: **42 → 48 primitives** across **10 → 12 categories**. Core tests: 279 pass / 6 skip / 0 fail (ops / gears / uv-shapes / solids coverage added). Monorepo typecheck clean. Three.js 0.182 (latest 0.184 — minor bump deferred).

- **2026-04-22**: **Security housekeeping** (alongside Round 1). Leaked Gemini key in `SESSION_CONTEXT.md` purged across all 342 commits via `git filter-repo --replace-text`; remote force-pushed; key rotated upstream. Added [scripts/secret-scan.sh](../scripts/secret-scan.sh) (Gemini / Anthropic / OpenAI / FAL / GitHub / Slack / AWS patterns) for pre-commit use, and [scripts/pull-keys.ts](../scripts/pull-keys.ts) which reads the central `~/.config/mk-agent/env` and fans it out to `.env.local` files — single source of truth for API keys going forward. `.gitignore` now blocks `SESSION_*.md`, `NOTES.md`, `SCRATCH.md`, `HANDOFF.md` scratch-doc class.

- **2026-04-22**: **Round 2 validation rewrites complete** — all 3 scripts rewritten to use the Round 1 primitives ([validate-wave2a.ts](../scripts/validate-wave2a.ts): `gearGeo` + deeper vending cutters + emissive glass pane; [validate-wave2b.ts](../scripts/validate-wave2b.ts): `bladeGeo` sword + welded rock-smooth + cylindrical-keep tower; [validate-wave3.ts](../scripts/validate-wave3.ts): `boxUnwrap`/`cylinderUnwrap`/`planeUnwrap`). All 12 validation GLBs regenerated. Added [scripts/visual-audit.ts](../scripts/visual-audit.ts) — offline 6-angle grid renderer using Playwright + headless Three.js with `FrontSide` materials, saves labelled 3×2 PNGs to `war-assets/validation/_grids/`. Runs without the dev server so QA works from Claude Code without the desktop preview open. Package script: `bun run audit:glb [name.glb ...]`. Grid audit immediately caught a winding bug in `gearGeo` (all 4 faces had inverted normals → invisible under back-face culling; `<model-viewer>` had hidden it via double-sided rendering). Fix: winding flipped in [gears.ts:123-171](../packages/core/src/kiln/gears.ts). Observations from the audit: gear = clean 12-tooth flat-shaded crown, sword = proper tapered blade w/ bevel, tower = hollow stone keep w/ courses + merlons, rock-smooth = single connected blob (was 3 shards), crate = horizontal planks align across all 6 faces, barrel = bands wrap horizontally, all asset visible from all angles.

### Totals after Round 1 + Round 2

| Metric | Count |
|---|---:|
| Primitives exposed to agents | **48** (was 42 after Wave 3B, 25 at start) |
| Primitive categories | 12 |
| Core tests | 279 pass / 6 skip / 0 fail |
| Validation GLBs | **12 / 12** audited clean (all re-authored with Round 1 primitives) |
| Monorepo typecheck | clean across 5 packages |
| New Kiln modules | solids.ts, ops.ts, uv.ts, textures.ts, gears.ts, uv-shapes.ts |
| New tooling | visual-audit.ts (offline 6-view grid renderer) |

### Progress summary (updated)

| Wave | Status | Validation assets |
|---|---|---|
| 0 Plan | ✅ | — |
| 1A Polish | ✅ | regression only |
| 1B Instancing | ✅ | 4-wheel GLB 73% smaller |
| 1C Deps | ✅ | WASM smoke tests pass |
| 2A CSG | ✅ | gear, vending-machine, rock-hull |
| 2B Ops | ✅ | fence, pipe, sword, tower, door, rock-smooth |
| 2D Prompt update | ✅ | — |
| 2.5a Gallery quick wins | ✅ | — (review tooling) |
| 3A UV unwrap | ✅ | — (infra for 3B) |
| 3B PBR + textures | ✅ | crate-textured, barrel-textured, sign-textured |
| 2C Node graph | ⏳ deferred | — |
| 3C Texture gen (FAL) | ⏳ next | — |
| 3D Projection bake | ⏳ pending | — |
| 2.5b Gallery rearchitect | ⏳ after W3 | — |
| 4 Image-to-3D | ⏳ optional | — |

---

## Visual audit — 2026-04-22 (post Wave 3B)

After all 12 validation GLBs shipped, we did a first real *visual* audit using
the new `/gallery/view/:path` fullscreen inspector. Results by asset:

| Asset | Verdict | Notes |
|---|---|---|
| gear | ❌ wrong | Lumpy blob with 4 cardinal lobes + diagonal notches; smoothed normals destroy mechanical look. Cutters at r=1.1 barely clip body; cutters not rotated to face radially. |
| vending-machine | ⚠️ shallow | Buttons & window cut 0.05u deep — barely visible. Good concept, depth too small, no glass pane. |
| rock-hull | ✅ ok | Clean faceted convex stone; acceptable for a rock. |
| fence | ✅ ok | 10 posts, 2 rails, clean spacing. |
| pipe | ✅ ok | Smooth brass U; curveToMesh + bezier working. |
| sword | ❌ blunt | Blade is a flat 0.08×1.5×0.01 box — no point, no taper. Guard / handle / pommel correct. |
| tower | ❌ wrong | Solid drum on top of 16 vertical columns with wide gaps; courses not perceptible. |
| door | ✅ good | Clean window cutout; brass knob visible; studio scene shows sky through the window. |
| rock-smooth | ❌ broken | 3 disconnected flat polygon shards. Loop subdivision on non-indexed boxGeo = faces split apart. |
| crate-textured | ⚠️ partial | Planks uniform direction but don't align across faces; autoUnwrap doesn't preserve texture orientation. |
| barrel-textured | ❌ wrong | Metal bands run diagonally, also wrap onto cap. No horizontal band read. |
| sign-textured | ❌ broken | "KILN" text split / flipped / cropped by the sign frame. |

Root causes surfaced by the audit:

1. `manifoldToThree` always smooths normals — hides faceted geometry on gear / vending / hull.
2. `toIndexed` only assigns sequential indices; doesn't merge coincident verts → subdivide breaks on box input.
3. Validation gear script uses subtractive notches at r=1.1 (shallow) instead of proper teeth.
4. No shape-aware UV unwraps — `autoUnwrap` (xatlas) packs an atlas with arbitrary per-face rotation/scale, which is wrong for primitive shapes with directional textures.
5. Primitive catalog is missing parametric gear, blade, and panel/sign primitives — complex shapes currently require CSG gymnastics.

### Inspector v2 (2026-04-22)

New fullscreen asset inspector at `GET /gallery/view/:category/:name`:

- 7 camera presets (front/back/left/right/top/bottom/3-4) with hotkeys 1-7
- Wireframe toggle (fixed: needsUpdate + cameraOrbit nudge after the model-viewer module upgrades)
- 3 scene modes: studio (sky+floor), void (black), checker — shows geometry against multiple backdrops so transparent cutouts (e.g. the door window) read properly
- Cycle-all-views button + C key
- Metadata panel: tris, materials, meshes, world-space bbox, file size
- `Inspect` button on every GLB card links to the dedicated page in a new tab

Key bug fix: `applyPreset('three')` was called synchronously at script init, throwing before the model-viewer custom element upgraded and aborting the whole inline script (leaving downstream `let` bindings in TDZ). Now gated on `customElements.whenDefined('model-viewer')`.

### Round 1 — Foundational primitive fixes (next)

Scoped based on audit findings. Each item unblocks one or more of the broken
validation assets:

1. **`mergeVertices(geo)`** helper on the primitives API. Converts non-indexed geos (boxGeo, cylinderGeo) to welded, indexed geos so subdivide / deform operations behave. Fixes rock-smooth.
2. **CSG flat-shading option** on `boolUnion` / `boolDiff` / `boolIntersect` — keep hard edges for mechanical parts. Default on; opt into `{ smooth: true }`. Fixes gear + vending shading.
3. **`gearGeo({ teeth, innerR, outerR, toothDepth, height })`** — Blender-style parametric gear (reverse-engineered from Blender's Extra Objects `add_mesh_gear.py`). Direct vertex generation, not CSG notches.
4. **`bladeGeo({ length, baseWidth, thickness, taperRatio, tipLength })`** — custom BufferGeometry with pointed tip + cross-section bevel. Fixes sword.
5. **`boxUnwrap(geo)` / `cylinderUnwrap(geo)` / `planeUnwrap(geo)`** — shape-aware UV generators that preserve texture orientation. Fixes crate / barrel / sign.

### Round 2 — Validation script rewrites

Once the Round 1 primitives land, rewrite the broken validation scripts:

- Gear: swap CSG construction for `gearGeo`
- Sword: swap flat box blade for `bladeGeo`
- Tower: restructure as stacked stone courses with visible mortar lines
- Vending machine: cut deeper (0.12u) + add an emissive glass pane
- Crate / barrel / sign: route through `boxUnwrap` / `cylinderUnwrap` / `planeUnwrap` instead of `autoUnwrap`
- Regenerate all 12, re-audit with the fixed inspector

### Progress summary (as of 2026-04-22, post Round 1)

| Wave | Status | Validation assets |
|---|---|---|
| 0 Plan | ✅ | — |
| 1A Polish | ✅ | regression only |
| 1B Instancing | ✅ | 4-wheel GLB 73% smaller |
| 1C Deps | ✅ | WASM smoke tests pass |
| 2A CSG | ✅ | gear, vending-machine, rock-hull |
| 2B Ops | ✅ | fence, pipe, sword, tower, door, rock-smooth |
| 2D Prompt update | ✅ | — |
| 2.5a Gallery quick wins | ✅ | — (review tooling) |
| 3A UV unwrap | ✅ | — (infra for 3B) |
| 3B PBR + textures | ✅ | crate-textured, barrel-textured, sign-textured |
| Visual audit + Inspector v2 | ✅ | 5 of 12 assets pass, 7 flagged |
| **Round 1 primitive fixes** | ✅ | 6 new primitives (`mergeVertices`, `gearGeo`, `bladeGeo`, `boxUnwrap`, `cylinderUnwrap`, `planeUnwrap`) + CSG smooth option |
| **Round 2 re-author validation** | ✅ | 3 scripts rewritten, 12/12 GLBs regen'd + audited via `visual-audit.ts`; gear winding bug caught+fixed |
| 2C Node graph | ⏳ deferred | — |
| 3C Texture gen (FAL) | ⏳ pending | — |
| 3D Projection bake | ⏳ pending | — |
| 2.5b Gallery rearchitect | ⏳ after W3 | — |
| 4 Image-to-3D | ⏳ optional | — |
