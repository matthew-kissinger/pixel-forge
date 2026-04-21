# Script Audit — Wave 4 Distillation

**Generated:** 2026-04-21
**Total scripts:** 54 (39 TS gen-*, 12 Python, 5 utilities)
**Scope:** scripts/ root only

## Top-Level Categorization

| Category | Count | Notes |
|----------|-------|-------|
| Live (keep + refactor) | 33 | Canonical recipes for W4.8 |
| One-shot fixes | 16 | Archive in W4.7 |
| Superseded (v1→v2+) | 4 | Archive in W4.7 |
| Utilities | 5 | Keep at root |
| Untracked live | 3 | Add to git; keep |
| Untracked archive | 2 | Stage; archive |

## 1. Live Scripts (Keep as Recipe Inputs for W4.8)

**TS 2D/Image (25 scripts):**
- `generate.ts` — Master CLI; apiPost retry (5min timeout), chromaCleanMagenta, loadImageAsBase64 helpers
- `gen-batch1-v2.ts` — Pixel art + magenta BG + BiRefNet cleanup
- `gen-batch2-redo.ts` — Bamboo + Banyan; canonical sprite generator
- `gen-textures-v3.ts` — FAL FLUX2 + Seamless Texture LoRA; 7-asset batch
- `gen-sprint2-icons.ts`, `gen-sprint2-screens.ts` — S2 icon + screen generation
- `gen-sprint3-icons.ts`, `gen-sprint3-soldiers.ts` — S3 assets; T-pose + 9-direction sets
- `gen-sprint4-2d.ts` — HUD assets (end screen, damage, hit marker, skybox)
- `gen-ui-icons.ts` — 3-stage pipeline: style sheet (ref) → seed → batch fill
- `gen-command-icons-v2.ts` — Command UI refined; refs v1 for consistency
- `gen-weapon-icons-redo.ts` — Clean weapon silhouettes; monochrome
- `gen-start-screen.ts` — Main menu screen; landscape layout
- `gen-vegetation-redo.ts` — Veggie billboards; Gemini→BiRefNet→magenta
- `gen-jungle-floor-v3.ts` — Jungle floor v3; seamless LoRA tile
- `gen-rice-paddy.ts` — Rice paddy texture; seamless
- `gen-nva-soldiers.ts`, `gen-arvn-soldiers.ts`, `gen-arvn-remaining.ts`, `gen-vc-soldiers.ts` — Faction soldier generators
- `gen-vc-mounted.ts` — VC + mounted weapons (untracked)

**PY GLB/3D (8 scripts):**
- `gen-aircraft-watercraft.py` — Helicopters + boats; headless Claude API
- `gen-ground-vehicles.py` — Trucks, jeeps, APCs; named parts for animation
- `gen-weapons.py` — Rifles, launchers, sidearms; scoped models
- `gen-buildings.py` — Firebase, HQ, barracks; compound meshes
- `gen-firebase.py` — Terrain + fortifications; sandbags, wire, bunkers
- `gen-animals-v2.py` — Fauna v2 (untracked; replaces v1)
- `gen-remaining.py` — Catch-all misc GLB models
- `gen-fixes-v2.py` — v2 fix pipeline (untracked)

## 2. One-Shot Fix/Redo Scripts (Archive in W4.7)

**13 TS + 3 PY = 16 total**

All fixed specific issues; now resolved or superseded. Archive with manifest:

- `gen-sprint3-fix.ts` — Fixed S3 soldier pose issues
- `gen-cmd-flanks-fix.ts`, `gen-cmd-icons-fix.ts` — Fixed command icon layout; replaced by gen-command-icons-v2
- `gen-faction-icons-fix.ts` — Fixed faction icon clarity
- `gen-grenade-icon-fix.ts`, `gen-weapon-icons-fix.ts` — Fixed weapon icon issues
- `gen-grass-redo.ts` — Tall grass redo (yellow tint); merged into gen-textures-v3
- `gen-bamboo-floor-redo.ts` — Bamboo floor redo; in gen-textures-v3
- `gen-banyan-redo.ts`, `gen-banyan-redo2.ts` — Banyan tree redos; redo2 is final
- `gen-nva-sidewalk1-fix.ts`, `gen-nva-frontfire-fix.ts` — Fixed NVA building issues
- `gen-arvn-sidewalk-fix.ts` — Fixed ARVN building
- `gen-fixes.py` — Python GLB one-shot fixes
- `patch-fixes.py`, `patch-fixes2.py` — Python patch iterations (untracked)

## 3. Superseded Scripts (Archive in W4.7)

**4 total:**

| V1 | V2/V3 | Improvements |
|----|-------|--------------|
| `gen-batch1.ts` | `gen-batch1-v2` | Red→magenta BG; pixel art; cleanup |
| `gen-batch2.ts` | `gen-batch2-redo` | Red→magenta; pixel art; better Banyan |
| `gen-textures.ts` | `gen-textures-v2` | FLUX API; LoRA |
| `gen-textures-v2.ts` | `gen-textures-v3` | +7 biomes; refined LoRA; FAL queue |

## 4. Utilities (Keep at Root)

**5 total:**

- `export-glb.ts` — Headless GLB export; used by Python GLBs + core
- `check-bundle-size.ts` — Bundle size audit; pre-commit enforcement
- `clean-terrain-blacks.ts` — Texture chroma cleanup; near-black replacement
- `gen-icon-compare.ts` — Visual icon batch review
- `gen-texture-compare.ts` — Visual texture batch review

## 5. Shared Helpers (Extract to packages/core/src/image/)

| Helper | Count | Priority | Purpose |
|--------|-------|----------|---------|
| `apiPost` | 26 | CRITICAL | Retry logic; 5min timeout; FAL/Gemini |
| `chromaCleanMagenta` | 16 | CRITICAL | Chroma key removal for magenta BG sprites |
| `chromaCleanBlue` | 9 | HIGH | Blue BG chroma (command icons) |
| `chromaCleanGreen` | 4 | MEDIUM | Green BG chroma (rare) |
| `loadImageAsBase64` | 9 | HIGH | PNG→base64 for Gemini refs |
| `existsSync` resume | 10 | MEDIUM | Idempotent guard pattern |

## 6. Python vs TS Distribution

Principled split: Python for GLB/headless, TS for 2D/Gemini/FAL.

- **2D sprites/icons/screens (TS):** 29 scripts
- **Textures/tileables (TS):** 5 scripts
- **GLB 3D models (PY):** 8 scripts
- **Patches (PY):** 2 scripts
- **Master CLI (TS):** 1 script
- **Utilities (TS):** 5 scripts

No exceptions.

## 7. Untracked Scripts in Working Tree

| Script | Category | Action |
|--------|----------|--------|
| `gen-animals-v2.py` | live | Add to git; keep |
| `gen-fixes-v2.py` | live | Add to git; keep |
| `gen-vc-mounted.ts` | live | Add to git; keep |
| `patch-fixes.py` | one-shot | Stage; archive W4.7 |
| `patch-fixes2.py` | one-shot | Stage; archive W4.7 |

## Summary

- **Total tracked:** 48 scripts (39 TS + 9 PY)
- **Total with untracked:** 54 scripts (42 TS + 12 PY)
- **Live (W4.8 recipes):** 33 scripts
- **Archive candidates (W4.7):** 20 scripts (16 one-shot + 4 superseded)
- **Shared helper extractions:** 6 functions → `packages/core/src/image/helpers.ts`

