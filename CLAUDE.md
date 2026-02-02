# Pixel Forge

Node-based game asset generator using AI (Gemini + FAL).

## Current Phase: Testing

**We are in active testing.** Agents should perform end-to-end testing by generating real game assets. The goal is not just "does it work" but "does it produce great results."

### Testing Approach

1. **Multiple variations** - Don't settle on first output. Generate 3-5 variations per asset.
2. **Iterate on prompts** - Refine prompts based on results. Document what works.
3. **Cohesive sets** - Assets must work together visually. Same style, palette, quality level.
4. **Quality bar** - Not serviceable. Great. Assets should look like they belong in a polished game.

### Current Test: Space Laser Asset Pack

See `TASKS.md` for the full asset list. Generate the complete Space Laser asset pack as an end-to-end test of the pipeline.

**Success criteria:**
- All 19 assets generated
- Consistent bioluminescent sci-fi style across set
- Transparent backgrounds where specified
- Correct sizes (or easy to resize)
- Assets look cohesive when placed together in-game

## Quick Context

- **Stack**: React 19.2, Vite 7.2, React Flow 12.10, Bun 1.2, Hono 4.11
- **AI**: Gemini (nano-banana-pro-preview for images, veo-3.1 for video), FAL (Meshy for 3D, BiRefNet for bg removal)

## Key Files

- `TASKS.md` - Current asset generation tasks
- `SESSION_CONTEXT.md` - Full context from setup session
- `PLAN.md` - Implementation tasks by week
- `SPEC.md` - Architecture and node definitions
- `.env.local` - API keys (Gemini + FAL)

## Technical Notes

1. Use `nano-banana-pro-preview` for image gen (NOT gemini-2.5-flash-image)
2. Gemini outputs 1024x1024 regardless of prompt - resize node needed
3. FAL 3D gen is async (queue-based) - need polling for status
4. All deps installed with latest versions via `bun create vite` and `bun add`

## Commands

```bash
bun run dev:client  # Vite dev server
bun run dev:server  # Bun/Hono server
```
