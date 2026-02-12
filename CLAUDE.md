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
cd packages/client && bunx vitest run   # ~1429 pass, 1 skip, 62 files
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
- **Bundle**: Main ~99KB gzip, Three.js ~380KB, React Flow ~61KB, all nodes in separate chunks

## Critical: Transparency Workflow

**Always use solid red (#FF0000) or green (#00FF00) backgrounds.** Never ask Gemini for "transparent background" - produces checkerboard with no alpha. Red preferred; green for red subjects.

## Current Gaps

- **8 unmerged branches**: Mobile accessibility, theme system, touch targets, panel tests, command palette, Playwright e2e, node tests - all completed but need merge/conflict resolution
- **Lint error**: `useMediaQuery.ts` - setState in effect (line 11), blocks clean lint
- **Untested hooks**: useFocusTrap (64 lines), useMediaQuery (19 lines), useTheme (in branch) - zero tests
- **Untested sub-components**: PresetLauncher sub-components (5), Toolbar sub-components (3) - zero tests
- **kiln/runtime.ts** (783 lines) - zero tests, WebGPU/Three.js renderer with heavy browser deps
- **No integration tests** against real Gemini/FAL/Claude APIs
- **Uncommitted cleanup**: 51 legacy scripts/assets staged for deletion, .gitignore updates, touch target improvements
- **Memory leak**: Deleting nodes does not clean up `nodeOutputs`/`nodeStatus`/`nodeErrors`/`batchProgress` in workflow store
- **No rate limiting**: Server API routes accept unlimited requests (DoS/quota risk)
- **Server errors untested**: `lib/errors.ts` (98 lines) and error handler middleware have zero test coverage
- **No .env.example**: Required env vars (GEMINI_API_KEY, FAL_KEY) undocumented for contributors
- **AutoSave perf**: `useAutoSave` uses JSON.stringify equality on full nodes/edges array every state change

## Known Issues

- 1 skipped test: executor timeout - bun's vitest incompatible with `vi.useFakeTimers()` + async promises
- Three.js chunk is 1.4MB/380KB gzip (Vite warns about chunk size)
- Main bundle ~99KB gzip (increased from 97KB with mobile/responsive additions)
- `window.confirm` used for workflow recovery in useAutoSave (should be custom UI)

## Quality Bar

Assets: consistent style, power-of-2 dimensions, clean transparency, <50KB sprites, engine-compatible formats. **Test by generating real assets**, not just running code.

## Asset Templates

7 presets in `packages/shared/presets.ts`. See `docs/asset-reference.md` for detailed prompt templates and test case specs for Asteroid-Miner and Terror in the Jungle games.

## Skills

Local skills in `.claude/skills/`: nano-banana-pro, pixel-art-professional, canvas-design, frontend-design, kiln-glb, kiln-tsl

## Development Approach

Build features by using them. Generate actual game assets and verify they work in-game. When a template produces good results, save the configuration.
