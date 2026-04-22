#!/usr/bin/env bun
/**
 * Generate Viet Cong soldier sprite set (T-pose + 9 directional poses).
 * Recipe — all pipeline logic lives in @pixel-forge/core.
 *
 *   bun scripts/gen-vc-soldiers.ts
 *
 * VC differs from NVA only in uniform + pose self-references (the
 * existing `vc-*.webp` files were the originals). Outputs to
 * war-assets/soldiers/vc-*.png.
 */

import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { image, providers } from '@pixel-forge/core';

import { GAME_SPRITES, loadRef, STANDARD_SOLDIER_POSES } from './_shared';

const OUT_DIR = './war-assets/soldiers';
const VC_UNIFORM =
  'Viet Cong guerrilla fighter: black pajama clothing, conical straw non la hat, AK-47 rifle, Ho Chi Minh sandals, ammunition bandolier across chest, minimal web gear';

mkdirSync(OUT_DIR, { recursive: true });

const imageProvider = providers.createGeminiProvider();
const bgRemovalProvider = providers.createFalBgRemovalProvider();
const pipeline = image.pipelines.createSoldierSetPipeline({
  imageProvider,
  bgRemovalProvider,
});

const tposePath = join(OUT_DIR, 'vc-tpose-ref.png');
const result = await pipeline.run({
  faction: 'VC',
  tPosePrompt:
    `Create a Viet Cong guerrilla T-pose character sheet. ${VC_UNIFORM}. T-pose: arms out to sides, legs slightly apart, standing upright, front facing view. Full body head to toe visible`,
  poses: STANDARD_SOLDIER_POSES.map((p) => ({
    name: `vc-${p.name}`,
    prompt: `Recreate the second reference image's exact pose with the Viet Cong fighter from the first reference image. Match the pixel art style, proportions, and detail level exactly. ${VC_UNIFORM}, ${p.desc}, full body head to toe visible, no text`,
    poseRef: loadRef(`${GAME_SPRITES}/${p.vcRef}`),
  })),
});

if (!existsSync(tposePath)) writeFileSync(tposePath, result.tPose.image);
for (const pose of result.poses) {
  writeFileSync(join(OUT_DIR, `${pose.name}.png`), pose.sprite.image);
}

console.log(
  `\nDone. ${result.poses.length} poses, total ${(result.meta.totalLatencyMs / 1000).toFixed(1)}s` +
    `${result.meta.totalCostUsd ? `, ~$${result.meta.totalCostUsd.toFixed(2)}` : ''}.`,
);
