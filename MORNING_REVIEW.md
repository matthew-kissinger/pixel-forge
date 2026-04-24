# Morning Review — Overnight Asset Run (2026-04-23)

> **Update 2026-04-24 — Rails Upgrade landed.** See the new section below before re-reading yesterday's notes; it supersedes the "Bugs fixed along the way" and "⚠ Need your attention" blocks.

## Rails Upgrade (2026-04-24)

Targeted fixes + first-class agent workspace treatment, implemented end-to-end
and smoke-verified.

### What changed

- **Hallucinated Y-axis primitives** — `cylinderYGeo`, `capsuleYGeo`, `coneYGeo` now exist as aliases, are registered in the sandbox, and are whitelisted in the primitive-usage counter. Prompt explicitly permits them. (Phase A)
- **`decalBox` primitive** — new helper for stars / stamps / hull numbers on untextured GLBs. Replaces the `planeGeo`-at-origin antipattern. Prompt directs the LLM to use it. (Phase B)
- **`stray-plane-at-origin` + `floating-part` validators** — runtime structural checks that feed warnings back into a ONE-shot corrective retry via `scripts/_direct-batch.ts`. (Phase B)
- **Error-feedback retry loop** — when an attempt fails, the harness embeds the exact runtime error + prior code in the next user turn. No more identical-code re-emits. (Phase A)
- **Opus 4.7 restored as Kiln default** — `DEFAULT_OPUS_MODEL = 'claude-opus-4-7'` with `KILN_MODEL` env override and `--model` CLI pass-through. `@anthropic-ai/claude-agent-sdk@^0.2.118` + direct-API path handle `thinking.type=adaptive` correctly. (Phase C)
- **Tier-2 review UI + local Bun server** — `pixelforge audit review/server`, 6 chip tags (`wrong-axis`, `floating`, `stray-plane`, `proportions`, `missing-part`, `style`) + freetext, auto-persists to `war-assets/_review/issues.json`. Smoke-tested `GET /issues.json` → `POST /annotate` → readback. (Phase D)
- **Live model audit** — `scripts/_model-audit.ts` (and `pixelforge health --audit`) writes `docs/model-catalog-YYYY-MM-DD.md` + `packages/core/src/providers/_catalog.generated.json`. Today's snapshot: 9 Anthropic, 87 OpenAI, 39 Gemini, 8 FAL models live. (Phase E1)
- **Provider wiring** — `gemini.ts` gains `createGeminiFlashProvider()` (`gemini-2.5-flash-image`) for bulk; `GEMINI_HERO_MODEL` / `OPENAI_HERO_MODEL` / `OPENAI_TEXT_MODEL` env overrides; `createFalBriaBgRemovalProvider()` fallback; BiRefNet v2 variant selector now maps short slugs (`light` / `heavy` / ...) to the API's enum strings (`"General Use (Light)"`, etc.). (Phase E2)
- **`pixelforge health` CLI + pre-flight** — 4-provider liveness probe, wired into `scripts/run-overnight.sh` and `scripts/run-2d-additions.sh` (`PF_SKIP_HEALTH=1` to bypass). (Phase E3)
- **Provenance sidecars** — every asset write now emits `<asset>.provenance.json` with `{provider, model, prompt, promptHash, seed?, latencyMs, cost?, warnings, extras}`. Applied to `gen sprite/icon/texture/glb/soldier-set` and the batch GLB harness (with `attempts`, `softFailuresUsed`, `structuralWarnings`, `primitiveUsage`). (Phase E4)
- **Agent docs refreshed** — `AGENTS.md` §7e/§8/§9, `CLAUDE.md` asset rails + error-recovery + review-artifacts sections, skills for `pixel-forge` / `kiln-glb` / `nano-banana-pro` all updated, new `.agents/skills/pixel-forge/asset-pipelines.md` reference page. (Phase F)

### Verification — what was actually run

- `bun packages/cli/src/index.ts health --audit` → 4 greens (Anthropic 9 models, OpenAI 87, Gemini 39, FAL 8). `docs/model-catalog-2026-04-24.md` regenerated.
- `bun test` across `packages/core/src/kiln/__tests__/{list-primitives,primitives,inspect,render-edges,prompt}.test.ts` → 86/86 pass.
- `bun x tsc --noEmit` on `packages/core` + `packages/cli` → clean.
- **Phase-A replay:** `egret` via `scripts/replay-failures.ts` → `claude-opus-4-7`, 1 attempt, 25.6 s, 688 tris, used `capsuleYGeo` + `cylinderYGeo` naturally, no structural warnings. Provenance sidecar captures full primitive usage.
- **Phase-B replay:** `claymore-clicker` via the same replay → 1 attempt, 14.6 s, 332 tris, no stray-plane warning (LLM reached for `decalBox` per the prompt update).
- **2D smoke (3 items):** `banana-tree.png` (sprite, OpenAI `gpt-image-1.5`, 41.5 s, $0.08), `castle-icon.png` (icon, OpenAI `gpt-image-1.5`, 27.0 s, $0.08), `stone-tile.png` (texture, FAL FLUX + Seamless LoRA, 14.1 s). All three emitted provenance sidecars.
- **Tier-2 review server:** booted on `127.0.0.1:7802`, `POST /annotate` → `GET /issues.json` round-tripped correctly, then cleaned up.

Outputs live under `war-assets/replay/` (GLBs) and `war-assets/replay/2d/` (PNGs).

### Known regression, documented

- **FLUX 2 LoRA endpoint (`fal-ai/flux-2/lora`) returned 422** on our current FLUX-1-trained Seamless LoRA (`gokaygokay/Flux-Seamless-Texture-LoRA`). Default for `createFalTextureProvider()` is kept at `fal-ai/flux-lora` (FLUX 1) until a FLUX 2 seamless LoRA is trained or sourced. Texture quality is unchanged from the previous overnight run. Flip via `opts.endpoint` when ready.
- **`createFalBgRemovalProvider` variant default** was `'general-dynamic'` but the BiRefNet v2 API expects the human-readable enum (`"General Use (Light)"` etc.). Variant default is now `'light'` and short slugs are mapped to API enums in `BIREFNET_V2_MODEL_MAP`. Fixed.

### How to use the new rails

```bash
pixelforge health              # 4-provider liveness
pixelforge health --audit      # also refreshes docs/model-catalog-*.md
pixelforge audit review        # build review.html
pixelforge audit server        # serve + persist to war-assets/_review/issues.json
KILN_MODEL=claude-opus-4-7 pixelforge gen glb --category=prop --name=crate \
    --prompt "..."             # hero GLB with provenance sidecar
```

Every generated asset writes a `.provenance.json` sibling — agents can grep
those files to reproduce or blame a specific output, and humans feed QA back
through the review UI for the next batch to consume.

---

Left you a cook of the entire Terror-in-the-Jungle GLB catalog. Everything re-generated via the Round-3 rails (helpers + coordinate contract + `kiln.generate` through `@pixel-forge/core/image/pipelines`), with new creative additions per category.

## What to look at first

1. **Gallery (live):** http://localhost:3000/gallery — auto-scans `war-assets/`. Click any GLB to open the inspector (camera presets 1-7, `W` wireframe, `B/N/M` scene modes).
2. **Audit grids:** `war-assets/validation/_grids/*.png` — one 3×2 grid per GLB (Front / Right / Back / Left / Top / 3-4). Strict back-face culling catches winding bugs the inspector masks.
3. **Logs:** `war-assets/_overnight-logs/<category>.log` — per-category stdout from generation + audit.

## What changed

- **Aircraft:** 6 regen (huey, uh1c, cobra, skyraider, ac47, f4) + 4 new (OV-10 Bronco, CH-47 Chinook, OH-6 Kiowa, MiG-17).
- **Ground vehicles:** 5 regen (m48, m113, pt76, m35, jeep) + 4 new (T-54, Ontos, ZIL-157, M42 Duster).
- **Watercraft:** 2 regen (pbr, sampan) + 3 new (Swift Boat PCF, LCM-8 Mike, rubber raiding raft).
- **Weapons:** 9 regen (m16, ak47, m60, m2, m1911, m3, m79, rpg7, ithaca) + 6 new (M14, SKS, Dragunov SVD, RPD LMG, K-bar, claymore clicker).
- **Buildings:** 12 regen + 6 new (Buddhist temple, stilt-house, schoolhouse, tea-house, rubber-plantation mansion, rice mill).
- **Structures:** 34 regen + 8 new (fuel point, PSP airstrip, spiderhole, field kitchen, observation post, flagpole, bomb crater, ammo CONEX).
- **Animals:** 6 regen + 6 new (gibbon, Burmese python, tokay gecko, water monitor, pond heron, flying fox).
- **Props:** 1 regen (barrel) + 10 new (rice sacks, jungle hammock, field map table, PRC-25 radio, ox cart, oil lamp, fish trap, jerry can, straw hat, mess kit).

**Total:** ~125 GLBs.

## ⚠ Need your attention

**FAL_KEY is empty** in `~/.config/mk-agent/env`. Notepad should already be open on that file. Fill in your FAL API key (from https://fal.ai/dashboard/keys), save, then:

```bash
./scripts/run-2d-additions.sh
```

That'll run the 3 pending 2D batches (vegetation +6, textures +4, character sprites +12) — they need FAL for BiRefNet (sprites) and FLUX (textures).

## Bugs fixed along the way

- `@anthropic-ai/claude-agent-sdk@0.2.50` sends `thinking.type=enabled` which Opus 4.7 rejects. Updated to 0.2.118, switched `DEFAULT_OPUS_MODEL` to `claude-sonnet-4-6` in [packages/core/src/kiln/generate.ts:83](packages/core/src/kiln/generate.ts:83).
- Agent SDK (even 0.2.118) hung indefinitely on Windows + bun + nested-Claude-Code. Wrote a direct-API bypass at [scripts/_direct-generate.ts](scripts/_direct-generate.ts) using `@anthropic-ai/sdk@0.90.0`. All `gen-*.ts` now use this path via [scripts/_direct-batch.ts](scripts/_direct-batch.ts).

`@anthropic-ai/claude-agent-sdk@0.2.50` sends `thinking.type=enabled` which Opus 4.7 rejects (400 `"use thinking.type=adaptive + effort"`). First aircraft run failed on this — switched `DEFAULT_OPUS_MODEL` in [packages/core/src/kiln/generate.ts:83](packages/core/src/kiln/generate.ts:83) to `claude-sonnet-4-6` as the working default. Revert when the SDK is upgraded to the new thinking API.

## Pre-existing Feb assets preserved

Everything you had before is in `war-assets/_backup-2026-04-23/` — aircraft, ground, watercraft, weapons, buildings, animals, props, structures. If any new generation is worse than the old, just copy back.

## What to look for in the grids

**Aircraft (the Codex regression surface):**
- Helicopter tail rotors — blades in the YZ plane (standing vertical), NOT lying flat in XZ.
- Skids — two continuous rails along +X, connected to fuselage by 2 struts per side.
- Stub wings — attached flush via `createWingPair`, no floating.

**Vehicles:**
- Tracks along +X, wheels side-mounted (cylinderZGeo).
- Turrets named `turret`, main guns named `mainGun`, with rotation pivots.
- Antennas terminate at body surfaces (via `beamBetween`).

**Weapons:**
- Barrels along +X (firing axis).
- Bipods/tripods feet at Y=0.
- Magazines seated in magazine wells.

**Structures:**
- Legs from ground up to platform via `beamBetween` (tower class).
- Sandbag walls as stacked units, not single boxes.

## If something went wrong

- Partial run? Re-run `./scripts/run-overnight.sh <category>` — batch pipeline skips existing GLBs via `existsSync`.
- Specific asset broken? Edit the prompt in `scripts/gen-<category>.ts`, `rm war-assets/<category>/<slug>.glb`, re-run that one category.
- Need old version back? `cp war-assets/_backup-2026-04-23/<path> war-assets/<path>`.

## Asset counts (filled in by post-run step)

<!-- AUTO-UPDATED -->
## Asset counts (run complete)

Total GLBs now: **124** (was 75 before the run)

| Category | After | Before | New additions |
|---|---|---|---|
| Aircraft | 10 | 6 | ch47-chinook, mig17-nva, oh6-kiowa-scout, ov10-bronco |
| Ground vehicles | 9 | 5 | m42-duster, ontos, t54-tank, zil-157 |
| Watercraft | 5 | 2 | lcm-8, raiding-raft, swift-boat-pcf |
| Weapons | 15 | 9 | claymore-clicker, dragunov-svd, kbar-knife, m14, rpd-lmg, sks |
| Buildings | 19 | 12 | buddhist-temple, rice-mill, rubber-plantation-mansion, schoolhouse, stilt-house, tea-house, village-hut-damaged, village-hut |
| Structures | 43 | 34 | airstrip-psp, ammo-conex, bomb-crater, bridge-stone, field-kitchen, firebase-flagpole, fuel-point, jungle-guard-tower, observation-post, rice-paddy, spiderhole |
| Animals | 12 | 6 | burmese-python, flying-fox-bat, gibbon, pond-heron, tokay-gecko, water-monitor |
| Props | 11 | 1 | field-map-table, fish-trap, jerry-can, jungle-hammock, mess-kit, oil-lamp, ox-cart, prc-25-radio, rice-sack-stack, straw-conical-hat |

### 2D
- Vegetation sprites: 13
- Terrain textures: 12
- Soldier + character sprites: 26
- UI icons: 230

### Audit grids produced: 136

Sample grids (click to open):
- [aircraft-a1-skyraider-grid.png](war-assets/validation/_grids/aircraft-a1-skyraider-grid.png)
- [aircraft-ac47-spooky-grid.png](war-assets/validation/_grids/aircraft-ac47-spooky-grid.png)
- [aircraft-ah1-cobra-grid.png](war-assets/validation/_grids/aircraft-ah1-cobra-grid.png)
- [aircraft-ch47-chinook-grid.png](war-assets/validation/_grids/aircraft-ch47-chinook-grid.png)
- [aircraft-f4-phantom-grid.png](war-assets/validation/_grids/aircraft-f4-phantom-grid.png)
- [aircraft-mig17-nva-grid.png](war-assets/validation/_grids/aircraft-mig17-nva-grid.png)
- [aircraft-oh6-kiowa-scout-grid.png](war-assets/validation/_grids/aircraft-oh6-kiowa-scout-grid.png)
- [aircraft-ov10-bronco-grid.png](war-assets/validation/_grids/aircraft-ov10-bronco-grid.png)
- [aircraft-uh1-huey-grid.png](war-assets/validation/_grids/aircraft-uh1-huey-grid.png)
- [aircraft-uh1c-gunship-grid.png](war-assets/validation/_grids/aircraft-uh1c-gunship-grid.png)
- [animal-burmese-python-grid.png](war-assets/validation/_grids/animal-burmese-python-grid.png)
- [animal-egret-grid.png](war-assets/validation/_grids/animal-egret-grid.png)
- [animal-flying-fox-bat-grid.png](war-assets/validation/_grids/animal-flying-fox-bat-grid.png)
- [animal-gibbon-grid.png](war-assets/validation/_grids/animal-gibbon-grid.png)
- [animal-king-cobra-grid.png](war-assets/validation/_grids/animal-king-cobra-grid.png)
- [animal-macaque-grid.png](war-assets/validation/_grids/animal-macaque-grid.png)
- [animal-pond-heron-grid.png](war-assets/validation/_grids/animal-pond-heron-grid.png)
- [animal-tiger-grid.png](war-assets/validation/_grids/animal-tiger-grid.png)
- [animal-tokay-gecko-grid.png](war-assets/validation/_grids/animal-tokay-gecko-grid.png)
- [animal-water-buffalo-grid.png](war-assets/validation/_grids/animal-water-buffalo-grid.png)
- ... and 116 more in [war-assets/validation/_grids/](war-assets/validation/_grids/)
