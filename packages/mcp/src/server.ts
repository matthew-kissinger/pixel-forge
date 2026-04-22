/**
 * Build an MCP server with every Pixel Forge tool registered, but without
 * connecting it to a transport. Split out from `index.ts` so tests can
 * exercise tool registration without spinning up stdio.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { registerGenTools } from './tools/gen';
import { registerKilnTools } from './tools/kiln';
import { registerProviderTools } from './tools/providers';

export interface BuildServerOptions {
  name?: string;
  version?: string;
}

/**
 * Construct an `McpServer` with every Pixel Forge tool registered. Caller
 * connects it to a transport (stdio in production, in-memory in tests).
 */
export function buildPixelForgeServer(opts: BuildServerOptions = {}): McpServer {
  const server = new McpServer(
    {
      name: opts.name ?? 'pixelforge',
      version: opts.version ?? '0.0.0',
    },
    {
      instructions:
        'Pixel Forge: agent-first AI asset generator. Tools live under ' +
        'pixelforge_gen_* (assets), pixelforge_kiln_* (3D code/intro), and ' +
        'pixelforge_providers_capabilities. Binary outputs default to a tmp ' +
        'file path; pass `inline: true` to receive base64 instead. On ' +
        'errors, read `structuredContent.fixHint` for the next-step suggestion.',
    },
  );

  registerGenTools(server);
  registerKilnTools(server);
  registerProviderTools(server);

  return server;
}
