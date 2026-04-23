# AGENTS.md

Universal brief for AI coding agents working in the Pixel Forge repo. Follows the [agents.md](https://agents.md/) convention. If you are Codex, Cursor, Aider, Devin, Claude Code, or any other agent: read this file first.

Human-facing docs (features, screenshots, install) live in [`README.md`](README.md). Claude-specific hooks, skills, and memory integration live in [`CLAUDE.md`](CLAUDE.md) — this file is the cross-agent common denominator and does not contradict either.

---

## 1. Project overview

Pixel Forge is a node-based AI game asset generator. It produces game-ready 2D sprites, tileable terrain textures, and exportable GLB 3D models from text prompts using Gemini, FAL, and Claude.

The repo is a Bun workspace monorepo. After the W0–W5 cycle (April 2026), the architecture is **substrate + thin adapters**:

- `@pixel-forge/core` is the canonical headless library — providers, pipelines, kiln runtime, capabilities, errors. Browser-free.
- The React Flow editor, the citty CLI, and the MCP stdio server are all *transports* that consume core.
- Generation scripts under `scripts/` are now thin recipe wrappers over `core`, not duplicate logic.

Output lives in [`war-assets/`](war-assets/) and was shipped to [Terror in the Jungle](https://github.com/matthew-kissinger).

---

## 2. Commands

All commands run from the repo root unless noted. Bun 1.3+ required.

```bash
# Install
bun install

# Dev (browser editor + API server)
bun run dev:client        # Vite dev server on :5173
bun run dev:server        # Hono API server on :3000
bun run dev               # both concurrently

# Build and quality
bun run build             # production build (all workspaces)
bun run typecheck         # tsc --noEmit (all workspaces)
bun run lint              # ESLint (all workspaces)

# E2E
bun run test:e2e          # Playwright (smoke + mobile viewport + workflow)
```

### CLI — `pixelforge`

```bash
# From repo root, after `bun install`:
cd packages/cli && bun link        # puts `pixelforge` on PATH
# Or invoke directly without linking:
bun packages/cli/src/index.ts <command> [...args]

pixelforge gen sprite       --prompt "m16 rifle" --bg magenta --out ./out.png
pixelforge gen icon         --prompt "ammo crate" --variant mono --out ./icon.png
pixelforge gen texture      --description "jungle floor moss" --size 512 --out ./tile.png
pixelforge gen glb          --prompt "guard tower" --category structure --out ./tower.glb
pixelforge gen soldier-set  --faction NVA --tpose-prompt "..." --poses-file ./poses.json --out-dir ./soldiers
pixelforge inspect glb      ./tower.glb
pixelforge providers list
pixelforge providers pick   --kind image --refs 8
pixelforge kiln list-primitives
pixelforge kiln validate    ./code.ts
pixelforge kiln inspect     ./code.ts
pixelforge kiln refactor    --code ./old.ts --instruction "add a turret" --out ./new.ts
```

Every command supports `--json` for machine-readable stdout. Errors print `code` + `fixHint` from the core's `PixelForgeError` taxonomy and exit non-zero. See [`packages/cli/README.md`](packages/cli/README.md).

### MCP server

```bash
claude mcp add pixelforge --stdio bun packages/mcp/src/index.ts
```

Tools: `pixelforge_gen_{sprite,icon,texture,glb,soldier_set}`, `pixelforge_kiln_{inspect,validate,refactor,list_primitives}`, `pixelforge_providers_capabilities`. Binary outputs default to writing a tmp file and returning the path; pass `inline: true` for base64 or `outPath: "..."` for an explicit destination. See [`packages/mcp/README.md`](packages/mcp/README.md).

### Tests — run per-package, NOT from root

`bun run test` at the root is broken for the client package (bun's vitest driver is incompatible with the test setup). Always `cd` into the package:

```bash
cd packages/client && bunx vitest run     # ~1938 pass, 1 skip, 86 files
cd packages/server && bun test            # ~114 pass, 7 files
cd packages/core   && bun test            # ~157 pass
cd packages/cli    && bun test            # ~16 pass (smoke)
cd packages/mcp    && bun test            # ~7 pass (round-trip)
```

Bundle size check (used by CI):

```bash
bun run check:bundle-size
```

---

## 3. Repository structure

```
pixel-forge/
  packages/
    core/       # @pixel-forge/core. Headless substrate. Browser-free.
                # kiln/ image/ providers/ schemas/ + capabilities + errors.
    client/     # React 19 + React Flow 12 + Zustand + Tailwind 4. The node editor UI. Consumes core.
    server/     # Hono + Bun API. Thin wrappers over core for the editor + scripts.
    shared/     # Cross-adapter types only. Most logic moved into core.
    cli/        # @pixel-forge/cli. Citty adapter — `pixelforge` binary.
    mcp/        # @pixel-forge/mcp. stdio MCP server adapter.
  scripts/      # Thin recipe wrappers over core. Older/one-shot scripts under scripts/_archive/.
  war-assets/   # Generated output. Committed. Do not regenerate or mutate without explicit ask.
  docs/         # Wave reports, prompt templates, workflows, asset specs, next-cycle plan.
  e2e/          # Playwright tests.
  .claude/      # Claude Code skills (kiln-glb, kiln-tsl, pixel-forge, pixel-art-professional, etc.).
```

Workspace packages: `client`, `server`, `@pixel-forge/shared`, `@pixel-forge/core`, `@pixel-forge/cli`, `@pixel-forge/mcp`. Cross-package imports use `workspace:*`.

---

## 4. Architecture: substrate + thin adapters

```
                       @pixel-forge/core
                  ┌────────────────────────┐
                  │ kiln/   image/         │
                  │ providers/ schemas/    │
                  │ capabilities  errors   │
                  └─────────┬──────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
   React Flow           pixelforge         pixelforge
   editor               CLI (citty)        MCP server
   (humans)             (agents)           (Claude Code)
        │                   │                   │
   localhost:5173        $ shell           stdio JSON-RPC
```

**Rules:**

- All new business logic lands in `@pixel-forge/core`. Adapters are pure transport.
- Adapters import from the namespace surface (`import { kiln, image, providers } from '@pixel-forge/core'`), not from deep paths.
- Errors from core are structured (`PixelForgeError` subclasses with `.code`, `.fixHint`, `.retryable`) — adapters surface those fields verbatim.
- Browser code (`packages/client`) wires editor handlers to core; it does NOT re-implement primitives, prompts, or providers.

---

## 5. Public API surface

```ts
import {
  kiln,           // 3D model generation + introspection
  image,          // image gen, chroma cleanup, pipelines
  providers,      // provider factories + interfaces
  capabilities,   // capability matrix queries
  schemas,        // zod schemas (shared across adapters)
  // top-level structured errors:
  PixelForgeError,
  isPixelForgeError,
  // ...and concrete subclasses (ProviderRateLimited, etc.)
} from '@pixel-forge/core';
```

Most-used entry points:

| Namespace | Entry points |
|-----------|--------------|
| `kiln` | `generate(prompt, opts)`, `renderGLB(code)`, `inspect(code)`, `listPrimitives()`, `validate(code)`, `refactor(instruction, code)` |
| `image` | `getDefaultImageGen()`, `chromaCleanMagenta()`, `chromaCleanFor(bg)`, `pipelines.createSpritePipeline()`, `pipelines.createIconPipeline()`, `pipelines.createTexturePipeline()`, `pipelines.createSoldierSetPipeline()`, `pipelines.createGlbPipeline()`, `pipelines.createBatchPipeline()` |
| `providers` | `createGeminiProvider()`, `createOpenAIProvider()`, `createFalTextureProvider()`, `createFalBgRemovalProvider()`, `createAnthropicProvider()` + `ImageProvider` / `CodeGenProvider` types |
| `capabilities` | `capabilities()`, `capabilitiesFor(id)`, `pickProviderFor({ kind, refs?, transparency? })` |
| `schemas` | `ImageGenerateInputSchema`, `ImageEditInputSchema`, `KilnGenerateInputSchema` (and inferred TS types) |

---

## 6. Pipelines

Six canonical pipelines under `image.pipelines`. They encapsulate the asset rules from §7 — call them, don't reimplement.

| Pipeline | Input | Output | Notes |
|----------|-------|--------|-------|
| `createSpritePipeline` | `{ prompt, bg?, refs?, removeBackground? }` | `{ png: Buffer, meta }` | Gemini/OpenAI generate -> optional BiRefNet -> chroma cleanup |
| `createIconPipeline` | `{ prompt, variant: 'mono' \| 'colored', styleSheet? }` | `{ png, meta }` | Style-sheet-driven, direct chroma key, NO BiRefNet |
| `createTexturePipeline` | `{ description, size? }` | `{ png, meta }` | FLUX 2 + Seamless LoRA -> downscale -> quantize -> upscale |
| `createSoldierSetPipeline` | `{ faction, tpose, poses }` | `{ tposePng, posePngs[] }` | T-pose then 9-pose with dual references |
| `createGlbPipeline` | `{ prompt, category, style? }` | `{ glb: Buffer, code, meta }` | Claude codegen -> sandboxed exec -> gltf-transform |
| `createBatchPipeline` | wraps any pipeline + manifest | per-item results | Resumable, skips on `existsSync`, structured retries |

Recipe scripts in `scripts/` are thin wrappers — pick the closest one (e.g. `scripts/gen-ui-icons.ts`, `scripts/gen-nva-soldiers.ts`) before writing a new generator.

---

## 7. Asset pipeline rules (still binding)

Three pipelines, three different models, three different post-processing chains. They are not interchangeable.

### 7a. Sprite pipeline (Gemini/OpenAI -> BiRefNet -> chroma clean)

All 2D sprites must be **32-bit high-res pixel art**. Append this suffix to every sprite prompt:

```
32-bit pixel art sprite, high-res pixel art style, detailed with visible pixels,
bright saturated colors, black pixel outlines, clean hard edges, no anti-aliasing,
no blur, game asset on solid {BG_COLOR} background, entire background is flat solid
{BG_COLOR} with no gradients
```

Prompt structure: `{subject description}, {style suffix with chosen bg color}`.

**Background color decision table** — pick the one that contrasts most with the asset's dominant colors:

| Asset dominant colors | Background | Avoid |
|---|---|---|
| Greens, browns (vegetation, terrain) | Magenta `#FF00FF` | Red, green |
| Skin, khaki, olive (soldiers) | Magenta `#FF00FF` | Red, brown, green |
| Red/orange (fire, explosions) | Blue `#0000FF` | Red, magenta |
| Blue (water, sky) | Magenta `#FF00FF` | Blue |
| White/grey (icons, UI) | Magenta `#FF00FF` or Blue `#0000FF` | White |
| Mixed/unknown | Magenta `#FF00FF` (default) | Red |

**Chroma cleanup functions** — use `image.chromaCleanFor(bg)` for the right one, or pick by hand:

| Function | Use when |
|----------|----------|
| `chromaCleanMagenta()` | Magenta bg, no bright warm content to preserve |
| `chromaCleanBlue()` | Blue bg (command icons, fire/explosion sprites) |
| `chromaCleanMagentaPreserveFlash()` | Magenta bg, firing sprites with yellow/orange muzzle flash |
| `chromaCleanGreen()` (no BiRefNet) | Colored faction emblems on green bg |

**Do NOT** run BiRefNet on colored emblems or solid-white silhouette icons — it eats into the fills. Use direct chroma keying instead. **Do NOT** use `#FF0000` red — bleeds into greens, browns, skin tones. **Do NOT** ask any provider for "transparent background" on the magenta path — produces checkerboard artifacts. **Do NOT** say "painted", "low-poly 3D", "stylized", "PS2-era".

**Faction soldier sprites** use T-pose + pose reference workflow — `image.pipelines.createSoldierSetPipeline` encapsulates this. See [`docs/faction-sprite-workflow.md`](docs/faction-sprite-workflow.md) for the prompt cookbook.

### 7b. UI icon pipeline (style sheet + direct chroma key, no BiRefNet)

UI icons use Gemini with a **style sheet reference image** and a **direct chroma key** — they **do not** go through BiRefNet.

- Pipeline: `image.pipelines.createIconPipeline({ prompt, variant: 'mono' | 'colored' })`
- Mono icons: solid white silhouettes on magenta. Game applies colour via CSS.
- Colored emblems: faction insignia on blue `#0000FF`. Direct blue chroma key.
- Reference flow: style sheet -> seed icons -> (style sheet + seed raw) as 2 refs for remaining icons.

### 7c. Tileable texture pipeline (FLUX 2 + Seamless LoRA, NOT Gemini)

Terrain textures are a different pipeline entirely — **do not use Gemini for textures**.

- Pipeline: `image.pipelines.createTexturePipeline({ description, size })`
- Model: `fal-ai/flux-2/lora` with Seamless Texture LoRA (LoRA scale 1.0, 28 steps, guidance 3.5).
- Internal flow: generate at 256px -> nearest-neighbour downscale to 32px -> palette quantize to 24 colors (no dither) -> replace near-black pixels with neighbour avg -> nearest-neighbour upscale to 512x512.
- Prompt token: start with `smlstxtr` (LoRA trigger) then describe tile.

Do not include yellow/orange in Vietnam jungle biomes. Do not describe focal points or framing — textures must be uniform density.

### Quality bar

Sprites <50KB. Power-of-2 dimensions. Clean transparency. Test by generating a real asset and eyeballing the gallery at `http://localhost:3000/gallery`, not just by running the code.

### 7d. Kiln GLB orientation and attachment rules

Kiln assets use one coordinate contract: `+X` is forward/nose/muzzle, `+Y` is up, `+Z` is the asset's right side. Ground-contact geometry rests at `Y=0`. Vehicles, aircraft, weapons, buildings, and boats must all follow this frame so downstream games can orient them consistently.

Default `cylinderGeo`, `capsuleGeo`, and `coneGeo` are Y-axis primitives. Do not hand-rotate them for common forward/side parts. Use the axis-specific helpers exposed by `kiln.listPrimitives()`:

| Need | Use |
|---|---|
| Forward fuselage, cannon, barrel, missile, muzzle | `capsuleXGeo`, `cylinderXGeo`, `coneXGeo` |
| Side pod, rail, float, crossbar | `capsuleZGeo`, `cylinderZGeo`, `coneZGeo` |
| Strut, brace, cable, scaffold rail, skid support | `beamBetween()` |
| Ladder | `createLadder()` |
| Aircraft/helicopter wings or stub wings | `createWingPair()` |

Attachment is part of correctness, not polish. Wings must use `createWingPair()` with `rootZ` set to the fuselage half-width so roots touch the body. Ladders must be two continuous rails plus repeated rungs, not unrelated boxes. Struts and rails must terminate on the parts they connect. Visually-attached pieces should touch or overlap by about `0.02` units; floating parts are invalid even if named-parts validation passes.

Low triangle count is not the goal by itself. Spend triangles where silhouette matters: aircraft bodies, cockpits, rotors, wheels, organic rocks, ruins, and curved weapons. Validate with `kiln.inspect()`, `kiln.listPrimitives()`, and a visual gallery or audit screenshot. Name/triangle checks alone do not prove an asset looks right.

Do not substitute procedural SVG/HTML/canvas placeholder art for requested 2D generated assets. If the task asks for sprites, NPCs, vegetation, icons, or effects, use the sprite/icon/texture pipelines above and clearly surface provider failures instead of silently replacing the model output with symbolic fallback art.

---

## 8. Providers

| Provider | SDK / Package | Role | Status |
|----------|---------------|------|--------|
| Google Gemini | `@google/genai@^1.48.0` | Default 2D image gen (text-only and bulk) via `gemini-3.1-flash-image-preview` | Live |
| OpenAI | `openai@^6.1.0` | Image gen for ref-heavy + native-transparency cases. Dual-model: `gpt-image-2` (refs > 0) and `gpt-image-1.5` (transparency, fast text-only fallback) | Live |
| FAL AI | `@fal-ai/client@^1.9.5` | BiRefNet bg-removal, FLUX 2 + Seamless LoRA textures, Meshy 3D | Live (NOT `@fal-ai/serverless-client` — that package is deprecated) |
| Anthropic Claude | `@anthropic-ai/sdk@^0.90.0`, `@anthropic-ai/claude-agent-sdk` | Kiln 3D primitive code-gen, image analysis. Default model `claude-opus-4-7`; sonnet for `preferCheap` | Live |

### Auto-routing

`capabilities.pickProviderFor({ kind, refs?, transparency?, preferCheap? })` is the single source of truth. Rules from `packages/core/src/capabilities.ts`:

- `kind: 'image'` + `refs > 0` → **gpt-image-2** (multi-ref fidelity wins decisively for faction/pose workflows)
- `kind: 'image'` + `transparency: true` → **gpt-image-1.5** (only model with native alpha)
- `kind: 'image'` text-only → **gemini flash** (cheapest bulk path)
- `kind: 'texture'` → **fal-ai/flux-2/lora** (only seamless option)
- `kind: 'bg-removal'` → **fal-ai/birefnet**
- `kind: 'code-gen'` → **claude-opus-4-7**, sonnet on `preferCheap`

`image.getDefaultImageGen().generate({ prompt, provider: 'auto' })` consults this router for you.

### Provider gotchas

- **Never send `background: "transparent"` to gpt-image-2** — 400 error. The pipeline generates on solid magenta and strips via chroma cleanup; the dual-model router handles this.
- **`@fal-ai/client@1.9.5` returns `{ data, requestId }`** from `subscribe()` — every call site needs `.data` destructure (`result.data.image?.url`). The legacy `@fal-ai/serverless-client` is deprecated.
- **`mock.module` resolves per-importer in bun:test.** When mocking a module from one package that's consumed by another in a hoisted-deps monorepo, register the mock against the absolute resolved path *as well as* the package specifier. See `packages/server/__tests__/` for examples.

---

## 9. For agent consumers (read this if you are an agent)

Pixel Forge is built **agent-first**. Three concrete consequences:

1. **Errors carry `.fixHint`.** Any throw from `@pixel-forge/core` is a `PixelForgeError` subclass with `.code` (stable), `.message`, `.fixHint` (one-action suggestion), and `.retryable` (boolean). The CLI and MCP adapters surface these verbatim. When you catch one, read `fixHint` and use it as your rationale for the next action.
2. **Providers carry `.capabilities`.** Don't guess which model handles refs or transparency — call `capabilities.pickProviderFor({ kind, refs, transparency })` and route accordingly. The matrix is in `packages/core/src/capabilities.ts`.
3. **Kiln primitives are introspectable.** `kiln.listPrimitives()` returns the full catalog with args + return type + example, including axis-specific geometry and attachment helpers. `kiln.inspect(code)` returns tri count, bounds, named parts, and animation tracks. Use these to debug LLM-generated GLB code, then visually audit the result.

---

## 10. Code style

- **TypeScript strict mode.** All packages compile with `strict: true`. Do not disable.
- **No emojis.** Anywhere — code, comments, commit messages, docs, UI strings.
- **Hyphens over em-dashes.** `pre-processing`, not `pre—processing`.
- **Comments only when WHY is non-obvious.** Skip JSDoc on self-explanatory functions.
- **Prefer editing existing files.** Never proactively create `*.md` docs.
- **ESLint + TS compiler are the source of truth** for formatting and naming. Run `bun run lint` + `bun run typecheck` before committing.
- **Zod for all API boundaries.** Schemas live in `packages/core/src/schemas/` and are shared across the editor server, the CLI, and the MCP server.
- **Structured errors, not booleans.** Throw `PixelForgeError` subclasses with a code and a fix hint.

Prohibited patterns:

- Do not use `pip` — Python tooling in this repo is `uv`.
- Do not create `*.md` docs or `README`s proactively.
- Do not commit `tmp/`, `tmp-*`, `*.env*` files.
- Do not add screenshots or CI badges to `AGENTS.md` — those belong in `README.md`.
- Do not import from `@pixel-forge/core` deep paths from adapters — use the namespace surface.

---

## 11. Testing

Run tests **per-package** — the root `bun run test` filter does not work for `packages/client`.

```bash
cd packages/client && bunx vitest run    # Vitest 4 + happy-dom/jsdom + MSW
cd packages/server && bun test           # Bun's native test runner
cd packages/core   && bun test
cd packages/cli    && bun test
cd packages/mcp    && bun test
bun run test:e2e                         # Playwright from repo root
```

Approximate counts:

| Suite | Tests | Files | Notes |
|-------|------:|------:|-------|
| client (vitest) | ~1938 pass, 1 skip | 86 | 1 skip: executor timeout — bun/vitest fake-timers |
| server (bun test) | ~114 pass | 7 | |
| core (bun test) | ~157 pass | many | Kiln render + image pipelines + provider mocks |
| cli (bun test) | ~16 pass | — | Smoke tests; live tests gated on `CLI_LIVE=1` |
| mcp (bun test) | ~7 pass | — | `InMemoryTransport.createLinkedPair()` round-trip |
| e2e (playwright) | small | — | smoke + mobile viewport + workflow |

When adding tests, prefer filling the gaps in `core/kiln/runtime/` and the editor handler modules. New features must ship with tests.

---

## 12. Security and secrets

- **Never commit `.env` or `.env.local` files.** They are gitignored; keep it that way.
- Runtime loads keys via Bun's auto-`.env` loader from `packages/server/.env.local` and the cwd of CLI/MCP invocations.
- Template: [`.env.example`](.env.example) at repo root. Copy and fill, do not commit.
- On the maintainer's dev workstation, secrets live at `~/.config/mk-agent/env` (mode 600).

Expected keys:

| Variable | Required | Purpose |
|----------|:--------:|---------|
| `GEMINI_API_KEY` | yes | Default 2D image gen |
| `FAL_KEY` | yes | Background removal + texture gen + Meshy |
| `OPENAI_API_KEY` | optional | gpt-image-2 (refs) + gpt-image-1.5 (transparency). Auto-router falls back to gemini if absent. |
| `ANTHROPIC_API_KEY` | optional | Kiln 3D primitive code-gen + refactor (falls back gracefully if missing) |
| `PORT` | optional | Server port, default `3000` |
| `WAR_ASSETS_DIR` | optional | Override output directory |
| `EXPORT_BASE_DIR` | optional | Override export save location |

Rotate keys that leak. If an agent notices a key in logs, a commit diff, or a shared artifact: stop, flag it, do not propagate.

---

## 13. Do not touch

- **`war-assets/`** — generated output, already shipped. Do not regenerate or mutate without explicit task instruction.
- **`tmp/`, `tmp-*` files at repo root** — scratch space. Gitignored. Do not read as source of truth.
- **`.env`, `.env.local`, any `*.env*`** — never read, never write, never commit.
- **`node_modules/`, `dist/`, `.vite/`, `coverage/`** — build output, never edit.
- **`scripts/_archive/`** — kept for provenance, not for execution. Don't resurrect without an audit pass.
- **`packages/**/src/**` during the docs cycle** — code is currently frozen for W6. Docs and skills only.

---

## 14. For Claude Code users

Claude Code has additional project-specific guidance in [`CLAUDE.md`](CLAUDE.md) — hooks, memory integration, and operational lessons learned during the cycle. The `.claude/skills/pixel-forge/` skill auto-triggers on asset-generation keywords and routes to the workflows in this file. Nothing in `CLAUDE.md` contradicts this document; it layers Claude-specific extras on top.

---

Last updated: 2026-04-23
