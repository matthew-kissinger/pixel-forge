/**
 * Tileable terrain texture pipeline.
 *
 * Distilled from `scripts/gen-textures-v3.ts` + `scripts/clean-terrain-blacks.ts`.
 *
 * Flow:
 *   1. `textureProvider.generate({ description, size, ... })`
 *      — FAL FLUX 2 + Seamless Texture LoRA at the requested size
 *        (default 256 to keep cost low; we downscale anyway).
 *   2. `pixelateNearest` to `pixelateTarget` (default 32) — chunky pixels.
 *   3. `quantizePalette` to `paletteColors` (default 24) — retro palette.
 *   4. `cleanNearBlacks` (seamless wrap aware) — fix crushed shadows.
 *   5. `upscaleNearest` to the final `size` (default 512) — final game texture.
 *
 * `pixelate`/`paletteColors`/`blackCleanup` toggles let callers skip
 * specific stages without rewriting the pipeline.
 */

import { z } from 'zod';

import { PipelineInputInvalid } from '../../errors';
import type { TextureProvider } from '../../providers/types';
import type { TextureGenerateInput } from '../../schemas/image';
import {
  cleanNearBlacks,
  pixelateNearest,
  quantizePalette,
  upscaleNearest,
} from '../texture-processing';
import { wrapStep } from './_common';
import type { Pipeline } from './types';

// =============================================================================
// Input / Output
// =============================================================================

const TextureInputSchema = z
  .object({
    description: z.string().min(1).max(2_000),
    /** Final output size in pixels (square). Default 512. */
    size: z.number().int().positive().optional(),
    /** Generation size handed to the FLUX provider. Default 256. */
    generateSize: z.number().int().positive().optional(),
    loraScale: z.number().min(0).max(2).optional(),
    pixelate: z.boolean().optional(),
    pixelateTarget: z.number().int().positive().optional(),
    paletteColors: z.number().int().nonnegative().optional(),
    blackCleanup: z.boolean().optional(),
    blackThreshold: z.number().int().nonnegative().optional(),
    /** Inference passthrough — diffusion steps. Default determined by provider. */
    steps: z.number().int().positive().optional(),
    /** Inference passthrough — guidance scale. */
    guidance: z.number().positive().optional(),
  })
  .strict();

export type TextureInput = z.infer<typeof TextureInputSchema>;

export interface TextureMeta {
  provider: 'fal';
  costUsd?: number;
  latencyMs: number;
  warnings: string[];
  /** Final output dimensions (square). */
  size: number;
  paletteSize?: number;
  blackPixelsReplaced?: number;
}

export interface TextureOutput {
  image: Buffer;
  meta: TextureMeta;
}

// =============================================================================
// Pipeline factory
// =============================================================================

export interface CreateTexturePipelineDeps {
  textureProvider: TextureProvider;
}

/** Build the texture pipeline bound to a FAL TextureProvider. */
export function createTexturePipeline(
  deps: CreateTexturePipelineDeps
): Pipeline<TextureInput, TextureOutput> {
  const id = 'texture';
  const description =
    'Generate a seamlessly tileable retro-palette terrain texture (FLUX.2 + Seamless LoRA + quantize).';

  return {
    id,
    description,
    async run(rawInput: TextureInput): Promise<TextureOutput> {
      const parsed = TextureInputSchema.safeParse(rawInput);
      if (!parsed.success) {
        throw new PipelineInputInvalid({
          pipeline: id,
          message: `Invalid texture input: ${parsed.error.message}`,
          cause: parsed.error,
        });
      }
      const input = parsed.data;

      const finalSize = input.size ?? 512;
      const generateSize = input.generateSize ?? 256;
      const pixelate = input.pixelate ?? true;
      const pixelateTarget = input.pixelateTarget ?? 32;
      const paletteColors = input.paletteColors ?? 24;
      const blackCleanup = input.blackCleanup ?? true;
      const blackThreshold = input.blackThreshold ?? 40;

      const warnings: string[] = [];
      const t0 = Date.now();

      // ---------- Step 1: FLUX generation ----------
      const genInput: TextureGenerateInput = {
        description: input.description,
        size: generateSize,
        ...(input.loraScale !== undefined ? { loraScale: input.loraScale } : {}),
        ...(input.steps !== undefined ? { steps: input.steps } : {}),
        ...(input.guidance !== undefined ? { guidance: input.guidance } : {}),
        // pass-through informational fields the provider may use:
        ...(pixelate ? { pixelate } : {}),
        ...(input.pixelateTarget !== undefined
          ? { pixelateTarget: input.pixelateTarget }
          : {}),
        ...(paletteColors !== undefined ? { paletteColors } : {}),
      };

      let raw;
      try {
        raw = await deps.textureProvider.generate(genInput);
      } catch (err) {
        throw wrapStep(id, 'flux-generate', err);
      }
      for (const w of raw.meta.warnings ?? []) warnings.push(w);

      let image = raw.image;

      // ---------- Step 2: pixelate ----------
      if (pixelate) {
        try {
          image = await pixelateNearest(image, pixelateTarget);
        } catch (err) {
          throw wrapStep(id, 'pixelate', err);
        }
      }

      // ---------- Step 3: quantize palette ----------
      if (paletteColors > 0) {
        try {
          image = await quantizePalette(image, paletteColors);
        } catch (err) {
          throw wrapStep(id, 'quantize', err);
        }
      }

      // ---------- Step 4: clean near-black pixels ----------
      let paletteSize: number | undefined;
      let blackPixelsReplaced: number | undefined;
      if (blackCleanup) {
        try {
          const cleaned = await cleanNearBlacks(image, {
            threshold: blackThreshold,
            seamless: true,
          });
          image = cleaned.image;
          paletteSize = cleaned.paletteSize;
          blackPixelsReplaced = cleaned.replaced;
        } catch (err) {
          throw wrapStep(id, 'clean-blacks', err);
        }
      }

      // ---------- Step 5: upscale to final size ----------
      try {
        image = await upscaleNearest(image, finalSize);
      } catch (err) {
        throw wrapStep(id, 'upscale', err);
      }

      const meta: TextureMeta = {
        provider: 'fal',
        latencyMs: Date.now() - t0,
        warnings,
        size: finalSize,
        ...(raw.meta.costUsd !== undefined ? { costUsd: raw.meta.costUsd } : {}),
        ...(paletteSize !== undefined ? { paletteSize } : {}),
        ...(blackPixelsReplaced !== undefined ? { blackPixelsReplaced } : {}),
      };

      return { image, meta };
    },
  };
}
