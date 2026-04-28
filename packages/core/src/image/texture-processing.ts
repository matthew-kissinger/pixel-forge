/**
 * Tileable texture post-processing.
 *
 * The texture pipeline lowers a FAL flux-lora generation through three
 * retro-game transformations:
 *
 *   1. `pixelateNearest`  — downscale to `target` px with nearest filter
 *   2. `quantizePalette`  — reduce to N colors, no dither
 *   3. `cleanNearBlacks`  — seamless-wrap aware replacement of crushed
 *                           black pixels with the average of non-black
 *                           neighbors (or the darkest non-black palette
 *                           color as fallback)
 *
 * Ported from `scripts/clean-terrain-blacks.ts` and the texture chain
 * embedded in `scripts/gen-textures-v3.ts`.
 */

import sharp from 'sharp';

// =============================================================================
// Pixelate — downscale with nearest-neighbor
// =============================================================================

/**
 * Downscale `image` to `target` x `target` using a nearest-neighbor kernel
 * (the only filter that preserves chunky pixel blocks).
 */
export async function pixelateNearest(
  image: Buffer,
  target: number
): Promise<Buffer> {
  if (!Number.isInteger(target) || target <= 0) {
    throw new Error(`pixelateNearest: target must be a positive integer, got ${target}`);
  }
  return sharp(image)
    .resize(target, target, { kernel: sharp.kernel.nearest })
    .png()
    .toBuffer();
}

/** Nearest-neighbor upscale — keeps the palette crisp. */
export async function upscaleNearest(
  image: Buffer,
  target: number
): Promise<Buffer> {
  if (!Number.isInteger(target) || target <= 0) {
    throw new Error(`upscaleNearest: target must be a positive integer, got ${target}`);
  }
  return sharp(image)
    .resize(target, target, { kernel: sharp.kernel.nearest })
    .png()
    .toBuffer();
}

// =============================================================================
// Quantize — reduce palette
// =============================================================================

/**
 * Reduce `image` to at most `colors` palette entries without dithering.
 * sharp's PNG quantizer is the canonical retro-game tool for this.
 */
export async function quantizePalette(
  image: Buffer,
  colors: number
): Promise<Buffer> {
  if (!Number.isInteger(colors) || colors <= 0) {
    throw new Error(
      `quantizePalette: colors must be a positive integer, got ${colors}`
    );
  }
  return sharp(image).png({ palette: true, colours: colors, dither: 0 }).toBuffer();
}

// =============================================================================
// Black-pixel cleanup
// =============================================================================

export interface CleanNearBlacksOptions {
  /**
   * Pixels with R+G+B below this sum are replaced. Default 40 matches
   * `scripts/clean-terrain-blacks.ts`.
   */
  threshold?: number;
  /**
   * Whether to treat the image as seamlessly tileable when picking
   * neighbors. Default true — textures are always tiled.
   */
  seamless?: boolean;
}

export interface CleanNearBlacksResult {
  /** PNG buffer with crushed blacks replaced. */
  image: Buffer;
  /** How many pixels got rewritten. */
  replaced: number;
  /** Count of distinct non-black colors found in the source. */
  paletteSize: number;
}

/**
 * Replace near-black pixels with either (a) the average of non-black
 * neighbors or (b) the darkest non-black palette color when the pixel
 * sits in a solid black patch.
 */
export async function cleanNearBlacks(
  image: Buffer,
  opts: CleanNearBlacksOptions = {}
): Promise<CleanNearBlacksResult> {
  const threshold = opts.threshold ?? 40;
  const seamless = opts.seamless ?? true;

  const { data, info } = await sharp(image)
    .raw()
    .ensureAlpha()
    .toBuffer({ resolveWithObject: true });

  const pixels = new Uint8Array(data.byteLength);
  pixels.set(new Uint8Array(data.buffer, data.byteOffset, data.byteLength));
  const { width: w, height: h } = info;

  // First pass: collect non-black palette entries.
  const nonBlack: Array<[number, number, number]> = [];
  const seen = new Set<number>();
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i]!;
    const g = pixels[i + 1]!;
    const b = pixels[i + 2]!;
    if (r + g + b >= threshold) {
      const key = (r << 16) | (g << 8) | b;
      if (!seen.has(key)) {
        seen.add(key);
        nonBlack.push([r, g, b]);
      }
    }
  }

  if (nonBlack.length === 0) {
    // Nothing to replace with — return untouched.
    return {
      image: await sharp(Buffer.from(pixels), {
        raw: { width: w, height: h, channels: 4 },
      })
        .png()
        .toBuffer(),
      replaced: 0,
      paletteSize: 0,
    };
  }

  // Precompute darkest non-black color for the solid-black fallback.
  let darkest: [number, number, number] = nonBlack[0]!;
  let darkestBrightness = Infinity;
  for (const c of nonBlack) {
    const brightness = c[0]! + c[1]! + c[2]!;
    if (brightness < darkestBrightness) {
      darkestBrightness = brightness;
      darkest = c;
    }
  }

  let replaced = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i]!;
    const g = pixels[i + 1]!;
    const b = pixels[i + 2]!;
    if (r + g + b >= threshold) continue;

    // Find non-black neighbors. For textures we wrap (seamless).
    const px = (i / 4) % w;
    const py = Math.floor(i / 4 / w);
    let sumR = 0,
      sumG = 0,
      sumB = 0,
      n = 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        let nx = px + dx;
        let ny = py + dy;
        if (seamless) {
          nx = (nx + w) % w;
          ny = (ny + h) % h;
        } else {
          if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
        }
        const ni = (ny * w + nx) * 4;
        const nr = pixels[ni]!;
        const ng = pixels[ni + 1]!;
        const nb = pixels[ni + 2]!;
        if (nr + ng + nb >= threshold) {
          sumR += nr;
          sumG += ng;
          sumB += nb;
          n++;
        }
      }
    }

    if (n > 0) {
      pixels[i] = Math.round(sumR / n);
      pixels[i + 1] = Math.round(sumG / n);
      pixels[i + 2] = Math.round(sumB / n);
    } else {
      pixels[i] = darkest[0];
      pixels[i + 1] = darkest[1];
      pixels[i + 2] = darkest[2];
    }
    replaced++;
  }

  const out = await sharp(Buffer.from(pixels), {
    raw: { width: w, height: h, channels: 4 },
  })
    .png()
    .toBuffer();

  return { image: out, replaced, paletteSize: nonBlack.length };
}
