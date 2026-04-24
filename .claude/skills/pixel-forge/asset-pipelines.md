# Asset Pipeline Reference

One page per canonical pipeline in `@pixel-forge/core`. Use this before firing a
batch: it tells you the primary provider, the fallback chain, the known failure
modes (with log cites), and rough budget hints from observed runs.

Live provider/model IDs drift — always sanity-check with:

```bash
pixelforge health           # 4-provider liveness + visible models
pixelforge health --audit   # also regenerates docs/model-catalog-YYYY-MM-DD.md
```

---

## 1. `sprite`

Single-subject 2D sprite on a solid chroma-key background.

| Field | Value |
|-------|-------|
| Entry | `pixelforge gen sprite` → `createSpritePipeline()` |
| Primary | `gemini-3.1-flash-image-preview` (Nano Banana Pro) for hero/refs |
| Bulk | `gemini-2.5-flash-image` via `createGeminiFlashProvider()` |
| Alt | `gpt-image-2` (refs, better compositing) / `gpt-image-1.5` (text-only) |
| BG removal | `fal-ai/birefnet/v2` → `fal-ai/bria/background/remove` fallback |
| Output | `.png` + `<asset>.provenance.json` sidecar |

### Known failure modes

- **Transparent-background prompts produce checkerboards, not alpha.** Always ask for solid `#FF0000` / `#00FF00`, then feed through `createFalBgRemovalProvider()`.
- **FAL_KEY empty** — entire 2D run dies silently before reaching the model. Pre-flight with `pixelforge health`; recover via `bun scripts/_key-paste.ts`.
- **BiRefNet edge artifacts on red bg with red subjects** — swap subject bg to green or switch variant via `variant: 'portrait' | 'heavy'`.

### Budget hints (observed)

- Nano Banana Pro: ~4–7 s/image at 1K; ~$0.015–0.03 per image.
- Flash bulk: ~2–3 s/image; ~$0.004–0.008 per image.
- BiRefNet v2: ~2–4 s per removal; ~$0.003.

### Recovery steps

1. Check `war-assets/_review/issues.json` for chip `style` / `missing-part` on prior outputs — seed the next prompt with the freetext note.
2. Re-run with a locked seed from a known-good `provenance.json`.
3. If still bad, switch hero with `GEMINI_HERO_MODEL=nano-banana-pro-preview`.

---

## 2. `icon`

UI icon variants (base / outline / silhouette) at small sizes.

| Field | Value |
|-------|-------|
| Entry | `pixelforge gen icon --variant=base\|outline\|silhouette` |
| Primary | `gpt-image-2` (crisp edges at 64–256 px) |
| Bulk | `gemini-2.5-flash-image` |
| BG removal | `fal-ai/birefnet/v2` (variant `light` for icons) |

### Known failure modes

- **Icon appears centered in a much larger framed image** — OpenAI ignored size constraints. Add "icon fills 90% of frame, tight crop" to prompt.
- **Silhouette variant leaks interior detail** — explicitly say "pure black silhouette, no interior lines, no gradients, solid fill only".
- **Outline variant too thick at 64 px** — request 128 px then downscale.

### Budget hints

- `gpt-image-2`: ~6–10 s/icon; ~$0.02.
- `gemini-2.5-flash-image`: ~2 s/icon; ~$0.005.

---

## 3. `texture`

Seamless tileable textures (stone, fabric, metal, wood).

| Field | Value |
|-------|-------|
| Entry | `pixelforge gen texture --size=512 --paletteSize=16` |
| Primary | `fal-ai/flux-2/lora` (FLUX 2 with LoRA-ready endpoint) |
| Alt | `fal-ai/recraft/v3/text-to-image` (cleaner tileable output on some domains) |

### Known failure modes

- **FAL default is still `flux-lora` in old code paths** — confirm `createFalTextureProvider()` constructed after this rail upgrade (defaults to `fal-ai/flux-2/lora`).
- **Seam artifacts at tile boundary** — prompt must include "seamless tile, repeats perfectly in all directions, no visible seam, no border, no shadow falloff at edges".
- **Over-saturated output when paletteSize is small** — raise to 24 or 32 for organic textures; 16 is fine for pixel tiles.

### Budget hints

- FLUX 2 LoRA: ~8–15 s/texture; ~$0.02–0.04.

---

## 4. `soldier-set`

Multi-pose character sheet (T-pose + 8 pose sprites) with style-locked refs.

| Field | Value |
|-------|-------|
| Entry | `pixelforge gen soldier-set --faction=<>  --role=<>` |
| T-pose | `gemini-3.1-flash-image-preview` (hero quality + reference for rest) |
| Poses  | Same model, reference-locked to the T-pose output |
| BG removal | `fal-ai/birefnet/v2` per sprite |
| Output | 1 T-pose PNG + N pose PNGs, each with provenance sidecar |

### Known failure modes

- **Pose sheets lose weapon across poses** — reference image must include the weapon silhouette explicitly; pin `seed` in pose calls.
- **Helmet colors drift** — include a palette chip PNG as a second reference image.
- **Sprite count mismatch** — batch retries don't know which pose failed. Inspect `provenance.json` to identify missing poses and rerun per-pose.

### Budget hints

- Full set (9 images): ~45–75 s; ~$0.15–0.25.

---

## 5. `glb` (Kiln code-gen 3D)

LLM writes Three.js primitive code; harness runs it, validates, retries on
errors or structural warnings.

| Field | Value |
|-------|-------|
| Entry | `pixelforge gen glb --category=<> --name=<>` or `scripts/_direct-batch.ts` |
| Primary | `claude-opus-4-7` (set via `KILN_MODEL` env override) |
| Fallback | `claude-sonnet-4-6` if Opus rate-limits |
| Output | `.glb` + `<asset>.provenance.json` (includes code hash, attempts, structural warnings, primitive usage) |

### Validators that feed back into retries

- **Runtime exceptions** (e.g. `coneYGeo is not defined`) — harness appends exact error + prior code into next user turn (`scripts/_direct-batch.ts`).
- **`Stray plane at origin: <mesh>`** — 2-tri `PlaneGeometry` near world origin. Fix: `decalBox(w, h)` with proper `position`/`rotation`.
- **`Floating parts: <names>`** — bbox doesn't overlap any sibling within 0.02. Fix: extend/snap into contact.

### Known failure modes (from overnight-run forensics)

- Animals with `capsuleYGeo` / `cylinderYGeo` / `coneYGeo` `is not defined` — egret, tokay-gecko, water-monitor, pond-heron, rubber-plantation-mansion. Mitigated: aliases exist + prompt permits them.
- `beamBetween zero-length` — `prop-fish-trap`. Mitigated: descriptive error pushed into feedback retry.
- Stray decal planes — `mig17-nva` (RedStar), `claymore-clicker` (Stamp), `swift-boat-pcf` (11 planes). Mitigated: `stray-plane-at-origin` validator fires → feedback retry.
- Floating part — `sampan` (Mesh_Bow). Mitigated: `floating-part` validator.

### Budget hints

- Opus 4.7: ~25–60 s/asset on first try; ~$0.08–0.20. Add ~15–25 s per retry.
- Sonnet 4.6: ~12–25 s/asset; ~$0.02–0.05. Quality loss on complex geometry.

### Recovery steps

1. Read the asset's sidecar to see `attempts`, `structuralWarnings`, last error.
2. If structural warning repeats across retries, escalate model: `KILN_MODEL=claude-opus-4-7 pixelforge gen glb ...`.
3. Add the subject to `war-assets/_review/issues.json` with specific chip so a human can narrow the prompt.

---

## 6. `batch` (any pipeline)

Orchestrates N calls through the same pipeline with shared seed/reference.

| Field | Value |
|-------|-------|
| Entry | `createBatchPipeline()` wrapping any of the above |
| Pre-flight | `pixelforge health --strict` (aborts on any red provider) |
| Concurrency | Default 3; tune via `PF_BATCH_CONCURRENCY` |
| Resume | Reads existing `provenance.json` files and skips completed assets |

### Known failure modes

- **One bad asset stalls the worker pool** — timeout per item is set to 3× the pipeline's median; check `provenance.json` `latencyMs` for outliers.
- **Silent cost blow-up** — batch does not enforce a dollar ceiling. Watch for `cost` in each provenance sidecar; grep for `"model": "claude-opus-4-7"` if Opus is rate-limiting.
- **Stale key mid-batch** — health check passes at start, key expires mid-run. Keep batches < 30 min or re-probe every N items.

---

## Cross-cutting: what every pipeline now writes

- `<asset>.<ext>` — the asset itself (PNG, WEBP, GLB).
- `<asset>.provenance.json` — `{ pipeline, provider, model, prompt, seed, latencyMs, cost, warnings, contentHash, ... }`. Agents reading this can reproduce or blame an output.
- On human QA, `war-assets/_review/issues.json` gets a keyed entry: `{ [assetId]: { chips: [], note: '', ts: Date.now() } }`. Batch harness reads this on next run to prioritize rework.

## Cross-cutting: pre-flight gates

All batch scripts now call `bun scripts/_key-health.ts` at the top and abort on
red. Override for local iteration only with `PF_SKIP_HEALTH=1`.
