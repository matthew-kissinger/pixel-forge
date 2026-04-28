# Animated Imposter Dev Cycle Plan

Status: W2/W3 local NVA proof visually accepted - batch and runtime gates next.
Started: 2026-04-24.
Mode: gated spike, then scale.
Design: [animated-imposter-design.md](animated-imposter-design.md).
Worklog: [animated-imposter-worklog.md](animated-imposter-worklog.md).
Brief: [animated-imposter-brief.md](animated-imposter-brief.md).
NPC asset cycle and package contract: [tij-npc-asset-cycle.md](tij-npc-asset-cycle.md).

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
- Bake target: start with `6x6`, `7x7`, or `8x8` views, `96` px tiles, and `8-16` frames for one clip.
- Encoding target: R8 palette-index albedo for production, RGBA8 only for debug.
- No Blender in the build pipeline.
- No WebGPU compute or TSL dependency in the TIJ-facing plan.
- No generated `war-assets/` mutation in this cycle without explicit approval.

## 2. Out Of Scope

- Full 8-character, 4-clip production bake before the one-character gates pass.
- Depth or normal layers for animated soldiers before albedo-only validation proves the basic artifact.
- Animation retargeting for missing NVA/VC shoot clips.
- A new runtime dependency around 5 MB.
- Porting Horde's WebGPU compute path.
- Treating the tracker doc as a source-of-truth task runner.

## 3. Asset Selection Alignment

The first Link-looking `Character_Animated` review source and the later `PpLF4rt4ah__Character_Soldier_-_Free_Model_By_Quaternius` review source were technical fixtures for bake/runtime validation only. They are not the final TIJ soldier look and must not become production defaults. The current human-approved visual direction is `BMs52Y9rL5__Base_Character_-_Free_Model_By_AroniaStudios.glb` ("Aronia Base"): very low tri, neutral, rigged, and visually easier to repaint into TIJ factions. Before the next octa bake, the cycle needs an Aronia-derived review pass for US Army, ARVN, NVA, VC, and civilian NPC variants.

Aronia is a better visual base, but it is not an easier technical base. It has 608 tris, 1 material, 29 bones, and 0 clips. Local inspection confirms the mesh already has `TEXCOORD_0` UVs, but the texture-only attempt failed visually. The next implementation slice is semantic material-slot segmentation plus explicit low-poly gear attachments on the original skinned mesh, not body-color swaps, arbitrary boxes, or another full-body retexture prompt. `BNq2fSOKXq__Guy_-_Free_Model_By_Rafael.glb` stays the fallback because it has six material slots, UVs, a Mixamo skeleton, and no tactical gear.

Current Aronia art status: the accepted material-slot direction now uses clean one-piece uniform zones rather than contrasting shirt/pants wedges. The Aronia waist and pelvis topology is too coarse for a clean trouser seam without a real UV mask, so US Army, ARVN, NVA, and VC now read primarily through uniform color plus raised headgear silhouettes. Current scratch outputs stay in `tmp/source-glb-selection/derived/material-factions/`: US Army 668 tris, ARVN 668 tris, NVA 668 tris, VC 648 tris, 6 material slots, preserved skinning, and 0 clips. The review page links to `tmp/source-glb-selection/animation-weapon-lab.html` for weapon-scale and pose review.

Updated source policy: prefer a chosen low-poly source GLB with known license, UVs, bounds, material slots, and humanoid readability, then use AI/tools around that source. The source does not need to look like a soldier yet. The hard requirement is the right neutral humanoid mesh, triangle count, UV/material story, and rig path; soldier identity should come from texture, palette, gear attachments, and solved rifle clips. Hunyuan3D, MMGP, Meshy, and image-generation retexture passes are candidates for source discovery, paint, remesh, or rigging assistance. They are not trusted as final soldier-body generators until the output passes the same inventory audit: triangle count, UV quality, texture slots, bone/clip coverage, weapon socket fit, browser silhouette, and human visual approval.

The local Ravenfield-style scratch prototype is useful for direction only. `tmp/ravenfield-character-kiln/ravenfield-base-v6.glb` proves the target silhouette is cheap, weaponless, faction-readable, and socketed, but it is still a Kiln pivot-animation model. Do not expand that path into production clip work. The next proof is `ravenfield-base-v7-skinned.glb`: the same low-poly, weaponless style contract rebuilt as a real skinned humanoid GLB with rigid per-part weights, standard bone names, and sockets parented to bones.

Skinned V7 proof contract:

- Must contain at least one `SkinnedMesh`, one skin, `JOINTS_0`, and `WEIGHTS_0`.
- Must include sockets named `Socket_RightHand`, `Socket_LeftHand`, `Socket_Back`, `Socket_Chest`, and `Socket_Headgear`.
- Must not embed a rifle or weapon mesh. Weapons are separate GLBs mounted to `Socket_RightHand`.
- Must include clips named `Idle`, `Walk`, `Run`, `FallLoop`, `DeathFront`, and `DeathBack`.
- Browser review must visibly play at least run and one death/fall clip before any octa bake uses the body.
- Production Aronia work resumes after this proof demonstrates the animation/sockets contract; V7 is a scratch implementation proof, not the final soldier source.

Current V7 status: `tmp/ravenfield-character-kiln/ravenfield-base-v7-skinned.glb` exists as a scratch proof. Local inspection found 1,556 triangles, 36 skinned primitives, `JOINTS_0` and `WEIGHTS_0` on every primitive, eight material zones, the five required sockets, and all six required clips. The review page at `tmp/ravenfield-character-review/index.html` has separate V7 cards for every current clip: `Idle`, `Walk`, `Run`, `DeathFront`, `DeathBack`, and `FallLoop`. A first low-poly uniform pass is included: body uniforms use team color, trousers are darker, pockets/cuffs are lighter, boots/webbing/straps stay dark, and skin is limited to head, neck, and hands. Walk/run arm swing has been toned down after browser review showed the previous phase reading backward.

Weapon attachment direction: close NPCs and any visible third-person player body should use a real skinned soldier plus a separate TIJ weapon GLB attached to a hand socket. Far animated impostors should bake the weapon into the frame atlas rather than drawing thousands of extra weapon meshes. The scratch weapon-rig lab at `tmp/weapon-rig-lab/index.html` copies the current TIJ weapon GLBs into `tmp/weapon-rig-lab/weapons/`, generates five archived skinned attempts, and attaches blue M16A1 / red AK-47 defaults at runtime from grip/support/muzzle metadata. Every current attempt is 1,828 triangles, has seven sockets, and has 15 blockout clips: `IdleRifle`, `WalkRifle`, `RunRifle`, `AimRifle`, `FireRifle`, `ReloadRifle`, `CrouchRifle`, `HitReactFront`, `FallLoop`, `DeathFront`, `DeathBack`, `IdlePistol`, `FirePistol`, `ProneRifle`, and `MountedRifle`.

TIJ state-derived clip contract: do not batch Meshy actions just because the action exists. Current TIJ NPCs expose `idle`, `patrolling`, `alert`, `engaging`, `suppressing`, `advancing`, `retreating`, `seeking_cover`, `defending`, `dead`, `boarding`, `in_vehicle`, and `dismounting`. Movement code reduces those to patrol/follow walk, traverse or cover run, approach, backtrack, strafe, hold/suppress, defend move, and death. Production NPC clips therefore need `IdleRifle/LowReady`, `PatrolWalkRifle`, `TraverseRunRifle`, `AimFireStanding`, `SuppressFireStanding`, `AdvanceJogRifle`, `RetreatBacktrackRifle`, `SeekCoverSprint`, `StrafeLeft`, `StrafeRight`, hit reacts, and death variants. `Gun_Hold_Left_Turn` is not mapped to a current TIJ state and should stay rejected unless a later cinematic or patrol-turn feature explicitly needs it.

Player-character lane: a visible player body is now a real possibility, but it is a separate first-person rig target. The current TIJ player weapon path already has weapon-only idle bob/sway, ADS, recoil, reload, pump, and weapon-switch state, while player movement adds crouch, jump, fall, land, and terrain slide. If the same source body is used for the player, close first-person review should use dedicated arms/body clips and camera-safe deformation. Do not use the NPC full-body Meshy clips as the first-person animation contract. If the body fails as a player character but works as NPC art, keep it NPC-only.

Current weapon-rig validation status: rejected for production art. The first pass failed human review because rifle aiming read backwards, arms disconnected, weapons could appear upside down, AK idle was not held like a rifle, and the stacked torso primitives read like a cubic tin suit. The correction pass verifies the current TIJ weapon axes, targets actual M16/AK handguard mesh names, centers and scales the weapon offsets, replaces stacked torso pieces with one tapered low-poly torso hull, separates the rounded head from the helmet, and adds a preview-only left-hand support IK correction. A deterministic Playwright state probe of Attempt 02 `WalkRifle` reported no page errors and support gaps of 6.6 cm for blue M16A1 and 7.3 cm for red AK-47, but fresh screenshot review (`attempt-02-idle-rejected.png`, `attempt-02-aim-rejected.png`) shows the real failure: the rifle is carried too vertically, the left hand is overconstrained near the centerline, the right hand lacks natural stock/shoulder contact, the aim pose points up rather than shouldering the weapon, and the procedural torso/front details look wrong. The support-gap metric can pass while the pose still fails, so Attempt 02 is only a socket/scale/metadata proof.

Rigging decision for the next cycle: stop expanding hand-keyed Kiln weapon clips. Production soldiers need a normal humanoid rig and classic rigged animation workflow: standard bone names, retargeted idle/walk/run/aim/fire/reload/death clips, right-hand weapon socket, and a left-hand IK or baked support constraint targeting the specific weapon fore-end. Three.js can consume the resulting GLB clips and sockets; the left-hand solver can live in a review/bake step and the final far LOD can bake the solved character plus weapon into animated octahedral frames. The scratch lab remains useful only as a contract viewer for sockets, scale, weapon axes, and support-target metadata.

Open-source rigging direction: prefer Blender plus Rigify or a game-export rig as the real authoring route before spending more Meshy or closed API cycles. Blender's glTF exporter carries skinning and animation actions into `.glb`; Rigify is an open rig-generation system; Three.js `SkeletonUtils.retargetClip` can be used for browser retarget tests; glTF-Transform and meshoptimizer remain the inspection, cleanup, and packing tools. Blender is acceptable as a human-operated authoring/export tool, but it is still not approved as a required TIJ automated build dependency.

Meshy rigging result: the human approved one paid API spike, so `tmp/source-glb-selection/submit-meshy-rigging.mjs --variant=usArmy --height=1.7 --submit` sent the textured US Army Aronia input to Meshy. Task `019dc69b-7299-7dec-9eb6-698f6de912dc` succeeded, consumed 5 credits, and wrote `tmp/source-glb-selection/derived/meshy-rigging-usArmy-019dc69b-7299-7dec-9eb6-698f6de912dc/`. Meshy returned a rigged GLB/FBX plus basic walking and running GLBs. Each GLB stayed small, preserved one texture and one 24-joint skin, and inspected at 598 triangles. The basic clips are not enough for TIJ, but they prove the Aronia body can pass Meshy's pose-estimation and rigging path.

Meshy animation result: `tmp/source-glb-selection/submit-meshy-animation.mjs --preset=combatSample --submit` requested four animation-library actions from the successful rig: action 95 `Gun_Hold_Left_Turn`, action 98 `Run_and_Shoot`, action 183 `Shot_and_Fall_Backward`, and action 234 `Walk_Forward_While_Shooting`. All four succeeded, consumed 3 credits each, and downloaded GLB/FBX outputs under the same rigging folder. The browser review surface `tmp/source-glb-selection/meshy-rigging-review.html` loads the rigged, walking, running, and four combat outputs, attaches copied TIJ weapons from animated hand bones, and exposes the current pass/fail question. This is no longer an API feasibility question. It is a visual-quality and weapon-socket question.

Tool-backed pivot options:

| Option | What it gives us | Fit | Risk |
|---|---|---|---|
| Meshy Auto-Rigging and Animation API | Programmatic rigging for textured humanoid GLB inputs and basic animation output. Source: [Meshy rigging API](https://docs.meshy.ai/en/api/rigging-and-animation) | Best automation spike if Aronia can be textured first. | It explicitly depends on clear, textured humanoid structure, so our primitive blockouts are poor inputs. |
| Meshy Remesh / Retexture | Targeted remesh, topology choice, target polycount, resize, and texture iteration on existing or generated models. Source: [Meshy remesh API](https://docs.meshy.ai/en/api/remesh) | Useful if a promising source has too many faces or bad generated topology. | Remesh can miss exact targets and may damage UVs, silhouette, or skinning; never promote without visual and GLB inspection. |
| Hunyuan3D via FAL, HY 3D, or local MMGP wrapper | Image-to-3D or text/image source exploration, shape generation, and texture/PBR experiments. Sources: [Tencent Hunyuan 3D launch](https://www.tencent.com/en-us/articles/2202235.html), [Hunyuan3D 2.1](https://github.com/Tencent-Hunyuan/Hunyuan3D-2.1), [Hunyuan3D-2GP](https://github.com/deepbeepmeep/Hunyuan3D-2GP), [MMGP](https://github.com/deepbeepmeep/mmgp) | Good for finding or generating candidate bodies, helmets, packs, and texture references without relying on Meshy-only output. Repo provider catalog already lists `fal-ai/hunyuan3d-v3/image-to-3d` as an optional image-to-3D seed. | Does not solve rigging or weapon animation by itself. Generated topology, UVs, polycount, and baked lighting must be audited before any rigging or octa bake. |
| Mixamo manual rig and animation library | Fast human-in-the-loop auto-rigging and common humanoid clips. Source: [Mixamo docs](https://helpx.adobe.com/creative-cloud/help/mixamo-rigging-animation.html) | Good for Rafael or converted FBX sources with clean A/T pose. | Manual, FBX/OBJ/ZIP upload path, not GLB-native automation. |
| AccuRIG / ActorCore | Guided rigging with FBX/USD export and access to motion libraries. Source: [AccuRIG export docs](https://manual.reallusion.com/AccuRig-2/2.0/09-add-motions/export.htm) | Strong manual route for clean source bodies and low-poly humanoids. | Desktop/manual tool; not a build dependency. |
| DeepMotion | Retargeted motion download for custom rigged FBX/GLB humanoids. Source: [DeepMotion custom characters](https://www.deepmotion.com/article/custom-characters) | Useful for mocap-style locomotion or generated action clips after a rig exists. | Requires a rigged humanoid with clean orientation and hierarchy. |
| Cascadeur | Retargeting and action-pose cleanup. Source: [Cascadeur retargeting](https://cascadeur.com/help/category/219) | Best cleanup tool for death/fall/action polish. | Human authoring tool, not automated first pass. |
| Existing Mixamo-compatible source | Use Rafael or Quaternius skeleton family and retarget rifle clips locally. | Fastest route to a believable animation bank if visual style is acceptable. | May force us away from Aronia unless we successfully transfer style/texture. |

Current recommendation: approve `BMs52Y9rL5__Base_Character_-_Free_Model_By_AroniaStudios.glb` as the first body spike, not as production art. It is a legal CC-BY GLB, 608 tris, UV'd, skinned, and visually neutral enough to become US Army, ARVN, NVA, VC, civilians, or player character through texture and gear passes. `BNq2fSOKXq__Guy_-_Free_Model_By_Rafael.glb` is the technical fallback because it has a CC-BY Mixamo skeleton and six material islands. Run the source-GLB bakeoff page under `tmp/source-glb-selection/`, where cards expose license, UV, skinning, and clip status, then prove texture segmentation, retarget/re-rig, and weapon sockets before any octa bake. Meshy is the automation spike for remesh/rig only after we have a textured, clear humanoid source; Mixamo/AccuRIG remains the manual fallback. Promote whichever path produces the first believable shouldered-rifle `idle`, `walk`, `aim`, `fire`, and `reload` clip set in the browser review.

Meshy gate status: the first rigging gate is complete and the first all-faction review pack exists. Official docs still say rigging works best on textured standard humanoids, reject untextured or unclear bodies, and require +Z-facing input when submitting by `model_url`. That is why the original paid rig submission used `tmp/source-glb-selection/derived/aronia-usArmy-faction-input.glb` with `tmp/source-glb-selection/derived/aronia-usArmy-faction-base.png`, not the untextured material-slot GLB. After review and local repair, the useful output is no longer raw Meshy files; it is `tmp/source-glb-selection/derived/tij-character-pack-v1/`, built from the successful Meshy rig and local faction material/gear rules.

Meshy visual repair status: `tmp/source-glb-selection/build-tij-character-pack-v1.mjs` now writes US Army, ARVN, NVA, and VC versions of the accepted Aronia/Meshy rig into `tmp/source-glb-selection/derived/tij-character-pack-v1/`. It preserves the 24-joint skin, replaces muddy returned textures with semantic material regions, adds skinned headgear per faction, and keeps the weapon separate for runtime/review attachment. The browser review surface `tmp/source-glb-selection/meshy-rigging-review.html` now has faction, clip, weapon, playback, and socket-mode controls. The NVA pith cap is intentionally larger after browser review.

Weapon-model decision: a better gun model is only useful if it has clear or annotatable `grip`, `support`, `stock`, and `muzzle` anchors. The current copied TIJ M16 is detailed enough for review and already exposes named receiver, grip, handguard, barrel, and stock parts, so the right next step is anchor metadata plus right-hand socket and left-hand support constraint. Replacing the model without solving anchors would repeat the same floating/offset gun problem.

Clip-quality note: `Gun_Hold_Left_Turn` and `Walk_Forward_While_Shooting` are rejected for production. The gun-hold turn is not mapped to a current TIJ NPC or player state. Human review of walk-shoot found the body/weapon read wrong: the body clip still feels one-handed and unshouldered, leans backward during forward motion, and crosses the legs through each other. A direct 120 Hz source scan found about 6 cm minimum foot separation and a roughly 15 cm right-foot reset near the source loop seam, while the normal walking clip does not show the same failure. The later Meshy action `Walk_Fight_Forward` is now the default moving-fire review clip because it reads better in browser with shoulder-forward weapon placement. `Run_and_Shoot` remains a faster moving-fire candidate. Recoil is planned as an additive close-LOD overlay and baked far-LOD atlas sequence. Close ragdoll is possible after an authored death start pose, but distant death stays authored/baked.

All-faction character pack v1: `tmp/source-glb-selection/derived/tij-character-pack-v1/manifest.json` lists 32 GLBs: four factions by eight clips. Validation loaded every output with glTF-Transform, found no failures, and reported 24 joints on every animated body. Max triangle counts are US Army 659, ARVN 706, NVA 683, and VC 614. This pack is a review artifact only. It is not copied to `war-assets/`, not imported into TIJ, and not yet a stable Pixel Forge API.

Productization signal from the lab: the next Pixel Forge work should not be more one-off `tmp/` scripts. Promote the learned contract into core first: `NpcCharacterPackManifest`, faction material/gear rules, clip-to-TIJ-state mapping, per-weapon grip/support/stock/muzzle anchors, and validator output for joints, clips, triangle counts, and file sizes. Meshy should become a rigging or animation provider behind that contract. The animated octa bake should consume the approved character-pack manifest rather than pointing directly at ad hoc GLBs.

Implementation update: the first Pixel Forge productization slice now exists in core as `NpcCharacterPackManifestSchema` and `validateNpcCharacterPack`. The current all-faction pack validates cleanly with no blockers or warnings, including file existence, GLB loadability, 24-joint skins, animation counts, and per-faction metrics. `scripts/run-animated-imposter-review.ts` now defaults to the NVA `walk_fight_forward` GLB from the pack and writes a nested review artifact under `tmp/animated-imposter-review/tij-character-pack-v1/nva/walk_fight_forward/`.

First animated impostor proof result: the NVA moving-fire debug bake uses `shoot` with raw fallback `Armature|Walk_Fight_Forward|baselayer`, `7x7` views, `96px` tiles, `8` frames, AK attachment baked into the frames, and packed RGBA8 output. It produced a valid sidecar, deterministic repeat hash, nonblank alpha, source-vs-impostor review page, frame strip, and raw storage estimate of 14,450,688 bytes inside the 30 MB envelope. The warning is intentional because this is a reviewed moving-fire fallback, not a dedicated shoot clip.

Meshy output inventory:

| Output | Path | Result |
|---|---|---|
| Rigged US Army | `tmp/source-glb-selection/derived/meshy-rigging-usArmy-019dc69b-7299-7dec-9eb6-698f6de912dc/rigged_character_glb.glb` | 91,496 bytes, 598 tris, 1 texture, 24-joint skin, short rest clip. |
| Walk | `tmp/source-glb-selection/derived/meshy-rigging-usArmy-019dc69b-7299-7dec-9eb6-698f6de912dc/walking_glb.glb` | 104,264 bytes, 598 tris, 1.067 sec clip. |
| Run | `tmp/source-glb-selection/derived/meshy-rigging-usArmy-019dc69b-7299-7dec-9eb6-698f6de912dc/running_glb.glb` | 99,656 bytes, 598 tris, 0.667 sec clip. |
| Gun hold turn | `tmp/source-glb-selection/derived/meshy-rigging-usArmy-019dc69b-7299-7dec-9eb6-698f6de912dc/animations/095-gun-hold-left-turn/animation_glb.glb` | Rejected for TIJ production mapping: no current gameplay state needs this generic turn-around hold. Keep only as socket sanity evidence. |
| Run and shoot | `tmp/source-glb-selection/derived/meshy-rigging-usArmy-019dc69b-7299-7dec-9eb6-698f6de912dc/animations/098-run-and-shoot/animation_glb.glb` | 99,764 bytes, 598 tris, 0.7 sec clip. Current best moving-fire donor after review; keep full source loop because viewer trim introduced a snap. |
| Shot fall backward | `tmp/source-glb-selection/derived/meshy-rigging-usArmy-019dc69b-7299-7dec-9eb6-698f6de912dc/animations/183-shot-and-fall-backward/animation_glb.glb` | 135,720 bytes, 598 tris, 3.533 sec clip. |
| Walk forward shooting | `tmp/source-glb-selection/derived/meshy-rigging-usArmy-019dc69b-7299-7dec-9eb6-698f6de912dc/animations/234-walk-forward-while-shooting/animation_glb.glb` | Rejected for production after review: backward torso lean, one-hand rifle read, leg intersection during stride, and measurable loop reset. Keep only as failure evidence. |

Faction texture result: the first four Meshy faction texture candidates exist as Meshy-generated base-color PNGs rebound onto the original skinned Aronia mesh, but human review rejected this as the wrong visual direction. Keep these as evidence for why texture-only prompting is not enough:

| Variant | Review GLB | Status |
|---|---|---|
| US Army | `tmp/source-glb-selection/derived/meshy-rebound-skinned/aronia-usArmy-meshy-textured-skinned.glb` | Rejected visually. Preserves 608 tris, UVs, and skinning only because the PNG was rebound to the original mesh. |
| ARVN | `tmp/source-glb-selection/derived/meshy-rebound-skinned/aronia-arvn-meshy-textured-skinned.glb` | Rejected visually. Too muddy for the low-poly faction direction. |
| NVA | `tmp/source-glb-selection/derived/meshy-rebound-skinned/aronia-nva-meshy-textured-skinned.glb` | Rejected visually. Does not beat material slots plus silhouette gear. |
| VC | `tmp/source-glb-selection/derived/meshy-rebound-skinned/aronia-vc-meshy-textured-skinned.glb` | Rejected visually. Texture alone cannot create the VC silhouette. |

Important technical note: Meshy's returned retexture GLBs stripped skin data, so do not use those returned GLBs directly. Treat Meshy as a texture generator for this path; rebind the returned base-color PNGs onto the original skinned Aronia source before rigging or baking.

Material-slot pivot: the better first slice is old-school low-poly segmentation plus explicit gear, not AI-smudged texture atlases. `tmp/source-glb-selection/build-aronia-material-factions.mjs` now splits the original Aronia mesh into semantic body regions and adds small skinned headgear primitives. It preserves the original skinning and writes four review GLBs:

| Variant | Review GLB | Current status |
|---|---|---|
| US Army | `tmp/source-glb-selection/derived/material-factions/aronia-usArmy-material-slots.glb` | Preferred review path. 668 tris, dark one-piece OG-107 uniform, raised rounded M1-style helmet. |
| ARVN | `tmp/source-glb-selection/derived/material-factions/aronia-arvn-material-slots.glb` | Preferred review path. 668 tris, tan-khaki one-piece uniform, larger raised boonie/helmet shell. |
| NVA | `tmp/source-glb-selection/derived/material-factions/aronia-nva-material-slots.glb` | Preferred review path. 668 tris, light mustard-khaki one-piece uniform, raised pith/field-cap proof. |
| VC | `tmp/source-glb-selection/derived/material-factions/aronia-vc-material-slots.glb` | Preferred review path. 648 tris, black pajamas, raised straw conical-hat proof. |

Mapping correction note: the first material split used the wrong axis assumption and colored too much of the top face as headgear. It also mapped pelvis/lower-spine triangles to `webbing` or contrasting trousers, which made the groin, butt, and waist read as stray gear or dark-green wedge color, and used different skin tones for hands and face. The corrected split keeps the whole head/neck skin-colored, uses the same skin tone for hands and face, maps torso and pelvis to one clean uniform color per faction, limits the trouser bucket to real leg triangles, and relies on raised headgear silhouettes until a real UV mask or better source mesh supports clean clothing seams. Current body counts are 32 hand-skin, 106 face/neck, 291 uniform, 107 trousers, and 72 boots.

Rollback and current iteration: the accepted v1 material-slot outputs were copied to `tmp/source-glb-selection/snapshots/material-factions-v1-liked-2026-04-25/`, including the four GLBs, manifest, and generator script. The live review page is now a clean-zone distinction pass: the four faction cards are first-row together; US uses a dark one-piece OG-107 uniform and raised rounded M1-style helmet, ARVN uses a tan-khaki one-piece uniform and larger raised boonie/helmet silhouette, NVA uses a light mustard-khaki one-piece uniform and taller raised pith/field-cap silhouette, and VC uses black pajamas plus a raised straw conical hat. Head-space red marks were removed so NVA/VC do not read as having overhead icons.

Attachment strategy: body markings must not be free-floating planes. Use existing body-triangle material buckets or projected/shrinkwrapped decal geometry for cloth markings, webbing, and insignia. Use bone-attached or single-joint-skinned geometry for rigid gear such as helmets, hats, packs, and weapons. The current generator follows that rule by removing floating body marks and keeping headgear as small double-sided skinned shells that overlap the head. This matches Three's object hierarchy/skinning model and glTF's `JOINTS_0` / `WEIGHTS_0` contract, while leaving `DecalGeometry` as an optional projected-detail technique for later flat patches.

Review surface update: `tmp/source-glb-selection/index.html` now has a large `Inspect` modal with orbit controls, reset, close, fullscreen, and a link to `tmp/source-glb-selection/animation-weapon-lab.html`. The grid still compares the first-row faction variants, but live grid previews are capped to avoid too many active WebGL contexts; lower-priority cards show a deferred preview and should be opened through `Inspect`.

Readability gate: if the material-slot page still reads as one body with different paint, the next slice is a better gear kit: helmet/boonie/soft cap variants, NVA pith/field-cap variants, VC scarf/head-wrap or conical-hat alternate, belt/webbing, pack, boots, and small faction marks. Use Meshy, FAL/Hunyuan3D, or Kiln only to generate candidate attachments; keep them separate, low-tri, socketed/skinned where needed, and audited before they enter a rigging or octa bake.

Production soldier source set:

| Role | Source model | Production note |
|---|---|---|
| Preferred iteration base | `BMs52Y9rL5__Base_Character_-_Free_Model_By_AroniaStudios` | Human-preferred base as of the customizable-character review. Build US Army, ARVN, NVA, VC, civilian, and player-character directions from UV/base-color texture variants first. Needs production texture painting and an animation proof before any octa bake. |
| Technical fallback | `BNq2fSOKXq__Guy_-_Free_Model_By_Rafael` | Keep as fallback if Aronia's one-material body blocks faction readability. Stronger material-slot and Mixamo-rig story, but not the selected visual base. |
| Animation/impostor fixture | `PpLF4rt4ah__Character_Soldier_-_Free_Model_By_Quaternius` | Valid for technical bake testing because it has clips, but no longer approved as the production soldier body. |
| US variant hold | `5EGWBMpuXq__Adventurer_-_Free_Model_By_Quaternius` | Optional squad variety only if repaint reads as Vietnam-era soldier. |
| NVA hold | `66kQ4dBBC7__Characters_Matt_-_Free_Model_By_Quaternius` | Hold unless Aronia iteration fails. Needs khaki/olive uniform, pith helmet or compatible headgear, AK-compatible mount, and shoot-clip decision. |
| VC hold | `UcLErL2W37__Characters_Sam_-_Free_Model_By_Quaternius` | Hold unless Aronia iteration fails. Needs black pajama / guerrilla silhouette, conical-hat or soft-cap decision, AK-compatible mount, and shoot-clip decision. |
| US heavy / LRRP | `Btfn3G5Xv4__SWAT_-_Free_Model_By_Quaternius` | Only promote if body armor/tactical silhouette can be painted into a believable Vietnam-era role. |
| Civilian female | `75ikp7NEDx__Cube_Woman_Character_-_Free_Model_By_Quaternius` | Villager/noncombatant pool, not a combat soldier default. |
| Civilian male | `DojKLcO34E__Beach_Character_-_Free_Model_By_Quaternius` | Villager/noncombatant pool, not a combat soldier default. |
| Animation library only | `DgOCW9ZCRJ__Character_Animated_-_Free_Model_By_Quaternius` | Keep for clip/rig experimentation; do not ship as final soldier art unless repainted and manually approved. |

Soldier selection gate:

- Show candidate source GLB, retextured/painted faction preview, weapon mount preview, LOD chain, static impostor, and animated impostor candidate on one review card.
- For every candidate, report source path/license, triangles, materials, textures, UV presence, bone count, clip count, file size, bounding box, and whether it came from local inventory, Hunyuan/MMGP, Meshy, or another external source.
- Record whether the rig has usable `idle`, `walk`, `run`, `shoot`, hit, fall, and death clips, and whether `shoot` is native, fallback, or requires retargeting.
- Keep faction paint/retexture status explicit: source material, palette row, uniform color, headgear, weapon, and whether the final look still reads as Vietnam soldier rather than fantasy/adventure placeholder.
- Compare the model against the already shipped 2D faction sprite references: US, NVA, ARVN, and VC. Matching those game silhouettes matters more than preserving the downloaded source material.
- Do not promote a soldier to W5 unless the human approves the look and the clip coverage.

Vegetation selection gate:

- Keep vegetation separate from animated soldiers. Production vegetation now uses GLB-sourced static impostors for every TIJ species; legacy flat atlas sprites are fallback/debug only and are not production-approved source assets.
- Ground-cover vegetation must be authored as clump GLBs with compact `ground-compact` atlas budgets. Mid-level and canopy vegetation use normal-lit `mid-balanced` or `canopy-balanced` profiles, with `canopy-hero` reserved for rare exceptions.
- Review candidates by species fit, silhouette at helicopter distance, texture quality, license, triangle count, impostor size, and TIJ `textureName` mapping.
- Reject potted/container plants for world vegetation scatter, even if the mesh itself is usable as a base. `rubber-fig-google` is rejected for the TIJ rubber-tree slot on this basis.
- Record whether each source contains built-in LODs. Current local Poly Pizza vegetation GLBs do not expose LOD nodes, so Pixel Forge owns the `lod0..lod3` generation and should package those files beside the imposter layers.
- Current vegetation impostor outputs are albedo-only lit beauty bakes and are review-only. Do not approve them for TIJ production import until they are regenerated under the production lighting contract.
- Production GLB vegetation impostors must bake `colorLayer: "baseColor"` as neutral unlit color, include a required `normal` aux atlas with `normalSpace: "capture-view"`, record `textureColorSpace: "srgb"`, and apply transparent RGB edge bleed before atlas packing.
- `depth` remains optional for parallax or intersection polish; it is not a substitute for the normal layer required by the production vegetation lighting contract.
- Gallery and TIJ runtime previews must light vegetation impostors at runtime from the billboard `sunColor`, `skyColor`, and `groundColor` uniform shape instead of treating the atlas as a pre-lit beauty render.
- Show source GLB, generated LOD chain, static impostor/billboard result, storage, and species mapping before moving any generated output into `war-assets/` or TIJ.

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

Implementation note: the current review artifact now consumes the all-faction scratch pack under `tmp/source-glb-selection/derived/tij-character-pack-v1/`. Review output stays under `tmp/animated-imposter-review/`, and `war-assets/` remains untouched.

Result: `bun run animated-imposter:review` bakes `tmp/source-glb-selection/derived/tij-character-pack-v1/factions/nva/walk_fight_forward.glb` plus the NVA `ak47` attachment into `tmp/animated-imposter-review/tij-character-pack-v1/nva/walk_fight_forward/`. It writes `source.glb`, `weapon-ak47.glb`, a packed RGBA8 debug atlas, 8 per-frame octahedral atlases, an `animated-imposter.json` sidecar, a frame strip, `review-summary.json`, a validation screenshot, and a local `index.html` source-vs-impostor review page.

Clip note: this source records logical target `shoot` with raw fallback `Armature|Walk_Fight_Forward|baselayer`. That warning is intentional because the reviewed moving-fire clip is the hardest currently approved visual case, but it is not yet a dedicated fire clip.

Deliverables:

- Animated Playwright/Three bake session reusing static-impostor session patterns.
- One selected soldier, one locomotion clip, `6x6`, `7x7`, or `8x8` views, `96` px tiles, `8-16` frames.
- RGBA8 debug output allowed for this wave if R8 palette work blocks progress.
- `animated-imposter.json` sidecar emitted with exact storage numbers and warnings.

Acceptance:

- No blank tiles.
- Clip frame timing is deterministic across two runs.
- All layers or packed-atlas regions resolve from the sidecar.
- Output stays outside `war-assets/` unless explicitly approved.

### W3 - Post-Bake Validation And Gallery Review

Status: done for the local review spike; first NVA proof visually accepted; full TIJ gallery integration still gated on batch review.

Goal: make the visual defect measurable and reviewable.

Implementation note: for the first review handoff, a static local HTML review page and contact-sheet/atlas output are enough. TIJ gallery route integration remains gated until the first all-faction batch passes human review.

Result: sidecar schema validation passed, repeat bake hash matched, all 8 frame atlases are nonblank, min alpha coverage is 0.0803 after the weapon attachment, and raw RGBA8 color storage is 14,450,688 bytes inside the 31,457,280 byte envelope. The local review page includes frame-locked source-vs-impostor playback using the same weapon/arm solve as the bake, frame strip, packed atlas, warning payload, a note that the close comparison magnifies a 96 px debug tile, and a moving-camera scene probe for the runtime candidate: fixed per-instance yaw, actor-local sampling, axis-locked upright billboards, 7x7 centered-front single-tile sampling for ordinary reads, horizon-primary sampling for normal ground/low-air reads, and a continuous elevation gate that releases into true octahedral view selection only for steep aircraft, cliff, or below-actor views. The packed-atlas fallback must not blend neighboring octa views at this resolution because crossfading created duplicate silhouettes in human review.

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

Status: next after useful-clip batch review.

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

Status: superseded by the NPC pack package in [tij-npc-asset-cycle.md](tij-npc-asset-cycle.md). The current package has four combined faction GLBs, each with 8 named clips, plus 32 per-faction/per-clip packed RGBA8 debug impostors.

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

- `6x6`, `7x7`, and `8x8` view grids all show objectionable snapping at real TIJ camera distances.
- Alpha overdraw breaks the 3000-instance runtime target in a TIJ-like scene.
- WebGL2 texture arrays are unreliable and packed 2D fallback is too complex or too slow.
- R8 palette-index output cannot preserve transparency and faction rows without artifacts.
- Depth or normal layers are required for animated soldiers and push that artifact beyond the storage envelope. Static vegetation is a separate lane where production impostors require normals by contract.

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

After W3 and before batch scale-up, a human should inspect:

- `tmp/animated-imposter-review/tij-character-pack-v1/nva/walk_fight_forward/index.html`.
- `tmp/animated-imposter-review/tij-character-pack-v1/nva/walk_fight_forward/animated-frame-strip.png`.
- The packed atlas for obvious angular holes, upside-down lower-hemisphere views, duplicate silhouettes, or unacceptable silhouette snaps.
- Storage and validation table in `tmp/animated-imposter-review/tij-character-pack-v1/nva/walk_fight_forward/review-summary.json`.

This first proof gate has passed visually. Do not move to `war-assets/` or TIJ yet. Scale only to the useful NPC pack clips and all four factions, then run the WebGL2 runtime spike.
