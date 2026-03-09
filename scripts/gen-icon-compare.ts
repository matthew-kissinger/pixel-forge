/**
 * A/B comparison: Generate the same test icons with 3 approaches:
 *   A) Recraft V3 (pixel_art style) via FAL
 *   B) Recraft V3 (flat_2 vector style) via FAL - for emblems
 *   C) Improved Gemini prompts (magenta bg, tighter constraints)
 *
 * Outputs side-by-side in war-assets/ui/icons/compare/ for gallery review.
 *
 * Usage:
 *   bun scripts/gen-icon-compare.ts
 */

import * as fal from '@fal-ai/serverless-client';
import sharp from 'sharp';
import { existsSync, mkdirSync } from 'fs';

const SERVER = 'http://localhost:3000';
const OUT_DIR = './war-assets/ui/icons/compare';
mkdirSync(OUT_DIR, { recursive: true });

// ---------------------------------------------------------------------------
// FAL setup
// ---------------------------------------------------------------------------

const FAL_KEY = process.env.FAL_KEY;
if (!FAL_KEY) {
  console.error('FAL_KEY not set. Check ~/.config/mk-agent/env');
  process.exit(1);
}
fal.config({ credentials: FAL_KEY });

// ---------------------------------------------------------------------------
// Test icons - one mono icon, one emblem, one small map icon
// ---------------------------------------------------------------------------

interface TestIcon {
  name: string;
  desc: string;
  type: 'mono' | 'emblem' | 'small';
  recraftPixelPrompt: string;
  recraftFlatPrompt: string;
  geminiPrompt: string;
  recraftColors?: Array<{ r: number; g: number; b: number }>;
}

const TEST_ICONS: TestIcon[] = [
  {
    name: 'rifle',
    desc: 'M16 rifle',
    type: 'mono',
    recraftPixelPrompt: 'white M16 assault rifle silhouette icon, right-facing side profile, distinctive carry handle, bold clean shape, game HUD icon, no text, no labels',
    recraftFlatPrompt: 'white M16 assault rifle silhouette icon, right-facing side profile, distinctive carry handle, bold flat shape, minimal detail, game icon, no text',
    geminiPrompt: 'white M16 assault rifle silhouette, right-facing side profile, distinctive carry handle and front sight post, solid white fill, no internal detail, uniform 2-pixel black outline, no shading',
    recraftColors: [{ r: 255, g: 255, b: 255 }, { r: 0, g: 0, b: 0 }],
  },
  {
    name: 'emblem-nva',
    desc: 'NVA star emblem',
    type: 'emblem',
    recraftPixelPrompt: 'bright yellow five-pointed star centered on solid red circle, North Vietnamese Army military insignia emblem, bold clean design, no text, no labels',
    recraftFlatPrompt: 'bright yellow five-pointed star centered on solid red circle, North Vietnamese Army military insignia emblem, bold flat design, minimal detail, no text',
    geminiPrompt: 'bright yellow five-pointed star centered on solid red circle, North Vietnamese Army NVA military insignia emblem, bold clean design, solid flat colors, no shading, no gradients',
    recraftColors: [{ r: 255, g: 220, b: 0 }, { r: 200, g: 30, b: 30 }],
  },
  {
    name: 'map-helipad',
    desc: 'Helipad map marker',
    type: 'small',
    recraftPixelPrompt: 'white circle with letter H inside, helicopter landing pad marker icon, bold simple shape, game minimap icon, no text except H',
    recraftFlatPrompt: 'white circle with letter H inside, helicopter landing pad marker icon, bold flat design, game map marker, minimal detail',
    geminiPrompt: 'white circle with bold letter H inside, helicopter landing pad map marker icon, solid white fill, uniform 2-pixel black outline, no shading, simple bold shape',
    recraftColors: [{ r: 255, g: 255, b: 255 }, { r: 0, g: 0, b: 0 }],
  },
  {
    name: 'fire',
    desc: 'Fire button crosshair',
    type: 'mono',
    recraftPixelPrompt: 'white crosshair reticle icon, circular targeting sight with center dot, bold clean lines, game HUD fire button icon, no text, no labels',
    recraftFlatPrompt: 'white crosshair reticle icon, circular targeting sight with center dot, bold flat lines, game fire button, minimal detail, no text',
    geminiPrompt: 'white crosshair trigger symbol, circular reticle with center dot, solid white fill, uniform 2-pixel black outline, no shading, fire button icon',
    recraftColors: [{ r: 255, g: 255, b: 255 }, { r: 0, g: 0, b: 0 }],
  },
];

// ---------------------------------------------------------------------------
// Gemini improved style - switched to magenta bg, tighter constraints
// ---------------------------------------------------------------------------

const GEMINI_MONO_STYLE = '16-bit pixel art icon, bold white solid shape on flat solid magenta #FF00FF background, uniform outline weight, no anti-aliasing, no gradients, no soft edges, no blur, no drop shadows, no internal detail, solid fill only, game HUD icon, no text, no labels, no words, no numbers, entire background is flat solid magenta #FF00FF with no patterns';

const GEMINI_EMBLEM_STYLE = '16-bit pixel art icon, bold clean emblem with solid flat colors on flat solid green #00FF00 background, uniform outline weight, no anti-aliasing, no gradients, no soft edges, no blur, no drop shadows, game faction insignia icon, no text, no labels, no words, entire background is flat solid green #00FF00 with no patterns';

// ---------------------------------------------------------------------------
// Approach A: Recraft V3 pixel_art
// ---------------------------------------------------------------------------

async function generateRecraftPixelArt(icon: TestIcon): Promise<void> {
  const outPath = `${OUT_DIR}/${icon.name}_recraft-pixel.png`;
  if (existsSync(outPath)) { console.log(`  SKIP ${outPath}`); return; }

  console.log(`  Recraft pixel_art: ${icon.name}`);
  try {
    const result = await fal.subscribe('fal-ai/recraft/v3/text-to-image', {
      input: {
        prompt: icon.recraftPixelPrompt,
        style: 'digital_illustration/pixel_art',
        image_size: 'square',
        ...(icon.recraftColors ? { colors: icon.recraftColors } : {}),
      },
    }) as { images?: Array<{ url: string }> };

    if (!result.images?.[0]?.url) { console.error('    No image'); return; }
    const resp = await fetch(result.images[0].url);
    const buf = Buffer.from(new Uint8Array(await resp.arrayBuffer()));
    await Bun.write(outPath, buf);
    console.log(`    OK: ${(buf.length / 1024).toFixed(1)}KB`);
  } catch (e) {
    console.error(`    ERROR: ${(e as Error).message}`);
  }
}

// ---------------------------------------------------------------------------
// Approach B: Recraft V3 flat_2 (vector-like)
// ---------------------------------------------------------------------------

async function generateRecraftFlat(icon: TestIcon): Promise<void> {
  const outPath = `${OUT_DIR}/${icon.name}_recraft-flat.png`;
  if (existsSync(outPath)) { console.log(`  SKIP ${outPath}`); return; }

  console.log(`  Recraft flat_2: ${icon.name}`);
  try {
    const result = await fal.subscribe('fal-ai/recraft/v3/text-to-image', {
      input: {
        prompt: icon.recraftFlatPrompt,
        style: 'vector_illustration/emotional_flat',
        image_size: 'square',
      },
    }) as { images?: Array<{ url: string }> };

    if (!result.images?.[0]?.url) { console.error('    No image'); return; }
    const resp = await fetch(result.images[0].url);
    const buf = Buffer.from(new Uint8Array(await resp.arrayBuffer()));
    await Bun.write(outPath, buf);
    console.log(`    OK: ${(buf.length / 1024).toFixed(1)}KB`);
  } catch (e) {
    console.error(`    ERROR: ${(e as Error).message}`);
    if ((e as any).body) console.error(`    BODY: ${JSON.stringify((e as any).body)}`);
  }
}

// ---------------------------------------------------------------------------
// Approach C: Improved Gemini (magenta bg, chroma cleanup)
// ---------------------------------------------------------------------------

async function apiPost(endpoint: string, body: Record<string, unknown>) {
  const resp = await fetch(`${SERVER}/api/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: resp.statusText }));
    throw new Error(`API ${endpoint} failed (${resp.status}): ${JSON.stringify(err)}`);
  }
  return resp.json() as Promise<Record<string, unknown>>;
}

async function chromaCleanMagenta(buf: Buffer): Promise<Buffer> {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const pixels = new Uint8Array(data.buffer);
  let cleaned = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
    if ((r > 150 && b > 150 && g < 100 && Math.abs(r - b) < 60) || (r > 180 && b > 130 && g < 120 && (r + b) > (g * 4))) {
      pixels[i + 3] = 0; cleaned++;
    }
  }
  if (cleaned > 0) console.log(`    Chroma magenta: ${cleaned} px`);
  return sharp(Buffer.from(pixels), { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
}

async function chromaCleanGreen(buf: Buffer): Promise<Buffer> {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const pixels = new Uint8Array(data.buffer);
  let cleaned = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
    if (g > 180 && r < 100 && b < 100) { pixels[i + 3] = 0; cleaned++; }
  }
  if (cleaned > 0) console.log(`    Chroma green: ${cleaned} px`);
  return sharp(Buffer.from(pixels), { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
}

async function generateGeminiImproved(icon: TestIcon): Promise<void> {
  const outPath = `${OUT_DIR}/${icon.name}_gemini-v2.png`;
  const rawPath = `${OUT_DIR}/${icon.name}_gemini-v2_raw.png`;
  if (existsSync(outPath)) { console.log(`  SKIP ${outPath}`); return; }

  console.log(`  Gemini improved: ${icon.name}`);

  const style = icon.type === 'emblem' ? GEMINI_EMBLEM_STYLE : GEMINI_MONO_STYLE;
  const prompt = `${icon.geminiPrompt}, ${style}`;

  try {
    const gen = await apiPost('image/generate', { prompt, aspectRatio: '1:1' });
    if (!gen.image) { console.error('    No image'); return; }

    const rawB64 = (gen.image as string).replace(/^data:image\/\w+;base64,/, '');
    await Bun.write(rawPath, Buffer.from(rawB64, 'base64'));

    // BiRefNet bg removal
    const bgResult = await apiPost('image/remove-bg', { image: gen.image });
    if (!bgResult.image) { console.error('    BiRefNet failed'); return; }

    const bgB64 = (bgResult.image as string).replace(/^data:image\/\w+;base64,/, '');
    const cleanFn = icon.type === 'emblem' ? chromaCleanGreen : chromaCleanMagenta;
    const clean = await cleanFn(Buffer.from(bgB64, 'base64'));
    await Bun.write(outPath, clean);
    console.log(`    OK: ${(clean.length / 1024).toFixed(1)}KB`);
  } catch (e) {
    console.error(`    ERROR: ${(e as Error).message}`);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

// Check server (needed for Gemini)
try {
  const health = await fetch(`${SERVER}/health`);
  if (!health.ok) throw new Error('not ok');
} catch {
  console.error('Server not reachable. Start with: bun run dev:server');
  process.exit(1);
}

console.log(`=== Icon Generation A/B/C Comparison ===`);
console.log(`Output: ${OUT_DIR}/`);
console.log(`Testing ${TEST_ICONS.length} icons x 3 approaches = ${TEST_ICONS.length * 3} images\n`);

for (const icon of TEST_ICONS) {
  console.log(`\n--- ${icon.name} (${icon.desc}) ---`);
  await generateRecraftPixelArt(icon);
  await generateRecraftFlat(icon);
  await generateGeminiImproved(icon);
}

console.log('\n=== Done! ===');
console.log(`Compare results at: ${OUT_DIR}/`);
console.log('Files per icon:');
console.log('  *_recraft-pixel.png  - Recraft V3 pixel_art style');
console.log('  *_recraft-flat.png   - Recraft V3 flat vector style');
console.log('  *_gemini-v2.png      - Improved Gemini (magenta bg, tighter prompt)');
console.log('  *_gemini-v2_raw.png  - Gemini raw (before bg removal)');
console.log('\nCheck gallery at http://localhost:3000/gallery');
