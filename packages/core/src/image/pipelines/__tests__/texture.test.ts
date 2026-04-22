/**
 * Texture pipeline tests.
 */

import { describe, expect, test } from 'bun:test';
import sharp from 'sharp';

import { PipelineInputInvalid, PipelineStepFailed } from '../../../errors';
import { createTexturePipeline } from '../texture';
import { FakeTextureProvider, solidColorPng } from './fakes';

async function dirtPng(): Promise<Buffer> {
  // 64x64 of speckled brown — pixelate + quantize will compress this.
  const w = 64,
    h = 64;
  const raw = new Uint8Array(w * h * 4);
  for (let i = 0; i < raw.length; i += 4) {
    const noise = (i * 37) % 30;
    raw[i] = 100 + noise; // R
    raw[i + 1] = 60 + noise; // G
    raw[i + 2] = 30 + (noise >> 1); // B
    raw[i + 3] = 255;
  }
  return sharp(Buffer.from(raw), { raw: { width: w, height: h, channels: 4 } })
    .png()
    .toBuffer();
}

describe('texture pipeline — input validation', () => {
  test('rejects empty description', async () => {
    const provider = new FakeTextureProvider({ image: await dirtPng() });
    const tex = createTexturePipeline({ textureProvider: provider });
    await expect(tex.run({ description: '' })).rejects.toBeInstanceOf(
      PipelineInputInvalid
    );
  });

  test('rejects bogus extra field', async () => {
    const provider = new FakeTextureProvider({ image: await dirtPng() });
    const tex = createTexturePipeline({ textureProvider: provider });
    await expect(
      // @ts-expect-error — strict schema rejects unknown field
      tex.run({ description: 'mud', wat: 1 })
    ).rejects.toBeInstanceOf(PipelineInputInvalid);
  });
});

describe('texture pipeline — happy path', () => {
  test('runs all five stages and emits 512x512 by default', async () => {
    const provider = new FakeTextureProvider({ image: await dirtPng() });
    const tex = createTexturePipeline({ textureProvider: provider });
    const out = await tex.run({ description: 'jungle floor' });
    expect(provider.generateCalls).toBe(1);
    expect(provider.lastPrompt).toBe('jungle floor');
    expect(out.meta.size).toBe(512);
    const meta = await sharp(out.image).metadata();
    expect(meta.width).toBe(512);
    expect(meta.height).toBe(512);
    expect(out.meta.paletteSize).toBeGreaterThanOrEqual(1);
  });

  test('honors size override', async () => {
    const provider = new FakeTextureProvider({ image: await dirtPng() });
    const tex = createTexturePipeline({ textureProvider: provider });
    const out = await tex.run({ description: 'mud', size: 256 });
    expect(out.meta.size).toBe(256);
    const meta = await sharp(out.image).metadata();
    expect(meta.width).toBe(256);
  });

  test('skips pixelate when pixelate=false', async () => {
    const provider = new FakeTextureProvider({ image: await dirtPng() });
    const tex = createTexturePipeline({ textureProvider: provider });
    const out = await tex.run({ description: 'mud', pixelate: false });
    // No assertion on internals, but it must still complete + size matches.
    expect(out.meta.size).toBe(512);
  });

  test('skips palette quantize when paletteColors=0', async () => {
    const provider = new FakeTextureProvider({ image: await dirtPng() });
    const tex = createTexturePipeline({ textureProvider: provider });
    const out = await tex.run({ description: 'mud', paletteColors: 0 });
    expect(out.meta.size).toBe(512);
  });

  test('skips black cleanup when blackCleanup=false', async () => {
    const provider = new FakeTextureProvider({ image: await dirtPng() });
    const tex = createTexturePipeline({ textureProvider: provider });
    const out = await tex.run({ description: 'mud', blackCleanup: false });
    expect(out.meta.blackPixelsReplaced).toBeUndefined();
  });

  test('reports cost from provider', async () => {
    const provider = new FakeTextureProvider({ image: await dirtPng() });
    const tex = createTexturePipeline({ textureProvider: provider });
    const out = await tex.run({ description: 'mud' });
    expect(out.meta.costUsd).toBeCloseTo(0.002, 5);
  });
});

describe('texture pipeline — error wrapping', () => {
  test('FLUX provider error wrapped at flux-generate step', async () => {
    const provider = new FakeTextureProvider({
      image: await dirtPng(),
      throwOnCall: new Error('flux down'),
    });
    const tex = createTexturePipeline({ textureProvider: provider });
    try {
      await tex.run({ description: 'mud' });
      throw new Error('expected throw');
    } catch (err) {
      expect(err).toBeInstanceOf(PipelineStepFailed);
      expect((err as PipelineStepFailed).step).toBe('flux-generate');
      expect((err as PipelineStepFailed).pipeline).toBe('texture');
    }
  });
});
