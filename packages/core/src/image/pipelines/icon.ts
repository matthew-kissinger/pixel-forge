/**
 * UI icon generation pipeline.
 *
 * Critical difference from `sprite.ts`: NO BiRefNet. BiRefNet aggressively
 * eats solid white silhouettes (mono variant) and destroys faction
 * emblem colors (colored variant). Both variants do a direct chroma key
 * on the raw provider output.
 *
 * Variants:
 * - `mono`     — solid white silhouette on magenta. CSS colors it later.
 * - `colored`  — solid colors with 3px black outlines on blue.
 *
 * Ported from `scripts/gen-ui-icons.ts` and `scripts/gen-faction-icons-fix.ts`.
 */

import { z } from 'zod';

import { PipelineInputInvalid } from '../../errors';
import type { ImageProvider } from '../../providers/types';
import type {
  ImageEditInput,
  ImageGenerateInput,
} from '../../schemas/image';
import { chromaCleanFor, type ChromaBackground } from '../chroma';
import { wrapStep } from './_common';
import type { Pipeline } from './types';

// =============================================================================
// Style suffixes
// =============================================================================

/** Mono icon style. From `gen-ui-icons.ts` ICON_LIBRARY_STYLE. */
export const MONO_ICON_STYLE = [
  'pixel art military HUD icon',
  'solid white filled silhouette',
  'completely filled with white',
  'no outlines',
  'no black lines',
  'no internal detail',
  'no shading',
  'flat solid white shape only',
  'hard crisp pixel edges',
  'no anti-aliasing',
  'no gradients',
  'no soft edges',
  'no blur',
  'no drop shadows',
  'no glow effects',
  'centered in frame with padding',
  'single icon only',
  'no background objects',
  'no text',
  'no labels',
  'no words',
  'no numbers',
  'on solid flat magenta #FF00FF background',
  'entire background is uniform flat magenta #FF00FF',
  'no background patterns',
  'no background gradients',
].join(', ');

/** Colored emblem style. From `gen-ui-icons.ts` EMBLEM_LIBRARY_STYLE. */
export const COLORED_ICON_STYLE = [
  'pixel art military faction emblem icon',
  'bold flat solid colors',
  'thick 3-pixel black outline around the entire outer edge of the emblem',
  'no internal shading or gradients',
  'hard crisp pixel edges',
  'no anti-aliasing',
  'no soft edges',
  'no blur',
  'no drop shadows',
  'no glow effects',
  'centered in frame with padding',
  'single emblem only',
  'no background objects',
  'no text',
  'no labels',
  'no words',
  'on solid flat blue #0000FF background',
  'entire background is uniform flat blue #0000FF',
  'no background patterns',
  'no background gradients',
].join(', ');

// =============================================================================
// Input / Output
// =============================================================================

const IconInputSchema = z
  .object({
    prompt: z.string().min(1).max(10_000),
    variant: z.enum(['mono', 'colored']),
    refs: z.array(z.instanceof(Buffer)).optional(),
    dimensions: z
      .object({
        width: z.number().int().positive(),
        height: z.number().int().positive(),
      })
      .strict()
      .optional(),
    /** Optional override style suffix (consumed verbatim). */
    styleOverride: z.string().optional(),
    model: z.string().optional(),
    seed: z.number().int().nonnegative().optional(),
  })
  .strict();

export type IconInput = z.infer<typeof IconInputSchema>;

export interface IconMeta {
  provider: string;
  model: string;
  variant: 'mono' | 'colored';
  costUsd?: number;
  latencyMs: number;
  warnings: string[];
  chromaCleaned: number;
}

export interface IconOutput {
  image: Buffer;
  meta: IconMeta;
}

// =============================================================================
// Variant config
// =============================================================================

interface VariantConfig {
  style: string;
  background: ChromaBackground;
}

const VARIANT_CONFIG: Record<'mono' | 'colored', VariantConfig> = {
  mono: { style: MONO_ICON_STYLE, background: 'magenta' },
  colored: { style: COLORED_ICON_STYLE, background: 'blue' },
};

// =============================================================================
// Pipeline factory
// =============================================================================

export interface CreateIconPipelineDeps {
  imageProvider: ImageProvider;
}

/**
 * Build an icon pipeline. NO bg-removal provider — icons skip BiRefNet
 * by design.
 */
export function createIconPipeline(
  deps: CreateIconPipelineDeps
): Pipeline<IconInput, IconOutput> {
  const id = 'icon';
  const description =
    'Generate a UI icon (mono silhouette or colored emblem) and chroma-key its background.';

  return {
    id,
    description,
    async run(rawInput: IconInput): Promise<IconOutput> {
      const parsed = IconInputSchema.safeParse(rawInput);
      if (!parsed.success) {
        throw new PipelineInputInvalid({
          pipeline: id,
          message: `Invalid icon input: ${parsed.error.message}`,
          cause: parsed.error,
        });
      }
      const input = parsed.data;

      const config = VARIANT_CONFIG[input.variant];
      const style = input.styleOverride ?? config.style;
      const prompt = `${input.prompt}, ${style}`;

      const t0 = Date.now();
      const dimensions = input.dimensions ?? { width: 1024, height: 1024 };
      const wantRefs = (input.refs?.length ?? 0) > 0;

      // ---------- Step 1: image gen ----------
      let genResult: Awaited<ReturnType<ImageProvider['generate']>>;
      try {
        if (wantRefs) {
          const editInput: ImageEditInput = {
            prompt,
            background: config.background,
            dimensions,
            refs: input.refs as Buffer[],
            ...(input.model !== undefined ? { model: input.model } : {}),
            ...(input.seed !== undefined ? { seed: input.seed } : {}),
          };
          genResult = await deps.imageProvider.editWithRefs(editInput);
        } else {
          const genInput: ImageGenerateInput = {
            prompt,
            background: config.background,
            dimensions,
            ...(input.model !== undefined ? { model: input.model } : {}),
            ...(input.seed !== undefined ? { seed: input.seed } : {}),
          };
          genResult = await deps.imageProvider.generate(genInput);
        }
      } catch (err) {
        throw wrapStep(id, wantRefs ? 'editWithRefs' : 'generate', err);
      }

      // ---------- Step 2: direct chroma key (NO BiRefNet) ----------
      let cleanResult;
      try {
        cleanResult = await chromaCleanFor(genResult.image, config.background);
      } catch (err) {
        throw wrapStep(id, 'chroma-clean', err);
      }

      const meta: IconMeta = {
        provider: genResult.provider,
        model: genResult.model,
        variant: input.variant,
        latencyMs: Date.now() - t0,
        warnings: [...(genResult.meta.warnings ?? [])],
        chromaCleaned: cleanResult.cleaned,
        ...(genResult.meta.costUsd !== undefined
          ? { costUsd: genResult.meta.costUsd }
          : {}),
      };

      return { image: cleanResult.image, meta };
    },
  };
}
