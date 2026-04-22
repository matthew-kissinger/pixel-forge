# Script Archive Manifest — Wave 4.7

**Created:** 2026-04-21
**Purpose:** Document provenance of archived scripts; one-shot fixes and superseded versions that will be moved here in W4.7.

---

## One-Shot Fix Scripts (13 TS + 3 PY)

These scripts fixed specific issues in game assets. The fixes have been applied; assets regenerated via live canonical scripts. Archived for historical reference.

- `gen-sprint3-fix.ts` — Fixed S3 soldier T-pose alignment + 9-direction rotation issues. Status: resolved (regenerated via live scripts). Original run: ~Feb 2026.
- `gen-cmd-flanks-fix.ts` — Fixed command icon layout (flanks row positioning). Status: resolved; replaced by `gen-command-icons-v2.ts`. Original run: Feb 2026.
- `gen-cmd-icons-fix.ts` — Fixed command icon text/label clutter. Status: resolved; `gen-command-icons-v2.ts` canonical. Original run: Feb 2026.
- `gen-faction-icons-fix.ts` — Fixed faction icon color clarity + silhouette issues. Status: resolved; integrated into `gen-ui-icons.ts` workflow. Original run: Feb 2026.
- `gen-grenade-icon-fix.ts` — Fixed grenade icon silhouette (too cartoony). Status: resolved; live `gen-weapon-icons-redo.ts` replaces. Original run: Feb 2026.
- `gen-weapon-icons-fix.ts` — Fixed weapon icon text overlay + background artifacts. Status: resolved; `gen-weapon-icons-redo.ts` canonical. Original run: Feb 2026.
- `gen-grass-redo.ts` — Retexture tall grass (yellow tint in first pass). Status: redo successful; logic merged into `gen-textures-v3.ts`. Original run: ~Feb 2026.
- `gen-bamboo-floor-redo.ts` — Retexture bamboo floor (first pass too sparse). Status: redo applied; integrated into `gen-textures-v3.ts`. Original run: Feb 2026.
- `gen-banyan-redo.ts` — Redraw banyan tree (aerial roots too dense, painterly style abandoned). Status: redo 1; replaced by `gen-banyan-redo2.ts` for final. Original run: Feb 2026.
- `gen-banyan-redo2.ts` — Final banyan tree redo (pixel art, cleaner silhouette). Status: redo 2 = canonical; assets use this version. Original run: Feb 2026.
- `gen-nva-sidewalk1-fix.ts` — Fixed NVA sidewalk building fireport positioning. Status: resolved; main asset stable now. Original run: Feb 2026.
- `gen-nva-frontfire-fix.ts` — Fixed NVA building fireport alignment to match unit behavior. Status: resolved; asset stable. Original run: Feb 2026.
- `gen-arvn-sidewalk-fix.ts` — Fixed ARVN sidewalk building texture + mesh placement issues. Status: resolved; main asset stable. Original run: Feb 2026.
- `gen-fixes.py` — Python GLB one-shot fixes (model fixes, scaling, rotation corrections). Status: fixes applied to source assets. Original run: historical (early Feb).
- `patch-fixes.py` — Python patch fixes (one-shot redo, untracked). Status: one-shot iteration; no longer needed. Original run: historical.
- `patch-fixes2.py` — Python patch v2 (second iteration, untracked). Status: one-shot iteration; superseded. Original run: historical.

---

## Superseded Version Scripts (4 TS)

These scripts were replaced by improved versions. Archived for version history reference.

- `gen-batch1.ts` — Vegetation batch v1; red background + generic cleanup. Replaced by `gen-batch1-v2.ts` (magenta BG, pixel art constraint, better cleanup). Original run: early Feb 2026.
- `gen-batch2.ts` — Vegetation batch v2; red background + generic cleanup. Replaced by `gen-batch2-redo.ts` (magenta BG, pixel art, refined Banyan). Original run: early Feb 2026.
- `gen-textures.ts` — Texture generation v1; basic FLUX + LoRA integration. Replaced by `gen-textures-v2.ts` (FLUX API integration, LoRA attachment). Original run: early Feb 2026.
- `gen-textures-v2.ts` — Texture generation v2; FLUX + LoRA iteration. Replaced by `gen-textures-v3.ts` (7 more biomes, refined seamless LoRA, FAL queue integration). Original run: Feb 2026.

---

## Archival Status

**Total scripts archived:** 20 (16 one-shot + 4 superseded). Executed in W4.7
on `refactor/scripts-distill` — see git log for the full history.

**Move method:** `git mv` for tracked scripts (preserves rename history); plain
`git add` for the three previously-untracked one-shot/patch scripts
(`gen-fixes-v2.py`, `patch-fixes.py`, `patch-fixes2.py`).

**Companion W4.7 categorization** of the 5 scripts that were untracked when the
audit ran:

| Script                | Decision      | Notes |
|-----------------------|---------------|-------|
| `gen-animals-v2.py`   | live, staged  | Re-emits the 6 animals with named-part hierarchy. Header says "Regenerate ... for procedural animation" — ongoing utility, not a fix. |
| `gen-vc-mounted.ts`   | live, staged  | Generates the VC mounted-soldier sprite using the dual-ref pattern; mirrors the live `gen-*-soldiers.ts` set. |
| `gen-fixes-v2.py`     | archived      | Header: "Regenerate broken models: towers (cross braces), M60 (bipod), bunkers (doors)" — explicit one-shot fix batch. |
| `patch-fixes.py`      | archived      | Header: "Patch generated JSON code and re-export GLBs" — patches one-shot iteration. |
| `patch-fixes2.py`     | archived      | Header: "Patch round 2: fix guard tower ladder tilt, redo comms tower without wires" — second one-shot iteration. |

**Future reference:**
- Use this manifest to understand why each script was archived
- If reversion needed, restore from git history (`refactor/scripts-distill`,
  prior to the W4.7 commit)
- Do not re-run archived one-shot scripts; use live canonical versions instead

---

## Untracked one-shot fixes archived in W4.7

- `gen-fixes-v2.py` — Python regen for towers/M60/bunkers after structural fixes. Status: applied; assets stable.
- `patch-fixes.py` — Patches generated JSON code (towers, M60 bipod, NVA bunker, ammo-bunker, perimeter-berm) then re-exports GLBs. Status: one-shot.
- `patch-fixes2.py` — Round-2 patches for guard-tower ladder tilt + comms-tower wires. Status: one-shot.

