#!/usr/bin/env bun
/**
 * Vegetation batch v2: 5 jungle billboards (fern, elephant ear, fan palm,
 * coconut palm, areca palm). Recipe — uses the @pixel-forge/core sprite
 * pipeline + batch wrapper.
 *
 *   bun scripts/gen-batch1-v2.ts
 */

import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { image, providers } from '@pixel-forge/core';

const OUT_DIR = './war-assets/vegetation';
mkdirSync(OUT_DIR, { recursive: true });

interface Asset { name: string; subject: string; }
const ASSETS: Asset[] = [
  { name: 'jungle-fern',         subject: 'Dense thick cluster of tropical jungle ferns, bright green fronds overlapping densely, compact low undergrowth bush, no gaps showing through the plant, side view' },
  { name: 'elephant-ear-plants', subject: 'Dense cluster of elephant ear plants with large overlapping heart-shaped dark green leaves, thick stems, compact bush shape, no gaps between leaves, side view' },
  { name: 'fan-palm-cluster',    subject: 'Dense fan palm cluster with overlapping circular fan-shaped bright green fronds on slender stems, compact shape, side view' },
  { name: 'coconut-palm',        subject: 'Coconut palm tree, full view from base to crown, curved brown trunk, drooping bright green fronds with coconut clusters, side view' },
  { name: 'areca-palm-cluster',  subject: 'Cluster of 3 areca palms, slender ringed golden trunks, feathery bright green fronds at top, side view' },
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
console.log('\nDone! Review at http://localhost:3000/gallery');
