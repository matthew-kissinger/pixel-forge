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
cd packages/client && bunx vitest run   # ~1472 pass, 1 fail, 1 skip, 62 files
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

- **12 unmerged task branches**: Completed work (rate limiting, memory leak fix, server error tests, theme, focus trap, panel tests, e2e, node tests, touch targets, command palette, light theme) sitting in branches not merged to main
- **1 failing test**: `MobileNav.test.tsx` - expects `title` attribute but component uses `aria-label`
- **Lint error**: `useMediaQuery.ts` - setState in effect (line 11), fix with `useSyncExternalStore`
- **Untested hooks**: useFocusTrap (64 lines), useMediaQuery (19 lines), useTheme (in branch) - zero tests
- **Untested sub-components**: PresetLauncher sub-components (5), Toolbar sub-components (3) - zero tests
- **kiln/runtime.ts** (783 lines) - zero tests, WebGPU/Three.js renderer with heavy browser deps
- **No integration tests** against real Gemini/FAL/Claude APIs
- **No request body size limits**: Server accepts unlimited base64 payloads via Hono (needs `bodyLimit` middleware)
- **No .env.example**: Required env vars (GEMINI_API_KEY, FAL_KEY) undocumented for contributors
- **AutoSave perf**: `useAutoSave` uses JSON.stringify equality on full nodes/edges array every state change
- **pollModelStatus not cancellable**: No AbortController support - polls for up to 5 minutes even after component unmount
- **Export path validation**: `validatePath()` blocks `..` but doesn't resolve symlinks (use `fs.realpath`)
- **No server request timeout**: Long-running AI requests can hang indefinitely
- **No response compression**: Large base64 image responses sent uncompressed

## Known Issues

- 1 skipped test: executor timeout - bun's vitest incompatible with `vi.useFakeTimers()` + async promises
- 1 failing test: MobileNav title attribute mismatch with aria-label
- Three.js chunk is 1.4MB/380KB gzip (Vite warns about chunk size)
- Main bundle ~99KB gzip (increased from 97KB with mobile/responsive additions)
- `window.confirm` used for workflow recovery in useAutoSave (should be custom UI)
- Executor adds orphan input nodes to execution waves (line 153-158) - they have no handlers

## Quality Bar

Assets: consistent style, power-of-2 dimensions, clean transparency, <50KB sprites, engine-compatible formats. **Test by generating real assets**, not just running code.

## Asset Templates

7 presets in `packages/shared/presets.ts`. See `docs/asset-reference.md` for detailed prompt templates and test case specs for Asteroid-Miner and Terror in the Jungle games.

## Skills

Local skills in `.claude/skills/`: nano-banana-pro, pixel-art-professional, canvas-design, frontend-design, kiln-glb, kiln-tsl

## Development Approach

Build features by using them. Generate actual game assets and verify they work in-game. When a template produces good results, save the configuration.
