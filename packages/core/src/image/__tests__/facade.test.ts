/**
 * Image facade unit tests.
 *
 * Pure-logic tests against the routing facade with stub providers — no
 * network. Verifies:
 * - Text-only → gemini stub.
 * - With refs → openai stub.
 * - Schema validation kicks bad input to a structured error.
 * - Auto-fallback hands off to the alternate provider on a retryable error.
 * - Explicit `preferProvider` bypasses the auto-route.
 */

import { describe, expect, test, mock } from 'bun:test';

import { capabilitiesFor } from '../../capabilities';
import {
  isPixelForgeError,
  ProviderNetworkError,
  SchemaValidationFailed,
} from '../../errors';
import type { ImageProvider } from '../../providers';
import { createImageGen } from '../facade';

const geminiCaps = capabilitiesFor('gemini')!;
const openaiCaps = capabilitiesFor('openai')!;

function stubGemini(opts?: { fail?: boolean }): ImageProvider {
  return {
    id: 'gemini',
    capabilities: geminiCaps,
    generate: mock(async (input) => {
      if (opts?.fail) {
        throw new ProviderNetworkError({
          provider: 'gemini',
          message: 'network down',
        });
      }
      return {
        image: Buffer.from(`gemini:${input.prompt}`),
        provider: 'gemini' as const,
        model: 'gemini-3.1-flash-image-preview',
        meta: { latencyMs: 12, warnings: [] },
      };
    }),
    editWithRefs: mock(async (input) => {
      return {
        image: Buffer.from(`gemini-edit:${input.prompt}:${input.refs.length}`),
        provider: 'gemini' as const,
        model: 'gemini-3.1-flash-image-preview',
        meta: { latencyMs: 14, warnings: [] },
      };
    }),
  };
}

function stubOpenai(opts?: { fail?: boolean }): ImageProvider {
  return {
    id: 'openai',
    capabilities: openaiCaps,
    generate: mock(async (input) => {
      if (opts?.fail) {
        throw new ProviderNetworkError({
          provider: 'openai',
          message: 'openai down',
        });
      }
      return {
        image: Buffer.from(`openai:${input.prompt}`),
        provider: 'openai' as const,
        model: 'gpt-image-1.5',
        meta: { latencyMs: 30, warnings: [] },
      };
    }),
    editWithRefs: mock(async (input) => {
      if (opts?.fail) {
        throw new ProviderNetworkError({
          provider: 'openai',
          message: 'openai edit down',
        });
      }
      return {
        image: Buffer.from(`openai-edit:${input.prompt}:${input.refs.length}`),
        provider: 'openai' as const,
        model: 'gpt-image-2',
        meta: { latencyMs: 100, warnings: [] },
      };
    }),
  };
}

describe('createImageGen — routing', () => {
  test('text-only routes to gemini', async () => {
    const gemini = stubGemini();
    const openai = stubOpenai();
    const facade = createImageGen({ providers: { gemini, openai } });

    const out = await facade.generate({ prompt: 'a happy frog' });

    expect(out.provider).toBe('gemini');
    expect(out.image.toString()).toBe('gemini:a happy frog');
    expect(gemini.generate).toHaveBeenCalled();
    expect(openai.generate).not.toHaveBeenCalled();
  });

  test('with refs routes to openai (gpt-image-2)', async () => {
    const gemini = stubGemini();
    const openai = stubOpenai();
    const facade = createImageGen({ providers: { gemini, openai } });

    const out = await facade.generate({
      prompt: 'NVA soldier walking',
      refs: [Buffer.from('ref1'), Buffer.from('ref2')],
    });

    expect(out.provider).toBe('openai');
    expect(out.image.toString()).toBe('openai-edit:NVA soldier walking:2');
    expect(openai.editWithRefs).toHaveBeenCalled();
    expect(gemini.editWithRefs).not.toHaveBeenCalled();
  });

  test('explicit provider override bypasses routing', async () => {
    const gemini = stubGemini();
    const openai = stubOpenai();
    const facade = createImageGen({ providers: { gemini, openai } });

    const out = await facade.generate({
      prompt: 'a test',
      provider: 'openai',
    });

    expect(out.provider).toBe('openai');
    expect(openai.generate).toHaveBeenCalled();
  });
});

describe('createImageGen — error handling', () => {
  test('bad input throws SchemaValidationFailed', async () => {
    const facade = createImageGen({ providers: {} });
    await expect(
      facade.generate({ prompt: '' }),
    ).rejects.toBeInstanceOf(SchemaValidationFailed);
  });

  test('failure with no fallback throws the underlying error', async () => {
    const gemini = stubGemini({ fail: true });
    const openai = stubOpenai({ fail: true });
    const facade = createImageGen({
      providers: { gemini, openai },
      allowFallback: false,
    });

    try {
      await facade.generate({ prompt: 'will fail' });
      throw new Error('should have thrown');
    } catch (err) {
      expect(isPixelForgeError(err)).toBe(true);
      expect((err as Error).message).toContain('network down');
    }
  });

  test('auto-fallback hands off to openai when gemini fails', async () => {
    const gemini = stubGemini({ fail: true });
    const openai = stubOpenai();
    const facade = createImageGen({ providers: { gemini, openai } });

    const out = await facade.generate({ prompt: 'fall back please' });

    expect(out.provider).toBe('openai');
    expect(out.meta.warnings.some((w) => w.includes('fell back'))).toBe(true);
    expect(openai.generate).toHaveBeenCalled();
  });
});
