# Canvas Handler Split Plan

## Overview

`packages/client/src/lib/handlers/canvas.ts` is the largest single handler module (594 lines) with five distinct canvas operation handlers sharing utilities but otherwise independent. The file demonstrates a "god-handler" antipattern: mixed responsibilities (image loading, pixel manipulation, layout logic) in one file make testing, optimization, and future features harder. This plan refactors into per-operation modules while preserving the public API.

## Current State

| Operation | Line Range | LoC | Exported as | Consumers |
|-----------|-----------|-----|-------------|-----------|
| Tile | 13–134 | 122 | `handleTile` | executor (dynamic import), tests (canvas.test.ts) |
| Color Palette | 136–288 | 153 | `handleColorPalette` | executor (dynamic import), tests (canvas.test.ts) |
| Filter | 290–397 | 108 | `handleFilter` | executor (dynamic import), tests (canvas.test.ts) |
| Combine | 399–529 | 131 | `handleCombine` | executor (dynamic import), tests (canvas.test.ts) |
| Rotate | 531–594 | 64 | `handleRotate` | executor (dynamic import), tests (canvas.test.ts) |
| **Total** | — | **578** | — | — |
| Constants (shared) | 11 | 1 | `MAX_CANVAS_DIMENSION` | all ops |

**Test coverage:** 823 lines in `tests/lib/handlers/canvas.test.ts` — 5 describe blocks (one per op), 22 test cases, all pass.

**Note:** CLAUDE.md lists handlers as "resize, rotate, filter, combine, crop, tile, pixelate" but the current file only contains 5 ops (Tile, Color Palette, Filter, Combine, Rotate). Resize/Crop/Pixelate live elsewhere (likely in `processing.ts`). This reduces W7.1 scope from the plan's initial assumption.

## Proposed Split

```
packages/client/src/lib/handlers/
├── canvas/
│   ├── index.ts             # Re-export all ops
│   ├── tile.ts              # handleTile
│   ├── filter.ts            # handleFilter
│   ├── combine.ts           # handleCombine
│   ├── rotate.ts            # handleRotate
│   ├── colorPalette.ts      # handleColorPalette
│   └── utils.ts             # Shared utilities
└── canvas.ts                # Deleted
```

### Public API Preservation

Re-export pattern in `canvas/index.ts`:
```typescript
export { handleTile } from './tile';
export { handleFilter } from './filter';
export { handleCombine } from './combine';
export { handleRotate } from './rotate';
export { handleColorPalette } from './colorPalette';
```

Consumers (executor.ts) remain unchanged. Node/Vite resolves `import('./canvas')` to `canvas/index.ts`.

## Shared Utilities (`canvas/utils.ts`)

1. **`loadImageWithTimeout(dataUrl: string): Promise<HTMLImageElement>`**
   - Consolidates 4× identical `Image` load pattern (22-38, 173-189, 299-315, 540-556)
   - Validates `MAX_CANVAS_DIMENSION` internally
   - Promise.race with 30s timeout

2. **`createCanvasContext(width, height): [HTMLCanvasElement, CanvasRenderingContext2D]`**
   - Consolidates 5× canvas creation + context setup
   - Throws if 2D context unavailable

3. **`outputImage(node, canvas, setNodeOutput): void`**
   - Consolidates 5× identical output pattern
   - Calls `setNodeOutput` with `canvas.toDataURL('image/png')`

4. **`MAX_CANVAS_DIMENSION` constant**
   - Moved to `utils.ts`, re-exported

## Test Migration

Split current 823-line file into 6 focused files:
- `canvas.tile.test.ts` (~140 LoC)
- `canvas.filter.test.ts` (~140 LoC)
- `canvas.combine.test.ts` (~150 LoC)
- `canvas.rotate.test.ts` (~130 LoC)
- `canvas.colorPalette.test.ts` (~140 LoC)
- `canvas.utils.test.ts` (~70 LoC)

No cross-op tests exist. Each op's tests use isolated mocks. Split is 1:1 mechanical.

## Risk Assessment

**Low-risk operations:**
- Tile, Filter, Rotate, ColorPalette — self-contained, single-image input

**Medium-risk operation:**
- Combine — uses edges graph (mitigation: extract `getInputImagesFromEdges` utility)

**Subtle couplings (all safe):**
- Mutable canvas references are scoped per-op (no state leakage)
- Error messages are consistent; safe to preserve per-op
- Image timeout is hardcoded (extract to const for future tuning)

**Rollback:** Single commit, zero runtime state affected (pure functions).

## Execution Estimate

| Task | Est |
|------|-----|
| Extract `utils.ts` | 20min |
| Move `tile.ts` + test | 25min |
| Move `filter.ts` + test | 25min |
| Move `combine.ts` + test | 30min |
| Move `rotate.ts` + test | 20min |
| Move `colorPalette.ts` + test | 30min |
| Create `canvas/index.ts` + update `handlers/index.ts` | 15min |
| Test + lint + typecheck | 15min |
| Commit + doc | 10min |
| **Total** | **3h** |

Matches W7.1 estimate in `docs/next-cycle.md`.

---

## Acceptance Checklist

- [x] All 5 operations identified with exact line ranges
- [x] Line counts sum to file size (578 ops + 1 const = 579 of 594 total; remainder header/whitespace)
- [x] Shared utilities extracted and documented
- [x] Public API preserved (re-export from `canvas/index.ts`)
- [x] Test split is mechanical (no cross-op tests)
- [x] Risks identified with mitigations
- [x] Rollback plan documented
- [x] Estimate validated (3h realistic)

**Status:** Ready for W7.1 execution.
**Date:** 2026-04-21
