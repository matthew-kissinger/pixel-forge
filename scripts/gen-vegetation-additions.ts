#!/usr/bin/env bun
/**
 * NEW Vietnam vegetation sprites — additions to the existing set.
 *
 * Adds 6 new vegetation billboards: water hyacinth mat, lotus pad
 * cluster, taro field, strangler fig trunk, buttress-root tree base,
 * epiphyte orchid on branch.
 *
 * Uses the same magenta-bg sprite pipeline the existing vegetation
 * uses. Existing sprites (jungle-fern, elephant-ear, etc.) are
 * untouched.
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { image, providers } from '@pixel-forge/core';

const OUT_DIR = 'war-assets/vegetation';
mkdirSync(OUT_DIR, { recursive: true });

const STYLE_SUFFIX =
  '32-bit pixel art sprite, high-res pixel art style, detailed with visible pixels, bright saturated colors, black pixel outlines, clean hard edges, no anti-aliasing, no blur, game asset on solid magenta #FF00FF background, entire background is flat solid magenta #FF00FF with no gradients';

interface Veg {
  slug: string;
  prompt: string;
}

const VEG: Veg[] = [
  { slug: 'water-hyacinth', prompt: `Floating mat of water hyacinth (Eichhornia crassipes), bright green rosette leaves with purple flower spikes, tropical pond surface, top-down-slightly-angled view for a game billboard, ${STYLE_SUFFIX}` },
  { slug: 'lotus-cluster', prompt: `Cluster of large round lotus pads floating on water with one pink lotus flower in bloom in the center, tropical pond, side view, ${STYLE_SUFFIX}` },
  { slug: 'taro-plants', prompt: `Cluster of taro plants with broad arrow-shaped green leaves on thick stems, Vietnamese farm understory, side view, ${STYLE_SUFFIX}` },
  { slug: 'strangler-fig-trunk', prompt: `Strangler fig tree trunk with twisted lattice of aerial roots wrapping around a host tree, dark brown bark, jungle forest, side view, ${STYLE_SUFFIX}` },
  { slug: 'buttress-root-tree', prompt: `Base of a giant dipterocarp rainforest tree with massive flaring buttress roots at ground level, dark brown bark with moss patches, Vietnam jungle, side view showing the roots splaying outward, ${STYLE_SUFFIX}` },
  { slug: 'orchid-branch', prompt: `Epiphyte orchid growing on a mossy tree branch, purple and white orchid flowers with green leaves, Vietnamese jungle canopy detail, close-up side view, ${STYLE_SUFFIX}` },
];

const imageProvider = providers.createGeminiProvider();
const bgRemovalProvider = providers.createFalBgRemovalProvider();
const sprite = image.pipelines.createSpritePipeline({
  imageProvider,
  bgRemovalProvider,
});

const batch = image.pipelines.createBatchPipeline<Veg, image.pipelines.SpriteOutput>({
  pipeline: {
    id: 'sprite-veg-additions',
    description: 'Vegetation sprite pipeline with chroma cleanup.',
    run: (v) =>
      sprite.run({
        prompt: v.prompt,
        background: 'magenta',
        runBiRefNet: true,
      }),
  },
  getOutputPath: (v) => join(OUT_DIR, `${v.slug}.png`),
  getOutputBuffer: (o) => o.image,
  onProgress: (done, total) => console.log(`[${done}/${total}] processed`),
});

console.log(`=== Generating ${VEG.length} new vegetation sprites ===`);
const result = await batch.run(VEG);
const fresh = result.filter(Boolean).length;
console.log(`=== Done === fresh=${fresh} skipped=${result.length - fresh}`);
