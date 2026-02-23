/**
 * Generate Viet Cong guerrilla sprites using T-pose + pose reference approach.
 * Same workflow as NVA but with VC guerrilla appearance.
 */

import sharp from 'sharp';
import { readFileSync } from 'fs';

const SERVER = 'http://localhost:3000';
const VC_SPRITES = 'C:/Users/Mattm/X/games-3d/terror-in-the-jungle/public/assets';
const OUT_DIR = './war-assets/soldiers';

const STYLE_SUFFIX = '32-bit pixel art sprite, high-res pixel art style, detailed with visible pixels, bright saturated colors, black pixel outlines, clean hard edges, no anti-aliasing, no blur, game asset on solid magenta #FF00FF background, entire background is flat solid magenta #FF00FF with no gradients';

const VC_UNIFORM = 'Viet Cong guerrilla fighter: black pajama clothing, conical straw non la hat, AK-47 rifle, Ho Chi Minh sandals, ammunition bandolier across chest, minimal web gear';

const POSES = [
  { out: 'vc-front-walk1', vcRef: 'vc-walk-front-1.webp', desc: 'walking pose left foot forward, rifle across chest, front facing view' },
  { out: 'vc-front-walk2', vcRef: 'vc-walk-front-2.webp', desc: 'walking pose right foot forward, rifle across chest, front facing view' },
  { out: 'vc-front-fire',  vcRef: 'vc-fire-front.webp',   desc: 'firing stance aiming forward at viewer, rifle shouldered, muzzle flash, front facing view' },
  { out: 'vc-side-walk1',  vcRef: 'vc-walk-side-1.webp',  desc: 'Camera: locked right side profile view. Soldier facing RIGHT, looking RIGHT. Left leg forward, right leg back, mid-stride. Rifle held at ready' },
  { out: 'vc-side-walk2',  vcRef: 'vc-walk-side-2.webp',  desc: 'Camera: locked right side profile view. Soldier facing RIGHT, looking RIGHT. Right leg forward, left leg back, mid-stride. Rifle held at ready' },
  { out: 'vc-side-fire',   vcRef: 'vc-fire-side.webp',    desc: 'firing stance aiming right, rifle shouldered, muzzle flash, right side profile view' },
  { out: 'vc-back-walk1',  vcRef: 'vc-walk-back-1.webp',  desc: 'walking pose left foot forward, rifle held in hands, seen from behind, rear back view' },
  { out: 'vc-back-walk2',  vcRef: 'vc-walk-back-2.webp',  desc: 'walking pose right foot forward, rifle held in hands, seen from behind, rear back view' },
  { out: 'vc-back-fire',   vcRef: 'vc-fire-back.webp',    desc: 'firing stance aiming forward away from viewer, muzzle flash, seen from behind, rear back view' },
];

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

// Step 1: Generate VC T-Pose
console.log('=== Step 1: Generate VC T-Pose Character Reference ===\n');

const vcFrontRef = loadImageAsBase64(`${VC_SPRITES}/vc-walk-front-1.webp`);
const tposePrompt = `Recreate this soldier character in a T-pose (arms out to sides, legs slightly apart, standing upright, front facing view). Change the outfit to: ${VC_UNIFORM}. Keep the same 32-bit pixel art style. Full body head to toe visible, character reference sheet pose, ${STYLE_SUFFIX}`;

console.log('  Generating VC T-pose...');
const tposeResult = await apiPost('image/generate', {
  prompt: tposePrompt,
  aspectRatio: '1:1',
  referenceImages: [vcFrontRef],
});

if (!tposeResult.image) { console.error('FAILED to generate T-pose!'); process.exit(1); }

const tposeB64 = (tposeResult.image as string).replace(/^data:image\/\w+;base64,/, '');
await Bun.write(`${OUT_DIR}/vc-tpose-ref_raw.png`, Buffer.from(tposeB64, 'base64'));

const tposeBg = await apiPost('image/remove-bg', { image: tposeResult.image });
if (tposeBg.image) {
  const bgB64 = (tposeBg.image as string).replace(/^data:image\/\w+;base64,/, '');
  const clean = await chromaCleanMagenta(Buffer.from(bgB64, 'base64'));
  await Bun.write(`${OUT_DIR}/vc-tpose-ref.png`, clean);
}

const vcCharRef = tposeResult.image as string;
console.log('  T-pose generated.\n');

// Step 2: Generate 9 Pose Sprites
console.log('=== Step 2: Generate 9 VC Pose Sprites ===\n');

for (const pose of POSES) {
  console.log(`--- ${pose.out} ---`);
  const vcPoseRef = loadImageAsBase64(`${VC_SPRITES}/${pose.vcRef}`);

  const prompt = `Recreate the second reference image's pose with the Viet Cong guerrilla from the first reference image. ${VC_UNIFORM}, ${pose.desc}, full body head to toe visible, no text, ${STYLE_SUFFIX}`;

  console.log('  Generating...');
  const gen = await apiPost('image/generate', {
    prompt,
    aspectRatio: '1:1',
    referenceImages: [vcCharRef, vcPoseRef],
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
