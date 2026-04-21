# Pixel Forge — Next Cycle Plan

**Status:** Planning → Execution
**Started:** 2026-04-21
**Branch:** `refactor/core-spike` (spike), then merges to `main` after each wave passes
**Mode:** DAG execution with wave-based parallelism

---

## 0. North Star

Build `@pixel-forge/core` — an **agent-first** library that collapses the current client/server/script duplication into one typed, introspectable substrate. Expose it via three thin adapters: existing browser editor (humans), citty CLI (agents + power users), MCP stdio server (Claude Code + other agents).

### Design principles (binding)

1. **Agent-first API.** Typed, self-describing, introspectable. Structured errors with fix hints. Rich return values, not booleans.
2. **Editor behavior frozen, substrate swapped.** React Flow UI keeps working identically; becomes a consumer of core.
3. **One core package.** `@pixel-forge/core`. Simpler versioning.
4. **Spike before commit.** Validate Option B on 3 real GLBs before touching editor.
5. **Distill scripts, don't port.** Canonical pipelines, not 48 CLI commands.
6. **No new features until substrate is clean.** OpenAI, MCP, CLI ride on top of core.

### Out of scope (say no now)

- TSL/WebGPU effect headless path (editor-only stays editor-only)
- Remote MCP / HTTP transport / auth (defer to web-app lift)
- tRPC (not adopting)
- `@pixel-forge/core` on npm registry (keep local)
- 3D preview in CLI/MCP (trigger-and-download only)
- Rewriting React Flow editor (substrate swap only)

---

## 1. Target Architecture

```
packages/
  core/                            # NEW — agent-facing library
    src/
      kiln/
        primitives.ts              # single source of truth (was duplicated 2x)
        prompt.ts                  # from shared/kiln-prompts.ts
        validation.ts              # from shared/kiln-validation.ts (hardened)
        render.ts                  # headless gltf-transform bridge
        generate.ts                # prompt -> code via Claude
        inspect.ts                 # tri count, bounds, named parts, animations
        refactor.ts                # iterate on existing code
        list-primitives.ts         # self-describing primitive catalog
      image/
        facade.ts                  # imageGen.generate with auto-routing
        chroma.ts                  # magenta/blue/green + preserveFlash
        pipelines/
          sprite.ts                # generic sprite + chroma cleanup
          soldier-set.ts           # T-pose + 9-pose workflow
          icon.ts                  # mono + colored variants
          texture.ts               # FLUX 2 + seamless LoRA + quantize
          batch.ts                 # resumable batch wrapper
      providers/
        gemini.ts                  # ImageProvider
        fal.ts                     # ImageProvider + TextureProvider
        openai.ts                  # NEW — ImageProvider
        claude.ts                  # CodeGenProvider
      schemas/                     # zod — shared across adapters
      capabilities.ts              # provider capability matrix
      errors.ts                    # structured, agent-readable
      index.ts                     # public entry points

  server/                          # EXISTING — Hono adapter over core (trimmed)
  client/                          # EXISTING — React Flow editor (wired to core)
  cli/                             # NEW — citty adapter over core
  mcp/                             # NEW — @modelcontextprotocol/sdk stdio adapter
  shared/                          # SHRUNK — only cross-adapter shared types
```

---

## 2. DAG — Wave Map

```
W0 (instant, parallel x4)
  ├── 0.1 Housekeeping: gitignore tmp/, tmp-*, delete stale mycel branches
  ├── 0.2 Core package scaffold (tsconfig, package.json, src/)
  ├── 0.3 Script audit: build _archive/ candidate list + ARCHIVE.md
  └── 0.4 AGENTS.md draft (project overview + commands)
              │
              ▼
W1 (spike — GATE)
  └── 1.1 Kiln headless validation spike [BLOCKS W2+]
        ├── 1.2 Skill polish (.claude/skills/*) [parallel, no dep]
        └── 1.3 Handlers canvas split planning [parallel, no dep]
              │
              ▼ (W1.1 passes)
W2 (core kiln + interfaces — fan-out hub)
  ├── 2.1 Full kiln extraction to core
  ├── 2.2 runtime.ts 8-way split
  ├── 2.3 Interface design: ImageProvider, CodeGenProvider, Pipeline [UNBLOCKS W3+W4 parallel]
  ├── 2.4 errors.ts taxonomy [UNBLOCKS everything downstream]
  └── 2.5 capabilities.ts
              │
              ▼
W3a (providers) ═══════════════════════╗
  ├── 3a.1 Move gemini to core/providers
  ├── 3a.2 Move fal to core/providers           ║ PARALLEL with W3b, W4
  ├── 3a.3 Move claude to core/providers        ║
  ├── 3a.4 Add openai.ts                        ║
  ├── 3a.5 Image facade + auto-routing          ║
  └── 3a.6 Capability-based routing tests       ║
                                                ║
W3b (kiln introspection) ══════════════╣
  ├── 3b.1 kiln.inspect()                       ║ PARALLEL with W3a, W4
  ├── 3b.2 kiln.listPrimitives()                ║
  ├── 3b.3 Hardened validation (AST over regex) ║
  └── 3b.4 kiln.refactor() over core            ║
                                                ║
W4 (pipelines) ════════════════════════╝
  ├── 4.1 core/pipelines/sprite.ts
  ├── 4.2 core/pipelines/icon.ts
  ├── 4.3 core/pipelines/texture.ts
  ├── 4.4 core/pipelines/soldier-set.ts
  ├── 4.5 core/pipelines/glb.ts
  ├── 4.6 core/pipelines/batch.ts (resumable)
  ├── 4.7 Archive 24 old scripts
  └── 4.8 Rewrite recipe scripts on pipelines
              │
              ▼
W5 (adapters — parallel x2)
  ├── 5.1 CLI package (citty + zod schemas from core)
  └── 5.2 MCP package (stdio + same zod schemas)
              │
              ▼
W6 (docs + skills)
  ├── 6.1 AGENTS.md final (CLI/MCP quickstart)
  ├── 6.2 README CLI/MCP sections
  ├── 6.3 New .claude/skills/pixel-forge skill
  └── 6.4 CLAUDE.md slimmed to Claude-specific

W7 (polish — can slot anywhere after W2) — PARALLEL ALWAYS
  ├── 7.1 Split handlers/canvas.ts (594 lines) by operation
  ├── 7.2 Unblock skipped executor timeout test
  └── 7.3 Test coverage: core/kiln/* to 60%+
```

### Critical path
**W0.2 → W1.1 → W2 (hub) → W4 → W5 → W6**
Everything else parallelizes off the hub.

### Biggest fan-out
**W2** — once interfaces ship (W2.3), W3a, W3b, W4, W7 all go parallel.

---

## 3. Task Cards

> Each task: **goal, deps, deliverable, acceptance, est**. Check `[x]` when done.
> "est" = optimistic solo-dev hours; parallel execution compresses calendar time.

### Wave 0 — Instant start ✅ COMPLETE

- [x] **0.1 Housekeeping** · deps: none · est: 20min · **done**
  - `.gitignore` updated — `tmp/` and `tmp-*` now ignored
  - 7 scratch files moved from repo root into `tmp/` (preserved, not deleted)
  - Mycel branch cleanup: **0 stale `mycel/task-*` remote branches found** — CLAUDE.md's "38 stale" note was outdated; already cleaned up.
  - Working tree clean (only intentional W0 deliverables as untracked/modified)

- [x] **0.2 Core package scaffold** · deps: none · est: 30min · **done**
  - `packages/core/package.json` created (`@pixel-forge/core`, Bun-native, `type: module`)
  - `packages/core/tsconfig.json` — standalone (mirrors server style; root/shared have no tsconfig to extend)
  - `packages/core/eslint.config.js` added so root `bun run lint` stays green
  - `src/{kiln,image,image/pipelines,providers,schemas}/index.ts` stubs + `capabilities.ts` + `errors.ts`
  - `bun install` ran clean — workspaces resolved
  - `bun run typecheck` + `bun run lint` from root: **green**

- [x] **0.3 Script audit → archive manifest** · deps: none · est: 1h · **done**
  - [docs/script-audit.md](script-audit.md) — 54 scripts categorized (42 TS + 12 Python)
  - [scripts/_archive/ARCHIVE.md](../scripts/_archive/ARCHIVE.md) — 20 archival candidates with provenance
  - Breakdown: 33 live / 16 one-shot fixes / 4 superseded / 5 utilities / 5 previously-untracked
  - Shared helper inventory: `apiPost` (26×), `chromaCleanMagenta` (16×), `chromaCleanBlue` (9×), `loadImageAsBase64` (9×), `chromaCleanGreen` (4×), `existsSync` resume (10×)

- [x] **0.4 AGENTS.md draft** · deps: none · est: 45min · **done**
  - [AGENTS.md](../AGENTS.md) at root, 258 lines, agents.md convention
  - All 10 sections present: Overview, Commands, Structure, Code style, Testing, Asset pipelines (sprite/icon/texture), Providers, Security, Do-not-touch, Claude Code pointer
  - **Caveat**: overwrote pre-existing `AGENTS.md` (was an API endpoint reference). Content preserved at [docs/api-reference.md](api-reference.md) — 308 lines, nothing lost.

### Wave 1 — Spike (GATE)

- [ ] **1.1 Kiln headless spike** · deps: 0.2 · est: 8-12h · **BLOCKER FOR W2+**
  - Branch: `refactor/core-spike`
  - Copy primitives from `packages/client/src/lib/kiln/primitives.ts` + `scripts/export-glb.ts` → `packages/core/src/kiln/primitives.ts` (dedupe to one)
  - Move `packages/shared/kiln-prompts.ts` + `kiln-validation.ts` → `packages/core/src/kiln/`
  - Port `scripts/export-glb.ts` headless bridge → `packages/core/src/kiln/render.ts`
  - Wrap Claude call → `packages/core/src/kiln/generate.ts`
  - Public entry: `kiln.generate(prompt, opts) → { code, glb: Buffer, meta, warnings }`
  - **Validation test**: regenerate 3 GLBs from `war-assets/`:
    - trivial: `war-assets/weapons/m60.glb` (or similar small weapon)
    - medium: `war-assets/vehicles/<something mid-complexity>`
    - compound: `war-assets/structures/guard-tower.glb` (has guy wires / compound rotations)
  - Diff tri-count (±5%), named parts (exact), animation tracks (exact)
  - Editor MUST still build + tests still pass (additive only)
  - Accept: 3/3 GLB regeneration tests green, `bun run test` green across packages, `bun run build` green

- [x] **1.2 Skill polish** · deps: none · est: 1h · **done**
  - 6/6 skills edited (nano-banana-pro, pixel-art-professional, canvas-design, frontend-design, kiln-glb, kiln-tsl)
  - Every `description` now opens with "Use this skill when..." + explicit trigger keywords
  - `allowed-tools: Read, Write, Bash, Glob, Grep` added to 5 skills (kiln-tsl omits Bash — editor-only)
  - Schema fix: `pixel-art-professional` name lowercased
  - Report: [docs/skill-polish-report.md](skill-polish-report.md)
  - Flagged for review: non-standard `license` field on 2 skills; blanket Bash grant on nano-banana-pro

- [x] **1.3 Canvas.ts split planning** · deps: none · est: 30min · **done**
  - Plan at [docs/canvas-split.md](canvas-split.md)
  - **Finding**: file contains 5 ops (Tile, ColorPalette, Filter, Combine, Rotate), NOT 7 as CLAUDE.md suggested — resize/crop/pixelate live in `processing.ts`. W7.1 scope reduced.
  - 578 of 594 LoC accounted for; 3 shared utilities identified for extraction
  - Risk: Low (Combine touches edges graph, mitigated by util extraction)
  - Execution estimate confirmed at 3h

### Wave 2 — Core hub (fan-out)

- [ ] **2.1 Full kiln extraction** · deps: 1.1 passes · est: 4-6h
  - Client `runtime.ts` imports primitives from core (no more local copies)
  - `scripts/export-glb.ts` reduces to one-liner calling core
  - Delete dupes
  - Accept: zero `three` imports in `packages/server`, zero primitive dupes

- [ ] **2.2 runtime.ts 8-way split** · deps: 2.1 · est: 3-4h
  - Extract per audit: config/init, renderer lifecycle, sandbox, TSL, camera, export, animation, cleanup
  - Keep in `packages/client/src/lib/kiln/runtime/` subdir
  - Accept: no file >200 lines in runtime/, existing editor tests pass

- [ ] **2.3 Provider/Pipeline interfaces** · deps: 2.1 · est: 2h · **FAN-OUT ENABLER**
  - `core/src/schemas/` — zod schemas for every public op
  - `ImageProvider` interface (generate, editWithRefs, capabilities)
  - `CodeGenProvider` interface (generate, refactor)
  - `TextureProvider` interface (flux + LoRA flow)
  - `Pipeline<Input, Output>` generic interface
  - Accept: interfaces compiled, no implementations yet

- [ ] **2.4 errors.ts taxonomy** · deps: 2.1 · est: 1.5h
  - Structured errors: `ProviderRateLimited`, `ProviderCapabilityMismatch`, `ValidationFailed`, `KilnRenderFailed`, etc.
  - Every error has `.code`, `.message`, `.fix_hint`, `.retryable`
  - Accept: error taxonomy exported, used in spike paths

- [ ] **2.5 capabilities.ts** · deps: 2.3 · est: 1h
  - `capabilities(provider) → { supportsRefs, maxRefs, supportsTransparency, pricePerImage, rateLimit, strengths[] }`
  - Static data for now, queryable
  - Accept: returns capability object for each provider

### Wave 3a — Providers (parallel with W3b, W4)

> **Model audit (April 2026)** — see [docs/model-audit-2026-04.md](model-audit-2026-04.md) for full context.
> Scope of each provider task was expanded based on findings below.

- [ ] **3a.1 Gemini → core** · deps: 2.3 · est: 2h · parallel
  - Bump `@google/genai` from `^1.38.0` → `^1.48.0`
  - Model `gemini-3.1-flash-image-preview` still current; keep

- [ ] **3a.2 FAL → core** · deps: 2.3 · est: 3h · parallel · **MAJOR UPGRADE**
  - **`@fal-ai/serverless-client@^0.15.0` is deprecated** — migrate to `@fal-ai/client@1.9.1`
  - Breaking change: `fal.subscribe()` now returns `{ data, requestId }` — every call site needs `.data` destructure: `result.model_url` → `result.data.model_url`, `result.image?.url` → `result.data.image?.url`
  - Audit all scripts that use FAL directly (textures, BiRefNet) for the same breaking change

- [ ] **3a.3 Claude → core** · deps: 2.3 · est: 2h · parallel
  - Bump `@anthropic-ai/sdk` from `^0.71.2` → `^0.90.0`
  - Model bumps in `services/claude.ts` (2 sites currently on `claude-opus-4-6`) → `claude-opus-4-7`
  - Also update `packages/server/scripts/test-claude.ts` (currently `claude-sonnet-4-5-20250929` → `claude-sonnet-4-6`)

- [ ] **3a.4 OpenAI provider** · deps: 2.3, 2.5 · est: 3h
  - Use `openai@^6.1.0` (context7 confirmed)
  - Model: **`gpt-image-1.5`** at `quality: 'high'` (~$0.08/image, price-parity with Gemini)
  - **Do NOT use `gpt-image-2`** — the newer model lacks `background: "transparent"` which breaks our chroma-keyed sprite pipeline
  - Implement `generate` + `editWithRefs` (up to 16 reference images)
  - Use `base64` response mode (not URL)
  - `OPENAI_API_KEY` already wired in `packages/server/.env.local` + global `~/.config/mk-agent/env`

- [ ] **3a.5 Image facade + auto-routing** · deps: 3a.1-4, 2.5 · est: 2h
  - `imageGen.generate({ prompt, provider: 'auto'|'gemini'|'openai'|'fal', refs?, background? })`
  - Auto route: refs > 4 → openai; real transparency → openai; else gemini

- [ ] **3a.6 Capability routing tests** · deps: 3a.5 · est: 1.5h
  - 5 sprites via openai, chroma-clean, visual compare
  - 1 historically-hard sprite via openai succeeds
  - Auto-routing correctly picks openai when refs: 16

### ⚠️ Blocker flag — ANTHROPIC_API_KEY missing

`packages/server/.env.local` is missing `ANTHROPIC_API_KEY`. This affects:
- W1.1 spike falls back to render-only validation (no live LLM calls)
- Any Kiln generation (both editor and headless) fails locally until resolved
- W3a.3 Claude provider moves can't be verified without it

**User action needed**: provide `ANTHROPIC_API_KEY` or confirm it lives in a different shell env that the server picks up.

### Wave 3b — Kiln introspection (parallel)

- [ ] **3b.1 kiln.inspect(code)** · deps: 2.1 · est: 2h · parallel
  - Returns `{ triangles, bounds, namedParts[], animationTracks[], primitives[] }`
  - Agents call this after render to debug
- [ ] **3b.2 kiln.listPrimitives()** · deps: 2.1 · est: 1.5h · parallel
  - Self-describing catalog: `{ [name]: { args, returns, example } }`
  - Sourced from JSDoc on primitive definitions (single source of truth)
- [ ] **3b.3 Hardened validation** · deps: 2.1, 2.4 · est: 3h
  - Replace regex-based with TypeScript compiler API or esprima
  - Catch: joint-name mismatches in animations, tri-count hard cap, recursive structures
  - Errors emit via errors.ts with fix hints
- [ ] **3b.4 kiln.refactor(instruction, code)** · deps: 3a.3 · est: 2h
  - Uses Claude provider, structured output
  - Returns new code + diff summary

### Wave 4 — Pipelines (parallel with W3)

- [ ] **4.1 sprite.ts** · deps: 2.3, 3a.1 · est: 2.5h · parallel
- [ ] **4.2 icon.ts** · deps: 2.3, 3a.1 · est: 2.5h · parallel
- [ ] **4.3 texture.ts** · deps: 2.3, 3a.2 · est: 2.5h · parallel
- [ ] **4.4 soldier-set.ts** · deps: 2.3, 3a.1 · est: 3h · parallel (T-pose + 9-pose)
- [ ] **4.5 glb.ts** · deps: 2.3, 3a.3 · est: 2h · parallel (wraps kiln.generate)
- [ ] **4.6 batch.ts** · deps: 4.1-4.5 · est: 2h (resumable wrapper for any pipeline)
- [ ] **4.7 Archive 24 scripts** · deps: 0.3 list · est: 1h
  - Move to `scripts/_archive/`
  - ARCHIVE.md documents each
- [ ] **4.8 Rewrite recipe scripts** · deps: 4.1-4.6 · est: 3h
  - ~10-15 thin wrappers calling core pipelines
  - Drop-in replacements for the 24 live scripts

### Wave 5 — Adapters (parallel)

- [ ] **5.1 CLI package (citty)** · deps: W4 complete · est: 4h
  - `packages/cli/` scaffold
  - Commands: `gen sprite|icon|texture|glb|soldier-set`, `inspect glb`, `providers list`
  - `--json` flag for machine-readable stdout
  - `--help` auto-generated from zod
  - `bun link` installable

- [ ] **5.2 MCP package (stdio)** · deps: W4 complete · est: 4h · parallel with 5.1
  - `packages/mcp/` scaffold with `@modelcontextprotocol/sdk`
  - Tools: `pixelforge_gen_{sprite,icon,texture,glb}`, `pixelforge_kiln_{inspect,refactor,list_primitives}`, `pixelforge_providers_capabilities`
  - Rich structured returns (not bare base64)
  - Installable via `claude mcp add pixelforge --stdio bun run packages/mcp/src/index.ts`

### Wave 6 — Docs finale

- [ ] **6.1 AGENTS.md final** · deps: W5 · est: 1h
- [ ] **6.2 README CLI/MCP sections** · deps: W5 · est: 1h
- [ ] **6.3 pixel-forge skill** · deps: W5 · est: 30min
  - `.claude/skills/pixel-forge/SKILL.md`
- [ ] **6.4 CLAUDE.md slim** · deps: 6.1 · est: 30min

### Wave 7 — Polish (slot anywhere after W2)

- [ ] **7.1 Split canvas.ts by operation** · deps: 1.3 · est: 3h · parallel
- [ ] **7.2 Fix skipped executor test** · deps: none · est: 2h · parallel
- [ ] **7.3 Kiln test coverage to 60%+** · deps: W2 · est: 4h · parallel

---

## 4. Parallelism Map (how many agents can run at once)

| Wave | Max parallel | Bottleneck |
|------|-------------|-----------|
| W0 | 4 | none — all independent |
| W1 | 3 (1.1 + 1.2 + 1.3) | 1.1 is the blocker for downstream |
| W2 | 1 (sequential within wave, 2.1 → 2.2 + 2.3 + 2.4 + 2.5) | core refactor is serial |
| W3a + W3b + W4 + W7 | **~12** | interfaces from 2.3 unblock all |
| W5 | 2 (CLI + MCP) | both need W4 done |
| W6 | 3 | doc writing parallel |

**Biggest parallel window: after W2.3 lands.** Can spin up many sub-agents for provider moves, pipeline builds, introspection tools, and polish simultaneously.

---

## 5. Cyclical Execution Rhythm

Each task card follows this loop:
1. **Spec** — confirm interface/schema before writing body
2. **Build** — implement the slice
3. **Validate** — run acceptance criteria (tests, regen, lint, typecheck)
4. **Commit** — small commits, one per task card
5. **Check off** — update this doc, move to next

Between waves:
- **Wave gate**: all `[ ]` in current wave become `[x]` before starting next, except for explicitly-parallel tasks from earlier waves
- **Merge gate**: `bun run typecheck && bun run lint && bun run test` green before merging spike branch

---

## 6. Today's Realistic Targets

**Today = 2026-04-21.** With parallel sub-agents:

**Realistic to finish today:**
- All of W0 (0.1, 0.2, 0.3, 0.4) — parallel ~1.5h wall
- W1.1 spike (blocker) — 8-12h but agent can run subsets in parallel
- W1.2 + W1.3 (parallel to W1.1)
- Possibly W2.3 + W2.4 if spike lands mid-day

**Deferred to next sessions:**
- W2.1/2.2 (full extraction) — heavy touch of editor, wants careful review
- W3, W4, W5, W6, W7

The DAG means we can resume at any wave boundary without losing state. Each session picks up where the check-boxes leave off.

---

## 7. How to use this doc

- **At start of each session:** scan checkboxes, pick highest-upstream unchecked task(s)
- **For parallel work:** dispatch sub-agents against task cards that share a wave and have no interlock
- **When a task lands:** check it off, commit the doc along with the code change
- **When acceptance fails:** keep the box `[ ]`, append a `// blocker:` note beneath the task
- **Living document:** update scope if reality diverges; don't let it go stale

---

## 8. Risk register

| Risk | Likelihood | Mitigation |
|------|-----------|-----------|
| Kiln spike reveals deep browser coupling | Low | `export-glb.ts` already proves headless works; spike is confirmation not discovery |
| GLB diff shows drift between old + new paths | Medium | Tri-count ±5% tolerance; named parts exact; if drift, pin gltf-transform as sole export |
| OpenAI pricing impacts budget at scale | Low | `provider: 'auto'` defaults to Gemini; OpenAI only for capability gaps |
| MCP tool responses too large (base64 payloads) | Medium | Return file paths instead of bytes for large assets; agents read via Read tool |
| Editor regression during W2 extraction | Medium | Run full Playwright E2E after W2.1 and W2.2; keep spike branch until green |
| Script archival loses valuable scripts | Low | Archive not delete; ARCHIVE.md preserves provenance |

---

## 9. Acceptance of plan

Plan locked at: `2026-04-21`
Last updated: `2026-04-21`
Next review: after W1.1 gate passes

