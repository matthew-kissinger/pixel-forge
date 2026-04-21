# W2.1 — Full Kiln Extraction Report

**Status:** PASS — merge-ready.
**Branch:** `worktree-agent-a2630f36` (isolation harness will rename to `refactor/kiln-extract`)
**Started from:** `main` @ `dc05d6d`
**Commits on worktree:** 4 additive commits
**Scope:** W2.1 full extraction + the 7 follow-ups from `docs/spike-report.md` §Known Issues.

## Before/after LoC

| File | Before | After | Δ |
|---|---:|---:|---:|
| `packages/client/src/lib/kiln/primitives.ts` | 473 | 0 (deleted) | −473 |
| `packages/shared/kiln-prompts.ts` | 452 | 0 (deleted) | −452 |
| `packages/shared/kiln-validation.ts` | 53 | 0 (deleted) | −53 |
| `scripts/export-glb.ts` | 541 | 67 | −474 |
| `packages/server/src/services/claude.ts` | 365 | 23 (thin re-export) | −342 |
| `packages/core/src/kiln/generate.ts` | 214 | 413 (companions + timeout) | +199 |
| `packages/core/src/kiln/prompt.ts` | 266 | 409 (+TSL/Both) | +143 |
| `packages/core/src/kiln/render.ts` | 345 | 398 (+inspect) | +53 |
| `packages/core/src/kiln/primitives.ts` | 393 | 426 (+validateAsset) | +33 |
| `packages/core/src/kiln/__tests__/companions.test.ts` | 0 | 208 (new) | +208 |
| Net (implementation files) | | | **−1358** |

Deduplication effect: ~1.9k LoC of duplicated primitives + prompts + bridge + service code collapsed into one canonical copy in `@pixel-forge/core/kiln`. The expansion in `generate.ts` / `prompt.ts` / `render.ts` is the companion ports + new features, not duplication.

## The 7 follow-ups — disposition

| # | Title | Disposition |
|---|---|---|
| 1 | Primitive coverage audit | **Done.** Client `primitives.ts` deleted; `runtime.ts` imports `@pixel-forge/core/kiln/primitives`. Confirmed zero TSL / WebGPU imports in core primitives. TSL paths stay in client `runtime.ts` / `prompt.ts` as intended. |
| 2 | Unconditional `CLAUDECODE` guard | **Done.** `stripClaudeCodeNestingMarkers()` in `core/kiln/generate.ts` runs before every SDK query (generate, edit, compact, refactor). JSDoc explains why. |
| 3 | Migrate `shared/kiln-*.ts` consumers | **Done.** Core is now canonical for prompts + validation; shared files deleted; `shared/index.ts` + `package.json` cleaned. Only leftover ref is in a JSDoc comment + the next-cycle plan (docs, not code). |
| 4 | Port `editKilnCode` / `compactCode` / `refactorCode` | **Done.** Live in `core/kiln/generate.ts`, namespace-aliased as `kiln.editCode / compact / refactor`. Server `claude.ts` is a thin re-export. All three pinned to `claude-opus-4-7` (compact uses `claude-haiku-4-5-20251001`). |
| 5 | Tunable Opus timeout | **Done.** `KilnGenerateCallOptions.timeoutMs` + `.model` wire through every entry point (`generateKilnCode`, `editKilnCode`, `compactCode`, `refactorCode`, `generate`). Default remains `720_000` ms. Skipped the prompt-size-derived default — the static 12 min covers the observed Opus worst case and avoids mystery math. |
| 6 | Runtime-aware joint-name validation | **Done.** `inspectGeneratedAnimation(root, clips)` in `core/kiln/render.ts` walks the scene graph + tracks and emits `warnings[]` for unresolved targets and unsupported properties. `renderGLB` now runs it before the bridge so the "rename the pivot" hint surfaces ahead of the briefer "target not found - skipped" the bridge emits. Both kept for back-compat. |
| 7 | Reconcile GLTFExporter vs gltf-transform | **TODO(W2.1.7) — deferred with plan.** In-editor `runtime.ts.exportGLB()` still uses Three's `GLTFExporter` (browser-native via Blob). Retiring it in favour of core's bridge means swapping `NodeIO` for `WebIO` in a browser-aware render path. Low-risk (spike proved bridge fidelity) but invasive: `runtime.ts` is 780 lines and gets an 8-way split in W2.2. Added a TODO comment on `exportGLB()` that names the approach; once W2.2 carves out an `export.ts` module, the swap becomes a localised change. |

## Files touched

**Created**
- `packages/core/src/kiln/__tests__/companions.test.ts` — 10 new render-only + mocked-SDK tests

**Modified**
- `packages/core/src/kiln/{generate,index,prompt,render,primitives}.ts`
- `packages/core/package.json` — new `./kiln/primitives`, `./kiln/prompt`, `./kiln/validation` subpath exports
- `packages/client/package.json` — adds `@pixel-forge/core` workspace dep
- `packages/client/src/lib/kiln/{index,runtime}.ts` — import primitives from core, TODO(W2.1.7) on exportGLB
- `packages/client/tests/lib/kiln-primitives.test.ts` — imports redirected to core
- `packages/server/package.json` — adds `@pixel-forge/core` workspace dep
- `packages/server/src/services/claude.ts` — 23-line re-export of core
- `packages/server/src/routes/kiln.ts` — polished logging, routes through service wrapper (keeps test-mock compat)
- `packages/server/tests/api.test.ts` — SDK-edge mock instead of module mock
- `packages/server/tests/services/claude.test.ts` — tests core directly
- `packages/shared/{index.ts,package.json}` — dropped kiln-* exports
- `scripts/export-glb.ts` — 67 lines; delegates to `renderGLB()`
- `docs/next-cycle.md` — unchanged (parent task owner updates)

**Deleted**
- `packages/client/src/lib/kiln/primitives.ts`
- `packages/shared/kiln-prompts.ts`
- `packages/shared/kiln-validation.ts`

## Test state

| Package | Before | After |
|---|---|---|
| core | 4 pass / 3 skip | **14 pass / 3 skip** (+10 companion) |
| server | 114 pass / 0 fail | **114 pass / 0 fail** (unchanged) |
| client | 1931 pass / 0 fail | **1931 pass / 0 fail** (unchanged) |
| typecheck | green | **green** |
| lint | 4 pre-existing warnings (client) | **same 4 warnings** |
| build | green | **green** (main bundle 220KB gzip — unchanged from spike merge) |

`bun install` clean, no lock churn beyond the workspace dep add.

## Surprises

1. **Bun's `mock.module` is global across test files.** The old
   `packages/server/tests/api.test.ts` mocked `../src/services/claude` to
   short-circuit the route tests. After migrating `services/claude.ts` to
   a thin re-export, that mock also clobbered
   `packages/server/tests/services/claude.test.ts` — even though the
   claude test imports `@pixel-forge/core/kiln` directly. Resolution: mock
   at the SDK edge in `api.test.ts` so every other test can still
   exercise the real core. This is a general principle for Bun test
   isolation worth remembering.

2. **Client bundle size is already 220 KB gzip on main.** `CLAUDE.md`
   lists 103 KB but that's stale from before the spike merge; the
   `refactor/core-spike` branch pulled `@anthropic-ai/claude-agent-sdk`
   and friends into the client workspace's transitive deps. My changes
   didn't regress further — same `722.68 KB / 215.99 KB gzip` for
   `index-<hash>.js` before and after. Worth updating `CLAUDE.md` at
   some point but out of scope here.

3. **No TSL leaked into core primitives.** The W1.1 spike report flagged
   this as a concern (follow-up #1). Grepping `three/tsl|three/webgpu|
   NodeMaterial` against `packages/core/src/kiln/` returns zero matches
   in executable code — the only TSL strings are inside the
   `KILN_TSL_SYSTEM_PROMPT` constant, which is pure text the LLM
   receives. Clean separation.

4. **TypeScript `verbatimModuleSyntax` + `noUncheckedIndexedAccess`
   cascaded nicely.** The companions test needed `AbortController` type
   narrowing in a couple places; compiler caught them both without
   manual hints. No surprise hacks required.

5. **The `services/claude.ts` shim is small enough to tempt deletion
   but valuable as a stable import anchor** — route tests and future
   route code that wants a logger / auth wrapper can slot in there
   without leaking into core. Keeping it as a 23-line passthrough is
   cheap insurance.

## Go/No-Go for W2.2 (runtime.ts split)

**Go.** The substrate swap is clean and nothing in `runtime.ts` still
depends on `./primitives` (it now pulls from core). The 780-line file is
ready for the 8-way split per the W2 plan:

1. `config/init` — default config + constructor
2. `renderer/lifecycle` — mount, dispose, switchToWebGPU
3. `sandbox` — execute / compileModule
4. `tsl` — compileTSLEffect, applyEffect, removeEffect
5. `camera` — focusOnAsset, zoomIn, zoomOut, resetCamera
6. `export` — exportGLB (natural home for the TODO(W2.1.7) core unify)
7. `animation` — playAnimation, getAnimationNames
8. `cleanup` — dispose, resize observer

Once `export.ts` is its own module, routing it through `core.kiln.renderGLB()`
with `WebIO` is a localised change. The W1.1 spike already proved bridge
fidelity is perfect, so the risk is implementation detail only.

## Coordination notes

- **Did not touch** `packages/core/src/index.ts` beyond what was already
  on main. Substrate agent owns that file; any kiln-export additions the
  substrate agent needs can union onto this worktree's changes with a
  clean merge.
- **Did not touch** any of the reserved files:
  `errors.ts`, `capabilities.ts`, `schemas/**`, `providers/**`, `image/**`.

## Commits on this worktree

1. `6f7776f` — chore(client): import kiln primitives from core, delete local copy
2. `253aac0` — feat(core): port kiln companion entries, add timeout + joint warnings
3. `e14eb42` — chore(scripts): reduce export-glb.ts to core wrapper, defer GLTFExporter unify
4. (this report) — docs: W2.1 extraction report

## Acceptance checklist

- [x] `packages/client/src/lib/kiln/primitives.ts` — deleted
- [x] `packages/shared/kiln-prompts.ts` + `kiln-validation.ts` — deleted
- [x] `packages/client/src/lib/kiln/runtime.ts` — imports from `@pixel-forge/core`
- [x] `scripts/export-glb.ts` — simplified to use core (67 lines)
- [x] `packages/server/src/services/claude.ts` — thin re-export
- [x] All 7 follow-ups addressed (6 landed, 1 TODO with concrete plan)
- [x] `bun run typecheck` green from repo root
- [x] `bun run lint` green (only pre-existing warnings)
- [x] `bun run build` green
- [x] Client tests: 1931 pass / 0 fail
- [x] Server tests: 114 pass / 0 fail
- [x] Core tests: 14 pass / 3 skip (was 4/3, +10 new companion tests)
- [x] Zero `three` imports in `packages/server`
- [x] Zero primitive duplication (grep confirmed only core defines them)
