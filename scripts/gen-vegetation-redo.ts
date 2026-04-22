#!/usr/bin/env bun
/**
 * Regenerate the canonical vegetation billboard sprites (banana, rice,
 * mangrove, elephant grass). Recipe — uses the @pixel-forge/core sprite
 * pipeline + a 4-input batch wrapper for resume-on-rate-limit.
 *
 *   bun scripts/gen-vegetation-redo.ts
 */

import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { image, providers } from '@pixel-forge/core';

const OUT_DIR = './war-assets/vegetation';
mkdirSync(OUT_DIR, { recursive: true });

interface Asset { name: string; prompt: string; }
const ASSETS: Asset[] = [
  { name: 'banana-plant',      prompt: 'Single banana plant, thick green trunk, three large broad bright green paddle leaves spreading outward, small bunch of green bananas at top, full plant from base to crown visible, isolated on flat ground, side view' },
  { name: 'rice-paddy-plants', prompt: 'Dense cluster of young rice plants, thin bright green stalks growing upward in a tight bunch, narrow grass-like leaves, short 1m tall rice seedling cluster, full plant visible from roots to tips, isolated, side view' },
  { name: 'mangrove',          prompt: 'Full mangrove tree, tangled arching prop roots at base spreading wide, thick trunk, dense rounded dark green leaf canopy on top, entire tree visible from roots to crown, tropical coastal tree, isolated, side view' },
  { name: 'elephant-grass',    prompt: 'Tall dense cluster of elephant grass, bright green blades 2m tall growing in a thick clump, feathery silver-white seed plumes at the tips, strong visible black outlines on each blade, full grass clump from base to tips, isolated, side view' },
];

const sprite = image.pipelines.createSpritePipeline({
  imageProvider: providers.createGeminiProvider(),
  bgRemovalProvider: providers.createFalBgRemovalProvider(),
});

const batch = image.pipelines.createBatchPipeline<Asset, image.pipelines.SpriteOutput>({
  pipeline: {
    id: 'sprite-named',
    description: 'Sprite pipeline that takes our local Asset shape.',
    run: (a) => sprite.run({ prompt: a.prompt }),
  },
  getOutputPath: (a) => join(OUT_DIR, `${a.name}.png`),
  onProgress: (done, total) => console.log(`[${done}/${total}] complete`),
});

await batch.run(ASSETS);
console.log('\nDone! Check http://localhost:3000/gallery');
