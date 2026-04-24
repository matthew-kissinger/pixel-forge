# TIJ Asset Pipeline Proposal — kiln extensions + validation gallery

Status: EXECUTED 2026-04-24 — pipeline modules + runner + gallery all shipped, awaiting human validation pass.
Date authored: 2026-04-24
Supersedes the generation-queue framing in [terror-in-the-jungle-assets.md](terror-in-the-jungle-assets.md) (2026-02-22) for anything downstream of "we now have 375 vegetation GLBs + 74 character GLBs on disk." That older doc is still useful for engine context (art direction, in-engine integration points, HUD conventions).

## Execution log (2026-04-24)

- **All six kiln modules landed** under `packages/core/src/kiln/{imposter,lod,sprite-atlas,fbx-ingest,retex,photogrammetry}/`. Each wired into CLI (`pixelforge kiln <sub>`) and MCP (`pixelforge_kiln_<name>`). 12 kiln MCP tools total, up from 4.
- **Three billboard primitives** added to `packages/core/src/kiln/primitives.ts`: `foliageCardGeo`, `crossedQuadsGeo`, `octaGridPlane`. Registered in `buildSandboxGlobals` + `listPrimitives`. Total primitive count now 51.
- **Pipeline runner** at [scripts/run-tij-pipeline.ts](../scripts/run-tij-pipeline.ts), exposed as `bun run tij:pipeline` (shells to `tsx` — Bun+Playwright CDP doesn't cooperate on Windows). Resumable via `existsSync` skip.
- **Pipeline output**: 103 manifest entries under `packages/server/output/tij/` — 8 soldiers × (4 LODs + 16-angle imposter), 7 weapons, 7 vegetation combos across 30 variant imposters, 80 survival-kit FBXs ingested clean, 60-plant sprite atlas (4096² POT). Total 122 MB.
- **Validation gallery** at `/gallery-tij` served by the Hono dev server. HTML at [packages/server/tij-gallery/index.html](../packages/server/tij-gallery/index.html); route at [packages/server/src/routes/gallery-tij.ts](../packages/server/src/routes/gallery-tij.ts).
- **Known deltas from proposal**: imposter layout is lat-lon for all angle counts (not true octahedral — deferred until TIJ consumer shader exists, meta records `layout: 'latlon'`). Retex is diffuse-swap only (region-mask LUTs deferred). Photogrammetry module wired but not run (gated on human call). All 80 FBXs came through with neutral material — their texture references point to external .png files we don't resolve; stripping them at export time lets everything convert cleanly, downstream retex can restore colors.
- **Tests**: core 335 pass, server 114 pass, cli 19 pass, mcp 7 pass. Gated live tests (KILN_IMPOSTER_LIVE, KILN_FBX_LIVE) default off.
- **Acceptance**: five sample GLBs through `bun run audit:glb` all clean under strict back-face cull. Soldier + bamboo imposter atlases visually verified — every tile non-empty.

Human validation pass pending before any assets move into TIJ proper. See §"Handoff back to human" for what's expected.

## Open architectural question — animated imposters for skeletal characters

Validation raised this gap on 2026-04-24. Current imposters are STATIC: one pose per 32-angle atlas, baked from the GLB's rest frame. The validation gallery correctly renders the atlas but the billboard never breathes, walks, or fires — while the adjacent live-3D column plays real anim clips. At TIJ's 3000-NPC aerial-gameplay scale the dissonance matters.

Industry consensus confirms this:

- Unity Amplify Impostors and Unreal's ImpostorBaker **explicitly do not support skinned skeletal meshes**. Both ship dedicated sibling systems for the skinned case.
- The skinned-at-distance problem is usually solved by **Vertex Animation Texture (VAT)**: per-vertex positions baked into a texture that a custom vertex shader samples at runtime. Open-source bakers exist for Unity (VatBaker), UE5 (VertexAnimSample, Vertex_Anim_Toolset), Godot (Godot_Vertex_Animation_Textures_Plugin), and Blender (OpenVAT, which exports through glTF). **None for Three.js.** The R3F community example (mikelyndon/r3f-webgl-vertex-animation-textures) just imports Houdini-baked outputs.
- An alternative — the **flipbook impostor** (tiles = angles × time frames) — works without custom vertex shaders but explodes in storage and loses resolution at low angle/frame counts.

A clip-resolver utility landed at [packages/core/src/kiln/imposter/clip-resolver.ts](../packages/core/src/kiln/imposter/clip-resolver.ts) — pure, tested against real Quaternius clip lists — so whichever baker we build can share the same logical-target-to-clip-name logic.

A dedicated design pass starts from [docs/animated-imposter-brief.md](animated-imposter-brief.md). That doc is self-contained and the work to answer it is explicitly scoped; pick it up with a fresh agent before writing any new baker code.

---

## Mission for the fresh agent

Terror in the Jungle (TIJ) finished a research pass on 2026-04-24 that left **~500 GLBs and ~450 sprites on disk** under `C:/Users/Mattm/X/{soldier,vegetation}-research/`. The engine is ready to be "dressed" — but dropping raw geometry in would annihilate the perf budget (3,000 NPCs target, stable frame tails, ~30 vegetation species at dense scatter).

Your job:

1. **Extend kiln** with the missing pipeline stages (imposter baker, LOD decimator, sprite atlas packer, FBX ingest, character retex, photogrammetry cleanup — priority ordered below).
2. **Run the pipeline** across the ranked shortlist in this doc to produce a first wave of production-ready assets.
3. **Ship a validation gallery** — a new page under `packages/client/` (or a scripted static-HTML drop in `packages/server/output/`, your call) that renders each asset next to its imposter under rotation, plus soldier characters with animations playing and a weapon mounted to the right hand.
4. **Hand it back to the human for validation**. They will inspect the gallery, confirm the pipeline behaves correctly on all ranked inputs, then move select assets into TIJ proper for reskin / polish.

You must not modify anything inside `C:/Users/Mattm/X/games-3d/terror-in-the-jungle/`. All changes are in `pixel-forge`. The TIJ repo is **read-only reference** for you.

Use the `context7` MCP server whenever you touch a library (meshoptimizer, xatlas, @gltf-transform, manifold-3d, three.js 0.184 imposter materials, FBXLoader) — your training data is likely stale relative to the versions pinned in `packages/core/package.json`. Prefer context7 over web search for library docs.

---

## Current kiln state — what exists, what doesn't

Source of truth: [packages/core/src/kiln/](../packages/core/src/kiln/)

### Exists

- 48 Three.js primitives in 12 categories (CSG booleans via `manifold-3d`, shape-aware UV unwraps, parametric gears + blades, PBR material helpers, instancing)
- LLM → JS → GLB generator (`generate.ts`, `render.ts`) using Claude + `@gltf-transform/core`
- Headless 6-view audit (`bun run audit:glb`) under strict back-face culling
- `inspect.ts` — GLB stats (tris, bones, animation tracks, bbox)
- `list-primitives.ts` — reflection surface for agents
- Four transports (visual editor, CLI, MCP, HTTP) that all call into the same core

### Does NOT exist (searched packages/, docs/, scripts/: zero hits)

- **No octahedral / hemi-octahedral imposter baker**
- **No flipbook / 8-angle sprite baker**
- **No LOD decimator** (no meshopt_simplifier wrapper)
- **No sprite-sheet / texture atlas packer**
- **No FBX ingest** (FBXLoader is not wired)
- **No character retex pipeline** (region masks → swap diffuse for faction variants)
- **No photogrammetry cleanup** (tier-C Poly Haven plants are raw, need decimate + UV repack + PBR merge before bake)

Everything in this proposal builds on the existing kiln substrate — the headless Three.js renderer, the gltf-transform export, the audit infrastructure. You are not starting from zero.

---

## Input inventory (all absolute paths, all on local disk)

### Soldiers (rigged + animated GLBs)

Root: `C:/Users/Mattm/X/soldier-research/`

- `downloads/polypizza/` — **74 character GLBs**. Highest-value subset (Quaternius, CC-BY / CC0):
  - `DgOCW9ZCRJ__Character_Animated_-_Free_Model_By_Quaternius.glb` — 45 anims, 13.7k tri, 53 bones (hero)
  - `PpLF4rt4ah__Character_Soldier_-_Free_Model_By_Quaternius.glb` — 24 anims, 7.9k tri, 62 bones
  - `Btfn3G5Xv4__SWAT_-_Free_Model_By_Quaternius.glb`
  - `5EGWBMpuXq__Adventurer_-_Free_Model_By_Quaternius.glb`
  - `BTALZymknF__Punk_-_Free_Model_By_Quaternius.glb`
  - `66kQ4dBBC7__Characters_Matt_-_Free_Model_By_Quaternius.glb`
  - `UcLErL2W37__Characters_Sam_-_Free_Model_By_Quaternius.glb`
  - `75ikp7NEDx__Cube_Woman_Character_-_Free_Model_By_Quaternius.glb`
  - `DojKLcO34E__Beach_Character_-_Free_Model_By_Quaternius.glb`
- `extracted/` — Kenney animated-characters-* (protagonists / retro / survivors), Kenney blocky + mini-characters
- `CHARACTERS_MANIFEST.json` — 298-entry manifest with tri/bone/anim counts, license, fit flags

Skeleton is a Mixamo-compatible 62-bone rig on the Quaternius hero set. Same skeleton across 15+ characters = free anim sharing. Weapon grip goes on `Hand.R` / `mixamorig:RightHand`.

### Weapons & gear

Root: `C:/Users/Mattm/X/soldier-research/downloads/polypizza-props/` — **59 GLBs**. Relevant subset for Vietnam era (retex or use as-is):

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

- `assets/tier-a-psx/polypizza/` — **33 tropical plant GLBs**, direct species matches (see ranking table below)
- `assets/tier-a-psx/kenney/nature-kit/` — **~409 Kenney nature GLBs** (silhouette is temperate — skip unless you verify a jungle fit; use mushrooms + rocks only)
- `assets/tier-a-psx/quaternius/` — CC0 Quaternius packs
- `assets/tier-c-hifi/polyhaven/` — 84 Poly Haven photogrammetry assets. **Bake-only source** — never ship as runtime geometry.
- `MANIFEST.json` — 747-entry manifest with tier, species, license, source.

### Sprite / 2D (for the sprite atlas packer)

Root: `C:/Users/Mattm/X/games-3d/terror-in-the-jungle/` (project root — **these three zips are the immediate input**):

- `60-free-plants.zip` — 60 PNG plant sprites (~50 MB, OpenGameArt, alpha cutouts, 1024–2048 px each). Drop-in Tier-A billboard content. Already-transparent.
- `foliage-pack.zip` — Kenney foliage pack, 62 tiny PNGs (<5 KB each) + leaves + SVG. **UI icon candidates, not field scatter.**
- `survival-kit.zip` — Kenney survival kit, **65 FBX models** (barrels, bedrolls, tents, tools, boxes, rocks, axes, 3 small trees). Needs FBX → GLB ingest.

Downstream target for scattered vegetation is TIJ's `GPUBillboardSystem` at `src/systems/world/billboard/GPUBillboardSystem.ts`, which today consumes one texture per species. Atlased output will let TIJ cut material + draw calls later; for this pipeline pass, produce both single-species PNGs and a combined atlas with a JSON frame table so TIJ can pick either.

### TIJ vegetation species registry (target matrix)

Source: `C:/Users/Mattm/X/games-3d/terror-in-the-jungle/src/config/vegetationTypes.ts` — 13 species keyed by `id` and `textureName`, grouped into three tiers: `groundCover` (fern, elephantEar, elephantGrass, ricePaddyPlants), `midLevel` (fanPalm, coconut, areca, bambooGrove, bananaPlant, mangrove), `canopy` (dipterocarp, banyan, rubberTree). Each species needs exactly one billboard/imposter output keyed to its `textureName`. Produce files so they drop into `public/textures/vegetation/<textureName>.png` (or a KTX2 + meta when imposters land).

---

## Ranked shortlists

Ranking criteria, combined: silhouette fit → rig / anim fit → performance headroom → license (CC0 > CC-BY > other) → modifiability (UV layout quality, weight normalization, material simplicity).

### Soldiers — rank 1 = build first

| Rank | GLB (filename stem) | Role in TIJ | Why |
|---|---|---|---|
| 1 | `DgOCW9ZCRJ__Character_Animated` | Hero / LOD0 reference | 45 clips covering pistol aim/fire/reload + locomotion + reactions + death + crouch + swim — single best anim library we have free |
| 2 | `PpLF4rt4ah__Character_Soldier` | US / ARVN base | 62-bone Quaternius skeleton, reads military without retex |
| 3 | `5EGWBMpuXq__Adventurer` | US variant | Same 62-bone rig, anim-compatible, different silhouette for squad variety |
| 4 | `66kQ4dBBC7__Characters_Matt` | NVA base | Leaner silhouette, civilian-coded — retex into khaki + pith helmet |
| 5 | `UcLErL2W37__Characters_Sam` | VC base | Lightest build of the set — black pajama retex + conical hat attachment |
| 6 | `Btfn3G5Xv4__SWAT` | US heavy / LRRP variant | Tactical silhouette, helmet + body armor already modeled |
| 7 | `75ikp7NEDx__Cube_Woman_Character` | Civilian | Same-skeleton stand-in for villagers |
| 8 | `DojKLcO34E__Beach_Character` | Civilian male | Shorts + light-shirt silhouette for village crowd |
| — | Kenney mini-characters (×12) | LOD2 distant fill only | 700–900 tri, 7-bone rig — cheap but NOT anim-compatible with Quaternius skeleton; handle as a separate "distant crowd" imposter pool |
| skip | Polygonal Mind novelty (Banana / Candle / Coffee / Wine / Bunny) | — | Zero Vietnam fit |

### Weapons — rank 1 = mount first

| Rank | GLB (filename stem) | Stand-in for |
|---|---|---|
| 1 | `Bgvuu4CUMV__Assault_Rifle` | M16 (primary US) |
| 2 | `ASOMZIErq3__Sniper_Rifle` | M14 DMR / M40 |
| 3 | `7ehatxr7FY__Submachine_Gun` | MAT-49 / Grease Gun |
| 4 | `ZmPTnh7njL__Shotgun` | Remington 870 / trench gun |
| 5 | `52kQzphmeF__Pistol` | M1911 sidearm |
| 6 | `YWhHlmKOtx__Hand_Grenade` | M67 / frag |
| 7 | `2g9Jm7kvIU__Backpack` | ALICE / rucksack attachment |

All above mount to `Hand.R` via the Quaternius skeleton; pistol grip for aim anim, rifle two-hand pose for foregrip (left-hand IK deferred to TIJ — your gallery only needs right-hand mount working).

### Vegetation combos — rank 1 = bake first

Each combo targets one or more species in `vegetationTypes.ts`. Imposter bake angle count and atlas size are in the final column.

| Rank | Combo | Source GLBs | TIJ species target | Bake spec |
|---|---|---|---|---|
| 1 | **Bamboo grove** | Poly Pizza bamboo-google 1/2/3 + bamboo-quaternius 1/2/3 (6 meshes) | `bambooGrove` | 8 angles × 512² per variant, combined 6-sprite atlas |
| 2 | **Palm canopy (coconut/royal/queen)** | coconut-palm-google, royal-palm-google 1/2, queen-palm-google, date-palm-google | `coconut`, `fanPalm` | 16 angles × 1024² (canopy trees read silhouette at distance — more angles matter) |
| 3 | **Rubber tree / canopy stand-ins** | rubber-tree-google, rubber-fig-google, vine-google, vine-covered-tree, palm-tree-jarlan-perez 1/2 | `rubberTree`, `banyan` | 16 angles × 1024² |
| 4 | **Understory ferns + elephant ear** | fern-danni-bittman, fern-quaternius, fiddlehead-google, big-leaf-plant-reyshapes + selected PNGs from `60-free-plants.zip` (plant_14, plant_17, plant_22, plant_43) | `fern`, `elephantEar` | 8 angles × 512² for GLB sources; single-quad billboards for PNGs (no imposter needed) |
| 5 | **Banana plants** | banana-tree-google, banana-tree-sean-tarrant, plus one banana sprite from 60-free-plants | `bananaPlant` | 8 angles × 512² |
| 6 | **Fan palms (lady / triangle / umbrella / ivory-cane / everglades)** | lady-palm-google 1/2, triangle-palm-google, umbrella-palm-google, ivory-cane-palm-google, everglades-palm-google | `fanPalm`, `areca` | 16 angles × 1024² |
| 7 | **Dipterocarp giant** | FabinhoSC AmazonInspiredTrees (from OGA tier-A) + procedural EZ-Tree fallback | `dipterocarp` | 16 angles × 1024² |
| 8 | **Mangrove / rice paddy** | Gap — no local high-quality GLBs. Use PNG stand-ins from 60-free-plants (plant_01, plant_03, plant_27) as billboards, flag for future photoscan | `mangrove`, `ricePaddyPlants` | PNG-only for now, no imposter |
| skip | Kenney PSX Nature Kit trees | Temperate silhouette, wrong era — use mushrooms and rocks only if anything |

`elephantGrass` is handled entirely by Poly Haven `grass_medium_01/02` billboards — no GLB imposter, single quad.

---

## Kiln extensions to build (priority order)

Each module lands under `packages/core/src/kiln/<module>/`. Write unit tests alongside in `__tests__/`. Wire into the CLI and MCP surfaces as you go — that's kiln's contract.

### P1 — `kiln/imposter/`  (blocks everything else)

Octahedral + hemi-octahedral baker. Public API sketch:

```ts
bakeImposter(glb: Buffer | string, opts: {
  angles: 8 | 16 | 32;                 // 8 = hemi-octa, 16 = full octa, 32 = hemi with doubled elevation
  atlasSize: 256 | 512 | 1024 | 2048;
  outputs: ('albedo' | 'normal' | 'depth')[];  // at least albedo+depth for billboard popping
  axis: 'y' | 'hemi-y';                // hemi-y clamps camera to upper hemisphere (foliage)
  format: 'png' | 'ktx2';              // ktx2 via basis-u encoder if wired
  bgColor: 'magenta' | 'transparent';
  pivot: 'bbox-bottom' | 'bbox-center';
}): Promise<{
  atlas: Buffer;                        // packed RGBA for albedo (or the first requested layer)
  aux: Record<string, Buffer>;          // normal / depth extra layers
  meta: ImposterMeta;                   // angles, tile grid, world-space scale, yOffset, source bbox
}>
```

Implementation notes:
- Reuse the existing headless Three.js renderer from `render.ts` — drive a grid of cameras over the loaded GLB, snap to an off-screen render target, pack into a single atlas.
- Put a strict-back-face-cull pass in front of it identical to `audit:glb` — any winding bug will be visible as black tiles and should fail fast.
- `ImposterMeta` lands next to the PNG as `<name>.imposter.json`. TIJ will parse it at load time; include the exact field names in the schema (`angles`, `tilesX`, `tilesY`, `worldSize`, `yOffset`, `hemi`).
- Add a test that bakes a bamboo GLB and verifies the atlas is non-empty at all 8 tile positions.

### P2 — `kiln/lod/`

Wrap `meshoptimizer` (or `@gltf-transform/functions` `simplify` — check via context7 which has better quality at tri ratios ≥ 0.1). Output: one multi-LOD GLB per input, LOD levels [1.0, 0.5, 0.25, 0.1].

```ts
generateLODChain(glb: Buffer | string, opts?: {
  ratios?: number[];           // default [1.0, 0.5, 0.25, 0.1]
  errorThreshold?: number;     // default 0.01
  preserveUVs?: boolean;       // default true
  attachImposter?: Buffer;     // if provided, appended as "LOD3" with ImposterMeta extras
}): Promise<Buffer>;
```

LOD0 = original. LOD3 = the imposter card from P1. Ship as `EXT_mesh_gpu_instancing` + `KHR_draco_mesh_compression` where supported.

### P3 — `kiln/sprite-atlas/`

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

### P4 — `kiln/fbx-ingest/`

FBXLoader → normalize (left-handed → right-handed if needed, scale to meters, merge identical materials) → GLB via `@gltf-transform/core`. First use: unzip `survival-kit.zip` and convert all 65 FBX models.

### P5 — `kiln/retex/`

Character-specific diffuse retex using region masks on the Quaternius UVs. Presets:

- `OG-107-jungle` (US olive drab)
- `ERDL-leaf` (US late-war camo)
- `tiger-stripe` (ARVN / LRRP)
- `khaki-plain` (NVA)
- `black-pajama` (VC)

Workflow: read GLB, find the body mesh, apply UV-region-aware color LUT to its diffuse, write back. LLM can author the region map once per base character and cache it.

### P6 — `kiln/photogrammetry/`

Cleanup pass for Poly Haven tier-C plants before imposter bake: decimate to ≤ 10k tri, UV repack via xatlas (already a dep), merge 2K PBR to a single 1K diffuse. Only needed if tier-C quality beats the Poly Pizza shortlist in the gallery — gate on the human's validation call.

### Primitives to add

- `foliageCardGeo({ width, height, yPivot })` — double-sided quad with proper Y pivot
- `crossedQuadsGeo({ width, height, planes: 2 | 3 })` — cross-billboard for near-field plants
- `octaGridPlane({ tilesX, tilesY })` — atlas-ready quad with per-instance tile UVs

---

## Validation gallery (build this last, after the pipeline runs)

A self-contained page the human will click through to confirm the pipeline is correct before approving asset migration into TIJ. Two acceptable shapes:

1. **Preferred:** new route in `packages/client/` under `src/routes/gallery-tij/`. Loads assets from `packages/server/output/tij/` via the existing server. Use React Three Fiber or vanilla Three.js 0.184.
2. **Fallback:** static HTML + vanilla JS dropped in `packages/server/output/tij-gallery/index.html`. Simpler, no React Flow entanglement, acceptable if the client route is too much plumbing.

### Sections the gallery must have

1. **Soldier cards** — one per ranked character (top 8). Each card shows:
   - Live rotating 3D preview of the LOD0 mesh
   - Animation dropdown listing all clips; current clip auto-plays in a loop
   - Weapon dropdown listing the 5 ranked weapons; selected weapon is mounted to `Hand.R` and follows the anim
   - Side-by-side octahedral imposter card preview, camera-aligned, rotating synchronously
   - Tri count, bone count, anim count, file size, bbox (meters), retex preset applied
2. **Vegetation combos** — one per ranked combo (top 7). Each card shows:
   - All variant GLBs in the combo in a row (live 3D)
   - The baked imposter atlas rendered as a plane with tile cycling so the human can see wraparound behavior
   - A "billboard plausibility test" — camera orbits the card at constant radius and the imposter aligns to camera; any popping / seam is visible
   - Tri count per variant, angles baked, atlas size, KTX2 / PNG flag
3. **Sprite atlases** — the combined 60-plant atlas rendered with frame gridlines + labels, showing which species each tile is mapped to in the frame table
4. **FBX ingest survey** — all 65 survival-kit meshes in a grid, flagging any that failed conversion

Keyboard / URL controls:
- `?asset=<stem>` deep-links to a specific card
- Arrow keys step through cards
- `g` toggles strict back-face-cull mode (same shader as `audit:glb`) so the human can see winding errors
- Screenshot export button dumps the current card to `output/tij/screenshots/`

### Acceptance criteria the human will check

- [ ] All 8 ranked soldiers load, play at least 3 anims (idle, walk, shoot), and mount the M16 stand-in to the right hand without detachment during locomotion
- [ ] Each of the 5 faction retex presets is visible as a swatch on the Quaternius Soldier card (even if only one is wired live — others can be stills)
- [ ] All 7 ranked vegetation combos bake without any black tiles in their imposter atlas
- [ ] The camera-orbit test on each imposter card shows ≤ 1 pixel of popping between adjacent angles at the configured atlas size
- [ ] The sprite atlas renders with every one of the 60 plants visible and correctly framed in the JSON table
- [ ] FBX ingest succeeds for ≥ 60 / 65 survival-kit models (flag the failures)
- [ ] All pipeline output lands under `packages/server/output/tij/` with the directory layout described below
- [ ] `bun run audit:glb` runs clean against every new GLB (no winding errors)
- [ ] Per-card tri count, anim count, atlas size, file size are all displayed — no placeholder zeros

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
      <variant>.glb          # source mesh
      imposter.png
      imposter.json
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
- Do not bulk-download new assets — the 500+ on disk are enough for this pass.
- Do not attempt Mixamo retargeting in this pass. Quaternius 62-bone skeleton is anim-complete for the shortlist.
- Do not ship the Poly Haven tier-C geometry as runtime meshes. Imposter-bake only.
- Do not add new AI-generation pipelines to kiln in this pass — only the bake / ingest / retex mechanics listed above. Generation stays on the existing Claude → primitives path.
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
