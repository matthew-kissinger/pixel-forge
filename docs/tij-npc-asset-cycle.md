# TIJ NPC Asset Cycle

Status: active review-only NPC package alignment.
Parent pipeline doc: [tij-asset-pipeline-proposal.md](tij-asset-pipeline-proposal.md).
Animated impostor plan: [animated-imposter-dev-cycle.md](animated-imposter-dev-cycle.md).
Worklog: [animated-imposter-worklog.md](animated-imposter-worklog.md).

## Current Decision

Build the NPC pack first, then return to vegetation validation.

The accepted direction is a low-poly all-faction character pack feeding animated octahedral impostors. The current proof is not promoted game content yet and there is no production runtime loader. It is a review artifact proving that Pixel Forge can take a rigged faction GLB, attach a separate TIJ weapon, bake a moving-fire clip into a packed animated impostor atlas, and keep the storage inside the rough 30 MB envelope.

Vegetation remains important, but it is a separate static-impostor/billboard lane. Do not mix vegetation decisions into the animated NPC pack until the NPC batch gate and runtime spike have clear results.

## What Is Approved

- Body direction: Aronia-derived low-poly humanoid style, repaired through local material/gear rules after Meshy rigging.
- Factions for NPC pack v1: `usArmy`, `arvn`, `nva`, `vc`.
- Scratch pack root: `tmp/source-glb-selection/derived/tij-character-pack-v1/`.
- Pack shape: 32 GLBs, 4 factions by 8 clips.
- Validation signal: all outputs load, each animated body has 24 joints, and max triangle counts stay below 710 tris per faction.
- First animated impostor proof: `tmp/animated-imposter-review/tij-character-pack-v1/nva/walk_fight_forward/index.html`.
- First proof settings: `7x7` views, `96px` tiles, `8` frames, packed RGBA8 debug output, AK attachment baked into frames.
- First proof result: visually accepted in local review; deterministic sidecar; nonzero alpha coverage; raw storage `14,450,688 / 31,457,280` bytes.
- Review package: `tmp/tij-npc-asset-package/tij-character-pack-v1/`.
- Package index: `tmp/tij-npc-asset-package/tij-character-pack-v1/index.html`.
- Package manifest: `tmp/tij-npc-asset-package/tij-character-pack-v1/npc-package-manifest.json`.
- Combined GLBs: four faction GLBs under `glb-combined/`, each with 8 named animation clips.
- Animated impostors: 32 per-faction/per-clip packed RGBA8 debug outputs under `impostors/<faction>/<clip>/`.

## What Is Not Approved

- No `war-assets/` mutation from this pack until a human explicitly promotes it.
- No TIJ repo mutation from this cycle yet.
- No raw Meshy retexture GLBs as runtime bodies, because they stripped skinning and failed visual review.
- No `Gun_Hold_Left_Turn` production clip. It does not map to current TIJ states.
- No `Walk_Forward_While_Shooting` production clip. It read one-handed, leaned backward, clipped legs, and snapped at the loop.
- No blended neighboring octa views in the packed-atlas fallback at `96px`; it created duplicate silhouettes.
- No Blender as an automated build dependency. Blender/Rigify remains allowed as a human-operated authoring and export tool if that route becomes necessary.
- No production storage claim from the all-clip RGBA8 debug package. The package intentionally bakes every current clip for review, so its total raw debug footprint is larger than the eventual production envelope.
- No animated NPC runtime readiness claim. The packed-atlas and texture-array consumer spike is still a follow-up gate.

## NPC Clip Set

The current manifest contains these candidate clips:

| Clip | Manifest status | TIJ state mapping | Cycle decision |
|---|---|---|---|
| `rest` | reference | `idle` | Keep as reference only. Do not bake for production. |
| `idle` | review | `idle`, `alert`, `defending` | Batch candidate. |
| `patrol_walk` | candidate | `patrolling`, `defending` | Batch candidate. |
| `traverse_run` | candidate | `seeking_cover`, `retreating` | Batch candidate. |
| `advance_fire` | candidate | `advancing`, `engaging` | Review after `walk_fight_forward`; do not assume it is better. |
| `walk_fight_forward` | review | `engaging`, `advancing` | Accepted first proof target. |
| `death_fall_back` | candidate | `dead` | Batch candidate. |
| `dead_pose` | review | `dead` | Optional static end-state frame. |

Minimum batch after the first proof:

1. `idle`
2. `patrol_walk`
3. `traverse_run`
4. `walk_fight_forward`
5. `death_fall_back`
6. Optional `dead_pose`

## Artifact Contract

The NPC pack is described by `NpcCharacterPackManifestSchema` and validated through `validateNpcCharacterPack` in `@pixel-forge/core`.

Required pack fields:

- factions and faction labels
- clip ids, human labels, status, excluded flag, and TIJ state mapping
- output GLB path per faction and clip
- primary weapon id
- right and left hand bone names
- validation metrics for file size, triangle count, joint count, animation count, and warnings

The animated impostor sidecar is described by `AnimatedImposterMetaSchema`. The first accepted proof records:

- source GLB path
- AK attachment metadata and hash
- logical target `shoot`
- raw fallback clip `Armature|Walk_Fight_Forward|baselayer`
- `7x7` view grid
- `96px` tiles
- `8` sampled frames
- packed RGBA8 debug atlas metadata
- storage estimate and alpha coverage

The package manifest is written by:

```bash
bun run tij:npc-package
```

Package shape:

- `glb-combined/<faction>.glb` - one skinned GLB per faction with all 8 named clips.
- `glb/<faction>/<clip>.glb` - source per-clip GLB copies for inspection and fallback.
- `weapons/m16a1.glb` and `weapons/ak47.glb` - copied review weapons used for baked attachments.
- `impostors/<faction>/<clip>/animated-imposter.json` - validated sidecar.
- `impostors/<faction>/<clip>/animated-albedo-packed.png` - packed RGBA8 debug atlas.
- `impostors/<faction>/<clip>/animated-frame-strip.png` - visual contact sheet.
- `impostors/<faction>/<clip>/review-summary.json` - per-output validation summary.
- `npc-package-manifest.json` - package-level index with GLB, weapon, and impostor paths.
- `index.html` - human review table.

## Next Cycle Order

1. Review the package index across all factions, clips, weapons, and frame strips.
2. Mark any bad clips as rejected in the source manifest before production baking.
3. Build the WebGL2 runtime spike from the package manifest: `InstancedMesh + ShaderMaterial`, packed atlas first, `DataArrayTexture` second.
4. Measure 1000 and 3000 instance scenes before any TIJ integration.
5. Attempt R8 palette-index output only after the RGBA8 visual contract is accepted.
6. Reduce the production clip set if the all-clip storage budget stays too high.
7. Promote nothing to `war-assets/` or TIJ until the batch, runtime, and storage gates pass.

## Validation Gates

For each generated animated NPC impostor:

- sidecar parses through `AnimatedImposterMetaSchema`
- deterministic atlas hash repeats
- every frame atlas has nonzero alpha coverage
- source preview and impostor preview are frame-locked
- weapon attachment is recorded and visible when the clip needs it
- storage is written and marked debug RGBA8
- warnings are visible in the review page
- no page errors in the local browser review

Focused commands:

```bash
cd packages/core && bun test src/kiln/imposter/__tests__/animated-schema.test.ts src/kiln/imposter/__tests__/animated-validate.test.ts src/kiln/imposter/__tests__/npc-character-pack.test.ts
cd packages/core && bun run typecheck
bun run animated-imposter:review
bun run tij:npc-package
```

Do not use root `bun run test` for this package work.

## Vegetation Handoff

Vegetation comes after the NPC batch and runtime proof because it has a different rendering contract.

Vegetation lane:

- static kiln impostors for GLB vegetation
- crossed quads or sprite billboards for flat PNG vegetation
- atlas packing and frame-table metadata for TIJ's billboard system
- species mapping against TIJ `textureName` values
- human review by silhouette, density, texture quality, and storage

Current blocked vegetation species remain intentionally blocked by default validation: `rubberTree`, `elephantGrass`, `ricePaddyPlants`, `areca`, `mangrove`, and `banyan`. `bun run tij:vegetation-validate` should keep failing on those until replacement sources pass review; `--allow-blocked` is only for structural package-health checks.

Do not wait for animated NPC impostors to be fully productionized before validating vegetation. The handoff point is after the NPC runtime spike proves whether the animated impostor path is viable. At that point, switch to the static vegetation validation matrix without changing the NPC scratch pack.

## Current Stop Conditions

Pivot away from this exact NPC path if:

- `7x7` packed-atlas sampling becomes visibly unstable at real TIJ camera distances
- alpha overdraw fails the 3000-instance target
- WebGL2 packed atlas and texture-array paths both prove unreliable
- debug RGBA8 cannot be reduced toward the production envelope with R8 palette-index or equivalent encoding
- the current Meshy-derived clip bank cannot cover idle, walk, run, fight, and death without unacceptable animation artifacts
