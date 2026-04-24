/**
 * CLI smoke tests.
 *
 * Strategy: assert command shape (subCommands present, args defined) and
 * exercise pure helpers (routing, output formatting). No live API calls,
 * no provider construction.
 *
 * Live flow tests (real providers, paths writing PNGs to disk) live in
 * `live.test.ts` and are gated on `CLI_LIVE=1` — skipped by default.
 */

import { describe, expect, test } from 'bun:test';

import { genCommand, readBooleanOption, readOption } from '../commands/gen';
import { inspectCommand } from '../commands/inspect';
import { providersCommand } from '../commands/providers';
import { kilnCommand } from '../commands/kiln';
import { pickProviderForLocal } from '../routing';
import { parseCsvList } from '../output';

describe('command tree shape', () => {
  test('gen has all 5 subcommands', async () => {
    const subs = await genCommand.subCommands;
    expect(subs).toBeDefined();
    const keys = Object.keys(subs!);
    expect(keys.sort()).toEqual(
      ['glb', 'icon', 'soldier-set', 'sprite', 'texture'].sort(),
    );
  });

  test('inspect has glb subcommand', async () => {
    const subs = await inspectCommand.subCommands;
    expect(Object.keys(subs!)).toContain('glb');
  });

  test('providers has list and pick', async () => {
    const subs = await providersCommand.subCommands;
    expect(Object.keys(subs!).sort()).toEqual(['list', 'pick']);
  });

  test('kiln has 10 subcommands', async () => {
    const subs = await kilnCommand.subCommands;
    expect(Object.keys(subs!).sort()).toEqual(
      [
        'bake-imposter',
        'cleanup-photogrammetry',
        'ingest-fbx',
        'inspect',
        'list-primitives',
        'lod',
        'pack-atlas',
        'refactor',
        'retex',
        'validate',
      ].sort(),
    );
  });

  test('every gen subcommand declares a prompt-or-description arg', async () => {
    const subs = await genCommand.subCommands;
    for (const [name, sub] of Object.entries(subs!)) {
      const cmd = await (typeof sub === 'function' ? sub() : sub);
      const args = await cmd.args;
      const argKeys = Object.keys(args ?? {});
      // Every gen sub takes either prompt, description, or tpose-prompt.
      const hasPromptArg = argKeys.some((k) =>
        ['prompt', 'description', 'tpose-prompt'].includes(k),
      );
      expect(hasPromptArg).toBe(true);
      expect(argKeys).toContain('json');
      void name;
    }
  });
});

describe('routing helper', () => {
  test('text-only image → gemini flash', () => {
    const result = pickProviderForLocal({ kind: 'image' });
    expect(result.provider).toBe('gemini');
    expect(result.model).toBe('gemini-3.1-flash-image-preview');
  });

  test('multi-ref image → gpt-image-2', () => {
    const result = pickProviderForLocal({ kind: 'image', refs: 5 });
    expect(result.provider).toBe('openai');
    expect(result.model).toBe('gpt-image-2');
  });

  test('texture → fal flux-2/lora', () => {
    const result = pickProviderForLocal({ kind: 'texture' });
    expect(result.provider).toBe('fal');
    expect(result.model).toBe('fal-ai/flux-2/lora');
  });

  test('code-gen → anthropic opus 4.7 by default', () => {
    const result = pickProviderForLocal({ kind: 'code-gen' });
    expect(result.provider).toBe('anthropic');
    expect(result.model).toBe('claude-opus-4-7');
  });

  test('code-gen with preferCheap → sonnet 4.6', () => {
    const result = pickProviderForLocal({ kind: 'code-gen', preferCheap: true });
    expect(result.provider).toBe('anthropic');
    expect(result.model).toBe('claude-sonnet-4-6');
  });

  test('transparency required → gpt-image-1.5', () => {
    const result = pickProviderForLocal({ kind: 'image', transparency: true });
    expect(result.provider).toBe('openai');
    expect(result.model).toBe('gpt-image-1.5');
  });

  test('refs above 16 → falls back to gemini (within its 14 cap returns none)', () => {
    // 20 refs exceeds both gpt-image-2 (16) and gemini (14) caps.
    const result = pickProviderForLocal({ kind: 'image', refs: 20 });
    expect(result.provider).toBe('none');
  });

  test('bg-removal → fal birefnet', () => {
    const result = pickProviderForLocal({ kind: 'bg-removal' });
    expect(result.provider).toBe('fal');
    expect(result.model).toBe('fal-ai/birefnet');
  });
});

describe('parseCsvList', () => {
  test('empty / undefined → []', () => {
    expect(parseCsvList(undefined)).toEqual([]);
    expect(parseCsvList('')).toEqual([]);
  });

  test('single value → 1-item array', () => {
    expect(parseCsvList('a.png')).toEqual(['a.png']);
  });

  test('handles whitespace and trailing commas', () => {
    expect(parseCsvList(' a.png , b.png,, c.png ')).toEqual([
      'a.png',
      'b.png',
      'c.png',
    ]);
  });
});

describe('CLI option aliases', () => {
  test('reads kebab-case options', () => {
    expect(readOption({ 'no-birefnet': true }, 'no-birefnet')).toBe(true);
    expect(readOption({ 'save-code': 'asset.js' }, 'save-code')).toBe(
      'asset.js',
    );
  });

  test('reads citty camelCase aliases for kebab-case options', () => {
    expect(readOption({ noBirefnet: true }, 'no-birefnet')).toBe(true);
    expect(readOption({ saveCode: 'asset.js' }, 'save-code')).toBe('asset.js');
    expect(readOption({ tposePrompt: 'soldier' }, 'tpose-prompt')).toBe(
      'soldier',
    );
  });

  test('reads citty negated no-* boolean aliases', () => {
    expect(
      readBooleanOption(
        { 'no-birefnet': false, noBirefnet: false, birefnet: false },
        'no-birefnet',
      ),
    ).toBe(true);
    expect(
      readBooleanOption(
        { 'no-animation': false, noAnimation: false, animation: false },
        'no-animation',
      ),
    ).toBe(true);
  });
});
