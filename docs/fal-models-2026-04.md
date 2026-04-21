# FAL Model Catalog Survey - April 2026

Research date: 2026-04-21. Scope: evaluate fal.ai offerings vs. Pixel Forge's current pipeline (BiRefNet for bg removal, FLUX 2 + Seamless LoRA for textures, Gemini 3.1 Flash Image for sprite gen, Meshy for 3D).

## 1. Summary recommendations

- **Keep BiRefNet for bg removal.** Still SOTA on fal; the `fal-ai/birefnet/v2` endpoint added a "General Use (Dynamic)" variant (256 to 2304px) plus a "Light 2K" variant we should try for our 512/1024 sprites. Our magenta chroma cleanup compensates for its known edge weakness.
- **Keep FLUX 2 + Seamless LoRA for textures.** FLUX 2 is still the current flagship (no FLUX 3 exists as of April 2026). But migrate from `fal-ai/flux-lora` to `fal-ai/flux-2/lora` - our `texture.ts` is still calling the FLUX 1 LoRA endpoint, which is a pricing/quality regression.
- **Consider for bg removal fallback:** `fal-ai/bria/background/remove` (Bria RMBG 2.0) at $0.018/img. Licensed training data = enterprise-safe. Cheaper than BiRefNet.
- **3 new-to-us models worth experimenting** (priority order):
  1. **`fal-ai/hunyuan3d-v3/image-to-3d`** (P1) - GLB output, $0.225-0.45/gen, could replace or supplement Meshy for stylized props. Hunyuan3D V3 is now competitive with Meshy-6.
  2. **`fal-ai/aura-sr`** (P2) - 4x GAN upscaler at $0.001/compute-sec. Useful for upscaling 256px FLUX texture source before the nearest-neighbor downscale (more detail in the downscale target).
  3. **`fal-ai/recraft/v3/text-to-image`** (P3) - Has explicit `digital_illustration/pixel_art` style option and strong text rendering (good for UI icons with labels). $0.04/img. Previously rejected but worth re-testing as a Gemini fallback specifically for icons.

## 2. Full catalog survey

### Image generation (text-to-image)

| Model ID | Pricing | When to use | Notes |
|---|---|---|---|
| `fal-ai/flux-2/lora` | $0.021/MP | **Current: textures** | Newer than `fal-ai/flux-lora`. We should migrate. |
| `fal-ai/flux-lora` | Older pricing | Deprecated for us | FLUX 1 LoRA - what `texture.ts` currently calls. |
| `fal-ai/recraft/v3/text-to-image` | $0.04/img ($0.08 vector) | UI icons, vector-style, labeled assets | Has `pixel_art` style flag. Still Artificial Analysis SOTA for text rendering. |
| `fal-ai/gpt-image-2` | TBD (enterprise) | Photorealism, pixel-perfect text | OpenAI's model, GA on fal as of 2026-04-21. Overkill for sprites. |
| `fal-ai/imagen4/preview/ultra` | TBD | High-end photoreal | Google's Imagen 4. Not a sprite fit. |
| `fal-ai/stable-diffusion-v35-large` | TBD | Backup/LoRA ecosystem | SD 3.5 Large. No SD 4 exists yet. |
| Nano Banana 2 (on fal) | TBD | Sprites (we use Gemini direct) | Same Gemini 3 Pro Image under the hood. Worth knowing fal proxies it. |

Note: No "FLUX 3" has been released. FLUX.2 is still the Black Forest Labs flagship (variants: pro, dev, klein 9B, flex with multi-ref).

### Background removal

| Model ID | Pricing | When to use | Notes |
|---|---|---|---|
| `fal-ai/birefnet/v2` | Not disclosed | **Current: all bg removal** | 6 variants: Light, Light 2K, Heavy, Matting, Portrait, Dynamic. We should pass variant per-use-case. |
| `fal-ai/birefnet` | Older | Keep as fallback | What we call today. Consider moving to v2. |
| `fal-ai/bria/background/remove` | $0.018/img | Enterprise/licensed-data alt | Licensed training imagery. Up to 1024px. Good for backup. |
| SAM 2 variants | N/A specialized | Segmentation, not bg removal | Not a BiRefNet replacement. |

### LoRA ecosystem

| Resource | Use |
|---|---|
| `gokaygokay/Flux-Seamless-Texture-LoRA` (HF) | **Current: textures.** No v2 released. Still current as of April 2026. |
| `nerijs/pixel-art-xl` (HF, SDXL) | Pixel art LoRA - SDXL-era, not FLUX. Skip. |
| FLUX 2 LoRA training on fal | Train our own sprite style LoRA if Gemini style drifts across batches. Text-to-image + image-to-image modes. |
| `fal-ai/flux-2-lora-gallery/realism` | Photoreal - not our use case. |

No pixel-art-first FLUX 2 LoRA exists on fal's public gallery as of April 2026. `fal-ai/image2pixel` post-processor is the closest offering but its output (1008x1008 with custom palette) is not a substitute for our current nearest-neighbor + Sharp palette quantize step (which we control precisely).

### Post-processing / upscalers

| Model ID | Pricing | When to use | Notes |
|---|---|---|---|
| `fal-ai/aura-sr` | $0.001/compute-sec | **Try:** 4x GAN upscale before pixelate step | Fast, no prompt needed. |
| `fal-ai/clarity-upscaler` | $0.03/MP | Photo-style upscale | Smooths edges - bad for pixel art. |
| `fal-ai/esrgan` | Low | Legacy 4x | Still available if we need a cheap baseline. |
| `fal-ai/recraft/upscale/crisp` | $0.004/img | Detail boost on Recraft outputs | Unknown pixel-art suitability; emphasis on faces/detail refinement. |
| `fal-ai/image2pixel` | $0/compute-sec (free tier?) | Image-to-pixel-art conversion | Not a substitute for our deterministic Sharp pipeline. |

### 3D generation

| Model ID | Pricing | When to use | Notes |
|---|---|---|---|
| `fal-ai/meshy/text-to-3d` | Existing | **Current** | What `fal.ts` calls. Still works, but Meshy-6 has newer API directly. |
| `fal-ai/hunyuan3d-v3/image-to-3d` | $0.225-$0.45/gen | **Try:** image-to-3D path | GLB output, PBR option, LowPoly mode ($0.45). Up to 1024 octree. |
| `fal-ai/hunyuan3d/v2` | Lower | Cheaper alt | V2 still available. |
| `fal-ai/hunyuan-part` | TBD | 3D-to-3D part split | Could complement Kiln primitives if we need to decompose. |
| Trellis 2 (via fal explore) | TBD | SOTA visual quality, open | Worth a separate eval for hero assets. |

Note: Hunyuan3D V3 is image-to-3D, which pairs well with our Gemini sprite outputs - generate a sprite then lift to 3D.

### Video / animation

| Model ID | Use | Notes |
|---|---|---|
| FalSprite (open-source project using fal) | Sprite sheet animation from text | Uses Nano-banana-2 + BRIA. Not a first-party fal endpoint. |
| fal start/end frame video models | Interpolate 2 frames | Could animate 2D sprite poses. Medium priority. |

No first-party fal "sprite animation" endpoint. For Terror in the Jungle, animation remains a manual pose-by-pose workflow for now.

## 3. Proposed pipeline changes (ranked by value/cost)

1. **Migrate `texture.ts` from `fal-ai/flux-lora` to `fal-ai/flux-2/lora`** - Est. 2 generations ($0.04-0.08) to validate a jungle floor and bamboo variant. Our current endpoint is a FLUX 1 code path; FLUX 2 is significantly better at prompt adherence.
2. **Add BiRefNet v2 variant selector to `fal.ts`** - Expose the `model` parameter (Light 2K vs Heavy vs Dynamic). Zero cost to add, variants run at same price; can A/B on existing sprites.
3. **Spike `fal-ai/hunyuan3d-v3/image-to-3d`** with one existing sprite (e.g. a VC soldier front-facing) at ~$0.40. Compare GLB quality against current Kiln primitive approach for stylized props.
4. **Benchmark `fal-ai/aura-sr`** as an upscale step between FLUX 256px output and our 32px downscale target. Goal: more detail information in the downsampled result. Est. $0.01 per test.
5. **Keep Gemini as primary sprite gen.** Nothing on fal beats it for our style-locked batch workflow. Recraft V3's pixel_art style is worth one-off test but not a replacement.

## 4. What did NOT change

- No FLUX 3.
- No new seamless texture LoRA from gokaygokay (or anyone else) that beats our current one.
- BiRefNet remains the accuracy leader for transparent-bg bg removal.
- SD 3.5 is still the latest Stable Diffusion - no SD 4.
- No pixel-art-specialist generative model on fal worth switching from Gemini to.

## Sources

- https://fal.ai/explore/models
- https://fal.ai/flux
- https://fal.ai/models/fal-ai/flux-2/lora
- https://fal.ai/models/fal-ai/birefnet/v2/api
- https://fal.ai/models/fal-ai/bria/background/remove
- https://fal.ai/models/fal-ai/recraft/v3/text-to-image
- https://fal.ai/models/fal-ai/aura-sr
- https://fal.ai/models/fal-ai/clarity-upscaler
- https://fal.ai/models/fal-ai/recraft/upscale/crisp
- https://fal.ai/models/fal-ai/hunyuan3d-v3/image-to-3d
- https://fal.ai/models/fal-ai/image2pixel
- https://fal.ai/learn/tools/ai-image-generators
- https://blog.fal.ai/
- https://blog.fal.ai/stable-diffusion-3-5/
- https://venturebeat.com/technology/new-years-ai-surprise-fal-releases-its-own-version-of-flux-2-image-generator
