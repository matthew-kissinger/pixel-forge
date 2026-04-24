#!/usr/bin/env bun
/**
 * A/B run: tileable textures generated with OpenAI gpt-image-2, then pushed
 * through the same pixel-forge texture post-process stages.
 *
 * Output lane:
 *   war-assets/_review/gpt2-ab/textures/*.png
 */

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  image,
  providers,
  writeProvenance,
} from '@pixel-forge/core';

const OUT_DIR = 'war-assets/_review/gpt2-ab/textures';
mkdirSync(OUT_DIR, { recursive: true });

interface TexDef {
  slug: string;
  description: string;
}

const TEXTURES: TexDef[] = [
  { slug: 'cracked-earth', description: 'seamless top-down pixel-art terrain texture of severely cracked dry earth, tan-brown palette, no focal point, no borders' },
  { slug: 'bamboo-mat-floor', description: 'seamless top-down pixel-art texture of woven bamboo mat floor, pale tan and warm brown strips, no focal point, no borders' },
  { slug: 'rusted-tin-roof', description: 'seamless top-down pixel-art texture of corrugated rusted tin roof, orange rust over grey steel ridges, no focal point, no borders' },
];

const provider = providers.createOpenAIProvider(undefined, {
  textModel: 'gpt-image-2',
  refsModel: 'gpt-image-2',
});

const size = 512;
const generateSize = 1024;

let done = 0;
let failed = 0;
for (const t of TEXTURES) {
  const outPath = join(OUT_DIR, `${t.slug}.png`);
  if (existsSync(outPath)) {
    console.log(`[skip] ${t.slug}`);
    continue;
  }
  try {
    const prompt = [
      'smlstxtr',
      'retro 16-bit SNES RPG terrain tileset tile',
      t.description,
      'uniform density',
      'chunky visible pixel blocks',
      'flat lighting',
      'seamless tile that repeats perfectly in all directions',
      'no borders, no frame, no central object',
    ].join(', ');

    const raw = await provider.generate({
      prompt,
      model: 'gpt-image-2',
      dimensions: { width: generateSize, height: generateSize },
    });

    let img = await image.pixelateNearest(raw.image, 32);
    img = await image.quantizePalette(img, 24);
    const cleaned = await image.cleanNearBlacks(img, { threshold: 40, seamless: true });
    img = await image.upscaleNearest(cleaned.image, size);

    writeFileSync(outPath, img);
    writeProvenance(outPath, {
      pipeline: 'texture-gpt2-ab',
      provider: raw.provider,
      model: raw.model,
      prompt,
      latencyMs: raw.meta.latencyMs,
      ...(raw.meta.costUsd !== undefined ? { costUsd: raw.meta.costUsd } : {}),
      warnings: raw.meta.warnings,
      extras: {
        lane: 'gpt2-ab',
        kind: 'texture',
        processing: {
          pixelateTarget: 32,
          paletteColors: 24,
          blackThreshold: 40,
          finalSize: size,
        },
      },
    });

    done++;
    console.log(`[ok  ] ${t.slug} (${raw.model}, ${(raw.meta.latencyMs / 1000).toFixed(1)}s)`);
  } catch (err) {
    failed++;
    console.error(`[fail] ${t.slug}: ${(err as Error).message}`);
  }
}

console.log(`\ntextures gpt2-ab done: ok=${done}, failed=${failed}, total=${TEXTURES.length}`);
if (done === 0) process.exit(1);
