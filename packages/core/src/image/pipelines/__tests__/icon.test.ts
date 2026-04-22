/**
 * Icon pipeline tests.
 */

import { describe, expect, test } from 'bun:test';

import { PipelineInputInvalid, PipelineStepFailed } from '../../../errors';
import {
  COLORED_ICON_STYLE,
  createIconPipeline,
  MONO_ICON_STYLE,
} from '../icon';
import { FakeImageProvider, solidColorPng } from './fakes';

describe('icon pipeline — input validation', () => {
  test('rejects missing variant', async () => {
    const provider = new FakeImageProvider({
      image: await solidColorPng(8, 8, [255, 0, 255]),
    });
    const icon = createIconPipeline({ imageProvider: provider });
    await expect(
      // @ts-expect-error — missing variant
      icon.run({ prompt: 'rifle' })
    ).rejects.toBeInstanceOf(PipelineInputInvalid);
  });

  test('rejects unknown variant value', async () => {
    const provider = new FakeImageProvider({
      image: await solidColorPng(8, 8, [255, 0, 255]),
    });
    const icon = createIconPipeline({ imageProvider: provider });
    await expect(
      // @ts-expect-error — bad variant
      icon.run({ prompt: 'rifle', variant: 'cartoon' })
    ).rejects.toBeInstanceOf(PipelineInputInvalid);
  });
});

describe('icon pipeline — mono variant', () => {
  test('uses MONO style suffix and magenta bg', async () => {
    const img = await solidColorPng(8, 8, [255, 0, 255]);
    const provider = new FakeImageProvider({ image: img });
    const icon = createIconPipeline({ imageProvider: provider });
    const out = await icon.run({ prompt: 'rifle', variant: 'mono' });
    expect(provider.lastPrompt).toContain('solid white filled silhouette');
    expect(provider.lastPrompt).toContain('#FF00FF');
    expect(out.meta.variant).toBe('mono');
    expect(out.meta.chromaCleaned).toBe(64); // every pixel was magenta
  });

  test('mono style constant is exported', () => {
    expect(MONO_ICON_STYLE).toContain('solid white');
  });
});

describe('icon pipeline — colored variant', () => {
  test('uses COLORED style suffix and blue bg', async () => {
    const blue = await solidColorPng(8, 8, [0, 0, 255]);
    const provider = new FakeImageProvider({ image: blue });
    const icon = createIconPipeline({ imageProvider: provider });
    const out = await icon.run({ prompt: 'us emblem', variant: 'colored' });
    expect(provider.lastPrompt).toContain('thick 3-pixel black outline');
    expect(provider.lastPrompt).toContain('#0000FF');
    expect(out.meta.variant).toBe('colored');
    expect(out.meta.chromaCleaned).toBe(64);
  });

  test('colored style constant is exported', () => {
    expect(COLORED_ICON_STYLE).toContain('thick 3-pixel black outline');
  });
});

describe('icon pipeline — refs routing', () => {
  test('with refs → editWithRefs', async () => {
    const img = await solidColorPng(8, 8, [255, 0, 255]);
    const provider = new FakeImageProvider({ image: img });
    const icon = createIconPipeline({ imageProvider: provider });
    await icon.run({
      prompt: 'rifle',
      variant: 'mono',
      refs: [img, img],
    });
    expect(provider.editWithRefsCalls).toBe(1);
    expect(provider.lastRefs).toHaveLength(2);
  });

  test('no refs → generate', async () => {
    const img = await solidColorPng(8, 8, [255, 0, 255]);
    const provider = new FakeImageProvider({ image: img });
    const icon = createIconPipeline({ imageProvider: provider });
    await icon.run({ prompt: 'rifle', variant: 'mono' });
    expect(provider.generateCalls).toBe(1);
  });
});

describe('icon pipeline — error wrapping', () => {
  test('provider error wrapped at generate step', async () => {
    const provider = new FakeImageProvider({
      image: await solidColorPng(8, 8, [255, 0, 255]),
      throwOnCall: new Error('icon provider died'),
    });
    const icon = createIconPipeline({ imageProvider: provider });
    try {
      await icon.run({ prompt: 'rifle', variant: 'mono' });
      throw new Error('expected throw');
    } catch (err) {
      expect(err).toBeInstanceOf(PipelineStepFailed);
      expect((err as PipelineStepFailed).step).toBe('generate');
      expect((err as PipelineStepFailed).pipeline).toBe('icon');
    }
  });
});
