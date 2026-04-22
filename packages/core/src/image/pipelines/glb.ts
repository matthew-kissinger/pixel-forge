/**
 * GLB generation pipeline.
 *
 * Thin wrapper around `kiln.generate()`. The wrapper exists so callers
 * see a uniform `Pipeline<I, O>` shape across every asset type — agents
 * and CLIs can iterate over the pipeline catalog without special-casing
 * GLB generation.
 *
 * Why a wrapper instead of using `kiln.generate` directly?
 * - Uniform error wrapping via `PipelineStepFailed`
 * - Pipeline introspection (`.id` / `.description`) for catalog tools
 * - Future room to chain post-processing (mesh decimation, texture
 *   baking) without changing the public surface
 */

import { z } from 'zod';

import { PipelineInputInvalid } from '../../errors';
import {
  generate as kilnGenerate,
  type KilnGenerateOptions,
  type KilnGenerateOutput,
} from '../../kiln';
import { wrapStep } from './_common';
import type { Pipeline } from './types';

// =============================================================================
// Input / Output
// =============================================================================

const GlbInputSchema = z
  .object({
    prompt: z.string().min(1).max(50_000),
    /**
     * Asset category. Maps to the kiln category enum, with 'vehicle' /
     * 'building' / 'weapon' folded under 'prop' for now (kiln itself
     * only knows the four canonical categories).
     */
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
      .optional(),
    style: z
      .enum(['low-poly', 'stylized', 'voxel', 'detailed', 'realistic'])
      .optional(),
    referenceImageUrl: z.string().optional(),
    includeAnimation: z.boolean().optional(),
    timeoutMs: z.number().int().positive().optional(),
    model: z.string().optional(),
  })
  .strict();

export type GlbInput = z.infer<typeof GlbInputSchema>;

export interface GlbOutput {
  /** Generated JS code (kiln body). */
  code: string;
  /** Rendered GLB ready to write to disk. */
  glb: Buffer;
  /** Extracted from the code's `const meta = {...}` block, plus `tris`. */
  meta: KilnGenerateOutput['meta'];
  /** Non-fatal issues (e.g. animation target missing). */
  warnings: string[];
}

// =============================================================================
// Category mapping
// =============================================================================

/**
 * Map the broader pipeline category set onto the four kiln categories.
 * vehicle/building/weapon collapse to 'prop' — the GLB code path treats
 * these identically; only the prompt-builder cares.
 */
function toKilnCategory(
  c: GlbInput['category']
): NonNullable<KilnGenerateOptions['category']> {
  if (!c) return 'prop';
  if (c === 'character' || c === 'prop' || c === 'vfx' || c === 'environment') {
    return c;
  }
  return 'prop';
}

// =============================================================================
// Pipeline factory
// =============================================================================

export interface CreateGlbPipelineDeps {
  /**
   * Optional override for `kiln.generate` — useful for tests so they can
   * skip the Claude SDK roundtrip. Production callers omit this.
   */
  generate?: typeof kilnGenerate;
}

/**
 * Build a GLB pipeline. Defaults to the real `kiln.generate` from
 * `@pixel-forge/core/kiln`; tests inject a fake.
 */
export function createGlbPipeline(
  deps: CreateGlbPipelineDeps = {}
): Pipeline<GlbInput, GlbOutput> {
  const id = 'glb';
  const description =
    'Generate a Three.js Kiln scene as JavaScript and render it to a GLB buffer.';

  const generate = deps.generate ?? kilnGenerate;

  return {
    id,
    description,
    async run(rawInput: GlbInput): Promise<GlbOutput> {
      const parsed = GlbInputSchema.safeParse(rawInput);
      if (!parsed.success) {
        throw new PipelineInputInvalid({
          pipeline: id,
          message: `Invalid glb input: ${parsed.error.message}`,
          cause: parsed.error,
        });
      }
      const input = parsed.data;

      const opts: KilnGenerateOptions = {
        category: toKilnCategory(input.category),
        ...(input.style !== undefined ? { style: input.style } : {}),
        ...(input.referenceImageUrl !== undefined
          ? { referenceImageUrl: input.referenceImageUrl }
          : {}),
        ...(input.includeAnimation !== undefined
          ? { includeAnimation: input.includeAnimation }
          : {}),
        ...(input.timeoutMs !== undefined ? { timeoutMs: input.timeoutMs } : {}),
        ...(input.model !== undefined ? { model: input.model } : {}),
      };

      let result: KilnGenerateOutput;
      try {
        result = await generate(input.prompt, opts);
      } catch (err) {
        throw wrapStep(id, 'kiln-generate', err);
      }

      return {
        code: result.code,
        glb: result.glb,
        meta: result.meta,
        warnings: result.warnings,
      };
    },
  };
}
