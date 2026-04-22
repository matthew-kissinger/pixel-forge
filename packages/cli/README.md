# @pixel-forge/cli

Citty-based command-line adapter over [`@pixel-forge/core`](../core).

## Install

From the workspace root, run:

```bash
bun install
cd packages/cli && bun link
```

This puts `pixelforge` on your PATH. Or invoke directly without linking:

```bash
bun packages/cli/src/index.ts <command> [...args]
```

## Commands

```text
pixelforge gen sprite       --prompt "..." --bg magenta --out ./sprite.png
pixelforge gen icon         --prompt "..." --variant mono --out ./icon.png
pixelforge gen texture      --description "..." --size 512 --out ./tile.png
pixelforge gen glb          --prompt "..." --category vehicle --out ./model.glb
pixelforge gen soldier-set  --faction NVA --tpose-prompt "..." --poses-file ./poses.json --out-dir ./soldiers
pixelforge inspect glb      ./model.glb
pixelforge providers list
pixelforge providers pick   --kind image --refs 8
pixelforge kiln list-primitives
pixelforge kiln validate    ./code.ts
pixelforge kiln inspect     ./code.ts
pixelforge kiln refactor    --code ./old.ts --instruction "add a turret" --out ./new.ts
```

Every command accepts `--json` for machine-readable output. Errors print
`.fixHint` from the core's `PixelForgeError` taxonomy and exit non-zero.

## Environment

Bun auto-loads `.env.local`. Set the keys you need:

```
GEMINI_API_KEY=...      # default image provider
OPENAI_API_KEY=...      # preferred when refs > 0
FAL_KEY=...             # textures + bg-removal
ANTHROPIC_API_KEY=...   # GLB / kiln codegen + refactor
```

Commands surface `ProviderAuthFailed` with the missing-env-var name when a
key is required but absent.

## Tests

```bash
cd packages/cli
bun test
```

Live tests against real providers are gated on `CLI_LIVE=1` (none committed
yet — pure smoke tests today).
