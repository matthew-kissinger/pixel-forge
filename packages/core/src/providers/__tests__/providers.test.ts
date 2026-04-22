/**
 * Live provider smoke tests (W3a.6).
 *
 * Gated on `IMAGE_PROVIDERS_LIVE=1` — skipped by default to keep CI free of
 * network and budget. When enabled, sends one cheap text-to-image generation
 * to each implemented provider and asserts a non-empty Buffer comes back.
 *
 * Budget envelope: 3-4 generations per full run, ~$0.30 max.
 *
 * Usage:
 *   IMAGE_PROVIDERS_LIVE=1 GEMINI_API_KEY=... OPENAI_API_KEY=... bun test
 */

import { describe, expect, test } from 'bun:test';

import { createGeminiProvider, createOpenAIProvider } from '../index';

const LIVE = process.env['IMAGE_PROVIDERS_LIVE'] === '1';
const HAS_GEMINI = !!process.env['GEMINI_API_KEY'];
const HAS_OPENAI = !!process.env['OPENAI_API_KEY'];

const PROMPT = 'a small red apple, 32-bit pixel art sprite, flat solid magenta background';

describe('live provider smoke tests', () => {
  test.skipIf(!LIVE || !HAS_GEMINI)('gemini.generate emits a Buffer', async () => {
    const provider = createGeminiProvider();
    const out = await provider.generate({
      prompt: PROMPT,
    });
    expect(out.image).toBeInstanceOf(Buffer);
    expect(out.image.length).toBeGreaterThan(1024);
    expect(out.provider).toBe('gemini');
    expect(out.meta.latencyMs).toBeGreaterThan(0);
  }, 90_000);

  test.skipIf(!LIVE || !HAS_OPENAI)(
    'openai.generate (gpt-image-1.5) emits a Buffer',
    async () => {
      const provider = createOpenAIProvider();
      const out = await provider.generate({
        prompt: PROMPT,
      });
      expect(out.image).toBeInstanceOf(Buffer);
      expect(out.image.length).toBeGreaterThan(1024);
      expect(out.provider).toBe('openai');
      expect(out.model).toBe('gpt-image-1.5');
    },
    240_000,
  );

  test.skipIf(!LIVE || !HAS_OPENAI)(
    'openai.editWithRefs (gpt-image-2) accepts a single ref',
    async () => {
      const provider = createOpenAIProvider();
      // Cheap PNG to use as a reference: 1x1 magenta.
      const ref = Buffer.from(
        '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c63f80fd0ff1f0000060005003ec64f1f0000000049454e44ae426082',
        'hex',
      );
      const out = await provider.editWithRefs({
        prompt: PROMPT,
        refs: [ref],
      });
      expect(out.image).toBeInstanceOf(Buffer);
      expect(out.image.length).toBeGreaterThan(1024);
      expect(out.provider).toBe('openai');
    },
    240_000,
  );

  test.skipIf(LIVE)('skipped by default (set IMAGE_PROVIDERS_LIVE=1)', () => {
    expect(LIVE).toBe(false);
  });
});
