---
name: nano-banana-pro
description: Use this skill when configuring or invoking Google Gemini's Nano Banana Pro (Gemini 3 Pro Image / `gemini-3.1-flash-image-preview`) for game asset image generation. Trigger on keywords "Gemini", "nano-banana", "nano banana pro", "Gemini 3 Pro Image", "gemini-3.1-flash-image", "sprite generation", "batch asset generation", "reference image", "seed control", "image gen API", or when the user asks to generate 2D game sprites, icons, characters, or props with consistent style, solid-color backgrounds for chroma keying, or batch style-locked outputs via the Gemini API.
allowed-tools: Read, Write, Bash, Glob, Grep
---

# Nano Banana Pro - Game Asset Generation

Generate consistent, high-quality game assets using Google Gemini's Nano Banana Pro model.

## Model Selection

| Model | Use Case | Speed |
|-------|----------|-------|
| `gemini-3.1-flash-image-preview` | Latest image gen, 2K support | Fast |
| `gemini-2.5-flash-image` | Fast edits, style transfers | Faster |
| `gemini-3-pro-image-preview` | Legacy alias (deprecated) | - |

**For game assets**: Use `gemini-3.1-flash-image-preview` for quality.

## API Configuration

### Resolution Settings

```javascript
const generationConfig = {
  image_size: "1K",  // Options: "1K", "2K", "4K" (uppercase K required)
  // OR use aspect ratios:
  // 1:1, 2:3, 3:2, 3:4, 4:3, 4:5, 5:4, 9:16, 16:9, 21:9
};
```

| Asset Type | Recommended Size |
|------------|------------------|
| Icons/Small sprites | 512x512 or 1K |
| Characters/Props | 1K (1024x1024) |
| Backgrounds/Scenes | 2K |
| High-detail assets | 4K |

### Thinking Level (Gemini 3)

```javascript
const generationConfig = {
  thinking_level: "medium", // low, medium, high
};
```

Higher thinking = better reasoning for complex prompts, but slower.

## Style Consistency

### Using Reference Images

Nano Banana Pro accepts up to **14 reference images**:
- Up to 6 object images (high-fidelity inclusion)
- Up to 5 human images (character consistency)

```javascript
// Include reference for style consistency
const prompt = `Using the style from the reference image, create a [ASSET DESCRIPTION]`;
const images = [referenceStyleImage];
```

### Seed Value Control

For batch generation with consistent style:
1. Generate first asset with random seed
2. Note the seed value from successful output
3. Fix seed for subsequent variations

```javascript
const generationConfig = {
  seed: 12345, // Fixed seed for consistency
};
```

## Prompt Structure

### Template
```
[Subject + Adjectives] doing [Action] in [Location/Context].
[Composition/Camera Angle].
[Lighting/Atmosphere].
[Style/Media].
[Specific Constraints].
```

### Quality Modifiers

Always include quality keywords:
- `high-quality`
- `professional`
- `detailed`
- `game-ready`
- `clean edges`
- `consistent style`

### Game Asset Specific

| Asset Type | Key Phrases |
|------------|-------------|
| Sprites | `game sprite, solid red background, centered, clean edges` |
| Isometric | `isometric projection, 45-degree angle, solid red background, no perspective distortion` |
| Top-down | `top-down view, directly overhead, flat perspective, solid red background` |
| Icons | `UI icon, simple silhouette, high contrast, solid red background, readable at small size` |
| Tiles | `seamless tile, tileable texture, repeating pattern` (no bg removal needed) |

## Example Prompts

### Character Sprite
```
A heroic knight character in silver armor, standing idle pose.
Front-facing, centered in frame.
Soft ambient lighting, no harsh shadows.
Pixel art style, 2D game sprite.
Solid red background (#FF0000), 128x128 target size, clean anti-aliased edges.
```

### Isometric Building
```
A medieval blacksmith shop building.
Isometric projection facing south-west, 45-degree view angle.
Warm interior glow from forge, daytime exterior lighting.
Hyper-realistic style with slight stylization.
Solid red background (#FF0000), no ground shadow, game-ready asset.
```

### Tileable Texture
```
Stone cobblestone path texture.
Directly overhead view, flat.
Even diffuse lighting, no directional shadows.
Realistic texture, seamless edges.
Must tile perfectly in all directions, 512x512 final size.
```

### UI Icon Set
```
A set of 6 inventory icons: sword, shield, potion, key, coin, gem.
Each icon centered, same visual weight.
Flat lighting, slight 3D bevel effect.
Fantasy RPG style, golden border.
Solid red background (#FF0000), 64x64 each, arranged in 2x3 grid.
```

## Batch Generation Workflow

1. **Create style reference**: Generate one "hero" asset that defines the style
2. **Lock the style**: Use that image as reference for all subsequent assets
3. **Consistent prompts**: Use template with only subject changing
4. **Fixed parameters**: Same seed, resolution, quality settings
5. **Generate variations**: 3-5 per asset, select best

## Common Issues & Fixes

| Issue | Solution |
|-------|----------|
| Inconsistent style | Add reference image, fix seed value |
| Wrong perspective | Explicitly state angle (isometric, top-down, etc.) |
| **Background not transparent** | **DO NOT ask for transparent - it fails. Use solid red (#FF0000) or green (#00FF00) background, then remove via chroma key or BiRefNet** |
| Cut-off edges | Add "centered in frame, padding around edges" |
| Too much detail | Add "simple, clean, game-ready" |
| Shadows appearing | Add "no shadows, flat lighting, ambient light only" |
| Wrong size output | Gemini outputs 1024x1024 default - resize after |

## Critical: Transparency Workflow

**Nano Banana does NOT support native alpha channel output.** Asking for "transparent background" produces a checkerboard pattern visually, but the file has no actual transparency.

### Method 1: Solid Color + Removal (Recommended)

1. Generate with solid color background:
   - Red (#FF0000) - best for subjects without red
   - Green (#00FF00) - best for subjects without green
2. Remove via chroma key or BiRefNet

```
WRONG:  "transparent background"     → checkerboard, no alpha
RIGHT:  "solid red background"       → clean edges, remove in post
```

### Method 2: White→Black Extraction (Most Accurate)

For true partial transparency (glass, smoke, etc.):
1. Generate image on pure white (#FFFFFF)
2. Edit same image to pure black (#000000) background
3. Compare pixel values to compute alpha channel mathematically

This produces real partial transparency but requires custom scripting.

### Post-Processing Options

| Method | Speed | Quality | Use Case |
|--------|-------|---------|----------|
| Chroma key | Fast | Good | Solid subjects, no color bleed |
| BiRefNet | Slow | Better | Complex edges, hair, details |
| White/Black diff | Slow | Best | Partial transparency needed |

## Integration with Pixel Forge

When using in Pixel Forge pipeline:

1. **Image Gen Node**: Set model to `nano-banana-pro-preview`
2. **Reference Input**: Connect style reference image
3. **Resize Node**: Scale to target game size (power-of-2)
4. **Remove BG Node**: Clean up any background artifacts
5. **Compress Node**: Export as WebP for game use

## Resources

- [Nano Banana Pro Prompting Tips](https://blog.google/products/gemini/prompting-tips-nano-banana-pro/)
- [Gemini API Image Generation Docs](https://ai.google.dev/gemini-api/docs/image-generation)
- [Game Assets Generation Guide](https://help.apiyi.com/nano-banana-pro-game-assets-generation-en.html)
- [Style Consistency with Gemini](https://towardsdatascience.com/generating-consistent-imagery-with-gemini/)
