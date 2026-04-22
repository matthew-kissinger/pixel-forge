/**
 * Sprite pipeline tests.
 *
 * Uses fake providers so no network. Verifies:
 * - input shape validation (zod errors → PipelineInputInvalid)
 * - prompt suffix injection (default + override + bg color swap)
 * - routing: refs present → editWithRefs, none → generate
 * - BiRefNet skip when provider absent (warning emitted)
 * - chroma cleanup respects preserveFlash flag
 * - provider errors surface as PipelineStepFailed with .underlying
 */

import { describe, expect, test } from 'bun:test';
import sharp from 'sharp';

import {
  PipelineInputInvalid,
  PipelineStepFailed,
  ProviderRateLimited,
} from '../../../errors';
import { createSpritePipeline, DEFAULT_SPRITE_SUFFIX } from '../sprite';
import {
  FakeBgRemovalProvider,
  FakeImageProvider,
  solidColorPng,
} from './fakes';

async function magentaPng(): Promise<Buffer> {
  return solidColorPng(8, 8, [255, 0, 255]);
}

describe('sprite pipeline — input validation', () => {
  test('rejects empty prompt', async () => {
    const provider = new FakeImageProvider({ image: await magentaPng() });
    const sprite = createSpritePipeline({ imageProvider: provider });
    await expect(sprite.run({ prompt: '' })).rejects.toThrow(PipelineInputInvalid);
  });

  test('rejects unknown background color', async () => {
    const provider = new FakeImageProvider({ image: await magentaPng() });
    const sprite = createSpritePipeline({ imageProvider: provider });
    await expect(
      // @ts-expect-error — intentional bad input
      sprite.run({ prompt: 'rifle', background: 'red' })
    ).rejects.toBeInstanceOf(PipelineInputInvalid);
  });

  test('rejects unknown extra field (strict)', async () => {
    const provider = new FakeImageProvider({ image: await magentaPng() });
    const sprite = createSpritePipeline({ imageProvider: provider });
    await expect(
      // @ts-expect-error — intentional bad input
      sprite.run({ prompt: 'rifle', wat: true })
    ).rejects.toBeInstanceOf(PipelineInputInvalid);
  });
});

describe('sprite pipeline — prompt construction', () => {
  test('appends default suffix with magenta hex when no background given', async () => {
    const provider = new FakeImageProvider({ image: await magentaPng() });
    const sprite = createSpritePipeline({ imageProvider: provider });
    await sprite.run({ prompt: 'banana plant', runBiRefNet: false });
    expect(provider.lastPrompt.startsWith('banana plant, ')).toBe(true);
    expect(provider.lastPrompt).toContain('#FF00FF');
    expect(provider.lastPrompt).toContain('32-bit pixel art');
  });

  test('swaps in blue hex when background=blue', async () => {
    const blue = await solidColorPng(8, 8, [0, 0, 255]);
    const provider = new FakeImageProvider({ image: blue });
    const sprite = createSpritePipeline({ imageProvider: provider });
    await sprite.run({
      prompt: 'icon',
      background: 'blue',
      runBiRefNet: false,
    });
    expect(provider.lastPrompt).toContain('#0000FF');
    expect(provider.lastPrompt).not.toContain('#FF00FF');
  });

  test('uses styleSuffix override verbatim with bg substitution', async () => {
    const provider = new FakeImageProvider({ image: await magentaPng() });
    const sprite = createSpritePipeline({ imageProvider: provider });
    await sprite.run({
      prompt: 'rifle',
      styleSuffix: 'mock style on {BG_HEX} please',
      runBiRefNet: false,
    });
    expect(provider.lastPrompt).toBe('rifle, mock style on #FF00FF please');
  });

  test('default suffix string is exported', () => {
    expect(DEFAULT_SPRITE_SUFFIX).toContain('32-bit');
  });
});

describe('sprite pipeline — provider routing', () => {
  test('no refs → calls generate, not editWithRefs', async () => {
    const provider = new FakeImageProvider({ image: await magentaPng() });
    const sprite = createSpritePipeline({ imageProvider: provider });
    await sprite.run({ prompt: 'rifle', runBiRefNet: false });
    expect(provider.generateCalls).toBe(1);
    expect(provider.editWithRefsCalls).toBe(0);
  });

  test('with refs → calls editWithRefs', async () => {
    const provider = new FakeImageProvider({ image: await magentaPng() });
    const sprite = createSpritePipeline({ imageProvider: provider });
    const ref = await magentaPng();
    await sprite.run({ prompt: 'rifle', refs: [ref], runBiRefNet: false });
    expect(provider.editWithRefsCalls).toBe(1);
    expect(provider.generateCalls).toBe(0);
    expect(provider.lastRefs).toHaveLength(1);
  });
});

describe('sprite pipeline — bg-removal step', () => {
  test('warns and continues when runBiRefNet=true but no provider injected', async () => {
    const provider = new FakeImageProvider({ image: await magentaPng() });
    const sprite = createSpritePipeline({ imageProvider: provider });
    const out = await sprite.run({ prompt: 'rifle' });
    expect(out.meta.warnings.some((w) => /no bgRemovalProvider/.test(w))).toBe(true);
  });

  test('calls bg-removal provider when injected', async () => {
    const img = await magentaPng();
    const provider = new FakeImageProvider({ image: img });
    const bg = new FakeBgRemovalProvider({ image: img });
    const sprite = createSpritePipeline({
      imageProvider: provider,
      bgRemovalProvider: bg,
    });
    await sprite.run({ prompt: 'rifle' });
    expect(bg.removeCalls).toBe(1);
  });

  test('runBiRefNet=false skips even if provider injected', async () => {
    const img = await magentaPng();
    const provider = new FakeImageProvider({ image: img });
    const bg = new FakeBgRemovalProvider({ image: img });
    const sprite = createSpritePipeline({
      imageProvider: provider,
      bgRemovalProvider: bg,
    });
    await sprite.run({ prompt: 'rifle', runBiRefNet: false });
    expect(bg.removeCalls).toBe(0);
  });
});

describe('sprite pipeline — chroma cleanup', () => {
  test('chromaCleanup default true → final image has transparent magenta', async () => {
    const img = await magentaPng();
    const provider = new FakeImageProvider({ image: img });
    const sprite = createSpritePipeline({ imageProvider: provider });
    const out = await sprite.run({ prompt: 'rifle', runBiRefNet: false });
    expect(out.meta.chromaCleaned).toBeGreaterThan(0);
    // Decode and check the alphas.
    const { data } = await sharp(out.image).ensureAlpha().raw().toBuffer({
      resolveWithObject: true,
    });
    const arr = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    let zeroes = 0;
    for (let i = 3; i < arr.length; i += 4) if (arr[i] === 0) zeroes++;
    expect(zeroes).toBe(8 * 8); // every pixel was magenta → all zeroed
  });

  test('chromaCleanup=false leaves the image opaque', async () => {
    const img = await magentaPng();
    const provider = new FakeImageProvider({ image: img });
    const sprite = createSpritePipeline({ imageProvider: provider });
    const out = await sprite.run({
      prompt: 'rifle',
      runBiRefNet: false,
      chromaCleanup: false,
    });
    expect(out.meta.chromaCleaned).toBeUndefined();
  });

  test('preserveFlash retains yellow-orange pixels', async () => {
    // Image with one flash pixel and 63 magenta pixels.
    const raw = new Uint8Array(8 * 8 * 4);
    for (let i = 0; i < raw.length; i += 4) {
      raw[i] = 255;
      raw[i + 1] = 0;
      raw[i + 2] = 255;
      raw[i + 3] = 255;
    }
    raw[0] = 255;
    raw[1] = 180;
    raw[2] = 40; // muzzle flash
    const flashy = await sharp(Buffer.from(raw), {
      raw: { width: 8, height: 8, channels: 4 },
    })
      .png()
      .toBuffer();
    const provider = new FakeImageProvider({ image: flashy });
    const sprite = createSpritePipeline({ imageProvider: provider });
    const out = await sprite.run({
      prompt: 'rifle firing',
      preserveFlash: true,
      runBiRefNet: false,
    });
    const { data } = await sharp(out.image).ensureAlpha().raw().toBuffer({
      resolveWithObject: true,
    });
    const arr = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    expect(arr[3]).toBe(255); // flash pixel preserved
    expect(out.meta.chromaCleaned).toBe(63); // others zeroed
  });
});

describe('sprite pipeline — error wrapping', () => {
  test('image provider rate limit surfaces as PipelineStepFailed with structured underlying', async () => {
    const provider = new FakeImageProvider({
      image: await magentaPng(),
      rateLimitOnce: true,
    });
    const sprite = createSpritePipeline({ imageProvider: provider });
    try {
      await sprite.run({ prompt: 'rifle', runBiRefNet: false });
      throw new Error('expected throw');
    } catch (err) {
      expect(err).toBeInstanceOf(PipelineStepFailed);
      const wrapped = err as PipelineStepFailed;
      expect(wrapped.step).toBe('generate');
      expect(wrapped.pipeline).toBe('sprite');
      expect(wrapped.underlying).toBeInstanceOf(ProviderRateLimited);
      expect(wrapped.retryable).toBe(true);
    }
  });

  test('bg-removal failure wrapped at birefnet step', async () => {
    const img = await magentaPng();
    const provider = new FakeImageProvider({ image: img });
    const bg = new FakeBgRemovalProvider({
      image: img,
      throwOnCall: new Error('bg-removal blew up'),
    });
    const sprite = createSpritePipeline({
      imageProvider: provider,
      bgRemovalProvider: bg,
    });
    try {
      await sprite.run({ prompt: 'rifle' });
      throw new Error('expected throw');
    } catch (err) {
      expect(err).toBeInstanceOf(PipelineStepFailed);
      expect((err as PipelineStepFailed).step).toBe('birefnet');
    }
  });

  test('raw provider error gets adapted into a PipelineStepFailed', async () => {
    const provider = new FakeImageProvider({
      image: await magentaPng(),
      throwOnCall: new Error('boom'),
    });
    const sprite = createSpritePipeline({ imageProvider: provider });
    try {
      await sprite.run({ prompt: 'rifle', runBiRefNet: false });
      throw new Error('expected throw');
    } catch (err) {
      expect(err).toBeInstanceOf(PipelineStepFailed);
      const w = err as PipelineStepFailed;
      expect(w.underlying.message).toBe('boom');
    }
  });
});
