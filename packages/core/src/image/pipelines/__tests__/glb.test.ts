/**
 * GLB pipeline tests — uses an injected fake `generate` to skip Claude SDK.
 */

import { describe, expect, test } from 'bun:test';

import { PipelineInputInvalid, PipelineStepFailed } from '../../../errors';
import type { KilnGenerateOptions, KilnGenerateOutput } from '../../../kiln';
import { createGlbPipeline } from '../glb';

function fakeGenerate(opts?: {
  throws?: Error;
  capture?: { prompt?: string; opts?: KilnGenerateOptions };
}) {
  return async (prompt: string, generateOpts: KilnGenerateOptions = {}) => {
    if (opts?.capture) {
      opts.capture.prompt = prompt;
      opts.capture.opts = generateOpts;
    }
    if (opts?.throws) throw opts.throws;
    const out: KilnGenerateOutput = {
      code: 'function build() {}',
      glb: Buffer.from([0x67, 0x6c, 0x54, 0x46]), // 'glTF' magic
      meta: { name: 'fake', tris: 0, parts: [], animations: [] } as unknown as KilnGenerateOutput['meta'],
      warnings: [],
    };
    return out;
  };
}

describe('glb pipeline — input validation', () => {
  test('rejects empty prompt', async () => {
    const glb = createGlbPipeline({ generate: fakeGenerate() });
    await expect(glb.run({ prompt: '' })).rejects.toBeInstanceOf(
      PipelineInputInvalid
    );
  });

  test('rejects bogus extra field', async () => {
    const glb = createGlbPipeline({ generate: fakeGenerate() });
    await expect(
      // @ts-expect-error — strict schema rejects unknown field
      glb.run({ prompt: 'truck', wat: true })
    ).rejects.toBeInstanceOf(PipelineInputInvalid);
  });
});

describe('glb pipeline — happy path', () => {
  test('forwards prompt + options to kiln.generate and returns its output', async () => {
    const capture: { prompt?: string; opts?: KilnGenerateOptions } = {};
    const glb = createGlbPipeline({ generate: fakeGenerate({ capture }) });
    const out = await glb.run({
      prompt: 'a green truck',
      style: 'low-poly',
      includeAnimation: false,
    });
    expect(capture.prompt).toBe('a green truck');
    expect(capture.opts?.style).toBe('low-poly');
    expect(capture.opts?.includeAnimation).toBe(false);
    expect(out.glb).toBeInstanceOf(Buffer);
    expect(out.code).toBe('function build() {}');
  });

  test("category 'vehicle' / 'building' / 'weapon' fold to 'prop'", async () => {
    const capture: { prompt?: string; opts?: KilnGenerateOptions } = {};
    const glb = createGlbPipeline({ generate: fakeGenerate({ capture }) });
    await glb.run({ prompt: 'truck', category: 'vehicle' });
    expect(capture.opts?.category).toBe('prop');
    await glb.run({ prompt: 'bunker', category: 'building' });
    expect(capture.opts?.category).toBe('prop');
    await glb.run({ prompt: 'rifle', category: 'weapon' });
    expect(capture.opts?.category).toBe('prop');
  });

  test("category 'character' / 'vfx' / 'environment' pass through", async () => {
    const capture: { prompt?: string; opts?: KilnGenerateOptions } = {};
    const glb = createGlbPipeline({ generate: fakeGenerate({ capture }) });
    await glb.run({ prompt: 'soldier', category: 'character' });
    expect(capture.opts?.category).toBe('character');
    await glb.run({ prompt: 'flames', category: 'vfx' });
    expect(capture.opts?.category).toBe('vfx');
  });

  test('default category is prop', async () => {
    const capture: { prompt?: string; opts?: KilnGenerateOptions } = {};
    const glb = createGlbPipeline({ generate: fakeGenerate({ capture }) });
    await glb.run({ prompt: 'truck' });
    expect(capture.opts?.category).toBe('prop');
  });
});

describe('glb pipeline — error wrapping', () => {
  test('kiln.generate throw wrapped at kiln-generate step', async () => {
    const glb = createGlbPipeline({
      generate: fakeGenerate({ throws: new Error('claude offline') }),
    });
    try {
      await glb.run({ prompt: 'truck' });
      throw new Error('expected throw');
    } catch (err) {
      expect(err).toBeInstanceOf(PipelineStepFailed);
      expect((err as PipelineStepFailed).step).toBe('kiln-generate');
      expect((err as PipelineStepFailed).pipeline).toBe('glb');
    }
  });
});
