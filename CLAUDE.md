# Pixel Forge

Node-based AI game asset generator. Substrate library `@pixel-forge/core` + four transports: React Flow editor (browser), CLI (citty), MCP server (stdio), HTTP API (Hono).

> **Cross-agent brief**: see [AGENTS.md](AGENTS.md) for the canonical agent-facing reference (architecture, public API, pipelines). This file holds Claude Code-specific extras: hooks, skills, project-specific gotchas.
>
> **Recent refactor**: see [docs/next-cycle.md](docs/next-cycle.md) for the 2026-04 cycle that landed `@pixel-forge/core` + CLI + MCP.
>
> **Kiln cycle (active)**: see [docs/kiln-vision.md](docs/kiln-vision.md). 48 primitives, 12 validation GLBs all audited clean, PBR + UV + CSG all wired. Round 1 ✅, Round 2 ✅, Round 3 ✅ (three.js 0.184 bump, door/vending/tower polish, agent-usage instrumentation surfaced as `render.meta.primitiveUsage`) — all landed 2026-04-22. Offline 6-view grid audit via `bun run audit:glb`, single-page review via `bun run audit:review`. Remaining minor polish tracked in [docs/kiln-round-3.md](docs/kiln-round-3.md) §4.

## Commands

```bash
bun run dev:client    # Vite dev server on :5173
bun run dev:server    # Hono API server on :3000
bun run build         # Production build
bun run typecheck     # tsc --noEmit (all packages)
bun run lint          # ESLint (all packages)

# Tests (run per-package, NOT from root)
cd packages/client && bunx vitest run                                # 1938 pass, 0 fail
cd packages/server && bun test                                       # 114 pass, 0 fail
cd packages/core && KILN_SPIKE_LIVE=0 IMAGE_PROVIDERS_LIVE=0 bun test  # 284 pass, 6 skip
cd packages/cli && bun test                                          # 16 pass
cd packages/mcp && bun test                                          # 7 pass
bun run test:e2e                                                     # Playwright smoke + mobile + workflow
bun run audit:glb                                                    # 6-view grid PNGs for all validation GLBs
bun run audit:glb gear.glb sword.glb                                 # subset
bun run audit:review                                                 # open single-page HTML review of all grids
```

## Stack

React 19, Vite 7, React Flow 12, Zustand, Tailwind, Bun, Hono

**AI Services (live — regenerate snapshot with `pixelforge health --audit`):**
- Gemini `gemini-3.1-flash-image-preview` (Nano Banana Pro, hero) + `gemini-2.5-flash-image` (bulk cohort) for 2D sprites
- OpenAI `gpt-image-2` (refs ≤ 16) + `gpt-image-1.5` (transparency/text-only); `OPENAI_HERO_MODEL` env pins a dated snapshot
- FAL `fal-ai/flux-lora` (tileable textures, current default) + `fal-ai/birefnet/v2` (bg removal with variant selector) + `fal-ai/bria/background/remove` (fallback) + Hunyuan3D V3 (image-to-3D spike)
- Claude `claude-opus-4-7` (Kiln 3D codegen, default) + `claude-sonnet-4-6` (preferCheap); `KILN_MODEL` env overrides

## Structure

```
packages/
  core/     # @pixel-forge/core — substrate: kiln/ image/ providers/ schemas/ pipelines/. THE library agents consume.
  client/   # React Flow editor: 30 node components (lazy-loaded), runtime/ split, Zustand store, executor engine
  server/   # Hono API: thin routes over core/, services delegate to core/providers
  cli/      # @pixel-forge/cli — citty adapter. `bunx pixelforge gen sprite|icon|texture|glb|soldier-set ...`
  mcp/      # @pixel-forge/mcp — @modelcontextprotocol/sdk stdio adapter. Tools mirror CLI commands.
  shared/   # Shrunk — only cross-adapter types remain (kiln-* moved to core)
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

**Pipeline:** FLUX 1 + Seamless Texture LoRA (FAL) -> nearest-neighbor downscale (32px) -> palette quantize (24 colors, no dither) -> black pixel cleanup -> nearest-neighbor upscale (512x512)

**FLUX prompt structure:**
```
smlstxtr, retro 16-bit SNES RPG terrain tileset tile, {terrain description}, top-down overhead view, {color palette guidance}, limited color palette, chunky visible pixel blocks, uniform density no focal point, flat game terrain texture, no perspective no shadows no depth, seamless texture
```

**Key settings:**
- Model: `fal-ai/flux-lora` with Seamless Texture LoRA (scale 1.0)
- Why: current seamless LoRA is FLUX 1 trained; `fal-ai/flux-2/lora` returns 422 until we adopt a FLUX 2 compatible seamless LoRA.
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

**Gallery:** Textures have 3x3/5x5/8x8 tile preview buttons at http://localhost:3000/gallery. GLBs have an **Inspect** button that opens `/gallery/view/:path` — a fullscreen inspector with 7 camera presets (1-7), working wireframe (W), studio/void/checker scene modes (B/N/M), exposure +/-, auto-rotate (R), and live metadata (tris / materials / meshes / world-space bbox). Use this when visually auditing Kiln output *interactively*.

**Offline audit:** `bun run audit:glb` renders a 3×2 grid PNG (Front / Right / Back / Left / Top / 3-4) for each GLB in `war-assets/validation/` to `war-assets/validation/_grids/`. Headless Three.js with strict back-face culling — catches winding bugs the `<model-viewer>`-based inspector hides. Use this whenever you touch primitive geometry; the inspector renders double-sided, which masks inverted normals. Script: [scripts/visual-audit.ts](scripts/visual-audit.ts).

## Critical: Kiln GLB Orientation and Attachment

Kiln uses one world frame for game-ready assets: `+X` forward/nose/muzzle, `+Y` up, `+Z` right side, ground at `Y=0`. Keep aircraft, vehicles, weapons, boats, and buildings in that frame.

Default `cylinderGeo`, `capsuleGeo`, and `coneGeo` are Y-axis primitives. For common oriented parts, use the newer helpers instead of hand-rotating:

| Need | Use |
|---|---|
| Forward fuselage, cannon, barrel, missile, muzzle | `capsuleXGeo`, `cylinderXGeo`, `coneXGeo` |
| Side pod, rail, float, crossbar | `capsuleZGeo`, `cylinderZGeo`, `coneZGeo` |
| Strut, brace, cable, skid support, scaffold rail | `beamBetween()` |
| Ladder | `createLadder()` |
| Aircraft/helicopter wings or stub wings | `createWingPair()` |

Attachment is mandatory. Wings need `createWingPair()` with `rootZ` equal to the fuselage half-width so roots visibly touch the body. Ladders need two continuous rails plus repeated rungs. Rails, braces, and struts should be built from endpoint helpers so they terminate on the surfaces they connect. Any visually-attached part should touch or overlap by about `0.02` units.

**Decals (red stars, hull numbers, stamps, ARVN markings, unpainted windows)** use `decalBox(width, height, depth=0.01)` — a thin box you can position against a surface. Do NOT reach for `planeGeo` for solid-color decals; without a texture it renders as a 2-triangle square at world origin and the structural validator flags it. `planeGeo` is reserved for textured signs / unwrapped billboards.

**Y-axis aliases are registered.** `cylinderYGeo` / `capsuleYGeo` / `coneYGeo` are valid calls that alias the Y-default primitives. Pick the form that best documents intent — both work. Use `cylinderXGeo` / `cylinderZGeo` only when you need the alternate orientation.

**`beamBetween("name", start, end)` rejects zero-length inputs** (δ < 1e-4) with a descriptive error. Either pick distinct endpoints or switch to `cylinderGeo` with explicit length + position.

Low-triangle output can still be bad output. Spend triangles on silhouettes that players read immediately: aircraft bodies, swept wings, cockpits, rotors, wheels, organic rocks, and ruins. Name checks and tri budgets do not prove quality; use `kiln.inspect()` plus the gallery/audit screenshots.

Do not silently replace requested generated sprites/icons/NPCs/vegetation/effects with procedural SVG/HTML/canvas placeholders. If provider calls fail, report the provider failure or leave the asset marked pending. Real 2D assets must use the sprite, icon, soldier-set, or texture pipelines.

## Error-recovery loop (Kiln GLB)

The batch harness now **feeds runtime errors and structural warnings back into the next attempt's prompt.** When a Kiln codegen attempt throws at render time, the retry receives both the prior code and the exact error text — and should emit a *corrected* program, not the same code again. Two categories of feedback you will see:

- **Runtime errors** — full message (up to 800 chars) + the code that threw. Fix the specific call site. Consumed `maxRetries` budget.
- **Structural warnings** — `Stray plane at origin: <name>` or `Floating parts: <names>`. These come from `inspectSceneStructure` in [packages/core/src/kiln/render.ts](packages/core/src/kiln/render.ts). One soft-retry is allocated; if still flagged the asset writes with the warnings preserved in its provenance sidecar so the review UI can surface them.

Practical implications for Kiln codegen:

- If an error mentions `cylinderYGeo` / `capsuleYGeo` / `coneYGeo` not defined, update your mental model — those aliases are registered now.
- If you see a stray-plane warning, replace `planeGeo` with `decalBox` or position the plane against the target surface.
- If you see a floating-part warning, extend geometry into contact (≥ `0.02` overlap) or delete the dangling piece.

## Review artifacts agents can consume

Every generated asset now drops a sibling provenance sidecar plus optional human annotations:

- `<asset>.provenance.json` — `{ provider, model, prompt, promptHash, latencyMs, warnings, code, extras }`. Written automatically by the sprite / icon / texture / GLB / soldier-set CLIs and by `scripts/_direct-batch.ts`.
- `war-assets/_review/issues.json` — `{ <asset-slug>: { chips, note, ts } }`, written by the tier-2 review UI (`pixelforge audit review --serve`). Chips are `wrong-axis`, `floating`, `stray-plane`, `proportions`, `missing-part`, `style`; `note` is freetext.
- Audit grids — `war-assets/validation/_grids/*.png` (from `bun run audit:glb`) plus `war-assets/validation/review.html` (from `scripts/audit-review-page.ts`, served via `pixelforge audit server`).

Before re-running a batch, read `issues.json` to pick up human QA that happened between runs.

## Current Gaps

Round 3 landed (2026-04-22). Remaining follow-ups in [docs/kiln-round-3.md](docs/kiln-round-3.md) §4:

- **Minor polish candidates**: `planeUnwrapSingle` (single-face unwrap for signs), `cylinderUnwrap({ capMode })`, `pickProviderFor` on public namespace, `createSoldierSetPipeline` partial regen.
- **Surface `primitiveUsage` in gallery** — counter now exists on `render.meta.primitiveUsage`; gallery metadata panel not yet reading it.
- **No live integration tests** against real Gemini/FAL/Claude/OpenAI APIs (live tests gated behind `KILN_SPIKE_LIVE=1` and `IMAGE_PROVIDERS_LIVE=1` — run them manually).
- **Dep upgrade pending**: 5 patch + 12 minor + 15 major bumps available. See [docs/dep-upgrade-audit.md](docs/dep-upgrade-audit.md). Biggest forced coupling: `@vitejs/plugin-react@6` peer-requires `vite@8`.

## Known Issues

- Three.js chunk is 1.4MB/380KB gzip (Vite warns about chunk size) - lazy loaded, only affects 3D workflows
- **bun:test `mock.module` is importer-resolved**. In a monorepo with hoisted deps (e.g. `@anthropic-ai/claude-agent-sdk` resolved differently from `packages/server` vs `packages/core`), a single `mock.module('<bare-specifier>', ...)` only catches one resolution. Register a second mock against the absolute resolved path (via `fileURLToPath(import.meta.url)` + `path.resolve`) to cover both. See `packages/server/tests/services/claude.test.ts` for the pattern.

## Quality Bar

Assets: consistent style, power-of-2 dimensions, clean transparency, <50KB sprites, engine-compatible formats. **Test by generating real assets**, not just running code.

## Asset Templates

Presets in `packages/shared/presets.ts`. See `docs/asset-reference.md` for detailed prompt templates and test case specs.

## Skills

Local skills in `.claude/skills/`: **pixel-forge** (umbrella — generating assets via core/CLI/MCP), nano-banana-pro (Gemini-specific), pixel-art-professional (post-processing techniques), canvas-design, frontend-design, kiln-glb, kiln-tsl

## Development Approach

Build features by using them. Generate actual game assets and verify they work in-game. When a template produces good results, save the configuration.
