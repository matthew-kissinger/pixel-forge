#!/usr/bin/env bun
/**
 * Jungle floor texture v3 — uniform dark green Vietnam tropical floor
 * (no orange, no patches). Recipe — uses the @pixel-forge/core texture
 * pipeline.
 *
 *   bun scripts/gen-jungle-floor-v3.ts
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { image, providers } from '@pixel-forge/core';

const OUT_DIR = './war-assets/textures';
mkdirSync(OUT_DIR, { recursive: true });

const PROMPT = [
  'smlstxtr,',
  'retro 16-bit SNES RPG terrain tileset tile,',
  'uniform dark green jungle floor ground, top-down overhead view,',
  'even dark green ground cover with subtle dark brown undertones,',
  'uniform consistent texture, same density everywhere, no patches, no gaps, no bare spots,',
  'dark green ground palette: dark forest green, dark olive, dark brown-green,',
  'subtle variation in dark greens, no orange, no yellow, no bright colors,',
  'limited color palette, chunky visible pixel blocks,',
  'uniform density no focal point, flat game terrain texture,',
  'no perspective no shadows no depth, seamless texture',
].join(' ');

const texture = image.pipelines.createTexturePipeline({
  textureProvider: providers.createFalTextureProvider(),
});

console.log('Regenerating jungle-floor (Vietnam tropical, no orange)...');
const result = await texture.run({ description: PROMPT });
writeFileSync(join(OUT_DIR, 'jungle-floor.png'), result.image);
console.log(`Done. ${(result.image.length / 1024).toFixed(0)}KB.`);
