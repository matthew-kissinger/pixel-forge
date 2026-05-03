#!/usr/bin/env bun
/**
 * Render audit grids for every variant GLB under
 * war-assets/_review/aircraft-textures-ab/<strategy>/<slug>.glb.
 *
 * Workflow (visual-audit.ts is hardcoded to scan war-assets/validation/):
 *   1. Copy each variant GLB into war-assets/validation/ with a temporary
 *      prefixed name (`abreview-<strategy>-<slug>.glb`).
 *   2. Run `bun run audit:glb` on just those files.
 *   3. Move the rendered grid PNGs from validation/_grids/ back to
 *      war-assets/_review/aircraft-textures-ab/<strategy>/<slug>-grid.png.
 *   4. Delete the temporary validation copies + provenance sidecars.
 *
 * Idempotent — skips grids that already exist (rerun-friendly when only some
 * variants have been generated so far).
 */

import { existsSync, readdirSync, copyFileSync, renameSync, unlinkSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const REVIEW_BASE = 'war-assets/_review/aircraft-textures-ab';
const VAL_DIR = 'war-assets/validation';
const VAL_GRID_DIR = join(VAL_DIR, '_grids');
mkdirSync(VAL_GRID_DIR, { recursive: true });

const SLUGS = ['uh1-huey', 'uh1c-gunship', 'ah1-cobra', 'ac47-spooky', 'f4-phantom', 'a1-skyraider'];
const STRATEGIES = ['v0', 'gpt-edit', 'gpt-text', 'gemini-edit'];

interface Job {
  strategy: string;
  slug: string;
  /** Variant GLB in the review lane. */
  reviewGlb: string;
  /** Temporary copy in validation/. */
  tmpGlb: string;
  /** Final grid destination in review lane. */
  finalGrid: string;
  /** Grid that visual-audit will produce. */
  rawGrid: string;
}

const jobs: Job[] = [];
for (const strategy of STRATEGIES) {
  for (const slug of SLUGS) {
    const reviewGlb = join(REVIEW_BASE, strategy, `${slug}.glb`);
    if (!existsSync(reviewGlb)) continue;
    const finalGrid = join(REVIEW_BASE, strategy, `${slug}-grid.png`);
    if (existsSync(finalGrid)) continue; // skip already-rendered

    const tmpName = `abreview-${strategy}-${slug}.glb`;
    jobs.push({
      strategy,
      slug,
      reviewGlb,
      tmpGlb: join(VAL_DIR, tmpName),
      finalGrid,
      rawGrid: join(VAL_GRID_DIR, `abreview-${strategy}-${slug}-grid.png`),
    });
  }
}

if (jobs.length === 0) {
  console.log('No variant GLBs need grid rendering. (Run retex-aircraft-variants.ts first.)');
  process.exit(0);
}

console.log(`=== Rendering ${jobs.length} audit grids ===`);

// Step 1: copy variant GLBs into validation/ with temp prefix.
for (const job of jobs) {
  copyFileSync(job.reviewGlb, job.tmpGlb);
}
console.log(`  copied ${jobs.length} variants to validation/ as abreview-*.glb`);

// Step 2: run visual-audit on just those files.
const argv = jobs.map((j) => `abreview-${j.strategy}-${j.slug}.glb`);
console.log(`  running: bun run audit:glb ${argv.slice(0, 3).join(' ')}${argv.length > 3 ? ' ...' : ''}`);
const result = spawnSync('bun', ['run', 'audit:glb', ...argv], {
  stdio: 'inherit',
  shell: true,
});
if (result.status !== 0) {
  console.error('  audit:glb failed; cleaning up validation/ copies before exiting');
  for (const job of jobs) {
    if (existsSync(job.tmpGlb)) unlinkSync(job.tmpGlb);
  }
  process.exit(result.status ?? 1);
}

// Step 3: move grids to review lane.
let moved = 0;
for (const job of jobs) {
  if (existsSync(job.rawGrid)) {
    renameSync(job.rawGrid, job.finalGrid);
    moved++;
  } else {
    console.warn(`  [${job.strategy}/${job.slug}] grid not produced at ${job.rawGrid}`);
  }
}

// Step 4: clean up temp GLB copies.
for (const job of jobs) {
  if (existsSync(job.tmpGlb)) unlinkSync(job.tmpGlb);
  // visual-audit also drops a provenance sidecar copy if present — best effort cleanup
  const provSidecar = `${job.tmpGlb}.provenance.json`;
  if (existsSync(provSidecar)) unlinkSync(provSidecar);
}

console.log(`=== Done: moved ${moved}/${jobs.length} grids ===`);
