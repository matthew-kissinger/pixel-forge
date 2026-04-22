<p align="center">
  <h1 align="center">Pixel Forge</h1>
  <p align="center">
    Node-based AI game asset generator.<br/>
    Visual pipelines for 2D sprites, tileable textures, and 3D models.
  </p>
</p>

<p align="center">
  <a href="https://github.com/matthew-kissinger/pixel-forge/releases"><img src="https://img.shields.io/github/v/release/matthew-kissinger/pixel-forge?style=flat-square&color=blue" alt="Release"></a>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/matthew-kissinger/pixel-forge?style=flat-square&color=yellow" alt="License"></a>
  <a href="https://github.com/matthew-kissinger/pixel-forge/actions"><img src="https://img.shields.io/github/actions/workflow/status/matthew-kissinger/pixel-forge/ci.yml?style=flat-square&label=CI" alt="CI"></a>
  <img src="https://img.shields.io/badge/React_19-React_Flow_12-61DAFB?style=flat-square&logo=react" alt="React">
  <img src="https://img.shields.io/badge/runtime-Bun-f9f1e1?style=flat-square&logo=bun" alt="Bun">
  <img src="https://img.shields.io/badge/AI-Gemini_%7C_FAL_%7C_Claude-8E75B2?style=flat-square" alt="AI Services">
</p>

---

## Overview

Pixel Forge is a visual node editor for generating game-ready assets with AI. Drag, connect, and execute pipelines that produce sprites, textures, and 3D models - all from text prompts.

### Node Editor

Build asset pipelines by connecting nodes. Each node handles one step - generation, processing, or export.

![Node Editor - Asset Pipeline](docs/screenshots/editor-pipeline.png)

### Asset Gallery

Browse, compare, and review generated assets. Raw vs clean comparison for sprites, tiled preview for textures, interactive 3D viewer for GLB models.

![Asset Gallery - Weapons](docs/screenshots/gallery-weapons.png)

### Generated Assets

All assets below were generated entirely by AI through Pixel Forge pipelines.

<table>
<tr>
<td width="50%">

**2D Sprites** - Pixel art characters with automatic background removal

![Soldier Sprites](docs/screenshots/gallery-soldiers.png)
</td>
<td width="50%">

**Vegetation** - Billboard sprites with magenta chroma key cleanup

![Vegetation Sprites](docs/screenshots/gallery-vegetation.png)
</td>
</tr>
<tr>
<td width="50%">

**3D Vehicles** - GLB models built from Three.js primitives via Claude

![Aircraft Models](docs/screenshots/gallery-vehicles.png)
</td>
<td width="50%">

**Ground Vehicles** - Tanks, APCs, jeeps, trucks

![Ground Vehicles](docs/screenshots/gallery-ground-vehicles.png)
</td>
</tr>
<tr>
<td colspan="2">

**Tileable Textures** - Seamless pixel-art terrain tiles via FLUX 2 + LoRA

![Terrain Textures](docs/screenshots/gallery-textures.png)
</td>
</tr>
</table>

---

### Pipelines

| Pipeline | AI Service | Input | Output |
|----------|-----------|-------|--------|
| **2D Sprites** | Gemini 3.1 Flash Image | Text prompt + style preset | Transparent PNG sprites |
| **Tileable Textures** | FLUX 2 + Seamless LoRA (FAL) | Terrain description | Seamless pixel-art tiles |
| **3D Models** | Claude (Anthropic) | Object description | GLB models via Three.js primitives |
| **Background Removal** | BiRefNet (FAL) | Any image | Clean transparency |

### Background Color Selection

Clean transparency requires choosing a background color that contrasts with the asset's dominant colors. This prevents color bleed at edges after BiRefNet removal.

| Asset Type | Background | Why |
|-----------|-----------|-----|
| Vegetation, soldiers, terrain | Magenta `#FF00FF` | Maximum contrast with greens, browns, skin tones |
| Icons, UI elements (white/grey) | Blue `#0000FF` | Better BiRefNet separation for light subjects |
| Fire, explosions (red/orange) | Blue `#0000FF` | Avoids red channel bleed |
| Colored emblems/insignia | Green `#00FF00` | Skip BiRefNet entirely, use green chroma key |

All sprite presets use magenta by default. Never use red (`#FF0000`) for sprites - it bleeds into greens, browns, and skin tones.

### Key Features

- **30 node types** - image gen, bg removal, 3D gen, canvas ops, batch processing, analysis, export
- **48 Kiln primitives** - Three.js-primitive-based 3D generation (CSG, UV unwrap, PBR textures, parametric gears & blades, shape-aware unwraps). LLM-authored JS renders to GLB headlessly via `@gltf-transform/core` — no Blender required. See [`docs/kiln-vision.md`](docs/kiln-vision.md).
- **Parallel execution** - topological sort with wave-based parallelism
- **Resilient** - per-node timeouts, retry with backoff, error boundaries on every node
- **Fast** - lazy-loaded nodes, ~103KB gzip main bundle, Three.js loaded on demand
- **Recoverable** - undo/redo snapshots, auto-save to localStorage, recovery banner
- **CLI + UI + MCP** - visual editor, `pixelforge` CLI, or stdio MCP server — all wrap the same `@pixel-forge/core` substrate
- **Agent-friendly** - documented API for AI agent workflows (see [`AGENTS.md`](AGENTS.md)); secret-scan pre-commit hook at [`scripts/secret-scan.sh`](scripts/secret-scan.sh)

## Quick Start

```bash
# Prerequisites: Bun (https://bun.sh), Node 22+
bun install

# Configure API keys (copy template, paste your keys):
cp .env.example .env.local
cp .env.example packages/server/.env.local

# Start
bun run dev:server    # API server on :3000
bun run dev:client    # Editor UI on :5173
```

Open http://localhost:5173 for the visual editor, or http://localhost:3000/gallery to browse generated assets.

## API Keys

Bun auto-loads `.env.local` from the repo root and from `packages/server/`. Put your keys in both (or use the central-store workflow below).

| Service | Required | What It Powers | Get a Key |
|---------|:--------:|----------------|-----------|
| Google Gemini | Yes | 2D sprite generation | [Google AI Studio](https://aistudio.google.com/apikey) |
| FAL AI | Yes | Background removal, texture gen, 3D gen | [FAL Dashboard](https://fal.ai/dashboard/keys) |
| Anthropic | Optional | 3D primitive composition (Kiln) | [Anthropic Console](https://console.anthropic.com/settings/keys) |
| OpenAI | Optional | gpt-image-1.5 / gpt-image-2 fallback | [OpenAI Platform](https://platform.openai.com/api-keys) |

### Central key store (optional workflow)

If you run multiple projects and don't want keys duplicated across repos, keep a single file at `~/.config/mk-agent/env` and fan it out on demand:

```bash
# Keys live once in ~/.config/mk-agent/env — KEY=value, one per line.
bun scripts/pull-keys.ts
# Writes .env.local and packages/server/.env.local from the central file.
```

**Before committing:** run `bash scripts/secret-scan.sh` (or install it as a pre-commit hook: `cp scripts/secret-scan.sh .git/hooks/pre-commit && chmod +x .git/hooks/pre-commit`). Scans staged changes for Gemini / Anthropic / OpenAI / FAL / GitHub / Slack / AWS key patterns and blocks commits that contain them.

## Project Structure

```
pixel-forge/
  packages/
    core/         # @pixel-forge/core - headless substrate (kiln, image, providers)
    client/       # React 19 + React Flow 12 + Zustand + Tailwind CSS
    server/       # Hono API server with Zod validation
    shared/       # Cross-adapter types
    cli/          # `pixelforge` CLI (citty over core)
    mcp/          # MCP stdio server (over core)
  scripts/        # Recipe scripts over @pixel-forge/core (+ Python)
  docs/           # Prompt templates, workflows, asset specs, wave reports
  e2e/            # Playwright end-to-end tests
  .claude/        # AI agent skill definitions
```

## Commands

```bash
# Development
bun run dev:client        # Vite dev server (:5173)
bun run dev:server        # Hono API server (:3000)
bun run dev               # Both concurrently

# Quality
bun run build             # Production build
bun run typecheck         # TypeScript (tsc --noEmit)
bun run lint              # ESLint

# Tests
cd packages/core   && KILN_SPIKE_LIVE=0 IMAGE_PROVIDERS_LIVE=0 bun test  # 284 pass + 6 skip
cd packages/server && bun test           # 114 pass
cd packages/client && bunx vitest run    # ~1900 pass
cd packages/cli    && bun test           # 16 pass
cd packages/mcp    && bun test           # 7 pass
bun run test:e2e                         # Playwright smoke + mobile + workflow

# QA
bun run audit:glb                        # 6-view grid PNG per validation GLB
bun run audit:glb gear.glb sword.glb     # subset
```

## CLI Asset Generation

Generate assets without the UI using CLI scripts:

```bash
# Single sprite
bun scripts/generate.ts image \
  --prompt "tropical fern, 32-bit pixel art sprite, bright saturated colors..." \
  --out vegetation/fern.png \
  --remove-bg \
  --aspect 1:1

# Batch generation from manifest
bun scripts/generate.ts batch --manifest scripts/batches/batch1-vegetation.json
```

See [`AGENTS.md`](AGENTS.md) for the full API reference, batch manifest format, and style system docs.

## Agent Adapters: `pixelforge` CLI + MCP server

Two thin wrappers over `@pixel-forge/core` for agentic workflows.

### CLI (`pixelforge`, citty)

```bash
cd packages/cli && bun link    # puts `pixelforge` on PATH
# Or invoke directly without linking:
bun packages/cli/src/index.ts <command> [...args]

# Worked example: a single sprite end-to-end
pixelforge gen sprite \
  --prompt "m16 rifle, side view" \
  --bg magenta \
  --out ./out/m16.png

# More commands
pixelforge gen icon         --prompt "ammo crate" --variant mono --out ./icon.png
pixelforge gen texture      --description "jungle floor moss" --size 512 --out ./tile.png
pixelforge gen glb          --prompt "guard tower"  --category structure --out ./tower.glb
pixelforge inspect glb      ./tower.glb
pixelforge providers list
pixelforge kiln list-primitives
pixelforge kiln validate    ./code.ts
```

Every command supports `--json` for machine-readable stdout. Errors print
`code` + `fixHint` from the core's `PixelForgeError` taxonomy and exit
non-zero. See [`packages/cli/README.md`](packages/cli/README.md) for the
full surface.

### MCP server (stdio)

```bash
# Install once:
claude mcp add pixelforge --stdio bun packages/mcp/src/index.ts

# Then from Claude Code (or any MCP client), tools are auto-discovered:
#   pixelforge_gen_sprite      { prompt: "m16 rifle", bg: "magenta" }
#   pixelforge_kiln_inspect    { code: "..." }
#   pixelforge_providers_capabilities { }
```

Tools: `pixelforge_gen_{sprite,icon,texture,glb,soldier_set}`,
`pixelforge_kiln_{inspect,validate,refactor,list_primitives}`,
`pixelforge_providers_capabilities`. Binary outputs (PNG/GLB) default to
writing a tmp file and returning the path; pass `inline: true` to receive
base64 instead, or `outPath: "..."` for an explicit destination. See
[`packages/mcp/README.md`](packages/mcp/README.md) for details.

## Architecture

The editor uses a **dataflow execution model**:

```
[Input Nodes] --> [Processing Nodes] --> [Output Nodes]
     |                   |                    |
  Prompts,          Transform,            Export,
  Images,           Analyze,              Gallery,
  Presets            Compose               Sheets
```

1. **Nodes** define operations (generate, remove bg, resize, compose, export)
2. **Edges** connect node outputs to inputs, forming a DAG
3. **Executor** performs topological sort and runs independent nodes in parallel waves
4. **Handlers** (9 modules) dispatch each node type with per-type timeouts (30s-120s)

All 28 complex node components are **lazy-loaded** via `createLazyNode` with `NodeErrorBoundary` wrappers. Three.js (~380KB gzip) is only loaded when 3D nodes are used.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, Vite 7, React Flow 12, Zustand, Tailwind CSS |
| **Backend** | Hono, Bun |
| **AI** | Google Gemini, FAL AI (BiRefNet, FLUX 2, Meshy), Claude |
| **3D** | Three.js, @gltf-transform/core |
| **Testing** | Vitest, Playwright |
| **CI** | GitHub Actions |

## Contributing

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Make changes and add tests
4. Run the test suite:
   ```bash
   cd packages/client && bunx vitest run
   cd packages/server && bun test
   ```
5. Submit a pull request

## License

[MIT](LICENSE) - Matthew Kissinger
