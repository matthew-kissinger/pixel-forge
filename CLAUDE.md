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
cd packages/client && bunx vitest run   # 1208 pass, 1 skip, 52 files
cd packages/server && bun test          # 82 pass, 4 files
bun run test:e2e                        # 10 Playwright smoke tests
```

## Stack

React 19, Vite 7, React Flow 12, Zustand, Tailwind, Bun, Hono

**AI Services:** Gemini nano-banana-pro (2D), FAL BiRefNet (bg removal), FAL Meshy (3D), Claude/Kiln (3D primitives)

## Structure

```
packages/
  client/   # React Flow editor: 30 lazy-loaded node components, 6 panels, Zustand store, executor engine
  server/   # Hono API: routes for Gemini, FAL, Claude, export; services with timeouts + retries
  shared/   # Types, presets (7), prompt builders, API type contracts
```

## Architecture

- **Nodes**: 30 types, all lazy-loaded via `createLazyNode` with Suspense + `NodeErrorBoundary`
- **Executor**: Topological sort, parallel wave execution, per-node timeouts (120s gen, 60s processing, 30s canvas)
- **Handlers**: 8 modules in `lib/handlers/` (input, imageGen, model3d, processing, canvas, analysis, batch, output)
- **State**: Zustand store with undo/redo snapshots, auto-save to localStorage every 2s
- **Bundle**: Main ~97KB gzip, Three.js ~380KB, React Flow ~61KB, all nodes in separate chunks

## Critical: Transparency Workflow

**Always use solid red (#FF0000) or green (#00FF00) backgrounds.** Never ask Gemini for "transparent background" - produces checkerboard with no alpha. Red preferred; green for red subjects.

## Current Gaps

- **Untested node components**: KilnGenNode, SpriteSheetNode, CombineNode, Model3DGenNode, QualityCheckNode, StyleReferenceNode
- **Untested panels**: QuickGenerate, TemplateLoader
- **kiln/runtime.ts** (783 lines) - zero tests, WebGPU/Three.js renderer with heavy browser deps
- **No integration tests** against real Gemini/FAL/Claude APIs
- **PresetLauncher.tsx** (328 lines) - last large component needing refactor, has 23 tests

## Known Issues

- 1 skipped test: executor timeout - bun's vitest incompatible with `vi.useFakeTimers()` + async promises
- Three.js chunk is 1.4MB/380KB gzip (Vite warns about chunk size)

## Quality Bar

Assets: consistent style, power-of-2 dimensions, clean transparency, <50KB sprites, engine-compatible formats. **Test by generating real assets**, not just running code.

## Asset Templates

7 presets in `packages/shared/presets.ts`. See `docs/asset-reference.md` for detailed prompt templates and test case specs for Asteroid-Miner and Terror in the Jungle games.

## Skills

Local skills in `.claude/skills/`: nano-banana-pro, pixel-art-professional, canvas-design, frontend-design, kiln-glb, kiln-tsl

## Development Approach

Build features by using them. Generate actual game assets and verify they work in-game. When a template produces good results, save the configuration.
