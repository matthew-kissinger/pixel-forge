/**
 * Capability routing tests (W3a.6).
 *
 * Pure-logic exercise of `pickProviderFor()` and the facade's auto-routing.
 * No live API calls — these run on every commit. Live-gated provider smoke
 * tests live in `providers.test.ts`.
 */

import { describe, expect, test } from 'bun:test';

import {
  capabilities,
  capabilitiesFor,
  capabilitiesForKind,
  pickProviderFor,
} from '../../capabilities';

describe('pickProviderFor — code-gen', () => {
  test('default → anthropic opus 4.7', () => {
    const r = pickProviderFor({ kind: 'code-gen' });
    expect(r.provider).toBe('anthropic');
    expect(r.model).toBe('claude-opus-4-7');
    expect(r.reason).toContain('Opus 4.7');
  });

  test('preferCheap → sonnet 4.6', () => {
    const r = pickProviderFor({ kind: 'code-gen', preferCheap: true });
    expect(r.provider).toBe('anthropic');
    expect(r.model).toBe('claude-sonnet-4-6');
    expect(r.reason).toContain('sonnet');
  });
});

describe('pickProviderFor — texture', () => {
  test('returns FAL flux-lora as the current Seamless LoRA-compatible default', () => {
    const r = pickProviderFor({ kind: 'texture' });
    expect(r.provider).toBe('fal');
    expect(r.model).toBe('fal-ai/flux-lora');
    expect(r.reason).toContain('FLUX 2 compatible');
  });
});

describe('pickProviderFor — bg-removal', () => {
  test('returns FAL BiRefNet as the only registered model', () => {
    const r = pickProviderFor({ kind: 'bg-removal' });
    expect(r.provider).toBe('fal');
    expect(r.model).toBe('fal-ai/birefnet/v2');
  });

  test('refs > 0 is unsupported for bg-removal', () => {
    const r = pickProviderFor({ kind: 'bg-removal', refs: 1 });
    expect(r.provider).toBe('none');
    expect(r.reason.toLowerCase()).toContain('refs');
  });
});

describe('pickProviderFor — model-3d', () => {
  test('returns FAL Meshy text-to-3D', () => {
    const r = pickProviderFor({ kind: 'model-3d' });
    expect(r.provider).toBe('fal');
    expect(r.model).toBe('fal-ai/meshy/text-to-3d');
  });
});

describe('pickProviderFor — image (refs)', () => {
  test('refs: 0 → gemini flash (cheapest bulk)', () => {
    const r = pickProviderFor({ kind: 'image', refs: 0 });
    expect(r.provider).toBe('gemini');
    expect(r.model).toBe('gemini-3.1-flash-image-preview');
    expect(r.reason.toLowerCase()).toContain('cheap');
  });

  test('text-only (refs undefined) → gemini flash', () => {
    const r = pickProviderFor({ kind: 'image' });
    expect(r.provider).toBe('gemini');
    expect(r.model).toBe('gemini-3.1-flash-image-preview');
  });

  test('refs: 5 → openai gpt-image-2', () => {
    const r = pickProviderFor({ kind: 'image', refs: 5 });
    expect(r.provider).toBe('openai');
    expect(r.model).toBe('gpt-image-2');
    expect(r.reason).toContain('multi-ref');
  });

  test('refs: 16 (gpt-image-2 max) → openai gpt-image-2', () => {
    const r = pickProviderFor({ kind: 'image', refs: 16 });
    expect(r.provider).toBe('openai');
    expect(r.model).toBe('gpt-image-2');
  });

  test('refs: 17 (above gpt-image-2 cap) → no provider', () => {
    const r = pickProviderFor({ kind: 'image', refs: 17 });
    expect(r.provider).toBe('none');
    expect(r.reason.toLowerCase()).toContain('exceeds');
  });
});

describe('pickProviderFor — image (transparency)', () => {
  test('transparency: true → gpt-image-1.5 (only model with native alpha)', () => {
    const r = pickProviderFor({ kind: 'image', transparency: true });
    expect(r.provider).toBe('openai');
    expect(r.model).toBe('gpt-image-1.5');
  });
});

describe('pickProviderFor — preferProvider override', () => {
  test('preferProvider="openai" honored even for text-only', () => {
    const r = pickProviderFor({ kind: 'image', preferProvider: 'openai' });
    expect(r.provider).toBe('openai');
    // Default openai model (gpt-image-1.5 has default: true)
    expect(r.model).toBe('gpt-image-1.5');
  });

  test('preferProvider mismatch returns "none" with explanation', () => {
    const r = pickProviderFor({
      kind: 'code-gen',
      preferProvider: 'gemini',
    });
    expect(r.provider).toBe('none');
    expect(r.reason).toContain('does not support');
  });
});

describe('capabilities matrix invariants', () => {
  test('every entry has at least one model', () => {
    for (const entry of capabilities()) {
      expect(entry.models.length).toBeGreaterThan(0);
    }
  });

  test('every model with supportsRefs=true has a positive maxRefs', () => {
    for (const entry of capabilities()) {
      for (const model of entry.models) {
        if (model.supportsRefs) {
          expect(model.maxRefs).toBeDefined();
          expect(model.maxRefs!).toBeGreaterThan(0);
        }
      }
    }
  });

  test('capabilitiesFor("openai") returns the image entry with both models', () => {
    const caps = capabilitiesFor('openai');
    expect(caps).toBeDefined();
    expect(caps!.kind).toBe('image');
    const ids = caps!.models.map((m) => m.id);
    expect(ids).toContain('gpt-image-2');
    expect(ids).toContain('gpt-image-1.5');
  });

  test('capabilitiesForKind returns distinct FAL rows by kind', () => {
    expect(capabilitiesForKind('fal', 'texture')?.models[0]?.id).toBe('fal-ai/flux-lora');
    expect(capabilitiesForKind('fal', 'bg-removal')?.models[0]?.id).toBe('fal-ai/birefnet/v2');
    expect(capabilitiesForKind('fal', 'model-3d')?.models[0]?.id).toBe('fal-ai/meshy/text-to-3d');
  });
});
