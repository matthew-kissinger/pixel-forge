# Pixel Forge

Node-based game asset generator. Think ComfyUI but purpose-built for game development.

## Vision

**Make AI-generated game assets actually good.** Not "technically works" - genuinely usable in shipped games.

The problem: AI image generators output inconsistent styles, wrong sizes, backgrounds that don't remove cleanly, formats engines can't use. Game devs spend more time fixing AI output than they save generating it.

Pixel Forge solves this with a visual pipeline:
1. **Generate** - AI creates the raw asset (Gemini nano-banana-pro)
2. **Transform** - Resize, crop, remove background, adjust
3. **Optimize** - Compress to game-ready formats (WebP, atlas, LOD)
4. **Export** - Output files engines actually accept

## Critical: Transparency Workflow

**Always use solid red (#FF0000) or green (#00FF00) backgrounds.** Never ask Gemini for "transparent background" - it produces a checkerboard pattern with no actual alpha channel.

The correct flow:
1. Generate with `solid red background` in prompt
2. Remove background via BiRefNet or chroma key
3. Export with proper alpha channel

Red is preferred because it rarely appears in game assets. Green for subjects with red colors.

## Real Test Case: Asteroid-Miner Assets

Generate assets for the Asteroid-Miner game (`~/repos/Asteroid-Miner`). This is a real test - assets must work in-game.

### Planet Textures (Priority)
Game needs more planet variety. Currently has 22, could use 30+.

**Prompt template:**
```
Seamless spherical planet texture, [PLANET TYPE].
Equirectangular projection, tileable horizontally.
[SURFACE DETAILS].
2K resolution, photorealistic, no stars in background.
Solid black background.
```

**Planet types to generate:**
- Lava world - glowing cracks, volcanic eruptions, orange/black
- Ocean world - deep blue with white cloud swirls
- Toxic world - sickly green/yellow atmosphere, acid seas
- Crystal world - geometric facets, purple/cyan reflections
- Dead world - gray cratered surface, no atmosphere
- Jungle world - dense green canopy visible from space
- Ring world - with debris rings (separate ring texture)
- Binary world - two-tone hemisphere split

**Requirements:**
- Format: JPEG (no alpha needed for planets)
- Size: 2048x1024 (2:1 equirectangular for sphere UV)
- Color space: sRGB
- Output to: `~/repos/Asteroid-Miner/public/assets/p23.jpeg` etc.

### Enemy Ship Sprites
Game needs enemy variety. Currently spectral drones are basic.

**Prompt template:**
```
Sci-fi enemy spacecraft, [SHIP TYPE].
Top-down view, symmetrical design.
Solid red background (#FF0000).
Glowing [COLOR] energy core, metallic hull.
Game-ready asset, clean edges, centered.
512x512 resolution.
```

**Ship types:**
- Scout drone - small, fast, minimal armor
- Heavy fighter - bulky, lots of weapons
- Bomber - asymmetric, large payload bay
- Swarm unit - insectoid, organic-mechanical hybrid
- Capital ship turret - stationary defense platform

**Requirements:**
- Format: PNG with transparency (BiRefNet removal)
- Size: 512x512 or 256x256
- Need multiple color variants (red, blue, green energy cores)

### UI Icons
Resource and upgrade icons for the trading interface.

**Prompt template:**
```
Game UI icon, [ITEM], fantasy sci-fi style.
Simple silhouette, high contrast, glowing edges.
Solid red background (#FF0000).
64x64 target size, readable at small scale.
```

**Icons needed:**
- Iron ore, Gold ore, Platinum ore
- Fuel cell, Shield generator, Hull plating
- Mining laser, Engine upgrade, Cargo bay
- Credits/currency symbol

## Real Test Case: Terror in the Jungle Assets

Generate assets for terror-in-the-jungle (`~/repos/terror-in-the-jungle`). Pixel art battlefield game with billboard sprites.

### Vegetation Sprites
```
Pixel art [PLANT TYPE], top-down angled view for billboard.
Tropical jungle aesthetic, vibrant greens.
Solid red background (#FF0000).
256x256, clean edges, game-ready sprite.
```

**Plants needed:** ferns, palms, bamboo, tropical flowers, vines, broad-leaf plants

**Requirements:**
- Format: PNG with transparency
- Size: 256x256
- Output to: `~/repos/terror-in-the-jungle/public/assets/`

### Enemy Soldier Sprites (Billboard System)

The game uses billboard sprites that rotate to face the camera. Each soldier needs multiple angles and poses for believable 3D rendering.

**Direction sheets** (8 angles for rotation):
```
Pixel art soldier, [FACTION] military, [POSE].
8-direction sprite sheet (N, NE, E, SE, S, SW, W, NW).
Same pose from each angle, consistent lighting.
Solid red background (#FF0000).
64x64 per frame, 8 frames in row (512x64 total).
```

**Poses needed per faction:**
- Idle standing
- Walking (2-4 frame animation per direction = 16-32 frames)
- Running
- Crouching
- Shooting rifle
- Shooting from cover
- Death/ragdoll (multiple variants)
- Prone/crawling

**Factions:** jungle camo, desert camo, urban camo, spec ops black

**Exploration opportunities:**
- Can we generate consistent 8-angle sheets from a single reference?
- Animation frame interpolation between poses
- Procedural damage/dirt variations
- Faction color palette swaps from base sprites
- LOD variants (smaller resolution for distance)

### Environment Props
```
Pixel art [PROP], jungle battlefield setting.
Isometric-ish angle for 3D billboard placement.
Solid red background (#FF0000).
128x128 or 256x256.
```

**Props needed:** sandbags, ammo crates, barrels, ruins, bunkers, watchtowers

### Effect Sprites
```
Pixel art [EFFECT] animation, 8-frame sequence.
Bright colors, high contrast for visibility.
Solid red background (#FF0000).
128x128 per frame, horizontal strip (1024x128 total).
```

**Effects needed:** explosion, muzzle flash, smoke puff, blood splatter, dirt kick

## Current Direction

Build a **template/preset system** where:
- User picks a preset (isometric, pixel art, icons, textures)
- Preset defines: prompt prefix/suffix, model config, post-processing
- User only provides the subject ("medieval blacksmith")
- System handles the rest consistently

**Save what works.** When a template produces good results, save that configuration. Build a library of proven templates over time.

### Near-term Goals

- **Re-run failed nodes** - Allow re-executing individual failed nodes without re-running the entire workflow
- **kilnGen executor** - Currently throws "not yet supported" (`executor.ts:411-413`); needs real implementation once Kiln API is stable
- **Keyboard shortcuts** - No hotkeys for common operations (execute, save, delete node, undo/redo)
- **Copy/paste nodes** - No clipboard support for duplicating nodes
- **Node context menu** - Right-click menu for re-run, duplicate, delete
- **Refactor executor.ts** - 1,369 lines monolithic; split into per-node handler modules

### Completed Goals

- ~~Planet texture preset~~ - Done (7 presets in `packages/shared/presets.ts`)
- ~~Sprite sheet slicing~~ - Done (`SliceSheetNode`, multiple sprites + ZIP download)
- ~~Batch consistency~~ - Done (`BatchGenNode` with consistency phrases)
- ~~Template persistence~~ - Done (workflow save/load JSON, 9 workflow templates)
- ~~Image compression node~~ - Done (`CompressNode` + `/api/image/compress` endpoint + executor handler)
- ~~Workflow execution engine~~ - Done (`executor.ts` with topological sort, parallel wave execution, cancellation)
- ~~More presets~~ - Done (vegetation-sprite, effect-strip, soldier-sprite added)
- ~~Executor node coverage~~ - Done (all 28 node types have handlers: processing nodes use canvas ops, output nodes skip, kilnGen throws intentional error)
- ~~Missing node components~~ - Done (all 28 node types have UI components: styleReference, seedControl, spriteSheet, exportGLB, exportSheet added)
- ~~Workflow UX polish~~ - Done (per-node error display, execution history panel with timeline/status/errors, search/filter in NodePalette)
- ~~Undo/redo~~ - Done (snapshot-based in `workflow.ts`, tracks structural changes: add/remove nodes/edges, connect, reset, import)

## Current State

React Flow editor with all 28 node types fully implemented (type definitions, UI components, and executor handlers). Generates images via Gemini nano-banana-pro, removes backgrounds via FAL BiRefNet, slices sprite sheets with ZIP download, batch generates with consistency phrases. Workflow save/load works. 9 pre-built templates across 5 categories. 7 generation presets. 3D generation via Meshy and Kiln (Claude Agent SDK) works. Image compression/optimization node fully implemented (component + API + executor). Workflow execution engine with topological sort, parallel wave execution, progress tracking, cancellation, and execution history. Per-node error display on failed nodes. Execution history panel with timeline, status icons, duration, and expandable error details. NodePalette has search/filter. Toolbar has Execute All / Stop / History toggle. Undo/redo with snapshot-based history (max 50 snapshots). 1,369-line executor.ts with canvas-based image processing for tile, filter, combine, rotate, colorPalette, analyze, iterate.

Key gaps: no keyboard shortcuts, no copy/paste nodes, no node context menu, no re-run of individual failed nodes, kilnGen executor not yet implemented, executor.ts needs refactoring into modules.

## Quality Bar

Assets should be:
- **Consistent** - Same style across a batch
- **Correct size** - Power-of-2 dimensions
- **Clean** - No artifacts, proper transparency, no cut-off edges
- **Small** - <50KB sprites, compressed
- **Usable** - Formats engines accept

**Test by generating real assets**, not just checking if code runs.

## Technical Context

**Stack:** React 19, Vite 7, React Flow 12, Zustand, Tailwind, Bun, Hono

**AI Services:**
- Gemini `nano-banana-pro-preview` - 2D generation (always red/green bg)
- FAL BiRefNet - Background removal (works on any bg color)
- FAL Meshy - 3D model generation

**Structure:**
```
packages/
├── client/    # React + React Flow editor (28 node components, 5 panels, Zustand store w/ undo/redo, 9 templates, executor)
├── server/    # Hono API wrapping AI services (Gemini, FAL, Claude)
└── shared/    # Shared types and presets (7 presets, prompt builders)
```

## Template Examples

See `docs/presets/` for reference formats:

| Template | Background | Size | Use Case |
|----------|------------|------|----------|
| `planet-texture` | Black | 2048x1024 | Equirectangular planet surfaces |
| `enemy-sprite` | Red #FF0000 | 512x512 | Top-down ship sprites |
| `game-icon` | Red #FF0000 | 64x64 | UI icons |
| `isometric-sheet` | Red #FF0000 | 2048x2048 | Multi-view sprite sheets |
| `vegetation-sprite` | Red #FF0000 | 256x256 | Pixel art plant sprites for billboards |
| `effect-strip` | Red #FF0000 | 1024x128 | 8-frame animation strips for VFX |
| `soldier-sprite` | Red #FF0000 | 64x64 | Pixel art soldier billboard sprites |

## Skills

Local skills in `.claude/skills/` provide domain knowledge:
- **nano-banana-pro** - Gemini model settings, prompt patterns, transparency workflow
- **pixel-art-professional** - Dithering, palettes, shading, color theory
- **canvas-design** - Visual art creation philosophy
- **frontend-design** - UI design principles
- **kiln-glb** - 3D asset primitives
- **kiln-tsl** - Shader effects

## Development Approach

Build features by using them. Want to add planet texture generation? Generate actual planets for Asteroid-Miner and see if they look good in-game.

When something works well, capture the configuration. When it fails, document why.

## Commands

```bash
bun run dev:client  # :5173
bun run dev:server  # :3000
```
