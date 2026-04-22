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

import { describe, expect, test } from 'bun:test';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

import { buildPixelForgeServer } from '../server';

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
        'pixelforge_kiln_inspect',
        'pixelforge_kiln_list_primitives',
        'pixelforge_kiln_refactor',
        'pixelforge_kiln_validate',
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
});
