/**
 * Faction soldier sprite-set pipeline.
 *
 * Distilled from `scripts/gen-nva-soldiers.ts` and the
 * `docs/faction-sprite-workflow.md` spec.
 *
 * Two-stage workflow:
 *   1. Generate a T-pose character sheet first. If `factionStyleRefs`
 *      are provided (existing faction sprites), use them as dual refs
 *      so detail level + proportions match.
 *   2. For each pose definition, call the sprite pipeline with the
 *      T-pose plus the pose's specific reference image (e.g.
 *      vc-walk-front-1.webp) as the second ref.
 *
 * Pose names containing 'fire' / 'firing' opt into the muzzle-flash
 * preserving chroma cleanup automatically — callers can override with
 * `preserveFlash` per pose if needed.
 *
 * Designed to compose with the batch pipeline for resumable runs.
 */

import { z } from 'zod';

import { PipelineInputInvalid } from '../../errors';
import type {
  BgRemovalProvider,
  ImageProvider,
} from '../../providers/types';
import {
  createSpritePipeline,
  type SpriteInput,
  type SpriteOutput,
} from './sprite';
import { wrapStep } from './_common';
import type { Pipeline } from './types';

// =============================================================================
// Input / Output
// =============================================================================

const PoseDefSchema = z
  .object({
    name: z.string().min(1),
    prompt: z.string().min(1),
    /** PNG buffer to feed as the *second* reference (alongside the T-pose). */
    poseRef: z.instanceof(Buffer).optional(),
    /** Force preserveFlash on or off; auto-detect otherwise. */
    preserveFlash: z.boolean().optional(),
  })
  .strict();

const SoldierSetInputSchema = z
  .object({
    faction: z.string().min(1),
    /** Prompt for the T-pose character sheet. */
    tPosePrompt: z.string().min(1),
    /** Existing faction sprites used as dual style refs for the T-pose. */
    factionStyleRefs: z.array(z.instanceof(Buffer)).optional(),
    /** 1+ pose definitions. */
    poses: z.array(PoseDefSchema).min(1),
    /** Background color shared across the set. Default magenta. */
    background: z.enum(['magenta', 'blue', 'green']).optional(),
    /** Override style suffix for every call. */
    styleSuffix: z.string().optional(),
    /** Per-call output dimensions. */
    dimensions: z
      .object({
        width: z.number().int().positive(),
        height: z.number().int().positive(),
      })
      .strict()
      .optional(),
  })
  .strict();

export type PoseDef = z.infer<typeof PoseDefSchema>;
export type SoldierSetInput = z.infer<typeof SoldierSetInputSchema>;

export interface SoldierSetOutput {
  tPose: SpriteOutput;
  poses: Array<{ name: string; sprite: SpriteOutput }>;
  meta: {
    totalCostUsd: number;
    totalLatencyMs: number;
    warnings: string[];
  };
}

// =============================================================================
// Pipeline factory
// =============================================================================

export interface CreateSoldierSetPipelineDeps {
  imageProvider: ImageProvider;
  bgRemovalProvider?: BgRemovalProvider;
}

/** Pose name regex used to default `preserveFlash=true`. */
const FIRE_POSE_REGEX = /fir(e|ing)/i;

/**
 * Build the soldier-set pipeline. Returns a uniform
 * `Pipeline<SoldierSetInput, SoldierSetOutput>`.
 */
export function createSoldierSetPipeline(
  deps: CreateSoldierSetPipelineDeps
): Pipeline<SoldierSetInput, SoldierSetOutput> {
  const id = 'soldier-set';
  const description =
    'Generate a T-pose character sheet plus N pose sprites referencing it.';

  const sprite = createSpritePipeline(deps);

  return {
    id,
    description,
    async run(rawInput: SoldierSetInput): Promise<SoldierSetOutput> {
      const parsed = SoldierSetInputSchema.safeParse(rawInput);
      if (!parsed.success) {
        throw new PipelineInputInvalid({
          pipeline: id,
          message: `Invalid soldier-set input: ${parsed.error.message}`,
          cause: parsed.error,
        });
      }
      const input = parsed.data;
      const background = input.background ?? 'magenta';
      const warnings: string[] = [];
      const t0 = Date.now();
      let totalCost = 0;

      // ---------- Step 1: T-pose ----------
      const tposeSpriteInput: SpriteInput = {
        prompt: input.tPosePrompt,
        background,
        ...(input.factionStyleRefs !== undefined &&
        input.factionStyleRefs.length > 0
          ? { refs: input.factionStyleRefs }
          : {}),
        ...(input.styleSuffix !== undefined
          ? { styleSuffix: input.styleSuffix }
          : {}),
        ...(input.dimensions !== undefined
          ? { dimensions: input.dimensions }
          : {}),
      };

      let tPose: SpriteOutput;
      try {
        tPose = await sprite.run(tposeSpriteInput);
      } catch (err) {
        // Re-wrap to attribute to the soldier-set pipeline rather than
        // the inner sprite step.
        throw wrapStep(id, 'tpose', err);
      }
      if (tPose.meta.costUsd) totalCost += tPose.meta.costUsd;
      for (const w of tPose.meta.warnings) warnings.push(`tpose: ${w}`);

      // ---------- Step 2: each pose ----------
      const poses: Array<{ name: string; sprite: SpriteOutput }> = [];

      for (const pose of input.poses) {
        const refs: Buffer[] = [tPose.image];
        if (pose.poseRef) refs.push(pose.poseRef);

        const preserveFlash =
          pose.preserveFlash ?? FIRE_POSE_REGEX.test(pose.name);

        const poseInput: SpriteInput = {
          prompt: pose.prompt,
          background,
          refs,
          preserveFlash,
          ...(input.styleSuffix !== undefined
            ? { styleSuffix: input.styleSuffix }
            : {}),
          ...(input.dimensions !== undefined
            ? { dimensions: input.dimensions }
            : {}),
        };

        let result: SpriteOutput;
        try {
          result = await sprite.run(poseInput);
        } catch (err) {
          throw wrapStep(id, `pose:${pose.name}`, err);
        }
        if (result.meta.costUsd) totalCost += result.meta.costUsd;
        for (const w of result.meta.warnings) {
          warnings.push(`${pose.name}: ${w}`);
        }
        poses.push({ name: pose.name, sprite: result });
      }

      return {
        tPose,
        poses,
        meta: {
          totalCostUsd: totalCost,
          totalLatencyMs: Date.now() - t0,
          warnings,
        },
      };
    },
  };
}
