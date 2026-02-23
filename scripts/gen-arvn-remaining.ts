/**
 * Generate remaining ARVN sprites (front-fire through back-fire).
 * Reuse existing T-pose ref. Retry-safe: skips if file already exists.
 */

import sharp from 'sharp';
import { readFileSync, existsSync } from 'fs';

const SERVER = 'http://localhost:3000';
const VC_SPRITES = 'C:/Users/Mattm/X/games-3d/terror-in-the-jungle/public/assets';
const OUT_DIR = './war-assets/soldiers';

const STYLE_SUFFIX = '32-bit pixel art sprite, high-res pixel art style, detailed with visible pixels, bright saturated colors, black pixel outlines, clean hard edges, no anti-aliasing, no blur, game asset on solid magenta #FF00FF background, entire background is flat solid magenta #FF00FF with no gradients';

const ARVN_UNIFORM = 'ARVN Army of the Republic of Vietnam soldier: US-pattern M1 steel helmet with camouflage cover, tiger stripe camouflage uniform with dark green and brown stripes, M16A1 rifle, black combat boots, US-style web gear with ammo pouches';

const POSES = [
  { out: 'arvn-front-fire',  vcRef: 'vc-fire-front.webp',   desc: 'firing stance aiming forward at viewer, rifle shouldered, muzzle flash, front facing view' },
  { out: 'arvn-side-walk1',  vcRef: 'vc-walk-side-1.webp',  desc: 'Camera: locked right side profile view. Soldier facing RIGHT, looking RIGHT. Left leg forward, right leg back, mid-stride. Rifle held at ready' },
  { out: 'arvn-side-walk2',  vcRef: 'vc-walk-side-2.webp',  desc: 'Camera: locked right side profile view. Soldier facing RIGHT, looking RIGHT. Right leg forward, left leg back, mid-stride. Rifle held at ready' },
  { out: 'arvn-side-fire',   vcRef: 'vc-fire-side.webp',    desc: 'firing stance aiming right, rifle shouldered, muzzle flash, right side profile view' },
  { out: 'arvn-back-walk1',  vcRef: 'vc-walk-back-1.webp',  desc: 'walking pose left foot forward, rifle held in hands, seen from behind, rear back view' },
  { out: 'arvn-back-walk2',  vcRef: 'vc-walk-back-2.webp',  desc: 'walking pose right foot forward, rifle held in hands, seen from behind, rear back view' },
  { out: 'arvn-back-fire',   vcRef: 'vc-fire-back.webp',    desc: 'firing stance aiming forward away from viewer, muzzle flash, seen from behind, rear back view' },
];

async function apiPost(endpoint: string, body: Record<string, unknown>, retries = 3): Promise<Record<string, unknown>> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const resp = await fetch(`${SERVER}/api/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (resp.ok) return resp.json() as Promise<Record<string, unknown>>;
    const err = await resp.json().catch(() => ({ error: resp.statusText }));
    console.log(`    Attempt ${attempt}/${retries} failed (${resp.status})`);
    if (attempt < retries) {
      console.log('    Waiting 10s before retry...');
      await new Promise(r => setTimeout(r, 10000));
    } else {
      throw new Error(`API ${endpoint} failed after ${retries} attempts: ${JSON.stringify(err)}`);
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
  console.error('Server not reachable. Start with: bun run dev:server');
  process.exit(1);
}

// Load existing T-pose ref
const arvnCharRef = loadImageAsBase64(`${OUT_DIR}/arvn-tpose-ref_raw.png`);
console.log('=== Generating remaining ARVN sprites ===\n');

for (const pose of POSES) {
  // Skip if already exists
  if (existsSync(`${OUT_DIR}/${pose.out}.png`)) {
    console.log(`--- ${pose.out} --- SKIP (exists)`);
    continue;
  }

  console.log(`--- ${pose.out} ---`);
  const vcPoseRef = loadImageAsBase64(`${VC_SPRITES}/${pose.vcRef}`);

  const prompt = `Recreate the second reference image's pose with the ARVN soldier from the first reference image. ${ARVN_UNIFORM}, ${pose.desc}, full body head to toe visible, no text, ${STYLE_SUFFIX}`;

  console.log('  Generating...');
  const gen = await apiPost('image/generate', {
    prompt,
    aspectRatio: '1:1',
    referenceImages: [arvnCharRef, vcPoseRef],
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

console.log('\nDone! Check http://localhost:3000/gallery');
