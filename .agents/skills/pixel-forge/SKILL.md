---
name: pixel-forge
description: Use this skill when generating game assets (sprites, icons, textures, GLBs, soldier sets) via @pixel-forge/core, the pixelforge CLI, or the pixelforge MCP server. Trigger on keywords "pixel forge", "pixelforge", "@pixel-forge/core", "generate sprite", "generate icon", "generate texture", "generate GLB", "soldier-set", "kiln", "node-based asset generator", "react flow editor for assets". Routes to provider auto-routing (gpt-image-2 for refs, gpt-image-1.5 text-only, gemini bulk), 6 canonical pipelines, agent-introspectable kiln primitives.
allowed-tools: Read, Write, Bash, Glob, Grep
---

# Pixel Forge - Asset Generation Substrate

Headless game-asset substrate exposed via three transports: programmatic
(`@pixel-forge/core`), CLI (`pixelforge`), MCP (stdio). All three share
one zod schema, one provider matrix, one error taxonomy.

## When to invoke

- User wants to generate a sprite, icon, texture, GLB, or full soldier set
- User asks about `@pixel-forge/core`, the `pixelforge` CLI, or the `pixelforge` MCP
- User wants to inspect, validate, or refactor Kiln (Three.js primitive) code
- User wants to list providers or query model capabilities

Do NOT invoke for: editor UI work (use frontend-design), generic Three.js
shader work (use kiln-tsl), or pixel-art polish on an existing PNG (use
pixel-art-professional).

## Quick recipes

### Single sprite end-to-end

```bash
bunx pixelforge gen sprite \
  --prompt "tropical fern" \
  --bg magenta \
  --out ./out/fern.png
```

(or `bun packages/cli/src/index.ts gen sprite ...` without `bun link`)

### Icon (mono silhouette, no BiRefNet)

```bash
bunx pixelforge gen icon --prompt "ammo crate" --variant mono --out ./icon.png
```

### Tileable terrain texture

```bash
bunx pixelforge gen texture --description "jungle floor moss" --size 512 --out ./tile.png
```

### GLB via Kiln (Codex codegen + headless render)

```bash
bunx pixelforge gen glb --prompt "guard tower" --category structure --out ./tower.glb
```

### Inspect a generated GLB or Kiln source

```bash
bunx pixelforge inspect glb ./tower.glb         # tris, bounds, named parts
bunx pixelforge kiln inspect ./code.ts          # same, from source
```

### Programmatic (when scripting in TS)

```ts
import { kiln, image, capabilities } from '@pixel-forge/core';

const sprite = image.pipelines.createSpritePipeline({ /* deps */ });
const { png } = await sprite.run({ prompt: 'fern', bg: 'magenta' });

const inspected = kiln.inspect(code);
const route = capabilities.pickProviderFor({ kind: 'image', refs: 8 });
```

### List providers / query capabilities

```bash
bunx pixelforge providers list
bunx pixelforge providers pick --kind image --refs 8 --json
```

## Routing rules

- **Use the CLI** when running one-off generations from a shell or batch script
- **Use the MCP** when running inside Codex (or another MCP-aware agent) - tools auto-discover, binary outputs default to file paths
- **Import core directly** when writing a TS recipe script under `scripts/` or wiring a new generator

## Provider auto-routing (memorize this)

`capabilities.pickProviderFor({ kind, refs?, transparency? })`:

- `image` + `refs > 0` -> `gpt-image-2` (decisive on multi-ref / faction work); `OPENAI_HERO_MODEL` env pins a dated snapshot
- `image` + `transparency: true` -> `gpt-image-1.5` (only model with native alpha)
- `image` text-only -> `gemini-3.1-flash-image-preview` (Nano Banana Pro, hero) or `gemini-2.5-flash-image` (bulk cohort via `createGeminiFlashProvider()`)
- `texture` -> `fal-ai/flux-lora` (current default; FLUX 2 optional via endpoint override)
- `bg-removal` -> `fal-ai/birefnet/v2` with `variant: 'light' | 'light-2k' | 'heavy' | 'matting' | 'portrait' | 'general-dynamic'`; `createFalBriaBgRemovalProvider()` is the enterprise fallback
- `image-to-3d` -> `fal-ai/hunyuan3d-v3/image-to-3d` (spike; pair with Gemini sprite output)
- `code-gen` -> `claude-opus-4-7` (sonnet on `preferCheap`); `KILN_MODEL` env overrides

The `image.getDefaultImageGen().generate({ provider: 'auto', ... })` facade
consults this for you. Regenerate the live catalog with
`pixelforge health --audit` — writes
`docs/model-catalog-YYYY-MM-DD.md` and
`packages/core/src/providers/_catalog.generated.json`.

## Pre-flight

Before any batch generation, probe all four providers:

```bash
pixelforge health            # one-line per-provider liveness
pixelforge health --strict   # exit 2 if MISSING / AUTH_FAIL / BALANCE
pixelforge health --audit    # also regenerate docs/model-catalog-*.md
```

If a key is red, recover with `bun scripts/_key-paste.ts --key=<NAME>` —
serves a local HTML form that writes `~/.config/mk-agent/env`. Do not edit
env files by hand.

`scripts/run-overnight.sh` and `scripts/run-2d-additions.sh` already gate on
this probe; set `PF_SKIP_HEALTH=1` to bypass for offline runs.

## Review annotations

Generated assets now carry structured provenance and optional human QA:

- `<asset>.provenance.json` sidecar — `{ provider, model, prompt, promptHash, latencyMs, warnings, code }`. Written by every CLI generate command and by `scripts/_direct-batch.ts`. Read it to reconstruct how any file was produced.
- `war-assets/_review/issues.json` — human QA from `pixelforge audit review --serve`. Chips are `wrong-axis`, `floating`, `stray-plane`, `proportions`, `missing-part`, `style`; `note` is freetext. Last-write-wins per asset slug.

Before re-running a category, read `issues.json` to pick up annotations made
between runs.

## Error handling (READ THIS)

Every throw from `@pixel-forge/core` is a `PixelForgeError` subclass with:

- `.code` - stable machine-readable identifier (`PROVIDER_RATE_LIMITED`, `PROVIDER_AUTH_FAILED`, ...)
- `.message` - human description
- `.fixHint` - one-action suggestion, agent-facing
- `.retryable` - whether a naive retry is appropriate

The CLI prints `code` + `fixHint` and exits non-zero. The MCP returns them
in `structuredContent` with `isError: true`. **Always read `fixHint` and
use it as your rationale for the next action**, rather than guessing.

## Don't

- Do NOT use the deprecated `@fal-ai/serverless-client` - migrate to `@fal-ai/client@^1.9.5` (returns `{ data, requestId }` from `subscribe()`)
- Do NOT send `background: "transparent"` to gpt-image-2 - 400 error. The pipeline strips magenta via chroma cleanup; the dual-model router handles transparency by routing to `gpt-image-1.5` instead.
- Do NOT run BiRefNet on faction insignia or solid-white silhouette icons - it eats into colored fills. Use direct chroma keying (`createIconPipeline` does this).
- Do NOT use red `#FF0000` background on any sprite - bleeds into greens, browns, skin tones. Magenta `#FF00FF` is the safe default.
- Do NOT use Gemini for terrain textures - use the texture pipeline (FLUX 1 + Seamless LoRA, currently).
- Do NOT import from `@pixel-forge/core` deep paths - use the namespace surface (`import { kiln, image, providers, capabilities, schemas } from '@pixel-forge/core'`).
- Do NOT regenerate anything in `war-assets/` without explicit user instruction.

## See also

- `AGENTS.md` (repo root) - full architecture, public API surface, asset rules
- `AGENTS.md` (repo root) - Codex-specific operational lessons
- `packages/cli/README.md`, `packages/mcp/README.md` - adapter details
- Sibling skills: `kiln-glb` (3D primitive code style), `kiln-tsl` (shader effects, editor-only), `nano-banana-pro` (Gemini config), `pixel-art-professional` (PNG polish)
