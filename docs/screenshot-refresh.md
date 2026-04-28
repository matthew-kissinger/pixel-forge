# Screenshot Refresh

**Status:** Queued. The root README intentionally does not embed showcase screenshots right now. The next screenshot pass should use neutral Pixel Forge examples, not project-specific handoff or review assets.

Get explicit subject approval before spending provider tokens or recording a new full capture set.

## Remaining browser-capture shot list

### 1 · Editor hero — `editor-pipeline.png`

- **What:** full visual editor at `/` with a medium-complexity pipeline wired up (e.g. prompt → Gemini → BiRefNet → chroma-cleanup → export), nodes laid out cleanly, one node showing progress.
- **Viewport:** 1920×1080.
- **Why:** first impression. Must read "this is a node editor" at a glance.

### 2 · Gallery hero — `gallery-weapons.png` or new name

- **What:** gallery view at `/gallery` showing a mix of categories (weapons, vehicles, soldiers). Ideally multiple asset types on screen at once to communicate breadth.
- **Viewport:** 1920×1080.
- **Why:** shows output, not just process.

### 3 · Soldier sprites — `gallery-soldiers.png`

- **What:** faction soldier pose grid — T-pose + 8 directional poses for two factions (VC + US). Transparent background, laid out as a sheet.
- **Why:** demonstrates the T-pose-plus-pose-reference workflow that's hard to screenshot in the editor.

### 4 · Vegetation — `gallery-vegetation.png`

- **What:** row of vegetation sprites with magenta-cleanup applied. Ferns, palms, bamboo, ground cover.
- **Why:** shows background removal + chroma-key cleanup quality.

### 5 · Vehicles — `gallery-vehicles.png`

- **What:** aircraft GLB renders (F-4, Huey, C-130, MiG) inside the inspector — 3/4 view, studio lighting.
- **Why:** shows Kiln primitive composition producing recognizable aircraft.

### 6 · Ground vehicles — `gallery-ground-vehicles.png`

- **What:** tanks, APCs, jeeps, trucks. Same inspector angle.
- **Why:** complementary to aircraft; shows the breadth of what Kiln primitives cover.

### 7 · Textures — `gallery-textures.png`

- **What:** tileable terrain textures tiled 3×3 or 5×5 at `/gallery`. Show seamless edges.
- **Why:** proves the `fal-ai/flux-lora` + Seamless LoRA pipeline.

### 8 · Kiln validation grid — NEW

- **What:** one of the 6-view grids from `war-assets/validation/_grids/` — suggest `tower-grid.png` post-polish, since it has plinth + door + arrow slits + conical roof.
- **Why:** demonstrates the offline QA tool that catches winding bugs `<model-viewer>` hides.

### 9 · Inspector — NEW

- **What:** the `/gallery/view/:path` interactive inspector on a complex GLB (e.g. polished tower or a multi-material aircraft), with the metadata panel visible (tris, materials, meshes, bbox).
- **Why:** shows the interactive-vs-offline QA split.

### 10 · Agent flow — NEW (stretch)

- **What:** Claude Code window with `pixelforge_gen_glb` tool call visible, plus the produced GLB in the inspector side-by-side.
- **Why:** sells the MCP story.

## Subjects — which assets to feature

Awaiting user direction. Rough preference:

- **Theme:** current work is Vietnam-war-themed (factions VC + US, jungle terrain, era-appropriate vehicles). Either lean into that, or rebrand for OSS appeal with a more generic / fantasy theme before capturing.
- **Polished Round-3 assets are strongest for Kiln shots:** tower, door, vending machine — all have the polished versions rendered clean at three.js 0.184.

## Capture checklist (for when we do this)

- [ ] User approves neutral Pixel Forge subject list.
- [ ] Editor + server on latest main; `bun install && bun run build` clean.
- [ ] Assets regenerated from latest pipelines (no stale variants).
- [ ] Validation GLBs + grids refreshed (`bun scripts/validate-wave2a.ts` + siblings + `bun run audit:glb`).
- [ ] Screenshots captured at 1920×1080 or 2× Retina for crispness on GitHub.
- [ ] Check filesizes — PNG under ~500 KB where possible, use `sharp` or `oxipng` if needed.
- [ ] Add or replace entries in `docs/screenshots/` after the full capture pass ships.

## Demo video (stretch)

A 30-60 second screen-record of the editor building a pipeline → running it → dropping the result into a game would carry more weight than any screenshot. Not required for the refresh, but worth planning if we do a "Pixel Forge v1.0" moment.
