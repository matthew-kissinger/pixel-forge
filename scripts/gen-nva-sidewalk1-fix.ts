/**
 * Fix NVA side-walk1: soldier was looking at camera instead of walking direction.
 * Reuse existing T-pose ref, just redo this one sprite.
 */

import sharp from 'sharp';
import { readFileSync } from 'fs';

const SERVER = 'http://localhost:3000';
const VC_SPRITES = 'C:/Users/Mattm/X/games-3d/terror-in-the-jungle/public/assets';
const OUT_DIR = './war-assets/soldiers';

const STYLE_SUFFIX = '32-bit pixel art sprite, high-res pixel art style, detailed with visible pixels, bright saturated colors, black pixel outlines, clean hard edges, no anti-aliasing, no blur, game asset on solid magenta #FF00FF background, entire background is flat solid magenta #FF00FF with no gradients';

const NVA_UNIFORM = 'NVA North Vietnamese Army regular soldier: pith helmet (khaki sun helmet), khaki-olive uniform with web gear and chest rig ammo pouches, AK-47 rifle, canvas boots';

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
      pixels[i + 3] = 0;
      cleaned++;
    }
  }
  if (cleaned > 0) console.log(`    Chroma: ${cleaned} px`);
  return sharp(Buffer.from(pixels), { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
}

function loadImageAsBase64(path: string): string {
  const buf = readFileSync(path);
  const ext = path.endsWith('.webp') ? 'webp' : path.endsWith('.png') ? 'png' : 'webp';
  return `data:image/${ext};base64,${buf.toString('base64')}`;
}

// Check server
try {
  const health = await fetch(`${SERVER}/health`);
  if (!health.ok) throw new Error('not ok');
} catch {
  console.error('Server not reachable. Start with: bun run dev:server');
  process.exit(1);
}

// Load existing T-pose ref (already generated)
const nvaCharRef = loadImageAsBase64(`${OUT_DIR}/nva-tpose-ref_raw.png`);
const vcPoseRef = loadImageAsBase64(`${VC_SPRITES}/vc-walk-side-1.webp`);

console.log('=== Fixing NVA side-walk1 ===');
console.log('  Issue: soldier was looking at camera instead of walking direction');
console.log('  Fix: emphasize facing RIGHT in walking direction\n');

const prompt = `Recreate the second reference image's pose with the NVA soldier from the first reference image. ${NVA_UNIFORM}. Camera: locked right side profile view. Soldier facing RIGHT, looking RIGHT in walking direction. Left leg forward, right leg back, mid-stride walking pose. Head turned to the right, NOT looking at camera. Full body head to toe, no text, ${STYLE_SUFFIX}`;

console.log('  Generating...');
const gen = await apiPost('image/generate', {
  prompt,
  aspectRatio: '1:1',
  referenceImages: [nvaCharRef, vcPoseRef],
});

if (!gen.image) { console.error('  FAILED'); process.exit(1); }

const rawB64 = (gen.image as string).replace(/^data:image\/\w+;base64,/, '');
await Bun.write(`${OUT_DIR}/nva-side-walk1_raw.png`, Buffer.from(rawB64, 'base64'));
console.log(`  Raw: ${(Buffer.from(rawB64, 'base64').length / 1024).toFixed(0)}KB`);

console.log('  BiRefNet...');
const bgResult = await apiPost('image/remove-bg', { image: gen.image });
if (!bgResult.image) { console.error('  BiRefNet failed'); process.exit(1); }

const bgB64 = (bgResult.image as string).replace(/^data:image\/\w+;base64,/, '');
const clean = await chromaCleanMagenta(Buffer.from(bgB64, 'base64'));
await Bun.write(`${OUT_DIR}/nva-side-walk1.png`, clean);
console.log(`  Final: ${(clean.length / 1024).toFixed(0)}KB`);

console.log('\nDone! Check http://localhost:3000/gallery');
