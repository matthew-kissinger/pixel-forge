#!/usr/bin/env bun
/**
 * Vegetation batch 2 redo: small bamboo grove + pixel-art banyan tree.
 * Recipe — uses the @pixel-forge/core sprite pipeline + batch wrapper.
 *
 *   bun scripts/gen-batch2-redo.ts
 */

import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { image, providers } from '@pixel-forge/core';

const OUT_DIR = './war-assets/vegetation';
mkdirSync(OUT_DIR, { recursive: true });

interface Asset { name: string; subject: string; }
const ASSETS: Asset[] = [
  { name: 'bamboo-grove', subject: 'Small cluster of 4-5 bamboo stalks, tall green canes with characteristic nodes, narrow leaves at top, simple compact shape, side view' },
  { name: 'banyan-tree',  subject: 'Large banyan tree with aerial roots hanging from thick branches, twisted gnarled brown trunk, dense dark green leaf canopy, side view' },
];

const sprite = image.pipelines.createSpritePipeline({
  imageProvider: providers.createGeminiProvider(),
  bgRemovalProvider: providers.createFalBgRemovalProvider(),
});

const batch = image.pipelines.createBatchPipeline<Asset, image.pipelines.SpriteOutput>({
  pipeline: {
    id: 'sprite-named',
    description: 'Sprite pipeline taking our local Asset shape.',
    run: (a) => sprite.run({ prompt: a.subject }),
  },
  getOutputPath: (a) => join(OUT_DIR, `${a.name}.png`),
  onProgress: (done, total) => console.log(`[${done}/${total}] complete`),
});

await batch.run(ASSETS);
console.log('\nRedo complete! Review at http://localhost:3000/gallery');
