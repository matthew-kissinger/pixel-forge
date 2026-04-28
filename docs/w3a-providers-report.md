# Wave 3a — Providers Report

**Date:** 2026-04-21
**Scope:** W3a.1 → W3a.6 from [docs/next-cycle.md](next-cycle.md)
**Branch:** `main`

---

## 1. Summary

All six W3a tasks landed. `@pixel-forge/core` now hosts the Gemini, FAL, OpenAI, and
Anthropic provider implementations behind their respective `ImageProvider` /
`TextureProvider` / `BgRemovalProvider` / `CodeGenProvider` interfaces. The
`image.createImageGen(...)` facade delegates routing to
`capabilities.pickProviderFor(...)` and includes auto-fallback on retryable
provider errors.

The server still imports its legacy `services/{gemini,fal,texture}.ts`
modules — they were intentionally left intact to keep `bun test` (114/0)
green; trimming them to thin re-exports of `@pixel-forge/core/providers` is
a follow-up.

## 2. Per-provider status

| Provider | File | SDK landed | Notes |
|---|---|---|---|
| Gemini | `packages/core/src/providers/gemini.ts` | `@google/genai@^1.48.0` (resolved 1.50.1) | `createGeminiProvider(apiKey?)` factory; reads `GEMINI_API_KEY` from env. Cap-enforces `refs <= 14` (gemini-3.1-flash-image-preview) and surfaces `ProviderCapabilityMismatch` with `suggestedProvider: 'openai'`. |
| FAL | `packages/core/src/providers/fal.ts` | `@fal-ai/client@^1.9.5` (resolved 1.9.5) | Factories: `createFalTextureProvider` (`fal-ai/flux-lora` + Seamless LoRA until a FLUX 2-compatible LoRA exists), `createFalBgRemovalProvider` (BiRefNet), and `createFalTextTo3dProvider` (Meshy text-to-3D). `.data` destructure applied. Chroma cleanup ported intact. |
| Anthropic | `packages/core/src/providers/anthropic.ts` | `@anthropic-ai/sdk@^0.90.0` (resolved 0.90.0) | Thin adapter delegating to `@pixel-forge/core/kiln`'s `generateKilnCode`/`editKilnCode`/`compactCode`/`refactorCode`. The kiln module already runs `claude-opus-4-7` by default. |
| OpenAI | `packages/core/src/providers/openai.ts` | `openai@^6.1.0` (resolved 6.34.0) | Dual-model internal routing per `docs/gpt-image-2-investigation.md`: text-only → `gpt-image-1.5`, refs > 0 → `gpt-image-2`. Never sends `background:'transparent'` or `input_fidelity`. 180s timeout, fallback to 1.5 on 5xx/timeout. |

### `packages/core/package.json` — final dependency set

```json
"@anthropic-ai/sdk": "^0.90.0",
"@fal-ai/client": "^1.9.5",
"@google/genai": "^1.48.0",
"openai": "^6.1.0",
"sharp": "^0.34.5"
```

`@fal-ai/serverless-client` was never present in core (clean greenfield).
The server's `package.json` still pins it — that's part of the W3a
follow-up to migrate server consumers off the legacy SDK.

## 3. Image facade

`packages/core/src/image/facade.ts`:

- `createImageGen({ providers })` — DI-friendly factory.
- `getDefaultImageGen()` — lazy singleton; provider construction is
  attempted at first call and silently deferred when the env key is
  missing (so an OpenAI-less environment can still use Gemini).
- `generate(input)` zod-validates via the existing `ImageGenerateInputSchema`
  / `ImageEditInputSchema`, calls `pickProviderFor(...)`, dispatches to
  `provider.generate()` or `provider.editWithRefs()`, and stitches the
  routing reason into `output.meta.warnings`.
- Auto-fallback: when the primary provider throws a `retryable` error and
  the caller did not pin a provider, the facade swaps to the alternate
  (gemini ↔ openai) once.

Exposed via `packages/core/src/image/index.ts` alongside the existing
chroma + texture-processing utilities. `packages/core/src/index.ts` was
not modified per the brief.

## 4. Tests

| File | Pass | Skip | Coverage |
|---|---|---|---|
| `providers/__tests__/routing.test.ts` | 16 | 0 | `pickProviderFor` across all 4 kinds + cap edge cases + matrix invariants. |
| `providers/__tests__/providers.test.ts` | 1 | 3 | Live-gated on `IMAGE_PROVIDERS_LIVE=1`; default skip. |
| `image/__tests__/facade.test.ts` | 6 | 0 | Stub providers exercise routing, schema rejection, fallback path. |
| **W3a-added subtotal** | **23** | **3** | |

### Top-level test status

| Package | Pass | Skip | Fail |
|---|---|---|---|
| `@pixel-forge/core` | 91 | 6 | 0 |
| `server` | 114 | 0 | 0 |
| `client` | 1931 | 0 | 0 |

Acceptance baselines met (server 114, client 1931, core ≥ 14).

`bun run typecheck` and `bun run lint` are both green from the repo root.

## 5. Notable decisions

- **Class vs factory:** factory-only (`createXProvider(apiKey?, opts?)`).
  Simpler test substitution and matches the agent-first ergonomics of the
  rest of core (`kiln.generate(...)`, `image.createImageGen(...)`).
- **Anthropic adapter, not rewrite:** `kiln/generate.ts` already does the
  hard work. The adapter is ~190 lines of thin pass-through and translates
  the `KilnGenerateResult.success: false` envelope into a structured throw
  so callers don't have to special-case the success boolean.
- **OpenAI dual-model is internal to the provider, not the facade.** The
  provider picks `gpt-image-1.5` for `generate()` and `gpt-image-2` for
  `editWithRefs()` itself. The facade just routes "image with refs" → the
  OpenAI provider. This keeps the routing matrix in `capabilities.ts`
  declarative (one row per model) without leaking OpenAI's quirks upstream.
- **BiRefNet variant selector skipped.** The brief flagged it as optional
  if "easy" — adding it would have required a schema field and a cap-row
  per variant. Deferred to a follow-up; current default `fal-ai/birefnet/v2`
  matches the server's behavior.
- **Facade fallback policy is conservative.** Only fires when:
  (a) the error is retryable, (b) the caller did not pin a provider, and
  (c) an alternate provider exists for the same kind. The fallback's
  warning surfaces the original error code so agents can still trace what
  failed.

## 6. Surprise

The OpenAI SDK's `images.generate()` and `images.edit()` return types are
unions including a `Stream<...>` variant — TypeScript infers them even
when the caller never opts into streaming. Cast through `unknown` to a
narrow `{ data?: Array<{ b64_json?: string }> }` shape rather than
fighting the SDK's discriminator. Documented inline in
`providers/openai.ts`.

Also worth noting: `@fal-ai/client@1.9.5` shipped (not the 1.9.1
documented in `model-catalog-2026-04-24.md`). Resolved version is current; no
behavior diff observed.

## 7. Follow-ups

- Keep `packages/server/src/services/{gemini,fal,texture}.ts` as thin
  compatibility wrappers over `@pixel-forge/core/providers`; the deprecated
  FAL serverless client has been dropped from active package manifests.
- Add the BiRefNet variant selector (`'light-2k' | 'heavy' | 'dynamic'`)
  to `BgRemovalInput` once the W4 icon pipeline is ready to consume it.
- Wire the live-gated provider tests into a nightly job so we catch SDK
  regressions outside the per-PR loop.
