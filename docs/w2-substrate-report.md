# W2 Substrate Report (W2.3 + W2.4 + W2.5)

**Status:** DONE — ready for W3 providers and W4 pipelines to fan out.

**Branch:** `main` (substrate is additive, non-destructive).

## What was built

Eight files under `packages/core/src/`. No edits to `index.ts`, `kiln/*`, or
any other package.

| File | Role |
|---|---|
| `errors.ts` | 12 concrete error classes over `PixelForgeError` base, plus `isPixelForgeError` guard and `AnyPixelForgeError` union |
| `capabilities.ts` | Static provider matrix + `capabilities()` / `capabilitiesFor()` / `capabilitiesForAll()` / `pickProviderFor()` |
| `schemas/image.ts` | Zod schemas for every image / texture / bg-removal / code-gen input/output, plus inferred TS types |
| `schemas/kiln.ts` | Zod re-exports aligned with the kiln runtime types |
| `schemas/index.ts` | `schemas.*` namespace export |
| `providers/types.ts` | `ImageProvider`, `TextureProvider`, `BgRemovalProvider`, `CodeGenProvider` |
| `providers/index.ts` | Namespace re-export |
| `image/pipelines/types.ts` | `Pipeline<I, O>` + `BatchPipeline<I, O>` |
| `image/pipelines/index.ts` | Re-export |
| `image/index.ts` | Adds `image.pipelines` namespace |

## Key decisions

1. **`.code` typed as `string`, not literal.** Had to do this so umbrella
   subclasses (`KilnRenderError extends KilnExecutionFailed`) can override
   `code` with a different literal. Lost some compile-time guarantees;
   gained a proper taxonomy hierarchy.
2. **`pickProviderFor` never returns `null`.** Instead `{ provider: 'none',
   model: 'none', reason }` — agents always get a structured reason.
3. **OpenAI `supportsTransparency` split by model.** `gpt-image-2` is
   `false` (the known 400 on `background: "transparent"`); `gpt-image-1.5`
   is `true`. Router uses this as Rule 1 — if caller demands native alpha,
   only 1.5 qualifies.
4. **Refs-beats-transparency in routing.** `refs > 0` routes to
   `gpt-image-2` for multi-ref fidelity. Callers wanting BOTH refs AND
   alpha are expected to generate on magenta + chroma-clean per the existing
   pipeline.
5. **Buffers over data URLs.** Schemas enforce `z.instanceof(Buffer)` for
   image payloads. W3 providers must decode base64 responses at the edge.
6. **Strict objects everywhere.** Zod `.strict()` on every schema — unknown
   fields throw. Agents get loud validation errors instead of silent drops.
7. **FAL split into two capability rows** (`texture` and `bg-removal`),
   because they're genuinely different kinds with different models. Added
   `capabilitiesForAll` to query every row for a provider.
8. **No CodeGenProvider.compact required input.** Included for API symmetry
   since CLAUDE.md's kiln compaction path exists; spec mirrors the server's
   `compactCode` entry.

## One surprise

Zod's `.strict()` + `noUncheckedIndexedAccess` combined nicely, but
`z.instanceof(Buffer)` needed no workaround — unlike the
`@gltf-transform/core` Accessor.Type issue the spike hit. The bigger
surprise was how cleanly the taxonomy mapped: once `PipelineStepFailed`
carried `.underlying: PixelForgeError`, the whole "agent drilling down
through a pipeline failure" flow falls out for free — no extra ceremony,
no serialization gymnastics.

## What W3 is now unblocked to do

- **W3a.1-4 providers** can import `ImageProvider` / `CodeGenProvider` /
  `TextureProvider` / `BgRemovalProvider` from `providers/` and build real
  implementations without guessing the contract.
- **Throw the right errors.** Wrap all provider SDK errors in
  `ProviderRateLimited` / `ProviderAuthFailed` / `ProviderTimeout` /
  `ProviderNetworkError`. Never let a raw `Error` escape core. Callers
  assume `isPixelForgeError(e)` is a valid guard.
- **Use capabilities for routing.** `editWithRefs` implementations should
  check `refs.length <= capabilities.models[...].maxRefs` and throw
  `ProviderCapabilityMismatch` before hitting the API.
- **Schema validation at the edge.** CLI / MCP / server adapters should
  parse raw JSON through `ImageGenerateInputSchema.parse(...)` before
  calling providers. Schemas are the contract boundary — providers take
  already-validated typed inputs.

## What W4 is now unblocked to do

- Implement `sprite`, `icon`, `texture`, `soldier-set`, `glb`, `batch` as
  classes satisfying `Pipeline<I, O>` (or `BatchPipeline` for resumable
  ones).
- Compose providers. Wrap step failures in `PipelineStepFailed` with the
  underlying structured error so agents can still read `.fixHint` on the
  original provider error through the pipeline boundary.

## Acceptance

- [x] 10 files (8 created/replaced as listed + 2 pipeline index edits)
- [x] `packages/core/src/index.ts` not modified
- [x] `bun run typecheck` green from repo root (core + server + client)
- [x] `bun run lint` green (4 pre-existing client warnings unchanged)
- [x] Zero changes outside `packages/core/`
- [x] `zod` already in `packages/core/package.json` (spike added it)
- [x] `bun test` under core still 4 pass / 3 skip (live-tier unchanged)
