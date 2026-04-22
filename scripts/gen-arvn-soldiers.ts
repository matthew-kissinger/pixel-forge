#!/usr/bin/env bun
/**
 * Generate ARVN soldier sprite set (T-pose + 9 directional poses).
 * Recipe — all pipeline logic lives in @pixel-forge/core.
 *
 *   bun scripts/gen-arvn-soldiers.ts
 *
 * Uses US sprite (equipment style) + NVA T-pose (proportions/pixel
 * density) as dual style refs so ARVN matches the existing NPC look.
 */

import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { image, providers } from '@pixel-forge/core';

import { GAME_SPRITES, loadRef, STANDARD_SOLDIER_POSES } from './_shared';

const OUT_DIR = './war-assets/soldiers';
const ARVN_UNIFORM =
  'ARVN South Vietnamese soldier: US-pattern M1 steel helmet with camouflage cover, tiger stripe camouflage uniform with dark green and brown stripes, M16A1 rifle, black combat boots, US-style web gear with ammo pouches';

mkdirSync(OUT_DIR, { recursive: true });

const imageProvider = providers.createGeminiProvider();
const bgRemovalProvider = providers.createFalBgRemovalProvider();
const pipeline = image.pipelines.createSoldierSetPipeline({
  imageProvider,
  bgRemovalProvider,
});

const tposePath = join(OUT_DIR, 'arvn-tpose-ref.png');
const nvaTposePath = join(OUT_DIR, 'nva-tpose-ref.png');

const result = await pipeline.run({
  faction: 'ARVN',
  tPosePrompt:
    `Create an ARVN soldier T-pose character sheet matching the exact pixel art style, proportions, and level of detail of these reference images. The first image shows the US soldier style to match for equipment. The second image shows the exact pixel art proportions and T-pose layout to follow. Change uniform to: ${ARVN_UNIFORM}. Same body proportions, same pixel density, same outline thickness. T-pose: arms out to sides, legs slightly apart, standing upright, front facing view. Full body head to toe visible`,
  factionStyleRefs: existsSync(nvaTposePath)
    ? [loadRef(`${GAME_SPRITES}/us-walk-front-1.webp`), loadRef(nvaTposePath)]
    : [loadRef(`${GAME_SPRITES}/us-walk-front-1.webp`)],
  poses: STANDARD_SOLDIER_POSES.map((p) => ({
    name: `arvn-${p.name}`,
    prompt: `Recreate the second reference image's exact pose with the ARVN soldier from the first reference image. Match the pixel art style, proportions, and detail level exactly. ${ARVN_UNIFORM}, ${p.desc}, full body head to toe visible, no text`,
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
