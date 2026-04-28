/**
 * MCP server smoke tests.
 *
 * Strategy: spin up an in-memory client+server pair and exercise the
 * read-only tools (`listTools`, `pixelforge_kiln_list_primitives`,
 * `pixelforge_providers_capabilities`, `pixelforge_kiln_validate`).
 *
 * No live API calls — these tools resolve from static data + AST in the
 * core package, so they're stable to assert on. Provider-dependent tools
 * (gen_*) only get tool-registration coverage; live execution is gated
 * elsewhere.
 */

import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, test } from 'bun:test';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

import { buildPixelForgeServer } from '../server';

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

async function makeClient() {
  const server = buildPixelForgeServer();
  const [clientTx, serverTx] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTx);

  const client = new Client(
    { name: 'pixelforge-test-client', version: '0.0.0' },
    { capabilities: {} },
  );
  await client.connect(clientTx);
  return { client, server };
}

describe('MCP server tool registration', () => {
  test('exposes every expected tool', async () => {
    const { client } = await makeClient();
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name).sort();
    expect(names).toEqual(
      [
        'pixelforge_gen_glb',
        'pixelforge_gen_icon',
        'pixelforge_gen_soldier_set',
        'pixelforge_gen_sprite',
        'pixelforge_gen_texture',
        'pixelforge_kiln_bake_imposter',
        'pixelforge_kiln_cleanup_photogrammetry',
        'pixelforge_kiln_ingest_fbx',
        'pixelforge_kiln_inspect',
        'pixelforge_kiln_list_primitives',
        'pixelforge_kiln_lod',
        'pixelforge_kiln_pack_atlas',
        'pixelforge_kiln_refactor',
        'pixelforge_kiln_retex',
        'pixelforge_kiln_validate',
        'pixelforge_kiln_validate_animated_imposter',
        'pixelforge_kiln_validate_npc_pack',
        'pixelforge_providers_capabilities',
      ].sort(),
    );
  });

  test('every tool has a description', async () => {
    const { client } = await makeClient();
    const { tools } = await client.listTools();
    for (const t of tools) {
      expect(t.description).toBeDefined();
      expect(t.description!.length).toBeGreaterThan(0);
    }
  });
});

describe('read-only tool execution', () => {
  test('pixelforge_providers_capabilities returns the matrix', async () => {
    const { client } = await makeClient();
    const result = await client.callTool({
      name: 'pixelforge_providers_capabilities',
      arguments: {},
    });
    expect(result.isError).toBeFalsy();
    const sc = result.structuredContent as { ok: boolean; providers: Array<{ id: string }> };
    expect(sc.ok).toBe(true);
    expect(sc.providers.length).toBeGreaterThan(0);
    const ids = new Set(sc.providers.map((p) => p.id));
    for (const expected of ['gemini', 'openai', 'fal', 'anthropic']) {
      expect(ids.has(expected)).toBe(true);
    }
  });

  test('pixelforge_kiln_list_primitives returns a non-empty catalog', async () => {
    const { client } = await makeClient();
    const result = await client.callTool({
      name: 'pixelforge_kiln_list_primitives',
      arguments: {},
    });
    expect(result.isError).toBeFalsy();
    const sc = result.structuredContent as {
      ok: boolean;
      count: number;
      primitives: Array<{ name: string; category: string }>;
    };
    expect(sc.ok).toBe(true);
    expect(sc.count).toBeGreaterThan(10);
    const names = sc.primitives.map((p) => p.name);
    expect(names).toContain('createRoot');
    expect(names).toContain('boxGeo');
  });

  test('pixelforge_kiln_list_primitives respects category filter', async () => {
    const { client } = await makeClient();
    const result = await client.callTool({
      name: 'pixelforge_kiln_list_primitives',
      arguments: { category: 'geometry' },
    });
    expect(result.isError).toBeFalsy();
    const sc = result.structuredContent as {
      primitives: Array<{ category: string }>;
    };
    expect(sc.primitives.length).toBeGreaterThan(0);
    for (const p of sc.primitives) expect(p.category).toBe('geometry');
  });

  test('pixelforge_kiln_validate marks bad code as invalid', async () => {
    const { client } = await makeClient();
    // Code with no `build` function — fails AST validation.
    const result = await client.callTool({
      name: 'pixelforge_kiln_validate',
      arguments: { code: 'const x = 1;' },
    });
    expect(result.isError).toBe(true);
    const sc = result.structuredContent as { valid: boolean; errors: unknown[] };
    expect(sc.valid).toBe(false);
    expect(sc.errors.length).toBeGreaterThan(0);
  });

  test('pixelforge_kiln_validate accepts minimal valid code', async () => {
    const { client } = await makeClient();
    const validCode = `
const meta = { name: 'Cube' };
function build() {
  const root = createRoot('Cube');
  createPart('Box', boxGeo(1, 1, 1), gameMaterial(0xff0000), { parent: root });
  return root;
}
`;
    const result = await client.callTool({
      name: 'pixelforge_kiln_validate',
      arguments: { code: validCode },
    });
    const sc = result.structuredContent as { valid: boolean };
    expect(sc.valid).toBe(true);
  });

  test('pixelforge_kiln_validate_animated_imposter validates a local sidecar path', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'pf-mcp-imposter-'));
    const sidecarPath = join(dir, 'nva.sidecar.json');
    writeFileSync(sidecarPath, JSON.stringify(makeAnimatedSidecar()), 'utf-8');

    const { client } = await makeClient();
    const result = await client.callTool({
      name: 'pixelforge_kiln_validate_animated_imposter',
      arguments: { sidecarPath },
    });
    expect(result.isError).toBeFalsy();
    const sc = result.structuredContent as { ok: boolean; sidecarPath: string; issues: unknown[] };
    expect(sc.ok).toBe(true);
    expect(sc.sidecarPath).toBe(sidecarPath);
    expect(sc.issues).toEqual([]);
  });

  test('pixelforge_kiln_validate_npc_pack validates a local manifest path without file checks', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'pf-mcp-npc-pack-'));
    const manifestPath = join(dir, 'npc-package-manifest.json');
    writeFileSync(manifestPath, JSON.stringify(makeNpcPackManifest()), 'utf-8');

    const { client } = await makeClient();
    const result = await client.callTool({
      name: 'pixelforge_kiln_validate_npc_pack',
      arguments: { manifestPath, rootDir: dir, checkFiles: false },
    });
    expect(result.isError).toBeFalsy();
    const sc = result.structuredContent as {
      ok: boolean;
      manifestPath: string;
      rootDir: string;
      blockers: unknown[];
    };
    expect(sc.ok).toBe(true);
    expect(sc.manifestPath).toBe(manifestPath);
    expect(sc.rootDir).toBe(dir);
    expect(sc.blockers).toEqual([]);
  });
});
