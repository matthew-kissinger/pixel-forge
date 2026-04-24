# Morning Review

Current operational snapshot for the asset-rails workflow.

## Current defaults (source-of-truth)

- Kiln codegen default: `claude-opus-4-7` (`KILN_MODEL` override supported).
- Texture default: `fal-ai/flux-lora` (FLUX 1), because current seamless LoRA is FLUX 1 trained.
- BG removal default: `fal-ai/birefnet/v2` with variant mapping + Bria fallback.
- Health gate: `pixelforge health` / `pixelforge health --strict`.
- Review loop: `war-assets/_review/issues.json` + review server.
- Provenance: every generated asset writes `<asset>.provenance.json`.

## Why texture stays on FLUX 1

`fal-ai/flux-2/lora` currently returns 422 with our existing seamless texture LoRA.
Until a FLUX 2-compatible seamless LoRA is available, keep texture generation on:

- `fal-ai/flux-lora` (default)
- optional override only for experiments via provider endpoint options

## Daily operator checklist

```bash
pixelforge health
pixelforge health --audit
pixelforge audit review
pixelforge audit server
```

Optional hero GLB run:

```bash
KILN_MODEL=claude-opus-4-7 pixelforge gen glb --category=prop --name=crate --prompt "..."
```

## Review + triage flow

1. Build/update grids (`bun run audit:glb`).
2. Open `war-assets/validation/_grids/review.html` via review server.
3. Annotate with chips (`wrong-axis`, `floating`, `stray-plane`, `proportions`, `missing-part`, `style`) and notes.
4. Re-run only flagged assets/categories.
5. Confirm fixes via new grid + provenance.

## Notes

- This file is intentionally concise and current-state only.
- Historical wave reports and experiments remain under `docs/` for archive/reference.
