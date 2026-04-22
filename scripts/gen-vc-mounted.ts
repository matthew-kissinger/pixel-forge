#!/usr/bin/env bun
/**
 * Generate the VC mounted/seated soldier sprite (upper body, hands forward
 * as if gripping helicopter-door-gun handles). Recipe — uses the sprite
 * pipeline directly with US mounted as pose ref + VC walk-front as
 * faction-style ref.
 *
 *   bun scripts/gen-vc-mounted.ts
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { image, providers } from '@pixel-forge/core';

import { GAME_SPRITES, loadRef } from './_shared';

const OUT_DIR = './war-assets/soldiers';
const VC_UNIFORM =
  'Viet Cong guerrilla fighter: black pajama clothing, conical straw non la hat, ammunition bandolier across chest, minimal web gear';
const MOUNTED_DESC =
  'upper body only from waist up, facing forward, both hands extended straight forward at chest height as if gripping handles or controls, NO weapon, NO gun, NO rifle in image, just the soldier upper body and arms';

mkdirSync(OUT_DIR, { recursive: true });

const sprite = image.pipelines.createSpritePipeline({
  imageProvider: providers.createGeminiProvider(),
  bgRemovalProvider: providers.createFalBgRemovalProvider(),
});

const result = await sprite.run({
  prompt:
    `Recreate the second reference image's pose (upper-body, hands extended forward) with the Viet Cong fighter from the first reference image. ${VC_UNIFORM}, ${MOUNTED_DESC}, no text`,
  refs: [
    loadRef(`${GAME_SPRITES}/vc-walk-front-1.webp`),
    loadRef(`${GAME_SPRITES}/us-mounted.png`),
  ],
});

const out = join(OUT_DIR, 'vc-mounted.png');
writeFileSync(out, result.image);
console.log(`Done: ${out} (${(result.image.length / 1024).toFixed(0)}KB)`);
