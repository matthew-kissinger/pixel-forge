# Pixel Forge

Node-based AI game asset generator. Visual pipeline: Generate (Gemini) -> Transform -> Optimize -> Export.

## Commands

```bash
bun run dev:client    # Vite dev server on :5173
bun run dev:server    # Hono API server on :3000
bun run build         # Production build
bun run typecheck     # tsc --noEmit (client + server)
bun run lint          # ESLint (client + server)

# Tests (run per-package, NOT from root)
cd packages/client && bunx vitest run   # 1931 pass, 0 fail, 0 skip, 88 files
cd packages/server && bun test          # 118 pass, 7 files
bun run test:e2e                        # Playwright smoke + mobile viewport + workflow tests
```

## Stack

React 19, Vite 7, React Flow 12, Zustand, Tailwind, Bun, Hono

**AI Services:** Gemini 3.1 Flash Image (2D sprites), FAL BiRefNet (bg removal), FAL FLUX 2 + Seamless LoRA (tileable textures), FAL Meshy (3D), Claude/Kiln (3D primitives)

## Structure

```
packages/
  client/   # React Flow editor: 30 node components (lazy-loaded), 9 panels, Zustand store, executor engine
  server/   # Hono API: routes with Zod validation, services with timeouts, retry client-side only
  shared/   # Types, presets, prompt builders, API type contracts
```

## Architecture

- **Nodes**: 30 types (28 lazy-loaded via `createLazyNode`, 2 eager), all wrapped with `NodeErrorBoundary`
- **Executor**: Topological sort, parallel wave execution, per-node timeouts (120s gen, 60s processing, 30s canvas)
- **Handlers**: 9 modules in `lib/handlers/` (index, input, imageGen, model3d, processing, canvas, analysis, batch, output)
- **State**: Zustand store with undo/redo snapshots, auto-save to localStorage every 2s with RecoveryBanner UI
- **Retry**: Client-side `retryWithBackoff` in `packages/client/src/lib/retry.ts` with per-node retry buttons
- **Bundle**: Main ~103KB gzip, Three.js ~380KB (lazy, only loaded for 3D nodes), React Flow ~61KB, all nodes in separate chunks

## Critical: Sprite Generation Pipeline

**Art Style:** All 2D sprites must be **32-bit high-res pixel art** to match existing game assets.

**Style suffix (append to every sprite prompt):**
```
32-bit pixel art sprite, high-res pixel art style, detailed with visible pixels, bright saturated colors, black pixel outlines, clean hard edges, no anti-aliasing, no blur, game asset on solid {BG_COLOR} background, entire background is flat solid {BG_COLOR} with no gradients
```

**Background Color Selection:** Choose a background that does NOT conflict with the asset's dominant colors. The goal is maximum contrast so BiRefNet cleanly separates edges.

| Asset Colors | Use Background | Avoid |
|---|---|---|
| Greens, browns (vegetation, terrain) | Magenta #FF00FF | Red, green |
| Skin tones, khaki, olive (soldiers) | Magenta #FF00FF | Red, brown, green |
| Red/orange subjects (fire, explosions) | Blue #0000FF | Red, magenta |
| Blue subjects (water, sky) | Magenta #FF00FF | Blue |
| White/grey subjects (icons, UI) | Magenta #FF00FF or Blue #0000FF | White |
| Mixed/unknown | Magenta #FF00FF (safest default) | Red |

**Pipeline:** Gemini generate -> BiRefNet bg removal -> magenta chroma cleanup (R>150, G<100, B>150 -> transparent)

**Chroma cleanup reference:** `scripts/gen-vegetation-redo.ts` has `chromaCleanMagenta()` - always run after BiRefNet for magenta backgrounds.

**Prompt structure:** `{subject description}, {style suffix with chosen bg color}`

**Faction Soldier Sprites:** Use T-pose + pose reference workflow. Full docs at `docs/faction-sprite-workflow.md`, reference script at `scripts/gen-nva-soldiers.ts`. Generate T-pose first, then 9 poses with dual referenceImages.

**Icon Sprites:** Weapon icons use magenta bg. Command icons use blue #0000FF bg (better BiRefNet separation for white subjects). Both need "no text, no labels" in prompt. Post-process with matching chroma cleanup function.

**Faction Insignia Icons:** Use green #00FF00 bg with NO BiRefNet - just green chroma key directly (G>180, R<100, B<100 -> transparent). BiRefNet destroys colored emblems. Script: `scripts/gen-faction-icons-fix.ts`.

**Muzzle Flash Preservation:** For firing sprites, use `chromaCleanMagentaPreserveFlash()` which skips yellow/orange pixels (R>180, G>120, B<80) before doing magenta cleanup. Script: `scripts/gen-nva-frontfire-fix.ts`.

**Side Walk Sprite Prompting:** Do NOT describe which leg is forward in text - Gemini ignores leg descriptions. Instead, use the reference pose image and say "Match the exact pose from the second reference image." Use separate VC pose refs for walk1 vs walk2.

**Dual-Reference T-Pose:** For style consistency across factions, use two existing faction sprites as refs for T-pose generation (e.g., VC sprite + US sprite). This matches detail level and proportions to existing NPCs. Don't over-detail.

**What NOT to do:**
- Do NOT use red (#FF0000) background - bleeds into greens, browns, and skin tones
- Do NOT ask Gemini for "transparent background" - produces checkerboard artifacts
- Do NOT say "painted art style" or "low-poly 3D" - produces wrong aesthetic
- Do NOT say "PS2-era" or "stylized" - too vague, Gemini interprets as 3D renders
- Do NOT skip the chroma cleanup step - BiRefNet misses interior gaps
- Do NOT run BiRefNet on colored icons (faction insignia) - destroys red/yellow/olive colors
- Do NOT run BiRefNet on solid white silhouette icons - eats into the white fill
- Do NOT describe which leg is forward for side-walk sprites - Gemini ignores text leg descriptions, use visual pose reference instead

## Critical: UI Icon Pipeline

UI icons use Gemini with a **style sheet reference** and **direct chroma key** (no BiRefNet).

**Script:** `scripts/gen-ui-icons.ts` - 50 icons across 10 categories. Commands: sheet, seed, batch, run, redo, list.

**Style sheet:** A single abstract shape (heraldic shield) on magenta that defines the visual language. Fed as reference image to every icon generation. NOT a grid of example icons.

**Mono icons (46):** Solid white filled silhouettes, no outlines, no internal detail. Game applies color via CSS.
- Background: magenta #FF00FF
- Processing: direct magenta chroma key on raw image (NO BiRefNet)
- Prompt suffix: `ICON_LIBRARY_STYLE` constant in script

**Colored emblems (4):** Faction insignia with solid colors and 3px black outlines.
- Background: blue #0000FF (no faction colors are blue)
- Processing: direct blue chroma key on raw image (NO BiRefNet)

**Reference image flow:**
1. Style sheet -> fed as ref to seed icons
2. Style sheet + seed raw -> fed as 2 refs to remaining icons in category

**Output:** `war-assets/ui/icons/` - 50 final PNGs, copied to terror-in-the-jungle `public/assets/ui/icons/`

**What NOT to do for icons:**
- Do NOT use BiRefNet for icons - it aggressively eats into solid white fills and colored emblems
- Do NOT use black outlines on mono icons - looks bad on transparent/dark backgrounds
- Do NOT use Recraft V3 via FAL - tested, output quality not sufficient and no clean bg handling
- Do NOT use green bg for colored emblems - overlaps with olive/dark green faction colors

## Critical: Tileable Terrain Texture Pipeline

Terrain textures use a **separate pipeline** from sprites. Do NOT use Gemini for textures.

**Pipeline:** FLUX 2 + Seamless Texture LoRA (FAL) -> nearest-neighbor downscale (32px) -> palette quantize (24 colors, no dither) -> black pixel cleanup -> nearest-neighbor upscale (512x512)

**FLUX prompt structure:**
```
smlstxtr, retro 16-bit SNES RPG terrain tileset tile, {terrain description}, top-down overhead view, {color palette guidance}, limited color palette, chunky visible pixel blocks, uniform density no focal point, flat game terrain texture, no perspective no shadows no depth, seamless texture
```

**Key settings:**
- Model: `fal-ai/flux-2/lora` with Seamless Texture LoRA (scale 1.0)
- LoRA: `https://huggingface.co/gokaygokay/Flux-Seamless-Texture-LoRA/resolve/main/seamless_texture.safetensors`
- Generate at 256px, downscale to 32px, quantize 24 colors, clean blacks, upscale to 512x512
- Black cleanup: replace near-black pixels (RGB sum < 40) with average of non-black neighbors
- Script: `scripts/clean-terrain-blacks.ts` processes all textures in `war-assets/textures/`
- Output: 512x512 PNG, ~8KB each, ~16-24 unique colors
- Reference: existing `forestfloor.png` (512x512, 30 colors, NearestFilter tiling)

**What NOT to do for textures:**
- Do NOT use Gemini - produces painterly results, not pixel art tiles
- Do NOT generate at 512+ px without aggressive downscaling - too detailed
- Do NOT include yellow/orange in Vietnam jungle biomes
- Do NOT describe focal points or framing - textures must be uniform density

**Gallery:** Textures have 3x3/5x5/8x8 tile preview buttons at http://localhost:3000/gallery

## Current Gaps

- **kiln/runtime.ts** (783 lines) - zero tests, WebGPU/Three.js renderer
- **Untested handlers**: analysis.ts (216 lines), batch.ts (112 lines), imageGen.ts (115 lines), model3d.ts (105 lines) - handler tests for input/processing/canvas/output exist
- **Untested node sub-components**: kiln/* (347 lines), quality/* (210 lines), export-sheet/* (85 lines)
- **Untested shared package**: presets.ts, api-types.ts, logger.ts (314 lines total)
- **No integration tests** against real Gemini/FAL/Claude APIs
- **0 unpushed commits** on main (synced with origin/main)

## Known Issues

- Three.js chunk is 1.4MB/380KB gzip (Vite warns about chunk size) - lazy loaded, only affects 3D workflows
- **bun:test `mock.module` is importer-resolved**. In a monorepo with hoisted deps (e.g. `@anthropic-ai/claude-agent-sdk` resolved differently from `packages/server` vs `packages/core`), a single `mock.module('<bare-specifier>', ...)` only catches one resolution. Register a second mock against the absolute resolved path (via `fileURLToPath(import.meta.url)` + `path.resolve`) to cover both. See `packages/server/tests/services/claude.test.ts` for the pattern.

## Quality Bar

Assets: consistent style, power-of-2 dimensions, clean transparency, <50KB sprites, engine-compatible formats. **Test by generating real assets**, not just running code.

## Asset Templates

Presets in `packages/shared/presets.ts`. See `docs/asset-reference.md` for detailed prompt templates and test case specs.

## Skills

Local skills in `.claude/skills/`: nano-banana-pro, pixel-art-professional, canvas-design, frontend-design, kiln-glb, kiln-tsl

## Development Approach

Build features by using them. Generate actual game assets and verify they work in-game. When a template produces good results, save the configuration.
