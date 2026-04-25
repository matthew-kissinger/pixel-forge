# Animated Imposter Worklog

Status: docs tracker - not a task runner.
Date opened: 2026-04-24.
Design doc: [animated-imposter-design.md](animated-imposter-design.md).
Brief: [animated-imposter-brief.md](animated-imposter-brief.md).
Cycle plan: [animated-imposter-dev-cycle.md](animated-imposter-dev-cycle.md).

## Decision

Octa first, VAT fallback.

The first implementation slice should be a WebGL2 animated octahedral impostor array: one character, one clip, 6x6 or 8x8 view grid, 8-16 sampled frames, instanced quads, and a `DataArrayTexture` runtime path with a packed 2D atlas fallback. VAT proxy remains the explicit second-best path if angle snapping, overdraw, palette/KTX2 encoding, or WebGL2 texture-array behavior fails.

## Current Status

- Research brief read end to end.
- Initial research pass completed in [animated-imposter-design.md](animated-imposter-design.md).
- Follow-up Horde inspection changed the first slice from VAT proxy to animated octahedral impostor array.
- Public WebGL references found for static octahedral impostors and VAT, but not a mature public Three/WebGL animated-octahedral human-crowd library comparable to Horde.
- Dev cycle plan created in [animated-imposter-dev-cycle.md](animated-imposter-dev-cycle.md).
- W1 schema and pre-bake validator implemented in `@pixel-forge/core`.
- Focused W1 tests and core typecheck pass.
- W2/W3 review spike completed for one source soldier and one locomotion clip: local output under `tmp/animated-imposter-review/`, no `war-assets/` writes.
- Animated baker work is currently limited to one source soldier, one clip, a packed RGBA8 debug atlas, sidecar validation, and a local review page.
- Review bake source: `../../soldier-research/downloads/polypizza/PpLF4rt4ah__Character_Soldier_-_Free_Model_By_Quaternius.glb`, matching the TIJ gallery `us_arvn_base` soldier source family while preserving animation clips. The current single-clip bake uses `running` because this GLB has `Run` but no true `Walk`.
- Review bake output: `tmp/animated-imposter-review/index.html`, `animated-albedo-packed.png`, `animated-imposter.json`, and `animated-frame-strip.png`.
- Browser review page now includes a moving-camera scene probe for the runtime candidate: fixed per-instance yaw, actor-local sampling, axis-locked upright billboards, and a continuous elevation gate. The candidate behaves as an upright cylindrical impostor for normal ground/low-air reads, sampling only horizon captures so soldiers do not tilt. It releases into the full octahedral view set only when both angle and vertical separation are high enough for aircraft, cliff, or below-actor cases.
- Research check: Godot's octahedral impostor shader uses object-space camera vectors, frame blending, sprite projection, and virtual-plane UV correction; billboard literature distinguishes axial/upright billboards from fully camera-facing billboards; particle-engine docs warn that screen/camera-aligned billboards can swim or rotate in ways that break world anchoring. That supports a soldier-specific upright cylindrical default with a spherical cap, not raw nearest-octa sampling for every camera.
- The original Link-looking `Character_Animated` source is now treated as an animation-library fixture only. The active review source is the `PpLF4rt4ah` soldier family used for TIJ `us_arvn_base`. The current gallery `lod0.glb` is a static visual output and does not preserve clips, so animated bakes use the original downloaded source GLB until the LOD/export path keeps animations. The next cycle needs a human asset-selection gate for actual soldiers, retexture/paint state, weapon mounting, clip coverage, vegetation species fit, and static/animated impostor suitability.
- Validation result: sidecar schema valid, repeat bake hash matched, 8 frames, 6x6 views, 96 px tiles, packed atlas 2304x1152 with a 4x2 frame grid, raw RGBA8 storage 10,616,832 bytes inside the 31,457,280 byte envelope, min alpha coverage 0.1488.
- No production runtime code written.
- No generated assets changed.

## Locked Constraints

- No Blender in the build pipeline.
- No new heavy runtime dependency around 5 MB.
- Target per-character full LOD envelope around 30 MB.
- Pixel Forge baker side uses Three.js 0.184 headless with Playwright Chromium.
- TIJ consumer remains Three.js 0.184 and should start with WebGL2, not WebGPU.
- Use existing kiln static-impostor harness, clip resolver, gallery, and pipeline orchestration patterns where possible.
- Keep business logic in `@pixel-forge/core`; adapters remain transport layers.

## Open Risks

- Angle snapping may be visible for moving soldiers at TIJ camera distances.
- Quad overdraw may dominate when thousands of alpha-tested soldiers overlap.
- WebGL2 `DataArrayTexture` behavior may be inconsistent enough to require the packed 2D atlas path immediately.
- R8 palette-index output may be harder than expected without Horde's unpublished baker tooling.
- Optional depth or normal layers may be needed for lighting, pushing storage over the target envelope.
- Missing or weak shoot clips for NVA/VC remain a content issue independent of the rendering technique.

## Next Implementation Slices

1. Human reviews `tmp/animated-imposter-review/index.html` and the frame strip for angle-snapping and silhouette acceptability.
2. Build a TIJ WebGL2 runtime spike with `InstancedMesh + ShaderMaterial`, per-instance `frameOffset`, `clip`, `variant`, `yaw`, and `paletteRow` only after the review artifact passes.
3. Add a TIJ gallery preview before scaling beyond one character.
4. Promote R8 palette-index output only after the RGBA8 visual contract is accepted.

## Checklist

- [x] Docs aligned to octahedral-first decision.
- [x] Separate tracker created.
- [x] Dev cycle plan created.
- [x] W1 schema and pre-bake validator.
- [x] Baker spike: one character, one clip, small view grid.
- [x] Local review surface: packed atlas, frame strip, sidecar, summary HTML.
- [ ] WebGL runtime spike: `DataArrayTexture` path and packed 2D fallback.
- [ ] Validation gallery: source-vs-impostor, yaw sweep, warnings.
- [ ] Storage/perf gate: TIJ frame-time check.
- [ ] TIJ integration: distance policy and production artifact loading.

## Notes For The First Code Pass

The smallest useful code pass is not the full pipeline. It is a one-character, one-clip proof that renders a tiny animated octahedral array, writes a sidecar, and displays it in a minimal WebGL viewer. That slice answers the hardest question first: whether the visual artifact is acceptable at real game distances.
