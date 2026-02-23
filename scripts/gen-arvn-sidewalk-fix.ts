/**
 * Fix ARVN side-walk1 and side-walk2 - attempt 4.
 * Use vc-walk-side-1 for walk1, vc-walk-side-2 for walk2.
 * Just tell Gemini to match the pose in the reference. Don't describe legs.
 */

import sharp from 'sharp';
import { readFileSync } from 'fs';

const SERVER = 'http://localhost:3000';
const GAME_SPRITES = 'C:/Users/Mattm/X/games-3d/terror-in-the-jungle/public/assets';
const OUT_DIR = './war-assets/soldiers';

const STYLE_SUFFIX = '32-bit pixel art sprite, high-res pixel art style, detailed with visible pixels, bright saturated colors, black pixel outlines, clean hard edges, no anti-aliasing, no blur, game asset on solid magenta #FF00FF background, entire background is flat solid magenta #FF00FF with no gradients';

const ARVN_UNIFORM = 'ARVN South Vietnamese soldier: US-pattern M1 steel helmet with camouflage cover, tiger stripe camouflage uniform, M16A1 rifle, black combat boots';

async function apiPost(endpoint: string, body: Record<string, unknown>, retries = 3): Promise<Record<string, unknown>> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const resp = await fetch(`${SERVER}/api/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (resp.ok) return resp.json() as Promise<Record<string, unknown>>;
    console.log(`    Attempt ${attempt}/${retries} failed (${resp.status})`);
    if (attempt < retries) await new Promise(r => setTimeout(r, 10000));
    else {
      const err = await resp.json().catch(() => ({ error: resp.statusText }));
      throw new Error(`API ${endpoint} failed: ${JSON.stringify(err)}`);
    }
  }
  throw new Error('unreachable');
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
  if (cleaned > 0) console.log(`    Chroma: ${cleaned} px`);
  return sharp(Buffer.from(pixels), { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
}

function loadImageAsBase64(path: string): string {
  const buf = readFileSync(path);
  const ext = path.endsWith('.webp') ? 'webp' : 'png';
  return `data:image/${ext};base64,${buf.toString('base64')}`;
}

try {
  const health = await fetch(`${SERVER}/health`);
  if (!health.ok) throw new Error('not ok');
} catch {
  console.error('Server not reachable');
  process.exit(1);
}

const arvnCharRef = loadImageAsBase64(`${OUT_DIR}/arvn-tpose-ref_raw.png`);

const poses = [
  { out: 'arvn-side-walk1', ref: 'vc-walk-side-1.webp' },
  { out: 'arvn-side-walk2', ref: 'vc-walk-side-2.webp' },
];

console.log('=== Fix ARVN side walks (attempt 4) ===');
console.log('  Just reference the pose image, don\'t describe legs\n');

for (const pose of poses) {
  console.log(`--- ${pose.out} ---`);
  console.log(`  Pose ref: ${pose.ref}`);
  const poseRef = loadImageAsBase64(`${GAME_SPRITES}/${pose.ref}`);

  const prompt = `Recreate the second reference image as an ARVN soldier. Match the exact pose from the second reference image. ${ARVN_UNIFORM}. Side profile facing right. Full body head to toe, no text, ${STYLE_SUFFIX}`;

  console.log('  Generating...');
  const gen = await apiPost('image/generate', {
    prompt,
    aspectRatio: '1:1',
    referenceImages: [arvnCharRef, poseRef],
  });

  if (!gen.image) { console.error('  FAILED'); continue; }

  const rawB64 = (gen.image as string).replace(/^data:image\/\w+;base64,/, '');
  await Bun.write(`${OUT_DIR}/${pose.out}_raw.png`, Buffer.from(rawB64, 'base64'));

  console.log('  BiRefNet...');
  const bgResult = await apiPost('image/remove-bg', { image: gen.image });
  if (!bgResult.image) { console.error('  BiRefNet failed'); continue; }

  const bgB64 = (bgResult.image as string).replace(/^data:image\/\w+;base64,/, '');
  const clean = await chromaCleanMagenta(Buffer.from(bgB64, 'base64'));
  await Bun.write(`${OUT_DIR}/${pose.out}.png`, clean);
  console.log(`  Final: ${(clean.length / 1024).toFixed(0)}KB\n`);
}

console.log('Done!');
