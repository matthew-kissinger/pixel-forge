#!/usr/bin/env bun
/**
 * Hand-paint per-vehicle albedo PNGs for the textured-aircraft cycle.
 *
 * V0: procedural pixel-art textures via sharp. No Gemini in the loop yet —
 * this validates the kiln-side of the pipeline (UV unwrap + pbrMaterial +
 * GLB export) without depending on Gemini quality.
 *
 * Output: war-assets/textures/aircraft/<slug>-albedo.png (512x512 PNG).
 *
 * For each vehicle the body is a capsuleXGeo + cylinderUnwrap. The UV
 * layout that produces is:
 *   u (horizontal, 0..1) → wraps around the circumference
 *     u=0.0  bottom of body
 *     u=0.25 right side (+Z)
 *     u=0.5  top of body (+Y)
 *     u=0.75 left side (-Z)
 *     u=1.0  back to bottom
 *   v (vertical, 0..1) → along the X axis (front-to-back or back-to-front;
 *     either is fine — we mirror the design left/right and front/back is
 *     mostly cabin so it reads either way)
 *
 * Image coords: sharp uses top-left origin, so image_y = (1 - v) * height.
 *
 *   bun scripts/bake-aircraft-albedo.ts                 # bakes all
 *   bun scripts/bake-aircraft-albedo.ts --slugs=uh1-huey
 */

import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const OUT_DIR = 'war-assets/textures/aircraft';
const SIZE = 512;

mkdirSync(OUT_DIR, { recursive: true });

// =============================================================================
// Color palette — pixel-art-friendly, hard-edged, low-saturation
// =============================================================================

const OLIVE_DRAB: [number, number, number] = [78, 95, 60];        // #4E5F3C primary
const OLIVE_LIGHT: [number, number, number] = [98, 115, 78];      // panel highlight
const OLIVE_DARK: [number, number, number] = [55, 70, 42];        // panel shadow
// Glass: deep teal-blue hint suggests reflection without going pure black.
const WINDOW_GLASS: [number, number, number] = [38, 56, 70];      // #263846 — reads as glass
const WINDOW_HIGHLIGHT: [number, number, number] = [88, 115, 135]; // pale-blue glint along window top
// Doorway: dark olive-brown to suggest cabin interior shadow, NOT black hole.
const DOORWAY_INTERIOR: [number, number, number] = [30, 35, 25];  // #1E2319 dark olive-brown
const DOORWAY_FLOOR: [number, number, number] = [42, 45, 32];     // slightly lighter cabin floor band
const WHITE_MARKING: [number, number, number] = [220, 220, 210];  // weathered white for ARMY text
const STAR_WHITE: [number, number, number] = [240, 240, 235];

interface Rect {
  /** u in 0..1 (horizontal in texture). */
  u: number;
  /** v in 0..1 (vertical in texture, bottom→top). */
  v: number;
  /** Width in u units. */
  w: number;
  /** Height in v units. */
  h: number;
  /** RGB. */
  color: [number, number, number];
}

interface AircraftSpec {
  slug: string;
  base: [number, number, number];
  /**
   * Decorative regions painted on top of the base. Coordinates in u/v space
   * (0..1). The painter mirrors window/doorway rects across u=0.25↔u=0.75
   * automatically so we don't have to specify both sides.
   */
  rects: Rect[];
  /**
   * Whether to mirror rects across u=0.25↔u=0.75 (right side ↔ left side).
   * Default true — every aircraft has symmetric sides.
   */
  mirror?: boolean;
}

// =============================================================================
// Per-vehicle specs
// =============================================================================

const SPECS: AircraftSpec[] = [
  {
    slug: 'uh1-huey',
    base: OLIVE_DRAB,
    rects: [
      // PANEL ZONE (v=0..0.30) is reserved CLEAN for the panelMat sub-sample.
      // All decorations live at v >= 0.32.
      // Open cargo doorway on right side: dark interior with floor band hint
      { u: 0.18, v: 0.34, w: 0.14, h: 0.24, color: DOORWAY_INTERIOR },
      { u: 0.18, v: 0.34, w: 0.14, h: 0.04, color: DOORWAY_FLOOR },
      // Cockpit-side glass with subtle highlight along top
      { u: 0.18, v: 0.66, w: 0.08, h: 0.10, color: WINDOW_GLASS },
      { u: 0.18, v: 0.74, w: 0.08, h: 0.012, color: WINDOW_HIGHLIGHT },
      // White "ARMY" marker block on right cabin side
      { u: 0.20, v: 0.62, w: 0.05, h: 0.025, color: WHITE_MARKING },
      // Subtle panel banding — only above panel zone
      { u: 0.0, v: 0.495, w: 1.0, h: 0.004, color: OLIVE_DARK },
      // Tail-marking white star on tail-boom top
      { u: 0.46, v: 0.85, w: 0.05, h: 0.04, color: STAR_WHITE },
    ],
    mirror: true,
  },
  {
    slug: 'uh1c-gunship',
    base: OLIVE_DRAB,
    rects: [
      // NO doorway — gunship doors-closed. Cockpit windows only.
      { u: 0.18, v: 0.66, w: 0.08, h: 0.09, color: WINDOW_GLASS },
      { u: 0.18, v: 0.74, w: 0.08, h: 0.010, color: WINDOW_HIGHLIGHT },
      // White ARMY marker
      { u: 0.20, v: 0.55, w: 0.05, h: 0.025, color: WHITE_MARKING },
      // Panel banding (above panel zone)
      { u: 0.0, v: 0.495, w: 1.0, h: 0.004, color: OLIVE_DARK },
      // Faded squadron number on rear
      { u: 0.45, v: 0.85, w: 0.07, h: 0.04, color: WHITE_MARKING },
    ],
    mirror: true,
  },
  {
    slug: 'ah1-cobra',
    base: OLIVE_DARK,
    rects: [
      // Tandem gunner-station side windows (above panel zone)
      { u: 0.18, v: 0.62, w: 0.06, h: 0.06, color: WINDOW_GLASS },
      { u: 0.18, v: 0.74, w: 0.06, h: 0.06, color: WINDOW_GLASS },
      // Panel banding
      { u: 0.0, v: 0.495, w: 1.0, h: 0.004, color: OLIVE_DRAB },
      // White star on tail
      { u: 0.46, v: 0.88, w: 0.06, h: 0.04, color: STAR_WHITE },
    ],
    mirror: true,
  },
  {
    slug: 'ac47-spooky',
    base: OLIVE_DRAB,
    rects: [
      // Row of 5 passenger windows along cabin (all above v=0.34)
      { u: 0.18, v: 0.36, w: 0.05, h: 0.05, color: WINDOW_GLASS },
      { u: 0.18, v: 0.44, w: 0.05, h: 0.05, color: WINDOW_GLASS },
      { u: 0.18, v: 0.52, w: 0.05, h: 0.05, color: WINDOW_GLASS },
      { u: 0.18, v: 0.60, w: 0.05, h: 0.05, color: WINDOW_GLASS },
      { u: 0.18, v: 0.68, w: 0.05, h: 0.05, color: WINDOW_GLASS },
      // Cockpit windscreen
      { u: 0.20, v: 0.78, w: 0.06, h: 0.06, color: WINDOW_GLASS },
      // White unit marker (above panel zone)
      { u: 0.21, v: 0.34, w: 0.05, h: 0.025, color: WHITE_MARKING },
      // Belly band — only at far-end (v>=0.92), keep panel zone clean at v=0..0.30
      { u: 0.0, v: 0.93, w: 1.0, h: 0.07, color: DOORWAY_INTERIOR },
    ],
    mirror: true,
  },
  {
    slug: 'f4-phantom',
    base: [110, 120, 125], // navy gray
    rects: [
      // Air-intake darkening (above panel zone)
      { u: 0.16, v: 0.55, w: 0.08, h: 0.20, color: [55, 60, 65] },
      // Squadron markings
      { u: 0.20, v: 0.50, w: 0.04, h: 0.025, color: WHITE_MARKING },
      // Faded star on rear
      { u: 0.46, v: 0.85, w: 0.05, h: 0.04, color: STAR_WHITE },
      // Underside lighter only at far-end (v>=0.95) — keep v=0..0.30 clean panel zone
      { u: 0.0, v: 0.95, w: 1.0, h: 0.05, color: [140, 150, 155] },
    ],
    mirror: true,
  },
  {
    slug: 'a1-skyraider',
    base: OLIVE_DRAB,
    rects: [
      // Single cockpit windscreen with glass highlight
      { u: 0.18, v: 0.62, w: 0.07, h: 0.08, color: WINDOW_GLASS },
      { u: 0.18, v: 0.69, w: 0.07, h: 0.012, color: WINDOW_HIGHLIGHT },
      // White ARMY marker on rear (clear of panel zone)
      { u: 0.46, v: 0.34, w: 0.06, h: 0.025, color: WHITE_MARKING },
      // Panel banding (above panel zone)
      { u: 0.0, v: 0.495, w: 1.0, h: 0.004, color: OLIVE_DARK },
      { u: 0.0, v: 0.34, w: 1.0, h: 0.004, color: OLIVE_DARK },
    ],
    mirror: true,
  },
];

// =============================================================================
// Painter
// =============================================================================

function paintRect(buf: Uint8Array, w: number, h: number, rect: Rect): void {
  const x0 = Math.max(0, Math.floor(rect.u * w));
  const x1 = Math.min(w, Math.ceil((rect.u + rect.w) * w));
  // v=0 at bottom, v=1 at top → image_y_top = (1-v-h)*h, image_y_bottom = (1-v)*h
  const yTop = Math.max(0, Math.floor((1 - rect.v - rect.h) * h));
  const yBot = Math.min(h, Math.ceil((1 - rect.v) * h));
  for (let y = yTop; y < yBot; y++) {
    for (let x = x0; x < x1; x++) {
      const idx = (y * w + x) * 3;
      buf[idx] = rect.color[0]!;
      buf[idx + 1] = rect.color[1]!;
      buf[idx + 2] = rect.color[2]!;
    }
  }
}

function mirrorAcrossSides(rect: Rect): Rect {
  // Mirror across u=0.5: right side (u≈0.25) ↔ left side (u≈0.75).
  // For a rect centered at uc on right, mirrored center is 1 - uc on left.
  const uc = rect.u + rect.w / 2;
  const ucMirror = 1 - uc;
  return { ...rect, u: ucMirror - rect.w / 2 };
}

async function bake(spec: AircraftSpec): Promise<void> {
  const buf = new Uint8Array(SIZE * SIZE * 3);
  // Fill base
  for (let i = 0; i < SIZE * SIZE; i++) {
    buf[i * 3] = spec.base[0];
    buf[i * 3 + 1] = spec.base[1];
    buf[i * 3 + 2] = spec.base[2];
  }
  // Subtle vertical noise band at u=0.5 (top of body) — slight panel-line
  // suggestion. Pixel art reads it as "highlight on top".
  for (let y = 0; y < SIZE; y++) {
    const idx = (y * SIZE + Math.floor(0.5 * SIZE)) * 3;
    if (idx + 2 < buf.length) {
      buf[idx] = OLIVE_LIGHT[0];
      buf[idx + 1] = OLIVE_LIGHT[1];
      buf[idx + 2] = OLIVE_LIGHT[2];
    }
  }
  // Paint rects (with mirroring)
  const allRects: Rect[] = [];
  for (const r of spec.rects) {
    allRects.push(r);
    if (spec.mirror !== false) {
      // Only mirror rects that look "side-mounted" (u in 0.15..0.35 or 0.65..0.85)
      const uc = r.u + r.w / 2;
      if ((uc > 0.15 && uc < 0.35) || (uc > 0.65 && uc < 0.85)) {
        allRects.push(mirrorAcrossSides(r));
      }
    }
  }
  for (const r of allRects) paintRect(buf, SIZE, SIZE, r);

  const outPath = join(OUT_DIR, `${spec.slug}-albedo.png`);
  await sharp(Buffer.from(buf), {
    raw: { width: SIZE, height: SIZE, channels: 3 },
  })
    .png({ compressionLevel: 9, palette: false })
    .toFile(outPath);

  const stats = await sharp(outPath).metadata();
  console.log(
    `  baked ${spec.slug} → ${outPath} (${SIZE}x${SIZE}, ${stats.size ? Math.round(stats.size / 1024) : '?'}KB)`,
  );
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

const filtered = slugFilter ? SPECS.filter((s) => slugFilter.has(s.slug)) : SPECS;

console.log(`=== Baking ${filtered.length} aircraft albedo texture(s) ===`);
for (const spec of filtered) {
  await bake(spec);
}
console.log('=== Done ===');
