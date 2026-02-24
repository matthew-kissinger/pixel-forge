# War Assets - Terror in the Jungle

Generated 2D game assets for Terror in the Jungle (browser-based 3D Vietnam War simulation on Three.js). Copy this entire folder to the root of the terror-in-the-jungle project.

## How to Use These Assets

Every asset has two files:
- `{name}.png` - Final asset with transparent background, ready for use
- `{name}_raw.png` - Original generation before background removal (for reference/redo)

Convert PNG to WebP at integration time for smaller file sizes. Use `THREE.NearestFilter` for all textures/sprites to preserve pixel art crispness.

## Directory Contents

### soldiers/ - NPC Billboard Sprites (18 sprites + 3 mounted)

Each faction has 9 directional sprites for the billboard NPC system (3 directions x 3 states):
- `{faction}-front-walk1.png` / `front-walk2.png` / `front-fire.png`
- `{faction}-side-walk1.png` / `side-walk2.png` / `side-fire.png`
- `{faction}-back-walk1.png` / `back-walk2.png` / `back-fire.png`

**Factions generated:**
| Faction | Prefix | Uniform | Helmet |
|---------|--------|---------|--------|
| NVA | `nva-` | Khaki-olive, web gear, chest rig | Pith helmet (sun helmet) |
| ARVN | `arvn-` | Tiger stripe camo, US web gear | M1 steel helmet w/ camo cover |

**Already in game (not duplicated):**
- US Army: `us-*.webp` in `public/assets/`
- Viet Cong: `vc-*.webp` in `public/assets/`

**Mounted sprites (upper body only):**
- `{faction}-mounted.png` - Waist-up, hands forward for vehicle/turret mounting
- Generated for: US, NVA, ARVN (all 3 complete)

**T-pose refs (not for game use):**
- `nva-tpose-ref.png` / `arvn-tpose-ref.png` - Character references used during generation

**Integration:** Used by `CombatantMeshFactory.ts` for InstancedMesh billboards. Each sprite maps to one of 18 mesh instances per combatant. Side views face RIGHT (flip UV for left). Walk frames alternate for animation.

### textures/ - Tileable Terrain Textures (12 textures)

512x512 PNG, ~16-24 unique colors per texture, pixel art post-processed. All seamlessly tileable.

| File | Biome | Use Case |
|------|-------|----------|
| `jungle-floor.png` | Dense jungle | Primary terrain under canopy |
| `mud-ground.png` | Wet mud | Trail surfaces, monsoon areas |
| `rice-paddy.png` | Flooded field | Mekong Delta rice paddies |
| `rocky-highland.png` | Grey limestone | A Shau Valley, Central Highlands |
| `river-bank.png` | Wet sand/silt | River edges, stream banks |
| `red-laterite.png` | Red earth | Highland roads, cleared areas |
| `tall-grass.png` | Dense grass | Open field areas |
| `bamboo-floor.png` | Leaf litter | Under bamboo groves |
| `swamp.png` | Stagnant water | Mekong Delta swamps |
| `sandy-beach.png` | Tan sand | Coastal operations (Da Nang) |
| `defoliated-ground.png` | Dead earth | Agent Orange aftermath zones |
| `firebase-ground.png` | Compacted dirt | Military camp perimeters |

**Integration:** Applied to chunk geometry via `MeshStandardMaterial` with `NearestFilter` for both `minFilter` and `magFilter`. Use `THREE.RepeatWrapping` for tiling. Reference: `AssetLoader.ts`.

### vegetation/ - Billboard Plant Sprites (13 sprites)

Transparent PNG vegetation for the billboard placement system.

| File | Plant Type | Scale Reference |
|------|-----------|-----------------|
| `jungle-fern.png` | Tropical fern cluster | ~1m tall |
| `elephant-ear-plants.png` | Large tropical leaves | ~1.5m tall |
| `fan-palm-cluster.png` | Fan palm grouping | ~3m tall |
| `coconut-palm.png` | Tall coconut palm | ~8-12m tall |
| `areca-palm-cluster.png` | Areca palm group | ~4-6m tall |
| `dipterocarp-giant.png` | Giant hardwood tree | ~20m+ tall |
| `banyan-tree.png` | Spreading banyan | ~15m tall |
| `bamboo-grove.png` | Bamboo cluster | ~6-8m tall |
| `rice-paddy-plants.png` | Rice seedlings | ~0.5m tall |
| `banana-plant.png` | Banana/plantain | ~3-4m tall |
| `elephant-grass.png` | Tall grass | ~2-3m tall |
| `mangrove.png` | Mangrove section | ~5m tall |
| `rubber-tree.png` | Rubber tree | ~10m tall |

**Integration:** Used by `ChunkVegetationGenerator.ts`. Each vegetation type is a billboarded sprite quad facing the camera. Placed procedurally based on terrain type and biome rules.

### ui/icons/ - HUD and UI Icons (60+ icons)

All icons are transparent PNG with white or colored content. Group by prefix:

**Weapon silhouettes (11):** `weapon-{name}.png`
- m16a1, ak47, shotgun, m3a1, m1911, m60, m79, rpg7, grenade, smoke, mortar
- White silhouettes, side profile view

**Squad command icons (10):** `cmd-{name}.png`
- follow, hold, assault, defend, retreat, wedge, line, flank-left, flank-right, regroup
- White geometric NATO-style symbols

**Equipment icons (8):** `equip-{name}.png`
- sandbag, claymore, medkit, binoculars, radio, ammo, wire, flare
- White silhouettes

**Vehicle side silhouettes (9):** `vehicle-{name}.png`
- huey, cobra, spooky, phantom, jeep, apc, tank, sampan, pbr
- White side profiles

**Vehicle top-down minimap (9):** `map-{name}.png`
- Same 9 vehicles as above, top-down view for minimap/tactical overlay

**Faction insignia (4):** `faction-{name}.png`
- us (white star on olive), nva (yellow star on red), arvn (star on striped shield), vc (red star with laurel)
- Colored emblems (not white silhouettes)

**Map markers (8):** `marker-{name}.png`
- waypoint (diamond), rally (flag), lz (circle+H), objective (star), enemy (triangle), friendly (rectangle), airsupport (crosshair+wings), artillery (crosshair+burst)

**Air support calldown (5):** `air-{name}.png`
- insertion, gunrun, napalm, bombrun, medevac

**Crosshair reticles (4):** `reticle-{name}.png`
- rifle (thin cross), shotgun (circle+cross), sniper (mil-dot), machinegun (thick cross)

**Rank chevrons (8):** `rank-{name}.png`
- pfc, cpl, sgt, ssg, sfc, 1sg, lt, cpt
- Gold/yellow on dark olive circle

**Compass rose (1):** `compass-rose.png`
- Military compass with N/S/E/W cardinal directions

### ui/screens/ - Menu Backgrounds (3 screens)

Full-frame 16:9 backgrounds, no transparency. 32-bit pixel art style.

| File | Description |
|------|-------------|
| `start-screen.png` | Title screen: Huey over jungle at golden hour |
| `loadout-screen.png` | Firebase interior: weapons on table, map, radio |
| `loading-screen.png` | Aerial view from helicopter over jungle canopy |

### ui/hud/ - HUD Overlay Elements (pending)

Planned: damage-indicator.png, hit-marker.png, kill-skull.png

### skybox/ - Sky Texture (pending)

Planned: skybox.png - Vietnam tropical sky panorama

### 3D Models (GLB) - Weapons (9 models)

Low-poly game-ready GLB models generated via Kiln API (Three.js primitives).

| File | Asset | Tris | Size |
|------|-------|------|------|
| `weapons/m16a1.glb` | M16A1 Assault Rifle | ~300 | ~30 KB |
| `weapons/ak47.glb` | AK-47 Assault Rifle | ~300 | ~30 KB |
| `weapons/m60.glb` | M60 Machine Gun | 492 | 62 KB |
| `weapons/m2-browning.glb` | M2 Browning .50 Cal | 572 | 66 KB |
| `weapons/m1911.glb` | M1911 Pistol | 312 | 42 KB |
| `weapons/m79.glb` | M79 Grenade Launcher | 260 | 26 KB |
| `weapons/rpg7.glb` | RPG-7 Rocket Launcher | 320 | 33 KB |
| `weapons/ithaca37.glb` | Ithaca 37 Shotgun | 228 | 27 KB |
| `weapons/m3-grease-gun.glb` | M3 Grease Gun SMG | ~300 | ~30 KB |

### 3D Models (GLB) - Vehicles (13 models)

| File | Asset | Tris | Size |
|------|-------|------|------|
| `vehicles/aircraft/f4-phantom.glb` | F-4 Phantom Fighter-Bomber | ~800 | ~80 KB |
| `vehicles/aircraft/ac47-spooky.glb` | AC-47 Spooky Gunship | 1,272 | 109 KB |
| `vehicles/aircraft/uh1-huey.glb` | UH-1 Huey Transport | 396 | 47 KB |
| `vehicles/aircraft/uh1c-gunship.glb` | UH-1C Gunship (armed) | 508 | 57 KB |
| `vehicles/aircraft/ah1-cobra.glb` | AH-1 Cobra Attack Helo | 464 | 52 KB |
| `vehicles/aircraft/a1-skyraider.glb` | A-1 Skyraider CAS | 748 | 85 KB |
| `vehicles/ground/m151-jeep.glb` | M151 MUTT Jeep | 1,668 | 85 KB |
| `vehicles/ground/m35-truck.glb` | M35 2.5-ton Truck | 1,920 | 125 KB |
| `vehicles/ground/m113-apc.glb` | M113 APC | 716 | 69 KB |
| `vehicles/ground/m48-patton.glb` | M48 Patton Tank | 1,128 | 111 KB |
| `vehicles/ground/pt76.glb` | PT-76 Amphibious Light Tank | 796 | 73 KB |
| `vehicles/watercraft/sampan.glb` | Vietnamese Sampan | 152 | 21 KB |
| `vehicles/watercraft/pbr.glb` | PBR Patrol Boat | 396 | 47 KB |

### 3D Models (GLB) - Structures (32 models)

| File | Asset | Tris | Size |
|------|-------|------|------|
| `structures/ammo-crate.glb` | Ammo Crate (animated) | 240 | 35 KB |
| `structures/sandbag-wall.glb` | Sandbag Wall Section | ~200 | ~20 KB |
| `structures/sandbag-bunker.glb` | Sandbag Bunker (U-shaped) | 208 | 31 KB |
| `structures/foxhole.glb` | Foxhole / Fighting Position | 324 | 44 KB |
| `structures/command-tent.glb` | Command Tent | 780 | 92 KB |
| `structures/barbed-wire-fence.glb` | Barbed Wire Fence | ~200 | ~20 KB |
| `structures/concertina-wire.glb` | Concertina Wire Roll | ~200 | ~20 KB |
| `structures/claymore-mine.glb` | M18 Claymore Mine | ~100 | ~10 KB |
| `structures/footbridge.glb` | Wooden Footbridge | ~300 | ~30 KB |
| `structures/37mm-aa.glb` | 37mm Anti-Aircraft Gun | ~400 | ~40 KB |
| `structures/helipad.glb` | Firebase Helipad | 252 | 23 KB |
| `structures/village-hut.glb` | Vietnamese Village Hut | 384 | 52 KB |
| `structures/village-hut-damaged.glb` | Village Hut (war damage) | 300 | 41 KB |
| `structures/firebase-gate.glb` | Firebase Gate Entrance | 700 | 58 KB |
| `structures/guard-tower.glb` | Guard Tower | 484 | 63 KB |
| `structures/rice-dike.glb` | Rice Paddy Dike | 168 | 24 KB |
| `structures/fuel-drum.glb` | 55-Gallon Fuel Drum | 564 | 27 KB |
| `structures/supply-crate.glb` | Wooden Supply Crate | 84 | 13 KB |
| `structures/mortar-pit.glb` | 81mm Mortar Emplacement | 180 | 22 KB |
| `structures/zpu4-aa.glb` | ZPU-4 Quad AA Gun | 756 | 72 KB |
| `structures/punji-trap.glb` | Punji Stake Trap | 168 | 27 KB |
| `structures/tunnel-entrance.glb` | VC Tunnel Entrance | 120 | 18 KB |
| `structures/sa2-sam.glb` | SA-2 Guideline SAM | 508 | 56 KB |
| `structures/radio-stack.glb` | AN/PRC-25 Radio Stack | 268 | 35 KB |
| `structures/toc-bunker.glb` | Tactical Operations Center | 436 | 57 KB |
| `structures/artillery-pit.glb` | 105mm Howitzer Emplacement | 660 | 72 KB |
| `structures/barracks-tent.glb` | GP Medium Barracks Tent | 560 | 70 KB |
| `structures/aid-station.glb` | Medical Aid Station | 544 | 72 KB |
| `structures/ammo-bunker.glb` | Reinforced Ammo Bunker | 168 | 23 KB |
| `structures/comms-tower.glb` | Radio Communications Tower | 312 | 40 KB |
| `structures/generator-shed.glb` | Diesel Generator Shed | 264 | 31 KB |
| `structures/water-tower.glb` | Elevated Water Tower | 344 | 41 KB |
| `structures/perimeter-berm.glb` | Earth/Sandbag Berm Section | 408 | 27 KB |
| `structures/latrine.glb` | Field Latrine | 132 | 17 KB |

### 3D Models (GLB) - Animals (6 models)

| File | Asset | Tris | Size |
|------|-------|------|------|
| `animals/egret.glb` | Cattle Egret | 244 | 29 KB |
| `animals/water-buffalo.glb` | Water Buffalo | 284 | 33 KB |
| `animals/macaque.glb` | Long-tailed Macaque | 252 | 24 KB |
| `animals/tiger.glb` | Indochinese Tiger | 364 | 43 KB |
| `animals/king-cobra.glb` | King Cobra | 168 | 17 KB |
| `animals/wild-boar.glb` | Wild Boar | 300 | 37 KB |

### 3D Models (GLB) - Buildings (12 models)

Urban and rural buildings for city combat (Hue, Saigon) and countryside operations.

| File | Asset | Tris | Size |
|------|-------|------|------|
| `buildings/shophouse.glb` | Vietnamese Shophouse (2-story) | 312 | 46 KB |
| `buildings/shophouse-damaged.glb` | Shophouse (combat damage) | 628 | 64 KB |
| `buildings/french-villa.glb` | French Colonial Villa | 1,880 | 256 KB |
| `buildings/concrete-building.glb` | Concrete Commercial Building | 384 | 54 KB |
| `buildings/market-stall.glb` | Open-Air Market Stall | 472 | 49 KB |
| `buildings/church.glb` | Vietnamese Catholic Church | 364 | 47 KB |
| `buildings/pagoda.glb` | Buddhist Pagoda Temple | 520 | 60 KB |
| `buildings/warehouse.glb` | Corrugated Metal Warehouse | 204 | 29 KB |
| `buildings/farmhouse.glb` | Rural Farmhouse | 276 | 36 KB |
| `buildings/rice-barn.glb` | Rice Storage Barn (stilts) | 312 | 35 KB |
| `buildings/bridge-stone.glb` | Stone Bridge | 108 | 15 KB |
| `buildings/bunker-nva.glb` | NVA Underground Bunker | 256 | 33 KB |

### Props (1 model)

| File | Asset | Tris | Size |
|------|-------|------|------|
| `props/wooden-barrel.glb` | Wooden Barrel | ~200 | ~20 KB |

**3D Model totals:** 75 GLB models, ~24,000 tris combined, ~3.5 MB total

**Integration:** Load GLBs with Three.js `GLTFLoader`. All models are Y-up, face +Z, ground at Y=0. Materials use `flatShading: true` for low-poly game aesthetic.

## Still Needed (Generation Pending)

### 2D (Gemini image gen - run when rate limit resets):
- `ui/icons/marker-waypoint.png` - Redo (exists but needs cleanup)
- `ui/icons/marker-objective.png` - Redo (exists but needs cleanup)
- `ui/hud/damage-indicator.png` - Directional damage arc (red)
- `ui/hud/hit-marker.png` - Hit confirmation X
- `ui/hud/kill-skull.png` - Kill notification skull
- `skybox/skybox.png` - Vietnam sky panorama
- `ui/screens/match-end-screen.png` - Debrief/match end background

Scripts ready to run:
- `pixel-forge/scripts/gen-sprint3-fix.ts` - waypoint + objective redos
- `pixel-forge/scripts/gen-sprint4-2d.ts` - match end bg, HUD icons, skybox

## Art Style Notes

- All 2D sprites are **32-bit high-res pixel art** with visible pixels, bright saturated colors, black pixel outlines
- Sprites match existing US and VC sprites already in `public/assets/`
- Textures are retro SNES-style with 16-24 color palettes, chunky pixel blocks
- All icons are clean geometric shapes designed to be readable at small sizes (32-64px)
- Convert to WebP before deploying to production (significant file size savings)

## File Naming Convention

- `{name}.png` - Final cleaned asset with transparent background
- `{name}_raw.png` - Raw Gemini generation before BiRefNet background removal
- Keep both files: raw is useful for regenerating with different post-processing

## Generation Pipeline Reference

Assets were generated using Pixel Forge (`../pixel-forge/`):

1. **Sprites/Icons:** Gemini nano-banana-pro -> BiRefNet bg removal -> chroma cleanup
2. **Textures:** FLUX 2 + Seamless Texture LoRA -> 32px downscale -> 24 color quantize -> 512px upscale
3. **Faction insignia:** Gemini -> green chroma key only (no BiRefNet - destroys colors)
4. **Screen backgrounds:** Gemini 16:9 -> no post-processing (full-frame)
5. **Soldier sprites:** T-pose reference + pose reference dual-image workflow
6. **3D GLB models:** Kiln API (Claude Agent SDK) -> Three.js primitives code -> headless GLB export via `@gltf-transform/core`

2D scripts in `../pixel-forge/scripts/gen-*.ts`, 3D scripts in `../pixel-forge/scripts/gen-*.py`.
