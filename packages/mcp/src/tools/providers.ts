/**
 * Provider capability inspection tool.
 *
 * Returns the static capability matrix from `@pixel-forge/core`. Agents
 * use this to decide routing themselves before issuing a real generation
 * call (e.g. "I have 8 refs — does any provider support that many?").
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { capabilities } from '@pixel-forge/core';

import { errorToToolResult } from '../output';

export function registerProviderTools(server: McpServer): void {
  server.registerTool(
    'pixelforge_providers_capabilities',
    {
      description:
        'List every registered provider + model with strengths, limitations, and pricing.',
      inputSchema: {},
    },
    async () => {
      try {
        const matrix = capabilities();
        const total = matrix.reduce((acc, p) => acc + p.models.length, 0);
        return {
          content: [
            {
              type: 'text',
              text: `Returned ${matrix.length} provider entries (${total} model rows).`,
            },
          ],
          structuredContent: { ok: true, providers: matrix },
        };
      } catch (err) {
        return errorToToolResult(err);
      }
    },
  );
}
