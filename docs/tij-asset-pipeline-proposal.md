# TIJ Asset Pipeline Proposal - kiln extensions + validation gallery

Status: EXECUTED 2026-04-24 - pipeline modules + runner + gallery shipped. Active follow-up is the NPC asset cycle in [tij-npc-asset-cycle.md](tij-npc-asset-cycle.md).
Date authored: 2026-04-24
Supersedes the generation-queue framing in [terror-in-the-jungle-assets.md](terror-in-the-jungle-assets.md) (2026-02-22) for anything downstream of "we now have 375 vegetation GLBs + 74 character GLBs on disk." That older doc is still useful for engine context (art direction, in-engine integration points, HUD conventions).

## Execution log (2026-04-24)

- **All six kiln modules landed** under `packages/core/src/kiln/{imposter,lod,sprite-atlas,fbx-ingest,retex,photogrammetry}/`. Each wired into CLI (`pixelforge kiln <sub>`) and MCP (`pixelforge_kiln_<name>`). 12 kiln MCP tools total, up from 4.
- **Three billboard primitives** added to `packages/core/src/kiln/primitives.ts`: `foliageCardGeo`, `crossedQuadsGeo`, `octaGridPlane`. Registered in `buildSandboxGlobals` + `listPrimitives`. Total primitive count now 51.
- **Pipeline runner** at [scripts/run-tij-pipeline.ts](../scripts/run-tij-pipeline.ts), exposed as `bun run tij:pipeline` (shells to `tsx` - Bun+Playwright CDP doesn't cooperate on Windows). Resumable via `existsSync` skip.
- **Pipeline output**: 103 manifest entries under `packages/server/output/tij/` - 8 soldiers × (4 LODs + 16-angle imposter), 7 weapons, 7 vegetation combos across 29 visible variant imposters after rejecting the potted rubber fig, 80 survival-kit FBXs ingested clean, 60-plant sprite atlas (4096² POT). Total 122 MB before the rejected fig output is physically deleted.
- **Validation gallery** at `/gallery-tij` served by the Hono dev server. HTML at [packages/server/tij-gallery/index.html](../packages/server/tij-gallery/index.html); route at [packages/server/src/routes/gallery-tij.ts](../packages/server/src/routes/gallery-tij.ts).
- **Known deltas from proposal**: imposter layout is lat-lon for all angle counts (not true octahedral - deferred until TIJ consumer shader exists, meta records `layout: 'latlon'`). Retex is diffuse-swap only (region-mask LUTs deferred). Photogrammetry module wired but not run (gated on human call). All 80 FBXs came through with neutral material - their texture references point to external .png files we don't resolve; stripping them at export time lets everything convert cleanly, downstream retex can restore colors.
- **Tests**: core 335 pass, server 114 pass, cli 19 pass, mcp 7 pass. Gated live tests (KILN_IMPOSTER_LIVE, KILN_FBX_LIVE) default off.
- **Acceptance**: five sample GLBs through `bun run audit:glb` all clean under strict back-face cull. Soldier + bamboo imposter atlases visually verified - every tile non-empty.

Human validation is still required before any assets move into TIJ proper. The first NVA animated NPC proof has passed visual review, but the all-faction NPC batch, runtime performance gate, and vegetation validation are still pending.

Vegetation lighting follow-up (2026-04-26): the current vegetation gallery output is review-only. The existing variant atlases were baked as lit beauty PNGs and every sidecar records only `auxLayers: ["albedo"]`, so they can look dark in the gallery and would be darkened again if TIJ multiplies them by runtime sun/sky lighting. Production GLB vegetation impostors must be regenerated with `colorLayer: "baseColor"`, `auxLayers` including `normal`, transparent RGB edge bleed, and gallery/TIJ runtime lighting driven by the billboard sun/sky/ground uniforms.

Vegetation source-selection follow-up (2026-04-26): `rubber-fig-google` is rejected for the TIJ set because it is a potted decorative plant, not jungle canopy. A local GLB inventory audit found no embedded LOD nodes in the current Poly Pizza vegetation sources and no two clean local broadleaf/rubber-tree replacements; the remaining local options are mostly palms, vines, understorey plants, or scale-problem props. Candidate external import pools are [Kenney Nature Kit](https://kenney.nl/assets/nature-kit) for CC0 3D tree/rock/foliage coverage and [Quaternius Ultimate Nature Pack](https://quaternius.com/packs/ultimatenature.html) for CC0 low-poly nature FBX/OBJ/Blend assets. A stronger single-tree candidate is [CGTrader Low Poly Tropical Tree](https://www.cgtrader.com/free-3d-models/plant/other/low-poly-tropical-tree), but its royalty-free license and FBX/OBJ-only format need explicit review before import.

Performance-first vegetation decision (2026-04-26): TIJ production vegetation moves away from legacy flat 2D sprite sources. Every vegetation type is now a GLB-sourced static imposter target, including ground cover. Ground cover must be authored as clumps and baked with compact atlas budgets; mid-level and canopy vegetation use normal-lit profiles with stricter package gates. Full GLBs remain source/audit/hero assets, while the scalable runtime scatter path remains GPU-instanced billboard/imposter rendering.

## Animated impostor decision for skeletal characters

Validation raised this gap on 2026-04-24. Current imposters are STATIC: one pose per 32-angle atlas, baked from the GLB's rest frame. The validation gallery correctly renders the atlas but the billboard never breathes, walks, or fires - while the adjacent live-3D column plays real anim clips. At TIJ's 3000-NPC aerial-gameplay scale the dissonance matters.

Follow-up research changed the first implementation path:

- Static octahedral impostors remain useful for non-skinned far LODs, but they do not solve animated soldiers by themselves.
- The chosen first slice is a **WebGL2 animated octahedral impostor array**: one character, one clip, a small view grid, instanced quads, `DataArrayTexture` first, and a packed 2D atlas fallback.
- VAT proxy remains the explicit fallback if the octahedral path fails on angle snapping, overdraw, texture-array behavior, or palette/KTX2 encoding.
- Horde is treated as runtime and asset-shape inspiration only. Pixel Forge must build its own Three.js/Playwright baker and WebGL2 consumer path.

A clip-resolver utility landed at [packages/core/src/kiln/imposter/clip-resolver.ts](../packages/core/src/kiln/imposter/clip-resolver.ts) - pure, tested against real Quaternius clip lists - so whichever baker we build can share the same logical-target-to-clip-name logic.

The answered design pass is in [docs/animated-imposter-design.md](animated-imposter-design.md), with status in [docs/animated-imposter-worklog.md](animated-imposter-worklog.md), execution details in [docs/animated-imposter-dev-cycle.md](animated-imposter-dev-cycle.md), and the current NPC production lane in [docs/tij-npc-asset-cycle.md](tij-npc-asset-cycle.md). W1 schema/validator and the first local W2/W3 NVA moving-fire review bake are implemented. Human review accepted the first proof visually; the next production decision is whether the approved useful clips and all four factions still hold up in batch review before the WebGL2 runtime spike.

---

## Mission for the fresh agent

Terror in the Jungle (TIJ) finished a research pass on 2026-04-24 that left **~500 GLBs and ~450 sprites on disk** under `C:/Users/Mattm/X/{soldier,vegetation}-research/`. The engine is ready to be "dressed" - but dropping raw geometry in would annihilate the perf budget (3,000 NPCs target, stable frame tails, ~30 vegetation species at dense scatter).

Your job:

1. **Extend kiln** with the missing pipeline stages (imposter baker, LOD decimator, sprite atlas packer, FBX ingest, character retex, photogrammetry cleanup - priority ordered below).
2. **Run the pipeline** across the ranked shortlist in this doc to produce a first wave of production-ready assets.
3. **Ship a validation gallery** - a new page under `packages/client/` (or a scripted static-HTML drop in `packages/server/output/`, your call) that renders each asset next to its imposter under rotation, plus soldier characters with animations playing and a weapon mounted to the right hand.
4. **Hand it back to the human for validation**. They will inspect the gallery, confirm the pipeline behaves correctly on all ranked inputs, then move select assets into TIJ proper for reskin / polish.

You must not modify anything inside `C:/Users/Mattm/X/games-3d/terror-in-the-jungle/`. All changes are in `pixel-forge`. The TIJ repo is **read-only reference** for you.

Use the `context7` MCP server whenever you touch a library (meshoptimizer, xatlas, @gltf-transform, manifold-3d, three.js 0.184 imposter materials, FBXLoader) - your training data is likely stale relative to the versions pinned in `packages/core/package.json`. Prefer context7 over web search for library docs.

---

## Current kiln state - what exists, what doesn't

Source of truth: [packages/core/src/kiln/](../packages/core/src/kiln/)

### Exists

- 48 Three.js primitives in 12 categories (CSG booleans via `manifold-3d`, shape-aware UV unwraps, parametric gears + blades, PBR material helpers, instancing)
- LLM → JS → GLB generator (`generate.ts`, `render.ts`) using Claude + `@gltf-transform/core`
- Headless 6-view audit (`bun run audit:glb`) under strict back-face culling
- `inspect.ts` - GLB stats (tris, bones, animation tracks, bbox)
- `list-primitives.ts` - reflection surface for agents
- Four transports (visual editor, CLI, MCP, HTTP) that all call into the same core

### Does NOT exist (searched packages/, docs/, scripts/: zero hits)

- **No octahedral / hemi-octahedral imposter baker**
- **No flipbook / 8-angle sprite baker**
- **No LOD decimator** (no meshopt_simplifier wrapper)
- **No sprite-sheet / texture atlas packer**
- **No FBX ingest** (FBXLoader is not wired)
- **No character retex pipeline** (region masks → swap diffuse for faction variants)
- **No photogrammetry cleanup** (tier-C Poly Haven plants are raw, need decimate + UV repack + PBR merge before bake)

Everything in this proposal builds on the existing kiln substrate - the headless Three.js renderer, the gltf-transform export, the audit infrastructure. You are not starting from zero.

---

## Input inventory (all absolute paths, all on local disk)

### Soldiers (rigged + animated GLBs)

Root: `C:/Users/Mattm/X/soldier-research/`

- `downloads/polypizza/` - **74 character GLBs**. Highest-value subset (Quaternius, CC-BY / CC0):
  - `BMs52Y9rL5__Base_Character_-_Free_Model_By_AroniaStudios.glb` - current human-preferred iteration base for US Army, ARVN, NVA, VC, and civilian NPCs; 608 tri, 1 material, 29 bones, skinned, 0 clips, needs texture/paint segmentation plus animation proof
  - `BNq2fSOKXq__Guy_-_Free_Model_By_Rafael.glb` - technical fallback for a customizable neutral body; 2.1k tri, 6 materials, UVs, 65 Mixamo bones, 0 clips
  - `PpLF4rt4ah__Character_Soldier_-_Free_Model_By_Quaternius.glb` - animation/impostor review fixture, 14 clips in the current source GLB, 7.9k tri, 62 bones, has `Run` and `Run_Gun` but no true `Walk`; no longer approved as the production soldier body
  - `DgOCW9ZCRJ__Character_Animated_-_Free_Model_By_Quaternius.glb` - animation-library fixture only, 45 anims, 13.7k tri, 53 bones, not production soldier art unless repainted and manually approved
  - `Btfn3G5Xv4__SWAT_-_Free_Model_By_Quaternius.glb`
  - `5EGWBMpuXq__Adventurer_-_Free_Model_By_Quaternius.glb`
  - `BTALZymknF__Punk_-_Free_Model_By_Quaternius.glb`
  - `66kQ4dBBC7__Characters_Matt_-_Free_Model_By_Quaternius.glb`
  - `UcLErL2W37__Characters_Sam_-_Free_Model_By_Quaternius.glb`
  - `75ikp7NEDx__Cube_Woman_Character_-_Free_Model_By_Quaternius.glb`
  - `DojKLcO34E__Beach_Character_-_Free_Model_By_Quaternius.glb`
- `extracted/` - Kenney animated-characters-* (protagonists / retro / survivors), Kenney blocky + mini-characters
- `CHARACTERS_MANIFEST.json` - 298-entry manifest with tri/bone/anim counts, license, fit flags

Skeleton is a Mixamo-compatible 62-bone rig on the Quaternius hero set. Same skeleton across 15+ characters = free anim sharing. Weapon grip goes on `Hand.R` / `mixamorig:RightHand`.

Current scratch rigging proof: `tmp/ravenfield-character-kiln/ravenfield-base-v6.glb` is the approved local direction for a browser-friendly, Ravenfield-like, weaponless, faction-readable placeholder body. It is not a production source because the animation is still pivot-keyed Kiln geometry. `tmp/ravenfield-character-kiln/ravenfield-base-v7-skinned.glb` is the true-skinned proof: rigid weights, humanoid bones, sockets, clips `Idle`, `Walk`, `Run`, `FallLoop`, `DeathFront`, and `DeathBack`, plus low-poly uniform material zones for team tinting. Keep all V6/V7 files in `tmp/`; do not copy them to `war-assets/` or TIJ until a human explicitly promotes the direction.

Current weapon attachment proof: `tmp/weapon-rig-lab/` is the scratch bridge from character sockets to the actual TIJ weapon GLBs. It copies the current TIJ weapon models into `tmp/weapon-rig-lab/weapons/`, generates five archived skinned attempts under `tmp/weapon-rig-lab/attempts/`, and reviews them in `tmp/weapon-rig-lab/index.html`. The intended production contract is close LOD = skinned soldier plus separate weapon attachment; far LOD = weapon baked into the animated impostor atlas. Attempt 02 - Shouldered Rifle verifies weapon axes, grip/support/muzzle metadata, centered weapon offsets, and a preview-only support-hand IK correction, but it is rejected as production art. Screenshot review shows the rifle carried too vertically, the aim pose pointing up instead of shouldering, the left hand overconstrained near the body centerline, and the procedural torso/front details reading wrong. Production should use a standard humanoid rig, retargeted rifle clips, right-hand weapon socket, and left-hand IK or baked support constraints before any scratch asset is promoted to `war-assets/` or TIJ.

Current source-model direction: use a source-GLB-first pipeline. The source does not have to already look like a soldier. It needs to be the right neutral humanoid mesh: legal GLB, mobile-safe triangle count, usable UVs or a believable UV recovery path, clean browser silhouette under rotation, skinning or a credible rigging path, and enough hand/shoulder structure to carry separate TIJ weapon sockets. Soldier identity comes later from UV texture painting, palette rows, faction swatches, headgear, packs, and retargeted rifle clips. Local inventory, Aronia/Rafael, Hunyuan3D/MMGP candidates, and Meshy candidates all have to pass the same audit before animation work: license, triangles, materials, textures, UVs, skeleton, clips, file size, bounding box, weapon-socket fit, and browser silhouette. Meshy is now best treated as a remesh/rig/retexture tool around a selected source, not as the default final soldier generator. Hunyuan3D/FAL/MMGP are useful for source exploration, helmets/packs, and texture/PBR experiments, but generated topology and UVs must be inspected before any retargeting or octa bake.

Current source review surface: `tmp/source-glb-selection/index.html` compares the locally inspected body candidates and shows license, UV, skinning, clip count, and live rotating GLB previews. Aronia Base is provisionally approved as the first body spike, Rafael Guy is the technical fallback, Quaternius models are animation/source references, Kenney mini characters are distant/civilian fallback, and tactical or weapon-baked soldiers are rejected for the close soldier contract.

Current rigging/retexture pipeline gate: Meshy is now proven as a possible animation source for Aronia, but not as a finished art or weapon-socket solution. After explicit human approval, the US Army textured Aronia input was submitted to Meshy as task `019dc69b-7299-7dec-9eb6-698f6de912dc`. The task succeeded, consumed 5 credits, and downloaded a rigged GLB/FBX plus walking and running GLBs. Seven follow-up animation tasks now exist as review evidence: `Gun_Hold_Left_Turn`, `Run_and_Shoot`, `Shot_and_Fall_Backward`, `Walk_Forward_While_Shooting`, plus later `Idle`, `Dead`, and `Walk_Fight_Forward`. The first four exposed the combat-motion risks; `Walk_Fight_Forward` is the current human-accepted moving-fire replacement for the rejected walk-forward-shooting action.

Meshy visual and weapon status: the returned Meshy body did not preserve the accepted material-slot colors or raised hats, so the current useful artifact is a local repaired all-faction pack, not the raw Meshy output. `tmp/source-glb-selection/build-tij-character-pack-v1.mjs` builds `tmp/source-glb-selection/derived/tij-character-pack-v1/` with 32 GLBs: US Army, ARVN, NVA, and VC across rest, idle, patrol walk, traverse run, advance fire, walk fight forward, death fall back, and dead pose. The browser review page is `tmp/source-glb-selection/meshy-rigging-review.html`, now with faction, clip, weapon, playback, and socket-mode controls. Validation found 32/32 GLBs load, each faction has 8 clips, 24 joints, and maximum triangle counts of US Army 659, ARVN 706, NVA 683, and VC 614. The NVA pith cap was enlarged in the pack builder after browser review showed the first silhouette was too small.

Current animation rejection: `Gun_Hold_Left_Turn` and `Walk_Forward_While_Shooting` should not be promoted. Gun-hold turn is not mapped to the current TIJ NPC/player state set. Walk-shoot reads one-handed/unshouldered, leans backward while moving forward, and has leg intersection in the walk cycle even though the normal walk clip looks fine. A 120 Hz source scan measured about 6 cm minimum foot separation and a roughly 15 cm right-foot reset near the source loop seam. `Walk_Fight_Forward` replaces it for the first moving-fire review because the loop reads better in browser after shoulder-forward weapon placement. `Run_and_Shoot` remains a faster moving-fire candidate. Keep the rejected actions as evidence that Meshy action names are not enough; every action still needs browser review and a gameplay-state mapping before batch use. Recoil should be authored as a short additive weapon/spine/shoulder/hand overlay driven by TIJ shot events, and close-range ragdoll should start from an authored death/hit pose before handing off to physics; far LOD deaths and recoil should be baked into animated impostor frames.

TIJ animation contract: NPC production clips should map to actual combat states, not generic animation-library names. Required third-person NPC coverage is idle/low-ready, patrol walk, traverse run, aim/fire standing, suppress fire standing, advance jog, retreat/backtrack, seek-cover sprint, left/right strafe, hit react, and crumple/fall/spin death variants. Board, seated/in-vehicle, dismount, prone, and mounted weapon clips are optional until those states need visible body animation. A future visible player character is a separate first-person lane: idle bob, ADS, recoil, reload, pump, weapon switch, crouch, jump, fall, and land must be reviewed from the camera, not inferred from NPC full-body clips. If Aronia or a successor body works for NPCs but fails from the player perspective, keep it NPC-only.

Meshy faction texture pass result: four Meshy retexture tasks completed for US Army, ARVN, NVA, and VC. The returned Meshy GLBs stripped skin data, so the only technically acceptable version was to rebind each generated base-color PNG onto the original skinned Aronia body under `tmp/source-glb-selection/derived/meshy-rebound-skinned/`. Human visual review still rejected the result as too muddy and not professional enough. Treat those files as failure evidence, not candidates.

Material-slot direction: the preferred Aronia review path is now semantic low-poly material segmentation plus explicit gear rather than AI-generated diffuse atlases. `tmp/source-glb-selection/build-aronia-material-factions.mjs` splits the original skinned mesh into hand-skin, face/neck, uniform, trousers, and boots, then adds small skinned headgear shells. It writes four faction GLBs under `tmp/source-glb-selection/derived/material-factions/`: US Army is 668 tris, ARVN is 668 tris, NVA is 668 tris, and VC is 648 tris. These preserve the source skinning, UVs, `JOINTS_0`, and `WEIGHTS_0`, use no texture, expose 6 material slots, and stay about 86-89 KB each. The correction pass keeps the whole head/neck skin-colored, uses one skin tone for hands and face, maps pelvis/lower spine to the same one-piece uniform color as the torso to avoid waist/groin wedge artifacts, and removes floating or accidental body markings.

Rollback and v2 iteration: the accepted v1 material-slot outputs were copied to `tmp/source-glb-selection/snapshots/material-factions-v1-liked-2026-04-25/` before further edits. The live review page now leads with four faction cards for direct comparison. US uses a dark one-piece OG-107 uniform and raised rounded M1-style helmet. ARVN uses a tan-khaki one-piece uniform and a larger raised boonie/helmet shell so more face remains visible. NVA uses a light mustard-khaki one-piece uniform and raised pith/field-cap silhouette. VC uses black pajamas plus a raised straw conical-hat silhouette. The review page also has a large `Inspect` modal with orbit controls and fullscreen so the full body, legs, and gear attachment can be checked before promotion, plus `tmp/source-glb-selection/animation-weapon-lab.html` for copied TIJ weapon scale and runtime pose review.

Attachment strategy: body markings must not be free-floating planes. Use existing body-triangle material buckets or projected/shrinkwrapped decal geometry for cloth markings, webbing, and insignia. Use bone-attached or single-joint-skinned geometry for rigid gear such as helmets, hats, packs, and weapons. Three.js supports node hierarchy attachment and skinned meshes, while glTF stores skinned geometry through `JOINTS_0` and `WEIGHTS_0`; Three's `DecalGeometry` is useful for projected details but can distort around corners, so it is a secondary patch tool rather than the default for torso webbing.

Texture-only limitation: do not expect diffuse paint to solve all faction identity. If the material-slot variants do not read clearly in the review page, improve the attachable/skinned gear kit before rigging: US/ARVN helmet or boonie option, NVA pith or field cap option, VC scarf/head-wrap or conical-hat alternate, webbing, pack, boots, and faction patch. FAL/Hunyuan3D, Meshy, and Kiln can help generate candidate gear or alternative bodies, but generated outputs must stay in `tmp/` until they pass license, triangle, UV, socket, and browser silhouette checks.

Rigging and animation direction: use the Meshy result as evidence, not as the whole answer. The fastest path may be Meshy motion plus local material/gear repair if the human accepts the clip quality. The more controllable path is still Blender plus Rigify or a game-export rig: create the real humanoid rig, rifle clips, sockets, and left-hand support constraints, then export GLB with skinning and actions for browser validation. Three.js runtime bone nudging is useful only as a review spike; it is not a production animation-authoring path. Blender is appropriate as an installed authoring tool if the human approves the workflow, but it must not become a required TIJ automated build dependency without explicit approval.

Cycle closeout and productization signal: the current all-faction pack is still scratch output under `tmp/`, not a promoted `war-assets/` or TIJ asset. The lesson is that the lab work needs one Pixel Forge contract before more iteration: a character-pack builder/validator that takes a rigged source, faction material/gear rules, clip mapping, weapon anchor metadata, and review-page output, then writes a manifest that can feed animated impostor baking. Meshy should become a provider or adapter behind that contract, not an open-ended scratch workflow. The smallest product integration slice is a core schema for `NpcCharacterPackManifest` plus validation for clips, joints, faction outputs, weapon anchors, and per-clip state mapping; only after that should the current pack be considered for promotion or TIJ import.

Animated impostor handoff: the core `NpcCharacterPackManifestSchema` and `validateNpcCharacterPack` are now the gate between the scratch character pack and the animated impostor baker. The first NVA `walk_fight_forward` proof writes to `tmp/animated-imposter-review/tij-character-pack-v1/nva/walk_fight_forward/`, includes the separate AK attachment in the baked frames, and stays review-only. Human review accepted this first proof visually. The 96 px close comparison is intentionally magnified debug output; judge production readability from the moving-camera probe before raising tile size. The review page must stay frame-locked to the bake and use 7x7 centered-front, single-tile sampling for ordinary ground reads. Do not use blended neighboring octa views in the packed-atlas fallback at this debug resolution because crossfading created duplicate silhouettes in human review. The next step is the all-useful-clip and all-faction debug bake review described in [tij-npc-asset-cycle.md](tij-npc-asset-cycle.md). Do not move it to `war-assets/` or TIJ until batch review, runtime performance, and storage gates pass.

### Weapons & gear

Root: `C:/Users/Mattm/X/soldier-research/downloads/polypizza-props/` - **59 GLBs**. Relevant subset for Vietnam era (retex or use as-is):

- `Bgvuu4CUMV__Assault_Rifle_-_Free_Model_By_Quaternius.glb` (stand-in for M16)
- `K2lXTYFSLC__Assault_Rifle_-_Free_Model_By_Quaternius.glb`
- `cCAgiMOQow__Rifle_-_Free_Model_By_Quaternius.glb`
- `ASOMZIErq3__Sniper_Rifle_-_Free_Model_By_Quaternius.glb`
- `Nq5dnqeh0k__Sniper_Rifle_-_Free_Model_By_Quaternius.glb`
- `ZmPTnh7njL__Shotgun_-_Free_Model_By_Quaternius.glb`
- `7ehatxr7FY__Submachine_Gun_-_Free_Model_By_Quaternius.glb`
- `52kQzphmeF__Pistol_-_Free_Model_By_Quaternius.glb` (for sidearm anim)
- `YWhHlmKOtx__Hand_Grenade_-_Free_Model_By_CreativeTrio.glb`
- `2g9Jm7kvIU__Backpack_-_Free_Model_By_Quaternius.glb`

### Vegetation

Root: `C:/Users/Mattm/X/vegetation-research/`

- `assets/tier-a-psx/polypizza/` - **33 tropical plant GLBs**, direct species matches (see ranking table below)
- `assets/tier-a-psx/kenney/nature-kit/` - **~409 Kenney nature GLBs** (silhouette is temperate - skip unless you verify a jungle fit; use mushrooms + rocks only)
- `assets/tier-a-psx/quaternius/` - CC0 Quaternius packs
- `assets/tier-c-hifi/polyhaven/` - 84 Poly Haven photogrammetry assets. **Bake-only source** - never ship as runtime geometry.
- `MANIFEST.json` - 747-entry manifest with tier, species, license, source.

### Sprite / 2D (for the sprite atlas packer)

Root: `C:/Users/Mattm/X/games-3d/terror-in-the-jungle/` (project root - **these three zips are the immediate input**):

- `60-free-plants.zip` - 60 PNG plant sprites (~50 MB, OpenGameArt, alpha cutouts, 1024-2048 px each). Drop-in Tier-A billboard content. Already-transparent.
- `foliage-pack.zip` - Kenney foliage pack, 62 tiny PNGs (<5 KB each) + leaves + SVG. **UI icon candidates, not field scatter.**
- `survival-kit.zip` - Kenney survival kit, **65 FBX models** (barrels, bedrolls, tents, tools, boxes, rocks, axes, 3 small trees). Needs FBX → GLB ingest.

Downstream target for scattered vegetation is TIJ's `GPUBillboardSystem` at `src/systems/world/billboard/GPUBillboardSystem.ts`, upgraded into the production imposter path. It still renders instanced quads for performance, but the approved source is GLB-derived `baseColor`/normal imposter packages, not legacy flat vegetation sprites.

### TIJ vegetation species registry (target matrix)

Source target derives from `C:/Users/Mattm/X/games-3d/terror-in-the-jungle/src/config/vegetationTypes.ts`, with one review correction applied before production import: the former `dipterocarp` candidate set is renamed to `giantPalm` because the approved-looking source variants are large palms, not buttress-root dipterocarp trees. The 13 production package targets are keyed by `id` and `textureName`, grouped into `groundCover` (fern, elephantEar, elephantGrass, ricePaddyPlants), `midLevel` (fanPalm, coconut, areca, bambooGrove, bananaPlant, mangrove), and `canopy` (giantPalm, banyan, rubberTree). The TIJ runtime config should make the same `dipterocarp` -> `giantPalm` rename during import instead of carrying the old botanical label forward. Each target needs exactly one billboard/imposter output keyed to its `textureName`. Produce files so they drop into `public/textures/vegetation/<textureName>.png` (or a KTX2 + meta when imposters land).

---

## Ranked shortlists

Ranking criteria, combined: silhouette fit → rig / anim fit → performance headroom → license (CC0 > CC-BY > other) → modifiability (UV layout quality, weight normalization, material simplicity).

### Soldiers - production source set

| Priority | GLB (filename stem) | Role in TIJ | Decision |
|---|---|---|---|
| 1 | `BMs52Y9rL5__Base_Character` | Preferred all-faction iteration base | Human selected this as the best base direction, and the updated source-body policy allows it to start neutral rather than soldier-looking. It is a legal CC-BY GLB, 608 tris, UV'd, skinned, and clean enough to repaint into US Army, ARVN, NVA, VC, civilian NPC, and player-character variants. It has no clips and one material, so the next proof is texture segmentation plus a usable rig/retarget path. Scratch US Army, ARVN, NVA, and VC faction-input GLBs now exist under `tmp/source-glb-selection/derived/`. |
| 2 | `BNq2fSOKXq__Guy` | Technical fallback customizable base | Keep as fallback if Aronia's one-material body or re-rig path blocks faction readability. It is a legal CC-BY GLB with six materials, UVs, and a Mixamo skeleton, which makes recolor and retarget easier, but it is not the current visual pick. |
| proof | `tmp/ravenfield-character-kiln/ravenfield-base-v7-skinned` | Scratch rig contract proof | Build from the V6 style target but with real skinning, rigid weights, standard humanoid bones, required sockets, and run/fall/death clips. This de-risks the animation/sockets contract before touching Aronia or the production octa bake. |
| proof | `tmp/weapon-rig-lab/attempts/attempt-02-shouldered-rifle` | Scratch weapon attachment proof | Rejected as production art, retained only as socket/scale/metadata evidence. 1,828 tris, seven sockets, 15 blockout clips, copied TIJ M16/AK runtime attachment metadata, verified weapon axes, centered weapon offsets, and preview IK. Next step is tool-backed humanoid rigging, not more primitive clip tuning. |
| fixture | `PpLF4rt4ah__Character_Soldier` | Animation/impostor review fixture | Useful for animated-octa technical tests because clips exist. Do not ship as the final soldier body unless the human re-approves it visually. |
| hold | `66kQ4dBBC7__Characters_Matt` | NVA alternate | Hold unless Aronia iteration fails. Leaner silhouette, civilian-coded source that needs khaki/olive repaint, pith helmet or compatible headgear, AK mount, and shoot-clip decision. |
| hold | `UcLErL2W37__Characters_Sam` | VC alternate | Hold unless Aronia iteration fails. Light build suited to black-pajama guerrilla repaint plus conical hat or soft cap attachment. Needs AK mount and shoot-clip decision. |
| hold | `5EGWBMpuXq__Adventurer` | US variant | Same 62-bone family and possible squad variety, but promote only if repaint reads as Vietnam-era soldier rather than fantasy/adventure placeholder. |
| hold | `Btfn3G5Xv4__SWAT` | US heavy / LRRP variant | Tactical silhouette can be useful, but body armor must be painted into a believable Vietnam-era role before use. |
| civilian hold | `75ikp7NEDx__Cube_Woman_Character` | Civilian | Villager/noncombatant pool, not a combat soldier default. |
| civilian hold | `DojKLcO34E__Beach_Character` | Civilian male | Villager/noncombatant pool, not a combat soldier default. |
| fixture | `DgOCW9ZCRJ__Character_Animated` | Animation library / bake validation only | Keep for clip/rig experimentation. Do not ship as final soldier art unless it is repainted and manually approved. |
| distant | Kenney mini-characters (x12) | LOD2 distant fill only | 700-900 tri, 7-bone rig - cheap but not animation-compatible with the Quaternius skeleton; handle as a separate distant-crowd impostor pool. |
| skip | Polygonal Mind novelty (Banana / Candle / Coffee / Wine / Bunny) | - | Zero Vietnam fit. |

### Weapons - rank 1 = mount first

| Rank | GLB (filename stem) | Stand-in for |
|---|---|---|
| 1 | `Bgvuu4CUMV__Assault_Rifle` | M16 (primary US) |
| 2 | `ASOMZIErq3__Sniper_Rifle` | M14 DMR / M40 |
| 3 | `7ehatxr7FY__Submachine_Gun` | MAT-49 / Grease Gun |
| 4 | `ZmPTnh7njL__Shotgun` | Remington 870 / trench gun |
| 5 | `52kQzphmeF__Pistol` | M1911 sidearm |
| 6 | `YWhHlmKOtx__Hand_Grenade` | M67 / frag |
| 7 | `2g9Jm7kvIU__Backpack` | ALICE / rucksack attachment |

All above mount to `Hand.R` via the Quaternius skeleton; pistol grip for aim anim, rifle two-hand pose for foregrip (left-hand IK deferred to TIJ - your gallery only needs right-hand mount working).

### Vegetation combos - rank 1 = bake first

Each combo targets one or more species in `vegetationTypes.ts`. Imposter bake angle count and atlas size are controlled by `atlasProfile`; the validator rejects profiles that exceed the mid-tier laptop budget.

| Rank | Combo | Source GLBs | TIJ species target | Bake spec |
|---|---|---|---|---|
| 1 | **Ground-cover clumps** | fern Poly Pizza set plus converted Tropical Env Pack / Nature Pack clump GLBs; no legacy sprite-only approval | `fern`, `elephantEar`, `elephantGrass`, `ricePaddyPlants` | `ground-compact`: 8 angles, 256² tiles, hemisphere shader |
| 2 | **Bamboo grove** | Poly Pizza bamboo set plus converted Tropical Env Pack bamboo GLBs | `bambooGrove` | `mid-balanced`: up to 16 angles, 512² tiles, normal-lit shader |
| 3 | **Coconut / areca palms** | Poly Pizza palms plus converted Tropical Env Pack coconut / palm-plant GLBs | `coconut`, `areca` | `mid-balanced`: up to 16 angles by default; 32 only when justified |
| 4 | **Banana / mangrove understory** | banana Poly Pizza + Tropical Env Pack; mangrove remains blocked until true root/canopy source passes review | `bananaPlant`, `mangrove` | `mid-balanced`, blocked species fail validation |
| 5 | **Canopy palms / broadleaf** | `palm-quaternius-*` large palm variants are tracked as `giantPalm`; Amazon-inspired broadleaf candidates remain review-only; rubber fig rejected; final rubber/banyan sources still require review | `giantPalm`, `banyan`, `rubberTree` | `canopy-balanced`: 32 angles, 512² tiles; 1024 hero profile only by exception |
| skip | Kenney PSX Nature Kit trees | Temperate silhouette, wrong era - use mushrooms and rocks only if anything |

`elephantGrass`, rice paddy, and other dense ground cover must be clump GLB imposters. Single-blade or sprite-only sources are not production-approved.

---

## Kiln extensions to build (priority order)

Each module lands under `packages/core/src/kiln/<module>/`. Write unit tests alongside in `__tests__/`. Wire into the CLI and MCP surfaces as you go - that's kiln's contract.

### P1 - `kiln/imposter/`  (blocks everything else)

Octahedral + hemi-octahedral baker. Public API sketch:

```ts
bakeImposter(glb: Buffer | string, opts: {
  angles: 8 | 16 | 32;                 // 8 = hemi-octa, 16 = full octa, 32 = hemi with doubled elevation
  atlasSize: 256 | 512 | 1024 | 2048;
  outputs: ('albedo' | 'normal' | 'depth')[];  // at least albedo+depth for billboard popping
  axis: 'y' | 'hemi-y';                // hemi-y clamps camera to upper hemisphere (foliage)
  format: 'png' | 'ktx2';              // ktx2 via basis-u encoder if wired
  bgColor: 'magenta' | 'transparent';
  colorLayer: 'baseColor' | 'beauty';  // baseColor is unlit and requires normal for production vegetation
  edgeBleedPx: number;                 // RGB bleed into transparent pixels before atlas packing
  pivot: 'bbox-bottom' | 'bbox-center';
}): Promise<{
  atlas: Buffer;                        // packed RGBA for albedo (or the first requested layer)
  aux: Record<string, Buffer>;          // normal / depth extra layers
  meta: ImposterMeta;                   // angles, tile grid, world-space scale, yOffset, source bbox
}>
```

Implementation notes:
- Reuse the existing headless Three.js renderer from `render.ts` - drive a grid of cameras over the loaded GLB, snap to an off-screen render target, pack into a single atlas.
- Put a strict-back-face-cull pass in front of it identical to `audit:glb` - any winding bug will be visible as black tiles and should fail fast.
- `ImposterMeta` lands next to the PNG as `<name>.imposter.json`. TIJ will parse it at load time; include the exact field names in the schema (`angles`, `tilesX`, `tilesY`, `worldSize`, `yOffset`, `hemi`).
- Production vegetation metadata also records `colorLayer`, `normalSpace`, `edgeBleedPx`, and `textureColorSpace`. Legacy sidecars without those fields default to the old lit `beauty` contract and must not be promoted into TIJ vegetation.
- Add a test that bakes a bamboo GLB and verifies the atlas is non-empty at all 8 tile positions.

### P2 - `kiln/lod/`

Wrap `meshoptimizer` (or `@gltf-transform/functions` `simplify` - check via context7 which has better quality at tri ratios ≥ 0.1). Output: one multi-LOD GLB per input, LOD levels [1.0, 0.5, 0.25, 0.1].

```ts
generateLODChain(glb: Buffer | string, opts?: {
  ratios?: number[];           // default [1.0, 0.5, 0.25, 0.1]
  errorThreshold?: number;     // default 0.01
  preserveUVs?: boolean;       // default true
  attachImposter?: Buffer;     // if provided, appended as "LOD3" with ImposterMeta extras
}): Promise<Buffer>;
```

LOD0 = original. LOD3 = the imposter card from P1. Ship as `EXT_mesh_gpu_instancing` + `KHR_draco_mesh_compression` where supported.

### P3 - `kiln/sprite-atlas/`

Batch-pack PNGs into power-of-two atlases with a JSON frame table.

```ts
packSpriteAtlas(pngs: { name: string; data: Buffer }[], opts: {
  maxSize: 2048 | 4096;
  padding: number;
  format: 'png' | 'ktx2';
  trimWhitespace: boolean;
  pot: boolean;               // force power-of-two
}): Promise<{ atlas: Buffer; frames: SpriteFrameTable; }>;
```

First use: ingest `60-free-plants.zip` into one or two atlases keyed by target species (`fern`, `elephantEar`, `banana`, `generic-foliage`).

### P4 - `kiln/fbx-ingest/`

FBXLoader → normalize (left-handed → right-handed if needed, scale to meters, merge identical materials) → GLB via `@gltf-transform/core`. First use: unzip `survival-kit.zip` and convert all 65 FBX models.

### P5 - `kiln/retex/`

Character-specific diffuse retex using region masks on the Quaternius UVs. Presets:

- `OG-107-jungle` (US olive drab)
- `ERDL-leaf` (US late-war camo)
- `tiger-stripe` (ARVN / LRRP)
- `khaki-plain` (NVA)
- `black-pajama` (VC)

Workflow: read GLB, find the body mesh, apply UV-region-aware color LUT to its diffuse, write back. LLM can author the region map once per base character and cache it.

### P6 - `kiln/photogrammetry/`

Cleanup pass for Poly Haven tier-C plants before imposter bake: decimate to ≤ 10k tri, UV repack via xatlas (already a dep), merge 2K PBR to a single 1K diffuse. Only needed if tier-C quality beats the Poly Pizza shortlist in the gallery - gate on the human's validation call.

### Primitives to add

- `foliageCardGeo({ width, height, yPivot })` - double-sided quad with proper Y pivot
- `crossedQuadsGeo({ width, height, planes: 2 | 3 })` - cross-billboard for near-field plants
- `octaGridPlane({ tilesX, tilesY })` - atlas-ready quad with per-instance tile UVs

---

## Validation gallery (build this last, after the pipeline runs)

A self-contained page the human will click through to confirm the pipeline is correct before approving asset migration into TIJ. Two acceptable shapes:

1. **Preferred:** new route in `packages/client/` under `src/routes/gallery-tij/`. Loads assets from `packages/server/output/tij/` via the existing server. Use React Three Fiber or vanilla Three.js 0.184.
2. **Fallback:** static HTML + vanilla JS dropped in `packages/server/output/tij-gallery/index.html`. Simpler, no React Flow entanglement, acceptable if the client route is too much plumbing.

### Sections the gallery must have

1. **Soldier cards** - one per ranked character (top 8). Each card shows:
   - Live rotating 3D preview of the LOD0 mesh
   - Animation dropdown listing all clips; current clip auto-plays in a loop
   - Weapon dropdown listing the 5 ranked weapons; selected weapon is mounted to `Hand.R` and follows the anim
   - Side-by-side octahedral imposter card preview, camera-aligned, rotating synchronously
   - Tri count, bone count, anim count, file size, bbox (meters), retex preset applied
2. **Vegetation combos** - one per ranked combo (top 7). Each card shows:
   - All variant GLBs in the combo in a row (live 3D)
   - The baked imposter atlas rendered as a plane with tile cycling so the human can see wraparound behavior
   - A "billboard plausibility test" - camera orbits the card at constant radius and the imposter aligns to camera; any popping / seam is visible
   - Tri count per variant, angles baked, atlas size, KTX2 / PNG flag
3. **Sprite atlases** - the combined 60-plant atlas rendered with frame gridlines + labels, showing which species each tile is mapped to in the frame table
4. **FBX ingest survey** - all 65 survival-kit meshes in a grid, flagging any that failed conversion

Keyboard / URL controls:
- `?asset=<stem>` deep-links to a specific card
- Arrow keys step through cards
- `g` toggles strict back-face-cull mode (same shader as `audit:glb`) so the human can see winding errors
- Screenshot export button dumps the current card to `output/tij/screenshots/`

### Acceptance criteria the human will check

- [ ] All 8 ranked soldiers load, play at least 3 anims (idle, walk, shoot), and mount the M16 stand-in to the right hand without detachment during locomotion
- [ ] Scratch V7 proof loads as a real skinned GLB, exposes `JOINTS_0` and `WEIGHTS_0`, includes the five required sockets, and plays `Run`, `FallLoop`, `DeathFront`, and `DeathBack` in the browser review
- [ ] Each of the 5 faction retex presets is visible as a swatch on the Quaternius Soldier card (even if only one is wired live - others can be stills)
- [ ] All 7 ranked vegetation combos bake without any black tiles in their imposter atlas
- [ ] Production vegetation imposters use `baseColor` plus a `normal` aux atlas; current albedo-only lit bakes remain gallery review artifacts only
- [ ] All 13 TIJ vegetation species are represented as `representation: "imposter"` packages; legacy flat sprites are fallback/debug only
- [ ] Ground-cover imposters use compact clump profiles and do not exceed the texture/angle budgets for mid-tier laptop performance
- [ ] Transparent atlas padding has non-black bled RGB so runtime filtering/mips do not create dark foliage fringes
- [ ] The gallery's imposter preview has Raw Atlas, Runtime Lit, and Overbright Debug modes and visibly responds to noon, dusk, and dim-jungle lighting presets
- [ ] The camera-orbit test on each imposter card shows ≤ 1 pixel of popping between adjacent angles at the configured atlas size
- [ ] The sprite atlas renders with every one of the 60 plants visible and correctly framed in the JSON table
- [ ] FBX ingest succeeds for ≥ 60 / 65 survival-kit models (flag the failures)
- [ ] All pipeline output lands under `packages/server/output/tij/` with the directory layout described below
- [ ] `bun run audit:glb` runs clean against every new GLB (no winding errors)
- [ ] Per-card tri count, anim count, atlas size, file size are all displayed - no placeholder zeros

### Output directory layout (contract with TIJ)

```
packages/server/output/tij/
  soldiers/
    <stem>/
      lod0.glb               # original with rig + anims preserved
      lod1.glb               # decimated (no fingers)
      lod2.glb               # shared-skeleton bake target
      imposter.png           # 16-angle atlas
      imposter.json          # ImposterMeta
      retex/
        og107.png
        erdl.png
        tiger-stripe.png
        khaki.png
        black-pajama.png
  weapons/
    <stem>/
      weapon.glb             # normalized, grip marker at origin
      thumb.png
  vegetation/
    <species>/
      <variant>/
        model.glb            # copied source mesh
        lod0.glb             # original or normalized source
        lod1.glb             # decimated 0.5 ratio
        lod2.glb             # decimated 0.25 ratio
        lod3.glb             # decimated 0.1 ratio
        imposter.png         # baseColor atlas for production vegetation
        imposter.normal.png  # required production normal atlas
        imposter.depth.png   # optional parallax/intersection polish
        imposter.json        # ImposterMeta
    atlases/
      ground-cover.png
      ground-cover.json      # SpriteFrameTable
  props/
    <stem>.glb               # ex-FBX from survival-kit
  gallery-manifest.json      # flat index of everything above for the viewer
```

`gallery-manifest.json` is the single file the gallery reads at startup. Keep it flat and machine-readable.

---

## Non-goals (do NOT do this)

- Do not touch `C:/Users/Mattm/X/games-3d/terror-in-the-jungle/` at all. Zero writes.
- Do not bulk-download new assets - the 500+ on disk are enough for this pass.
- Do not attempt Mixamo retargeting in this pass. Quaternius 62-bone skeleton is anim-complete for the shortlist.
- Do not ship the Poly Haven tier-C geometry as runtime meshes. Imposter-bake only.
- Do not add new AI-generation pipelines to kiln in this pass - only the bake / ingest / retex mechanics listed above. Generation stays on the existing Claude → primitives path.
- Do not refactor unrelated kiln code. Every change lands next to its feature directory.

---

## Handoff back to human

When the gallery is live and the acceptance criteria pass, report back with:

1. Gallery URL + screenshot of two soldier cards + two vegetation combo cards
2. Summary: primitives added, modules added, tests added, lines of code, any failed assets flagged
3. `gallery-manifest.json` tree printed
4. Any rank-list updates you'd recommend after seeing the imposters render (e.g. "rank-6 fan palm set has a bad leaf silhouette at 8 angles, suggest bumping to 16")
5. Open questions / judgment calls the pipeline hit

Then the human takes over: validate, approve, and start moving assets into TIJ's `public/assets/` with species-to-textureName mapping from `vegetationTypes.ts`.

---

## Reference files (open these, don't guess)

- TIJ vegetation config: `C:/Users/Mattm/X/games-3d/terror-in-the-jungle/src/config/vegetationTypes.ts`
- TIJ billboard system: `C:/Users/Mattm/X/games-3d/terror-in-the-jungle/src/systems/world/billboard/GPUBillboardSystem.ts`
- TIJ NPC sprite factory: `C:/Users/Mattm/X/games-3d/terror-in-the-jungle/src/systems/combat/CombatantMeshFactory.ts`
- TIJ asset loader: `C:/Users/Mattm/X/games-3d/terror-in-the-jungle/src/systems/assets/AssetLoader.ts`
- Soldier manifest: `C:/Users/Mattm/X/soldier-research/CHARACTERS_MANIFEST.json`
- Soldier report: `C:/Users/Mattm/X/soldier-research/SOLDIER_REPORT.md`
- Vegetation manifest: `C:/Users/Mattm/X/vegetation-research/MANIFEST.json`
- Vegetation report: `C:/Users/Mattm/X/vegetation-research/REPORT.md`
- Kiln substrate entry: `packages/core/src/kiln/index.ts`
- Primitives (existing 48): `packages/core/src/kiln/primitives.ts`
- Render substrate to reuse for imposter baker: `packages/core/src/kiln/render.ts`
- Existing audit pipeline to model your imposter QC on: `scripts/visual-audit.ts` (and `bun run audit:glb` entry)
