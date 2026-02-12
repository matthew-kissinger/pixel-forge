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
cd packages/client && bunx vitest run   # 1639 pass, 5 fail, 1 skip, 73 files
cd packages/server && bun test          # 118 pass, 7 files
bun run test:e2e                        # Playwright smoke + mobile viewport tests
```

## Stack

React 19, Vite 7, React Flow 12, Zustand, Tailwind, Bun, Hono

**AI Services:** Gemini nano-banana-pro (2D), FAL BiRefNet (bg removal), FAL Meshy (3D), Claude/Kiln (3D primitives)

## Structure

```
packages/
  client/   # React Flow editor: 31 lazy-loaded node components, 8 panels, Zustand store, executor engine
  server/   # Hono API: routes for Gemini, FAL, Claude, export; services with timeouts (no retries yet)
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

## Current Gaps

- **5 failing tests**: MobileNav (expects aria-label, component uses title) + useAutoSave recovery tests (expect old window.confirm pattern, component now uses RecoveryBanner)
- **kiln/runtime.ts** (783 lines) - zero tests, WebGPU/Three.js renderer
- **Untested handlers**: analysis.ts (216 lines), batch.ts (112 lines), imageGen.ts (115 lines), model3d.ts (105 lines)
- **Untested panels**: CommandPalette.tsx (370 lines), KeyboardShortcutsHelp.tsx (125 lines)
- **Untested UI**: RecoveryBanner.tsx (72 lines), Toast.tsx (117 lines)
- **No integration tests** against real Gemini/FAL/Claude APIs

## Known Issues

- 1 skipped test: executor timeout - bun's vitest incompatible with `vi.useFakeTimers()` + async promises
- Three.js chunk is 1.4MB/380KB gzip (Vite warns about chunk size)
- 4 unstaged changes on main: .gitignore cleanup, signal prop in ExecutionContext, pollModelStatus test update, typecheck tsconfig fix
- Server services (Gemini, FAL, Claude) have no retry logic - single attempt only

## Quality Bar

Assets: consistent style, power-of-2 dimensions, clean transparency, <50KB sprites, engine-compatible formats. **Test by generating real assets**, not just running code.

## Asset Templates

Presets in `packages/shared/presets.ts`. See `docs/asset-reference.md` for detailed prompt templates and test case specs.

## Skills

Local skills in `.claude/skills/`: nano-banana-pro, pixel-art-professional, canvas-design, frontend-design, kiln-glb, kiln-tsl

## Development Approach

Build features by using them. Generate actual game assets and verify they work in-game. When a template produces good results, save the configuration.
