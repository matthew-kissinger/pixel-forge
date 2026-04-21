# Agent Workflows - Pixel Forge

This file documents how AI agents interact with Pixel Forge for asset generation. If you are an AI agent, read this file first.

## Quick Start

```bash
bun install                    # Install dependencies
bun run dev:server             # Start API server on :3000
curl http://localhost:3000/health  # Verify server is running
```

## Architecture Overview

```
scripts/generate.ts     # CLI entry point for asset generation
scripts/batches/*.json  # Batch manifests (reproducible asset lists)
war-assets/             # Generated output directory
packages/server/        # Hono API server (Gemini, FAL, Kiln)
packages/client/        # React Flow editor (browser UI)
packages/shared/        # Types, presets, prompt builders
```

## API Endpoints

All endpoints are on `http://localhost:3000`. Server must be running (`bun run dev:server`).

### Image Generation (Gemini)

```bash
POST /api/image/generate
{
  "prompt": "...",
  "aspectRatio": "1:1",    # Optional: 1:1, 2:3, 3:2, 3:4, 4:3, 16:9, etc.
  "imageSize": "1K",       # Optional: 1K, 2K, 4K
  "removeBackground": true, # Optional: auto-remove bg via BiRefNet
  "presetId": "..."        # Optional: preset from shared/presets.ts
}
# Returns: { "image": "data:image/png;base64,..." }
```

### Background Removal (FAL BiRefNet + Chroma Cleanup)

```bash
POST /api/image/remove-bg
{
  "image": "data:image/png;base64,...",
  "backgroundColor": "magenta"  // optional: "magenta" | "blue" | "red" | "green"
}
# Returns: { "image": "data:image/png;base64,..." }
```

The `backgroundColor` parameter enables targeted chroma cleanup after BiRefNet. Semi-transparent edge pixels matching the background color signature are made fully transparent. When omitted, auto-detects magenta and red residuals.

### 3D Model Generation (Kiln / Claude)

```bash
POST /api/kiln/generate
{
  "prompt": "low-poly wooden crate, game prop",
  "mode": "glb",          # glb | tsl | both
  "style": "low-poly"     # low-poly | stylized | voxel | detailed | realistic
}
# Returns: { "code": "// Three.js code...", "model": "sonnet" }
```

### Texture Generation (FLUX 2 + Seamless LoRA)

```bash
POST /api/image/generate-texture
{
  "description": "jungle floor ground",  # Required
  "size": 512,            # Optional: output size (default 512)
  "loraScale": 1.0,       # Optional: LoRA strength (default 1.0)
  "steps": 28,            # Optional: inference steps (default 28)
  "guidance": 3.5,        # Optional: guidance scale (default 3.5)
  "pixelate": true,       # Optional: nearest-neighbor pixelation (default true)
  "pixelateTarget": 128,  # Optional: pixel target resolution (default 128)
  "paletteColors": 0      # Optional: palette quantization (default 0 = off)
}
# Returns: { "image": "data:image/png;base64,...", "size": 8192, "dimensions": {...} }
```

Note: For terrain textures, use the generation scripts directly (`scripts/gen-textures-*.ts`) which apply the full post-processing pipeline (32px downscale + 24 color quantize). The API endpoint uses less aggressive defaults.

### Asset Gallery

```
GET /gallery              # HTML gallery page - view all war-assets
GET /gallery/api/assets   # JSON list of all assets
GET /gallery/file/*       # Serve individual asset files
```

Gallery features:
- Raw/clean comparison for sprites (side-by-side)
- **Tiled preview for textures** - 3x3/5x5/8x8 tile buttons verify seamless tiling
- Auto-refresh every 30s
- Filter by category

## CLI Scripts

### Single Image

```bash
bun scripts/generate.ts image \
  --prompt "Dense cluster of tropical jungle ferns, bright green fronds, side view, 16-bit pixel art sprite, retro video game style, visible pixels, bright saturated colors, limited color palette, black pixel outlines, clean hard edges, no anti-aliasing, no blur, game asset on solid magenta #FF00FF background, entire background is flat solid magenta with no gradients" \
  --out vegetation/fern.png \
  --remove-bg \
  --aspect 1:1
```

### Batch Generation

```bash
bun scripts/generate.ts batch --manifest scripts/batches/batch1-vegetation.json
```

### Batch Manifest Format

```json
{
  "batch": 1,
  "name": "Vegetation Billboards",
  "status": "pending",
  "assets": [
    {
      "name": "Jungle Fern (9.1)",
      "prompt": "Dense cluster of tropical ferns...",
      "out": "vegetation/jungle-fern.png",
      "removeBg": true,
      "aspect": "1:1"
    }
  ]
}
```

## Style System

All 2D sprites MUST use the same style suffix to maintain visual coherence across the game.

### Standard Style Suffix

```
32-bit pixel art sprite, high-res pixel art style, detailed with visible pixels, bright saturated colors, black pixel outlines, clean hard edges, no anti-aliasing, no blur, game asset on solid {BG_COLOR} background, entire background is flat solid {BG_COLOR} with no gradients
```

### Prompt Structure

```
{subject description}, {style suffix with chosen bg color}
```

Subject = what it IS (physical appearance, pose, colors). Do NOT repeat style words.

### Background Color Selection

Pick bg color based on asset colors - maximize contrast, avoid conflicts:

| Asset Colors | Use Background | Avoid |
|---|---|---|
| Greens, browns (vegetation) | Magenta #FF00FF | Red, green |
| Skin, khaki, olive (soldiers) | Magenta #FF00FF | Red, brown, green |
| Red/orange (fire, explosions) | Blue #0000FF | Red, magenta |
| Blue (water, sky) | Magenta #FF00FF | Blue |
| White/grey (icons, UI) | Magenta or Blue | White |
| Mixed/unknown | Magenta #FF00FF | Red |

### Pipeline: Generate -> Remove BG -> Cleanup

1. Gemini generates with chosen background color
2. BiRefNet removes background (`/api/image/remove-bg`)
3. Sharp chroma cleanup removes remaining bg-colored pixels

### Rules

- **Choose bg color based on asset colors** (see table above)
- **Never** use red (#FF0000) for vegetation/soldier sprites
- **Never** ask for "transparent background" (Gemini produces checkerboard)
- **Never** say "painted", "low-poly 3D", "stylized", "realistic" (wrong aesthetic)
- **Always** run chroma cleanup after BiRefNet
- Aspect ratio in prompt is a size hint only - do not resize after generation

### Tileable Terrain Textures (FLUX 2 pipeline - NOT Gemini)

Textures use a **separate pipeline** from sprites. Do NOT use Gemini for terrain textures.

**Pipeline:** FLUX 2 + Seamless Texture LoRA (FAL) -> 32px nearest-neighbor downscale -> 24 color quantize (no dither) -> black pixel cleanup -> 512px upscale

**FLUX prompt structure:**
```
smlstxtr, retro 16-bit SNES RPG terrain tileset tile, {terrain description}, top-down overhead view, {color guidance}, limited color palette, chunky visible pixel blocks, uniform density no focal point, flat game terrain texture, no perspective no shadows no depth, seamless texture
```

**Key settings:** Generate at 256px, LoRA scale 1.0, 28 steps, guidance 3.5. Output: 512x512 PNG, ~8KB, ~16-24 colors. Run `scripts/clean-terrain-blacks.ts` after generation to replace near-black pixels (RGB sum < 40) with nearest non-black neighbor colors.

**Color guidance per biome:** Vietnam jungle = deep greens + dark browns (no orange/yellow). Highlands = grey + tan. Laterite = red-brown. Beach = tan + beige. Swamp = dark green-brown.

**12 biome textures completed:** jungle-floor, mud-ground, river-bank, tall-grass, rice-paddy, rocky-highland, red-laterite, bamboo-floor, swamp, sandy-beach, defoliated-ground, firebase-ground

### Faction Soldier Sprites (T-Pose + Pose Reference Workflow)

Each faction needs 9 sprites: 3 directions x 3 states. Uses dual-reference approach.

**Full workflow:** `docs/faction-sprite-workflow.md`
**Reference script:** `scripts/gen-nva-soldiers.ts`

**Quick summary:**
1. Generate T-pose character reference from existing faction sprite (establishes appearance)
2. For each of 9 poses, call Gemini with `referenceImages: [tposeRef, existingPoseRef]`
3. Post-process: BiRefNet bg removal -> chroma cleanup

**Prompting rules:**
- Director-style: "Camera: locked side profile. Stance: left leg forward"
- Specify facing direction for side views: "Soldier facing RIGHT, looking RIGHT"
- Don't over-prompt - trust image reference for pose
- Always include "full body head to toe visible"

**Common fixes:** Same legs in walk1/2 -> specify foot. Looking at camera -> add facing direction. Rifle on back -> add "held in hands".

### Icon Generation (Weapon, Command, Faction & Equipment Icons)

- **Weapon icons:** White silhouette on magenta, side profile, "no text, no labels"
- **Command icons:** White geometric on blue #0000FF (better separation for white subjects)
- **Equipment/vehicle icons:** White on blue #0000FF, same pipeline as command icons
- **Faction insignia:** Colored emblems on green #00FF00, NO BiRefNet - just green chroma key (G>180, R<100, B<100 -> transparent). BiRefNet destroys colored content.
- **Post-processing:** BiRefNet -> chromaClean (magenta or blue depending on bg). Exception: faction icons skip BiRefNet entirely.
- **Scripts:** `scripts/gen-weapon-icons-redo.ts`, `scripts/gen-command-icons-v2.ts`, `scripts/gen-sprint2-icons.ts`, `scripts/gen-faction-icons-fix.ts`

### Lessons Learned

**Side walk sprites:** Do NOT describe which leg is forward in text prompts. Gemini ignores textual leg descriptions. Instead, use the reference pose image directly and say "Match the exact pose from the second reference image."

**Muzzle flash preservation:** Standard magenta chroma cleanup removes yellow/orange muzzle flash pixels. Use `chromaCleanMagentaPreserveFlash()` which skips warm-colored pixels (R>180, G>120, B<80) before cleaning magenta. Script: `scripts/gen-nva-frontfire-fix.ts`.

**Style consistency across factions:** Use dual-reference T-pose approach. Feed two existing faction sprites (e.g., VC sprite body proportions + US sprite detail level) as `referenceImages` for T-pose generation. This matches detail level and proportions to existing NPCs.

**FAL API reliability:** BiRefNet can return 503 errors. Always add retry logic with 10s backoff (3 attempts) in generation scripts.

**Director-style prompting:** Keep pose prompts concise. "Camera: locked side profile. Stance: left leg forward" works better than verbose descriptions. Trust the image reference for pose - text prompt is just a guide.

### 3D Models (Kiln GLB)

1. Use the Kiln API with `mode: "glb"`
2. Available primitives: boxGeo, sphereGeo, cylinderGeo, coneGeo, capsuleGeo, torusGeo, planeGeo
3. Available materials: gameMaterial, basicMaterial, lambertMaterial, glassMaterial
4. Tri budgets: Character 5000, Prop 2000, Vehicle 5000-8000, Environment 10000
5. Y-up coordinate system, +X forward
6. Name mesh parts for game engine access: `model.getObjectByName('mainRotor')`

## Output Directory Structure

```
war-assets/
  vehicles/aircraft/    # Helicopters, planes (GLB)
  vehicles/ground/      # Jeeps, APCs, trucks (GLB)
  vehicles/watercraft/  # PBR boats (GLB)
  weapons/              # Viewmodel weapons (GLB)
  structures/           # Bunkers, towers, huts (GLB)
  defense/              # SAM sites, AA guns (GLB)
  animals/              # Wildlife sprites (PNG)
  textures/             # Tileable terrain textures (PNG)
  vegetation/           # Billboard plant sprites (PNG)
  soldiers/             # NPC sprite sheets (PNG)
  ui/icons/             # Weapon/command icons (PNG)
  ui/screens/           # Menu backgrounds (PNG)
  ui/hud/               # HUD elements (PNG)
  skybox/               # Skybox textures (PNG)
```

Files follow the naming convention:
- `{name}.png` - Final asset with background removed
- `{name}_raw.png` - Original generation before bg removal

## Asset Manifest

Full asset list with prompts, priorities, and specs: `docs/terror-in-the-jungle-assets.md`

## Reviewing Assets

1. Open `http://localhost:3000/gallery` in a browser
2. Gallery shows all generated assets with raw/clean comparison
3. Auto-refreshes every 30 seconds
4. Filter by category using the filter buttons

## Environment Variables

Required in `packages/server/.env.local`:
```
GEMINI_API_KEY=...   # Google Gemini API key
FAL_KEY=...          # FAL.ai API key (BiRefNet bg removal, Meshy 3D)
```

Optional:
```
PORT=3000            # Server port
WAR_ASSETS_DIR=...   # Override war-assets location
EXPORT_BASE_DIR=...  # Override export save location
```

## Workflow for Batch Asset Generation

1. Start server: `bun run dev:server`
2. Create/edit batch manifest in `scripts/batches/`
3. Run: `bun scripts/generate.ts batch --manifest scripts/batches/batchN.json`
4. Review at `http://localhost:3000/gallery`
5. User approves/rejects each asset
6. Rejected assets get regenerated with updated prompts
7. Update batch manifest status to "completed"
