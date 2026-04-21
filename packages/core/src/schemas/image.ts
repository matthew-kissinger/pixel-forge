/**
 * Zod schemas for every image / texture / bg-removal / code-gen operation
 * exposed by `@pixel-forge/core`.
 *
 * Design rules:
 * - **Strict objects**: unknown fields throw — agents get crisp validation
 *   errors instead of silently dropped fields.
 * - **Buffer-valued fields** are `z.instanceof(Buffer)` — we don't want
 *   base64 data URLs leaking into the core API surface.
 * - **Cap-free refs**: multi-ref image limits live in `capabilities.ts`,
 *   not in these schemas. Schemas enforce shape, capabilities enforce
 *   model-specific caps.
 * - Inferred types are re-exported alongside their schema, so
 *   `providers/types.ts` can depend on types without pulling zod runtime
 *   validation into the hot path.
 */

import { z } from 'zod';

// =============================================================================
// Shared primitives
// =============================================================================

const ProviderIdSchema = z.enum(['gemini', 'openai', 'fal', 'anthropic']);

const DimensionsSchema = z
  .object({
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  })
  .strict();

const BackgroundColorSchema = z.enum(['magenta', 'blue', 'red', 'green']);

const MetaSchema = z
  .object({
    latencyMs: z.number().int().nonnegative(),
    costUsd: z.number().nonnegative().optional(),
    warnings: z.array(z.string()).default([]),
  })
  .strict();

/** Buffer validator. Using z.instanceof keeps runtime + type in lockstep. */
const BufferSchema = z.instanceof(Buffer);

// =============================================================================
// Image: generate + edit
// =============================================================================

export const ImageGenerateInputSchema = z
  .object({
    prompt: z.string().min(1).max(10_000),
    provider: ProviderIdSchema.optional(),
    model: z.string().optional(),
    dimensions: DimensionsSchema.optional(),
    /**
     * Solid-color background for chroma-keyed pipelines. When set, the
     * provider is instructed to paint a flat background the chroma pass
     * will strip out.
     */
    background: BackgroundColorSchema.optional(),
    quality: z.enum(['low', 'medium', 'high', 'auto']).optional(),
    seed: z.number().int().nonnegative().optional(),
  })
  .strict();
export type ImageGenerateInput = z.infer<typeof ImageGenerateInputSchema>;

export const ImageEditInputSchema = ImageGenerateInputSchema.extend({
  /**
   * Reference images. The provider's per-model cap (e.g. 14 for Gemini,
   * 16 for gpt-image-2) is enforced via capabilities.ts, not here.
   */
  refs: z.array(BufferSchema).min(1),
}).strict();
export type ImageEditInput = z.infer<typeof ImageEditInputSchema>;

export const ImageGenerateOutputSchema = z
  .object({
    image: BufferSchema,
    provider: ProviderIdSchema,
    model: z.string(),
    meta: MetaSchema,
  })
  .strict();
export type ImageGenerateOutput = z.infer<typeof ImageGenerateOutputSchema>;

// =============================================================================
// Texture
// =============================================================================

export const TextureGenerateInputSchema = z
  .object({
    description: z.string().min(1).max(2_000),
    size: z.number().int().positive().optional(),
    loraScale: z.number().min(0).max(2).optional(),
    steps: z.number().int().positive().optional(),
    guidance: z.number().positive().optional(),
    pixelate: z.boolean().optional(),
    pixelateTarget: z.number().int().positive().optional(),
    paletteColors: z.number().int().nonnegative().optional(),
  })
  .strict();
export type TextureGenerateInput = z.infer<typeof TextureGenerateInputSchema>;

export const TextureGenerateOutputSchema = z
  .object({
    image: BufferSchema,
    meta: MetaSchema,
  })
  .strict();
export type TextureGenerateOutput = z.infer<typeof TextureGenerateOutputSchema>;

// =============================================================================
// Background removal
// =============================================================================

export const BgRemovalInputSchema = z
  .object({
    image: BufferSchema,
    /** Matches the bg the image was generated on, so the chroma cleanup pass can tune. */
    backgroundColor: BackgroundColorSchema.optional(),
  })
  .strict();
export type BgRemovalInput = z.infer<typeof BgRemovalInputSchema>;

export const BgRemovalOutputSchema = z
  .object({
    image: BufferSchema,
    meta: MetaSchema,
  })
  .strict();
export type BgRemovalOutput = z.infer<typeof BgRemovalOutputSchema>;

// =============================================================================
// Code-gen (Kiln / Claude)
// =============================================================================

/** Mirrors `kiln.KilnGenerateRequest` — kept here as the canonical zod form. */
export const CodeGenInputSchema = z
  .object({
    prompt: z.string().min(1).max(50_000),
    mode: z.enum(['glb', 'tsl', 'both']).default('glb'),
    category: z.enum(['character', 'prop', 'vfx', 'environment']).default('prop'),
    style: z.enum(['low-poly', 'stylized', 'voxel', 'detailed', 'realistic']).optional(),
    budget: z
      .object({
        maxTriangles: z.number().int().positive().optional(),
        maxMaterials: z.number().int().positive().optional(),
      })
      .strict()
      .optional(),
    includeAnimation: z.boolean().optional(),
    existingCode: z.string().optional(),
    referenceImageUrl: z.string().optional(),
  })
  .strict();
export type CodeGenInput = z.infer<typeof CodeGenInputSchema>;

export const CodeGenUsageSchema = z
  .object({
    inputTokens: z.number().int().nonnegative(),
    outputTokens: z.number().int().nonnegative(),
  })
  .strict();
export type CodeGenUsage = z.infer<typeof CodeGenUsageSchema>;

export const CodeGenOutputSchema = z
  .object({
    code: z.string(),
    effectCode: z.string().optional(),
    usage: CodeGenUsageSchema.optional(),
    warnings: z.array(z.string()).default([]),
  })
  .strict();
export type CodeGenOutput = z.infer<typeof CodeGenOutputSchema>;

export const CodeRefactorInputSchema = z
  .object({
    code: z.string().min(1),
    instruction: z.string().min(1).max(5_000),
  })
  .strict();
export type CodeRefactorInput = z.infer<typeof CodeRefactorInputSchema>;

export const CodeCompactInputSchema = z
  .object({
    code: z.string().min(1),
    targetTokens: z.number().int().positive().optional(),
  })
  .strict();
export type CodeCompactInput = z.infer<typeof CodeCompactInputSchema>;
