# Animated Imposter Dev Cycle Plan

Status: W2/W3 local review spike complete - human review gate active.
Started: 2026-04-24.
Mode: gated spike, then scale.
Design: [animated-imposter-design.md](animated-imposter-design.md).
Worklog: [animated-imposter-worklog.md](animated-imposter-worklog.md).
Brief: [animated-imposter-brief.md](animated-imposter-brief.md).

## 0. North Star

Prove whether Pixel Forge can bake animated octahedral impostors for TIJ soldiers that render as cheap, readable, moving crowds at aircraft distance. The first useful outcome is not the full pipeline. It is one character, one clip, one validated WebGL2 animated impostor artifact, plus a viewer that makes angle snapping and storage cost obvious.

Success means:

1. One TIJ soldier-model clip bakes into an `animated-imposter.json` sidecar and color texture layers.
2. The artifact displays through a WebGL2 `InstancedMesh + ShaderMaterial` path with per-instance phase variation.
3. Fixed-camera silhouette validation passes or reports actionable warnings.
4. Yaw-sweep review shows whether view-angle snapping is acceptable at TIJ distances.
5. Raw GPU memory for the production target remains inside the approximate 30 MB per-character envelope.

## 1. Binding Decisions

- First path: WebGL2 animated octahedral impostor array.
- Fallback path: VAT proxy LOD if octahedral artifacts fail.
- Runtime target: `THREE.DataArrayTexture` first, packed 2D atlas fallback second.
- Rendering primitive: instanced quads, not proxy meshes, for the first slice.
- Per-instance state: `frameOffset`, `clip`, `variant`, `yaw`, `paletteRow`, optional `lodAlpha`.
- Bake target: start with `6x6` or `8x8` views, `96` px tiles, and `8-16` frames for one clip.
- Encoding target: R8 palette-index albedo for production, RGBA8 only for debug.
- No Blender in the build pipeline.
- No WebGPU compute or TSL dependency in the TIJ-facing plan.
- No generated `war-assets/` mutation in this cycle without explicit approval.

## 2. Out Of Scope

- Full 8-character, 4-clip production bake before the one-character gates pass.
- Depth or normal layers before albedo-only validation proves the basic artifact.
- Animation retargeting for missing NVA/VC shoot clips.
- A new runtime dependency around 5 MB.
- Porting Horde's WebGPU compute path.
- Treating the tracker doc as a source-of-truth task runner.

## 3. Asset Selection Alignment

The first Link-looking `Character_Animated` review source was a technical fixture for bake/runtime validation only. It is not the final TIJ soldier look and must not become the production default. The review fixture now uses the same source family as the TIJ gallery soldier base `PpLF4rt4ah__Character_Soldier_-_Free_Model_By_Quaternius` (`us_arvn_base`) because it is closer to the actual game soldier silhouette. The gallery `lod0.glb` currently does not preserve animation clips, so animated bakes read the original downloaded source GLB until the soldier LOD/export path keeps clips intact. Before production scale-up, the next cycle needs a human-facing selection pass for both soldiers and vegetation.

Production soldier source set:

| Role | Source model | Production note |
|---|---|---|
| US / ARVN base | `PpLF4rt4ah__Character_Soldier_-_Free_Model_By_Quaternius` | Default animated-impostor review fixture and current production-facing soldier base; paint/retexture into OG-107, ERDL, tiger stripe, and ARVN variants before promotion. |
| US variant | `5EGWBMpuXq__Adventurer_-_Free_Model_By_Quaternius` | Optional squad variety only if repaint reads as Vietnam-era soldier. |
| NVA base | `66kQ4dBBC7__Characters_Matt_-_Free_Model_By_Quaternius` | Needs khaki/olive uniform, pith helmet or compatible headgear, AK-compatible mount, and shoot-clip decision. |
| VC base | `UcLErL2W37__Characters_Sam_-_Free_Model_By_Quaternius` | Needs black pajama / guerrilla silhouette, conical-hat or soft-cap decision, AK-compatible mount, and shoot-clip decision. |
| US heavy / LRRP | `Btfn3G5Xv4__SWAT_-_Free_Model_By_Quaternius` | Only promote if body armor/tactical silhouette can be painted into a believable Vietnam-era role. |
| Civilian female | `75ikp7NEDx__Cube_Woman_Character_-_Free_Model_By_Quaternius` | Villager/noncombatant pool, not a combat soldier default. |
| Civilian male | `DojKLcO34E__Beach_Character_-_Free_Model_By_Quaternius` | Villager/noncombatant pool, not a combat soldier default. |
| Animation library only | `DgOCW9ZCRJ__Character_Animated_-_Free_Model_By_Quaternius` | Keep for clip/rig experimentation; do not ship as final soldier art unless repainted and manually approved. |

Soldier selection gate:

- Show candidate source GLB, retextured/painted faction preview, weapon mount preview, LOD chain, static impostor, and animated impostor candidate on one review card.
- Record whether the rig has usable `idle`, `walk`, `run`, `shoot`, hit, and death clips, and whether `shoot` is native, fallback, or requires retargeting.
- Keep faction paint/retexture status explicit: source material, palette row, uniform color, headgear, weapon, and whether the final look still reads as Vietnam soldier rather than fantasy/adventure placeholder.
- Compare the model against the already shipped 2D faction sprite references: US, NVA, ARVN, and VC. Matching those game silhouettes matters more than preserving the downloaded source material.
- Do not promote a soldier to W5 unless the human approves the look and the clip coverage.

Vegetation selection gate:

- Keep vegetation separate from animated soldiers. Static octahedral impostors, crossed billboards, and atlas sprites are valid options depending on species and distance band.
- Review candidates by species fit, silhouette at helicopter distance, texture quality, license, triangle count, impostor size, and TIJ `textureName` mapping.
- Show source, static impostor/billboard result, storage, and species mapping before moving any generated output into `war-assets/` or TIJ.

## 4. Target Architecture

```text
packages/core/src/kiln/imposter/
  animated-schema.ts          # zod sidecar schema
  animated-validate.ts        # pre-bake and post-bake validators
  animated-bake.ts            # Playwright/Three octahedral frame capture
  animated-palette.ts         # R8 palette-index experiment
  animated-runtime-preview.ts # small gallery/viewer helper if needed
  __tests__/

packages/server/tij-gallery/
  index.html                  # add animated preview panel after artifact exists

scripts/run-tij-pipeline.ts   # add animated-imposters stage only after gates pass
```

The public API should eventually surface through `kiln`, matching the existing substrate-plus-thin-adapters rule. CLI and MCP exposure wait until the core artifact contract is stable.

## 5. DAG

```text
W0 docs alignment
  -> W1 schema + validator contract
    -> W2 one-character bake spike
      -> W3 post-bake validation + gallery review
        -> W4 WebGL2 runtime spike
          -> W5 one-character, four-clip scale-up
            -> W6 pipeline wiring and handoff

Fallback branch:
  W3/W4 fail on snapping, overdraw, or WebGL2 texture arrays
    -> VAT proxy spike using the preserved fallback design
```

## 6. Wave Plan

### W0 - Docs Alignment

Status: done.

Deliverables:

- [animated-imposter-design.md](animated-imposter-design.md) records octa-first, VAT fallback.
- [animated-imposter-worklog.md](animated-imposter-worklog.md) tracks decision and state.
- [animated-imposter-dev-cycle.md](animated-imposter-dev-cycle.md) defines this execution plan.
- Parent docs point at the answered design instead of calling the topic open.

Acceptance:

- `git status --short` shows only intentional docs changes.
- No code or generated asset changes.

### W1 - Schema And Pre-Bake Validator

Status: done.

Goal: make the contract concrete before opening Playwright.

Deliverables:

- `AnimatedImposterMetaSchema` v2 for `kind: 'animated-octahedral-imposter'`.
- Schema tests for required fields, texture layout, clips, runtime attributes, and validation warnings.
- Pre-bake validator that reports GLB skinning, clip coverage, view grid, tile size, storage estimate, and source-manifest drift.
- No actual bake output yet.

Acceptance:

- `cd packages/core && bun test src/kiln/imposter/__tests__/animated-schema.test.ts`
- `cd packages/core && bun test src/kiln/imposter/__tests__/animated-validate.test.ts`
- `bun run typecheck`
- No adapter code imports from deep core paths.

### W2 - One-Character Bake Spike

Status: done for the local review spike.

Goal: produce the smallest real animated octahedral artifact.

Implementation note: the first review artifact should use the same soldier source family as `packages/server/output/tij/soldiers/us_arvn_base`, but it must read an animation-preserving GLB. The current gallery `lod0.glb` is valid for static visual review but not for animated baking because its animation clips are stripped. Review output stays under `tmp/animated-imposter-review/`, and `war-assets/` remains untouched.

Result: `bun run animated-imposter:review` bakes `../../soldier-research/downloads/polypizza/PpLF4rt4ah__Character_Soldier_-_Free_Model_By_Quaternius.glb` into `tmp/animated-imposter-review/`. It writes a packed RGBA8 debug atlas, 8 per-frame octahedral atlases, an `animated-imposter.json` sidecar, a frame strip, and a local `index.html` review page.

Clip note: this source has `Run` and `Run_Gun` but no true `Walk`. The W2 review artifact therefore uses the `running` target and records `CharacterArmature|Run` in the sidecar. A slower walk cadence is content work for the soldier selection/retexture pass, not a reason to weaken clip validation.

Deliverables:

- Animated Playwright/Three bake session reusing static-impostor session patterns.
- One selected soldier, one locomotion clip, `6x6` or `8x8` views, `96` px tiles, `8-16` frames.
- RGBA8 debug output allowed for this wave if R8 palette work blocks progress.
- `animated-imposter.json` sidecar emitted with exact storage numbers and warnings.

Acceptance:

- No blank tiles.
- Clip frame timing is deterministic across two runs.
- All layers or packed-atlas regions resolve from the sidecar.
- Output stays outside `war-assets/` unless explicitly approved.

### W3 - Post-Bake Validation And Gallery Review

Status: done for the local review spike; full TIJ gallery integration still gated on human review.

Goal: make the visual defect measurable and reviewable.

Implementation note: for the first review handoff, a static local HTML review page and contact-sheet/atlas output are enough. TIJ gallery route integration remains gated until the artifact passes human review.

Result: sidecar schema validation passed, repeat bake hash matched, all 8 frame atlases are nonblank, min alpha coverage is 0.1488, and raw RGBA8 color storage is 10,616,832 bytes inside the 31,457,280 byte envelope. The local review page also includes a moving-camera scene probe for the runtime candidate: fixed per-instance yaw, actor-local sampling, axis-locked upright billboards, horizon-only sampling for normal ground/low-air reads, and a continuous elevation gate that releases into true octahedral view selection only for steep aircraft, cliff, or below-actor views.

Deliverables:

- Fixed-camera source-vs-impostor comparison.
- Alpha-mask SSIM or equivalent small local silhouette metric.
- Yaw-sweep strip across at least 8 headings.
- Palette transparency and bbox/ground-contact checks.
- Gallery panel showing source GLB, impostor playback, warnings, storage, and clip metadata.

Acceptance:

- Fixed-camera silhouette target is `> 0.90` for pass, warning below that, fail below `0.82`.
- Human can inspect angle snapping without reading logs.
- Validation warnings persist into the sidecar and gallery manifest.

### W4 - WebGL2 Runtime Spike

Goal: prove the consumer shape before scaling the baker.

Runtime contract from W3 review: soldiers use axis-locked billboards built from camera-right plus world-up. The shader samples atlas views from a stable per-instance `yaw` instead of raw camera-relative horizontal view switching for ordinary ground reads. Treat the soldier impostor as cylindrical-primary with a spherical cap: ground/low-air reads sample the horizon ring only, while a continuous elevation gate blends/releases into the full octahedral set as camera-vs-actor elevation and vertical separation enter the steep-view band. This covers aircraft, cliff, and below-actor cases without making flat-ground crowds tilt or spin.

Deliverables:

- Minimal WebGL2 viewer using `InstancedMesh + ShaderMaterial`.
- `DataArrayTexture` sampling path.
- Packed 2D atlas fallback path.
- Per-instance `frameOffset`, `clip`, `variant`, `yaw`, and `paletteRow` attributes.
- 1000 and 3000 instance test scenes with visible phase variation.

Acceptance:

- Viewer renders nonblank animated soldiers.
- Runtime path reports whether it used texture array or packed atlas.
- Frame-time numbers are captured, not guessed.
- If overdraw or snapping is unacceptable, stop and run the VAT fallback spike instead of scaling.

### W5 - One-Character, Four-Clip Scale-Up

Goal: validate the artifact shape under real clip count.

Deliverables:

- One character with `idle`, `walking`, `running`, and `shoot` targets.
- Clip fallback status visible in sidecar and gallery.
- R8 palette-index attempt promoted from experiment to default if it passes.
- RGBA8 marked debug-only unless the storage envelope is explicitly revised.

Acceptance:

- Raw color artifact stays near or below 30 MB for the chosen grid and frame count.
- Gallery review still passes after four clips.
- Missing shoot fallback is visible and not silently accepted as production quality.

### W6 - Pipeline Wiring And Handoff

Goal: make the validated artifact reproducible through the TIJ asset pipeline.

Deliverables:

- `animated-imposters` pipeline stage behind an explicit flag or `--only animated-imposters`.
- Resumable output directory contract under the existing TIJ output area.
- CLI/MCP exposure only if the core contract is stable.
- Handoff notes for TIJ integration, including distance policy and required runtime attributes.

Acceptance:

- `bun run tij:pipeline -- --only animated-imposters` works after the stage exists.
- Existing `soldiers`, `vegetation`, `weapons`, `props`, and `atlas` stages keep their behavior.
- Per-package tests run for touched packages. Do not use root `bun run test`.

## 6. Stop Conditions

Stop the octahedral path and pivot to VAT proxy if any of these stay true after W3/W4:

- `6x6` and `8x8` view grids both show objectionable snapping at real TIJ camera distances.
- Alpha overdraw breaks the 3000-instance runtime target in a TIJ-like scene.
- WebGL2 texture arrays are unreliable and packed 2D fallback is too complex or too slow.
- R8 palette-index output cannot preserve transparency and faction rows without artifacts.
- Depth or normal layers are required and push the artifact beyond the storage envelope.

## 7. Validation Commands

Use package-local tests. Do not run root `bun run test`.

```bash
cd packages/core && bun test
cd packages/server && bun test
cd packages/cli && bun test
cd packages/mcp && bun test
bun run typecheck
bun run lint
```

When the gallery changes:

```bash
bun run build
bun run audit:glb
```

When pipeline wiring lands:

```bash
bun run tij:pipeline -- --only animated-imposters
```

## 8. Human Validation Gate

After W3 and before W5, a human should inspect:

- `tmp/animated-imposter-review/index.html`.
- `tmp/animated-imposter-review/animated-frame-strip.png`.
- The packed atlas for obvious angular holes, upside-down lower-hemisphere views, or unacceptable silhouette snaps.
- Storage and validation table in `tmp/animated-imposter-review/review-summary.json`.

Do not scale to all 8 characters until this gate passes.
