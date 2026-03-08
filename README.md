# Pixel Forge

Node-based AI game asset generator. Visual pipeline for creating 2D sprites, tileable textures, and 3D models using AI services.

![Node Editor](https://img.shields.io/badge/React_Flow-Node_Editor-blue)
![AI Powered](https://img.shields.io/badge/AI-Gemini_%7C_FAL_%7C_Claude-green)
![License](https://img.shields.io/badge/License-MIT-yellow)

## What It Does

Pixel Forge provides a visual node-based editor for generating game assets with AI. Connect nodes to build pipelines that generate, transform, optimize, and export assets.

**Pipelines:**
- **2D Sprites** - Gemini image generation with automatic background removal (BiRefNet) and chroma cleanup
- **Tileable Textures** - FLUX 2 + Seamless Texture LoRA for pixel-art terrain tiles
- **3D Models** - Claude-powered Three.js primitive composition exported as GLB

**Key Features:**
- 30 node types (image gen, bg removal, 3D gen, canvas ops, batch processing, export)
- Topological sort executor with parallel wave execution
- Per-node timeouts, retry with backoff, and error boundaries
- Undo/redo with auto-save recovery
- Asset gallery with tiled texture preview
- CLI scripts for batch generation
- Agent-friendly API (see `AGENTS.md`)

## Quick Start

```bash
# Prerequisites: Bun (https://bun.sh)
bun install

# Set up API keys
cp .env.example packages/server/.env.local
# Edit packages/server/.env.local with your keys

# Run
bun run dev:server    # API server on :3000
bun run dev:client    # UI on :5173
```

Open http://localhost:5173 to use the visual editor, or http://localhost:3000/gallery to browse generated assets.

## API Keys

| Service | Required | Purpose | Get Key |
|---------|----------|---------|---------|
| Gemini | Yes | 2D sprite generation | [Google AI Studio](https://aistudio.google.com/apikey) |
| FAL | Yes | Background removal (BiRefNet), textures (FLUX 2), 3D (Meshy) | [FAL Dashboard](https://fal.ai/dashboard/keys) |
| Anthropic | Optional | 3D primitives via Kiln (Claude) | [Anthropic Console](https://console.anthropic.com/settings/keys) |

## Project Structure

```
packages/
  client/     # React 19 + React Flow 12 + Zustand + Tailwind
  server/     # Hono API with Zod validation
  shared/     # Types, presets, prompt builders
scripts/      # CLI generation scripts (TypeScript + Python)
war-assets/   # Example generated assets (sprites, textures, GLB models)
docs/         # Prompt templates, workflows, asset specs
.claude/      # AI agent skills for asset generation
```

## Commands

```bash
bun run dev:client        # Vite dev server
bun run dev:server        # Hono API server
bun run build             # Production build
bun run typecheck         # TypeScript check
bun run lint              # ESLint

# Tests
cd packages/client && bunx vitest run    # Client tests
cd packages/server && bun test           # Server tests
bun run test:e2e                         # Playwright E2E tests
```

## CLI Asset Generation

Generate assets directly from the command line without the UI:

```bash
# Single image
bun scripts/generate.ts image \
  --prompt "tropical fern, 32-bit pixel art sprite..." \
  --out vegetation/fern.png \
  --remove-bg

# Batch generation
bun scripts/generate.ts batch --manifest scripts/batches/batch1-vegetation.json
```

See `AGENTS.md` for full API documentation and batch workflow details.

## Stack

- **Frontend:** React 19, Vite 7, React Flow 12, Zustand, Tailwind CSS
- **Backend:** Hono, Bun
- **AI Services:** Google Gemini (sprites), FAL AI (BiRefNet, FLUX 2, Meshy), Claude (3D primitives)
- **3D:** Three.js + @gltf-transform/core (headless GLB export)
- **Testing:** Vitest, Playwright

## Architecture

The editor uses a dataflow execution model:

1. **Nodes** define operations (generate image, remove background, resize, etc.)
2. **Edges** connect outputs to inputs, forming a directed acyclic graph
3. **Executor** performs topological sort and runs nodes in parallel waves
4. **Handlers** (9 modules) process each node type with appropriate timeouts

All 28 complex nodes are lazy-loaded via `createLazyNode` for fast initial page load (~103KB gzip main bundle).

## Example Assets

The `war-assets/` directory contains 200+ generated assets demonstrating the pipelines:
- 90+ 2D sprites (soldiers, vegetation, weapons, icons, UI)
- 12 tileable terrain textures
- 75 GLB 3D models (vehicles, structures, weapons, animals)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Run tests: `cd packages/client && bunx vitest run`
4. Submit a pull request

## License

[MIT](LICENSE)
