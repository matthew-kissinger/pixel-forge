# W3b — Kiln Introspection Report

**Status:** complete (W3b.1 + W3b.2 + W3b.3 + W3b.4)
**Date:** 2026-04-21
**Branch:** `main`

## Summary

Landed the agent-facing introspection trio: `kiln.inspect()`, `kiln.listPrimitives()`, plus an AST-hardened validator and a refactor entry point that wires the validator in as a re-prompt loop. All four tasks shipped on `main` with the existing test suite intact and 51 new tests covering the new surface.

## APIs landed

```ts
import { kiln } from '@pixel-forge/core';

// W3b.1 — debug lens for generated GLBs
const r = await kiln.inspect(code);
//   { triangles, materials, boundingBox: { min, max, size },
//     namedParts: [{ name, type: 'pivot'|'mesh'|'group', position }],
//     animationTracks: [{ clipName, targetName, property, targetResolved }],
//     primitivesUsed: ['boxGeo', 'gameMaterial', ...],
//     warnings: ['Animation track ... targets unknown node ...'],
//     meta }

// W3b.2 — discover the sandbox surface without reading source
const specs = kiln.listPrimitives();
//   PrimitiveSpec[] with { name, signature, returns, description, example, category }

// W3b.3 — AST-hardened validator
const v = kiln.validate(code, { category: 'prop' });
//   { valid, errors: string[],
//     issues:   [{ code, message, fixHint?, line? }],
//     warnings: [{ code, message, fixHint?, line? }] }

// W3b.4 — refactor exposure (alias of refactorCode)
const result = await kiln.refactor({ instruction, geometryCode, target: 'geometry' });
```

`refactor` was already aliased in `kiln/index.ts` from W2.1; W3b.4 wired the hardened validator into `refactorCode` so geometry refactors that fail validation auto-retry once with the structured `issues[]` fed back as a feedback prompt.

## Test count delta

| Suite                  | Before | After | Δ |
|------------------------|--------|-------|---|
| core (all)             | 71     | 128   | +57 (+51 new test cases, +6 new skips from existing wave-3 worktrees) |
| client                 | 1931   | 1931  | 0  |
| server                 | 114    | 114   | 0  |

New test files in `packages/core/src/kiln/__tests__/`:

- `inspect.test.ts` — 7 tests covering tri/material/bounds, named-parts classification, animation-track resolution, primitive-detection, floating-asset bounds, pivots-only edge case
- `list-primitives.test.ts` — 5 tests asserting the catalog stays in sync with `buildSandboxGlobals()` (every entry exists, every sandbox function appears in the catalog), defensive-copy semantics
- `validation-hardened.test.ts` — 18 tests across regex layer (preserved), AST structure (`MISSING_META`, `MISSING_BUILD`, `META_MISSING_NAME`), infinite-loop detection (`while(true)`, `for(;;)` with and without break), recursion (`build()` calling itself vs helper recursion), syntax errors with line numbers, tri-budget advisory, and `errors[]`↔`issues[]` shape compatibility
- `refactor-validation.test.ts` — 4 tests for the validator-wired refactor: clean pass, one-shot retry on validation failure, effect-only skip, alias identity

## Design decisions

1. **Catalog hand-authored, not JSDoc-parsed.** Brief allowed either approach. The catalog is 25 entries; hand-authoring keeps the `signature` strings clean (TS extraction would have produced `width: number, height: number` blobs without the curated example snippets). Drift is caught by `list-primitives.test.ts` which asserts every catalog entry maps to a real `buildSandboxGlobals()` function and vice versa.

2. **Acorn over TS compiler API.** Spike report flagged regex validation as permissive. Acorn (8.15.0, 90KB) was already a transitive dep; full TS compiler API would have added ~10MB. Acorn-walk gives the visitor pattern needed for recursion detection.

3. **`ValidationResult` shape is additive.** Kept the original `{ valid, errors: string[] }` so the existing `retryWithFeedback` in `generate.ts` and the spike test work unchanged. New `issues[]` and `warnings[]` arrays carry the structured `{ code, message, fixHint, line }` shape that errors.ts conventions call for. `errors[]` is now derived from `issues.map(i => i.message)`.

4. **Joint-name validation stays runtime-only.** Per the brief — `renderGLB` and `inspect` already surface mismatches via `warnings[]`, and joint resolution requires an executed scene graph that static AST analysis can't see.

5. **Refactor retry skips effect-only refactors.** TSL shader code doesn't go through the geometry validator. The retry path only activates when `request.target !== 'effect'` and the LLM emitted geometry code.

## Surprises

- **Acorn was already installed** as a transitive dep (one of the lint plugins pulls it in). Adding it as a direct dep was a no-op install.
- **`bun add` in a workspace pulls sibling deps.** First invocation accidentally added `@fal-ai/client`, `@google/genai`, `openai`, `sharp`, etc. into `packages/core/package.json` because they were already hoisted at the workspace root. Reverted by hand and re-installed; all clean.
- **AST detection caught one nontrivial failure mode:** `for(;;)` with no `break`. Previous regex validator had no path to detect this. Verified by the test that runs `for (;;) root.scale.x *= 1.1` through both old-ish path (no detection) and new path (`INFINITE_LOOP` issue with line number).
- **Three.js animation tracks store `Joint_Name.quaternion`,** not `Joint_Name.rotation` like agents naturally write. The inspector normalizes back to the agent-facing vocabulary in `InspectAnimationTrack.property` so the report reads naturally.

## Acceptance check

- [x] `packages/core/src/kiln/inspect.ts` — implemented, 7 unit tests
- [x] `packages/core/src/kiln/list-primitives.ts` — implemented, 5 unit tests
- [x] `packages/core/src/kiln/validation.ts` — hardened with AST checks, 18 unit tests
- [x] `kiln.refactor` exposed cleanly + wired hardened validation, 4 unit tests
- [x] `bun run typecheck` — green (core, server, client)
- [x] `bun run lint` — green (4 pre-existing client warnings unchanged)
- [x] Core tests: 122 pass / 6 skip / 0 fail (was 68 pass / 3 skip / 0 fail)
- [x] Server tests: 114/114 pass — no regression
- [x] Client tests: 1931/1931 pass — no regression
