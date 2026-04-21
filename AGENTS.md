# AGENTS.md

Universal brief for AI coding agents working in the Pixel Forge repo. Follows the [agents.md](https://agents.md/) convention. If you are Codex, Cursor, Aider, Devin, Claude Code, or any other agent: read this file first.

Human-facing docs (features, screenshots, install) live in [`README.md`](README.md). Claude-specific hooks, skills, and memory integration live in [`CLAUDE.md`](CLAUDE.md) — this file is the cross-agent common denominator and does not contradict either.

---

## 1. Project overview

Pixel Forge is a node-based AI game asset generator. It ships a React Flow visual editor plus CLI scripts that drive AI pipelines — Gemini for 2D sprites, FAL for background removal and tileable textures, Claude for code-generated 3D primitives — and produces game-ready PNGs and GLB models. Current output lives in [`war-assets/`](war-assets/) and was shipped to the game [Terror in the Jungle](https://github.com/matthew-kissinger).

The repo is a Bun workspace monorepo mid-refactor: a new `@pixel-forge/core` library is being extracted from `packages/{client,server,shared}` per [`docs/next-cycle.md`](docs/next-cycle.md). Until that lands, logic lives in the existing packages.

---

## 2. Commands

All commands run from the repo root unless noted. Bun 1.3+ is required.

```bash
# Install
bun install

# Dev
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

### Tests — run per-package, NOT from root

`bun run test` at the root is broken for the client package (bun's vitest driver is incompatible with the test setup). Always `cd` into the package:

```bash
cd packages/client && bunx vitest run      # ~1907 pass, 1 skip, 86 files
cd packages/server && bun test             # ~118 pass, 7 files
```

No coverage CI gate today. `packages/client` has a `coverage` script (`vitest run --coverage`) if you need it.

Bundle size check (used by CI):

```bash
bun run check:bundle-size
```

---

## 3. Repository structure

```
pixel-forge/
  packages/
    client/     # React 19 + React Flow 12 + Zustand + Tailwind 4. The node editor UI.
    server/     # Hono + Bun API. Thin wrappers over Gemini/FAL/Claude with Zod validation.
    shared/     # Types, presets, prompt builders, API contracts. Consumed by client + server.
    core/       # Scaffold only - @pixel-forge/core is being extracted here (see docs/next-cycle.md). Do not assume it exists.
  scripts/      # CLI generation scripts (TypeScript via bun, some Python via uv). Batch manifests in scripts/batches/.
  war-assets/   # Generated output. Committed. Do not regenerate or mutate without explicit ask.
  docs/         # Prompt templates, workflows, asset specs, next-cycle refactor plan.
  e2e/          # Playwright tests.
  .claude/      # Claude Code skills (kiln-glb, kiln-tsl, pixel-art-professional, etc.). Readable by any agent but Claude-optimised.
```

Workspace packages: `client`, `server`, `@pixel-forge/shared`. Cross-package imports use `workspace:*` resolution.

---

## 4. Code style

- **TypeScript strict mode.** All packages compile with `strict: true`. Do not disable.
- **No emojis.** Anywhere — code, comments, commit messages, docs, UI strings.
- **Hyphens over em-dashes.** `pre-processing`, not `pre—processing`.
- **Comments only when WHY is non-obvious.** Do not narrate what the code does. Skip JSDoc on self-explanatory functions. If a comment is just restating the code, delete it.
- **Prefer editing existing files.** Do not create new files unless the task requires it. Never proactively create `*.md` docs.
- **ESLint + TS compiler are the source of truth** for formatting and naming. Run `bun run lint` + `bun run typecheck` before committing.
- **Zod for all API boundaries.** Server routes validate input with `@hono/zod-validator`; shared schemas live in `packages/shared` (and will move to `packages/core/src/schemas` during the refactor).
- **Structured errors, not booleans.** Return rich failure objects with a code and a fix hint. The core refactor is formalising this via `errors.ts` (see `docs/next-cycle.md` W2.4).

Prohibited patterns (from `CLAUDE.md`, applies to all agents):

- Do not use `pip` — Python tooling in this repo is `uv`.
- Do not create `*.md` docs or `README`s proactively.
- Do not commit `tmp/`, `tmp-*`, `*.env*` files.
- Do not add screenshots or CI badges to `AGENTS.md` — those belong in `README.md`.

---

## 5. Testing

Run tests **per-package** — the root `bun run test` filter does not work for `packages/client`.

```bash
cd packages/client && bunx vitest run   # Vitest 4 + happy-dom/jsdom + MSW
cd packages/server && bun test          # Bun's native test runner
bun run test:e2e                        # Playwright from repo root
```

Approximate counts at time of writing:

| Suite | Tests | Files | Notes |
|-------|------:|------:|-------|
| client (vitest) | ~1907 pass, 1 skip | 86 | 1 skip is executor timeout — bun/vitest fake-timers incompatibility |
| server (bun test) | ~118 pass | 7 | |
| e2e (playwright) | small | — | smoke + mobile viewport + workflow |

Coverage gaps worth knowing (from `CLAUDE.md#Current Gaps`):

- `packages/client/src/lib/kiln/runtime.ts` — 783 lines, **zero tests**, WebGPU/Three.js renderer
- Untested handlers: `analysis.ts` (216), `batch.ts` (112), `imageGen.ts` (115), `model3d.ts` (105) — other handlers (input/processing/canvas/output) are tested
- Untested node sub-components: `kiln/*` (347), `quality/*` (210), `export-sheet/*` (85)
- Untested shared: `presets.ts`, `api-types.ts`, `logger.ts` (314 total)
- No integration tests against real Gemini/FAL/Claude — all mocked via MSW

When adding tests, prefer filling the gaps above. New features must ship with tests.

---

## 6. Asset pipelines (critical)

Three pipelines produce different asset types. They are not interchangeable — each uses a different model and a different post-processing chain.

### 6a. Sprite pipeline (Gemini -> BiRefNet -> chroma clean)

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

**Processing steps:**

1. Gemini 3.1 Flash Image generates on the chosen solid-color background.
2. FAL BiRefNet removes the background.
3. Chroma cleanup pass catches residual semi-transparent edge pixels (BiRefNet misses interior gaps).

**Chroma cleanup functions** — pick by background and content:

| Function | Use when | Reference script |
|----------|----------|------------------|
| `chromaCleanMagenta()` | Magenta bg, no bright warm content to preserve | `scripts/gen-vegetation-redo.ts` |
| `chromaCleanBlue()` | Blue bg (command icons, fire/explosion sprites) | `scripts/gen-command-icons-v2.ts` |
| `chromaCleanMagentaPreserveFlash()` | Magenta bg, firing sprites with yellow/orange muzzle flash (skips `R>180, G>120, B<80` pixels before magenta clean) | `scripts/gen-nva-frontfire-fix.ts` |
| `chromaCleanGreen()` (direct, no BiRefNet) | Colored faction emblems on green bg (`G>180, R<100, B<100 -> transparent`) | `scripts/gen-faction-icons-fix.ts` |

**Do NOT** run BiRefNet on colored emblems or solid-white silhouette icons — it eats into coloured/white fills. Use direct chroma keying instead.

**Do NOT** use `#FF0000` red — bleeds into greens, browns, skin tones. **Do NOT** ask Gemini for "transparent background" — produces checkerboard artifacts. **Do NOT** say "painted", "low-poly 3D", "stylized", "PS2-era" — all produce wrong aesthetic.

**Faction soldier sprites** use T-pose + pose reference workflow — see [`docs/faction-sprite-workflow.md`](docs/faction-sprite-workflow.md) and the reference script `scripts/gen-nva-soldiers.ts`.

### 6b. UI icon pipeline (style sheet + direct chroma key, no BiRefNet)

UI icons use Gemini with a **style sheet reference image** and a **direct chroma key** — they **do not** go through BiRefNet.

- Script: `scripts/gen-ui-icons.ts` — 50 icons across 10 categories. Commands: `sheet`, `seed`, `batch`, `run`, `redo`, `list`.
- Style sheet = single abstract heraldic shield on magenta; fed as a reference image to every icon gen.
- Mono icons (46): solid white silhouettes on magenta, no outlines, no internal detail. Game applies colour via CSS. Chroma key magenta directly on the raw output.
- Colored emblems (4): faction insignia on blue `#0000FF` (blue does not clash with faction colours). Direct blue chroma key, no BiRefNet.
- Reference flow: style sheet -> ref for seed icons -> (style sheet + seed raw) as 2 refs for remaining icons.

### 6c. Tileable texture pipeline (FLUX 2 + Seamless LoRA, NOT Gemini)

Terrain textures are a different pipeline entirely — **do not use Gemini for textures**.

- Model: `fal-ai/flux-2/lora` with Seamless Texture LoRA (`https://huggingface.co/gokaygokay/Flux-Seamless-Texture-LoRA/resolve/main/seamless_texture.safetensors`), LoRA scale 1.0, 28 steps, guidance 3.5.
- Generate at 256px -> nearest-neighbour downscale to 32px -> palette quantize to 24 colors (no dither) -> replace near-black pixels (RGB sum < 40) with average of non-black neighbours -> nearest-neighbour upscale to 512x512.
- Output: 512x512 PNG, ~8KB, 16-24 unique colors. Reference: `war-assets/textures/forestfloor.png`.
- Post-processing script: `scripts/clean-terrain-blacks.ts`.
- Prompt token: start with `smlstxtr` (LoRA trigger) then describe tile.

Do not include yellow/orange in Vietnam jungle biomes. Do not describe focal points or framing — textures must be uniform density.

### Quality bar

Sprites <50KB. Power-of-2 dimensions. Clean transparency. Test by generating a real asset and eyeballing the gallery at `http://localhost:3000/gallery`, not just by running the code.

---

## 7. Providers

| Provider | SDK / Package | Role | Status |
|----------|---------------|------|--------|
| Google Gemini | `@google/genai` | Default 2D image gen (sprites, icons) via `gemini-3.1-flash-image` | Live |
| FAL AI | `@fal-ai/serverless-client` | Background removal (BiRefNet), tileable textures (FLUX 2 + Seamless LoRA), Meshy 3D | Live |
| Anthropic Claude | `@anthropic-ai/sdk`, `@anthropic-ai/claude-agent-sdk` | Kiln 3D primitive code gen, image analysis | Live |
| OpenAI | — | Planned. `gpt-image-1.5` for high-ref-count edits and real-transparency sprites. Lands in W3 of `docs/next-cycle.md` | Planned |

Provider selection and capability routing are consolidating into `packages/core` — see `docs/next-cycle.md#W3a`.

---

## 8. Security and secrets

- **Never commit `.env` or `.env.local` files.** They are gitignored; keep it that way.
- Runtime loads keys from `packages/server/.env.local` (Bun auto-loads `.env` files — no `dotenv` dependency).
- Template: [`.env.example`](.env.example) at repo root. Copy and fill, do not commit.
- On the maintainer's dev workstation, secrets live at `~/.config/mk-agent/env` (mode 600) and are sourced by shell init. Agents running in that environment can read them from `process.env` without additional setup.

Expected keys:

| Variable | Required | Purpose |
|----------|:--------:|---------|
| `GEMINI_API_KEY` | yes | Sprite + icon generation |
| `FAL_KEY` | yes | Background removal + texture gen + Meshy |
| `ANTHROPIC_API_KEY` | optional | Kiln 3D primitive code gen (falls back gracefully if missing) |
| `OPENAI_API_KEY` | planned | Not wired yet — lands with the OpenAI provider in W3 |
| `PORT` | optional | Server port, default `3000` |
| `WAR_ASSETS_DIR` | optional | Override output directory |
| `EXPORT_BASE_DIR` | optional | Override export save location |

Rotate keys that leak. If an agent notices a key in logs, a commit diff, or a shared artifact: stop, flag it, do not propagate.

---

## 9. Do not touch

- **`war-assets/`** — generated output, already shipped to Terror in the Jungle. Do not regenerate, overwrite, or mutate without an explicit task saying so. Read-only from the agent's perspective.
- **`tmp/`, `tmp-*` files at repo root** — scratch space for humans. Gitignored. Do not read as source of truth; do not commit anything inside.
- **`.env`, `.env.local`, any `*.env*` file** — never read, never write, never commit.
- **`node_modules/`, `dist/`, `.vite/`, `coverage/`** — build output, never edit.
- **`.claude/` skill directories** — safe to read, but treat as Claude-optimized; do not cargo-cult skill frontmatter into other agents' configs.
- **Stale `mycel/task-*` remote branches** — there are ~38 of these; do not push to them, do not rebase onto them. Deletion is a planned housekeeping task (W0.1).

---

## 10. For Claude Code users

Claude Code has additional project-specific guidance — hooks, skills, memory integration, and the full un-abridged pipeline lessons — in [`CLAUDE.md`](CLAUDE.md). Read that on top of this file. Nothing in `CLAUDE.md` contradicts this document; it layers Claude-specific extras on top.

---

Last updated: 2026-04-21
