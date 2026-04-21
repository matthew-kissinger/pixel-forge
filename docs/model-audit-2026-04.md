# Model & SDK Audit — April 2026

_Audit date: 2026-04-21. Purpose: verify every AI provider integrated into Pixel Forge is pinned to a current model ID and SDK version, and spec the new OpenAI integration._

## 1. Summary Table

| Provider | Current in repo | Latest available (Apr 2026) | Action |
|---|---|---|---|
| **Gemini (image)** | `gemini-3.1-flash-image-preview` via `@google/genai@^1.38.0` | `gemini-3.1-flash-image-preview` (Nano Banana 2, still current) + `gemini-3-pro-image-preview` (Nano Banana Pro) as quality tier. SDK `@google/genai@1.48.0` | **Minor SDK bump** + optional Pro tier for hero assets |
| **FAL (image/3D)** | `@fal-ai/serverless-client@^0.15.0`, endpoints `fal-ai/flux-2/lora`, `fal-ai/birefnet`, `fal-ai/meshy/text-to-3d` | `@fal-ai/client@1.9.1` (serverless-client **deprecated**); endpoints still valid, BiRefNet v2 available | **Major upgrade** — SDK rename with breaking `Result<T>` shape |
| **Anthropic / Kiln** | `@anthropic-ai/claude-agent-sdk@^0.2.50` + `@anthropic-ai/sdk@^0.71.2` using `claude-opus-4-6` (and `claude-haiku-4-5-20251001` for compact) | `@anthropic-ai/sdk@0.90.0`; models `claude-opus-4-7`, `claude-sonnet-4-6`, `claude-haiku-4-5-20251001` all GA | **Minor bump** + swap Opus 4.6 → 4.7 (breaking thinking-param change) |
| **OpenAI (new)** | _not integrated_ | `openai@^6.1.0`, model `gpt-image-1.5` (prod default) or `gpt-image-2` (frontier, late-Apr 2026) | **Net new integration** — use `gpt-image-1.5` today, flag for `gpt-image-2` when GA |

---

## 2. Per-provider upgrade recommendations

### 2.1 Gemini

- **Current model ID in code:** `gemini-3.1-flash-image-preview` ([`packages/server/src/services/gemini.ts:232`](../packages/server/src/services/gemini.ts))
- **Current SDK:** `@google/genai@^1.38.0` (manifest at [`packages/server/package.json:24`](../packages/server/package.json))
- **Latest as of April 2026:**
  - SDK: `@google/genai@1.48.0` ([npmjs.com/package/@google/genai](https://www.npmjs.com/package/@google/genai))
  - Models (per [Gemini image-generation docs](https://ai.google.dev/gemini-api/docs/image-generation)):
    - `gemini-3.1-flash-image-preview` — Nano Banana 2, speed tier, $0.08/image on fal ([fal listing](https://fal.ai/models/fal-ai/gemini-3.1-flash-image-preview)). **This is what we already use — still current.**
    - `gemini-3-pro-image-preview` — Nano Banana Pro, quality tier, "Thinking"-enabled, $0.15/image ([fal listing](https://fal.ai/models/fal-ai/gemini-3-pro-image-preview)). Better text rendering and instruction-following.
    - `gemini-2.5-flash-image` — legacy low-latency fallback.
- **New features since Feb 2026:**
  - Reference image budget is now up to **14 images total** (10 objects + 4 characters) — our existing `ImageGenConfig.referenceImages` only supports 6. Worth raising.
  - Extended aspect ratios added: `1:4`, `4:1`, `1:8`, `8:1` (ultrawide/ultratall) plus the existing `1:1, 2:3, 3:2, 3:4, 4:3, 4:5, 5:4, 9:16, 16:9, 21:9`.
- **Breaking changes on SDK bump:** None between 1.38 and 1.48 that affect our usage (`client.models.generateContent` signature and `responseModalities` are stable).
- **Recommendation:** `MINOR BUMP` — bump SDK to `^1.48.0`, widen reference-image cap to 14, and add an opt-in `useProImage: true` flag that routes hero/marketing sprites to `gemini-3-pro-image-preview` while keeping batch sprite generation on flash.

### 2.2 FAL

- **Current SDK in code:** `@fal-ai/serverless-client@^0.15.0` ([`packages/server/src/services/fal.ts:1`](../packages/server/src/services/fal.ts))
- **Current endpoints used:**
  - `fal-ai/meshy/text-to-3d` (line 122)
  - `fal-ai/birefnet` (line 201)
  - FLUX 2 + Seamless LoRA referenced in `CLAUDE.md` and scripts (endpoint `fal-ai/flux-2/lora`)
- **Latest as of April 2026:**
  - SDK: **`@fal-ai/client@1.9.1`** (released Feb 11, 2026 — [GitHub release](https://github.com/fal-ai/fal-js)).
  - `@fal-ai/serverless-client` is **deprecated** — fal dropped the "serverless" brand and the package is frozen at 0.x ([npmjs.com](https://www.npmjs.com/package/@fal-ai/serverless-client), migration note on [@fal-ai/client readme](https://www.npmjs.com/package/@fal-ai/client)).
  - FLUX.2 is still the latest BFL model family (no FLUX.3). Endpoint `fal-ai/flux-2/lora` remains valid with variants `pro / dev / flex / max`. Pricing $0.021/megapixel with LoRA multipliers ([fal FLUX.2 LoRA page](https://fal.ai/models/fal-ai/flux-2/lora)).
  - Seamless Texture LoRA URL (`huggingface.co/gokaygokay/Flux-Seamless-Texture-LoRA`) is still live and compatible with `fal-ai/flux-2/lora`.
  - BiRefNet: FAL now exposes a `fal-ai/birefnet/v2` endpoint (three-tier: Light, Heavy, Portrait — better on fine edges, hair, semi-transparent). Original `fal-ai/birefnet` still works ([fal BiRefNet v2](https://fal.ai/models/fal-ai/birefnet/v2)).
- **Breaking changes on SDK swap:**
  1. Import changes: `import * as fal from '@fal-ai/serverless-client'` → `import { fal } from '@fal-ai/client'`.
  2. `fal.subscribe(...)` now returns `Result<O> = { data, requestId }` instead of the output object directly. Every call site has to destructure.
     - Example: `result.model_url` becomes `result.data.model_url`.
     - Example: `result.image?.url` becomes `result.data.image?.url`.
  3. `fal.config({ credentials })` still valid.
- **Recommendation:** `MAJOR UPGRADE` — schedule a dedicated migration (three call sites: `generateModel`, `removeBackground`, any textures scripts). Worth doing because the old package will eventually stop receiving endpoint schema updates. Consider swapping BiRefNet → `fal-ai/birefnet/v2` (Heavy variant) for cleaner chroma edges on pixel-art sprites — lower chance of needing the manual `chromaCleanup()` pass.

### 2.3 Anthropic / Claude (Kiln)

- **Current in code:**
  - SDK: `@anthropic-ai/sdk@^0.71.2` + `@anthropic-ai/claude-agent-sdk@^0.2.50`
  - Model: **`claude-opus-4-6`** ([`packages/server/src/services/claude.ts:203,262`](../packages/server/src/services/claude.ts)) for geometry + refactor; `claude-haiku-4-5-20251001` for code compaction (line 134).
- **Latest as of April 2026:**
  - SDK: `@anthropic-ai/sdk@0.90.0` ([npmjs.com/package/@anthropic-ai/sdk](https://www.npmjs.com/package/@anthropic-ai/sdk)).
  - Current GA models ([Claude models overview](https://platform.claude.com/docs/en/about-claude/models/overview)):

    | Model | API ID | Context | Pricing (in/out /MTok) | Thinking mode |
    |---|---|---|---|---|
    | Opus 4.7 | `claude-opus-4-7` | 1M | $5 / $25 | **adaptive only** |
    | Sonnet 4.6 | `claude-sonnet-4-6` | 1M | $3 / $15 | extended + adaptive |
    | Haiku 4.5 | `claude-haiku-4-5-20251001` | 200k | $1 / $5 | extended |

  - Opus 4.7 released Apr 16, 2026 ([Introducing Claude Opus 4.7](https://www.anthropic.com/news/claude-opus-4-7)). Step-change in agentic coding over 4.6, better vision, same price as 4.6.
- **Breaking changes on Opus 4.6 → 4.7 migration:**
  1. `thinking.type: "enabled"` with `budget_tokens` is **not supported** — returns 400. Must use `thinking.type: "adaptive"`. We don't currently pass a `thinking` param, so this is a non-issue for Kiln today but we should not add one without adaptive.
  2. Thinking-block content is omitted from response by default (opt-in required if we ever want to log it).
  3. New `task-budgets-2026-03-13` beta header available — lets us give Kiln a rough token budget for the whole agentic loop ([whats-new-4-7 docs](https://platform.claude.com/docs/en/about-claude/models/whats-new-claude-4-7)). Could help cap runaway Kiln generations.
  4. Prompt caching moved to **workspace-level isolation** (Feb 5, 2026). Existing cache keys auto-migrate; worth re-benchmarking hit rate.
- **Recommendation:** `MINOR BUMP` (SDK) + **swap Opus 4.6 → Opus 4.7** for Kiln. Same price tier, better structured-code generation. Update `packages/server/src/services/claude.ts:203` and `:262`. Keep Haiku 4.5 for compaction — already optimal there.

### 2.4 OpenAI (NEW)

- **Current in code:** not integrated.
- **Recommendation: use `gpt-image-1.5` today; migrate to `gpt-image-2` when it lands GA.** See §3 below for full spec.

---

## 3. OpenAI Integration Spec (`services/openai.ts`)

### 3.1 SDK & model

- **Package:** `openai` (not `@openai/openai` — flat name).
- **Latest major version:** `openai@6.1.0` as of April 2026 (via context7 `/openai/openai-node/v6_1_0`; versions list: `v4_104_0, v5_19_1, v5_22_1, v6_1_0`). Install with `bun add openai`.
- **Model choice — pick one of:**
  - **`gpt-image-1.5`** — current production default for GPT-image family. Supports transparent backgrounds, all quality tiers, multi-reference edits. **Recommended to ship with today.**
  - `gpt-image-1` — older, cheaper, fewer features. Only fall back if you need the lowest possible cost.
  - `gpt-image-1-mini` — mini tier, cheaper latency-focused.
  - **`gpt-image-2`** — frontier model, announced Apr 21, 2026 ([OpenAI blog](https://openai.com/index/new-chatgpt-images-is-here/), [TechCrunch](https://techcrunch.com/2026/04/21/chatgpts-new-images-2-0-model-is-surprisingly-good-at-generating-text/)). ChatGPT-facing rollout first; API availability rolling out late-Apr through mid-May 2026 ([Interesting Engineering](https://interestingengineering.com/ai-robotics/chatgpt-images-2-0-2k-output)). **Gotchas:**
    - Does **not** support `background: "transparent"` (only `opaque` or `auto`) — bad fit for our chroma workflow until OpenAI lifts that.
    - Thinking mode + 2K native output.
    - Processes every ref image at high fidelity automatically; don't pass `input_fidelity`.

  **For pixel-art sprites on chroma backgrounds, start with `gpt-image-1.5`** — the `background: "transparent"` parameter gives us a second path (skip chroma entirely) and the high-quality tier produces clean pixel edges. Add `gpt-image-2` later as an opt-in for hero assets once the API is public and if transparent output is restored.

### 3.2 Pixel-art sprite defaults

```ts
const SPRITE_DEFAULTS = {
  model: 'gpt-image-1.5',
  size: '1024x1024',         // square only for sprite pipeline; extract/resize post-gen
  quality: 'high',            // 'high' | 'medium' | 'low' | 'auto'
  background: 'opaque',       // keep opaque, generate on solid magenta, chroma-clean same as Gemini
  output_format: 'png',       // required for alpha later; 'webp' for smaller responses
  moderation: 'low',          // pixel-art game assets trip content filters less often
  n: 1,
};
```

Rationale:
- `1024x1024` is the only tier below the 4K jump — cheap enough for batch ($0.01–$0.08/image depending on quality — [OpenAI pricing calculator](https://costgoat.com/pricing/openai-images)).
- Keep `background: 'opaque'` + our existing magenta chroma-cleanup pipeline — same conventions as Gemini. Do **not** use `background: 'transparent'` for pixel art; it produces anti-aliased edges that fight our chroma cleanup.
- `quality: 'high'` — `medium` smooths pixel corners and destroys the style; `low` is too blurry. Tested difference is meaningful for 32-bit pixel-art prompts.
- `moderation: 'low'` avoids false positives on war-game subjects.

### 3.3 Multi-reference images

`gpt-image-1.5` supports multi-image refs via `images.edit` (not `images.generate`). Up to ~16 is documented working in practice ([OpenAI community thread](https://community.openai.com/t/how-to-output-a-background-transparent-image-using-the-edit-or-generate-interface/1349936)). Node example:

```ts
import OpenAI, { toFile } from 'openai';
const client = new OpenAI();

// Convert base64 dataURLs into the SDK's File-like type
const refs = await Promise.all(
  referenceImages.map((b64, i) =>
    toFile(Buffer.from(b64.replace(/^data:image\/\w+;base64,/, ''), 'base64'), `ref-${i}.png`, {
      type: 'image/png',
    })
  )
);

const result = await client.images.edit({
  model: 'gpt-image-1.5',
  image: refs,              // array of File/Uploadable — multi-reference
  prompt: 'T-pose NVA soldier, match style of reference, 32-bit pixel art, solid magenta background',
  size: '1024x1024',
  quality: 'high',
  background: 'opaque',
  n: 1,
});

const b64 = result.data[0].b64_json;  // when response_format='b64_json' or default for gpt-image family
```

For pure text-to-image with no refs, use `client.images.generate({ ... })` with the same parameter shape minus `image`.

### 3.4 Errors & rate-limit shape

- Rate-limit errors are `openai.RateLimitError` (HTTP 429). Retry-After header provided. Wrap with the existing `retryWithBackoff` helper.
- Auth errors are `openai.AuthenticationError` (401). Surface as `ServiceUnavailableError('OpenAI authentication failed')`.
- Bad prompt / policy violations: `openai.BadRequestError` (400) with `code: 'content_policy_violation'`. Surface as `BadRequestError`.
- Timeout handling: pass `{ timeout: 60_000 }` to the client constructor or per call (`{ timeout }` in options) — default is 10min which is too long for our pipeline.

```ts
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 60_000,
  maxRetries: 0,             // we use our own retry wrapper
});
```

### 3.5 Pricing reference (April 2026)

Order-of-magnitude, via [OpenAI pricing page](https://openai.com/api/pricing/) + [CostGoat calculator](https://costgoat.com/pricing/openai-images):

| Model / Quality | 1024x1024 | 1536x1024 |
|---|---|---|
| `gpt-image-1.5` low | ~$0.01 | ~$0.015 |
| `gpt-image-1.5` medium | ~$0.04 | ~$0.06 |
| `gpt-image-1.5` high | ~$0.08 | ~$0.12 |
| `gpt-image-2` high (est.) | ~$0.15 | ~$0.25 |

For reference: Gemini Flash Image on fal is $0.08/image flat, Gemini Pro Image is $0.15/image. So **`gpt-image-1.5` high is roughly price-parity with Gemini Flash**, and `gpt-image-2` sits at Gemini Pro price.

---

## 4. Action checklist

- [ ] Bump `@google/genai` `1.38 → 1.48` in `packages/server/package.json`.
- [ ] Raise `referenceImages` cap from 6 to 14 in `packages/server/src/services/gemini.ts` and shared types.
- [ ] Add optional `useProImage` flag that routes to `gemini-3-pro-image-preview`.
- [ ] Migrate `@fal-ai/serverless-client@0.15` → `@fal-ai/client@1.9.1`; update imports and `Result<T>` destructuring in `packages/server/src/services/fal.ts`.
- [ ] Evaluate `fal-ai/birefnet/v2` (Heavy variant) as a drop-in for `fal-ai/birefnet`.
- [ ] Bump `@anthropic-ai/sdk` `0.71.2 → 0.90.0`.
- [ ] Swap `claude-opus-4-6` → `claude-opus-4-7` in `packages/server/src/services/claude.ts` (2 sites).
- [ ] Add new service `packages/server/src/services/openai.ts` using `openai@^6.1.0`, `gpt-image-1.5`, defaults from §3.2, errors from §3.4.
- [ ] Update `CLAUDE.md` "AI Services" line to reflect the four-provider stack.

---

## 5. Citations

- [OpenAI — ChatGPT Images 2 launch (Apr 21, 2026)](https://openai.com/index/new-chatgpt-images-is-here/)
- [TechCrunch — ChatGPT's new Images 2.0 model](https://techcrunch.com/2026/04/21/chatgpts-new-images-2-0-model-is-surprisingly-good-at-generating-text/)
- [Interesting Engineering — Images 2.0 2K output](https://interestingengineering.com/ai-robotics/chatgpt-images-2-0-2k-output)
- [OpenAI Images API reference](https://developers.openai.com/api/reference/resources/images/methods/generate)
- [OpenAI image-generation guide](https://developers.openai.com/api/docs/guides/image-generation)
- [OpenAI API pricing](https://openai.com/api/pricing/)
- [CostGoat GPT-image pricing calculator](https://costgoat.com/pricing/openai-images)
- [context7 `/openai/openai-node/v6_1_0`](https://github.com/openai/openai-node/blob/v6.1.0/api.md)
- [Gemini image-generation docs](https://ai.google.dev/gemini-api/docs/image-generation)
- [Gemini 3.1 Pro model card](https://deepmind.google/models/model-cards/gemini-3-1-pro/)
- [Gemini 3.1 Flash Image on fal](https://fal.ai/models/fal-ai/gemini-3.1-flash-image-preview)
- [Gemini 3 Pro Image on fal](https://fal.ai/models/fal-ai/gemini-3-pro-image-preview)
- [`@google/genai` on npm (1.48.0)](https://www.npmjs.com/package/@google/genai)
- [`@fal-ai/client` on npm (1.9.1)](https://www.npmjs.com/package/@fal-ai/client)
- [`@fal-ai/serverless-client` on npm (deprecated)](https://www.npmjs.com/package/@fal-ai/serverless-client)
- [fal-js GitHub repo](https://github.com/fal-ai/fal-js)
- [FLUX.2 LoRA on fal](https://fal.ai/models/fal-ai/flux-2/lora)
- [BiRefNet on fal](https://fal.ai/models/fal-ai/birefnet) / [BiRefNet v2 on fal](https://fal.ai/models/fal-ai/birefnet/v2)
- [Claude models overview (Anthropic)](https://platform.claude.com/docs/en/about-claude/models/overview)
- [Introducing Claude Opus 4.7 (Apr 16, 2026)](https://www.anthropic.com/news/claude-opus-4-7)
- [What's new in Claude Opus 4.7](https://platform.claude.com/docs/en/about-claude/models/whats-new-claude-4-7)
- [`@anthropic-ai/sdk` on npm (0.90.0)](https://www.npmjs.com/package/@anthropic-ai/sdk)
