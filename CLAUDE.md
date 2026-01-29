# Pixel Forge

Node-based game asset generator using AI (Gemini + FAL).

## Quick Context

- **Stack**: React 19.2, Vite 7.2, React Flow 12.10, Bun 1.2, Hono 4.11
- **AI**: Gemini (nano-banana-pro-preview for images, veo-3.1 for video), FAL (Meshy for 3D, BiRefNet for bg removal)
- **Status**: Scaffolded, APIs validated, ready for implementation

## Key Files

- `SESSION_CONTEXT.md` - Full context from setup session
- `PLAN.md` - Implementation tasks by week
- `SPEC.md` - Architecture and node definitions
- `.env.local` - API keys (Gemini + FAL)

## Important Notes

1. Use `nano-banana-pro-preview` for image gen (NOT gemini-2.5-flash-image)
2. Gemini outputs 1024x1024 regardless of prompt - resize node needed
3. FAL 3D gen is async (queue-based) - need polling for status
4. All deps installed with latest versions via `bun create vite` and `bun add`

## Commands

```bash
bun run dev:client  # Vite dev server
bun run dev:server  # Bun/Hono server
```

## Next Steps

1. Configure Tailwind in vite.config.ts
2. Set up React Flow with dark theme
3. Create Text Prompt, Image Gen, Preview nodes
4. Wire up /api/image/generate endpoint
