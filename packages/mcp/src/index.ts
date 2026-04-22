#!/usr/bin/env bun
/**
 * @pixel-forge/mcp — stdio MCP server entry point.
 *
 * Wires `buildPixelForgeServer()` to a `StdioServerTransport`. Use:
 *
 *   claude mcp add pixelforge --stdio bun packages/mcp/src/index.ts
 *
 * The server emits a single startup line to stderr (stdout is reserved
 * for the MCP protocol) so the user knows it came up.
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { buildPixelForgeServer } from './server';

async function main(): Promise<void> {
  const server = buildPixelForgeServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write('pixelforge MCP server running on stdio\n');
}

main().catch((err) => {
  process.stderr.write(`pixelforge MCP server failed to start: ${String(err)}\n`);
  process.exit(1);
});
