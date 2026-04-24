/**
 * Kiln introspection / refactor / catalog tools.
 *
 * These return structured JSON directly — no binary payloads, so the
 * file-vs-inline strategy from `gen.ts` doesn't apply.
 */

import { writeFileSync } from 'node:fs';
import { extname, resolve } from 'node:path';

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
  // pixelforge_kiln_bake_imposter
  // ---------------------------------------------------------------------------
  server.registerTool(
    'pixelforge_kiln_bake_imposter',
    {
      description:
        'Bake an imposter atlas (lat/lon billboard) from a GLB on disk. Writes albedo PNG + .json sidecar. Returns paths, tile grid, world size, tri count.',
      inputSchema: {
        inputPath: z.string().describe('Absolute path to the source GLB on disk.'),
        outPath: z.string().describe('Absolute path for the albedo PNG output.'),
        angles: z
          .union([z.literal(8), z.literal(16), z.literal(32)])
          .default(16)
          .describe('Total viewpoints baked. 16 pairs with axis=y for full-sphere; 8 and 32 require hemi-y.'),
        axis: z
          .enum(['y', 'hemi-y'])
          .optional()
          .describe("'y' for full sphere, 'hemi-y' for foliage (upper hemi only)."),
        tileSize: z
          .union([z.literal(128), z.literal(256), z.literal(512), z.literal(1024)])
          .default(512)
          .describe('Pixel size per tile (square).'),
        auxLayers: z
          .array(z.enum(['depth', 'normal']))
          .optional()
          .describe('Additional layers to bake alongside albedo.'),
        bg: z
          .enum(['transparent', 'magenta'])
          .default('transparent')
          .describe("Background during albedo bake. 'magenta' lets downstream chroma-clean replace with alpha."),
      },
    },
    async (input) => {
      try {
        const axis = input.axis ?? (input.angles === 16 ? 'y' : 'hemi-y');
        const result = await kiln.bakeImposter(resolve(input.inputPath), {
          angles: input.angles,
          axis,
          tileSize: input.tileSize,
          bgColor: input.bg,
          ...(input.auxLayers ? { auxLayers: input.auxLayers } : {}),
          sourcePath: resolve(input.inputPath),
        });

        const outPath = resolve(input.outPath);
        writeFileSync(outPath, result.atlas);
        const baseOut = outPath.replace(new RegExp(`${extname(outPath)}$`), '');
        const metaPath = `${baseOut}.json`;
        writeFileSync(metaPath, JSON.stringify(result.meta, null, 2), 'utf-8');
        const auxPaths: Record<string, string> = {};
        for (const [layer, buf] of Object.entries(result.aux)) {
          if (!buf) continue;
          const p = `${baseOut}.${layer}.png`;
          writeFileSync(p, buf as Buffer);
          auxPaths[layer] = p;
        }

        return {
          content: [
            {
              type: 'text',
              text:
                `Baked ${result.meta.angles}-angle imposter: ${result.meta.tilesX}x${result.meta.tilesY} tiles · ` +
                `${result.meta.atlasWidth}x${result.meta.atlasHeight} px · worldSize=${result.meta.worldSize.toFixed(2)} · ` +
                `${result.meta.source.tris} tri source.`,
            },
          ],
          structuredContent: {
            ok: true,
            albedo: outPath,
            meta: metaPath,
            aux: auxPaths,
            angles: result.meta.angles,
            tilesX: result.meta.tilesX,
            tilesY: result.meta.tilesY,
            atlasWidth: result.meta.atlasWidth,
            atlasHeight: result.meta.atlasHeight,
            worldSize: result.meta.worldSize,
            tris: result.meta.source.tris,
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
