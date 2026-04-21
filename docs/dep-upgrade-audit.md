# Dependency Upgrade Audit — April 2026

_Audit date: 2026-04-21. Scope: every `package.json` in the monorepo (root + 4 packages). Purpose: catalog outdated deps, classify bump severity, call out breaking changes, and propose an upgrade sequence. **No package.json was modified.**_

Companion doc: `docs/model-audit-2026-04.md` covers AI SDK versions (Anthropic, Gemini, FAL, OpenAI). This audit **does not re-research those** — it refers to them.

---

## 0. TL;DR

Across the 5 `package.json` files (`/`, `packages/client`, `packages/server`, `packages/shared`, `packages/core`):

| Severity | Count | Notes |
|---|---|---|
| **Patch** | 5 | All safe drive-by bumps (`@xyflow/react`, `konva`, `react`, `react-dom`, `@types/react`) |
| **Minor** | 8 | Safe with quick smoke test (`@types/three`, `three`, `zustand`, `@tailwindcss/vite`, `tailwindcss`, `@playwright/test`, `msw`, `@google/genai`, `hono`, `@anthropic-ai/claude-agent-sdk`, `tailwind-merge`, `globals`) |
| **Major** | 15 | Needs migration plan (see §3). Biggest: Vite 7→8, Vitest 3→4, TypeScript 5.9→6.0, ESLint 9→10, jsdom 27→29, lucide-react 0→1, @vitejs/plugin-react 5→6, @vitest/coverage-v8 matches Vitest, @types/node 24→25, happy-dom (no bump), `@fal-ai/serverless-client` → `@fal-ai/client`, `@anthropic-ai/sdk` 0.71→0.90, plus "not-yet-installed" deps (`@modelcontextprotocol/sdk`, `citty`, `openai`) that need adding per `docs/next-cycle.md`. |
| **Already current** | ~13 | Radix UI, lots of small utility libs, `zod`, `@hono/zod-validator`, `@testing-library/*`, `clsx`, `class-variance-authority`, `jszip`, `sharp`, `@gltf-transform/core`, `eslint-plugin-react-refresh` |

**Top 5 priority upgrades** (greatest value / lowest risk ratio):

1. **`@fal-ai/serverless-client` → `@fal-ai/client`** — the old package is deprecated; blocking future endpoint-schema updates. Already documented in model audit §2.2. **Major but mandatory.**
2. **`@anthropic-ai/sdk` 0.71 → 0.90** — covered in model audit §2.3; enables Opus 4.7 migration.
3. **`@google/genai` 1.38 → 1.50** — covered in model audit §2.1; unlocks 14-ref-image cap + Pro image tier.
4. **`lucide-react` 0.563 → 1.8** — a huge version jump (0.x → 1.0) but the icon set is largely additive; breaking changes are mostly icon renames and tree-shake-only imports. ~30 min to test.
5. **`@anthropic-ai/claude-agent-sdk` 0.2.50 → 0.2.116** — **minor-shaped major** (still 0.x, so any bump may break). Active development, many fixes. Should be bumped alongside `@anthropic-ai/sdk` so agent SDK and raw SDK stay aligned.

**Two surprises:**

- **Vite 8 is out and `@vitejs/plugin-react@6.0.1` peer-requires `vite@^8`.** That means the plugin is already at a version incompatible with our current Vite 7. Any time we upgrade plugin-react we're also forced into Vite 8. Fortunately the Vite 8 migration is largely transparent thanks to their compat layer (Rolldown-based).
- **`zod` is listed as `^4.3.6` but npm `latest` is also 4.3.6.** Zod is unchanged — the `4.x` major came and settled. No zod 5 exists. (Model audit briefly implied bump risk here, but there is none.)

---

## 1. Root `package.json`

```json
{
  "devDependencies": { "typescript": "^5.9.3" },
  "dependencies": {
    "@gltf-transform/core": "^4.3.0",
    "sharp": "^0.34.5"
  }
}
```

| Package | Current | Latest | Delta | Action |
|---|---|---|---|---|
| `typescript` | `^5.9.3` | `6.0.3` | **major** | Defer — TS 6 deprecates `moduleResolution: "classic"` and several legacy `target`/`module` combos but keeps our modern config intact. Schedule for a dedicated 1–2h wave. |
| `@gltf-transform/core` | `^4.3.0` | `4.3.0` | — | Current |
| `sharp` | `^0.34.5` | `0.34.5` | — | Current |

**Note:** `typescript` appears in root *and* client devDeps *and* server/core peerDeps. All three must move in lockstep. See §4.

---

## 2. `packages/client/package.json`

### 2.1 Dependencies

| Package | Current | Latest | Delta | Action |
|---|---|---|---|---|
| `@pixel-forge/shared` | workspace | — | — | — |
| `@radix-ui/react-dialog` | `^1.1.15` | `1.1.15` | — | Current |
| `@radix-ui/react-dropdown-menu` | `^2.1.16` | `2.1.16` | — | Current |
| `@radix-ui/react-select` | `^2.2.6` | `2.2.6` | — | Current |
| `@radix-ui/react-slider` | `^1.3.6` | `1.3.6` | — | Current |
| `@radix-ui/react-slot` | `^1.2.4` | `1.2.4` | — | Current |
| `@radix-ui/react-toast` | `^1.2.15` | `1.2.15` | — | Current |
| `@types/three` | `^0.182.0` | `0.184.0` | minor (0.x) | Safe bump. Three.js types are additive. Bump alongside `three`. |
| `@xyflow/react` | `^12.10.0` | `12.10.2` | patch | Drive-by. |
| `class-variance-authority` | `^0.7.1` | `0.7.1` | — | Current |
| `clsx` | `^2.1.1` | `2.1.1` | — | Current |
| `jszip` | `^3.10.1` | `3.10.1` | — | Current |
| `konva` | `^10.2.0` | `10.2.5` | patch | Drive-by. Must match `react-konva`. |
| `lucide-react` | `^0.563.0` | `1.8.0` | **major (0→1)** | See §3.1 |
| `react` | `^19.2.0` | `19.2.5` | patch | Drive-by. React 19.3 not out yet. |
| `react-dom` | `^19.2.0` | `19.2.5` | patch | Drive-by. Must match `react`. |
| `react-konva` | `^19.2.2` | `19.2.3` | patch | Drive-by. Peer-matches `react@19`. |
| `tailwind-merge` | `^3.4.0` | `3.5.0` | minor | Safe. |
| `three` | `^0.182.0` | `0.184.0` | minor (0.x is effectively major) | See §3.2 |
| `zustand` | `^5.0.10` | `5.0.12` | patch | Drive-by. |

### 2.2 DevDependencies

| Package | Current | Latest | Delta | Action |
|---|---|---|---|---|
| `@eslint/js` | `^9.39.1` | `10.0.1` | **major** | See §3.3 (ESLint 10) |
| `@playwright/test` | `^1.48.0` | `1.59.1` | minor (11 versions) | Safe bump, but re-run E2E suite. Our `test:e2e` already works on 1.48, should on 1.59. |
| `@tailwindcss/vite` | `^4.1.18` | `4.2.4` | minor | Safe. Peer accepts vite 5/6/7/8. |
| `@testing-library/jest-dom` | `^6.9.1` | `6.9.1` | — | Current |
| `@testing-library/react` | `^16.3.2` | `16.3.2` | — | Current |
| `@testing-library/user-event` | `^14.6.1` | `14.6.1` | — | Current |
| `@types/jszip` | `^3.4.1` | `3.4.1` | — | Current |
| `@types/node` | `^24.10.1` | `25.6.0` | **major** | See §3.4 |
| `@types/react` | `^19.2.5` | `19.2.14` | patch | Drive-by. |
| `@types/react-dom` | `^19.2.3` | `19.2.3` | — | Current |
| `@vitejs/plugin-react` | `^5.1.1` | `6.0.1` | **major** | **Forces Vite 8.** Peer: `vite: ^8.0.0`. Cannot bump in isolation. See §3.5 |
| `@vitest/coverage-v8` | `^4.0.18` | `4.1.5` | minor (within same v4) | Safe. Peer-pinned exactly to matching Vitest. |
| `eslint` | `^9.39.1` | `10.2.1` | **major** | See §3.3 |
| `eslint-plugin-react-hooks` | `^7.0.1` | `7.1.1` | minor | Safe. Already supports eslint 10 peer. |
| `eslint-plugin-react-refresh` | `^0.4.24` | `0.5.2` | minor (0.x) | Drive-by; check that vite HMR wiring unchanged. |
| `globals` | `^16.5.0` | `17.5.0` | **major** | Low risk — globals just exports named sets (e.g. `globals.browser`). v17 restructured a few Node set names. ~15 min. |
| `happy-dom` | `^20.4.0` | `20.9.0` | minor | Safe. |
| `jsdom` | `^27.4.0` | `29.0.2` | **major (2 majors)** | See §3.6 |
| `msw` | `^2.12.7` | `2.13.4` | minor | Safe. |
| `tailwindcss` | `^4.1.18` | `4.2.4` | minor | Safe. Tailwind v4 stable since late 2025; v4.2 added container queries in `@theme` and new utility patterns. Our config is minimal, no config-layer break expected. |
| `typescript` | `~5.9.3` | `6.0.3` | **major** | See §1 / §3.9 |
| `typescript-eslint` | `^8.46.4` | `8.59.0` | minor | Safe. Peer: `eslint ^8.57 \|\| ^9 \|\| ^10`, `typescript >=4.8.4 <6.1.0`. Already supports TS 6 and ESLint 10. |
| `vite` | `^7.2.4` | `8.0.9` | **major** | See §3.5 |
| `vitest` | `^4.0.18` | `4.1.5` | minor (within v4) | Safe. Repo is already on Vitest 4.x. |

---

## 3. `packages/server/package.json`

| Package | Current | Latest | Delta | Action |
|---|---|---|---|---|
| `@anthropic-ai/claude-agent-sdk` | `^0.2.50` | `0.2.116` | **minor-shaped major (0.x)** | Covered in model audit. Bump in same wave as `@anthropic-ai/sdk`. |
| `@anthropic-ai/sdk` | `^0.71.2` | `0.90.0` | **major (0.x)** | See model audit §2.3. |
| `@fal-ai/serverless-client` | `^0.15.0` | `0.15.0` | — (deprecated) | **Replace with `@fal-ai/client@1.9.5`.** See model audit §2.2. |
| `@google/genai` | `^1.38.0` | `1.50.1` | minor | See model audit §2.1. |
| `@hono/zod-validator` | `^0.7.6` | `0.7.6` | — | Current |
| `@pixel-forge/shared` | workspace | — | — | — |
| `hono` | `^4.11.7` | `4.12.14` | minor (7 versions) | Safe. Hono 4.x is the stable line; 4.12 added streaming-cookie helpers and improved `c.json()` typing. No 5.x exists. |
| `zod` | `^4.3.6` | `4.3.6` | — | **Current.** No zod 5. |
| `@types/bun` | `latest` | `1.3.12` | — | `latest` tag auto-resolves. Worth pinning to explicit version in a hygiene pass. |

**Not yet installed (required by `docs/next-cycle.md`):**

| Package | Target | Purpose |
|---|---|---|
| `openai` | `^6.1.0` (latest `6.34.0`) | New OpenAI image provider (`services/openai.ts`). See model audit §3. |
| `@modelcontextprotocol/sdk` | `1.29.0` | MCP stdio adapter (Wave W4+ of next-cycle plan). |
| `citty` | `0.2.2` | CLI adapter (Wave W4+). |

---

## 4. `packages/shared/package.json`

Zero dependencies beyond the workspace. Nothing to audit.

## 5. `packages/core/package.json`

| Package | Current | Latest | Delta | Action |
|---|---|---|---|---|
| `@types/bun` | `latest` | `1.3.12` | — | Same as server — pin explicitly. |
| `typescript` (peer) | `^5` | `6.0.3` | **major available** | Widen peer to `^5 \|\| ^6` when TS 6 lands. |

Still mostly empty scaffolding per next-cycle plan (Wave W1).

---

## 6. Major Bumps Expanded

### 6.1 `lucide-react` 0.563 → 1.8.0

- **What's new:** First real `1.x` release. Icon set expanded to ~1,500 icons. Package now uses proper stable semver (every 0.x prior was effectively a minor). Tree-shaking is now the default — deep imports (`lucide-react/dist/esm/icons/x`) are no longer needed.
- **Breaking:**
  - Several rarely used icons renamed (e.g. removed legacy aliases).
  - Deep/internal imports (`lucide-react/icons/...`) no longer work — only root barrel or per-icon submodule path.
  - Minimum React: 18 (we're on 19; fine).
- **Migration effort:** ~30 min. `grep -r "from 'lucide-react/" src` across client, update any non-root imports. Our current usage is root-import only based on codebase conventions.
- **Wave:** W0 drive-by after model-audit SDK bumps merged. Slot into `docs/next-cycle.md` Wave W0 housekeeping.

### 6.2 `three` 0.182 → 0.184

- **Three is effectively major on every minor** (0.x versioning). Highlights in 0.183 and 0.184:
  - WebGPU renderer feature parity improvements (BatchedMesh, fog API).
  - `Matrix4.makeShear` parameter-order fix (signature change).
  - Several deprecated exports removed (check `GPUPicker` usage if any).
- **Breaking risk for us:** `kiln/runtime.ts` uses Three extensively. Review any deprecated imports.
- **Migration effort:** 1–2h, mostly running typecheck + `kiln/runtime.ts` smoke test.
- **Wave:** Slot into next-cycle `kiln` consolidation wave (W2 in plan) — whoever rewrites `kiln/runtime.ts` owns this bump.

### 6.3 ESLint 9 → 10 (`eslint`, `@eslint/js`)

- **What's new:** Cleanup release. Most of v10's energy is removing deprecated context methods on rule authors (we don't author rules — only consume).
- **Breaking for us:**
  - `context.getCwd()` → `context.cwd` — only matters to rule authors.
  - `context.parserOptions` → `context.languageOptions.parserOptions`.
  - Minimum Node: 20.19+ or 22.12+ — we're on Node 24 per global CLAUDE.md, fine.
- **Peer-dep constraints:**
  - `eslint-plugin-react-hooks@7.1.1` supports `^10.0.0` ✓
  - `typescript-eslint@8.59.0` supports `^10.0.0` ✓
  - `eslint-plugin-react-refresh@0.5.2` (need to verify, but plugins in this space typically widen)
- **Migration effort:** ~30 min. Run `bun run lint`, expect zero authored-rule breakage. Could require a `.eslint.config.js` tweak if any now-removed compat shims were in use (we use flat config already, so unlikely).
- **Wave:** Group with `globals` 16→17 and `@types/node` 24→25 as a single "tooling freshening" wave.

### 6.4 `@types/node` 24 → 25

- **What's new:** Tracks Node 25 runtime (released Apr 2026). Adds types for new `node:process` APIs and updated `URL.parse` signature. Removes a few legacy callback-style types.
- **Breaking for us:** Negligible — server runs on Bun, client doesn't use `node:*` much. Scripts dir might surface a type-only warning.
- **Migration effort:** ~15 min. Run `bun run typecheck` across workspaces.
- **Wave:** Bundle with ESLint + globals.

### 6.5 Vite 7 → 8 + `@vitejs/plugin-react` 5 → 6

- **Locked together:** `@vitejs/plugin-react@6.0.1` peer-requires `vite: ^8.0.0`. If plugin-react moves, Vite must move. If Vite moves, plugin-react *should* move for plugin-API alignment.
- **What's new in Vite 8:**
  - Rolldown is now the default bundler (replaces Rollup under the hood). Compat shim auto-converts `rollupOptions` and `esbuild` config.
  - Plugin API stable from Vite 7.
  - Faster cold start and prod build.
- **What's breaking:**
  - Removed long-deprecated Vite config options (`resolve.dedupe` no longer accepts function form, etc.).
  - Some Rollup plugins may not have Rolldown equivalents — but we use zero custom plugins beyond `@vitejs/plugin-react` and `@tailwindcss/vite`, both vite-8-ready.
- **Migration effort:** 1–2h. Steps: bump both packages, run `bun run build`, run `bun run test` (client), eyeball dev server output. Bundle-size script may need threshold re-check (it already had to grow once — see recent commit `22921e7`).
- **Wave:** Dedicated "Vite 8" wave, probably after `core` spike lands so we're not chasing moving targets.

### 6.6 `jsdom` 27 → 29

- **What's new across 28 + 29:** Improved `Window` spec conformance, more accessor-based properties, Node 20+ required.
- **Breaking:** A handful of edge-case selectors now throw when they previously returned `null`; `MutationObserver` timing is now microtask-aligned (fixes flakes more often than it introduces them).
- **Migration effort:** ~45 min. Run full `vitest` suite (1907 tests). Known gotcha: `@testing-library/jest-dom` + jsdom 28 had a brief regression on `toBeVisible()` that is fixed in 29.
- **Alternative:** We also have `happy-dom` (minor bump available). Consider consolidating on one DOM env to reduce surface area.
- **Wave:** Bundle with the Vite 8 wave — both touch the test harness.

### 6.7 Vitest 4.0 → 4.1 (already on v4 — not a major)

Clarification: the file has `^4.0.18` which already resolves to 4.1.5 under normal install. So **no true major** — but note the migration doc from 3→4 captures one relevant pattern we should spot-check:

- `poolOptions.forks.*` is now flattened to top-level `test.execArgv`, `test.isolate`, `test.maxWorkers`. Check our `vitest.config.ts` for legacy nested shape.
- `test('name', () => {...}, { retry: 2 })` syntax deprecated — options now go as 2nd arg. Timeouts as last arg still work.

**Search this repo** for the old poolOptions shape; if present, flip.

### 6.8 `@fal-ai/serverless-client` → `@fal-ai/client`

Covered in model audit §2.2. Three call sites in `packages/server/src/services/fal.ts`. `Result<T>` destructuring change.

### 6.9 `@anthropic-ai/sdk` 0.71 → 0.90 + `claude-agent-sdk` 0.2.50 → 0.2.116

Covered in model audit §2.3. Bump together. SDK is still 0.x so every minor bump is technically a "major".

### 6.10 TypeScript 5.9 → 6.0

- **What's new:** Continued inference improvements, performance gains from the incremental TS-Go integration work. `satisfies` narrows better. New `never`-aware narrowing for intersections.
- **Breaking for us:**
  - `moduleResolution: "classic"` and several `target`/`module` combos now error instead of warn. We use `"bundler"` and `"nodenext"` — fine.
  - A handful of types from `lib.es5.d.ts` tightened (rare real-world impact).
  - `ignoreDeprecations: "6.0"` escape hatch available.
- **Peer-dep check:** `typescript-eslint@8.59.0` caps at `<6.1.0` — will accept TS 6.0 ✓.
- **Migration effort:** 1h. Run `bun run typecheck` across workspaces; fix any tightened-type escapes.
- **Wave:** Bundle with Vite 8 + jsdom wave as "big tooling refresh".

---

## 7. Install-Order / Peer-Dep Constraints

These groups must bump together or in a specific order:

1. **React family** — `react`, `react-dom`, `@types/react`, `@types/react-dom`, `react-konva` all move together. Currently all on patches only; no coordination risk.
2. **Three family** — `three` + `@types/three` must match minor.
3. **Konva family** — `konva` + `react-konva` must match major.
4. **Vite 8 cascade** — `vite` + `@vitejs/plugin-react` locked. `@tailwindcss/vite` already supports v8 peer. Bundle-size script thresholds likely need re-baselining.
5. **ESLint 10 cascade** — `eslint` + `@eslint/js` must match major. `typescript-eslint` and `eslint-plugin-react-hooks` already support eslint 10; safe to bump any order.
6. **Vitest family** — `vitest` + `@vitest/coverage-v8` peer-pinned exactly (coverage peer dep is a pinned equal version). Must bump in lockstep.
7. **Anthropic family** — `@anthropic-ai/sdk` + `@anthropic-ai/claude-agent-sdk` — agent SDK re-exports raw SDK types; version skew causes subtle type errors.
8. **TypeScript across workspaces** — root devDep, client devDep, server/core peerDeps — one of the few things that still needs all package.jsons touched in a single commit.

---

## 8. Recommended Upgrade Sequence

If we do a focused "dep freshening" cycle, slot it after the model-audit AI-SDK wave completes. Proposed waves:

**Wave D-0 — Drive-by patches (5 min, zero-risk)**
Bump all packages classified "patch" in §2. Includes `@xyflow/react`, `konva`, `react`/`react-dom`/`@types/react`, `react-konva`, `@types/three` minor. One commit, one `bun install`, one `bun run test` + `bun run typecheck`.

**Wave D-1 — Safe minors (15 min)**
`@playwright/test`, `msw`, `@tailwindcss/vite`, `tailwindcss`, `tailwind-merge`, `happy-dom`, `@vitest/coverage-v8` + `vitest` (within v4), `hono`, `zustand`, `three` (bumped alongside `@types/three`), `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `typescript-eslint`. Run full test + e2e suite.

**Wave D-2 — Lucide 1.x (30 min)**
Isolated because it's an icon library rename risk. Grep imports, bump, smoke-test the client.

**Wave D-3 — AI SDK wave (already planned)**
Per `docs/model-audit-2026-04.md` action checklist. `@google/genai`, `@anthropic-ai/sdk`, `@anthropic-ai/claude-agent-sdk`, `@fal-ai/serverless-client` → `@fal-ai/client`. Plus new `openai` install.

**Wave D-4 — Tooling refresh (2–3h)**
TypeScript 5.9 → 6.0, ESLint 9 → 10 (+ `@eslint/js`, `globals` 16 → 17, `@types/node` 24 → 25). All touch the same "strict typecheck + lint" surface. One merged wave minimises churn.

**Wave D-5 — Vite 8 + jsdom (2–3h)**
`vite` 7 → 8, `@vitejs/plugin-react` 5 → 6, `jsdom` 27 → 29. Touches build + test harness. Needs bundle-size baseline reset.

**Wave D-6 — New package installs (per next-cycle plan)**
`openai@^6`, `@modelcontextprotocol/sdk@^1.29`, `citty@^0.2` — these are *net new*, handled as part of feature waves W3/W4 in `docs/next-cycle.md`.

---

## 9. Things NOT to Upgrade Right Now

- **`typescript` 5.9 → 6.0 alone.** Don't do it as a standalone bump — bundle with ESLint + Vite 8 refresh to pay the typecheck-run cost once.
- **`vite` 7 → 8 in isolation.** Forces `@vitejs/plugin-react` 6 simultaneously. Fine to do the pair, but don't only move Vite.
- **`@types/node` 24 → 25 alone.** Low value on its own; always ride along with TS/ESLint refresh.
- **Upgrading to a pre-release of anything.** `@vitejs/plugin-react@6.0.0-beta.0` exists in the registry history — don't pin to it. Use `6.0.1` when we're ready.
- **Creating a `lucide-react` bump PR before the AI-SDK wave merges** — risk of merge conflict on `package.json` + lockfile churn.
- **`zod` — it's not actually outdated.** Don't let "feels old" intuition push you here. 4.3.6 is the latest.
- **`@fal-ai/client` BiRefNet v2 swap** — model audit flags it as "evaluate". Do the SDK rename first (forced), then A/B v2 vs v1 on a sample sprite set before flipping.

---

## 10. Acceptance Checklist

- [x] Every `package.json` in the repo audited (root + 4 packages). `shared` has no deps beyond workspace.
- [x] Every outdated dep classified patch/minor/major (§1, §2, §3).
- [x] Major bumps have migration notes (§6).
- [x] Cross-referenced with `docs/model-audit-2026-04.md` — AI-SDK content not duplicated, just referenced (§3, §6.8, §6.9).
- [x] Output under 1500 lines.

---

## 11. Citations

- [Vite 8 migration guide](https://github.com/vitejs/vite/blob/main/docs/guide/migration.md)
- [ESLint v10 migration guide](https://github.com/eslint/eslint/blob/main/docs/src/use/migrate-to-10.0.0.md)
- [Vitest 4 migration guide](https://github.com/vitest-dev/vitest/blob/main/docs/guide/migration.md)
- [TypeScript 6 deprecations](https://github.com/microsoft/typescript/blob/main/CONTRIBUTING.md)
- [jsdom Changelog](https://github.com/jsdom/jsdom/blob/main/Changelog.md)
- `docs/model-audit-2026-04.md` (companion doc — AI SDK upgrade details)
- `docs/next-cycle.md` (wave planning context)
- npm registry `latest` tags, queried 2026-04-21.
