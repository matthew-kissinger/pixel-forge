/**
 * Chroma-key cleanup utilities.
 *
 * Every sprite pipeline in Pixel Forge generates on a solid bright
 * background (magenta, blue, or green) and strips it after the main AI
 * call. BiRefNet alone leaves residual edge pixels of the chroma color,
 * so we follow it with a direct chroma key pass.
 *
 * These functions accept a PNG buffer, decode it with sharp, walk the
 * raw RGBA pixels, and zero the alpha channel on matching pixels.
 * They return a fresh PNG buffer.
 *
 * Thresholds are tuned from the 48 live scripts under `scripts/` — see
 * `gen-vegetation-redo.ts`, `gen-nva-frontfire-fix.ts`,
 * `gen-faction-icons-fix.ts`, and `gen-ui-icons.ts` for the original
 * copies.
 */

import sharp from 'sharp';

// =============================================================================
// Shared decode/encode
// =============================================================================

interface DecodedImage {
  pixels: Uint8Array;
  width: number;
  height: number;
}

async function decodeRgba(input: Buffer): Promise<DecodedImage> {
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  // sharp returns a Buffer backed by a larger underlying ArrayBuffer. Clone
  // into a tight Uint8Array so mutations don't reach into other buffers.
  const pixels = new Uint8Array(data.byteLength);
  pixels.set(new Uint8Array(data.buffer, data.byteOffset, data.byteLength));
  return { pixels, width: info.width, height: info.height };
}

async function encodePng(img: DecodedImage): Promise<Buffer> {
  return sharp(Buffer.from(img.pixels), {
    raw: { width: img.width, height: img.height, channels: 4 },
  })
    .png()
    .toBuffer();
}

/** Cleanup statistics returned by every chroma function. */
export interface ChromaResult {
  /** PNG buffer with chroma pixels zeroed to alpha=0. */
  image: Buffer;
  /** Count of pixels the cleanup zeroed. Useful for tests + telemetry. */
  cleaned: number;
}

// =============================================================================
// Magenta — the workhorse background
// =============================================================================

/**
 * Strip bright magenta pixels (high R, low G, high B) to transparent.
 *
 * Matches both the classic magenta chroma and lingering pinkish edge
 * pixels BiRefNet tends to leave. Tuned from `gen-vegetation-redo.ts`
 * (the reference implementation) and `gen-nva-soldiers.ts`.
 */
export async function chromaCleanMagenta(
  image: Buffer,
  opts: { tolerance?: number } = {}
): Promise<ChromaResult> {
  const tolerance = opts.tolerance ?? 60;
  const img = await decodeRgba(image);
  const px = img.pixels;
  let cleaned = 0;

  for (let i = 0; i < px.length; i += 4) {
    const r = px[i]!;
    const g = px[i + 1]!;
    const b = px[i + 2]!;

    const isMagenta =
      r > 150 && b > 150 && g < 100 && Math.abs(r - b) < tolerance;
    const isPinkish =
      r > 180 && b > 130 && g < 120 && r + b > g * 4;

    if (isMagenta || isPinkish) {
      px[i + 3] = 0;
      cleaned++;
    }
  }

  return { image: await encodePng(img), cleaned };
}

/**
 * Magenta cleanup that preserves yellow/orange muzzle-flash pixels.
 *
 * Used on firing-pose sprites where BiRefNet + plain chroma key otherwise
 * eats the flash. Ported from `scripts/gen-nva-frontfire-fix.ts`.
 */
export async function chromaCleanMagentaPreserveFlash(
  image: Buffer,
  opts: { tolerance?: number } = {}
): Promise<ChromaResult> {
  const tolerance = opts.tolerance ?? 60;
  const img = await decodeRgba(image);
  const px = img.pixels;
  let cleaned = 0;

  for (let i = 0; i < px.length; i += 4) {
    const r = px[i]!;
    const g = px[i + 1]!;
    const b = px[i + 2]!;

    // Preserve muzzle flash — yellow/orange + hot-white.
    if (r > 180 && g > 120 && b < 80) continue;
    if (r > 200 && g > 200 && b > 100) continue;

    const isMagenta =
      r > 150 && b > 150 && g < 100 && Math.abs(r - b) < tolerance;
    const isPinkish =
      r > 180 && b > 130 && g < 120 && r + b > g * 4;

    if (isMagenta || isPinkish) {
      px[i + 3] = 0;
      cleaned++;
    }
  }

  return { image: await encodePng(img), cleaned };
}

// =============================================================================
// Blue — command icons + colored emblems
// =============================================================================

/**
 * Strip bright blue pixels (low R, low G, high B) to transparent.
 *
 * Ported from `scripts/gen-ui-icons.ts`. Used on command/emblem icons
 * where magenta would collide with red/faction colors.
 */
export async function chromaCleanBlue(
  image: Buffer
): Promise<ChromaResult> {
  const img = await decodeRgba(image);
  const px = img.pixels;
  let cleaned = 0;

  for (let i = 0; i < px.length; i += 4) {
    const r = px[i]!;
    const g = px[i + 1]!;
    const b = px[i + 2]!;

    if (b > 130 && r < 100 && g < 100) {
      px[i + 3] = 0;
      cleaned++;
    }
  }

  return { image: await encodePng(img), cleaned };
}

// =============================================================================
// Green — faction insignia
// =============================================================================

/**
 * Strip bright green pixels (low R, high G, low B) to transparent.
 *
 * Ported from `scripts/gen-faction-icons-fix.ts`. Bright green avoids the
 * olive drab / dark green that appears *inside* faction emblems, so this
 * variant cleans only the true #00FF00 background without nibbling the
 * subject.
 */
export async function chromaCleanGreen(
  image: Buffer
): Promise<ChromaResult> {
  const img = await decodeRgba(image);
  const px = img.pixels;
  let cleaned = 0;

  for (let i = 0; i < px.length; i += 4) {
    const r = px[i]!;
    const g = px[i + 1]!;
    const b = px[i + 2]!;

    if (g > 180 && r < 100 && b < 100) {
      px[i + 3] = 0;
      cleaned++;
    }
  }

  return { image: await encodePng(img), cleaned };
}

// =============================================================================
// Router — pick the right cleanup for a background color
// =============================================================================

export type ChromaBackground = 'magenta' | 'blue' | 'green';

/**
 * Route to the correct chroma cleanup for a named background color.
 *
 * `preserveFlash` is only honored for magenta and silently ignored for
 * other backgrounds (those are used for static icons where the muzzle
 * flash concept doesn't apply).
 */
export async function chromaCleanFor(
  image: Buffer,
  background: ChromaBackground,
  opts: { preserveFlash?: boolean } = {}
): Promise<ChromaResult> {
  switch (background) {
    case 'magenta':
      return opts.preserveFlash
        ? chromaCleanMagentaPreserveFlash(image)
        : chromaCleanMagenta(image);
    case 'blue':
      return chromaCleanBlue(image);
    case 'green':
      return chromaCleanGreen(image);
  }
}
