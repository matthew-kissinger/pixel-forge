# Pixel Forge

Node-based AI game asset generator. Visual pipeline: Generate (Gemini) -> Transform -> Optimize -> Export.

## Commands

```bash
bun run dev:client    # Vite dev server on :5173
bun run dev:server    # Hono API server on :3000
bun run build         # Production build
bun run typecheck     # tsc --noEmit (client + server)
bun run lint          # ESLint (client + server)

# Tests (run per-package, NOT from root)
cd packages/client && bunx vitest run   # 1468 pass, 6 fail, 1 skip, 62 files
cd packages/server && bun test          # 113 pass, 6 files
bun run test:e2e                        # 10 Playwright smoke tests
```

## Stack

React 19, Vite 7, React Flow 12, Zustand, Tailwind, Bun, Hono

**AI Services:** Gemini nano-banana-pro (2D), FAL BiRefNet (bg removal), FAL Meshy (3D), Claude/Kiln (3D primitives)

## Structure

```
packages/
  client/   # React Flow editor: 31 lazy-loaded node components, 8 panels, Zustand store, executor engine
  server/   # Hono API: routes for Gemini, FAL, Claude, export; services with timeouts + retries
  shared/   # Types, presets, prompt builders, API type contracts
```

## Architecture

- **Nodes**: 31 types, all lazy-loaded via `createLazyNode` with Suspense + `NodeErrorBoundary`
- **Executor**: Topological sort, parallel wave execution, per-node timeouts (120s gen, 60s processing, 30s canvas)
- **Handlers**: 9 modules in `lib/handlers/` (index, input, imageGen, model3d, processing, canvas, analysis, batch, output)
- **State**: Zustand store with undo/redo snapshots, auto-save to localStorage every 2s
- **Bundle**: Main ~99KB gzip, Three.js ~380KB, React Flow ~61KB, all nodes in separate chunks

## Critical: Transparency Workflow

**Always use solid red (#FF0000) or green (#00FF00) backgrounds.** Never ask Gemini for "transparent background" - produces checkerboard with no alpha. Red preferred; green for red subjects.

## Unmerged Branches (11)

Completed work sitting in task branches not yet merged to main (all merge cleanly):
- **be212658** - AbortController for pollModelStatus
- **f709891c** - Replace window.confirm with RecoveryBanner
- **0a8ce706** - Handler module tests (input, processing, canvas, output)
- **328992e1** - PresetLauncher sub-component tests (5 components)
- **6d8b4a07** - Symlink-safe path validation and request timeouts
- **bd22a840** - CORS preflight caching with maxAge
- **c340036c** - Response compression middleware
- **d02efcca** - Fix executor orphan node bug
- **d389e125** - Light theme hardcoded color audit fix
- **fd041f77** - Rate limiter x-forwarded-for fix and setInterval unref
- **fe54cbc0** - Keyboard shortcuts help overlay and Escape-to-close

## Current Gaps

- **6 failing tests**: MobileNav (expects aria-label, has title) + useAutoSave recovery tests (expects window.confirm, branch has RecoveryBanner)
- **Untested hooks**: useFocusTrap (64 lines), useMediaQuery (19 lines) - zero tests
- **kiln/runtime.ts** (783 lines) - zero tests, WebGPU/Three.js renderer
- **No integration tests** against real Gemini/FAL/Claude APIs

## Known Issues

- 1 skipped test: executor timeout - bun's vitest incompatible with `vi.useFakeTimers()` + async promises
- Three.js chunk is 1.4MB/380KB gzip (Vite warns about chunk size)
- Executor adds orphan input nodes to execution waves (line 153-158) - fix in unmerged branch d02efcca
- pollModelStatus has no AbortController - fix in unmerged branch be212658
- useAutoSave uses window.confirm for recovery - fix in unmerged branch f709891c
- Export path validation doesn't resolve symlinks - fix in unmerged branch 6d8b4a07
- No response compression - fix in unmerged branch c340036c

## Quality Bar

Assets: consistent style, power-of-2 dimensions, clean transparency, <50KB sprites, engine-compatible formats. **Test by generating real assets**, not just running code.

## Asset Templates

Presets in `packages/shared/presets.ts`. See `docs/asset-reference.md` for detailed prompt templates and test case specs.

## Skills

Local skills in `.claude/skills/`: nano-banana-pro, pixel-art-professional, canvas-design, frontend-design, kiln-glb, kiln-tsl

## Development Approach

Build features by using them. Generate actual game assets and verify they work in-game. When a template produces good results, save the configuration.
