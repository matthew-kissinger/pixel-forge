#!/usr/bin/env bun
/**
 * Cycle 4 V1 — gpt-image-2-baked aircraft albedo.
 *
 * Pipeline:
 *   1. V0 hand-painter (`bake-aircraft-albedo.ts`) produces a baseline that
 *      locks the window/doorway/marking layout in cylinderUnwrap UV space.
 *   2. THIS SCRIPT calls gpt-image-2 via images.edit with multiple refs:
 *        - ref 0: the V0 baseline (defines layout — the model paints OVER it)
 *        - ref 1: an existing pixel-art texture (corrugated-metal.png) as
 *                 a style reference (chunky pixels, weathered metal feel)
 *      Prompt structure follows OpenAI's "background → subject → details →
 *      constraints" cookbook pattern.
 *   3. Post-process: pixelate-nearest → palette-quantize → upscale, matching
 *      the existing terrain texture pipeline so the aircraft albedo reads as
 *      the same art language as the world.
 *   4. Overwrite war-assets/textures/aircraft/<slug>-albedo.png. The V0
 *      baseline is preserved as <slug>-albedo.v0.png for comparison.
 *
 * Re-running gen-aircraft-textured.ts AFTER this script picks up the new
 * texture and re-bakes the GLB.
 *
 *   unset ANTHROPIC_API_KEY GEMINI_API_KEY && \
 *     OPENAI_API_KEY=$(grep OPENAI_API_KEY ~/.config/mk-agent/env | cut -d= -f2) \
 *     bun scripts/gen-aircraft-albedo.ts --slugs=uh1-huey
 *
 * Cost: ~$0.21 per 1024x1024 high-quality run. ~100s latency.
 */

import { existsSync, mkdirSync, readFileSync, copyFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { image, providers, writeProvenance } from '@pixel-forge/core';

const OUT_DIR = 'war-assets/textures/aircraft';
mkdirSync(OUT_DIR, { recursive: true });

const STYLE_REF_PATH = 'war-assets/textures/corrugated-metal.png';
const FINAL_SIZE = 512;
const PIXELATE_TARGET = 128; // 128x128 chunky pixel grid before upscaling
const PALETTE_COLORS = 32;

interface AircraftAlbedo {
  slug: string;
  /** Subject description for the prompt. */
  subject: string;
  /**
   * Extra detail bullets specific to this aircraft. Layout (windows/doorways)
   * is locked by ref 0 (the V0 baseline) so we don't repeat it here.
   */
  details: string[];
}

const AIRCRAFT: AircraftAlbedo[] = [
  {
    slug: 'uh1-huey',
    subject:
      'olive-drab UH-1H Huey transport helicopter skin, US Army Vietnam War, weathered military aircraft body',
    details: [
      'olive drab base around RGB 78 95 60 (#4E5F3C)',
      'darker shadow tones in panel recesses (#3A4628)',
      'subtle rust streaks below the dark windows and doorways',
      'faded paint and slight discoloration on rivet rows',
      'small "U.S. ARMY" text in white near the cockpit, tail number "117" near the rear',
    ],
  },
];

// =============================================================================
// Prompt builder — OpenAI cookbook structure: background → subject → details → constraints
// =============================================================================

function buildPrompt(ac: AircraftAlbedo): string {
  return [
    // BACKGROUND
    `1024x1024 UV-mapped albedo texture for a ${ac.subject}. The texture wraps around a cylindrical fuselage capsule — horizontal axis maps around the body circumference (left edge = bottom of body, center = top, right edge = bottom again). Vertical axis runs along the body's nose-to-tail length.`,
    '',
    // REFERENCE FRAMING
    `Reference image 1 is the EXISTING UV LAYOUT for this exact aircraft — preserve every dark window/doorway position and white marking from reference 1 EXACTLY where it appears. Do NOT move, resize, or recolor those dark rectangles or white blocks. Paint OVER and AROUND them.`,
    '',
    `Reference image 2 is the STYLE REFERENCE — match its pixel-art aesthetic: chunky visible pixel blocks, hard pixel edges, no anti-aliasing, weathered metal surface feel.`,
    '',
    // SUBJECT
    `Subject: paint the ${ac.subject} as an unwrapped UV atlas, pixel-art style.`,
    '',
    // DETAILS
    'Details:',
    ...ac.details.map((d) => `- ${d}`),
    '',
    // CONSTRAINTS
    'Constraints:',
    '- 32-bit pixel art only — NO photorealism, NO blur, NO smooth gradients smoother than 8-pixel steps.',
    '- ~32-color palette, hard pixel edges everywhere.',
    '- Olive drab fills the entire canvas — no transparent regions, no white/sky background.',
    '- This is a flat 2D albedo — NO 3D perspective, NO drop shadows, NO ambient-occlusion fakery.',
    '- Preserve the structural layout of reference 1 — windows, doorways, and markings stay in their u/v positions.',
    '- Do NOT add a frame, border, or central focal point — texture must read as a tileable surface across the canvas.',
  ].join('\n');
}

// =============================================================================
// Runner
// =============================================================================

async function bakeOne(ac: AircraftAlbedo): Promise<void> {
  const v0Path = join(OUT_DIR, `${ac.slug}-albedo.png`);
  const v0BackupPath = join(OUT_DIR, `${ac.slug}-albedo.v0.png`);
  const finalPath = v0Path; // overwrites V0 with the gpt-image-2 baked version

  if (!existsSync(v0Path)) {
    throw new Error(
      `Missing V0 baseline at ${v0Path}. Run: bun scripts/bake-aircraft-albedo.ts --slugs=${ac.slug}`,
    );
  }
  if (!existsSync(STYLE_REF_PATH)) {
    throw new Error(`Missing style ref at ${STYLE_REF_PATH}`);
  }

  // Preserve V0 for comparison before overwriting.
  if (!existsSync(v0BackupPath)) {
    copyFileSync(v0Path, v0BackupPath);
    console.log(`  saved V0 baseline → ${v0BackupPath}`);
  }

  const v0Buf = readFileSync(v0Path);
  const styleBuf = readFileSync(STYLE_REF_PATH);

  const provider = providers.createOpenAIProvider(undefined, {
    refsModel: 'gpt-image-2',
    timeoutMs: 240_000,
  });

  const prompt = buildPrompt(ac);
  console.log(`  [${ac.slug}] calling gpt-image-2 via editWithRefs (~100s)...`);
  const t0 = Date.now();
  const raw = await provider.editWithRefs({
    prompt,
    refs: [v0Buf, styleBuf],
    model: 'gpt-image-2',
    dimensions: { width: 1024, height: 1024 },
    quality: 'high',
  });
  const elapsed = Date.now() - t0;
  console.log(
    `  [${ac.slug}] generated in ${(elapsed / 1000).toFixed(1)}s (${raw.image.length} bytes raw)`,
  );

  // Post-process to lock in pixel-art aesthetic.
  let img = await image.pixelateNearest(raw.image, PIXELATE_TARGET);
  img = await image.quantizePalette(img, PALETTE_COLORS);
  img = await image.upscaleNearest(img, FINAL_SIZE);

  writeFileSync(finalPath, img);
  console.log(`  [${ac.slug}] wrote ${finalPath} (${img.length} bytes final)`);

  writeProvenance(finalPath, {
    pipeline: 'aircraft-albedo-gpt2' as const,
    provider: raw.provider,
    model: raw.model,
    prompt,
    latencyMs: raw.meta.latencyMs,
    ...(raw.meta.costUsd !== undefined ? { costUsd: raw.meta.costUsd } : {}),
    warnings: raw.meta.warnings,
    extras: {
      slug: ac.slug,
      kind: 'aircraft-albedo',
      refs: ['v0-baseline', 'corrugated-metal-style'],
      processing: {
        pixelateTarget: PIXELATE_TARGET,
        paletteColors: PALETTE_COLORS,
        finalSize: FINAL_SIZE,
      },
    },
  });
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

const filtered = slugFilter ? AIRCRAFT.filter((a) => slugFilter.has(a.slug)) : AIRCRAFT;
if (filtered.length === 0) {
  console.error(`No aircraft matched filter: ${[...(slugFilter ?? [])].join(',')}`);
  process.exit(1);
}

if (!process.env['OPENAI_API_KEY']) {
  console.error('OPENAI_API_KEY is not set. Source ~/.config/mk-agent/env or pass inline.');
  process.exit(1);
}

console.log(`=== Baking ${filtered.length} aircraft albedo via gpt-image-2 ===`);
let ok = 0;
let failed = 0;
for (const ac of filtered) {
  try {
    await bakeOne(ac);
    ok++;
  } catch (err) {
    failed++;
    console.error(`  [${ac.slug}] FAILED: ${(err as Error).message}`);
  }
}
console.log(`=== Done: ok=${ok}, failed=${failed} ===`);
process.exit(failed > 0 ? 1 : 0);
