# Asset Reference - Prompt Templates & Test Cases

## Global Style System

All 2D sprite assets across all projects use the same generation pipeline and style suffix to maintain visual coherence.

### Standard Style Suffix (append to every sprite prompt)

```
32-bit pixel art sprite, high-res pixel art style, detailed with visible pixels, bright saturated colors, black pixel outlines, clean hard edges, no anti-aliasing, no blur, game asset on solid {BG_COLOR} background, entire background is flat solid {BG_COLOR} with no gradients
```

### Prompt Structure

```
{subject description}, {style suffix with chosen bg color}
```

Subject = what it IS (physical appearance, pose, colors). Do NOT repeat style words.

### Background Color Selection

Pick a bg color that does NOT conflict with the asset's dominant colors:

| Asset Colors | Use Background | Avoid |
|---|---|---|
| Greens, browns (vegetation) | Magenta #FF00FF | Red, green |
| Skin, khaki, olive (soldiers) | Magenta #FF00FF | Red, brown, green |
| Red/orange (fire, explosions) | Blue #0000FF | Red, magenta |
| Blue (water, sky) | Magenta #FF00FF | Blue |
| White/grey (icons, UI) | Magenta or Blue | White |
| Mixed/unknown | Magenta #FF00FF | Red |

### Generation Pipeline

1. **Generate** - Gemini with chosen background color
2. **Remove BG** - BiRefNet via FAL API
3. **Cleanup** - Sharp post-process removes remaining bg-colored pixels

### Rules

- Choose bg color based on asset colors (see table above)
- Never use red (#FF0000) for vegetation/soldier sprites (bleeds into greens/browns)
- Never ask Gemini for "transparent background" (produces checkerboard)
- Never say "painted", "low-poly 3D", "stylized", "realistic" (wrong aesthetic)
- Always run chroma cleanup after BiRefNet (catches interior gaps)

### Tileable Terrain Textures (separate pipeline - FAL flux-lora, not Gemini)

Textures do NOT use the sprite pipeline. They currently use `fal-ai/flux-lora` + Seamless Texture LoRA via FAL. Do not switch this to `fal-ai/flux-2/lora` until a FLUX 2-compatible seamless LoRA exists.

**FLUX prompt structure:**
```
smlstxtr, retro 16-bit SNES RPG terrain tileset tile, {terrain description}, top-down overhead view, {color guidance}, limited color palette, chunky visible pixel blocks, uniform density no focal point, flat game terrain texture, no perspective no shadows no depth, seamless texture
```

**Post-processing:** 256px FLUX output -> 32px nearest-neighbor downscale -> 24 color quantize (no dither) -> 512px upscale

**Output:** 512x512 PNG, ~8KB, ~16-24 colors. Verified tileable via gallery 3x3/5x5/8x8 preview.

---

## Asteroid-Miner Assets (`~/repos/Asteroid-Miner`)

### Planet Textures
```
Seamless spherical planet texture, [PLANET TYPE].
Equirectangular projection, tileable horizontally.
[SURFACE DETAILS].
2K resolution, photorealistic, no stars in background.
Solid black background.
```

**Planet types:** Lava world, Ocean world, Toxic world, Crystal world, Dead world, Jungle world, Ring world, Binary world

**Requirements:** JPEG, 2048x1024 (2:1 equirectangular), sRGB. Output: `public/assets/p23.jpeg` etc.

### Enemy Ship Sprites
```
Sci-fi enemy spacecraft [SHIP TYPE], top-down view, symmetrical design, glowing [COLOR] energy core, metallic hull, centered, {style suffix}
```

**Ship types:** Scout drone, Heavy fighter, Bomber, Swarm unit, Capital ship turret

**Requirements:** PNG with transparency (magenta pipeline), 512x512 or 256x256, multiple color variants.

### UI Icons
```
Game UI icon [ITEM], fantasy sci-fi style, simple silhouette, high contrast, glowing edges, 64x64 readable at small scale, {style suffix}
```

**Icons:** Iron/Gold/Platinum ore, Fuel cell, Shield generator, Hull plating, Mining laser, Engine upgrade, Cargo bay, Credits symbol

---

## Terror in the Jungle Assets (`C:\Users\Mattm\X\games-3d\terror-in-the-jungle`)

**Full asset manifest:** See `docs/terror-in-the-jungle-assets.md` for comprehensive generation queue with 90+ assets, prompts, tri budgets, named mesh parts, scale specs, and 4 priority sprints.

**Game source code:** `C:\Users\Mattm\X\games-3d\terror-in-the-jungle` - reference for how assets are loaded/used in engine.

### Key Conventions
- **Sprites:** PNG with transparency via magenta pipeline, converted to WebP at integration
- **3D Models:** GLB (binary glTF 2.0) via Kiln, named mesh parts for runtime animation
- **Textures:** 512x512 PNG, seamless/tileable via `fal-ai/flux-lora` + Seamless LoRA, pixel art post-processed (no bg removal)
- **Billboard sprites:** Side view, transparent background, used as InstancedMesh billboards
- **Soldiers:** 9 sprites per faction (3 directions x 3 states: walk-frame1, walk-frame2, fire)

### Vegetation Sprites
```
[PLANT DESCRIPTION], side view, {style suffix}
```

**Plants:** jungle ferns, elephant ear plants, fan palms, coconut palms, areca palms, dipterocarp trees, banyan trees, bamboo groves, banana plants, elephant grass

### Soldier Sprites (Billboard System - 3 directions)
```
Vietnam War [FACTION] soldier, [POSE], [DIRECTION] view, [UNIFORM/EQUIPMENT DETAILS], {style suffix}
```

**Directions:** front, back, side (mirrored for left/right)

**Poses per direction:** Walking frame 1, Walking frame 2, Firing

**Factions:**
- US Regular: M1 helmet with camo cover, olive drab fatigues, ERDL camo, M16A1 rifle
- VC Guerrilla: black pajamas, conical straw hat, AK-47, sandals
- NVA Regular: pith helmet, khaki uniform, chest rig, AK-47
- ARVN: tiger stripe camo, M1 helmet, M16 or M1 Carbine

### Environment Props
```
[PROP DESCRIPTION], jungle battlefield setting, side view, {style suffix}
```

**Props:** sandbag wall, ammo crate, fuel barrel, bamboo watchtower, bunker entrance, concertina wire

### Terrain Textures (FAL flux-lora pipeline, no bg removal)

Uses `fal-ai/flux-lora` + Seamless Texture LoRA, NOT Gemini. See AGENTS.md "Tileable Terrain Texture Pipeline" for full details. `fal-ai/flux-2/lora` remains experimental until a compatible seamless LoRA is available.

**12 biome textures (all approved):** jungle-floor, mud-ground, river-bank, tall-grass, rice-paddy, rocky-highland, red-laterite, bamboo-floor, swamp, sandy-beach, defoliated-ground, firebase-ground

### Effect Sprites
```
[EFFECT] animation frame, bright colors, high contrast, {style suffix}
```

**Effects:** explosion, muzzle flash, smoke puff, tracer round, dirt kick

### 3D Models (Kiln GLB - separate pipeline)
```
Kiln prompt: "[ASSET DESCRIPTION], Vietnam War era, low-poly game asset"
Mode: glb
Style: low-poly
```

**Vehicles:** UH-1 Huey, CH-47 Chinook, AH-1 Cobra, F-4 Phantom, A-1 Skyraider, M151 Jeep, M113 APC, M35 Deuce, PBR Mark II, Sampan
**Structures:** Firebase bunker, guard tower, village hut, tunnel entrance, bridge, firebase gate
**Weapons:** M16A1, AK-47, M60, M79, RPG-7, M1911, Remington 870, M2 Browning
