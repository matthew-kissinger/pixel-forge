#!/usr/bin/env bun
/**
 * Cycle 4 V1 — retex variant textures onto the live textured GLBs.
 *
 * For each (strategy, slug) variant texture in
 * war-assets/_review/aircraft-textures-ab/<strategy>/<slug>-albedo.png, swap
 * the embedded base-color texture in
 * war-assets/vehicles/aircraft/<slug>.glb (which carries the V0 baseline)
 * and write the retex'd GLB to
 * war-assets/_review/aircraft-textures-ab/<strategy>/<slug>.glb.
 *
 * Uses retexCharacter from @pixel-forge/core/kiln, which targets the FIRST
 * material with a base-color texture — that's the textured fuselage
 * material in our gen-aircraft-textured.ts output (the other materials
 * — gunmetal, glass, olive-drab non-textured — are skipped).
 *
 * Also drops a copy of the live GLB at .../v0/<slug>.glb so all 4 variants
 * (V0 + 3 generated) sit side-by-side under the same review lane.
 *
 *   bun scripts/retex-aircraft-variants.ts                          # all
 *   bun scripts/retex-aircraft-variants.ts --slugs=uh1-huey
 *   bun scripts/retex-aircraft-variants.ts --strategies=gpt-edit
 */

import { existsSync, mkdirSync, readFileSync, copyFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { retexCharacter } from '@pixel-forge/core/kiln';

const REVIEW_BASE = 'war-assets/_review/aircraft-textures-ab';
const LIVE_GLB_DIR = 'war-assets/vehicles/aircraft';
const LIVE_TEX_DIR = 'war-assets/textures/aircraft';

const SLUGS = ['uh1-huey', 'uh1c-gunship', 'ah1-cobra', 'ac47-spooky', 'f4-phantom', 'a1-skyraider'];
type Strategy = 'v0' | 'gpt-edit' | 'gpt-text' | 'gemini-edit';
const ALL_STRATEGIES: Strategy[] = ['v0', 'gpt-edit', 'gpt-text', 'gemini-edit'];

async function retexOne(strategy: Strategy, slug: string): Promise<'ok' | 'skip' | 'fail'> {
  const liveGlb = join(LIVE_GLB_DIR, `${slug}.glb`);
  if (!existsSync(liveGlb)) {
    console.warn(`  [${strategy}/${slug}] live GLB missing: ${liveGlb}`);
    return 'fail';
  }

  const outDir = join(REVIEW_BASE, strategy);
  mkdirSync(outDir, { recursive: true });
  const outGlb = join(outDir, `${slug}.glb`);

  // For v0, just copy the live GLB (it already has the V0 texture embedded).
  if (strategy === 'v0') {
    if (existsSync(outGlb)) return 'skip';
    copyFileSync(liveGlb, outGlb);
    console.log(`  [v0/${slug}] copied live GLB`);
    return 'ok';
  }

  // For other strategies, need the variant texture.
  const variantPng = join(REVIEW_BASE, strategy, `${slug}-albedo.png`);
  if (!existsSync(variantPng)) {
    console.warn(`  [${strategy}/${slug}] variant texture missing: ${variantPng} — skipping`);
    return 'skip';
  }
  if (existsSync(outGlb)) return 'skip';

  try {
    const diffuse = readFileSync(variantPng);
    const result = await retexCharacter(liveGlb, {
      diffuse,
      presetName: `${strategy}/${slug}`,
    });
    writeFileSync(outGlb, result.glb);
    console.log(
      `  [${strategy}/${slug}] retex ok (${(result.meta.bytes / 1024).toFixed(1)}KB, mat="${result.meta.materialName}", idx=${result.meta.materialIndex})`,
    );
    return 'ok';
  } catch (err) {
    console.error(`  [${strategy}/${slug}] FAILED: ${(err as Error).message.slice(0, 200)}`);
    return 'fail';
  }
}

const slugFilterArg = process.argv.find((a) => a.startsWith('--slugs='));
const slugFilter = slugFilterArg
  ? new Set(
      slugFilterArg
        .slice('--slugs='.length)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    )
  : undefined;

const stratFilterArg = process.argv.find((a) => a.startsWith('--strategies='));
const stratFilter = stratFilterArg
  ? new Set(
      stratFilterArg
        .slice('--strategies='.length)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean) as Strategy[],
    )
  : undefined;

const slugs = slugFilter ? SLUGS.filter((s) => slugFilter.has(s)) : SLUGS;
const strategies = stratFilter ? ALL_STRATEGIES.filter((s) => stratFilter.has(s)) : ALL_STRATEGIES;

console.log(`=== Retex ${slugs.length * strategies.length} GLBs (${slugs.length} aircraft x ${strategies.length} strategies) ===`);

let ok = 0;
let skip = 0;
let fail = 0;
for (const strat of strategies) {
  console.log(`\n-- strategy: ${strat} --`);
  for (const slug of slugs) {
    const r = await retexOne(strat, slug);
    if (r === 'ok') ok++;
    else if (r === 'skip') skip++;
    else fail++;
  }
}
console.log(`\n=== Done: ok=${ok}, skip=${skip}, fail=${fail} ===`);
process.exit(fail > 0 ? 1 : 0);
