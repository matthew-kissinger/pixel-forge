# Textured-aircraft cycle postmortem (2026-05-03)

**Status: cycle abandoned. Substrate fixes kept.**

## Goal (intended)

Replace the per-vehicle mesh-window inserts (small dark `boxGeo` rectangles representing windows + cargo doorways on TIJ aircraft) with **UV-baked albedo textures** on the fuselage. Same silhouette, painted detail instead of mesh detail, theoretically lower triangle counts and a more "production-game-ready" pipeline.

## What we tried

Three image-generation strategies, each producing one albedo PNG per aircraft, all consumed via `cylinderUnwrap(capsuleXGeo(...))` + `pbrMaterial({ albedo: tex })`:

| Strategy | Provider | Cost / run | Verdict |
|---|---|---|---|
| **v0** — hand-painted procedural | sharp (free) | $0 | Cleanest output. Predictable layout. Looked like flat sticker art. |
| **gpt-edit** — gpt-image-2 multi-ref edit (V0 + style ref) | OpenAI | ~$0.21 | Layout-preserving with great weathering. Best painted look. |
| **gpt-text** — gpt-image-1.5 text-only with prompted layout | OpenAI | ~$0.05 | Frequently hallucinated multi-panel sprite-art instead of UV wraps (e.g. F-4 came back as a side-view sprite with squadron markings, not a UV unwrap). Unreliable as a UV. |
| **gemini-edit** — Gemini Nano Banana Pro multi-image | Google | ~$0.04 | Inconsistent per aircraft. Huey/Spooky preserved layout; F-4 drew a top-down view; Spooky added architectural drawings. |

24 final variants total (4 strategies × 6 aircraft). Total spend on AI-generated textures: ~$1.55.

## Why it was abandoned

The texture work itself produced acceptable albedo PNGs (especially gpt-edit with V0 layout reference). **The blocker was the GLB regen needed underneath**: every textured GLB had to be re-emitted by Claude Opus via `gen-aircraft-textured.ts`, and the regenerated geometry came out **lower-quality than the polished mesh-window batch from the previous cycle**:

- Smaller cabin bodies relative to rotor disc on Huey/Gunship/Cobra
- Less recognizable silhouettes
- Floating-part structural warnings on Spooky and Skyraider (prop blades not attached to hub)
- Anthropic credit ran out mid-batch, leaving 3 of 6 aircraft unregenerated

We tried a V2 fix using a `panelRemapV` helper (sample the panel-zone of a shared texture from small meshes — see "Substrate fixes kept" below). It worked correctly but didn't address the root issue: the user's eyeball test on the all-6 review page concluded the **GLB geometry, not the texture, was wrong**.

Final user verdict: *"those are the right textures but all the wrong glbs from a bad batch — these are the ones i would like to have and package"* (pointing at the polished mesh-window backup file sizes).

## Substrate fixes kept (durable wins)

These landed during the cycle and made the kiln pipeline materially more robust. They're decoupled from the texture goal — keep them regardless.

### 1. Cross-module THREE bridge fix

The kiln executor uses `new Function(...)` to run LLM-generated code, which under bun creates an **isolated module realm**. `new THREE.Mesh()` inside the sandbox produces objects whose constructor is *not* the same class object as `THREE.Mesh` imported by `render.ts` / `inspect.ts` / `solids.ts` / `primitives.ts`. Result: `instanceof THREE.Mesh` returned **false** for sandbox-created meshes.

Symptoms before fix:
- `Mesh_Fuselage` node appeared in GLB but with **no mesh attached** (silently dropped at the bridge)
- Textures absent from final GLB — the material's texture branch was never taken
- `inspectSceneStructure` floating-part check missed sandbox meshes, producing false-positive warnings

Fix: switched every `instanceof THREE.X` check that runs against sandbox-produced objects to Three.js's `.isX` duck-typing flags (`.isMesh`, `.isObject3D`, `.isTexture`, `.isMeshStandardMaterial`, etc.). Those are set on every prototype and survive across module realms.

Files touched:
- [packages/core/src/kiln/render.ts](../packages/core/src/kiln/render.ts) — `executeKilnCode`, `bridgeMaterial`, `bridgeNode`, `collectMeshStats`
- [packages/core/src/kiln/inspect.ts](../packages/core/src/kiln/inspect.ts) — `classifyNode`, `countTris`, `countUniqueMaterials`
- [packages/core/src/kiln/solids.ts](../packages/core/src/kiln/solids.ts) — `threeToManifold`, CSG opts parser, `materialOf`, `combineRangesFromCsgInputs`
- [packages/core/src/kiln/primitives.ts](../packages/core/src/kiln/primitives.ts) — `createInstance`, `countTriangles`, `countMaterials`
- [packages/core/src/kiln/textures.ts](../packages/core/src/kiln/textures.ts) — `pbrMaterial` Texture-vs-color branching

Regression test: [packages/core/src/kiln/\_\_tests\_\_/sandbox-three-bridge.test.ts](../packages/core/src/kiln/__tests__/sandbox-three-bridge.test.ts) — exercises both `new THREE.Mesh()` directly and `new THREE.Mesh(geo, pbrMaterial({ albedo: loadedTex }))` paths, asserts the resulting GLB carries the mesh + texture.

**Don't reintroduce `instanceof THREE.X` against sandbox values.** The CLAUDE.md "Kiln substrate invariants" section spells this out for future agents.

### 2. `panelRemapV` primitive

Added to [packages/core/src/kiln/uv-shapes.ts](../packages/core/src/kiln/uv-shapes.ts), wired through to the kiln sandbox via [primitives.ts:1224](../packages/core/src/kiln/primitives.ts) and exposed in the LLM prompt.

Solves: how do you make a small mesh sample a sub-region of a shared texture *without cloning the texture*? Three.js `Texture.clone()` runs `JSON.parse(JSON.stringify(userData))`, which converts the encoded PNG `Uint8Array` into a plain object — the GLB bridge then can't serialize it.

`panelRemapV(geo, vScale=0.30, vOffset=0, uScale=1, uOffset=0)` rescales the geometry's existing UV attribute. Same Texture object, different sampling region. Useful for any multi-zone albedo: e.g. v=0..0.30 = clean panel, v=0.30..1.0 = decorative — small parts call `panelRemapV(unwrap(geo), 0.30)` and inherit the same `bodyMat`.

### 3. `<glb>.code.js` dump alongside every GLB

Added to [scripts/\_direct-batch.ts](../scripts/_direct-batch.ts). Every kiln-generated GLB now writes its source code next to it. ~5 KB overhead per asset, but it lets you:
- Inspect what the LLM emitted without re-running the API
- Hand-edit the code (tweak coordinates, remove parts) and re-render via `renderGLB(code)` in 200 ms — no API spend
- Debug "why is this mesh missing?" by reading the actual generated program

This saved hours during the textured-aircraft cycle. **Keep it on by default.**

### 4. Gallery file route content-types

[packages/server/src/routes/gallery.ts](../packages/server/src/routes/gallery.ts) `/gallery/file/*` now returns `text/html` for `.html` files and `application/json` for `.json`. Lets review pages and provenance sidecars render correctly in the browser instead of downloading.

### 5. Refined V0 albedo color palette (informational)

The V0 hand-painter ([scripts/bake-aircraft-albedo.ts](../scripts/bake-aircraft-albedo.ts)) settled on:
- **`WINDOW_GLASS = #263846`** + **`WINDOW_HIGHLIGHT = #587387`** — teal-blue glass with pale highlight, reads as cockpit window not a black hole
- **`DOORWAY_INTERIOR = #1E2319`** + **`DOORWAY_FLOOR = #2A2D20`** — dark olive-brown for cabin interior shadow, NOT pure black
- Reserved bottom 30% (v=0..0.30) of the texture as a **clean panel zone** — small parts can sample only this strip via `panelRemapV(geo, 0.30)`

These constants survive in the script for future texture work.

## Archived (don't delete; may revisit)

- `war-assets/_review/_archive-texture-ab-2026-05-03/` — full A/B set: 24 GLB variants, 24 audit grids, 4 albedo PNG sets, comparison HTML, viewer HTML
- `war-assets/textures/aircraft/<slug>-albedo.png` × 6 — V0 hand-painted PNGs (no longer referenced; ~30 KB total, cheap to keep)
- `scripts/bake-aircraft-albedo.ts`, `scripts/gen-aircraft-textured.ts`, `scripts/gen-aircraft-albedo-ab.ts`, `scripts/retex-aircraft-variants.ts`, `scripts/audit-aircraft-variants.ts`, `scripts/build-aircraft-review.ts` — texture-cycle scripts, useful as a starting point if texture-baking gets revisited

## What would unblock a future texture cycle

The blocker was geometry quality, not texture quality. Two paths forward:

1. **Hybrid approach (most promising)**: keep the polished mesh-window batch GLBs as the canonical body geometry. Add textures *via retex* — ship a baked albedo onto the existing material slot using `retexCharacter` or similar. Skip the LLM regen entirely. Gives you painted weathering without the regen quality lottery.
2. **Tighter LLM prompts**: the texture FRAME would need to constrain dimensions much more aggressively, and the structural validator would need to catch undersized cabins (not just floating parts). Higher effort, less certain.

## Production fleet status (canonical, locked 2026-05-03)

The 6 TIJ aircraft are the polished mesh-window batch from 2026-05-02. They live at:

```
war-assets/vehicles/aircraft/uh1-huey.glb     (46 KB, 1188 tris)
war-assets/vehicles/aircraft/uh1c-gunship.glb (51 KB, 1512 tris)
war-assets/vehicles/aircraft/ah1-cobra.glb    (70 KB, 2100 tris)
war-assets/vehicles/aircraft/ac47-spooky.glb  (68 KB, 2128 tris)
war-assets/vehicles/aircraft/f4-phantom.glb   (60 KB, 2076 tris)
war-assets/vehicles/aircraft/a1-skyraider.glb (63 KB, 2144 tris)
```

Source of truth in [war-assets/vehicles/_backup-aircraft-2026-05-02-polish/](../war-assets/vehicles/_backup-aircraft-2026-05-02-polish/). Mirror copies for audit grids in `war-assets/validation/aircraft-*.glb`. See [aircraft-canonical-set-2026-05-03.md](../../../.claude/projects/C--Users-Mattm-X-games-3d-pixel-forge/memory/aircraft-canonical-set-2026-05-03.md) memory for the lock entry.
