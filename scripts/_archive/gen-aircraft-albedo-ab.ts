#!/usr/bin/env bun
/**
 * Cycle 4 V1 — multi-strategy aircraft albedo batch.
 *
 * Generates 3 variants per aircraft via different image-model strategies so
 * the user can compare side-by-side and pick the winner per vehicle.
 *
 * Strategies (per aircraft):
 *   gpt-edit   — gpt-image-2 via images.edit, refs=[V0 baseline, style-ref]
 *                Uses cookbook structure: background → subject → details → constraints.
 *                Cost ~$0.21 (high quality 1024x1024). ~100s.
 *
 *   gpt-text   — gpt-image-1.5 via images.generate, text-only.
 *                Tests whether layout can be invented purely from prompt.
 *                Cost ~$0.05 (medium quality). ~30s.
 *
 *   gemini-edit — Gemini Nano Banana Pro (gemini-3.1-flash-image-preview) via
 *                multi-image generate, parts=[V0 baseline, style-ref, prompt].
 *                Different model family for true A/B against gpt-image-2.
 *                Cost ~$0.04. ~25s.
 *
 * Output (review lane, NEVER overwrites the live war-assets/textures/aircraft/):
 *   war-assets/_review/aircraft-textures-ab/<strategy>/<slug>-albedo.png
 *   war-assets/_review/aircraft-textures-ab/<strategy>/<slug>-albedo.png.provenance.json
 *
 * Resumable — skips outputs that already exist.
 *
 *   bun scripts/gen-aircraft-albedo-ab.ts                         # all (18 = 3x6)
 *   bun scripts/gen-aircraft-albedo-ab.ts --strategy=gpt-edit     # 6 of one
 *   bun scripts/gen-aircraft-albedo-ab.ts --slugs=uh1-huey        # 3 strategies on Huey
 *   bun scripts/gen-aircraft-albedo-ab.ts --strategies=gpt-edit,gemini-edit
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { image, providers, writeProvenance } from '@pixel-forge/core';

const OUT_BASE = 'war-assets/_review/aircraft-textures-ab';
const V0_DIR = 'war-assets/textures/aircraft';
const STYLE_REF_PATH = 'war-assets/textures/corrugated-metal.png';
const FINAL_SIZE = 512;
const PIXELATE_TARGET = 128;
const PALETTE_COLORS = 32;

type Strategy = 'gpt-edit' | 'gpt-text' | 'gemini-edit';
const ALL_STRATEGIES: Strategy[] = ['gpt-edit', 'gpt-text', 'gemini-edit'];

interface AircraftSpec {
  slug: string;
  /** Subject phrase used in all prompts. */
  subject: string;
  /** Aircraft-specific detail bullets. */
  details: string[];
  /**
   * For gpt-text (no V0 ref), explicit layout description in u/v coords. The
   * model has to render the dark windows/doorways at the right positions.
   */
  layoutDesc: string;
}

const AIRCRAFT: AircraftSpec[] = [
  {
    slug: 'uh1-huey',
    subject: 'olive-drab UH-1H Huey transport helicopter, US Army, Vietnam War',
    details: [
      'olive drab base RGB 78 95 60 (#4E5F3C)',
      'subtle rust streaks below windows and doorways',
      'faded paint and discoloration on rivet rows',
      '"U.S. ARMY" white text near cockpit, tail number "117"',
    ],
    layoutDesc:
      'At normalized texture coords u=0.18-0.32 (right side band) draw two large dark cargo doorway voids spanning v=0.32-0.60. Mirror these to u=0.68-0.82 (left side). At u=0.18-0.26 v=0.66-0.76 (both sides) draw smaller dark cockpit windows. Place small white "U.S. ARMY" text at u=0.20 v=0.62. Add a small white US star at u=0.46 v=0.85 on the upper centerline.',
  },
  {
    slug: 'uh1c-gunship',
    subject: 'olive-drab UH-1C Huey gunship, doors-closed armed variant',
    details: [
      'olive drab base #4E5F3C, weathered with rivet detail',
      'NO open doorways — solid cabin sides (gunship variant)',
      'just cockpit-side windows + faded "U.S. ARMY" markings',
      'subtle exhaust soot streak on the rear engine cowling area',
    ],
    layoutDesc:
      'At u=0.18-0.26 v=0.66-0.75 (mirror to u=0.74-0.82) draw small dark cockpit-side windows. SOLID cabin sides — NO doorway voids. White "U.S. ARMY" text at u=0.20 v=0.55. Squadron number at u=0.45 v=0.85.',
  },
  {
    slug: 'ah1-cobra',
    subject: 'dark olive AH-1G Cobra attack helicopter, narrow tandem-cockpit gunship',
    details: [
      'darker olive base around RGB 55 70 42 (#374628), slightly weathered',
      'narrow body — sides have minimal markings',
      'two small gunner-station side windows at the cockpit area',
      'small white US star on tail boom',
    ],
    layoutDesc:
      'At u=0.18-0.24 v=0.62-0.68 and v=0.74-0.80 (mirror to u=0.76-0.82) draw small dark windows for the tandem cockpit stations. White star at u=0.46 v=0.88.',
  },
  {
    slug: 'ac47-spooky',
    subject:
      'olive-drab AC-47 "Spooky" Vietnam War twin-engine prop gunship, derived from C-47 transport',
    details: [
      'olive drab top, dark belly (typical AC-47 paint scheme)',
      'long row of 5 passenger windows along each cabin side',
      'cockpit windscreen at the nose',
      '"PUFF THE MAGIC DRAGON" or "U.S. ARMY" white nose-art near cockpit',
    ],
    layoutDesc:
      'At u=0.18-0.24 (mirror u=0.76-0.82) draw a row of 5 small dark passenger windows at v=0.34, 0.42, 0.50, 0.58, 0.66 (each ~0.05 wide x 0.05 tall). Cockpit windscreen at u=0.20 v=0.78. Belly band at v=0-0.07 and v=0.93-1.0 should be near-black (dark belly). White nose-art text at u=0.21 v=0.30.',
  },
  {
    slug: 'f4-phantom',
    subject: 'navy-gray F-4 Phantom II twin-engine jet fighter-bomber',
    details: [
      'navy gray base RGB 110 120 125 with darker belly',
      'darker intake duct region on each side just behind cockpit',
      'squadron tail markings + USAF/NAVY star insignia',
      'subtle exhaust soot at tail',
    ],
    layoutDesc:
      'At u=0.16-0.24 (mirror u=0.76-0.84) v=0.55-0.75 draw darker intake-duct shading region. Squadron marking white text at u=0.20 v=0.50. Star insignia at u=0.46 v=0.85. Underside (v=0-0.05 and v=0.95-1.0) lighter gray (#8C969B).',
  },
  {
    slug: 'a1-skyraider',
    subject: 'olive-drab A-1 Skyraider "Spad" Vietnam-era prop ground-attack aircraft',
    details: [
      'olive drab base #4E5F3C with sun-faded panels',
      'cockpit windscreen frame on top',
      '"U.S. ARMY" or USAF marking on rear fuselage',
      'optional yellow squadron stripe on tail',
    ],
    layoutDesc:
      'At u=0.18-0.25 v=0.62-0.70 (mirror) draw small dark cockpit windscreen frames. White unit marking at u=0.46 v=0.30. Subtle horizontal panel banding at v=0.30 and v=0.50.',
  },
];

// =============================================================================
// Prompt builders per strategy
// =============================================================================

function promptGptEdit(ac: AircraftSpec): string {
  return [
    `1024x1024 UV-mapped albedo texture for a ${ac.subject}. The texture wraps around a cylindrical fuselage capsule — horizontal axis maps around the body circumference (u=0 bottom, u=0.25 right side, u=0.5 top, u=0.75 left side), vertical axis runs along the body's nose-to-tail length.`,
    '',
    'Reference 1 is the EXISTING UV LAYOUT for this exact aircraft — preserve every dark window/doorway position and white marking from reference 1 EXACTLY where it appears. Do NOT move, resize, or recolor those dark rectangles or white blocks. Paint OVER and AROUND them.',
    '',
    'Reference 2 is the STYLE REFERENCE — match its pixel-art aesthetic: chunky visible pixel blocks, hard pixel edges, no anti-aliasing, weathered metal surface feel.',
    '',
    `Subject: paint the ${ac.subject} as an unwrapped UV atlas, pixel-art style.`,
    '',
    'Details:',
    ...ac.details.map((d) => `- ${d}`),
    '',
    'Constraints:',
    '- 32-bit pixel art only — NO photorealism, NO blur, NO smooth gradients smoother than 8-pixel steps.',
    '- ~32-color palette, hard pixel edges everywhere.',
    '- Body color fills the entire canvas — no transparent regions, no white/sky background.',
    '- Flat 2D albedo — NO 3D perspective, NO drop shadows, NO ambient-occlusion fakery.',
    '- Preserve the structural layout of reference 1 — windows, doorways, and markings stay in their u/v positions.',
    '- Do NOT add a frame, border, or central focal point — texture must read as a uniform-density surface across the canvas.',
  ].join('\n');
}

function promptGptText(ac: AircraftSpec): string {
  return [
    `1024x1024 pixel-art UV-mapped albedo texture for a ${ac.subject}. The texture wraps around a cylindrical fuselage capsule — horizontal axis maps around the body circumference (u=0 bottom, u=0.25 right side, u=0.5 top, u=0.75 left side, u=1 back to bottom), vertical axis runs along the body's nose-to-tail length (v=0 one end, v=1 other end).`,
    '',
    `Subject: ${ac.subject}, painted as an unwrapped UV atlas in chunky pixel-art style.`,
    '',
    'Layout (use these exact u/v positions for the structural features):',
    `- ${ac.layoutDesc}`,
    '',
    'Style details:',
    ...ac.details.map((d) => `- ${d}`),
    '',
    'Constraints:',
    '- 32-bit pixel art ONLY — chunky pixel blocks (target ~128px effective resolution), hard pixel edges, no anti-aliasing, no smooth gradients.',
    '- ~32-color palette, weathered military aircraft feel.',
    '- Body color fills the entire canvas — NO transparent regions, NO white/sky background, NO frame, NO border.',
    '- Flat 2D albedo — NO 3D perspective, NO drop shadows, NO depth fakery.',
    '- Texture reads as uniform density across the canvas; no central focal point.',
  ].join('\n');
}

function promptGeminiEdit(ac: AircraftSpec): string {
  // Gemini handles multi-image differently — be more explicit about which image is which.
  return [
    `Generate a 1024x1024 pixel-art UV-mapped albedo texture for a ${ac.subject}.`,
    '',
    `Image 1 above is the EXISTING UV LAYOUT TEMPLATE for this exact aircraft. The horizontal axis maps around the body's circumference (around the cylindrical fuselage) and the vertical axis runs along the body length. The dark rectangles in image 1 mark window and doorway positions — preserve their exact u/v positions in your output. The white blocks in image 1 mark text/insignia positions — preserve those too.`,
    '',
    'Image 2 above is the STYLE REFERENCE — your output should match its chunky pixel-art aesthetic with hard pixel edges, ~32-color palette, weathered metal surface feel.',
    '',
    'Paint a complete, uniform-density texture that:',
    ...ac.details.map((d) => `- ${d}`),
    '- Keeps every dark rectangle and white block from image 1 in the same u/v position.',
    '- Adds weathering, panel lines, rivet detail, and military aircraft texture in the open olive-drab regions.',
    '- 32-bit pixel art ONLY — NO photorealism, NO blur, NO smooth gradients.',
    '- Body color fills the entire canvas — NO transparent regions, NO frame.',
    '- Flat 2D albedo — NO 3D perspective, NO drop shadows.',
  ].join('\n');
}

// =============================================================================
// Strategy runners
// =============================================================================

interface StrategyResult {
  raw: Buffer;
  model: string;
  provider: string;
  latencyMs: number;
  costUsd?: number;
  warnings: string[];
}

async function runGptEdit(ac: AircraftSpec): Promise<StrategyResult> {
  const v0 = readFileSync(join(V0_DIR, `${ac.slug}-albedo.png`));
  const style = readFileSync(STYLE_REF_PATH);
  const provider = providers.createOpenAIProvider(undefined, {
    refsModel: 'gpt-image-2',
    timeoutMs: 240_000,
  });
  const out = await provider.editWithRefs({
    prompt: promptGptEdit(ac),
    refs: [v0, style],
    model: 'gpt-image-2',
    dimensions: { width: 1024, height: 1024 },
    quality: 'high',
  });
  return {
    raw: out.image,
    model: out.model,
    provider: out.provider,
    latencyMs: out.meta.latencyMs,
    costUsd: out.meta.costUsd,
    warnings: out.meta.warnings,
  };
}

async function runGptText(ac: AircraftSpec): Promise<StrategyResult> {
  const provider = providers.createOpenAIProvider(undefined, {
    textModel: 'gpt-image-1.5',
    timeoutMs: 180_000,
  });
  const out = await provider.generate({
    prompt: promptGptText(ac),
    model: 'gpt-image-1.5',
    dimensions: { width: 1024, height: 1024 },
    quality: 'medium',
  });
  return {
    raw: out.image,
    model: out.model,
    provider: out.provider,
    latencyMs: out.meta.latencyMs,
    costUsd: out.meta.costUsd,
    warnings: out.meta.warnings,
  };
}

async function runGeminiEdit(ac: AircraftSpec): Promise<StrategyResult> {
  const v0 = readFileSync(join(V0_DIR, `${ac.slug}-albedo.png`));
  const style = readFileSync(STYLE_REF_PATH);
  const provider = providers.createGeminiProvider(undefined, {
    model: 'gemini-3.1-flash-image-preview',
    timeoutMs: 180_000,
  });
  const out = await provider.editWithRefs({
    prompt: promptGeminiEdit(ac),
    refs: [v0, style],
    dimensions: { width: 1024, height: 1024 },
  });
  return {
    raw: out.image,
    model: out.model,
    provider: out.provider,
    latencyMs: out.meta.latencyMs,
    costUsd: out.meta.costUsd,
    warnings: out.meta.warnings,
  };
}

const RUNNERS: Record<Strategy, (ac: AircraftSpec) => Promise<StrategyResult>> = {
  'gpt-edit': runGptEdit,
  'gpt-text': runGptText,
  'gemini-edit': runGeminiEdit,
};

// =============================================================================
// Per-(strategy, slug) pipeline
// =============================================================================

async function runOne(strategy: Strategy, ac: AircraftSpec): Promise<'ok' | 'skip' | 'fail'> {
  const outDir = join(OUT_BASE, strategy);
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, `${ac.slug}-albedo.png`);
  if (existsSync(outPath)) return 'skip';

  try {
    const t0 = Date.now();
    const res = await RUNNERS[strategy](ac);
    // Post-process to lock in pixel-art aesthetic.
    let img = await image.pixelateNearest(res.raw, PIXELATE_TARGET);
    img = await image.quantizePalette(img, PALETTE_COLORS);
    img = await image.upscaleNearest(img, FINAL_SIZE);
    writeFileSync(outPath, img);

    const promptUsed =
      strategy === 'gpt-edit'
        ? promptGptEdit(ac)
        : strategy === 'gpt-text'
          ? promptGptText(ac)
          : promptGeminiEdit(ac);
    writeProvenance(outPath, {
      pipeline: 'aircraft-albedo-ab' as const,
      provider: res.provider,
      model: res.model,
      prompt: promptUsed,
      latencyMs: res.latencyMs,
      ...(res.costUsd !== undefined ? { costUsd: res.costUsd } : {}),
      warnings: res.warnings,
      extras: {
        slug: ac.slug,
        strategy,
        kind: 'aircraft-albedo',
        processing: {
          pixelateTarget: PIXELATE_TARGET,
          paletteColors: PALETTE_COLORS,
          finalSize: FINAL_SIZE,
        },
      },
    });
    const elapsed = Date.now() - t0;
    console.log(
      `  [${strategy}/${ac.slug}] ok (${res.model}, ${(elapsed / 1000).toFixed(1)}s, ${img.length} bytes)`,
    );
    return 'ok';
  } catch (err) {
    console.error(`  [${strategy}/${ac.slug}] FAILED: ${(err as Error).message.slice(0, 200)}`);
    return 'fail';
  }
}

// =============================================================================
// CLI
// =============================================================================

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

const stratFilterArg =
  process.argv.find((a) => a.startsWith('--strategies=')) ??
  process.argv.find((a) => a.startsWith('--strategy='));
const stratFilter = stratFilterArg
  ? new Set(
      stratFilterArg
        .slice(stratFilterArg.indexOf('=') + 1)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean) as Strategy[],
    )
  : undefined;

const aircraft = slugFilter ? AIRCRAFT.filter((a) => slugFilter.has(a.slug)) : AIRCRAFT;
const strategies = stratFilter
  ? ALL_STRATEGIES.filter((s) => stratFilter.has(s))
  : ALL_STRATEGIES;

if (aircraft.length === 0 || strategies.length === 0) {
  console.error('No work to do (filters matched zero aircraft or strategies).');
  process.exit(1);
}

console.log(
  `=== Generating ${aircraft.length * strategies.length} variants (${aircraft.length} aircraft x ${strategies.length} strategies) ===`,
);

let ok = 0;
let skip = 0;
let fail = 0;

// Run sequentially per-strategy, in parallel within a strategy across slugs.
// Different providers don't share rate limits so this maxes throughput.
for (const strat of strategies) {
  console.log(`\n-- strategy: ${strat} --`);
  const results = await Promise.all(aircraft.map((ac) => runOne(strat, ac)));
  for (const r of results) {
    if (r === 'ok') ok++;
    else if (r === 'skip') skip++;
    else fail++;
  }
}

console.log(`\n=== Done: ok=${ok}, skip=${skip}, fail=${fail} ===`);
process.exit(fail > 0 ? 1 : 0);
