#!/usr/bin/env bun
/**
 * Generate NVA soldier sprite set (T-pose + 9 directional poses).
 * Recipe — all pipeline logic lives in @pixel-forge/core.
 *
 *   bun scripts/gen-nva-soldiers.ts
 *
 * Outputs to war-assets/soldiers/nva-*.png. Resumable: re-run after a
 * Gemini rate-limit and the soldier-set pipeline + on-disk skip handle
 * the rest.
 */

import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { image, providers } from '@pixel-forge/core';

import { GAME_SPRITES, loadRef, STANDARD_SOLDIER_POSES } from './_shared';

const OUT_DIR = './war-assets/soldiers';
const NVA_UNIFORM =
  'NVA North Vietnamese Army regular soldier: pith helmet (khaki sun helmet), khaki-olive uniform with web gear and chest rig ammo pouches, AK-47 rifle, canvas boots';

mkdirSync(OUT_DIR, { recursive: true });

const imageProvider = providers.createGeminiProvider();
const bgRemovalProvider = providers.createFalBgRemovalProvider();
const pipeline = image.pipelines.createSoldierSetPipeline({
  imageProvider,
  bgRemovalProvider,
});

const tposePath = join(OUT_DIR, 'nva-tpose-ref.png');
const result = await pipeline.run({
  faction: 'NVA',
  tPosePrompt:
    `Create an NVA soldier T-pose character sheet matching the exact pixel art style, proportions, and level of detail of these two reference game sprites. Same body size, same pixel density, same outline thickness, same level of simplicity. Change uniform to: ${NVA_UNIFORM}. T-pose: arms out to sides, legs slightly apart, standing upright, front facing view. Full body head to toe visible`,
  factionStyleRefs: [
    loadRef(`${GAME_SPRITES}/vc-walk-front-1.webp`),
    loadRef(`${GAME_SPRITES}/us-walk-front-1.webp`),
  ],
  poses: STANDARD_SOLDIER_POSES.map((p) => ({
    name: `nva-${p.name}`,
    prompt: `Recreate the second reference image's exact pose with the NVA soldier from the first reference image. Match the pixel art style, proportions, and detail level exactly. ${NVA_UNIFORM}, ${p.desc}, full body head to toe visible, no text`,
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
