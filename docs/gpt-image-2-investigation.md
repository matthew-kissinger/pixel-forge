# gpt-image-2 Investigation for Pixel Forge Sprite Pipeline

_Investigation date: 2026-04-21. Supersedes the "use gpt-image-1.5" recommendation in [`docs/model-audit-2026-04.md`](./model-audit-2026-04.md) §2.4._

## 1. Executive summary

- **gpt-image-2 works for our sprite pipeline.** The lack of `background: "transparent"` is a non-issue because our pipeline generates on solid chroma (magenta/blue/green) and strips it with BiRefNet + chroma cleanup anyway. gpt-image-2 respects "entire background is flat solid #FF00FF" just as faithfully as gpt-image-1.5 — tested at 90.0% vs 89.6% magenta coverage on an identical prompt.
- **Conditional on one caveat**: gpt-image-2 is **~3.5x slower** (100-110s vs 27-37s per image at high quality) and **~1.9x more expensive** (~$0.15 vs ~$0.08 per 1024×1024 high). For batch sprite runs (say, 40 soldier poses) this is $6 + 70 min versus $3.20 + 20 min. Meaningful.
- **Recommendation**: default the facade to **`gpt-image-2` for reference-guided generations** (multi-ref `images.edit` — this is where 2 clearly wins, see Test B), and keep **`gpt-image-1.5` for text-only batch generations** where 2's quality bump is marginal. Expose `model` on the service so callers can override. See §5.

## 2. Test results

All tests at `size=1024x1024`, `quality=high`, `moderation=low`, `background=opaque`. Raw + chroma-cleaned PNGs in `tmp/gpt-image-2-test/`, side-by-side gallery at `tmp/gpt-image-2-test/compare.html`.

### Test A — Chroma background compliance (text-to-image M16 rifle on magenta)

| | gpt-image-1.5 | gpt-image-2 |
|---|---|---|
| Latency | 30.3s | 110.0s |
| Cost (est) | $0.080 | $0.150 |
| Magenta pixels | 89.6% | 90.0% |
| Pipeline-ready? | yes | yes |

**Finding**: both models produced a genuinely flat, uniform magenta background with zero gradients or atmospheric haze. `chromaCleanMagenta` (R>150, G<100, B>150) cleanly extracted both. Subjectively 1.5 has slightly crisper black outlines (our prompted "black pixel outlines" style); 2 reads as higher-fidelity but less "32-bit retro" — good for hero assets, arguably worse for in-line game sprites that need to match existing art.

### Test B — Multi-reference pose matching (NVA walk, 2 refs via `images.edit`)

References: `war-assets/soldiers/nva-side-walk1_raw.png`, `war-assets/soldiers/nva-mounted_raw.png`.

| | gpt-image-1.5 | gpt-image-2 |
|---|---|---|
| Latency | 36.7s | 107.1s |
| Cost (est) | $0.080 | $0.150 |
| Magenta pixels | 84.6% | 85.6% |
| Faction fidelity | **FAIL** — generic green-uniformed soldier, no NVA signifiers | **PASS** — pith helmet with red star, tan uniform, AK47 |
| Pipeline-ready? | yes (but wrong subject) | yes |

**Finding**: this is the decisive test. gpt-image-2 processes every reference at high fidelity automatically and it shows — it correctly extracted the NVA pith helmet shape, red cap star, and olive-tan fatigue coloration from the refs. gpt-image-1.5 drew a plausible-looking Vietnam-era soldier but missed every faction-specific cue. For our soldier-variant pipeline (NVA / VC / US / ARVN all share a T-pose + 9 poses × 4 factions workflow), 2's ref adherence saves a regeneration loop per variant.

Also notable: 2's output is larger (full 1024-canvas composition), 1.5's is small and centered. Both scale down cleanly.

### Test C — Style discipline (UI icon: solid white silhouette on blue)

| | gpt-image-1.5 | gpt-image-2 |
|---|---|---|
| Latency | 27.1s | 101.1s |
| Cost (est) | $0.080 | $0.150 |
| Blue pixels | 94.3% | 91.2% |
| Anti-aliased edges? | minimal | minimal |
| Pipeline-ready? | yes | yes |

**Finding**: both produced solid-white filled silhouettes with no internal detail, matching `ICON_LIBRARY_STYLE`. gpt-image-2's silhouette is larger and has more defined rifle features (clear M16 carry-handle, distinct stock/receiver). gpt-image-1.5's silhouette is smaller, more abstract, and had faint banding in the blue background that resulted in slight blue-tinted edge pixels after chroma cleanup (visible in the clean output). gpt-image-2's edges are cleaner. For the icon pipeline (46 mono icons) this matters — fewer edge artifacts, less manual cleanup.

## 3. Pipeline implications if we default to gpt-image-2

- **Chroma colors**: no change. Magenta #FF00FF and blue #0000FF both respected identically. Green #00FF00 not tested but behavior should transfer.
- **Style suffix**: no change. The CLAUDE.md 32-bit pixel art suffix works on both models. One nit — gpt-image-2 tends toward slightly higher fidelity than the "chunky visible pixels" the suffix asks for. If we ever see sprite drift, tighten with "low detail, chunky 32-bit pixels, no gradients within the sprite" for gpt-image-2 runs.
- **BiRefNet config**: no change needed. Direct chroma cleanup remains sufficient for magenta/blue backgrounds (same as today). BiRefNet is only in the loop for sprites with fine detail (hair, antennas) and that workflow is orthogonal.
- **`input_fidelity` param**: OpenAI docs are explicit — **omit it** for gpt-image-2. It's always high-fidelity. Our facade should conditionally drop the param when `model === 'gpt-image-2'`.
- **`background` param**: never send `transparent` to gpt-image-2 — 400 error. Send `opaque` (or omit, default is `auto`). Our pipeline already uses `opaque`.
- **Timeouts**: current 60s GEMINI_TIMEOUT_MS is too tight for gpt-image-2. Raise OpenAI timeout to **180s** (tests consistently hit 100-110s).

## 4. Cost / speed comparison

| Model | 1024² high | Latency (observed) | Batch of 40 sprites |
|---|---|---|---|
| gpt-image-1.5 | ~$0.08 | 27-37s | ~$3.20, ~20 min |
| gpt-image-2 | ~$0.15 | 100-110s | ~$6.00, ~70 min |
| Gemini 3.1 Flash (ref) | $0.08 (fal) | ~8s (ref, our observed) | ~$3.20, ~5 min |
| Gemini 3 Pro (ref) | $0.15 (fal) | ~15s (fal docs) | ~$6.00, ~10 min |

**Gemini remains the batch-throughput king.** OpenAI's value is stronger reference adherence and text-in-image rendering (see [TechCrunch coverage of typography at 99% accuracy](https://techcrunch.com/2026/04/21/chatgpts-new-images-2-0-model-is-surprisingly-good-at-generating-text/)) — we don't need typography, but the ref fidelity is real and visible in Test B.

## 5. Final recommendation — what `services/openai.ts` should do

```ts
// Model selection
type Model = 'gpt-image-1.5' | 'gpt-image-2';

const MODEL_DEFAULTS = {
  // Default: gpt-image-1.5 for text-to-image batch runs (cheaper, 3x faster, quality parity on flat-bg sprites)
  textToImage: 'gpt-image-1.5' as Model,
  // Reference-guided: gpt-image-2 (high-fidelity ref processing is the headline feature)
  withReferences: 'gpt-image-2' as Model,
};

// Auto-route trigger
function pickModel(opts: { referenceImages?: string[]; forceModel?: Model }): Model {
  if (opts.forceModel) return opts.forceModel;
  if (opts.referenceImages && opts.referenceImages.length > 0) return MODEL_DEFAULTS.withReferences;
  return MODEL_DEFAULTS.textToImage;
}

// Client
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 180_000,      // gpt-image-2 needs 120s headroom
  maxRetries: 0,         // use our retryWithBackoff wrapper
});

// Sprite defaults — unchanged from model-audit-2026-04
const SPRITE_DEFAULTS = {
  size: '1024x1024',
  quality: 'high',
  background: 'opaque',   // never 'transparent' — gpt-image-2 rejects it
  output_format: 'png',
  moderation: 'low',
  n: 1,
};

// Param-sanitization per model
function buildParams(model: Model, extra: Record<string, unknown>) {
  const params = { model, ...SPRITE_DEFAULTS, ...extra };
  // gpt-image-2 always high-fidelity — omit input_fidelity
  if (model === 'gpt-image-2' && 'input_fidelity' in params) delete params.input_fidelity;
  return params;
}
```

- **Default model**: `gpt-image-1.5` (text-only) / `gpt-image-2` (multi-ref).
- **Fallback model**: `gpt-image-1.5` (if gpt-image-2 errors 5xx or times out, retry once with 1.5 at same params).
- **Auto-route triggers**: presence of `referenceImages[].length > 0` routes to gpt-image-2. Explicit `forceModel` overrides.
- **Guardrails**:
  - Timeout 180s for model=2, 60s for 1.5.
  - Strip `background: "transparent"` if caller passed it and model is 2 (coerce to `opaque`, log a warn).
  - Drop `input_fidelity` for model=2.
  - Log token input counts — gpt-image-2 processes every ref at high fidelity, so input costs balloon with 4+ refs; surface this to callers.

---

## Appendix: raw test data

- Gallery: `tmp/gpt-image-2-test/compare.html`
- Raw outputs: `tmp/gpt-image-2-test/{A-chroma,B-multiref,C-iconstyle}_{gpt-image-1.5,gpt-image-2}.raw.png`
- Chroma-cleaned: same filenames with `.clean.png`
- Summary JSON: `tmp/gpt-image-2-test/results.json`
- Test script: `tmp/gpt-image-2-test.ts`
- Total investigation cost: **$0.69** (6 generations, under $2 budget)

## Citations

- [OpenAI — Introducing ChatGPT Images 2.0 (Apr 21, 2026)](https://openai.com/index/introducing-chatgpt-images-2-0/)
- [OpenAI image-generation guide](https://developers.openai.com/api/docs/guides/image-generation) — confirms gpt-image-2 rejects `background: "transparent"`, always processes inputs at high fidelity, supports multi-reference via `images.edit`.
- [OpenAI gpt-image-2 model page](https://developers.openai.com/api/docs/models/gpt-image-2)
- [fal gpt-image-2 listing (Apr 21, 2026)](https://fal.ai/gpt-image-2)
- [TechCrunch — Images 2.0 typography](https://techcrunch.com/2026/04/21/chatgpts-new-images-2-0-model-is-surprisingly-good-at-generating-text/)
- [VentureBeat — Images 2.0 multilingual text / infographics](https://venturebeat.com/technology/openais-chatgpt-images-2-0-is-here-and-it-does-multilingual-text-full-infographics-slides-maps-even-manga-seemingly-flawlessly)
