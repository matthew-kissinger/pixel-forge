/**
 * Generate NVA soldier sprites using dual-reference T-pose approach.
 * Uses VC sprite (pose ref) + US sprite (style/detail level ref) to ensure
 * NVA matches existing NPC pixel art proportions and detail level.
 */

import sharp from 'sharp';
import { readFileSync } from 'fs';

const SERVER = 'http://localhost:3000';
const GAME_SPRITES = 'C:/Users/Mattm/X/games-3d/terror-in-the-jungle/public/assets';
const OUT_DIR = './war-assets/soldiers';

const STYLE_SUFFIX = '32-bit pixel art sprite, high-res pixel art style, detailed with visible pixels, bright saturated colors, black pixel outlines, clean hard edges, no anti-aliasing, no blur, game asset on solid magenta #FF00FF background, entire background is flat solid magenta #FF00FF with no gradients';

const NVA_UNIFORM = 'NVA North Vietnamese Army regular soldier: pith helmet (khaki sun helmet), khaki-olive uniform with web gear and chest rig ammo pouches, AK-47 rifle, canvas boots';

const POSES = [
  { out: 'nva-front-walk1', ref: 'vc-walk-front-1.webp', desc: 'walking pose left foot forward, rifle across chest, front facing view' },
  { out: 'nva-front-walk2', ref: 'vc-walk-front-2.webp', desc: 'walking pose right foot forward, rifle across chest, front facing view' },
  { out: 'nva-front-fire',  ref: 'vc-fire-front.webp',   desc: 'firing stance aiming forward at viewer, rifle shouldered, muzzle flash, front facing view' },
  { out: 'nva-side-walk1',  ref: 'vc-walk-side-1.webp',  desc: 'Camera: locked right side profile view. Soldier facing RIGHT, looking RIGHT. Left leg forward, right leg back, mid-stride. Rifle held at ready' },
  { out: 'nva-side-walk2',  ref: 'vc-walk-side-2.webp',  desc: 'Camera: locked right side profile view. Soldier facing RIGHT, looking RIGHT. Right leg forward, left leg back, mid-stride. Rifle held at ready' },
  { out: 'nva-side-fire',   ref: 'vc-fire-side.webp',    desc: 'firing stance aiming right, rifle shouldered, muzzle flash, right side profile view' },
  { out: 'nva-back-walk1',  ref: 'vc-walk-back-1.webp',  desc: 'walking pose left foot forward, rifle held in hands, seen from behind, rear back view' },
  { out: 'nva-back-walk2',  ref: 'vc-walk-back-2.webp',  desc: 'walking pose right foot forward, rifle held in hands, seen from behind, rear back view' },
  { out: 'nva-back-fire',   ref: 'vc-fire-back.webp',    desc: 'firing stance aiming forward away from viewer, muzzle flash, seen from behind, rear back view' },
];

async function apiPost(endpoint: string, body: Record<string, unknown>, retries = 3): Promise<Record<string, unknown>> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const resp = await fetch(`${SERVER}/api/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (resp.ok) return resp.json() as Promise<Record<string, unknown>>;
    console.log(`    Attempt ${attempt}/${retries} failed (${resp.status})`);
    if (attempt < retries) {
      console.log('    Waiting 10s...');
      await new Promise(r => setTimeout(r, 10000));
    } else {
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

// Check server
try {
  const health = await fetch(`${SERVER}/health`);
  if (!health.ok) throw new Error('not ok');
} catch {
  console.error('Server not reachable. Start with: bun run dev:server');
  process.exit(1);
}

// ── Step 1: Generate NVA T-Pose using VC + US sprites as dual style refs ──

console.log('=== Step 1: Generate NVA T-Pose ===\n');
console.log('  Using VC sprite (body ref) + US sprite (detail level/style ref)\n');

const vcFrontRef = loadImageAsBase64(`${GAME_SPRITES}/vc-walk-front-1.webp`);
const usFrontRef = loadImageAsBase64(`${GAME_SPRITES}/us-walk-front-1.webp`);

const tposePrompt = `Create an NVA soldier T-pose character sheet matching the exact pixel art style, proportions, and level of detail of these two reference game sprites. Same body size, same pixel density, same outline thickness, same level of simplicity. Change uniform to: ${NVA_UNIFORM}. T-pose: arms out to sides, legs slightly apart, standing upright, front facing view. Full body head to toe visible, ${STYLE_SUFFIX}`;

console.log('  Generating...');
const tposeResult = await apiPost('image/generate', {
  prompt: tposePrompt,
  aspectRatio: '1:1',
  referenceImages: [vcFrontRef, usFrontRef],
});

if (!tposeResult.image) { console.error('FAILED T-pose!'); process.exit(1); }

const tposeB64 = (tposeResult.image as string).replace(/^data:image\/\w+;base64,/, '');
await Bun.write(`${OUT_DIR}/nva-tpose-ref_raw.png`, Buffer.from(tposeB64, 'base64'));

const tposeBg = await apiPost('image/remove-bg', { image: tposeResult.image });
if (tposeBg.image) {
  const bgB64 = (tposeBg.image as string).replace(/^data:image\/\w+;base64,/, '');
  const clean = await chromaCleanMagenta(Buffer.from(bgB64, 'base64'));
  await Bun.write(`${OUT_DIR}/nva-tpose-ref.png`, clean);
}

const nvaCharRef = tposeResult.image as string;
console.log('  T-pose generated.\n');

// ── Step 2: Generate 9 Pose Sprites ──

console.log('=== Step 2: Generate 9 NVA Pose Sprites ===\n');

for (const pose of POSES) {
  console.log(`--- ${pose.out} ---`);
  const poseRef = loadImageAsBase64(`${GAME_SPRITES}/${pose.ref}`);

  const prompt = `Recreate the second reference image's exact pose with the NVA soldier from the first reference image. Match the pixel art style, proportions, and detail level exactly. ${NVA_UNIFORM}, ${pose.desc}, full body head to toe visible, no text, ${STYLE_SUFFIX}`;

  console.log('  Generating...');
  const gen = await apiPost('image/generate', {
    prompt,
    aspectRatio: '1:1',
    referenceImages: [nvaCharRef, poseRef],
  });

  if (!gen.image) { console.error('  FAILED'); continue; }

  const rawB64 = (gen.image as string).replace(/^data:image\/\w+;base64,/, '');
  await Bun.write(`${OUT_DIR}/${pose.out}_raw.png`, Buffer.from(rawB64, 'base64'));

  console.log('  BiRefNet...');
  const bgResult = await apiPost('image/remove-bg', { image: gen.image });
  if (!bgResult.image) { console.error('  BiRefNet failed, saving raw only'); continue; }

  const bgB64 = (bgResult.image as string).replace(/^data:image\/\w+;base64,/, '');
  const clean = await chromaCleanMagenta(Buffer.from(bgB64, 'base64'));
  await Bun.write(`${OUT_DIR}/${pose.out}.png`, clean);
  console.log(`  Final: ${(clean.length / 1024).toFixed(0)}KB\n`);
}

console.log('\nDone! Check http://localhost:3000/gallery');
