# Asset Manifest - Terror in the Jungle

Last updated: 2026-02-22
Status: DRAFT - Generation queue for Pixel Forge agent

## Context for Asset Generation Agent

### What This Game Is

Terror in the Jungle is a **browser-based 3D war simulation engine** built on Three.js r182 (WebGPU/WebGL). It is NOT a single game - it is an engine that powers multiple game modes at different scales:

- **Squad Skirmish (8v8):** Fast tactical FPS. Player leads a fire team, issues move/hold/assault orders to 4-8 AI squad members. Small jungle map, single objective.
- **Zone Control (30-60 per side):** Multiple capture zones across a medium map. Player commands 2-4 squads while fighting alongside them.
- **Open Frontier (60-120 per side):** Large map with vehicle combat (helicopters, jeeps, APCs). Player is both ground combatant and field commander.
- **A Shau Valley (1500+ per side):** Historical 21km DEM terrain. Full combined arms: helicopters, air support, artillery, multiple factions (US+ARVN vs NVA+VC). Player directs battalion-level operations via RTS overlay while fighting in first person.
- **Theater (future):** Full Vietnam map simulation with province-level control and strategic campaign.

The core loop: **Play in first person AND command simultaneously.** The player holds a rifle AND a radio. They can snap between FPS combat and overhead tactical map view in real-time (no time slowdown). All commanding happens under fire.

### How Assets Are Used In-Engine

The game source code is at `C:\Users\Mattm\X\games-3d\terror-in-the-jungle`. Reference it if you need to understand how an asset is loaded, rendered, or animated. Key files:

- **Asset loading:** `src/systems/assets/AssetLoader.ts` - loads textures, applies mipmaps, downscales
- **Helicopter rendering:** `src/systems/helicopter/HelicopterGeometry.ts` - current procedural mesh (to be replaced by GLB)
- **Weapon rendering:** `src/systems/combat/ProgrammaticGunFactory.ts` - current box-geometry weapons (to be replaced)
- **NPC sprites:** `src/systems/combat/CombatantMeshFactory.ts` - billboard sprite system (18 InstancedMesh)
- **Vegetation:** `src/systems/terrain/ChunkVegetationGenerator.ts` - billboard placement on terrain
- **Terrain textures:** Applied via `THREE.MeshStandardMaterial` to chunk geometry
- **GLB loading:** Will use `THREE.GLTFLoader` - named mesh parts accessed via `model.getObjectByName('partName')`

**Current state:** The game has ZERO GLB files. All 3D objects are currently procedural geometry (boxes, cylinders, planes). All vegetation and NPCs are 2D billboard sprites. This manifest covers the full replacement of procedural geometry with proper models PLUS all new assets needed for the roadmap.

### Art Direction

- Vietnam War era (1955-1975), historically accurate equipment and uniforms
- **32-bit high-res pixel art** aesthetic for all 2D sprites - detailed with visible pixels, bright saturated colors, black pixel outlines (matches existing NPC and vegetation assets)
- Military color palette: jungle green, bright green, dark green, khaki, brown, dark earth
- HUD uses NATO convention: Blue = US/allied, Red = OPFOR/enemy, Amber = accent/warning
- All 3D models exported as GLB (binary glTF 2.0) format
- Triangle budgets are strict - this runs on phones and laptops
- PBR materials (metalness/roughness workflow)
- Proper mesh part naming for runtime animation and manipulation
- 2D sprites output as PNG with transparency, converted to WebP at integration time

### Sprite Generation Pipeline

**Every 2D sprite prompt MUST use this style suffix:**

```
32-bit pixel art sprite, high-res pixel art style, detailed with visible pixels, bright saturated colors, black pixel outlines, clean hard edges, no anti-aliasing, no blur, game asset on solid {BG_COLOR} background, entire background is flat solid {BG_COLOR} with no gradients
```

**Prompt structure:** `{subject description}, {style suffix with chosen bg color}`

**Background Color Selection:** Pick a bg color that does NOT conflict with the asset's dominant colors. Maximum contrast = cleanest BiRefNet separation.

| Asset Colors | Use Background | Avoid |
|---|---|---|
| Greens, browns (vegetation, terrain) | Magenta #FF00FF | Red, green |
| Skin tones, khaki, olive (soldiers) | Magenta #FF00FF | Red, brown, green |
| Red/orange subjects (fire, explosions) | Blue #0000FF | Red, magenta |
| Blue subjects (water, sky) | Magenta #FF00FF | Blue |
| White/grey subjects (icons, UI) | Magenta #FF00FF or Blue #0000FF | White |
| Mixed/unknown | Magenta #FF00FF (safest default) | Red |

**Post-processing pipeline:**
1. Gemini generates image with chosen background color
2. BiRefNet removes background (FAL API)
3. Magenta chroma cleanup removes remaining bg-colored pixels (R>150, G<100, B>150 -> transparent)

**Script:** `scripts/gen-vegetation-redo.ts` has the full pipeline with `chromaCleanMagenta()` function. Use this as reference for all sprite generation.

**What NOT to do:**
- Do NOT use red (#FF0000) for vegetation/soldier sprites - bleeds into greens/browns
- Do NOT say "painted art style", "low-poly 3D", or "stylized" - wrong aesthetic
- Do NOT ask Gemini for "transparent background" - produces checkerboard artifacts
- Do NOT skip the chroma cleanup step - BiRefNet misses interior gaps

### Pixel Forge Kiln Specs

- Primitives: boxGeo, sphereGeo, cylinderGeo, capsuleGeo, coneGeo, torusGeo, planeGeo
- Materials: gameMaterial (PBR), lambertMaterial, basicMaterial, glassMaterial (transparent canopies/windows)
- Animation: rotationTrack, positionTrack, createClip
- Constraints: Character 5K tris/5 mats, Prop 2K tris/4 mats, Environment 10K tris/8 mats
- Output: GLB (binary glTF 2.0) with embedded materials and animations

### Three.js Reference

Full documentation for the rendering engine: https://threejs.org/docs/llms-full.txt

---

## 1. VEHICLES - Aircraft

### 1.1 UH-1 Iroquois "Huey" (Transport)
- **Priority:** HIGH (replaces existing procedural geometry)
- **Category:** environment
- **Tri budget:** 5000
- **Prompt:** "Vietnam War UH-1H Huey helicopter, olive drab US Army, landing skids, open side doors, two door-mounted M60 machine guns, white star insignia on fuselage, antenna mast"
- **Required mesh parts (named):**
  - `fuselage` - main body
  - `mainRotor` - main rotor assembly (animated: Y-axis rotation)
  - `mainBlade1`, `mainBlade2` - individual blades on mainRotor
  - `tailRotor` - tail rotor assembly (animated: Z-axis rotation)
  - `tailBlade1`, `tailBlade2` - individual tail blades
  - `doorGunLeft` - left M60 mount (animated: pitch/yaw for aiming)
  - `doorGunRight` - right M60 mount (animated: pitch/yaw for aiming)
  - `doorLeft` - left cargo door (animated: slide open/close)
  - `doorRight` - right cargo door
  - `skidLeft`, `skidRight` - landing skids
  - `cockpitGlass` - windscreen (semi-transparent material)
- **Animations:** Rotor spin (main + tail), door gun traverse
- **Scale:** ~14m nose to tail, ~2.9m fuselage height
- **Reference:** Bell UH-1H, standard US Army transport configuration

### 1.2 UH-1C Gunship
- **Priority:** HIGH
- **Category:** environment
- **Tri budget:** 5000
- **Prompt:** "Vietnam War UH-1C gunship helicopter, olive drab, rocket pod pylons on both sides (M200 19-tube rocket launchers), chin-mounted M134 minigun, shorter cabin than transport variant, US Army markings"
- **Required mesh parts:**
  - Same as 1.1 (fuselage, rotors, skids, cockpit) PLUS:
  - `rocketPodLeft`, `rocketPodRight` - wing-mounted rocket launchers
  - `minigun` - chin-mounted M134 (animated: barrel rotation)
  - `minigunBarrels` - rotating barrel assembly
  - `pylonLeft`, `pylonRight` - weapon mounting pylons
- **Animations:** Rotor spin, minigun barrel rotation
- **Scale:** Same as Huey transport

### 1.3 AH-1 Cobra Attack Helicopter
- **Priority:** MEDIUM
- **Category:** environment
- **Tri budget:** 5000
- **Prompt:** "Vietnam War AH-1G Cobra attack helicopter, narrow tandem cockpit, chin turret with minigun, stub wings with rocket pods, olive drab, US Army"
- **Required mesh parts:**
  - `fuselage` - narrow attack profile
  - `mainRotor`, `tailRotor` - with blades
  - `chinTurret` - nose turret (animated: pitch/yaw)
  - `turretGun` - minigun in turret
  - `stubWingLeft`, `stubWingRight` - weapon pylons
  - `rocketPodLeft`, `rocketPodRight`
  - `cockpitFront`, `cockpitRear` - tandem canopy (transparent)
  - `skidLeft`, `skidRight`
- **Scale:** ~16m length, ~1.3m fuselage width (narrow)

### 1.4 AC-47 "Spooky" Gunship
- **Priority:** MEDIUM
- **Category:** environment
- **Tri budget:** 8000
- **Prompt:** "Vietnam War AC-47 Spooky gunship, Douglas DC-3/C-47 airframe, three side-mounted SUU-11 miniguns visible in cargo door and windows on left side, olive drab, USAF markings, twin radial engines with propellers"
- **Required mesh parts:**
  - `fuselage` - C-47 transport body
  - `wingLeft`, `wingRight` - with engine nacelles
  - `propLeft`, `propRight` - propeller discs (animated: rotation)
  - `tailSection` - empennage with control surfaces
  - `minigun1`, `minigun2`, `minigun3` - left-side door/window guns (animated: depression angle)
  - `cargoDoor` - left side cargo door (open position)
  - `landingGearMain`, `landingGearTail` - fixed gear
- **Animations:** Propeller spin, pylon turn (orbiting flight pattern is code-driven)
- **Scale:** ~19m wingspan, ~19.4m length

### 1.5 F-4 Phantom II
- **Priority:** LOW
- **Category:** environment
- **Tri budget:** 5000
- **Prompt:** "Vietnam War F-4 Phantom II jet fighter-bomber, USAF camouflage (green/tan over light gray), twin engines, upturned wingtips, centerline fuel tank, wing-mounted bombs/napalm canisters"
- **Required mesh parts:**
  - `fuselage`, `wingLeft`, `wingRight`
  - `tailLeft`, `tailRight` - twin vertical stabilizers
  - `intakeLeft`, `intakeRight` - engine intakes
  - `canopyFront`, `canopyRear` - tandem cockpit (transparent)
  - `pylonCenter` - centerline hardpoint
  - `pylonLeft1`, `pylonLeft2`, `pylonRight1`, `pylonRight2` - wing hardpoints
  - `bomb1` through `bomb4` - detachable ordnance (animated: release)
- **Scale:** ~19m length, ~11.7m wingspan

### 1.6 A-1 Skyraider
- **Priority:** LOW
- **Category:** environment
- **Tri budget:** 5000
- **Prompt:** "Vietnam War A-1 Skyraider (AD-6/A-1H), single-seat propeller attack aircraft, USAF or VNAF markings, multiple wing hardpoints loaded with bombs and napalm, large radial engine, olive drab or aluminum finish"
- **Required mesh parts:**
  - `fuselage`, `wing` (single low wing)
  - `propeller` - large Hamilton Standard prop (animated: rotation)
  - `engine` - Wright R-3350 cowling
  - `canopy` - single seat (transparent)
  - `landingGearLeft`, `landingGearRight`, `tailWheel`
  - `hardpoint1` through `hardpoint8` - wing pylons
  - `ordnance1` through `ordnance8` - detachable stores
  - `tailSection`
- **Scale:** ~11.8m length, ~15.2m wingspan

---

## 2. VEHICLES - Ground

### 2.1 M151 MUTT (Jeep)
- **Priority:** MEDIUM
- **Category:** environment
- **Tri budget:** 3000
- **Prompt:** "Vietnam War M151 MUTT military jeep, olive drab, open top, windshield folded down, pedestal-mounted M60 machine gun on rear, canvas seats, spare tire on back, US Army star on hood"
- **Required mesh parts:**
  - `body` - jeep body/chassis
  - `wheelFL`, `wheelFR`, `wheelRL`, `wheelRR` - wheels (animated: rotation)
  - `steeringWheel` - (animated: rotation for turning)
  - `gunMount` - rear M60 pedestal (animated: yaw 360)
  - `gunBarrel` - M60 barrel (animated: pitch)
  - `windshield` - foldable windshield frame
  - `spareTire` - rear-mounted spare
  - `hood` - with insignia
- **Scale:** ~3.4m length, ~1.6m width, ~1.8m height

### 2.2 M113 Armored Personnel Carrier
- **Priority:** MEDIUM
- **Category:** environment
- **Tri budget:** 5000
- **Prompt:** "Vietnam War M113 APC, aluminum hull, .50 caliber M2 Browning on commander cupola, rear ramp door, track assemblies, olive drab, US Army 'Big Red One' or similar markings, antenna whip"
- **Required mesh parts:**
  - `hull` - main armored body
  - `trackLeft`, `trackRight` - track assemblies (animated: scroll texture)
  - `cupola` - commander's ring mount (animated: yaw 360)
  - `turretGun` - M2 .50 cal (animated: pitch)
  - `rearRamp` - troop ramp (animated: open/close hinge)
  - `hatchCommander` - commander hatch (animated: open/close)
  - `hatchDriver` - driver hatch
  - `antenna` - radio antenna whip
  - `driveWheelLeft`, `driveWheelRight` - sprockets
- **Scale:** ~4.9m length, ~2.7m width, ~2.5m height
- **Passengers:** Up to 11 troops in rear compartment

### 2.3 M48 Patton Tank
- **Priority:** LOW
- **Category:** environment
- **Tri budget:** 8000
- **Prompt:** "Vietnam War M48A3 Patton tank, cast hull and turret, 90mm main gun, .50 cal commander cupola gun, searchlight on turret, olive drab, USMC or US Army markings"
- **Required mesh parts:**
  - `hull` - cast hull body
  - `turret` - main turret (animated: yaw 360)
  - `mainGun` - 90mm barrel (animated: pitch -10 to +20)
  - `commanderCupola` - cupola ring (animated: yaw 360)
  - `cupolaGun` - .50 cal (animated: pitch)
  - `trackLeft`, `trackRight` - with road wheels
  - `hatchCommander`, `hatchLoader` - turret hatches
  - `searchlight` - infrared searchlight on turret
  - `exhaustLeft`, `exhaustRight` - engine exhausts
- **Scale:** ~8.7m length (with gun), ~3.6m width, ~3.1m height

### 2.4 PT-76 Amphibious Tank (NVA)
- **Priority:** LOW
- **Category:** environment
- **Tri budget:** 5000
- **Prompt:** "Vietnam War PT-76 Soviet amphibious light tank, NVA markings (red star), 76mm main gun, flat low-profile turret, water trim vane on bow, olive/dark green"
- **Required mesh parts:**
  - `hull` - boat-shaped hull
  - `turret` - flat turret (animated: yaw 360)
  - `mainGun` - 76mm barrel (animated: pitch)
  - `trackLeft`, `trackRight`
  - `trimVane` - bow wave deflector (animated: raise/lower)
  - `hatchCommander`
- **Scale:** ~7.6m length, ~3.1m width

### 2.5 Deuce-and-a-Half (M35 Cargo Truck)
- **Priority:** MEDIUM
- **Prompt:** "Vietnam War M35 2.5-ton military cargo truck, olive drab, canvas-covered cargo bed, dual rear axle, open cab, US Army markings"
- **Category:** environment
- **Tri budget:** 4000
- **Required mesh parts:**
  - `cab` - driver cab
  - `cargoBed` - rear cargo area
  - `canvasCover` - removable cargo cover
  - `wheelFL`, `wheelFR` - front wheels (animated: rotation + steering)
  - `wheelRL1`, `wheelRL2`, `wheelRR1`, `wheelRR2` - dual rear wheels
  - `tailgate` - rear drop gate (animated: open/close)
  - `windshield` - front glass
- **Scale:** ~6.7m length, ~2.4m width
- **Passengers:** 16 troops in cargo bed

---

## 3. VEHICLES - Watercraft

### 3.1 Sampan
- **Priority:** MEDIUM
- **Category:** prop
- **Tri budget:** 2000
- **Prompt:** "Vietnamese river sampan, flat-bottomed wooden boat, bamboo canopy/sun shade, single oar or small outboard motor, weathered wood, ~5m long"
- **Required mesh parts:**
  - `hull` - wooden boat hull
  - `canopy` - bamboo shade structure
  - `oar` - sculling oar (animated: rowing motion)
  - `seat1`, `seat2` - passenger positions
- **Scale:** ~5m length, ~1.5m width

### 3.2 PBR Mark II (Patrol Boat River)
- **Priority:** LOW
- **Category:** environment
- **Tri budget:** 5000
- **Prompt:** "Vietnam War PBR Mark II patrol boat, fiberglass hull, twin .50 caliber turret forward, single .50 cal aft, M60 amidships, radar mast, US Navy brown water markings, ~9.6m length"
- **Required mesh parts:**
  - `hull` - fiberglass hull
  - `cabinTop` - armored cockpit
  - `turretForward` - twin .50 cal mount (animated: yaw/pitch)
  - `turretAft` - rear .50 cal (animated: yaw/pitch)
  - `gunAmidships` - M60 mount
  - `radarMast` - antenna/radar
  - `helm` - steering station
  - `engineCover` - rear engine housing
- **Scale:** ~9.6m length, ~3.5m width

---

## 4. WEAPONS - Player Viewmodels (First-Person)

These replace the current procedural box geometry. Should look accurate from first-person perspective.

### 4.1 M16A1 Assault Rifle
- **Priority:** HIGH
- **Category:** prop
- **Tri budget:** 2000
- **Prompt:** "M16A1 assault rifle, Vietnam War era, triangular handguard, 20-round straight magazine, carry handle with rear sight, forward assist, black furniture, right-side view as if held by player"
- **Required mesh parts:**
  - `body` - receiver, stock, handguard
  - `magazine` - detachable (animated: remove/insert for reload)
  - `chargingHandle` - (animated: pull back for reload)
  - `trigger` - trigger guard assembly
  - `muzzle` - flash hider (muzzle flash spawn point)
  - `carryHandle` - integral carry handle/sight
- **Animations:** Reload (magazine drop, insert, charging handle), fire recoil

### 4.2 AK-47 Assault Rifle
- **Priority:** HIGH
- **Category:** prop
- **Tri budget:** 2000
- **Prompt:** "AK-47 assault rifle, wooden furniture (stock, handguard, pistol grip), curved 30-round steel magazine, milled receiver, right-side view"
- **Required mesh parts:**
  - `body` - receiver, stock, barrel
  - `magazine` - curved mag (animated: remove/insert)
  - `chargingHandle` - right-side bolt handle (animated: pull)
  - `trigger`
  - `muzzle` - muzzle brake
  - `dustCover` - ejection port cover
- **Animations:** Reload, fire recoil

### 4.3 M60 General Purpose Machine Gun
- **Priority:** HIGH
- **Category:** prop
- **Tri budget:** 2500
- **Prompt:** "M60 machine gun, belt-fed 7.62mm, bipod folded, carrying handle, ammunition belt dangling, Vietnam War era, right-side view"
- **Required mesh parts:**
  - `body` - receiver, stock, barrel
  - `barrel` - removable barrel (animated: barrel change)
  - `bipod` - folding bipod (animated: deploy/fold)
  - `feedCover` - feed tray cover (animated: open for reload)
  - `ammoBelt` - visible belt feed (animated: belt movement during fire)
  - `carryHandle`
  - `muzzle` - flash hider
- **Animations:** Belt feed during fire, reload (open cover, load belt), bipod deploy

### 4.4 Ithaca 37 Shotgun
- **Priority:** MEDIUM
- **Category:** prop
- **Tri budget:** 2000
- **Prompt:** "Ithaca 37 pump-action shotgun, Vietnam War trench gun, wooden stock, bottom-ejecting, short barrel, parkerized finish"
- **Required mesh parts:**
  - `body` - receiver, stock, barrel
  - `pumpGrip` - slide action (animated: pump back/forward)
  - `trigger`
  - `muzzle`
- **Animations:** Pump action cycle, shell load

### 4.5 M1911A1 Pistol
- **Priority:** MEDIUM
- **Category:** prop
- **Tri budget:** 1500
- **Prompt:** "M1911A1 .45 caliber pistol, Vietnam War era, parkerized finish, checkered grips, right-side view as held in one hand"
- **Required mesh parts:**
  - `body` - frame, grip
  - `slide` - reciprocating slide (animated: blowback on fire)
  - `magazine` - detachable (animated: drop/insert for reload)
  - `hammer` - (animated: cock/fire)
  - `muzzle`
- **Animations:** Slide blowback on fire, reload (magazine swap)

### 4.6 M79 Grenade Launcher
- **Priority:** MEDIUM
- **Category:** prop
- **Tri budget:** 1500
- **Prompt:** "M79 grenade launcher, break-action single shot, wooden stock and forend, short barrel, front sight, Vietnam War era"
- **Required mesh parts:**
  - `body` - stock, receiver
  - `barrel` - hinged barrel (animated: break open for reload)
  - `sight` - front leaf sight
  - `trigger`
  - `muzzle` - barrel end (grenade spawn point)
- **Animations:** Break open, load round, close

### 4.7 RPG-7 Rocket Launcher
- **Priority:** MEDIUM
- **Category:** prop
- **Tri budget:** 2000
- **Prompt:** "RPG-7 rocket-propelled grenade launcher, NVA/VC weapon, wooden heat shield, PG-7V warhead loaded, optical sight, shoulder-fired position"
- **Required mesh parts:**
  - `body` - launch tube, pistol grip, heat shield
  - `warhead` - PG-7V rocket grenade (detachable, animated: load)
  - `sight` - PGO-7 optical sight
  - `trigger`
  - `muzzle` - rear blast cone
- **Animations:** Load warhead, fire (warhead detach + backblast)

### 4.8 M2 Browning .50 Caliber (Mounted)
- **Priority:** HIGH
- **Category:** prop
- **Tri budget:** 2500
- **Prompt:** "M2 Browning .50 caliber heavy machine gun on M3 tripod mount, belt-fed, spade grips, T&E mechanism for traverse and elevation, ammunition box attached, olive drab"
- **Required mesh parts:**
  - `body` - receiver
  - `barrel` - heavy barrel with perforated jacket
  - `spadeGrips` - dual handles (animated: traverse input)
  - `tripod` - M3 tripod base
  - `traverseMech` - T&E mechanism (animated: yaw)
  - `elevationMech` - (animated: pitch)
  - `feedCover` - (animated: open for reload)
  - `ammoBox` - belt box
  - `ammoBelt` - visible belt (animated: feed)
  - `muzzle`
- **Animations:** Traverse, elevate, belt feed, reload
- **Usage:** Objective defense emplacement, vehicle-mounted

---

## 5. STRUCTURES & Fortifications

### 5.1 Sandbag Wall Section
- **Priority:** HIGH
- **Category:** prop
- **Tri budget:** 1000
- **Prompt:** "Military sandbag wall section, 4 bags wide by 3 bags high, olive/tan burlap bags filled with sand, slightly irregular stacking, ~2m wide, ~1m tall"
- **Required mesh parts:**
  - `wall` - solid sandbag wall (single mesh OK)
- **Scale:** 2m wide, 1m tall, 0.5m deep

### 5.2 Sandbag Bunker
- **Priority:** HIGH
- **Category:** environment
- **Tri budget:** 3000
- **Prompt:** "Vietnam War field bunker, sandbag walls with timber/PSP roof covered in sandbags, firing slit opening in front, entrance in rear, radio antenna, ~4m wide"
- **Required mesh parts:**
  - `walls` - sandbag perimeter
  - `roof` - timber + sandbag roof
  - `firingSlot` - front opening
  - `entrance` - rear opening
  - `antenna` - radio whip antenna
- **Scale:** ~4m wide, ~3m deep, ~2m height

### 5.3 Guard Tower
- **Priority:** MEDIUM
- **Category:** environment
- **Tri budget:** 3000
- **Prompt:** "Vietnam War firebase guard tower, wooden construction, 3 stories, sandbag fighting position on top, ladder access, corrugated tin roof, searchlight"
- **Required mesh parts:**
  - `structure` - main frame (legs, platforms)
  - `fightingPosition` - top sandbag ring
  - `roof` - corrugated tin
  - `ladder` - access ladder
  - `searchlight` - mounted light (animated: rotation)
- **Scale:** ~8m tall, ~3m base

### 5.4 Vietnamese Village Hut
- **Priority:** MEDIUM
- **Category:** environment
- **Tri budget:** 3000
- **Prompt:** "Vietnamese village house on stilts, thatched palm roof, bamboo and wooden walls, raised floor, ladder to entrance, ~5m wide, historically accurate rural Vietnam"
- **Required mesh parts:**
  - `stilts` - support posts
  - `floor` - raised platform
  - `walls` - bamboo/wood walls
  - `roof` - thatched palm leaf roof
  - `ladder` - entry ladder
  - `doorway` - main entrance
- **Scale:** ~5m wide, ~4m deep, ~4m total height

### 5.5 Firebase Gate / Entrance
- **Priority:** MEDIUM
- **Category:** environment
- **Tri budget:** 3000
- **Prompt:** "Vietnam War firebase entrance, sandbag walls flanking a road entry, concertina wire coils on top, wooden gate/barrier arm, guard post, overhead sign area"
- **Required mesh parts:**
  - `wallLeft`, `wallRight` - sandbag walls
  - `gateBarrier` - wooden barrier arm (animated: raise/lower)
  - `wireCoils` - concertina wire
  - `guardPost` - small covered position
  - `signFrame` - overhead sign bracket
- **Scale:** ~6m wide opening, ~3m tall walls

### 5.6 Ammo Crate
- **Priority:** HIGH
- **Category:** prop
- **Tri budget:** 500
- **Prompt:** "US military wooden ammunition crate, olive drab with yellow/white stenciled markings (LOT, DODIC numbers), metal clasps, carry handles, ~0.6m long"
- **Required mesh parts:**
  - `crate` - main box
  - `lid` - top (animated: open/close hinge)
  - `clasps` - metal latches
- **Scale:** 0.6m x 0.3m x 0.3m

### 5.7 Concertina Wire Coil
- **Priority:** MEDIUM
- **Category:** prop
- **Tri budget:** 500
- **Prompt:** "Military concertina razor wire coil, stretched 2-3m section, coiled barbed wire, silver steel color, deployed defensive barrier"
- **Required mesh parts:**
  - `wire` - single coil section
- **Scale:** ~3m length deployed, ~0.6m diameter

### 5.8 Helipad (Improved)
- **Priority:** HIGH
- **Category:** environment
- **Tri budget:** 2000
- **Prompt:** "Vietnam War military helipad, PSP (pierced steel planking) surface, white circle with H marking, perimeter marker lights (green), approach lights, ~12m diameter pad"
- **Required mesh parts:**
  - `pad` - PSP steel planking surface
  - `markings` - white H and circle
  - `light1` through `light8` - perimeter lights (animated: glow)
  - `approachLights` - directional guides
- **Scale:** 12m diameter

### 5.9 Tunnel Entrance (VC)
- **Priority:** LOW
- **Category:** prop
- **Tri budget:** 1000
- **Prompt:** "Cu Chi-style Viet Cong tunnel entrance, concealed hole in ground with wooden trapdoor cover, camouflaged with leaves and dirt, ~0.6m opening"
- **Required mesh parts:**
  - `frame` - entrance frame
  - `trapdoor` - hinged cover (animated: open/close)
  - `camouflage` - leaf/dirt covering
- **Scale:** ~0.8m x 0.6m opening

### 5.10 Bridge (Wooden Footbridge)
- **Priority:** LOW
- **Category:** environment
- **Tri budget:** 2000
- **Prompt:** "Simple wooden footbridge over jungle stream, bamboo and timber construction, rope railings, weathered wood, ~6m span, ~1.5m wide"
- **Required mesh parts:**
  - `deck` - walking surface
  - `railLeft`, `railRight` - rope/bamboo railings
  - `supportLeft`, `supportRight` - bank supports
- **Scale:** ~6m length, ~1.5m width

### 5.11 Punji Stake Trap
- **Priority:** LOW
- **Category:** prop
- **Tri budget:** 500
- **Prompt:** "Viet Cong punji stake trap, shallow pit with sharpened bamboo stakes pointing upward, camouflaged leaf cover partially removed showing stakes beneath"
- **Required mesh parts:**
  - `pit` - ground depression
  - `stakes` - sharpened bamboo stakes
  - `cover` - leaf camouflage (animated: collapse when triggered)
- **Scale:** ~1m x 1m pit

---

## 6. DEFENSE SYSTEMS

### 6.1 ZPU-4 Anti-Aircraft Gun (NVA)
- **Priority:** MEDIUM
- **Category:** environment
- **Tri budget:** 3000
- **Prompt:** "ZPU-4 quad 14.5mm anti-aircraft gun, Soviet/NVA, four-barrel mount on wheeled carriage, ammunition drums, ring sight, olive/dark green"
- **Required mesh parts:**
  - `carriage` - wheeled base
  - `mount` - rotating platform (animated: yaw 360)
  - `barrels` - quad barrel assembly (animated: pitch -5 to +85)
  - `sight` - ring anti-aircraft sight
  - `ammoDrums` - 4 ammo drums
  - `seatGunner` - gunner seat
  - `wheelLeft`, `wheelRight`
- **Scale:** ~3.5m length, ~1.6m width

### 6.2 37mm Anti-Aircraft Gun (NVA)
- **Priority:** LOW
- **Category:** environment
- **Tri budget:** 3000
- **Prompt:** "Type 55 / M1939 37mm anti-aircraft autocannon, NVA, single barrel on cruciform mount with outrigger legs, ammunition clips, ring sights, olive drab"
- **Required mesh parts:**
  - `mount` - cruciform base with outriggers
  - `turret` - rotating assembly (animated: yaw 360)
  - `barrel` - 37mm barrel (animated: pitch 0 to +85)
  - `sight` - optical/ring sight
  - `ammoClip` - 5-round clip (animated: feed)
  - `seatGunner`, `seatLoader`
- **Scale:** ~5m deployed span

### 6.3 SA-2 Guideline SAM (NVA)
- **Priority:** LOW
- **Category:** environment
- **Tri budget:** 3000
- **Prompt:** "SA-2 Guideline surface-to-air missile on launch rail, Soviet/NVA, single missile on rotating launcher pedestal, fan song radar nearby optional, olive/gray"
- **Required mesh parts:**
  - `launchRail` - inclined rail (animated: elevation 15-80)
  - `pedestal` - rotating base (animated: yaw 360)
  - `missile` - SA-2 missile body (detachable: launch animation)
  - `booster` - missile booster section
  - `fins` - cruciform fins
- **Scale:** ~10.6m missile length, rail ~12m

---

## 7. ANIMALS

### 7.1 Water Buffalo
- **Priority:** MEDIUM
- **Category:** character
- **Tri budget:** 3000
- **Prompt:** "Vietnamese water buffalo (Bubalus bubalis), dark gray/black hide, large curved horns sweeping backward, stocky muscular build, standing pose, ~1.5m shoulder height"
- **Required mesh parts:**
  - `body` - torso
  - `head` - with horns
  - `legFL`, `legFR`, `legRL`, `legRR` - legs (animated: walk cycle)
  - `tail` - (animated: idle swish)
- **Animations:** Idle (breathing, tail swish), walk, run (flee), graze (head down)
- **Behavior:** Passive, flees from gunfire, blocking obstacle

### 7.2 Macaque Monkey
- **Priority:** MEDIUM
- **Category:** character
- **Tri budget:** 1500
- **Prompt:** "Vietnamese macaque monkey, brown/gray fur, long tail, crouching/sitting on branch pose, ~0.5m body length"
- **Required mesh parts:**
  - `body` - torso
  - `head` - with expressive face
  - `armLeft`, `armRight` - (animated: gestures)
  - `legLeft`, `legRight`
  - `tail` - long tail (animated: curl/wave)
- **Animations:** Idle sit, climb, screech alert, flee
- **Behavior:** Neutral, scatters on proximity, screech alerts nearby NPCs

### 7.3 Tiger
- **Priority:** LOW
- **Category:** character
- **Tri budget:** 3000
- **Prompt:** "Indochinese tiger, orange with black stripes, muscular low stalking pose, Vietnam jungle predator, ~2.5m nose to tail"
- **Required mesh parts:**
  - `body`, `head`
  - `legFL`, `legFR`, `legRL`, `legRR` (animated: walk/run/pounce)
  - `tail` (animated: swish)
  - `jaw` (animated: open for roar)
- **Animations:** Stalk, pounce, idle, roar
- **Behavior:** Aggressive when close, rare spawn, attacks lone soldiers

### 7.4 Snake (King Cobra)
- **Priority:** LOW
- **Category:** prop
- **Tri budget:** 500
- **Prompt:** "King cobra snake, coiled defensive posture with raised hood, olive/brown coloring, Vietnam jungle ground level, ~2m body length"
- **Required mesh parts:**
  - `body` - coiled snake form
  - `hood` - expanded hood (animated: raise/lower)
  - `head` - strike pose
- **Animations:** Idle coil, strike, slither
- **Behavior:** Hidden in vegetation, damage on proximity/step

### 7.5 Wild Boar
- **Priority:** LOW
- **Category:** character
- **Tri budget:** 2000
- **Prompt:** "Vietnamese wild boar, dark bristled coat, short tusks, stocky build, ~0.8m shoulder height"
- **Required mesh parts:**
  - `body`, `head` (with tusks)
  - `legFL`, `legFR`, `legRL`, `legRR` (animated: walk/charge)
  - `tail`
- **Animations:** Idle, walk, charge, flee
- **Behavior:** Neutral, charges if cornered, can be hunted (survival mode food)

### 7.6 Bird Flock (Egrets)
- **Priority:** LOW
- **Category:** prop
- **Tri budget:** 500 (for group)
- **Prompt:** "Flock of 5 white egrets/herons in flight formation, wings spread, Vietnam wetland birds, simple low-poly"
- **Required mesh parts:**
  - `bird1` through `bird5` - individual birds
  - Each bird: `body`, `wingLeft`, `wingRight` (animated: flap)
- **Animations:** Flap cycle, scatter burst
- **Behavior:** Ambient decoration, scatter on gunfire/explosions (visual only)

---

## 8. TERRAIN TEXTURES (fal-ai/flux-lora + Seamless Texture LoRA)

All textures are seamless/tileable. 512x512 PNG, ~24 colors, pixel art post-processed.
Pipeline: `fal-ai/flux-lora` at 256px -> 32px nearest-neighbor downscale -> 24 color quantize (no dither) -> 512px upscale.
Generated via scripts in `scripts/gen-textures-*.ts`, output to `war-assets/textures/`.

### 8.1 Dense Jungle Floor - DONE
- **File:** `war-assets/textures/jungle-floor.png`
- Deep greens and dark browns, tropical Vietnam jungle. No orange/yellow.

### 8.2 Mud Ground - DONE
- **File:** `war-assets/textures/mud-ground.png`
- Wet muddy ground surface, dark brown with puddles and pebbles.

### 8.3 Rice Paddy - DONE
- **File:** `war-assets/textures/rice-paddy.png`
- Flooded rice field, green seedlings in rows over muddy water.

### 8.4 Rocky Highland - DONE
- **File:** `war-assets/textures/rocky-highland.png`
- Grey limestone and tan sandstone, sparse dry grass. Central Highlands / A Shau.

### 8.5 River Bank - DONE
- **File:** `war-assets/textures/river-bank.png`
- Wet sand and silt, river pebbles, driftwood.

### 8.6 Red Laterite Soil - DONE
- **File:** `war-assets/textures/red-laterite.png`
- Red-orange earth, cracked clay, loose gravel. Vietnam highland roads.

### 8.7 Tall Grass - DONE
- **File:** `war-assets/textures/tall-grass.png`
- Dense tropical green grass, lush and wet. No yellow.

### 8.8 Bamboo Floor - DONE
- **File:** `war-assets/textures/bamboo-floor.png`
- Dark bamboo leaf litter on dark earth, dark green and brown tones.

### 8.9 Swamp - DONE
- **File:** `war-assets/textures/swamp.png`
- Dark stagnant water with green algae, waterlogged mud. Mekong Delta.

### 8.10 Sandy Beach - DONE
- **File:** `war-assets/textures/sandy-beach.png`
- Damp tan sand with shells and pebbles. Coastal operations (Da Nang).

### 8.11 Defoliated Ground - DONE
- **File:** `war-assets/textures/defoliated-ground.png`
- Dead barren grey-brown earth, dead stumps. Agent Orange aftermath.

### 8.12 Firebase Ground - DONE
- **File:** `war-assets/textures/firebase-ground.png`
- Compacted brown dirt, tire tracks, boot prints. Military camp perimeter.

---

## 9. VEGETATION BILLBOARDS (Pixel Forge Sprite Generator)

**Generation:** Use standard sprite pipeline (see "Sprite Generation Pipeline" above). Prompts below are SUBJECT DESCRIPTIONS ONLY - append the standard style suffix when generating. Output: PNG with transparency via magenta pipeline, convert to WebP at integration.

### 9.1 Jungle Fern - DONE
- **File:** `war-assets/vegetation/jungle-fern.png`

### 9.2 Elephant Ear Plants - DONE
- **File:** `war-assets/vegetation/elephant-ear-plants.png`

### 9.3 Fan Palm Cluster - DONE
- **File:** `war-assets/vegetation/fan-palm-cluster.png`

### 9.4 Coconut Palm - DONE
- **File:** `war-assets/vegetation/coconut-palm.png`

### 9.5 Areca Palm Cluster - DONE
- **File:** `war-assets/vegetation/areca-palm-cluster.png`

### 9.6 Dipterocarp Giant - DONE
- **File:** `war-assets/vegetation/dipterocarp-giant.png`

### 9.7 Banyan Tree - DONE
- **File:** `war-assets/vegetation/banyan-tree.png`

### 9.8 Bamboo Grove - DONE
- **File:** `war-assets/vegetation/bamboo-grove.png`

### 9.9 Rice Paddy Plants - DONE
- **File:** `war-assets/vegetation/rice-paddy-plants.png`

### 9.10 Banana Plant - DONE
- **File:** `war-assets/vegetation/banana-plant.png`

### 9.11 Tall Elephant Grass - DONE
- **File:** `war-assets/vegetation/elephant-grass.png`

### 9.12 Mangrove Section - DONE
- **File:** `war-assets/vegetation/mangrove.png`

### 9.13 Rubber Tree - DONE
- **File:** `war-assets/vegetation/rubber-tree.png`

---

## 10. SOLDIER SPRITES (Pixel Forge Sprite Generator)

**Generation:** Use T-pose + pose reference workflow. Full docs at `docs/faction-sprite-workflow.md`. Each faction needs 9 sprites (3 directions x 3 states = walk-frame1, walk-frame2, fire for front/back/side).

### 10.1 NVA Regular Infantry - DONE
- **Files:** `war-assets/soldiers/nva-front-walk1.png` through `nva-back-fire.png` (9 sprites)
- **T-pose ref:** `war-assets/soldiers/nva-tpose-ref.png` (+ `_raw.png`)
- **Script:** `scripts/gen-nva-soldiers.ts`
- **Method:** T-pose character ref generated from VC sprite, each pose uses dual referenceImages with director-style prompts

### 10.2 ARVN (South Vietnamese) Infantry - DONE
- **Files:** `war-assets/soldiers/arvn-front-walk1.png` through `arvn-back-fire.png` (9 sprites)
- **T-pose ref:** `war-assets/soldiers/arvn-tpose-ref.png` (+ `_raw.png`)
- **Script:** `scripts/gen-arvn-soldiers.ts`
- **Method:** Dual-reference T-pose (US sprite + NVA T-pose), tiger stripe camo, M16A1

### 10.3 Viet Cong Guerrilla - DONE (existing)
- **Files:** Already exist in game at `terror-in-the-jungle/public/assets/vc-*.webp`
- **Note:** VC sprites were the original faction sprites used as pose references for NVA and ARVN

### 10.4 US Army Infantry (Existing - Optional Remake)
- **Priority:** LOW (current sprites work)
- **Prompt base:** "US Army infantryman Vietnam War, M1 steel helmet with camouflage band, OG-107 olive drab jungle fatigues, M16A1 rifle, jungle boots, canteen and ammo pouches, {POSE}, {DIRECTION} view, pixel art style"
- **Note:** Can use current us-*.webp as image input to Pixel Forge for style consistency, then modify for NVA/ARVN/VC variants

### 10.5 / 10.6 Mounted Soldier Sprites - DONE (combined)
- **Files:** `war-assets/soldiers/{us,nva,arvn}-mounted.png` (3 sprites, 1 per faction)
- **Script:** `scripts/gen-sprint3-soldiers.ts`
- **Method:** Single pose per faction - upper body (waist up), hands forward. NO weapon in sprite.
- **Usage:** Same sprite used for both door gunner and turret operator. Weapon/turret is a separate 3D mesh the sprite mounts on.

---

## 11. UI / HUD / SCREEN ASSETS (Pixel Forge Sprite Generator)

**Generation:** Icon/HUD sprites use the standard magenta pipeline. Screen backgrounds are full-frame images and do NOT use the sprite pipeline or style suffix.

### Screens & Backgrounds

### 11.1 Start Screen Background
- **Priority:** HIGH
- **Size:** 1920x1080
- **Prompt:** "Vietnam War jungle scene, atmospheric golden hour, UH-1 Huey helicopter silhouette approaching through mist over dense jungle canopy, orange/gold light beams cutting through trees, dark green jungle below fading into haze, moody cinematic composition, game title screen background, dramatic lighting, no text"

### 11.2 Loadout Screen Background
- **Priority:** MEDIUM
- **Size:** 1920x1080
- **Prompt:** "Vietnam War firebase interior, wooden table with military map, weapons laid out, ammo pouches, radio equipment, sandbag wall in background, warm lamp light, atmospheric military planning scene, no text"

### 11.3 Loading Screen Background
- **Priority:** MEDIUM
- **Size:** 1920x1080
- **Prompt:** "Vietnam War aerial view of jungle canopy from helicopter altitude, dense tropical forest stretching to horizon, river winding through, scattered clouds, golden green tones, atmospheric, no text"

### 11.4 Match End / Debrief Background
- **Priority:** LOW
- **Size:** 1920x1080
- **Prompt:** "Vietnam War dusk scene, silhouettes of soldiers walking toward distant firebase, helicopter on ground, smoke rising, dramatic orange sunset sky, end of operation mood, no text"

### Weapon Icons

### 11.5 Weapon Silhouette Icons (Set)
- **Priority:** HIGH
- **Size:** 64x64 each
- **Prompt:** "{WEAPON_NAME} silhouette icon, white on solid magenta background (#FF00FF), clean military HUD style, side profile view, 64x64 pixels"
- **Variants (11 icons):**
  - M16A1 assault rifle
  - AK-47 assault rifle
  - Ithaca 37 shotgun
  - M3A1 submachine gun (Grease Gun)
  - M1911 pistol
  - M60 machine gun
  - M79 grenade launcher
  - RPG-7 rocket launcher
  - M67 fragmentation grenade
  - M18 smoke grenade
  - Mortar tube
- **Output:** 11 individual PNG files, then run BiRefNet for transparency

### 11.6 Equipment Icons (Set)
- **Priority:** MEDIUM
- **Size:** 64x64 each
- **Prompt:** "{ITEM} icon, white on solid magenta background (#FF00FF), clean military style, 64x64 pixels"
- **Variants (8 icons):**
  - Sandbag deploy
  - Claymore mine
  - First aid kit / medkit
  - Binoculars
  - Radio (PRC-25)
  - Ammo resupply crate (small)
  - Barbed wire coil
  - Flare gun

### Vehicle Icons

### 11.7 Vehicle Silhouette Icons (Set)
- **Priority:** MEDIUM
- **Size:** 64x64 each
- **Prompt:** "{VEHICLE_NAME} silhouette icon, white on solid magenta background (#FF00FF), military HUD style, side profile view, 64x64 pixels"
- **Variants (9 icons):**
  - UH-1 Huey helicopter (side)
  - AH-1 Cobra helicopter (side)
  - AC-47 Spooky gunship (side)
  - F-4 Phantom jet (side)
  - M151 Jeep (side)
  - M113 APC (side)
  - M48 Patton tank (side)
  - Sampan boat (side)
  - PBR patrol boat (side)

### 11.8 Vehicle Top-Down Icons (Set) - for minimap/tactical map
- **Priority:** MEDIUM
- **Size:** 32x32 each
- **Prompt:** "{VEHICLE_NAME} top-down silhouette, white on solid magenta background (#FF00FF), military map symbol style, 32x32 pixels"
- **Same 9 variants as 11.7 but top-down view**

### Command & Tactical Icons

### 11.9 Squad Command Icons (Set)
- **Priority:** HIGH
- **Size:** 48x48 each
- **Prompt:** "{COMMAND} military tactical icon, white on solid magenta background (#FF00FF), NATO military symbol style, clean and readable at small size, 48x48 pixels"
- **Variants (10 icons):**
  - Follow (arrow pointing at person)
  - Hold position (stop hand / anchor)
  - Assault (forward arrow with weapon)
  - Defend (shield / fortification)
  - Retreat (backward arrow)
  - Formation wedge
  - Formation line
  - Flank left
  - Flank right
  - Regroup (converging arrows)

### 11.10 Map Marker Icons (Set)
- **Priority:** MEDIUM
- **Size:** 32x32 each
- **Prompt:** "{MARKER} military map marker, white on solid magenta background (#FF00FF), NATO-style map symbol, 32x32 pixels"
- **Variants (8 icons):**
  - Waypoint (diamond)
  - Rally point (flag)
  - LZ / landing zone (circle with H)
  - Objective (star)
  - Enemy contact (red triangle)
  - Friendly position (blue rectangle)
  - Air support target (crosshair with wings)
  - Artillery target (crosshair with burst)

### 11.11 Air Support / Calldown Icons (Set)
- **Priority:** MEDIUM
- **Size:** 48x48 each
- **Prompt:** "{SUPPORT_TYPE} military air support icon, white on solid magenta background (#FF00FF), clean silhouette, 48x48 pixels"
- **Variants (5 icons):**
  - Helicopter insertion (Huey with down arrow)
  - Gunship run (helicopter with bullet lines)
  - Napalm strike (plane with fire trail)
  - Bomb run (plane with falling bombs)
  - Medevac (helicopter with cross)

### Faction & Status

### 11.12 Faction Insignia (Set)
- **Priority:** MEDIUM
- **Size:** 64x64 each
- **Prompt:** "{FACTION} military insignia, {DESCRIPTION}, solid magenta background (#FF00FF), clean crisp style, 64x64 pixels"
- **Variants:**
  - US Army: white five-pointed star on olive drab circle
  - NVA: yellow star on red circle
  - ARVN: yellow star on red and blue striped shield
  - Viet Cong: red star on dark circle with laurel wreath

### 11.13 Rank Chevrons (Set)
- **Priority:** LOW
- **Size:** 32x32 each
- **Prompt:** "US Army rank chevron {RANK}, gold/yellow on solid magenta background (#FF00FF), 32x32 pixels"
- **Variants:** PFC (1 stripe), CPL (2), SGT (3), SSG (3+1 rocker), SFC (3+2), 1SG (3+3+diamond), LT (gold bar), CPT (double bar)

### HUD Components

### 11.14 Compass Rose
- **Priority:** MEDIUM
- **Size:** 256x256
- **Prompt:** "Military compass rose, cardinal directions (N S E W) and intercardinal, mil/degree tick marks around edge, green-tinted military style on solid magenta background (#FF00FF), 256x256"

### 11.15 Crosshair / Reticle Set
- **Priority:** MEDIUM
- **Size:** 64x64 each
- **Prompt:** "{RETICLE_TYPE} weapon crosshair reticle, white/green lines on solid magenta background (#FF00FF), thin clean lines, 64x64 pixels"
- **Variants (4):**
  - Standard rifle (simple cross with gap)
  - Shotgun (circle with cross)
  - Sniper / scoped (mil-dot reticle)
  - Machine gun (thick cross, wider spread)

### 11.16 Damage Direction Indicator
- **Priority:** LOW
- **Size:** 128x128
- **Prompt:** "Directional damage indicator arc, red blood-splatter gradient arc shape on solid magenta background (#FF00FF), semi-transparent crescent, 128x128 pixels"

### 11.17 Hit Marker
- **Priority:** LOW
- **Size:** 32x32
- **Prompt:** "Hit marker crosshair confirmation, thin white X shape with gap in center, military FPS style, solid magenta background (#FF00FF), 32x32 pixels"

### 11.18 Kill Skull Icon
- **Priority:** LOW
- **Size:** 32x32
- **Prompt:** "Small skull and crossbones icon, military style, white on solid magenta background (#FF00FF), clean silhouette, 32x32 pixels"

---

## 12. SKYBOX / ENVIRONMENT

### 12.1 Vietnam Jungle Skybox (Replace skybox.png)
- **Priority:** MEDIUM
- **Size:** 2048x2048 (or 6-face cubemap)
- **Prompt:** "Vietnam tropical sky panorama, humid hazy blue sky, scattered cumulus clouds, tropical sun position suggesting mid-morning, slight golden haze on horizon, seamless panoramic, 2048x2048"

---

## Generation Priority Queue

### Sprint 1 (Critical Path - Replace Procedural Geometry + Core UI)
1. ~~All 8 vegetation billboard remakes (9.1-9.8)~~ **DONE** - 8 sprites in `war-assets/vegetation/`
2. ~~All 12 terrain textures (8.1-8.12)~~ **DONE** - 12 textures in `war-assets/textures/`
3. ~~Start Screen Background (11.1)~~ **DONE** - `war-assets/ui/screens/start-screen.png`
4. M16A1, AK-47, M60 (weapon viewmodels)
5. UH-1 Huey Transport, UH-1C Gunship (helicopter models)
6. Sandbag Wall, Bunker, Ammo Crate, Helipad (structures)
7. M2 Browning .50 cal (mounted weapon)
8. ~~NVA Regular sprites (10.1)~~ **DONE** - 9 sprites in `war-assets/soldiers/`
9. ~~Weapon silhouette icons (11.5)~~ **DONE** - 11 icons in `war-assets/ui/icons/`
10. ~~Squad command icons (11.9)~~ **DONE** - 10 icons in `war-assets/ui/icons/` (v2 with blue bg)

### Sprint 2 (Visual Expansion + Loadout/Command UI)
1. ~~Rice Paddy Plants, Banana Plant, Tall Elephant Grass billboards (9.9, 9.10, 9.11)~~ **DONE**
2. ~~Mangrove, Rubber Tree billboards (9.12, 9.13)~~ **DONE**
3. M151 Jeep, M113 APC, Deuce-and-a-Half (ground vehicles)
3. Guard Tower, Village Hut, Firebase Gate (structures)
4. ~~ARVN sprites (10.2)~~ **DONE** - 9 sprites in `war-assets/soldiers/` (VC sprites already exist in game)
5. ~~Loadout Screen Background (11.2)~~ **DONE** - `war-assets/ui/screens/loadout-screen.png`
6. ~~Loading Screen Background (11.3)~~ **DONE** - `war-assets/ui/screens/loading-screen.png`
7. ~~Equipment icons (11.6)~~ **DONE** - 8 icons in `war-assets/ui/icons/equip-*.png`
8. ~~Vehicle silhouette icons (11.7)~~ **DONE** - 9 icons in `war-assets/ui/icons/vehicle-*.png`
9. ~~Vehicle top-down minimap icons (11.8)~~ **DONE** - 9 icons in `war-assets/ui/icons/map-*.png`
10. ~~Faction insignia (11.12)~~ **DONE** - 4 icons in `war-assets/ui/icons/faction-*.png`
11. ~~Compass rose (11.14)~~ **DONE** - `war-assets/ui/icons/compass-rose.png`

### Sprint 3 (Combat Systems + Tactical UI)
1. AH-1 Cobra, AC-47 Spooky (aircraft)
2. Ithaca 37, M1911, M79, RPG-7 (additional weapons)
3. ZPU-4, 37mm AA (defense systems)
4. Water Buffalo, Macaque Monkey (animals)
5. ~~Mounted soldier sprites (10.5, 10.6)~~ **DONE** - 3 sprites in `war-assets/soldiers/{us,nva,arvn}-mounted.png`. 1 pose per faction (upper body, hands forward), used for both gunner + turret
6. Concertina Wire, Punji Stakes (fortifications)
7. ~~Map marker icons (11.10)~~ **DONE** - 8 icons in `war-assets/ui/icons/marker-*.png`
8. ~~Air support calldown icons (11.11)~~ **DONE** - 5 icons in `war-assets/ui/icons/air-*.png`
9. ~~Crosshair / reticle set (11.15)~~ **DONE** - 4 icons in `war-assets/ui/icons/reticle-*.png`
10. ~~Rank chevrons (11.13)~~ **DONE** - 8 icons in `war-assets/ui/icons/rank-*.png`

### Sprint 4 (Extended Content + Polish)
1. F-4 Phantom, A-1 Skyraider (fixed wing)
2. M48 Patton, PT-76 (tanks)
3. Sampan, PBR Patrol Boat (watercraft)
4. Tiger, Snake, Wild Boar, Bird Flock (animals)
5. SA-2 SAM, Tunnel Entrance, Bridge (structures)
6. Skybox (12.1)
7. Match End Background (11.4)
8. Damage indicator, hit marker, kill skull (11.16-11.18)

---

## Notes for Generation Agent

1. **Mesh naming is critical.** Runtime code will find parts by name for animation (e.g., `model.getObjectByName('mainRotor')` to spin helicopter blades).
2. **Triangle budgets are hard limits.** Browser rendering on mobile must stay under budget.
3. **PBR materials:** Use metalness/roughness workflow. Military equipment: metalness 0.3-0.6, roughness 0.6-0.8. Wood: metalness 0, roughness 0.8-0.9.
4. **Scale matters.** All models should be in meters. A Huey is ~14m long. An M16 is ~1m. A sandbag wall is ~2m wide.
5. **Orientation:** Vehicles face +X (forward). Weapons face +Z (muzzle direction). This matches the engine's coordinate system.
6. **Y-up coordinate system** (Three.js default).
7. **Export as GLB** (binary glTF 2.0). Include materials. Include animations as named clips.
8. **Sprite consistency:** Use the existing US soldier sprites (us-walk-front-1.webp etc.) as style reference when generating new faction sprites. Feed them as image inputs to maintain visual consistency across factions.
