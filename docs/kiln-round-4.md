# Kiln Round 4 — chili3d-Inspired Cycle (DAG)

**Status:** ✅ All 11 tasks landed 2026-05-02. Reconnaissance + implementation in a single session. Full primitives regen against the validation set is the only deferred piece (requires real Claude API calls — visual audit against existing GLBs ran clean).

**What landed:**
- Tier 1 primitives — `cylinderOnAxis`, `taperConeGeo`
- Tier 2 ops — `revolveGeo` (partial sweeps + arbitrary axis), `pipeAlongPath` (path-driven swept circle with bend smoothing)
- Lazy per-sandbox mesh cache via `wrapGeo` in `buildSandboxGlobals`
- `userData.kilnRanges` mesh-range / sub-shape metadata (direct primitives + CSG output partition)
- Edge-overlay wireframe toggle in gallery viewer (LineSegments + EdgesGeometry, no shader recompile)
- Typed PubSub event bus at [packages/shared/pubsub.ts](../packages/shared/pubsub.ts)
- Operation-based undo/redo records (`AddNodeRecord`, `DeleteNodeRecord`, `ParameterChangeRecord`, `SnapshotRecord`) at [packages/client/src/lib/history.ts](../packages/client/src/lib/history.ts) — workflow store now stores typed records instead of full snapshots
- Prompt + catalog refresh teaches agents the new helpers and when to reach for each
- Visual audit ran clean against all 70 validation GLBs

**Test count delta:**
- core: 405 → 424 pass (+19 tests for A1/A2/A3/A4/B2/B3)
- shared: 0 → 11 pass (new PubSub tests)
- client: 1938 → 1944 pass (+6 tests for op-based undo/redo)
- server / cli / mcp: unchanged (114 / 22 / 9, all green)
- Monorepo typecheck: clean across all packages

**Reconnaissance:** Landed 2026-05-02 against `examples/chili3d` (xiangechen/chili3d, AGPL-3.0, **patterns/ideas only — no verbatim copy**).

**Read first:**
- [docs/kiln-vision.md](kiln-vision.md) — cycle-level vision + progress log
- [docs/kiln-round-3.md](kiln-round-3.md) — what landed in Round 3 + remaining minor-polish list
- `examples/chili3d/` — the reference clone (gitignored, local only)

---

## Why this round

Three recon agents read `examples/chili3d/packages/{core,builder,three,wasm,app,web,ui,storage,i18n}/src/` and surfaced a consistent finding: **chili3d operates on shape-with-frame** (Plane = origin + normal + xvec, primitives carry their own coordinate system) where **Kiln operates on mesh-with-rotation** (e.g. `cylinderXGeo` / `cylinderZGeo` are post-hoc rotations of a Y-default geometry). The frame-first style is cleaner for LLM agents to prompt against and composes more naturally into sweeps, revolutions, and frame-aligned booleans.

Round 4 closes the gaps that fall out of that observation. We are **not** adopting OCCT WASM, B-rep topology, NURBS, or Lit components — those are CAD-kernel-specific and tracked under "out of scope" below.

---

## DAG

Four waves. Tasks within a wave are independent and can ship in parallel worktrees / parallel agents. Each wave gates on its predecessor *only* via the "merge to main" step — within a wave you can fan out freely.

```
Wave 1 (parallel)               Wave 2 (parallel)              Wave 3 (parallel)         Wave 4 (final)
┌─────────────────────┐         ┌─────────────────────┐         ┌──────────────────┐     ┌────────────────┐
│ A1 cylinderOnAxis   │────────▶│ A3 revolveGeo        │────────▶│ A4 pipeAlongPath │     │ D1 prompt /    │
│ A2 taperConeGeo     │────┐    │                      │     ┌──▶│                  │     │    catalog     │
│                     │    │    │                      │     │   │                  │     │    refresh     │
└─────────────────────┘    │    └─────────────────────┘     │   └──────────────────┘     │                │
┌─────────────────────┐    └───▶┌─────────────────────┐     │                             │ D2 audit pass  │
│ B1 wireframe layer  │         │ B2 mesh cache + hash │─────┤   ┌──────────────────┐     │    on all      │
│    toggle (gallery) │         │                      │     └──▶│ B3 mesh-range /  │────▶│    validation  │
│                     │         │                      │         │    sub-shape map │     │    GLBs        │
└─────────────────────┘         └─────────────────────┘         └──────────────────┘     │                │
┌─────────────────────┐         ┌─────────────────────┐                                   │ D3 changelog + │
│ C1 typed PubSub bus │────────▶│ C2 op-based undo /   │──────────────────────────────────▶│    round close │
│                     │         │    redo records      │                                   │                │
└─────────────────────┘         └─────────────────────┘                                   └────────────────┘
```

**Lanes**
- **A — Primitive surface** (`packages/core/src/kiln/primitives.ts`, `ops.ts`)
- **B — Render bridge** (`packages/core/src/kiln/render.ts`, gallery viewer)
- **C — App / editor state** (`packages/client/src/stores/`)
- **D — Cycle close** (docs, prompt, audit regen)

**Dependency rules**
- A2/A3/A4 share a file (`primitives.ts` or `ops.ts`) — within-lane sequencing avoids merge conflicts.
- B2 must land before B3 because B3 attaches metadata onto the cached geometry from B2.
- C2's history records **publish events through C1's bus**, so C1 ships first.
- Wave 4 only fires after all of A, B, C land — it regenerates the validation grid against the new primitive surface.

---

## Task specs

Every task has the same shape so it can be handed to a parallel agent without context: **What / Where / Acceptance / Cost**.

### Wave 1

#### A1 — `cylinderOnAxis(center, normal, radius, height, segments?)`
- **What:** Add a frame-first cylinder helper that takes an arbitrary axis. Replaces the implicit "pick the right axis variant" mental load.
- **Where:** [packages/core/src/kiln/primitives.ts](../packages/core/src/kiln/primitives.ts). Register in [list-primitives.ts](../packages/core/src/kiln/list-primitives.ts) and add to `buildSandboxGlobals`.
- **Implementation note:** Build a Y-up cylinder, then orient via `Quaternion.setFromUnitVectors(Y, normalize(normal))` and translate to `center`. Existing `cylinderXGeo` / `cylinderZGeo` stay — they're terse for common cases. **Do not refactor** them into wrappers in this round.
- **Acceptance:**
  - Vitest covering: axis-aligned cases match existing `cylinderXGeo`/`cylinderYGeo`/`cylinderZGeo` within `1e-5`; arbitrary axis case has correct bbox.
  - Type signature exported from [packages/core/src/kiln/index.ts](../packages/core/src/kiln/index.ts).
  - One entry in `list-primitives.ts` with category `solids` and the parameter list.
- **Cost:** ~30 LOC + ~30 LOC test.

#### A2 — `taperConeGeo(rBottom, rTop, height, axis?, segments?)`
- **What:** Expose Three.js `ConeGeometry`'s `radiusTop` parameter. Chili3d's `cone(... radiusUp, ...)` proves tapered cones are the canonical shape; our current `coneGeo` is apex-only.
- **Where:** [packages/core/src/kiln/primitives.ts](../packages/core/src/kiln/primitives.ts). Register in `list-primitives.ts` + `buildSandboxGlobals`.
- **Implementation note:** Internally Three.js has `CylinderGeometry(radiusTop, radiusBottom, height, segments)` — that's already the right primitive. `coneGeo` becomes the `rTop=0` special case. Default `axis='y'`.
- **Acceptance:**
  - Vitest: `taperConeGeo(1, 1, 2)` ≡ `cylinderGeo(1, 2)` bbox; `taperConeGeo(1, 0, 2)` ≡ `coneGeo(1, 2)` bbox.
  - Listed in catalog.
- **Cost:** one-liner wrapping Three.js + ~15 LOC test.

#### B1 — Layer-based wireframe toggle in gallery viewer
- **What:** Split face / edge meshes onto Three.js layers and bind a "wireframe" toggle (key `W` is already documented in CLAUDE.md but currently rebuilds the scene). Replace with `camera.layers.toggle(WIREFRAME_LAYER)` so it costs zero rebuild.
- **Where:** [packages/server/tij-gallery/index.html](../packages/server/tij-gallery/index.html) and the inspector page mentioned in CLAUDE.md (search for the gallery `view/:path` route in [packages/server/src](../packages/server/src)).
- **Implementation note:** Constants `LAYER_SOLID = 0`, `LAYER_WIREFRAME = 1`. Compute edges with `EdgesGeometry`, add as `LineSegments` on layer 1. `W` toggles the camera mask.
- **Acceptance:**
  - Manual: open `/gallery/view/<any-glb>`, press `W`, edges appear/disappear without scene rebuild.
  - No regressions to other inspector hotkeys (`1-7`, `B/N/M`, `R`, `+/-`).
- **Cost:** ~40 LOC, no tests (visual feature).

#### C1 — Typed PubSub event bus
- **What:** Adopt the *pattern* (not the file) from chili3d's `pubsub.ts` — a tiny typed event bus so Kiln render events, executor lifecycle events, and CLI/MCP can subscribe symmetrically without going through React.
- **Where:** New file `packages/shared/src/pubsub.ts` (or `packages/core/src/pubsub.ts` if shared isn't the right home — implementer decides; cross-adapter types belong in shared per [CLAUDE.md](../CLAUDE.md)).
- **Implementation note:** Events typed by a string-literal-keyed map; `subscribe<K extends keyof Events>(k, fn)` returns an unsubscribe. No globals — pass a bus instance through. Do not start *consuming* it from existing code yet; that's C2 + the slow migration. Just land the primitive.
- **Acceptance:**
  - Vitest: subscribe/publish/unsubscribe; type-safety check with `expectTypeOf` or equivalent.
  - Exported from package `index.ts`.
- **Cost:** ~60 LOC + ~40 LOC test.

### Wave 2

#### A3 — `revolveGeo(profile2D, axis?, angle?, segments?)`
- **What:** Wrap Three.js `LatheGeometry` for rotation-symmetry construction. Fills our biggest composition gap (no rotation op today).
- **Where:** [packages/core/src/kiln/ops.ts](../packages/core/src/kiln/ops.ts) (new function). Register.
- **Implementation note:** Input `profile2D: Vector2[]` (x = radius, y = height) — match LatheGeometry's convention exactly. `axis` defaults to `+Y`. For non-Y axes, build the lathe then orient via the same quaternion approach used in A1 (extract that into a small `orientToAxis(geo, axis)` helper if it gets reused).
- **Acceptance:**
  - Vitest: full revolution of a vertical line at radius `r` ≡ `cylinderGeo(r, h)` bbox; quarter revolution has correct angular extent.
  - Catalog entry under `composition`.
- **Cost:** ~50 LOC + ~40 LOC test.

#### B2 — Lazy mesh caching with hash invalidation
- **What:** Cache the BufferGeometry returned by each parametric primitive keyed by `hash(args)`. Recompute only when inputs change.
- **Where:** [packages/core/src/kiln/primitives.ts](../packages/core/src/kiln/primitives.ts) — wrap inside `buildSandboxGlobals` so the cache is per-execution (not a process-wide global; that would leak across requests).
- **Implementation note:** `hash(args)` can be a stable JSON.stringify of normalized arg tuples. Keep cache as a `Map<string, BufferGeometry>` on the sandbox closure; cleared when the sandbox is disposed. **Do not** cache `boxGeo`/`cylinderGeo` results across sandboxes — Three.js geometries hold disposable GPU resources and we render headlessly anyway.
- **Acceptance:**
  - Vitest: same args → same `BufferGeometry` instance (`===`); different args → new instance.
  - No regression in `bun test` for `packages/core` (`KILN_SPIKE_LIVE=0 IMAGE_PROVIDERS_LIVE=0 bun test`).
- **Cost:** ~50 LOC + ~30 LOC test.

#### C2 — Operation-based undo/redo records
- **What:** Replace the React Flow editor's snapshot-based undo stack with chili3d-style `IHistoryRecord` (each record stores before/after for *one* operation and knows how to undo itself). Each record `publish`es to the C1 bus on apply/undo.
- **Where:** Find the current undo source in [packages/client/src/stores/](../packages/client/src/stores/) (search for `undoStack` / `snapshot`). Refactor incrementally: ship 3 record subtypes — `AddNodeRecord`, `DeleteNodeRecord`, `ParameterChangeRecord` — and convert the matching mutation paths. Edge mutations (`AddEdgeRecord`, `DeleteEdgeRecord`) are a follow-up; not required for this round.
- **Acceptance:**
  - Existing client tests (`cd packages/client && bunx vitest run`, currently 1938 pass) remain green.
  - New tests for each record subtype: apply → undo → state matches; redo → state matches apply.
  - No memory regression on a 100-node fixture vs the snapshot baseline (eyeball; not a hard CI gate).
- **Cost:** ~200 LOC + ~150 LOC test. Largest single task in the round.

### Wave 3

#### A4 — `pipeAlongPath(points, radius, opts?)`
- **What:** Path-driven swept circle — generalizes `beamBetween` from point-to-point to multi-point with optional bend smoothing. Useful for cables, tubes, rigging, hoses.
- **Where:** [packages/core/src/kiln/ops.ts](../packages/core/src/kiln/ops.ts) (new function).
- **Implementation note:** Use `THREE.CatmullRomCurve3` for the path, then `TubeGeometry(curve, tubularSegments, radius, radialSegments, closed)`. `opts.bendRadius` optionally smooths sharp corners by inserting interpolated points (do this in the caller's points array, not inside Tube). `opts.closed` defaults to false.
- **Acceptance:**
  - Vitest: 2-point pipe ≡ `beamBetween` bbox within tolerance; 3-point pipe with right-angle has correct length.
  - Catalog entry.
- **Cost:** ~60 LOC + ~40 LOC test.

#### B3 — Mesh range / sub-shape mapping
- **What:** Thread a `ranges: { name: string, start: number, count: number }[]` array through every BufferGeometry returned by `buildSandboxGlobals` so a future "click a primitive in the 3D preview to edit its node" interaction can map clicked triangle → primitive name.
- **Where:** [packages/core/src/kiln/render.ts](../packages/core/src/kiln/render.ts) and the cached primitives from B2. Stored on `geometry.userData.kilnRanges`.
- **Implementation note:** When the sandbox calls `boxGeo("crate-1", ...)`, the returned geometry gets `userData.kilnRanges = [{ name: "crate-1", start: 0, count: indexCount }]`. When primitives are merged via CSG / array ops, append-with-offset. **Do not** touch click/raycast wiring in this round — that's a separate UI task. Just land the metadata so it's available.
- **Acceptance:**
  - Vitest: a single primitive has one range covering all triangles; a `boolUnion(a, b)` result has two ranges with non-overlapping windows summing to total triangle count.
  - GLB export ignores `userData.kilnRanges` (gltf-transform won't serialize it; verify with one round-trip test).
- **Cost:** ~80 LOC + ~60 LOC test.

### Wave 4

#### D1 — Prompt + catalog refresh
- **What:** Update the agent-facing prompt to teach the new helpers and discourage the brutish patterns they replace.
- **Where:** [packages/core/src/kiln/prompt.ts](../packages/core/src/kiln/prompt.ts) and [packages/core/src/kiln/list-primitives.ts](../packages/core/src/kiln/list-primitives.ts) (the latter should already be current per each task's acceptance criteria; this is a final audit).
- **Acceptance:**
  - Prompt mentions `cylinderOnAxis` for non-cardinal axes, `taperConeGeo` for tapered shapes, `revolveGeo` for rotation symmetry, `pipeAlongPath` for cables/tubes.
  - `bun test` in `packages/core` covers the `prompt.test.ts` snapshot — update snapshot deliberately, do not auto-accept.
- **Cost:** ~30 LOC prompt + snapshot diff.

#### D2 — Validation GLB regen + 6-view audit
- **What:** Regenerate the 12 validation GLBs and re-run the audit grid. The new primitives should not regress any existing assets; the prompt update should not destabilize codegen.
- **Where:** Run the standard validation pipeline:
  ```bash
  bun scripts/validate-wave2a.ts && bun scripts/validate-wave2b.ts && bun scripts/validate-wave3.ts
  bun run audit:glb
  bun run audit:review
  ```
- **Acceptance:**
  - All 12 grids visually clean in the review page (open `war-assets/validation/_grids/review.html`).
  - No new floating-part / stray-plane warnings in the provenance sidecars compared to Round 3 baseline.
- **Cost:** Mostly compute time + one human eyeball pass.

#### D3 — Changelog + round close
- **What:** Update [docs/kiln-vision.md](kiln-vision.md) progress log; mark Round 4 closed in this file's status header; note primitive count delta (51 → 53 from A1+A2; ops gain `revolveGeo` and `pipeAlongPath`).
- **Acceptance:** This file's header says ✅; vision doc lists the round.
- **Cost:** 5 minutes.

---

## Out of scope (chili3d signal we're explicitly **not** acting on this round)

Each item below has a real chili3d implementation, but the cost-to-payoff is wrong for our mesh-only commitment. Listed here so a future agent doesn't re-discover and re-propose them.

- **OCCT.js / OpenCascade WASM adoption.** ~3–5 MB binary + binding surface + serialization pivot. Only worth it if we ever genuinely need watertight booleans, indexed fillets, or NURBS — none of which we need today. manifold-3d already covers our boolean needs.
- **B-rep topology editing** (fillet/chamfer by edge index). Our meshes have no persistent edge identity; this would require a topology layer that's a multi-month effort.
- **NURBS / weighted Bezier curves as primitives.** Three.js's curve classes are visualization-only.
- **Full sweep with parallel-transport frames** (not just `pipeAlongPath`). ~100+ LOC of frame transport math. Revisit only if A4 turns out to be insufficient for a real asset request.
- **Lit web components, Rspack, Biome.** Wrong stack.
- **Snapping / grid / workplane gizmos.** CAD-specific UX, no payoff for game-asset generation.
- **ZIP plugin manifest system.** MCP + CLI already give us extensibility.

---

## AGPL constraint

`examples/chili3d/` is AGPL-3.0. Pixel Forge is not AGPL. Therefore:

- **Patterns, signatures, parameter naming, mental models** — fair to lift.
- **Algorithm shapes** (e.g. "use Plane = origin + normal + xvec for primitive frames") — fair to lift.
- **Verbatim code** — never. If a function from chili3d is the right shape, **rewrite from scratch** based on the signature and the description in this doc.

If a task author finds themselves wanting to copy a block longer than ~3 lines, stop and re-derive. The recon agents already extracted the *ideas*; the implementation is yours.

---

## Verification (whole cycle)

After D2 lands:

```bash
# 1. Type + lint clean across the monorepo
bun run typecheck && bun run lint

# 2. Per-package tests (run from each package, NOT from root)
cd packages/core && KILN_SPIKE_LIVE=0 IMAGE_PROVIDERS_LIVE=0 bun test
cd packages/client && bunx vitest run
cd packages/server && bun test
cd packages/cli && bun test
cd packages/mcp && bun test

# 3. Validation grid regen
bun scripts/validate-wave2a.ts && bun scripts/validate-wave2b.ts && bun scripts/validate-wave3.ts
bun run audit:glb
bun run audit:review   # opens the review HTML — eyeball all 12 grids

# 4. Manual: load /gallery/view/<any-glb>, press W, confirm layer-based wireframe toggle
```

Every test count from Round 3 should hold or rise (1938 client / 114 server / 284 core / 16 cli / 7 mcp), with adds proportional to the new tests this round introduces.

---

## Execution dispatch

For DAG-style parallel execution:

1. **Wave 1** — fan out to four agents in separate worktrees (`A1`, `A2`, `B1`, `C1`). Each one is self-contained per its spec above. Merge order on completion: A1 → A2 → B1 → C1 (alphabetic; A1/A2 share `primitives.ts` so sequencing matters; the others are independent).
2. **Wave 2** — fan out to three agents (`A3`, `B2`, `C2`). A3 + B2 both touch core; sequence A3 → B2 on merge. C2 is independent.
3. **Wave 3** — fan out to two agents (`A4`, `B3`). Both touch core but different files (`ops.ts` vs `render.ts`); merge in either order.
4. **Wave 4** — single agent runs D1 → D2 → D3 sequentially (they're cheap and the doc updates need to see the regen output).

---

## Round 4 follow-on (2026-05-02): full vehicle fleet regen + gallery curation

**Status:** ✅ 21/21 fresh, gallery curated, docs updated. User reviewing in `:3010/gallery`; will return after `/compact` with an issue list.

### What landed

- **Regenerated 21 vehicles** through the Round 4 primitive surface + a refreshed prompt FRAME, via 4 parallel scripts:
  - `scripts/gen-aircraft.ts` (10 existing aircraft)
  - `scripts/gen-aircraft-game.ts` (4 bonus aircraft)
  - `scripts/gen-vehicles-ground.ts` (5 ground vehicles, **new this session**)
  - `scripts/gen-vehicles-watercraft.ts` (2 watercraft, **new this session**)
- Total wall-clock ≈ 11 min with 4 scripts in parallel; per-asset latency 31–73 s.
- **Triangle counts**: range 660 (Sampan) to 3164 (C-130). Mean ≈ 2200. All structurally valid; 4 had soft-fail retries that auto-corrected; 2 (uh1c-gunship, c130-hercules) shipped with 1 preserved structural warning each (rotor/propeller blade overlap edge cases).

### Gallery curation

- Of the 21 generated, **only 13 are registered in TIJ's `modelPaths.ts`**. The 8 others are bonus content for future expansion.
- Bonus aircraft moved to `war-assets/vehicles/_bonus-aircraft/` so the `vehicles/aircraft` filter in `/gallery` shows only the 6 TIJ-registered planes/helos.
- Bonus aircraft: `b52-stratofortress`, `hh3e-jolly-green-giant`, `c130-hercules`, `a37-dragonfly`, `ch47-chinook`, `mig17-nva`, `oh6-kiowa-scout`, `ov10-bronco`. Browseable under their own pill.
- Gallery (`packages/server/src/routes/gallery.ts`) gained a `Vehicles (all)` virtual filter pill plus pinned subcategory pills (`vehicles/aircraft`, `vehicles/ground`, `vehicles/watercraft`).

### TIJ-registered fleet (13)

| Slug | Category | TIJ model key | Tris | Notes |
|---|---|---|---:|---|
| `uh1-huey` | aircraft | `UH1_HUEY` | 1760 | clean |
| `uh1c-gunship` | aircraft | `UH1C_GUNSHIP` | 2256 | 1 structural warning preserved |
| `ah1-cobra` | aircraft | `AH1_COBRA` | 2100 | clean |
| `ac47-spooky` | aircraft | `AC47_SPOOKY` | 2444 | clean |
| `f4-phantom` | aircraft | `F4_PHANTOM` | 1800 | structure-fixed retry |
| `a1-skyraider` | aircraft | `A1_SKYRAIDER` | 2604 | clean |
| `m151-jeep` | ground | `M151_JEEP` | 1628 | clean |
| `m35-truck` | ground | `M35_TRUCK` | 2392 | clean |
| `m113-apc` | ground | `M113_APC` | 2712 | structure-fixed |
| `m48-patton` | ground | `M48_PATTON` | 2268 | structure-fixed |
| `pt76` | ground | `PT76` | 3064 | clean |
| `pbr` | watercraft | (orphaned) | 1856 | structure-fixed |
| `sampan` | watercraft | (orphaned) | 660 | structure-fixed |

### New `FRAME` constants in the gen scripts

Both `gen-aircraft.ts` and `gen-aircraft-game.ts` (and the new ground/watercraft scripts) carry a unified production-ready FRAME prepended to every per-vehicle prompt:

- **Coordinate contract**: +X forward, +Y up, +Z right, ground at Y=0. TIJ rotates -90° Y on load.
- **Wing parameter clarification**: `dihedral` and `sweep` are world-unit OFFSETS (meters), NOT angles. dihedral ≈ 3-6% of span for normal-looking wings.
- **Attachment requirements**: T-tail base must overlap fuselage rear; rotor blades must overlap hub by 0.05+; tail boom must continuously connect cabin to fin; cockpit canopy must sit flush against fuselage roof.
- **Named pivot catalog** (TIJ regex match in [HelicopterGeometry.ts](../../terror-in-the-jungle/src/systems/helicopter/HelicopterGeometry.ts)): `mainRotor` OR `mainBlades`, `tailRotor` OR `tailBlades`, `propeller`, `propLeft`/`propRight`, `prop1`–`prop4`. Either form matches.

### Real ambiguities surfaced this session

1. **`dihedral` parameter looked like an angle but is a Y-offset in world units.** A-37 first-generation produced 45°+ gull-wing because Opus picked dihedral=2 with span=4. Fixed by:
   - JSDoc on `wingGeo` in [packages/core/src/kiln/primitives.ts](../packages/core/src/kiln/primitives.ts) explicitly calls out the unit (world meters, not radians/degrees) with safe-range guidance (3-6% of span).
   - Gen script FRAME constants restate the rule in agent-facing language.

2. **Claude Code child-shell env shadowing**: `ANTHROPIC_API_KEY=""` (empty string) is exported by Claude Code's bash subshell, which shadows `.env.local`'s real value. Generation scripts silently failed with "Could not resolve authentication method" until we added `unset ANTHROPIC_API_KEY GEMINI_API_KEY OPENAI_API_KEY` before invoking bun. Documented in script docstrings.

### Validation set hygiene

`gen-aircraft.ts` auto-copies all 10 aircraft to `war-assets/validation/aircraft-*.glb` (it's part of the validation primitive-coverage benchmark, not gameplay). The 5 ground + 2 watercraft + 4 bonus-aircraft copies I added during this session for audit grids have been cleaned out — they were temporary audit pollution, not part of the canonical validation set.

### What's next

User is reviewing the 13 in `/gallery` (`http://localhost:3010/gallery`, filter to `Vehicles (all)`). They'll `/compact` and return with a list of per-vehicle issues spotted. Auto-memory entries in `~/.claude/projects/.../memory/` capture session-transient state so the post-compact agent can pick up the review thread.

## Round 4 polish iteration — 2026-05-02 evening (post-compact)

User reviewed the 6 TIJ-registered aircraft via `/gallery` audit grids and reported per-vehicle visual issues across multiple rounds. Multi-pass tightening of [gen-aircraft.ts](../scripts/gen-aircraft.ts)'s `FRAME` prompt + per-vehicle prompts, with targeted re-rolls via a new slug filter.

### New FRAME rules

Three production-quality rules now enforced in the `FRAME` prepended to every per-vehicle prompt:

1. **No decorative geometry**: `decalBox` calls are banned outright. No insignia / star / stripe / hull-number / door-frame boxes. No small boxGeo or planeGeo "to represent paint". Color and pattern are texture work, not mesh work. Caused removal of: white-square + dark-frame on Huey door; red-square decals on Gunship; white-square on F4 top fuselage; yellow wingtip nav-light boxes on Skyraider; dark window-panel rectangles on Spooky.

2. **Vertical-fin orientation rule**: vertical fins must STAND UP. The reliable recipe is `boxGeo(chord, height, thickness)` with Y (height) as the second-largest dimension after chord. `wingGeo`'s span axis is Z by default — using it for a vertical fin without a `[π/2, 0, 0]` rotation produces a flat-laid fin (caught the F4's missing vertical stab on first regen).

3. **Window + open-doorway insert exception** — the ONE narrow exception to rule 1, with two sizing tiers:
   - **Window panes**: ≤ 0.5m × 0.4m × 0.04m, `gameMaterial(0x182228)` navy-black. For passenger windows on transports, cockpit-side windows on helicopters.
   - **Open doorways**: ≤ 1.5m × 0.9m × 0.05m, `gameMaterial(0x0a0e10)` very dark. For helicopters that fly with cargo doors slid open (Huey transport variant). Must NOT be placed on the gunship variant — UH-1C flies doors-closed; an open-doorway insert at the same Z as the stub-wing pylon makes the wing visually emerge from a black void.

### Glass canopy must be a distinct mesh

Added to the FRAME's COCKPIT GLASS rule: "Glass MUST be a distinct `glassMaterial` mesh, not the same color as the body." Caused: gunship cockpit glass was previously invisible because the LLM was using olive-drab gameMaterial for both cabin and "canopy". Concrete recipes given per vehicle (e.g. Huey: "sphereGeo of radius ~0.7 positioned so its CENTER is at (front_x + 0.2, fuselage_top + 0.15, 0)"; F4: "Position each bubble so its CENTER is at (cockpit_x, fuselage_top_y + 0.20, 0)").

### Per-vehicle iterations

| Slug | Regens | Final tris | Notes |
|---|---:|---:|---|
| uh1-huey | 4 | 1184 | Open cargo doorway + cockpit-side window pane + cockpit dome bulging out at front |
| uh1c-gunship | 3 | 1512 | Solid cabin sides (gunship-correct); cockpit-side windows; rounded body |
| ah1-cobra | 0 | 2100 | Approved as-is from the original session |
| ac47-spooky | 4 | 2128 | Long tubular body with prominent passenger window row (0.45m × 0.35m insets); 3 left-side miniguns |
| f4-phantom | 2 | 2076 | Vertical fin standing tall via `boxGeo(2.5, 2.0, 0.10)`; tandem canopy raised proud of fuselage roof |
| a1-skyraider | 1 | 2144 | Re-rolled with new FRAME — no more wingtip nav-light decals |

Total: **53 KB → 13 KB net reduction** in GLB bytes for the 5 re-rolled aircraft. Triangle savings from decorative-mesh removal alone: ~1200 tris on Huey, ~1200 on Gunship.

### Slug filter (new CLI affordance)

`scripts/gen-aircraft.ts` gained a `--slugs=foo,bar` CLI flag so a single broken vehicle can be re-rolled without running the full 10-aircraft batch:

```bash
unset ANTHROPIC_API_KEY GEMINI_API_KEY OPENAI_API_KEY && \
bun scripts/gen-aircraft.ts --slugs=uh1-huey,f4-phantom
```

The flag complements the existing resumable skip — to force a re-roll, also delete the stale `<slug>.glb` + `<slug>.glb.provenance.json` first (the resumable skip will then pick up the missing file and regenerate). Pattern: see `aircraft-regen-flow.md` in auto-memory.

### Audit-grid as truth

Audit grids (`bun run audit:glb`) repeatedly caught issues that the gallery's `<model-viewer>` masked: the F4 vertical-fin laid-flat bug, the Huey door-frame box, the gunship red insignia squares. Strict back-face-culled Three.js render in [scripts/visual-audit.ts](../scripts/visual-audit.ts) is the trustworthy QA surface — `<model-viewer>` renders double-sided by default, hiding winding bugs.

### Texture-baked albedo path (deferred to next cycle)

The proper game-dev solution for window/cockpit/national-marking detail is UV-unwrap + painted albedo texture. `autoUnwrap` ([uv.ts](../packages/core/src/kiln/uv.ts)), `loadTexture` + `pbrMaterial` ([textures.ts](../packages/core/src/kiln/textures.ts)) are all already wired into the kiln sandbox. The kiln gen prompt does NOT yet teach the LLM to use them for vehicle generation — that's the next cycle's work. Mesh-insert windows ARE a draw-call hit per insert (mitigated by TIJ's `optimizeStaticModelDrawCalls` post-load merge + Pixel Forge's `dedup()` post-transform); the user explicitly observed this trade-off and greenlit a future cycle for the texture-baked path.
