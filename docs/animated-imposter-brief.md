# Animated-imposter architecture - research brief

Status: ANSWERED 2026-04-24 - see [animated-imposter-design.md](animated-imposter-design.md), [animated-imposter-worklog.md](animated-imposter-worklog.md), [animated-imposter-dev-cycle.md](animated-imposter-dev-cycle.md), and the active NPC lane in [tij-npc-asset-cycle.md](tij-npc-asset-cycle.md). W1 schema/validator and the first W2/W3 review bake spike now exist.
Date authored: 2026-04-24.
Parent: [tij-asset-pipeline-proposal.md](tij-asset-pipeline-proposal.md).

---

## The problem in one sentence

Terror in the Jungle wants 3,000 animated NPC soldiers visible from helicopter / aircraft distances. Our current kiln imposter baker ([packages/core/src/kiln/imposter/](../packages/core/src/kiln/imposter/)) produces static single-pose atlases. Octahedral imposters - as shipped by Unity Amplify and Unreal's ImpostorBaker - are explicitly skinned-mesh-agnostic. We need a well-engineered solution for animated skeletal crowds.

This doc is the historical briefing for the research pass. The answered decision is: build a WebGL2 animated octahedral impostor array first, with VAT proxy retained as fallback if angle snapping, overdraw, texture-array behavior, or palette/KTX2 encoding fails. Implementation status now lives in the worklog and dev-cycle plan.

## Constraints

- Pipeline is **Three.js 0.184 headless + Playwright Chromium** (Windows-first, Linux CI-compatible). Bun on the orchestrator side; our CDP pipe + Bun has known issues on Windows so anything that shells out to Playwright runs through `tsx`.
- We already have: headless Three.js scene execution, `@gltf-transform/core` + `/functions`, meshoptimizer, xatlas, sharp, gltf-transform simplify, a mature LOD generator ([packages/core/src/kiln/lod/](../packages/core/src/kiln/lod/)), and working imposter baker ([packages/core/src/kiln/imposter/bake.ts](../packages/core/src/kiln/imposter/bake.ts)).
- TIJ runtime is also Three.js 0.184 - the consumer shader for whatever we bake will live in `C:/Users/Mattm/X/games-3d/terror-in-the-jungle/src/systems/world/billboard/`.
- **No Blender in the build pipeline.** Anything that requires launching Blender as a subprocess is disqualified unless there is no in-engine equivalent. Re-engineering a Blender-only algorithm in Three.js is fair game.
- Storage budget per-character is flexible but not unlimited. 3000 NPCs × ~100MB each is not viable; per-character totals (geometry + atlas + VAT + diffuse) should fit in ~30 MB for the full LOD stack.
- No new heavy runtime deps. A compact custom vertex shader is fine; a 50KB new dep is fine; a 5MB dep is not.

## Target clips

Ground truth from the Quaternius shortlist (see [CHARACTERS_MANIFEST.json](../../X/soldier-research/CHARACTERS_MANIFEST.json)):

- **All 8 ranked soldiers have**: `Idle`, `Run`, and at least one of `Walk` / `Walk_Gun`.
- **6 of 8 have**: some form of gun-shoot (`Gun_Shoot`, `Idle_Shoot`, `Run_Shoot`, `Idle_Gun_Shoot`).
- **Matt (NVA_base) + Sam (VC_base) have NO gun-shoot clip** - they ship only melee (`Slash`, `Stab`). These are the exact characters that need to be shooting AK-47s in TIJ. The clip resolver falls back to melee for them today; the real fix is either retargeting Mixamo shoot animations onto the shared Quaternius rig, or accepting melee-pose imposters for NVA/VC faction. This is a downstream decision you can punt on - pick the technique first, handle missing clips second.

The clip resolver ([packages/core/src/kiln/imposter/clip-resolver.ts](../packages/core/src/kiln/imposter/clip-resolver.ts)) already handles alias matching + fuzzy fallback + the `CharacterArmature|` prefix strip. Reuse it.

## Approaches to evaluate

Rank these from first principles. Challenge the framing if something better exists. Do NOT assume the short list is complete.

### A. Flipbook imposter - angles × frames grid

- Atlas = `(tilesX * frames) × tilesY` tiles, each showing one angle-frame combo.
- Runtime: billboard quad + shader that picks (az, el, frame) tile via `spritesheetUV`-style UV math.
- **Strengths**: reuses our existing imposter baker with a tiny loop change (advance AnimationMixer before each camera-angle sweep). Runtime shader is trivial. No mesh geometry at all.
- **Weaknesses**: storage explodes - 16 angles × 8 frames × 4 clips × 8 chars × 256² tiles ≈ 270 MB. Silhouette reads wrong at angle boundaries (popping). View-angle snapping is visible in motion; VAT doesn't have this problem.
- **Open question**: at TIJ's real imposter distance (typically 100-500m), are the snap artifacts actually visible to the player?

### B. Vertex Animation Texture (VAT)

- Bake per-vertex world-space position (and optionally normal) over time into an RGBA or float texture. One texture per clip per character; OR one global texture addressed by (vertexId, clipId, frameId).
- Proxy mesh: a heavily decimated version of LOD2 (~500-1000 tris) with preserved skin weights but re-authored to take vertex positions from the VAT in its vertex shader.
- Runtime: `MeshoptSimplifier` already exists in our LOD chain; the VAT itself is a Float32 texture or R11G11B10 packed. Vertex shader does one `texture()` call per vertex per frame.
- **Strengths**: arbitrary view angles (it's a real mesh). Storage scales with vertexCount × frames, not angles. Clips can blend. Consistent with LOD pipeline - it's just LOD3. This is the industry-standard answer.
- **Weaknesses**: custom vertex shader required. Proxy mesh must preserve the skin-weight invariant during decimation - meshoptimizer's `simplify` does preserve attributes, but verification is needed. Normals have to be re-baked if you want lit shading; unlit is cheaper.
- **Open question**: does `@gltf-transform/functions` `simplify` handle skinned meshes correctly at ratios < 0.05? If not, we need a custom decimator.

### C. Hybrid - LOD2 skinned + static imposter for far distance

- Keep real skinning + anim on LOD0 / LOD1 / LOD2 at distances where limb motion is perceptible.
- Static single-pose imposter at LOD3 for horizon-distance crowds where motion is imperceptible anyway.
- **Strengths**: simplest. Cheapest total storage. Aligned with Total War / BF1 approach.
- **Weaknesses**: at mid-distance (50-150m) you still want motion and LOD2 skinning is expensive for 3000 NPCs. Doesn't actually solve the problem the user raised.

### D. Compression-based - compressed skinned GLB all the way down

- Use meshopt + Draco on heavily decimated rigs. LOD3 is a sub-1KB geometry blob with 20 bones.
- Three.js still GPU-skins it normally.
- **Strengths**: no new runtime logic.
- **Weaknesses**: GPU skinning cost scales linearly with instance count. At 3000 NPCs this is the thing you're actively trying to avoid. Doesn't solve the crowd-scale problem.

### E. Something you find during research

Actively look for alternatives we haven't listed. Recent papers, GDC talks, indie engine conventions, games that demonstrably nail crowd scenes (Creative Assembly Total War, DICE's Battlefield, A Plague Tale, Helldivers 2). What are they actually shipping?

## What the research pass should produce

Output format: a new `docs/animated-imposter-design.md` covering each of the points below. Single file. No code yet.

1. **First-principles framing.** In a paragraph: what does a TIJ player actually see when the character is 200m away? 500m? The answer drives resolution choices.
2. **Reference list.** Hands-on reading you've done, with 1-2 line summaries each. Include at minimum OpenVAT, VatBaker (Unity), Vertex_Anim_Toolset (UE), the Godot VAT plugin, and the mikelyndon R3F example. Add the GDC / blog posts worth linking.
3. **Ranked recommendation** - `A`, `B`, `C`, `D`, or `E`, with the rationale. Include a second-best so we have a fallback if your first pick hits an unforeseen blocker during implementation.
4. **Data-flow diagram** for the chosen approach. What goes in (GLB + clip list + decimation target + frame rate), what comes out (proxy mesh + texture + sidecar JSON), and how the consumer reads it.
5. **Schema** for the meta sidecar. Use zod, matching the pattern in [packages/core/src/kiln/imposter/schema.ts](../packages/core/src/kiln/imposter/schema.ts). Bump the version.
6. **Validator design** - BOTH sides:
   - Pre-bake: given a GLB + target clip list, is this asset bakeable? Does the rig have enough bones? Are clips present? Is the vertex count within budget? Does the existing skin-weight normalization hold?
   - Post-bake: given an output texture + proxy + meta, does it round-trip? Sample random (vertex, frame) coords and verify positions are inside expected bbox. Render a test frame at a fixed camera, compare silhouette to the reference GLB at the same pose - structural SSIM > 0.9 or alert.
7. **Storage budget table** for the shortlist: N characters × M clips × K frames × tileSize → MB. Reality-check against the 30 MB/character envelope.
8. **Compatibility table** with our existing pipeline: which kiln modules are reused, which are touched, which are new. No orphan modules.
9. **Risks + unknowns.** Specifically: anything that would invalidate the recommendation mid-build.
10. **Implementation plan** - ordered, with clear landing stones: schema first, then bake, then validator, then runtime consumer, then pipeline wiring, then gallery preview. No big-bang PRs.

## Hard rules

- No code commits from the research pass. The deliverable is the design doc.
- Use `context7` MCP for any library docs. Web search for GDC talks / blog posts / engine-specific references.
- Cite every non-obvious claim. "VAT is industry standard" without a reference is not enough; which studios, which shipped games, which years.
- If the answer is "don't build an animated imposter at all, accept static + hide the dissonance" - say so, with the argument. That's a valid outcome.
- Present the decision with its trade-offs. This is co-design, not delivery.

## Reading list to start from

- OpenVAT (Blender-native VAT with glTF export): <https://github.com/sharpen3d/openvat>
- VatBaker (Unity, AnimationClip -> VAT): <https://github.com/fuqunaga/VatBaker>
- Vertex_Anim_Toolset (UE): <https://github.com/Rexocrates/Vertex_Anim_Toolset>
- Godot VAT plugin: <https://github.com/antzGames/Godot_Vertex_Animation_Textures_Plugin>
- R3F VAT example (Houdini-baked inputs): <https://github.com/mikelyndon/r3f-webgl-vertex-animation-textures>
- BabylonJS baked VAT PR: <https://github.com/BabylonJS/Babylon.js/pull/11317>
- ShaderBits octahedral impostors (foundational, but skinned-mesh-agnostic): <https://shaderbits.com/blog/octahedral-impostors>
- Amplify Impostors docs (Unity, confirms skinned limitation): <https://wiki.amplify.pt/index.php?title=Unity_Products:Amplify_Impostors/Manual>

## Context pointers inside this repo

- [packages/core/src/kiln/imposter/](../packages/core/src/kiln/imposter/) - current static baker, shares the Playwright harness you'll reuse.
- [packages/core/src/kiln/imposter/clip-resolver.ts](../packages/core/src/kiln/imposter/clip-resolver.ts) - target-to-clip-name logic. Any baker you propose calls this.
- [packages/core/src/kiln/lod/](../packages/core/src/kiln/lod/) - meshopt-backed LOD chain. The proxy mesh for a VAT path would live here.
- [packages/server/tij-gallery/index.html](../packages/server/tij-gallery/index.html) - where the validation preview has to render.
- [scripts/run-tij-pipeline.ts](../scripts/run-tij-pipeline.ts) - how pipeline categories are orchestrated. Your new stage adds a category here.
- [AGENTS.md §5 and §6](../AGENTS.md) - the namespace + pipeline contracts you extend, not work around.

When you are done with the design doc, flag back with (a) the doc path, (b) the pick with one paragraph of why, (c) the three most important risks, and (d) the smallest first slice of code that would de-risk the plan (without actually writing it).
