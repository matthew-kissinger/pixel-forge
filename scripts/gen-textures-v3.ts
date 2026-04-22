#!/usr/bin/env bun
/**
 * Remaining biome terrain textures for Terror in the Jungle.
 * Recipe — uses the @pixel-forge/core texture pipeline (FLUX 2 +
 * Seamless LoRA → pixelate → quantize → clean → upscale).
 *
 *   bun scripts/gen-textures-v3.ts
 *
 * Already generated (skipped on resume): jungle-floor, mud-ground,
 * river-bank, tall-grass, rice-paddy. This batch: rocky highland, red
 * laterite, bamboo floor, swamp, sandy beach, defoliated, firebase.
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
  { name: 'rocky-highland',    prompt: `smlstxtr, retro 16-bit SNES RPG terrain tileset tile, rocky mountain terrain ground, exposed grey limestone rocks and tan sandstone fragments, sparse brown dry grass tufts growing between rocks, cracked weathered stone surface, Vietnam Central Highlands, limited grey and tan color palette, ${STYLE_TAIL}` },
  { name: 'red-laterite',      prompt: `smlstxtr, retro 16-bit SNES RPG terrain tileset tile, red laterite soil ground, dry cracked red-orange earth, Vietnam highland road surface, sparse loose gravel and small rocks on red dirt, characteristic Southeast Asian red clay soil, limited red-brown color palette, ${STYLE_TAIL}` },
  { name: 'bamboo-floor',      prompt: `smlstxtr, retro 16-bit SNES RPG terrain tileset tile, bamboo grove floor ground, carpet of narrow pale yellow fallen bamboo leaves on dark earth, thin bamboo root segments visible, dark soil patches between leaves, dappled shade from canopy above, limited pale yellow and dark brown color palette, ${STYLE_TAIL}` },
  { name: 'swamp',             prompt: `smlstxtr, retro 16-bit SNES RPG terrain tileset tile, tropical swamp marsh ground, dark stagnant water with green algae film on surface, patches of waterlogged dark mud, floating dead leaves and debris, murky green-brown wetland, Mekong Delta swamp, limited dark green and brown color palette, ${STYLE_TAIL}` },
  { name: 'sandy-beach',       prompt: `smlstxtr, retro 16-bit SNES RPG terrain tileset tile, wet tropical beach sand ground, damp tan sand with scattered small shells and pebbles, water-darkened patches where waves recede, Vietnam coastal beach surface, limited tan and beige color palette, ${STYLE_TAIL}` },
  { name: 'defoliated-ground', prompt: `smlstxtr, retro 16-bit SNES RPG terrain tileset tile, dead barren ground after chemical defoliation, dry cracked grey-brown earth with dead grey tree stumps and branches, no living vegetation, ash-colored dead leaves scattered, bleak devastated terrain, Agent Orange aftermath, limited grey and dark brown color palette, ${STYLE_TAIL}` },
  { name: 'firebase-ground',   prompt: `smlstxtr, retro 16-bit SNES RPG terrain tileset tile, compacted military camp ground, hard packed brown dirt cleared of vegetation, tire tracks and boot prints pressed into dry earth, scattered small debris and gravel, military firebase perimeter, limited brown and tan color palette, ${STYLE_TAIL}` },
];

const texture = image.pipelines.createTexturePipeline({
  textureProvider: providers.createFalTextureProvider(),
});

const batch = image.pipelines.createBatchPipeline<Tex, image.pipelines.TextureOutput>({
  pipeline: {
    id: 'texture-named',
    description: 'Texture pipeline that takes our local Tex shape.',
    run: (t) => texture.run({ description: t.prompt, generateSize: 256, size: 512 }),
  },
  getOutputPath: (t) => join(OUT_DIR, `${t.name}.png`),
  onProgress: (done, total) => console.log(`[${done}/${total}] complete`),
});

console.log(`=== Generating ${TEXTURES.length} biome textures ===\n`);
await batch.run(TEXTURES);
console.log('=== Done! Review at http://localhost:3000/gallery ===');
