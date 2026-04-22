/**
 * Kiln introspection / refactor / catalog tools.
 *
 * These return structured JSON directly — no binary payloads, so the
 * file-vs-inline strategy from `gen.ts` doesn't apply.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { kiln } from '@pixel-forge/core';

import { errorToToolResult } from '../output';

export function registerKilnTools(server: McpServer): void {
  // ---------------------------------------------------------------------------
  // pixelforge_kiln_inspect
  // ---------------------------------------------------------------------------
  server.registerTool(
    'pixelforge_kiln_inspect',
    {
      description:
        'Execute Kiln source headlessly and return triangle count, bounds, named parts, animations.',
      inputSchema: {
        code: z.string().describe('Kiln JS source code (the body of a build() function).'),
      },
    },
    async (input) => {
      try {
        const result = await kiln.inspect(input.code);
        return {
          content: [
            {
              type: 'text',
              text:
                `Inspect: ${result.triangles} tris · ${result.materials} materials · ` +
                `${result.namedParts.length} named parts · ${result.animationTracks.length} animation tracks` +
                (result.warnings.length ? `\nwarnings: ${result.warnings.join('; ')}` : ''),
            },
          ],
          structuredContent: { ok: true, ...result },
        };
      } catch (err) {
        return errorToToolResult(err);
      }
    },
  );

  // ---------------------------------------------------------------------------
  // pixelforge_kiln_validate
  // ---------------------------------------------------------------------------
  server.registerTool(
    'pixelforge_kiln_validate',
    {
      description:
        'AST-hardened validation of Kiln source. Returns structured issues + warnings.',
      inputSchema: {
        code: z.string().describe('Kiln JS source code.'),
        category: z.string().optional().describe('Category hint (informational only).'),
      },
    },
    async (input) => {
      try {
        const result = kiln.validate(input.code);
        return {
          content: [
            {
              type: 'text',
              text:
                `Validate: valid=${result.valid} · ${result.errors.length} errors · ${result.warnings.length} warnings` +
                (result.errors.length ? `\nfirst error: ${result.errors[0]}` : ''),
            },
          ],
          structuredContent: { ok: result.valid, ...result },
          isError: !result.valid,
        };
      } catch (err) {
        return errorToToolResult(err);
      }
    },
  );

  // ---------------------------------------------------------------------------
  // pixelforge_kiln_refactor
  // ---------------------------------------------------------------------------
  server.registerTool(
    'pixelforge_kiln_refactor',
    {
      description:
        'Refactor existing Kiln code against a free-form instruction (Claude). Returns new code.',
      inputSchema: {
        code: z.string().describe('Existing Kiln source to refactor.'),
        instruction: z.string().describe('What to change.'),
      },
    },
    async (input) => {
      try {
        const result = await kiln.refactor({
          instruction: input.instruction,
          geometryCode: input.code,
          target: 'geometry',
        });
        if (!result.success || !result.code) {
          return errorToToolResult(
            new Error(`Refactor failed: ${result.error ?? 'unknown error'}`),
          );
        }
        return {
          content: [
            {
              type: 'text',
              text: `Refactored Kiln code (${result.code.length} chars).`,
            },
          ],
          structuredContent: {
            ok: true,
            code: result.code,
            ...(result.usage ? { usage: result.usage } : {}),
          },
        };
      } catch (err) {
        return errorToToolResult(err);
      }
    },
  );

  // ---------------------------------------------------------------------------
  // pixelforge_kiln_list_primitives
  // ---------------------------------------------------------------------------
  server.registerTool(
    'pixelforge_kiln_list_primitives',
    {
      description:
        'Self-describing inventory of every primitive helper Kiln exposes to generated code.',
      inputSchema: {
        category: z
          .enum(['geometry', 'material', 'structure', 'animation', 'utility'])
          .optional()
          .describe('Optional category filter.'),
      },
    },
    async (input) => {
      try {
        const all = kiln.listPrimitives();
        const filtered = input.category
          ? all.filter((p) => p.category === input.category)
          : all;
        return {
          content: [
            {
              type: 'text',
              text: `Returned ${filtered.length} primitive specs (of ${all.length} total).`,
            },
          ],
          structuredContent: { ok: true, count: filtered.length, primitives: filtered },
        };
      } catch (err) {
        return errorToToolResult(err);
      }
    },
  );
}
