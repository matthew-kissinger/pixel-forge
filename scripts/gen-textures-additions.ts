#!/usr/bin/env bun
/**
 * NEW Vietnam terrain textures — additions to existing biome set.
 *
 * Adds 4 new tileable textures: cracked earth, napalmed ground,
 * bamboo mat floor, rusted tin roof (for buildings).
 */

import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { image, providers } from '@pixel-forge/core';

const OUT_DIR = './war-assets/textures';
mkdirSync(OUT_DIR, { recursive: true });

const STYLE_TAIL =
  'top-down overhead view, chunky visible pixel blocks, uniform density no focal point, flat game terrain texture, no perspective no shadows no depth, seamless texture';

interface Tex { name: string; prompt: string; }
const TEXTURES: Tex[] = [
  { name: 'cracked-earth',     prompt: `smlstxtr, retro 16-bit SNES RPG terrain tileset tile, severely cracked dry earth ground, deep polygonal cracks forming a mosaic pattern in parched tan-brown dirt, drought-stricken Vietnam dry season ground, hard baked clay, limited tan-brown color palette, ${STYLE_TAIL}` },
  { name: 'napalmed-ground',   prompt: `smlstxtr, retro 16-bit SNES RPG terrain tileset tile, scorched napalm-burned jungle ground, blackened charred earth with ash patches, small glowing orange embers scattered, twisted carbonized vegetation remains, smoke-stained ground, Vietnam War incendiary aftermath, limited black charcoal and dark orange color palette, ${STYLE_TAIL}` },
  { name: 'bamboo-mat-floor',  prompt: `smlstxtr, retro 16-bit SNES RPG terrain tileset tile, woven bamboo mat floor, tight interlocking pale tan bamboo strips forming a flat woven surface, subtle wear patches, Vietnamese rural hut interior floor, limited pale tan and warm brown color palette, ${STYLE_TAIL}` },
  { name: 'rusted-tin-roof',   prompt: `smlstxtr, retro 16-bit SNES RPG terrain tileset tile, corrugated rusted tin roof panel ground, wavy ridged metal surface with heavy orange-red rust staining, dirty streaks, dark grey underlying metal showing through worn sections, Vietnamese shanty roofing, limited rust orange and grey color palette, ${STYLE_TAIL}` },
];

const texture = image.pipelines.createTexturePipeline({
  textureProvider: providers.createFalTextureProvider(),
});

const batch = image.pipelines.createBatchPipeline<Tex, image.pipelines.TextureOutput>({
  pipeline: {
    id: 'texture-additions',
    description: 'Texture pipeline additions.',
    run: (t) => texture.run({ description: t.prompt, generateSize: 256, size: 512 }),
  },
  getOutputPath: (t) => join(OUT_DIR, `${t.name}.png`),
  onProgress: (done, total) => console.log(`[${done}/${total}] complete`),
});

console.log(`=== Generating ${TEXTURES.length} new textures ===`);
await batch.run(TEXTURES);
console.log('=== Done ===');
