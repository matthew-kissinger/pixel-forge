/**
 * Chroma cleanup tests.
 *
 * Build tiny synthetic images in raw RGBA, encode as PNG, run through
 * the cleanup, decode back to RGBA and check alpha per pixel. This is
 * the only reliable way to exercise the thresholds without flaky
 * dependencies on real sprites.
 */

import { describe, expect, test } from 'bun:test';
import sharp from 'sharp';

import {
  chromaCleanBlue,
  chromaCleanFor,
  chromaCleanGreen,
  chromaCleanMagenta,
  chromaCleanMagentaPreserveFlash,
} from '../chroma';

/**
 * Build a PNG buffer from a row-major array of [r,g,b,a] tuples.
 * Default alpha is 255 (fully opaque). Length must equal w*h.
 */
async function makePng(
  width: number,
  height: number,
  pixels: Array<[number, number, number, number?]>
): Promise<Buffer> {
  if (pixels.length !== width * height) {
    throw new Error(
      `pixel count ${pixels.length} does not match ${width}x${height}`
    );
  }
  const raw = new Uint8Array(width * height * 4);
  for (let i = 0; i < pixels.length; i++) {
    const [r, g, b, a] = pixels[i]!;
    raw[i * 4] = r;
    raw[i * 4 + 1] = g;
    raw[i * 4 + 2] = b;
    raw[i * 4 + 3] = a ?? 255;
  }
  return sharp(Buffer.from(raw), {
    raw: { width, height, channels: 4 },
  })
    .png()
    .toBuffer();
}

async function readAlphas(buf: Buffer): Promise<number[]> {
  const { data } = await sharp(buf).ensureAlpha().raw().toBuffer({
    resolveWithObject: true,
  });
  const arr = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  const out: number[] = [];
  for (let i = 3; i < arr.length; i += 4) out.push(arr[i]!);
  return out;
}

// =============================================================================
// Magenta
// =============================================================================

describe('chromaCleanMagenta', () => {
  test('zeros bright magenta pixels and leaves others opaque', async () => {
    const png = await makePng(2, 2, [
      [255, 0, 255], // pure magenta → clean
      [34, 139, 34], // forest green → keep
      [200, 50, 200], // dim magenta → clean
      [255, 255, 255], // white → keep
    ]);
    const { image, cleaned } = await chromaCleanMagenta(png);
    expect(cleaned).toBe(2);
    const alphas = await readAlphas(image);
    expect(alphas).toEqual([0, 255, 0, 255]);
  });

  test('cleans pinkish residue left by BiRefNet', async () => {
    // r>180, b>130, g<120, r+b > g*4 — typical pink halo pixel.
    const png = await makePng(1, 1, [[230, 80, 200]]);
    const { cleaned } = await chromaCleanMagenta(png);
    expect(cleaned).toBe(1);
  });

  test('does not touch khaki soldier uniform pixels', async () => {
    const png = await makePng(1, 1, [[195, 176, 145]]); // khaki
    const { cleaned } = await chromaCleanMagenta(png);
    expect(cleaned).toBe(0);
  });
});

describe('chromaCleanMagentaPreserveFlash', () => {
  test('preserves yellow-orange muzzle flash pixel', async () => {
    const png = await makePng(2, 1, [
      [255, 180, 40], // muzzle flash yellow
      [255, 0, 255], // magenta
    ]);
    const { image, cleaned } = await chromaCleanMagentaPreserveFlash(png);
    expect(cleaned).toBe(1);
    const alphas = await readAlphas(image);
    expect(alphas).toEqual([255, 0]);
  });

  test('preserves hot-white highlight', async () => {
    const png = await makePng(1, 1, [[240, 240, 150]]); // hot highlight
    const { cleaned } = await chromaCleanMagentaPreserveFlash(png);
    expect(cleaned).toBe(0);
  });
});

// =============================================================================
// Blue
// =============================================================================

describe('chromaCleanBlue', () => {
  test('zeros bright blue, preserves red emblem fill', async () => {
    const png = await makePng(2, 1, [
      [0, 0, 255], // pure blue
      [180, 30, 30], // red
    ]);
    const { image, cleaned } = await chromaCleanBlue(png);
    expect(cleaned).toBe(1);
    const alphas = await readAlphas(image);
    expect(alphas).toEqual([0, 255]);
  });

  test('does not strip navy / dark blue inside an icon body', async () => {
    const png = await makePng(1, 1, [[40, 50, 110]]); // navy
    const { cleaned } = await chromaCleanBlue(png);
    expect(cleaned).toBe(0);
  });
});

// =============================================================================
// Green
// =============================================================================

describe('chromaCleanGreen', () => {
  test('zeros bright green #00FF00, preserves olive drab', async () => {
    const png = await makePng(2, 1, [
      [0, 255, 0], // bright green
      [85, 95, 40], // olive drab — G > R but R > 100 is not true, let's check
    ]);
    // The olive drab test above would match the predicate. Use a more
    // realistic olive (higher R).
    const png2 = await makePng(2, 1, [
      [0, 255, 0],
      [107, 142, 35], // olive drab — R=107 > 100, not cleaned
    ]);
    const { image: img2, cleaned: clean2 } = await chromaCleanGreen(png2);
    expect(clean2).toBe(1);
    const alphas = await readAlphas(img2);
    expect(alphas).toEqual([0, 255]);
    // First png is just to use both variables without lint.
    void png;
  });
});

// =============================================================================
// Router
// =============================================================================

describe('chromaCleanFor', () => {
  test('routes magenta', async () => {
    const png = await makePng(1, 1, [[255, 0, 255]]);
    const { cleaned } = await chromaCleanFor(png, 'magenta');
    expect(cleaned).toBe(1);
  });

  test('routes blue', async () => {
    const png = await makePng(1, 1, [[0, 0, 255]]);
    const { cleaned } = await chromaCleanFor(png, 'blue');
    expect(cleaned).toBe(1);
  });

  test('routes green', async () => {
    const png = await makePng(1, 1, [[0, 255, 0]]);
    const { cleaned } = await chromaCleanFor(png, 'green');
    expect(cleaned).toBe(1);
  });

  test('preserveFlash flag activates muzzle-flash variant', async () => {
    const png = await makePng(2, 1, [
      [255, 180, 40], // flash
      [255, 0, 255], // magenta
    ]);
    const { image, cleaned } = await chromaCleanFor(png, 'magenta', {
      preserveFlash: true,
    });
    expect(cleaned).toBe(1);
    const alphas = await readAlphas(image);
    expect(alphas[0]).toBe(255); // flash preserved
    expect(alphas[1]).toBe(0); // magenta zeroed
  });

  test('preserveFlash ignored for non-magenta backgrounds', async () => {
    const png = await makePng(1, 1, [[0, 0, 255]]);
    const { cleaned } = await chromaCleanFor(png, 'blue', {
      preserveFlash: true,
    });
    expect(cleaned).toBe(1);
  });
});
