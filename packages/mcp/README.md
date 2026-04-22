# @pixel-forge/mcp

stdio-based [Model Context Protocol](https://modelcontextprotocol.io) server
over [`@pixel-forge/core`](../core).

## Install

```bash
# From repo root, after `bun install`:
claude mcp add pixelforge --stdio bun packages/mcp/src/index.ts
```

Or wire it into any other MCP-aware client by pointing at
`bun packages/mcp/src/index.ts` as the stdio entrypoint.

## Tools

| Name | Purpose |
|------|---------|
| `pixelforge_gen_sprite` | Generate a 32-bit pixel-art sprite (image gen + chroma + optional BiRefNet). |
| `pixelforge_gen_icon` | Generate a UI icon (mono silhouette or colored emblem). |
| `pixelforge_gen_texture` | Generate a tileable terrain texture (FLUX 2 + Seamless LoRA). |
| `pixelforge_gen_glb` | Generate a GLB via Kiln (Claude codegen + headless render). |
| `pixelforge_gen_soldier_set` | T-pose + N pose sprites for a faction. |
| `pixelforge_kiln_inspect` | Run Kiln source headlessly: tris, bounds, named parts, animations. |
| `pixelforge_kiln_validate` | AST-hardened validation; returns structured issues. |
| `pixelforge_kiln_refactor` | Refactor existing Kiln code against an instruction (Claude). |
| `pixelforge_kiln_list_primitives` | Self-describing catalog of every Kiln sandbox primitive. |
| `pixelforge_providers_capabilities` | The provider/model capability matrix. |

## Output strategy

Tools that produce binary payloads (`gen_sprite`, `gen_icon`, `gen_texture`,
`gen_glb`) default to writing the file to a tmp path and returning
`{ path, sizeBytes, meta, ... }` as `structuredContent`. Agents read the
file with their own filesystem tools.

Pass `inline: true` (or `outPath: "..."`) on any of those tools to
respectively receive base64 in `data` or write to an explicit path.

## Errors

Errors from `@pixel-forge/core` carry the `PixelForgeError` taxonomy. The
adapter surfaces `code`, `message`, `fixHint`, and `retryable` in
`structuredContent` with `isError: true`. Read `fixHint` for the
suggested next action.

## Environment

Bun auto-loads `.env.local`. Set the keys you need:

```
GEMINI_API_KEY=...      # default image provider
OPENAI_API_KEY=...      # preferred when refs > 0
FAL_KEY=...             # textures + bg-removal
ANTHROPIC_API_KEY=...   # GLB / kiln codegen + refactor
```

## Tests

```bash
cd packages/mcp
bun test
```

Tests use `InMemoryTransport.createLinkedPair()` to drive the server in-process
without spawning stdio.
