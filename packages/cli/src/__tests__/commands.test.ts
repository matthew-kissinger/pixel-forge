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

import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, test } from 'bun:test';

import { genCommand, readBooleanOption, readOption } from '../commands/gen';
import { inspectCommand } from '../commands/inspect';
import { providersCommand } from '../commands/providers';
import { kilnCommand } from '../commands/kiln';
import { pickProviderForLocal } from '../routing';
import { parseCsvList } from '../output';

function makeAnimatedSidecar(): unknown {
  return {
    version: 2,
    kind: 'animated-octahedral-imposter',
    source: {
      path: 'characters/nva.glb',
      bytes: 4200000,
      tris: 12000,
      skinned: true,
      animationClips: ['Armature|Idle'],
    },
    bbox: {
      min: [-0.5, 0, -0.4],
      max: [0.5, 1.8, 0.4],
      worldSize: 1.8,
      yOffset: 0.9,
    },
    projection: 'orthographic',
    view: {
      layout: 'octahedral',
      directionEncoding: 'octahedral',
      grid: { x: 6, y: 6, count: 36 },
      tileSize: 96,
      framesPerClip: 8,
    },
    clips: [
      {
        target: 'idle',
        resolved: 'Idle',
        rawName: 'Armature|Idle',
        matchedBy: 'exact',
        frameCount: 8,
        durationSec: 1,
      },
    ],
    textures: {
      layout: 'array',
      color: {
        uri: 'nva-albedo.ktx2',
        format: 'r8-palette-index',
        width: 576,
        height: 576,
        layers: 8,
        bytes: 2654208,
        colorSpace: 'srgb',
      },
      palette: {
        uri: 'nva-palette.png',
        width: 128,
        rows: 1,
        bytes: 512,
      },
    },
    runtime: {
      renderer: 'webgl2',
      primitive: 'instanced-quad',
      material: 'ShaderMaterial',
      textureMode: 'data-array-texture',
      attributes: ['frameOffset', 'clip', 'variant', 'yaw', 'paletteRow'],
    },
    storage: {
      colorBytes: 2654208,
      paletteBytes: 512,
      totalRawBytes: 2654720,
      envelopeBytes: 31457280,
      fitsEnvelope: true,
    },
    validation: { warnings: [] },
  };
}

function makeNpcPackManifest(): unknown {
  const clips = [
    ['idle', ['idle']],
    ['patrol_walk', ['patrolling']],
    ['traverse_run', ['seeking_cover']],
    ['walk_fight_forward', ['engaging', 'advancing']],
    ['death_fall_back', ['dead']],
  ] as const;

  return {
    id: 'test-pack',
    createdFrom: { base: 'test' },
    policy: {
      promoteToWarAssets: false,
      recoil: 'Runtime procedural.',
      excludedClips: [{ id: 'walk_forward_while_shooting', reason: 'Rejected in review.' }],
    },
    socketContract: {
      characterForward: '+Z',
      weaponForward: '+X',
      rightHandBone: 'RightHand',
      leftHandBone: 'LeftHand',
      runtimeNotes: ['Attach weapon at runtime.'],
    },
    factions: {
      nva: { label: 'NVA regular', headgear: 'pith-cap', primaryWeapon: 'ak47' },
    },
    clips: clips.map(([id, states]) => ({
      id,
      label: id,
      tijStates: states,
      status: 'candidate',
      note: 'Test clip.',
    })),
    outputs: clips.map(([id, states]) => ({
      faction: 'nva',
      clip: id,
      label: `nva ${id}`,
      path: `tmp/${id}.glb`,
      bytes: 1000,
      tijStates: states,
      status: 'candidate',
      primaryWeapon: 'ak47',
    })),
  };
}

async function runCli(args: string[]): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  const proc = Bun.spawn(['bun', 'src/index.ts', ...args], {
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  return { exitCode, stdout, stderr };
}

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

  test('kiln has 12 subcommands', async () => {
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
        'validate-animated-imposter',
        'validate-npc-pack',
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

  test('texture → fal flux-lora', () => {
    const result = pickProviderForLocal({ kind: 'texture' });
    expect(result.provider).toBe('fal');
    expect(result.model).toBe('fal-ai/flux-lora');
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
    expect(result.model).toBe('fal-ai/birefnet/v2');
  });

  test('model-3d → fal meshy text-to-3d', () => {
    const result = pickProviderForLocal({ kind: 'model-3d' });
    expect(result.provider).toBe('fal');
    expect(result.model).toBe('fal-ai/meshy/text-to-3d');
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

describe('validator subcommands', () => {
  test('validate-animated-imposter reads a local sidecar and emits JSON', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'pf-cli-imposter-'));
    const sidecarPath = join(dir, 'nva.sidecar.json');
    writeFileSync(sidecarPath, JSON.stringify(makeAnimatedSidecar()), 'utf-8');

    const result = await runCli([
      'kiln',
      'validate-animated-imposter',
      sidecarPath,
      '--json',
    ]);
    expect(result.stderr).toBe('');
    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(result.stdout) as {
      ok: boolean;
      sidecar: string;
      issues: unknown[];
    };
    expect(parsed.ok).toBe(true);
    expect(parsed.sidecar).toBe(sidecarPath);
    expect(parsed.issues).toEqual([]);
  });

  test('validate-npc-pack reads a local manifest and emits JSON', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'pf-cli-npc-pack-'));
    const manifestPath = join(dir, 'npc-package-manifest.json');
    writeFileSync(manifestPath, JSON.stringify(makeNpcPackManifest()), 'utf-8');

    const result = await runCli([
      'kiln',
      'validate-npc-pack',
      manifestPath,
      '--root',
      dir,
      '--no-files',
      '--json',
    ]);
    expect(result.stderr).toBe('');
    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(result.stdout) as {
      ok: boolean;
      manifestPath: string;
      root: string;
      blockers: unknown[];
    };
    expect(parsed.ok).toBe(true);
    expect(parsed.manifestPath).toBe(manifestPath);
    expect(parsed.root).toBe(dir);
    expect(parsed.blockers).toEqual([]);
  });
});
