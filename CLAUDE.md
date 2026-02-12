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
cd packages/client && bunx vitest run   # 1736 pass, 0 fail, 1 skip, 77 files
cd packages/server && bun test          # 118 pass, 7 files
bun run test:e2e                        # Playwright smoke + mobile viewport + workflow tests
```

## Stack

React 19, Vite 7, React Flow 12, Zustand, Tailwind, Bun, Hono

**AI Services:** Gemini nano-banana-pro (2D), FAL BiRefNet (bg removal), FAL Meshy (3D), Claude/Kiln (3D primitives)

## Structure

```
packages/
  client/   # React Flow editor: 30 node components (lazy-loaded), 9 panels, Zustand store, executor engine
  server/   # Hono API: routes with Zod validation, services with timeouts, retry client-side only
  shared/   # Types, presets, prompt builders, API type contracts
```

## Architecture

- **Nodes**: 30 types (28 lazy-loaded via `createLazyNode`, 2 eager), all wrapped with `NodeErrorBoundary`
- **Executor**: Topological sort, parallel wave execution, per-node timeouts (120s gen, 60s processing, 30s canvas)
- **Handlers**: 9 modules in `lib/handlers/` (index, input, imageGen, model3d, processing, canvas, analysis, batch, output)
- **State**: Zustand store with undo/redo snapshots, auto-save to localStorage every 2s with RecoveryBanner UI
- **Retry**: Client-side `retryWithBackoff` in `packages/client/src/lib/retry.ts` with per-node retry buttons
- **Bundle**: Main ~103KB gzip, Three.js ~380KB (lazy, only loaded for 3D nodes), React Flow ~61KB, all nodes in separate chunks

## Critical: Transparency Workflow

**Always use solid red (#FF0000) or green (#00FF00) backgrounds.** Never ask Gemini for "transparent background" - produces checkerboard with no alpha. Red preferred; green for red subjects.

## Current Gaps

- **kiln/runtime.ts** (783 lines) - zero tests, WebGPU/Three.js renderer
- **Untested handlers**: analysis.ts (216 lines), batch.ts (112 lines), imageGen.ts (115 lines), model3d.ts (105 lines) - handler tests for input/processing/canvas/output exist
- **Untested panel**: NodePalette.tsx (~250 lines, search filtering, drag-to-add, node categorization)
- **No integration tests** against real Gemini/FAL/Claude APIs
- **63 unpushed commits** on main (ahead of origin/main)

## Known Issues

- 1 skipped test: executor timeout - bun's vitest incompatible with `vi.useFakeTimers()` + async promises
- Three.js chunk is 1.4MB/380KB gzip (Vite warns about chunk size) - lazy loaded, only affects 3D workflows
- Old worktrees from completed tasks could be cleaned up

## Quality Bar

Assets: consistent style, power-of-2 dimensions, clean transparency, <50KB sprites, engine-compatible formats. **Test by generating real assets**, not just running code.

## Asset Templates

Presets in `packages/shared/presets.ts`. See `docs/asset-reference.md` for detailed prompt templates and test case specs.

## Skills

Local skills in `.claude/skills/`: nano-banana-pro, pixel-art-professional, canvas-design, frontend-design, kiln-glb, kiln-tsl

## Development Approach

Build features by using them. Generate actual game assets and verify they work in-game. When a template produces good results, save the configuration.
