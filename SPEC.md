# Pixel Forge - Game Asset Generator

Node-based workflow for generating optimized 2D and 3D game assets using AI.

## Vision

A visual node editor where you connect inputs (text, images, drawings, video) through AI transformation nodes to produce game-ready assets. Think ComfyUI but purpose-built for game development with proper asset optimization.

## Status

- [x] Gemini API validated (rate limited on free tier, needs billing)
- [x] FAL API validated (Meshy text-to-3D working)
- [x] Project scaffold (Bun workspaces, React 19, Vite 7)
- [x] Node editor prototype (React Flow 12.10 working)
- [x] Core nodes implementation (21 nodes implemented)
- [ ] Asset optimization pipeline (partial - resize/crop done, compress pending)

---

## Tech Stack

### Frontend
| Layer | Choice | Rationale |
|-------|--------|-----------|
| Framework | **React 19** | Team familiarity, ecosystem |
| Language | **TypeScript 5.8** (strict) | Type safety, DX |
| Build | **Vite 7** | Fast HMR, ESM native |
| Node Editor | **React Flow** | Production-ready, ComfyUI-style |
| State | **Zustand** | Lightweight, works with React Flow |
| UI Components | **shadcn/ui** | Radix primitives, Tailwind |
| Styling | **Tailwind CSS 4** | Utility-first, fast iteration |
| Drawing | **tldraw** | Infinite canvas, proven in pixforge |
| 3D Preview | **Three.js** | Model viewer, proven in dreamPlot |

### Backend
| Layer | Choice | Rationale |
|-------|--------|-----------|
| Runtime | **Node.js 22** | ESM, performance |
| Framework | **Hono** | Fast, lightweight, Edge-ready |
| Database | **SQLite + Drizzle** | Local-first, proven in dreamPlot |
| Queue | **BullMQ + Redis** | Async job processing for AI calls |
| File Storage | **Local + S3-compatible** | Dev local, prod cloud |

### AI Providers
| Provider | Models | Use Case |
|----------|--------|----------|
| **Gemini** | nano-banana-pro, gemini-2.5-flash-image, veo-3.1 | 2D images, video |
| **FAL** | Meshy 6, Tripo, Trellis 2 | 3D models |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        PIXEL FORGE                               │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    NODE EDITOR                           │    │
│  │  ┌─────────┐    ┌─────────┐    ┌─────────┐              │    │
│  │  │  Input  │───▶│   AI    │───▶│ Output  │              │    │
│  │  │  Node   │    │  Node   │    │  Node   │              │    │
│  │  └─────────┘    └─────────┘    └─────────┘              │    │
│  │       │              │              │                    │    │
│  │       ▼              ▼              ▼                    │    │
│  │  ┌─────────┐    ┌─────────┐    ┌─────────┐              │    │
│  │  │ Canvas  │    │Transform│    │Optimize │              │    │
│  │  │  Node   │    │  Node   │    │  Node   │              │    │
│  │  └─────────┘    └─────────┘    └─────────┘              │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                   │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    PREVIEW PANEL                         │    │
│  │   ┌──────────┐  ┌──────────┐  ┌──────────┐              │    │
│  │   │ 2D View  │  │ 3D View  │  │ Timeline │              │    │
│  │   └──────────┘  └──────────┘  └──────────┘              │    │
│  └─────────────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────────────┤
│                         API LAYER                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │  Gemini  │  │   FAL    │  │  Queue   │  │ Storage  │        │
│  │  Client  │  │  Client  │  │  (Bull)  │  │  (Local) │        │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Node Types

### Input Nodes
| Node | Output | Description |
|------|--------|-------------|
| **Text Prompt** | string | Text input with prompt templates |
| **Canvas** | image | tldraw drawing surface |
| **Image Upload** | image | File picker + drag-drop |
| **Video Upload** | video | Video file input |
| **3D Model Upload** | model | GLB/FBX/OBJ import |
| **Reference Image** | image | Style/content reference |

### AI Generation Nodes
| Node | Input | Output | Provider |
|------|-------|--------|----------|
| **Image Gen** | text, image? | image | Gemini (nano-banana-pro) |
| **Image Edit** | image, text | image | Gemini |
| **Video Gen** | text, image? | video | Gemini (veo-3.1) |
| **3D Gen** | text OR image | model | FAL (Meshy/Tripo) |
| **Upscale** | image | image | Gemini/FAL |
| **Remove BG** | image | image | FAL (birefnet) |

### Transform Nodes
| Node | Input | Output | Description |
|------|-------|--------|-------------|
| **Crop** | image | image | Manual or auto-trim |
| **Resize** | image | image | Scale with power-of-2 option |
| **Palette Extract** | image | palette | Get dominant colors |
| **Palette Apply** | image, palette | image | Recolor to palette |
| **Composite** | image[] | image | Layer multiple images |
| **Split Frames** | video/gif | image[] | Extract animation frames |
| **Make Spritesheet** | image[] | image+json | Pack into atlas |

### Optimize Nodes
| Node | Input | Output | Description |
|------|-------|--------|-------------|
| **Compress Image** | image | image | WebP/AVIF/PNG optimization |
| **Compress 3D** | model | model | Draco compression |
| **Generate LOD** | model | model[] | Level of detail variants |
| **Generate Mipmaps** | image | image | GPU-ready textures |
| **Quantize Colors** | image | image | Reduce color count |

### Output Nodes
| Node | Input | Description |
|------|-------|-------------|
| **Preview** | any | Display in preview panel |
| **Export File** | any | Save to disk |
| **Batch Export** | any[] | Save multiple files |
| **Engine Export** | any | Unity/Godot/Unreal format |

---

## File Optimization Pipeline

### 2D Assets
```
Raw AI Output (PNG, ~500KB)
       │
       ├──▶ Remove Background (if needed)
       │         └── birefnet via FAL
       │
       ├──▶ Trim Whitespace
       │         └── Auto-detect bounds, crop
       │
       ├──▶ Resize to Power-of-2
       │         └── 16, 32, 64, 128, 256, 512, 1024
       │
       ├──▶ Quantize (optional)
       │         └── Reduce to 256 or fewer colors
       │
       └──▶ Compress
                 ├── WebP (90% smaller, broad support)
                 ├── AVIF (95% smaller, newer engines)
                 └── PNG (compatibility fallback)

Final: ~10-50KB, game-ready
```

### 3D Assets
```
Raw AI Output (GLB, ~5MB)
       │
       ├──▶ Validate Topology
       │         └── Check for non-manifold, flipped normals
       │
       ├──▶ Decimate (optional)
       │         └── Reduce poly count for LOD
       │
       ├──▶ Generate LODs
       │         └── LOD0 (full), LOD1 (50%), LOD2 (25%)
       │
       ├──▶ Optimize Textures
       │         └── Resize, compress to WebP/KTX2
       │
       └──▶ Draco Compress
                 └── Mesh geometry compression

Final: ~500KB-1MB, game-ready with LODs
```

---

## Project Structure

```
pixel-forge/
├── packages/
│   ├── client/                 # React frontend
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── nodes/      # React Flow custom nodes
│   │   │   │   ├── panels/     # Preview, properties, library
│   │   │   │   └── ui/         # shadcn/ui components
│   │   │   ├── stores/         # Zustand stores
│   │   │   ├── hooks/          # Custom hooks
│   │   │   ├── lib/            # Utilities
│   │   │   └── App.tsx
│   │   └── package.json
│   │
│   ├── server/                 # Hono backend
│   │   ├── src/
│   │   │   ├── routes/         # API endpoints
│   │   │   ├── services/       # AI clients, file ops
│   │   │   ├── jobs/           # BullMQ job processors
│   │   │   ├── db/             # Drizzle schema
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   └── shared/                 # Shared types
│       ├── src/
│       │   ├── nodes.ts        # Node type definitions
│       │   ├── schemas.ts      # Zod schemas
│       │   └── types.ts        # Common types
│       └── package.json
│
├── .env.local                  # API keys (gitignored)
├── package.json                # Workspace root
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── SPEC.md                     # This file
└── README.md
```

---

## API Keys

Stored in `.env.local`:

```bash
# Google Gemini (image, video, text)
GEMINI_API_KEY=AIzaSy...

# FAL AI (3D models, remove bg)
FAL_KEY=670ef279-...:26238e4d...
```

---

## Learnings from Sunset Projects

### From PixForge (keep)
- Preset-based prompt templates
- Zustand for state management
- tldraw for canvas drawing
- Generation history with artifacts store

### From DreamPlot (keep)
- TypeScript strict mode
- pnpm monorepo structure
- SQLite + Drizzle persistence
- Three.js for 3D preview
- Controller pattern for complex interactions

### From Both (avoid)
- Monolithic components (split early)
- Hardcoded URLs (use env vars)
- No error recovery (add retry logic)
- No tests (add from start)

---

## Implementation Phases

### Phase 1: Foundation
- [x] Scaffold monorepo (Bun workspaces)
- [x] Set up React + Vite + TypeScript
- [x] Integrate React Flow
- [x] Basic node types (Text, Preview)
- [x] Connect to Gemini API

### Phase 2: Core Nodes
- [x] Image Gen node (nano-banana-pro)
- [ ] Canvas node (tldraw integration)
- [x] Image Upload node
- [x] Remove BG node (FAL birefnet)
- [x] Resize/Crop nodes

### Phase 3: 3D Pipeline
- [x] 3D Gen node (FAL Meshy/Tripo)
- [ ] 3D Preview (Three.js viewer)
- [ ] 3D Upload node
- [ ] LOD generation
- [ ] Draco compression

### Phase 4: Video Pipeline
- [ ] Video Gen node (Veo 3.1)
- [ ] Video preview
- [ ] Frame extraction
- [ ] Spritesheet generation

### Phase 5: Optimization
- [ ] Compress node (WebP/AVIF)
- [ ] Sprite atlas packer
- [ ] Batch export
- [ ] Engine-specific exports

### Phase 6: Polish
- [ ] Workflow save/load
- [ ] Preset workflows
- [ ] Undo/redo
- [ ] Keyboard shortcuts
- [ ] Documentation

---

## Open Questions

1. **Multiplayer?** - DreamPlot had Colyseus. Do we need collaborative editing?
2. **Cloud deploy?** - Local-first, but should we support cloud?
3. **Pricing model?** - If cloud, how to handle API costs?
4. **Plugin system?** - Allow custom nodes from community?

---

## References

- [React Flow](https://reactflow.dev/) - Node editor library
- [FAL AI Docs](https://docs.fal.ai/) - 3D model generation
- [Gemini API](https://ai.google.dev/gemini-api/docs) - Image/video generation
- [shadcn/ui](https://ui.shadcn.com/) - UI components
- [Drizzle ORM](https://orm.drizzle.team/) - TypeScript ORM
