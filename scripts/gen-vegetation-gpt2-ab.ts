#!/usr/bin/env bun
/**
 * A/B run: vegetation sprites generated with OpenAI gpt-image-2.
 *
 * Writes to a review-only lane so we can compare against canonical outputs
 * without overwriting shipping assets:
 *   war-assets/_review/gpt2-ab/vegetation/*.png
 */

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { image, providers, writeProvenance } from '@pixel-forge/core';

const OUT_DIR = 'war-assets/_review/gpt2-ab/vegetation';
mkdirSync(OUT_DIR, { recursive: true });

interface VegDef {
  slug: string;
  prompt: string;
}

const VEG: VegDef[] = [
  { slug: 'banana-plant', prompt: 'Single banana plant, thick green trunk, broad paddle leaves, full plant visible, side view' },
  { slug: 'mangrove', prompt: 'Full mangrove tree with arching prop roots, dense dark-green canopy, entire tree visible, side view' },
];

const imageProvider = providers.createOpenAIProvider(undefined, {
  textModel: 'gpt-image-2',
  refsModel: 'gpt-image-2',
  timeoutMs: 420_000,
});
const bgRemovalProvider = providers.createFalBgRemovalProvider({ variant: 'light' });

const sprite = image.pipelines.createSpritePipeline({
  imageProvider,
  bgRemovalProvider,
});

let done = 0;
let failed = 0;
for (const v of VEG) {
  const outPath = join(OUT_DIR, `${v.slug}.png`);
  if (existsSync(outPath)) {
    console.log(`[skip] ${v.slug}`);
    continue;
  }
  try {
    const result = await sprite.run({
      prompt: v.prompt,
      background: 'magenta',
      dimensions: { width: 512, height: 512 },
      runBiRefNet: true,
      chromaCleanup: true,
    });
    writeFileSync(outPath, result.image);
    writeProvenance(outPath, {
      pipeline: 'sprite-gpt2-ab',
      provider: result.meta.provider,
      model: result.meta.model,
      prompt: v.prompt,
      latencyMs: result.meta.latencyMs,
      ...(result.meta.costUsd !== undefined ? { costUsd: result.meta.costUsd } : {}),
      warnings: result.meta.warnings,
      extras: {
        lane: 'gpt2-ab',
        kind: 'vegetation',
        bg: 'magenta',
      },
    });
    done++;
    console.log(`[ok  ] ${v.slug} (${result.meta.model}, ${(result.meta.latencyMs / 1000).toFixed(1)}s)`);
  } catch (err) {
    failed++;
    console.error(`[fail] ${v.slug}: ${(err as Error).message}`);
  }
}

console.log(`\nvegetation gpt2-ab done: ok=${done}, failed=${failed}, total=${VEG.length}`);
if (done === 0) process.exit(1);
