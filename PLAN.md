# Pixel Forge - Implementation Plan

## Project Overview

**Goal**: Node-based workflow editor for generating optimized 2D and 3D game assets using AI.

**Sunsetted Projects**: pixforge, dreamPlot - learnings extracted and combined here.

---

## Current Stack (Latest as of Jan 2026)

### Client
| Package | Version | Purpose |
|---------|---------|---------|
| React | 19.2.0 | UI framework |
| Vite | 7.2.4 | Build tool |
| TypeScript | 5.9.3 | Type safety |
| @xyflow/react | 12.10.0 | Node-based editor |
| Tailwind CSS | 4.1.18 | Styling |
| Zustand | 5.0.10 | State management |
| Lucide React | 0.563.0 | Icons |

### Server
| Package | Version | Purpose |
|---------|---------|---------|
| Bun | 1.2.18 | Runtime |
| Hono | 4.11.7 | HTTP framework |
| @google/genai | 1.38.0 | Gemini API |
| Zod | 4.3.6 | Validation |

### AI APIs (Validated)
| Provider | Model | Cost | Use Case |
|----------|-------|------|----------|
| **Gemini** | nano-banana-pro-preview | ~$0.04/image | Best quality 2D |
| **Gemini** | gemini-3-pro-image-preview | ~$0.04/image | Same as above |
| **Gemini** | veo-3.1-generate-preview | ~$0.40/sec | Video gen |
| **FAL** | Meshy v6 text-to-3D | $0.80/model | 3D from text |
| **FAL** | Meshy v6 image-to-3D | $0.80/model | 3D from image |
| **FAL** | BiRefNet | ~free | Background removal |
| **FAL** | Tripo | varies | Characters (quad topology) |

---

## Architecture

```
pixel-forge/
├── packages/
│   ├── client/          # React + React Flow UI
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── nodes/       # Custom React Flow nodes
│   │   │   │   ├── panels/      # Preview, Properties, Library
│   │   │   │   └── ui/          # Reusable UI components
│   │   │   ├── stores/          # Zustand stores
│   │   │   ├── hooks/           # Custom hooks
│   │   │   └── lib/             # Utilities
│   │   └── package.json
│   │
│   └── server/          # Bun + Hono API
│       ├── src/
│       │   ├── routes/          # API endpoints
│       │   ├── services/        # AI client wrappers
│       │   └── utils/           # Image processing
│       └── package.json
│
├── .env.local           # API keys (gitignored)
├── package.json         # Workspace root
└── PLAN.md             # This file
```

---

## Node Types to Implement

### Phase 1: Core (MVP)
| Node | Category | I/O | Priority |
|------|----------|-----|----------|
| Text Prompt | input | out: string | P0 |
| Image Upload | input | out: image | P0 |
| Image Gen | ai | in: string, out: image | P0 |
| Preview | output | in: any | P0 |
| Export | output | in: any | P1 |

### Phase 2: Transform
| Node | Category | I/O | Priority |
|------|----------|-----|----------|
| Remove BG | ai | in: image, out: image | P1 |
| Resize | transform | in: image, out: image | P1 |
| Crop/Trim | transform | in: image, out: image | P1 |
| Compress | optimize | in: image, out: image | P1 |

### Phase 3: 3D Pipeline
| Node | Category | I/O | Priority |
|------|----------|-----|----------|
| 3D Gen (Text) | ai | in: string, out: model | P2 |
| 3D Gen (Image) | ai | in: image, out: model | P2 |
| 3D Preview | output | in: model | P2 |
| 3D Export | output | in: model | P2 |

### Phase 4: Video Pipeline
| Node | Category | I/O | Priority |
|------|----------|-----|----------|
| Video Gen | ai | in: string+image?, out: video | P3 |
| Frame Extract | transform | in: video, out: image[] | P3 |
| Spritesheet | transform | in: image[], out: image+json | P3 |

### Phase 5: Advanced
| Node | Category | I/O | Priority |
|------|----------|-----|----------|
| Canvas Draw | input | out: image | P2 |
| Palette Extract | transform | in: image, out: palette | P3 |
| Palette Apply | transform | in: image+palette, out: image | P3 |
| Batch | meta | in: any[], out: any[] | P4 |

---

## Implementation Tasks

### Week 1: Foundation
- [ ] Configure Tailwind CSS in client
- [ ] Set up React Flow with dark theme
- [ ] Create base node component wrapper
- [ ] Implement Text Prompt node
- [ ] Implement Preview node
- [ ] Set up Zustand store for workflow state
- [ ] Create node palette sidebar

### Week 2: AI Integration
- [ ] Set up Hono server with routes
- [ ] Implement Gemini service (image gen)
- [ ] Create Image Gen node
- [ ] Connect node execution to API
- [ ] Add loading states and error handling
- [ ] Implement FAL service (remove bg)
- [ ] Create Remove BG node

### Week 3: Transform Pipeline
- [ ] Implement Resize node (with power-of-2 option)
- [ ] Implement Crop/Trim node (auto-trim whitespace)
- [ ] Implement Compress node (WebP/AVIF/PNG)
- [ ] Add sharp for image processing
- [ ] Create Image Upload node
- [ ] Create Export node

### Week 4: 3D Pipeline
- [ ] Implement FAL Meshy service
- [ ] Create 3D Gen node (text-to-3D)
- [ ] Create 3D Gen node (image-to-3D)
- [ ] Add Three.js for 3D preview
- [ ] Create 3D Preview node
- [ ] Create 3D Export node (GLB/FBX/OBJ)

### Week 5: Polish
- [ ] Workflow save/load (localStorage)
- [ ] Preset workflows
- [ ] Keyboard shortcuts
- [ ] Undo/redo
- [ ] Better error messages
- [ ] Loading skeletons

### Week 6: Video (Optional)
- [ ] Implement Veo service
- [ ] Create Video Gen node
- [ ] Frame extraction
- [ ] Spritesheet packing

---

## API Endpoints

### Image
```
POST /api/image/generate    - Generate image with Gemini
POST /api/image/remove-bg   - Remove background with FAL
POST /api/image/resize      - Resize image
POST /api/image/compress    - Compress to WebP/AVIF
```

### 3D Model
```
POST /api/model/generate    - Generate 3D with Meshy/Tripo
GET  /api/model/status/:id  - Check generation status
GET  /api/model/result/:id  - Get completed model
```

### Video
```
POST /api/video/generate    - Generate video with Veo
GET  /api/video/status/:id  - Check generation status
GET  /api/video/result/:id  - Get completed video
```

---

## File Optimization Targets

### 2D Sprites
| Input | Output | Savings |
|-------|--------|---------|
| 1024x1024 PNG (913KB) | 64x64 WebP (~5KB) | 99% |
| With transparency | Trimmed + quantized | Better edges |

### 3D Models
| Input | Output | Savings |
|-------|--------|---------|
| Raw GLB (1.7MB) | Draco compressed (~200KB) | 88% |
| 30k polys | LOD0/1/2 (30k/15k/5k) | Runtime perf |

---

## Environment Variables

```bash
# .env.local
GEMINI_API_KEY=AIzaSy...
FAL_KEY=670ef279-...:26238e4d...
```

---

## Open Questions

1. **Canvas drawing** - Use tldraw (like pixforge) or simpler canvas?
2. **Workflow persistence** - localStorage first, then SQLite?
3. **Real-time collaboration** - Not MVP, but consider Colyseus later?
4. **Plugin system** - Allow community nodes?

---

## Success Metrics

- [ ] Can generate 2D sprite from text prompt
- [ ] Can remove background and resize to game-ready format
- [ ] Can generate 3D model from text or image
- [ ] Can export in multiple formats
- [ ] Output file sizes are optimized for games
- [ ] Workflow can be saved and reloaded
