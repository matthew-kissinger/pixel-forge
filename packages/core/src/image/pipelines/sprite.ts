/**
 * Sprite generation pipeline.
 *
 * Canonical flow distilled from `scripts/gen-vegetation-redo.ts`,
 * `scripts/gen-nva-soldiers.ts`, and the 12 other live sprite scripts:
 *
 *   1. Build the prompt with the 32-bit pixel-art style suffix and a
 *      background color hint.
 *   2. Call `imageProvider.generate` (or `editWithRefs` if refs are
 *      present) — the router is shape-driven, callers don't pick.
 *   3. Optionally run BiRefNet via the bg-removal provider.
 *   4. Optionally run a chroma cleanup pass matched to the background
 *      color (skipping yellow/orange when `preserveFlash` is set so
 *      muzzle-flash sprites survive).
 *   5. Return the final PNG buffer + meta.
 *
 * Every step that fails wraps the underlying error in
 * `PipelineStepFailed` so agents can drill in with `.underlying`.
 */

import { z } from 'zod';

import { PipelineInputInvalid } from '../../errors';
import type {
  ImageProvider,
  BgRemovalProvider,
} from '../../providers/types';
import type {
  ImageGenerateInput,
  ImageEditInput,
} from '../../schemas/image';
import { chromaCleanFor, type ChromaBackground } from '../chroma';
import { wrapStep } from './_common';
import type { Pipeline } from './types';

// =============================================================================
// Style suffix
// =============================================================================

/**
 * Default 32-bit pixel-art suffix from `CLAUDE.md` §"Critical: Sprite
 * Generation Pipeline". Callers can override `styleSuffix` to opt out.
 *
 * `{BG_HEX}` is replaced with the hex form of the chosen background
 * color. Keep this in sync with the gen-* scripts.
 */
export const DEFAULT_SPRITE_SUFFIX =
  '32-bit pixel art sprite, high-res pixel art style, detailed with visible pixels, ' +
  'bright saturated colors, black pixel outlines, clean hard edges, no anti-aliasing, ' +
  'no blur, game asset on solid {BG_HEX} background, entire background is flat solid ' +
  '{BG_HEX} with no gradients';

const BG_HEX: Record<ChromaBackground, string> = {
  magenta: '#FF00FF',
  blue: '#0000FF',
  green: '#00FF00',
};

function fillSuffix(template: string, background: ChromaBackground): string {
  return template.replaceAll('{BG_HEX}', BG_HEX[background]);
}

// =============================================================================
// Input / Output
// =============================================================================

const SpriteInputSchema = z
  .object({
    prompt: z.string().min(1).max(10_000),
    background: z.enum(['magenta', 'blue', 'green']).optional(),
    refs: z.array(z.instanceof(Buffer)).optional(),
    styleSuffix: z.string().optional(),
    chromaCleanup: z.boolean().optional(),
    runBiRefNet: z.boolean().optional(),
    /** Skip yellow/orange pixels in chroma — set for firing-pose sprites. */
    preserveFlash: z.boolean().optional(),
    dimensions: z
      .object({
        width: z.number().int().positive(),
        height: z.number().int().positive(),
      })
      .strict()
      .optional(),
    /** Optional explicit model override. */
    model: z.string().optional(),
    seed: z.number().int().nonnegative().optional(),
  })
  .strict();

export type SpriteInput = z.infer<typeof SpriteInputSchema>;

export interface SpriteMeta {
  provider: string;
  model: string;
  costUsd?: number;
  latencyMs: number;
  warnings: string[];
  /** Pixels zeroed by chroma cleanup, if it ran. */
  chromaCleaned?: number;
}

export interface SpriteOutput {
  /** Final PNG with transparent background. */
  image: Buffer;
  meta: SpriteMeta;
}

// =============================================================================
// Pipeline factory
// =============================================================================

export interface CreateSpritePipelineDeps {
  imageProvider: ImageProvider;
  /** Optional — only needed if any input asks for `runBiRefNet: true`. */
  bgRemovalProvider?: BgRemovalProvider;
}

/**
 * Build a sprite pipeline bound to the given providers. Returns a
 * `Pipeline<SpriteInput, SpriteOutput>` so the surface is uniform across
 * sprite/icon/texture/glb pipelines.
 */
export function createSpritePipeline(
  deps: CreateSpritePipelineDeps
): Pipeline<SpriteInput, SpriteOutput> {
  const id = 'sprite';
  const description =
    'Generate a 32-bit pixel-art sprite with chroma background, then strip background.';

  return {
    id,
    description,
    async run(rawInput: SpriteInput): Promise<SpriteOutput> {
      const parsed = SpriteInputSchema.safeParse(rawInput);
      if (!parsed.success) {
        throw new PipelineInputInvalid({
          pipeline: id,
          message: `Invalid sprite input: ${parsed.error.message}`,
          cause: parsed.error,
        });
      }
      const input = parsed.data;

      const background: ChromaBackground = input.background ?? 'magenta';
      const styleSuffix = fillSuffix(
        input.styleSuffix ?? DEFAULT_SPRITE_SUFFIX,
        background
      );
      const prompt = `${input.prompt}, ${styleSuffix}`;

      const warnings: string[] = [];
      const t0 = Date.now();

      // ---------- Step 1: image generation ----------
      const dimensions =
        input.dimensions ?? { width: 1024, height: 1024 };
      const wantRefs = (input.refs?.length ?? 0) > 0;

      let genResult: Awaited<ReturnType<ImageProvider['generate']>>;
      try {
        if (wantRefs) {
          const editInput: ImageEditInput = {
            prompt,
            background,
            dimensions,
            refs: input.refs as Buffer[],
            ...(input.model !== undefined ? { model: input.model } : {}),
            ...(input.seed !== undefined ? { seed: input.seed } : {}),
          };
          genResult = await deps.imageProvider.editWithRefs(editInput);
        } else {
          const genInput: ImageGenerateInput = {
            prompt,
            background,
            dimensions,
            ...(input.model !== undefined ? { model: input.model } : {}),
            ...(input.seed !== undefined ? { seed: input.seed } : {}),
          };
          genResult = await deps.imageProvider.generate(genInput);
        }
      } catch (err) {
        throw wrapStep(id, wantRefs ? 'editWithRefs' : 'generate', err);
      }

      let image = genResult.image;
      const totalCostUsd = genResult.meta.costUsd;
      for (const w of genResult.meta.warnings ?? []) warnings.push(w);

      // ---------- Step 2: BiRefNet (optional) ----------
      const runBiRefNet = input.runBiRefNet ?? true;
      if (runBiRefNet) {
        if (!deps.bgRemovalProvider) {
          warnings.push(
            'runBiRefNet=true but no bgRemovalProvider injected; skipping bg-removal step.'
          );
        } else {
          try {
            const bgOut = await deps.bgRemovalProvider.remove({
              image,
              backgroundColor: background,
            });
            image = bgOut.image;
            for (const w of bgOut.meta.warnings ?? []) warnings.push(w);
          } catch (err) {
            throw wrapStep(id, 'birefnet', err);
          }
        }
      }

      // ---------- Step 3: chroma cleanup ----------
      const chromaCleanup = input.chromaCleanup ?? true;
      let chromaCleaned: number | undefined;
      if (chromaCleanup) {
        try {
          const result = await chromaCleanFor(image, background, {
            preserveFlash: input.preserveFlash ?? false,
          });
          image = result.image;
          chromaCleaned = result.cleaned;
        } catch (err) {
          throw wrapStep(id, 'chroma-clean', err);
        }
      }

      const meta: SpriteMeta = {
        provider: genResult.provider,
        model: genResult.model,
        latencyMs: Date.now() - t0,
        warnings,
        ...(totalCostUsd !== undefined ? { costUsd: totalCostUsd } : {}),
        ...(chromaCleaned !== undefined ? { chromaCleaned } : {}),
      };

      return { image, meta };
    },
  };
}
