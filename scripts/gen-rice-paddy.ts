#!/usr/bin/env bun
/**
 * Rice paddy terrain texture - Vietnam rice fields biome.
 * Recipe — uses the @pixel-forge/core texture pipeline.
 *
 *   bun scripts/gen-rice-paddy.ts
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { image, providers } from '@pixel-forge/core';

const OUT_DIR = './war-assets/textures';
mkdirSync(OUT_DIR, { recursive: true });

const PROMPT = [
  'smlstxtr,',
  'retro 16-bit SNES RPG terrain tileset tile,',
  'flooded rice paddy field, top-down overhead view,',
  'shallow muddy water with rows of bright green rice seedlings poking through,',
  'reflective brown water surface between neat rows of young rice plants,',
  'wet cultivated field, Southeast Asian rice paddy,',
  'limited green and brown water color palette, chunky visible pixel blocks,',
  'uniform density no focal point, flat game terrain texture,',
  'no perspective no shadows no depth, seamless texture',
].join(' ');

const texture = image.pipelines.createTexturePipeline({
  textureProvider: providers.createFalTextureProvider(),
});

console.log('Generating rice-paddy texture...');
const result = await texture.run({ description: PROMPT });
writeFileSync(join(OUT_DIR, 'rice-paddy.png'), result.image);
console.log(`Done. ${(result.image.length / 1024).toFixed(0)}KB, ${result.meta.size}px.`);
