/**
 * Texture-processing utility tests.
 *
 * Synthetic RGB buffers: cheap, deterministic, fast. Real FLUX outputs
 * aren't exercised here — that's integration.
 */

import { describe, expect, test } from 'bun:test';
import sharp from 'sharp';

import {
  cleanNearBlacks,
  pixelateNearest,
  quantizePalette,
  upscaleNearest,
} from '../texture-processing';

async function makePng(
  width: number,
  height: number,
  pixels: Array<[number, number, number]>
): Promise<Buffer> {
  if (pixels.length !== width * height) {
    throw new Error(`pixel count ${pixels.length} != ${width}x${height}`);
  }
  const raw = new Uint8Array(width * height * 4);
  for (let i = 0; i < pixels.length; i++) {
    const [r, g, b] = pixels[i]!;
    raw[i * 4] = r;
    raw[i * 4 + 1] = g;
    raw[i * 4 + 2] = b;
    raw[i * 4 + 3] = 255;
  }
  return sharp(Buffer.from(raw), { raw: { width, height, channels: 4 } })
    .png()
    .toBuffer();
}

async function info(buf: Buffer) {
  return sharp(buf).metadata();
}

async function pixels(buf: Buffer) {
  const { data } = await sharp(buf).raw().ensureAlpha().toBuffer({
    resolveWithObject: true,
  });
  return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
}

// =============================================================================
// pixelateNearest / upscaleNearest
// =============================================================================

describe('pixelateNearest', () => {
  test('produces target × target output', async () => {
    const solid = Array.from({ length: 64 * 64 }, () => [128, 128, 128] as [number, number, number]);
    const png = await makePng(64, 64, solid);
    const out = await pixelateNearest(png, 8);
    const meta = await info(out);
    expect(meta.width).toBe(8);
    expect(meta.height).toBe(8);
  });

  test('rejects non-positive target', async () => {
    const png = await makePng(1, 1, [[0, 0, 0]]);
    await expect(pixelateNearest(png, 0)).rejects.toThrow(/positive integer/);
    await expect(pixelateNearest(png, -4)).rejects.toThrow(/positive integer/);
  });
});

describe('upscaleNearest', () => {
  test('produces target × target output', async () => {
    const p = await makePng(4, 4, Array.from({ length: 16 }, () => [50, 100, 200] as [number, number, number]));
    const out = await upscaleNearest(p, 32);
    const meta = await info(out);
    expect(meta.width).toBe(32);
    expect(meta.height).toBe(32);
  });
});

// =============================================================================
// quantizePalette
// =============================================================================

describe('quantizePalette', () => {
  test('reduces color count down to cap', async () => {
    // Gradient: lots of unique colors.
    const grid: Array<[number, number, number]> = [];
    for (let i = 0; i < 64; i++) grid.push([i * 4, i * 4, 255 - i * 4]);
    const png = await makePng(8, 8, grid);
    const out = await quantizePalette(png, 4);
    const px = await pixels(out);
    const seen = new Set<number>();
    for (let i = 0; i < px.length; i += 4) {
      seen.add((px[i]! << 16) | (px[i + 1]! << 8) | px[i + 2]!);
    }
    // Quantizer may emit a few extra shades near edges, but should be
    // well below the 64 unique inputs.
    expect(seen.size).toBeLessThanOrEqual(8);
  });

  test('rejects zero palette size', async () => {
    const png = await makePng(1, 1, [[0, 0, 0]]);
    await expect(quantizePalette(png, 0)).rejects.toThrow();
  });
});

// =============================================================================
// cleanNearBlacks
// =============================================================================

describe('cleanNearBlacks', () => {
  test('replaces one black pixel in a sea of green with green neighbors', async () => {
    const green: [number, number, number] = [50, 160, 60];
    const grid: Array<[number, number, number]> = [];
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        grid.push(x === 1 && y === 1 ? [0, 0, 0] : green);
      }
    }
    const png = await makePng(4, 4, grid);
    const { image, replaced, paletteSize } = await cleanNearBlacks(png);
    expect(replaced).toBe(1);
    expect(paletteSize).toBe(1);

    const px = await pixels(image);
    // The black pixel (index 1,1 = pixel 5) should now be ~green.
    const i = (1 * 4 + 1) * 4;
    expect(px[i]).toBe(50);
    expect(px[i + 1]).toBe(160);
    expect(px[i + 2]).toBe(60);
  });

  test('returns image untouched when no non-black pixels exist', async () => {
    const grid: Array<[number, number, number]> = Array.from(
      { length: 4 * 4 },
      () => [0, 0, 0]
    );
    const png = await makePng(4, 4, grid);
    const { replaced, paletteSize } = await cleanNearBlacks(png);
    expect(replaced).toBe(0);
    expect(paletteSize).toBe(0);
  });

  test('threshold option controls what counts as black', async () => {
    const grid: Array<[number, number, number]> = [
      [20, 10, 5], // sum=35
      [90, 80, 70],
      [90, 80, 70],
      [90, 80, 70],
    ];
    const png = await makePng(2, 2, grid);
    // Default threshold 40 → first pixel is "black" → replaced.
    const def = await cleanNearBlacks(png);
    expect(def.replaced).toBe(1);
    // threshold=30 → first pixel (sum=35) is no longer black → nothing replaced.
    const lower = await cleanNearBlacks(png, { threshold: 30 });
    expect(lower.replaced).toBe(0);
  });

  test('seamless wrap uses neighbors on the opposite edge', async () => {
    // 2x2: top-left black, rest red. Seamless wraps neighbors around.
    const grid: Array<[number, number, number]> = [
      [0, 0, 0],
      [200, 40, 40],
      [200, 40, 40],
      [200, 40, 40],
    ];
    const png = await makePng(2, 2, grid);
    const { replaced } = await cleanNearBlacks(png, { seamless: true });
    expect(replaced).toBe(1);
    const { replaced: nonseam } = await cleanNearBlacks(png, {
      seamless: false,
    });
    expect(nonseam).toBe(1);
  });

  test('uses darkest non-black color when surrounded entirely by black', async () => {
    // 4x4 grid: 3 black in a row, 1 bright elsewhere far away.
    const grid: Array<[number, number, number]> = Array.from(
      { length: 16 },
      () => [0, 0, 0] as [number, number, number]
    );
    grid[15] = [250, 250, 250];
    // disable seamless so wrap doesn't find (15) as neighbor of (0)
    const png = await makePng(4, 4, grid);
    const { replaced } = await cleanNearBlacks(png, { seamless: false });
    // All 15 black pixels should be replaced; in isolated patches they
    // fall back to the darkest non-black (which is also the only one here).
    expect(replaced).toBe(15);
  });
});
