#!/usr/bin/env bun
/**
 * Resume-only ARVN sprite regeneration. Skips any pose whose .png is
 * already on disk. Recipe — uses @pixel-forge/core sprite pipeline
 * directly (one call per missing pose) instead of the full soldier-set
 * pipeline so we don't pay for the T-pose roundtrip.
 *
 *   bun scripts/gen-arvn-remaining.ts
 */

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { image, providers } from '@pixel-forge/core';

import { GAME_SPRITES, loadRef, STANDARD_SOLDIER_POSES } from './_shared';

const OUT_DIR = './war-assets/soldiers';
const ARVN_UNIFORM =
  'ARVN Army of the Republic of Vietnam soldier: US-pattern M1 steel helmet with camouflage cover, tiger stripe camouflage uniform with dark green and brown stripes, M16A1 rifle, black combat boots, US-style web gear with ammo pouches';

mkdirSync(OUT_DIR, { recursive: true });

const tposePath = join(OUT_DIR, 'arvn-tpose-ref.png');
if (!existsSync(tposePath)) {
  console.error(
    `Missing ${tposePath}. Run \`bun scripts/gen-arvn-soldiers.ts\` first to seed the T-pose.`,
  );
  process.exit(1);
}
const arvnTpose = loadRef(tposePath);

const sprite = image.pipelines.createSpritePipeline({
  imageProvider: providers.createGeminiProvider(),
  bgRemovalProvider: providers.createFalBgRemovalProvider(),
});

let written = 0;
let skipped = 0;
for (const p of STANDARD_SOLDIER_POSES) {
  const out = join(OUT_DIR, `arvn-${p.name}.png`);
  if (existsSync(out)) {
    skipped++;
    continue;
  }

  console.log(`--- arvn-${p.name} ---`);
  const result = await sprite.run({
    prompt: `Recreate the second reference image's pose with the ARVN soldier from the first reference image. ${ARVN_UNIFORM}, ${p.desc}, full body head to toe visible, no text`,
    refs: [arvnTpose, loadRef(`${GAME_SPRITES}/${p.vcRef}`)],
    preserveFlash: /fir(e|ing)/.test(p.name),
  });
  writeFileSync(out, result.image);
  written++;
}

console.log(`\nDone. ${written} written, ${skipped} skipped.`);
