# Wave 4 — Pipelines Report

**Status:** Complete
**Branch:** `main`
**Landed:** 2026-04-21
**Commits:** 7 (one per task card)

---

## What landed

### 6 canonical pipelines in `packages/core/src/image/pipelines/`

| File | Purpose | Tests |
|---|---|---|
| `sprite.ts` | 32-bit pixel-art sprite + chroma cleanup, refs-aware routing | 18 |
| `icon.ts` | UI icons — mono silhouette + colored emblem, NO BiRefNet | 9 |
| `texture.ts` | Tileable terrain — FLUX 2 -> pixelate -> quantize -> clean blacks -> upscale | 9 |
| `soldier-set.ts` | T-pose + N-pose workflow with auto fire-flash detection | 9 |
| `glb.ts` | Thin uniform wrapper around `kiln.generate` | 7 |
| `batch.ts` | Resumable wrapper, retry, concurrency, injectable fs | 10 |

Plus shared internals:

- `_common.ts` — `wrapStep` + `PipelineUnderlyingRaw` shell so non-structured throws surface via `PipelineStepFailed.underlying.message`.
- `__tests__/fakes.ts` — `FakeImageProvider`, `FakeBgRemovalProvider`, `FakeTextureProvider`, `solidColorPng()` reused across all pipeline tests.

### 2 utility modules in `packages/core/src/image/`

| File | Functions | Tests |
|---|---|---|
| `chroma.ts` | `chromaCleanMagenta`, `chromaCleanMagentaPreserveFlash`, `chromaCleanBlue`, `chromaCleanGreen`, `chromaCleanFor` (router) | 12 |
| `texture-processing.ts` | `pixelateNearest`, `upscaleNearest`, `quantizePalette`, `cleanNearBlacks` | 11 |

All exported from `image/index.ts` so `import { image } from '@pixel-forge/core'` exposes both pipelines and utilities.

---

## Test count delta

- **Before W4:** 14 core tests
- **After W4:** 157 pass + 6 skip (the 6 are pre-existing W3 work)
- **W4 added:** **85 new tests** (target was 40+; doubled it because each pipeline has fakes-driven coverage of validation, routing, error wrapping, and toggles).
- Server: 114 pass (unchanged)
- Client: 1931 pass (unchanged)

`bun run typecheck` green; `bun run lint` green (only the 4 pre-existing client warnings).

---

## Design calls worth a second look

1. **Concurrency default = 1.** Gemini's per-minute cap is ~25-30. Defaulting to 1 keeps the batch wrapper safe for the common case (resuming a 50-asset run after a rate limit). Callers explicitly opt into more parallelism. Texture pipeline + GLB pipeline don't share that limit, so they can override.

2. **`PipelineUnderlyingRaw` shell** for raw `Error` throws. The `errors.ts` taxonomy required `.underlying: PixelForgeError`, but providers (especially mocks and SDK leaks) sometimes throw plain `Error`. Rather than amend the taxonomy, I added a thin `PixelForgeError` subclass that wraps a plain message + `cause`. Open to renaming or relocating it; it lives in `_common.ts` for now.

3. **`getOutputBuffer` auto-detection** in `batch.ts` defaults to `output.image` and falls back to `output.glb`. Saves callers from passing it explicitly for the 5/6 pipelines that produce one of those shapes. Custom shapes (text, JSON) need an explicit extractor.

4. **Soldier-set pose name `/fir(e|ing)/i` regex** auto-enables `preserveFlash`. Lifted from CLAUDE.md's recommendation. Callers can override per pose. If anyone doesn't want firing-stance auto-detection, they should pass `preserveFlash: false` explicitly.

5. **GLB pipeline "category" expansion.** Task spec asked for `'character' | 'prop' | 'vfx' | 'environment' | 'vehicle' | 'building' | 'weapon'`, but `kiln.generate()` only knows the first four. I fold vehicle/building/weapon to `'prop'` so the public API stays caller-friendly without forcing a kiln schema change.

---

## One surprise

Bun's PNG round-trip through sharp returns a `Buffer` whose underlying `ArrayBuffer` is **larger** than the buffer's view (sharp pools allocations). Naive `new Uint8Array(data.buffer)` reaches into other buffers and corrupts adjacent state. Both `chroma.ts` and `texture-processing.ts` now clone via `pixels.set(new Uint8Array(data.buffer, data.byteOffset, data.byteLength))` before mutating. This is one of those "discover via flaky tests" details that the original gen-* scripts got away with because they only called sharp once per script invocation.

---

## What didn't ship in W4 (deferred)

- W4.7 — archive 24 old scripts (separate task, doesn't block consumers).
- W4.8 — rewrite the live recipe scripts on top of these pipelines (waiting for W3a's real providers to land cleanly first).
- Real provider integration tests — pipelines are tested with fakes; integration commit happens after W3a finishes its provider work.

---

## Decisions needed from caller

None blocking. Two soft asks for review:

- Is `PipelineUnderlyingRaw` the right place for the "raw Error wrapper" shell? Could move into `errors.ts` proper if that's preferred.
- Should `batch.ts` default concurrency be 1 (current) or 3? Texture / GLB workflows could go higher.
