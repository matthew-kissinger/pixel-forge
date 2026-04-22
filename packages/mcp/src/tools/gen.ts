/**
 * MCP tools for the generation pipelines (sprite / icon / texture / glb /
 * soldier-set). Each tool registers a zod input schema, instantiates the
 * appropriate core pipeline, and returns either a tmp file path or inline
 * base64 (when `inline: true`).
 *
 * Tool naming follows the `pixelforge_<area>_<verb>` convention so they
 * cluster nicely in MCP client tool pickers.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { image as coreImage } from '@pixel-forge/core';

import { loadProvidersFromEnv, requireProvider } from '../providers';
import { errorToToolResult, persistBinary } from '../output';

// =============================================================================
// Shared input fragments
// =============================================================================

const InlineFlag = z
  .boolean()
  .optional()
  .describe(
    'When true, return base64 in `data` instead of writing to a tmp path. ' +
      'Default false (path) — keeps MCP messages small.',
  );

const OutPath = z
  .string()
  .optional()
  .describe('Optional explicit output path. When unset, a tmp path is generated.');

function readRefFiles(paths?: string[]): Buffer[] {
  if (!paths || paths.length === 0) return [];
  return paths.map((p) => readFileSync(resolve(p)));
}

// =============================================================================
// Registration
// =============================================================================

export function registerGenTools(server: McpServer): void {
  // ---------------------------------------------------------------------------
  // pixelforge_gen_sprite
  // ---------------------------------------------------------------------------
  server.registerTool(
    'pixelforge_gen_sprite',
    {
      description:
        'Generate a 32-bit pixel-art sprite (image gen + optional BiRefNet + chroma cleanup).',
      inputSchema: {
        prompt: z.string().describe('Subject description; style suffix is appended.'),
        background: z
          .enum(['magenta', 'blue', 'green'])
          .optional()
          .describe('Chroma background color. Default magenta.'),
        refPaths: z
          .array(z.string())
          .optional()
          .describe('Filesystem paths to reference images (read by the server).'),
        runBiRefNet: z
          .boolean()
          .optional()
          .describe('Whether to run BiRefNet bg-removal. Default true.'),
        preserveFlash: z
          .boolean()
          .optional()
          .describe('Skip yellow/orange in chroma — for muzzle-flash sprites.'),
        outPath: OutPath,
        inline: InlineFlag,
      },
    },
    async (input) => {
      try {
        const registry = loadProvidersFromEnv();
        const imageProvider = requireProvider(
          registry,
          'image',
          'OPENAI_API_KEY or GEMINI_API_KEY',
        );
        const runBiRefNet = input.runBiRefNet ?? true;
        const bgRemoval = runBiRefNet
          ? requireProvider(registry, 'bgRemoval', 'FAL_KEY')
          : undefined;

        const pipeline = coreImage.pipelines.createSpritePipeline({
          imageProvider,
          ...(bgRemoval ? { bgRemovalProvider: bgRemoval } : {}),
        });

        const refs = readRefFiles(input.refPaths);
        const result = await pipeline.run({
          prompt: input.prompt,
          background: input.background ?? 'magenta',
          ...(refs.length > 0 ? { refs } : {}),
          runBiRefNet,
          preserveFlash: input.preserveFlash ?? false,
        });

        const persisted = persistBinary(result.image, {
          extension: '.png',
          ...(input.outPath ? { outPath: input.outPath } : {}),
          ...(input.inline !== undefined ? { inline: input.inline } : {}),
        });
        const structured = { ...persisted, meta: result.meta };
        return {
          content: [
            {
              type: 'text',
              text: persisted.path
                ? `Sprite written to ${persisted.path} (${persisted.sizeBytes} bytes).`
                : `Sprite returned inline (${persisted.sizeBytes} bytes base64).`,
            },
          ],
          structuredContent: structured,
        };
      } catch (err) {
        return errorToToolResult(err);
      }
    },
  );

  // ---------------------------------------------------------------------------
  // pixelforge_gen_icon
  // ---------------------------------------------------------------------------
  server.registerTool(
    'pixelforge_gen_icon',
    {
      description:
        'Generate a UI icon (mono silhouette or colored emblem). No BiRefNet — direct chroma key.',
      inputSchema: {
        prompt: z.string().describe('Icon subject description.'),
        variant: z.enum(['mono', 'colored']).describe('mono = white silhouette, colored = emblem.'),
        refPaths: z.array(z.string()).optional(),
        outPath: OutPath,
        inline: InlineFlag,
      },
    },
    async (input) => {
      try {
        const registry = loadProvidersFromEnv();
        const imageProvider = requireProvider(
          registry,
          'image',
          'OPENAI_API_KEY or GEMINI_API_KEY',
        );
        const pipeline = coreImage.pipelines.createIconPipeline({ imageProvider });
        const refs = readRefFiles(input.refPaths);
        const result = await pipeline.run({
          prompt: input.prompt,
          variant: input.variant,
          ...(refs.length > 0 ? { refs } : {}),
        });
        const persisted = persistBinary(result.image, {
          extension: '.png',
          ...(input.outPath ? { outPath: input.outPath } : {}),
          ...(input.inline !== undefined ? { inline: input.inline } : {}),
        });
        return {
          content: [
            {
              type: 'text',
              text: persisted.path
                ? `Icon written to ${persisted.path} (${persisted.sizeBytes} bytes).`
                : `Icon returned inline (${persisted.sizeBytes} bytes base64).`,
            },
          ],
          structuredContent: { ...persisted, meta: result.meta },
        };
      } catch (err) {
        return errorToToolResult(err);
      }
    },
  );

  // ---------------------------------------------------------------------------
  // pixelforge_gen_texture
  // ---------------------------------------------------------------------------
  server.registerTool(
    'pixelforge_gen_texture',
    {
      description:
        'Generate a tileable terrain texture (FLUX 2 + Seamless LoRA + quantize).',
      inputSchema: {
        description: z.string().describe('Terrain / material description.'),
        size: z
          .number()
          .int()
          .positive()
          .optional()
          .describe('Final output size in pixels (square). Default 512.'),
        outPath: OutPath,
        inline: InlineFlag,
      },
    },
    async (input) => {
      try {
        const registry = loadProvidersFromEnv();
        const textureProvider = requireProvider(registry, 'texture', 'FAL_KEY');
        const pipeline = coreImage.pipelines.createTexturePipeline({ textureProvider });
        const result = await pipeline.run({
          description: input.description,
          ...(input.size !== undefined ? { size: input.size } : {}),
        });
        const persisted = persistBinary(result.image, {
          extension: '.png',
          ...(input.outPath ? { outPath: input.outPath } : {}),
          ...(input.inline !== undefined ? { inline: input.inline } : {}),
        });
        return {
          content: [
            {
              type: 'text',
              text: persisted.path
                ? `Texture written to ${persisted.path} (${persisted.sizeBytes} bytes).`
                : `Texture returned inline (${persisted.sizeBytes} bytes base64).`,
            },
          ],
          structuredContent: { ...persisted, meta: result.meta },
        };
      } catch (err) {
        return errorToToolResult(err);
      }
    },
  );

  // ---------------------------------------------------------------------------
  // pixelforge_gen_glb
  // ---------------------------------------------------------------------------
  server.registerTool(
    'pixelforge_gen_glb',
    {
      description:
        'Generate a GLB via the Kiln pipeline (Claude codegen + headless render).',
      inputSchema: {
        prompt: z.string().describe('Asset description.'),
        category: z
          .enum([
            'character',
            'prop',
            'vfx',
            'environment',
            'vehicle',
            'building',
            'weapon',
          ])
          .optional()
          .describe('Asset category (default prop).'),
        style: z
          .enum(['low-poly', 'stylized', 'voxel', 'detailed', 'realistic'])
          .optional(),
        includeAnimation: z.boolean().optional(),
        outPath: OutPath,
        inline: InlineFlag,
      },
    },
    async (input) => {
      try {
        const pipeline = coreImage.pipelines.createGlbPipeline();
        const result = await pipeline.run({
          prompt: input.prompt,
          ...(input.category ? { category: input.category } : {}),
          ...(input.style ? { style: input.style } : {}),
          ...(input.includeAnimation !== undefined
            ? { includeAnimation: input.includeAnimation }
            : {}),
        });
        const persisted = persistBinary(result.glb, {
          extension: '.glb',
          ...(input.outPath ? { outPath: input.outPath } : {}),
          ...(input.inline !== undefined ? { inline: input.inline } : {}),
        });
        return {
          content: [
            {
              type: 'text',
              text: persisted.path
                ? `GLB written to ${persisted.path} (${persisted.sizeBytes} bytes).`
                : `GLB returned inline (${persisted.sizeBytes} bytes base64).`,
            },
          ],
          structuredContent: {
            ...persisted,
            code: result.code,
            meta: result.meta,
            warnings: result.warnings,
          },
        };
      } catch (err) {
        return errorToToolResult(err);
      }
    },
  );

  // ---------------------------------------------------------------------------
  // pixelforge_gen_soldier_set
  // ---------------------------------------------------------------------------
  server.registerTool(
    'pixelforge_gen_soldier_set',
    {
      description:
        'Generate a faction T-pose plus N pose sprites that reference it.',
      inputSchema: {
        faction: z.string().describe('Faction label.'),
        tPosePrompt: z.string().describe('Prompt for the T-pose character sheet.'),
        factionStyleRefPaths: z
          .array(z.string())
          .optional()
          .describe('Reference image paths for the T-pose (existing faction sprites).'),
        poses: z
          .array(
            z.object({
              name: z.string(),
              prompt: z.string(),
              poseRefPath: z.string().optional(),
              preserveFlash: z.boolean().optional(),
            }),
          )
          .min(1)
          .describe('1+ pose definitions with optional pose ref + preserveFlash.'),
        background: z.enum(['magenta', 'blue', 'green']).optional(),
        outDir: z
          .string()
          .describe('Directory the server writes tpose.png + <pose>.png to.'),
      },
    },
    async (input) => {
      try {
        const registry = loadProvidersFromEnv();
        const imageProvider = requireProvider(
          registry,
          'image',
          'OPENAI_API_KEY or GEMINI_API_KEY',
        );
        const bgRemoval = requireProvider(registry, 'bgRemoval', 'FAL_KEY');

        const styleRefs = readRefFiles(input.factionStyleRefPaths);
        const poses = input.poses.map((p) => ({
          name: p.name,
          prompt: p.prompt,
          ...(p.poseRefPath
            ? { poseRef: readFileSync(resolve(p.poseRefPath)) }
            : {}),
          ...(p.preserveFlash !== undefined ? { preserveFlash: p.preserveFlash } : {}),
        }));

        const pipeline = coreImage.pipelines.createSoldierSetPipeline({
          imageProvider,
          bgRemovalProvider: bgRemoval,
        });
        const result = await pipeline.run({
          faction: input.faction,
          tPosePrompt: input.tPosePrompt,
          ...(styleRefs.length > 0 ? { factionStyleRefs: styleRefs } : {}),
          poses,
          background: input.background ?? 'magenta',
        });

        const { mkdirSync, writeFileSync } = await import('node:fs');
        const { join } = await import('node:path');
        mkdirSync(resolve(input.outDir), { recursive: true });
        const tposePath = resolve(join(input.outDir, 'tpose.png'));
        writeFileSync(tposePath, result.tPose.image);
        const posePaths: string[] = [];
        for (const pose of result.poses) {
          const p = resolve(join(input.outDir, `${pose.name}.png`));
          writeFileSync(p, pose.sprite.image);
          posePaths.push(p);
        }

        return {
          content: [
            {
              type: 'text',
              text: `Wrote tpose.png + ${posePaths.length} pose sprites to ${resolve(input.outDir)}.`,
            },
          ],
          structuredContent: {
            ok: true,
            tposePath,
            posePaths,
            meta: result.meta,
          },
        };
      } catch (err) {
        return errorToToolResult(err);
      }
    },
  );
}
