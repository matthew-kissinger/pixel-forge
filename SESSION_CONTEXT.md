# Pixel Forge - Session Context

> Saved: 2026-01-28
> Purpose: Resume context for next session

---

## What This Project Is

**Pixel Forge** is a node-based workflow editor for generating optimized 2D and 3D game assets using AI. Think ComfyUI but purpose-built for game development.

### Sunsetted Projects (Learnings Extracted)
- **pixforge** (`/home/mkagent/repos/pixforge`) - AI sprite generator, React/Zustand/tldraw
- **dreamPlot** (`/home/mkagent/repos/dreamPlot`) - Multiplayer 3D world builder, Colyseus/Three.js

### Key Decisions Made
1. Node-based UI using React Flow (not linear workflow)
2. Support both 2D sprites AND 3D models
3. Gemini for images/video, FAL for 3D models
4. Optimize outputs for game engines (power-of-2, WebP, Draco compression)
5. Local-first (no cloud deployment initially)
6. Bun runtime for server (faster than Node)

---

## API Keys (in .env.local)

```bash
GEMINI_API_KEY=AIzaSyAwamYpN1OZjylQJ-KFlHXyLie-_dxKpiQ
FAL_KEY=670ef279-ec84-418b-bac0-b079e45510c8:26238e4d31c9d5f8dda6d9a0288e4efa
```

### Gemini Models Available
- `nano-banana-pro-preview` - Best quality image gen (USE THIS)
- `gemini-3-pro-image-preview` - Same model, alternate name
- `veo-3.1-generate-preview` - Video generation
- Tier 1 billing enabled

### FAL Models Available
- `fal-ai/meshy/v6-preview/text-to-3d` - $0.80/model
- `fal-ai/meshy/v6-preview/image-to-3d` - $0.80/model
- `fal-ai/birefnet` - Background removal (~free)
- `fal-ai/tripo` - Characters with quad topology

---

## Current Stack (All Latest)

### Client (`packages/client/`)
| Package | Version |
|---------|---------|
| react | 19.2.0 |
| react-dom | 19.2.0 |
| vite | 7.2.4 |
| typescript | 5.9.3 |
| @xyflow/react | 12.10.0 |
| tailwindcss | 4.1.18 |
| @tailwindcss/vite | 4.1.18 |
| zustand | 5.0.10 |
| lucide-react | 0.563.0 |
| clsx | 2.1.1 |
| tailwind-merge | 3.4.0 |
| class-variance-authority | 0.7.1 |

### Server (`packages/server/`)
| Package | Version |
|---------|---------|
| bun | 1.2.18 |
| hono | 4.11.7 |
| @google/genai | 1.38.0 |
| zod | 4.3.6 |

---

## API Validation Results

### Gemini Image Gen - WORKING
```bash
# Generated 1024x1024 pixel art sword
# Output: test-sword.png (913KB)
# Note: Ignores size in prompt, always 1024x1024 - need resize node
```

### FAL Meshy 3D Gen - WORKING
```bash
# Generated low-poly sword from text
# Output: test-sword-3d.png (preview), GLB/FBX/OBJ/USDZ available
# Request ID: 95fd9173-96a6-4624-bd7e-1e36217b7a06
```

---

## Project Structure

```
pixel-forge/
├── .env.local              # API keys
├── .envrc                  # direnv auto-load
├── .gitignore
├── package.json            # Workspace root
├── bun.lock
├── SPEC.md                 # Architecture specification
├── PLAN.md                 # Implementation plan with tasks
├── SESSION_CONTEXT.md      # This file
├── test-sword.png          # Gemini test output (913KB)
├── test-sword-3d.png       # FAL Meshy test output
└── packages/
    ├── client/             # Scaffolded with: bun create vite
    │   ├── src/
    │   │   ├── App.tsx     # Default Vite template (replace)
    │   │   ├── main.tsx
    │   │   └── index.css
    │   ├── vite.config.ts  # Needs Tailwind plugin added
    │   └── package.json
    └── server/             # Scaffolded with: bun init
        ├── index.ts        # Default (replace with Hono app)
        └── package.json
```

---

## Node Types Planned

### Phase 1 (MVP)
- Text Prompt (input) - text output
- Image Upload (input) - image output
- Image Gen (ai) - Gemini nano-banana-pro
- Preview (output) - display any type
- Export (output) - save to disk

### Phase 2 (Transform)
- Remove BG (ai) - FAL birefnet
- Resize (transform) - power-of-2 option
- Crop/Trim (transform) - auto-trim whitespace
- Compress (optimize) - WebP/AVIF/PNG

### Phase 3 (3D)
- 3D Gen Text (ai) - FAL Meshy
- 3D Gen Image (ai) - FAL Meshy
- 3D Preview (output) - Three.js viewer
- 3D Export (output) - GLB/FBX/OBJ

### Phase 4 (Video)
- Video Gen (ai) - Veo 3.1
- Frame Extract (transform)
- Spritesheet (transform)

---

## FAL Pricing Reference

| Model | Cost |
|-------|------|
| BiRefNet (bg removal) | ~$0/request |
| Meshy 6 (3D gen) | $0.80/model |
| Flux Kontext | $0.04/image |
| Imagen 4 | ~$0.03/image |

---

## Commands

```bash
# Start dev
cd /home/mkagent/repos/pixel-forge
bun run dev:client  # Vite on :5173
bun run dev:server  # Bun on :3000

# Install deps
bun install

# Add package to client
cd packages/client && bun add <package>

# Add package to server
cd packages/server && bun add <package>
```

---

## Next Implementation Steps

1. **Configure Tailwind** - Add @tailwindcss/vite to vite.config.ts
2. **Set up React Flow** - Dark theme, custom node wrapper
3. **Create stores** - Zustand for workflow state (nodes, edges)
4. **Build Text Prompt node** - Textarea with output handle
5. **Build Image Gen node** - Model selector, loading state
6. **Build Preview node** - Display image/model/video
7. **Wire up Hono routes** - /api/image/generate
8. **Connect nodes to API** - Execute workflow on "Run"

---

## Open Questions (Decide Later)

1. Canvas drawing - tldraw or simpler?
2. Workflow persistence - localStorage then SQLite?
3. Real-time collab - Maybe Colyseus later?
4. Plugin system - Community nodes?

---

## Reference Files

- `SPEC.md` - Full architecture, node definitions, data flow
- `PLAN.md` - Week-by-week implementation tasks
- Old projects for reference:
  - `/home/mkagent/repos/pixforge` - Prompt presets, Zustand patterns
  - `/home/mkagent/repos/dreamPlot` - Three.js, Colyseus, controller patterns
