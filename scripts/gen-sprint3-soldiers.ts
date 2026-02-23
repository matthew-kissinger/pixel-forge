/**
 * Generate mounted/seated soldier sprites - one per faction.
 * Upper half body only (waist up), hands forward as if gripping controls.
 * NO weapon in shot - turret/gun is a separate mesh they mount on.
 * Uses existing faction front-walk sprite as style reference.
 */

import sharp from 'sharp';
import { readFileSync, existsSync } from 'fs';

const SERVER = 'http://localhost:3000';
const GAME_SPRITES = 'C:/Users/Mattm/X/games-3d/terror-in-the-jungle/public/assets';
const OUT_DIR = './war-assets/soldiers';

const STYLE_SUFFIX = '32-bit pixel art sprite, high-res pixel art style, detailed with visible pixels, bright saturated colors, black pixel outlines, clean hard edges, no anti-aliasing, no blur, game asset on solid magenta #FF00FF background, entire background is flat solid magenta #FF00FF with no gradients';

const MOUNTED_DESC = 'upper body only from waist up, facing forward, both hands extended straight forward at chest height as if gripping handles or controls, NO weapon, NO gun, NO rifle in image, just the soldier upper body and arms';

const FACTIONS = [
  {
    id: 'us',
    name: 'US',
    ref: `${GAME_SPRITES}/us-walk-front-1.webp`,
    uniform: 'US Army soldier: M1 steel helmet with camo band, OG-107 olive drab fatigues, web gear with ammo pouches',
  },
  {
    id: 'nva',
    name: 'NVA',
    ref: `${OUT_DIR}/nva-front-walk1.png`,
    uniform: 'NVA North Vietnamese Army soldier: pith helmet (khaki sun helmet), khaki-olive uniform with web gear and chest rig',
  },
  {
    id: 'arvn',
    name: 'ARVN',
    ref: `${OUT_DIR}/arvn-front-walk1.png`,
    uniform: 'ARVN soldier: US-pattern M1 steel helmet with camo cover, tiger stripe camouflage uniform, web gear',
  },
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
      console.log('    Waiting 15s before retry...');
      await new Promise(r => setTimeout(r, 15000));
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

console.log('=== Mounted Soldier Sprites (1 per faction, upper body) ===\n');

// Generate first faction (US), then use that as pose ref for NVA and ARVN
let firstPoseRef: string | null = null;

for (const faction of FACTIONS) {
  const outName = `${faction.id}-mounted`;

  if (existsSync(`${OUT_DIR}/${outName}.png`)) {
    console.log(`--- ${outName} --- SKIP (exists)`);
    firstPoseRef = loadImageAsBase64(`${OUT_DIR}/${outName}.png`);
    continue;
  }

  console.log(`--- ${outName} (${faction.name}) ---`);

  const factionRef = loadImageAsBase64(faction.ref);
  const refs = firstPoseRef ? [factionRef, firstPoseRef] : [factionRef];
  const poseNote = firstPoseRef
    ? 'Match the exact pose from the second reference image.'
    : '';

  const prompt = `${faction.uniform}, ${MOUNTED_DESC}, ${poseNote} front facing view, no text, ${STYLE_SUFFIX}`;

  console.log('  Generating...');
  const gen = await apiPost('image/generate', {
    prompt,
    aspectRatio: '1:1',
    referenceImages: refs,
  });

  if (!gen.image) { console.error('  FAILED'); continue; }

  const rawB64 = (gen.image as string).replace(/^data:image\/\w+;base64,/, '');
  await Bun.write(`${OUT_DIR}/${outName}_raw.png`, Buffer.from(rawB64, 'base64'));

  console.log('  BiRefNet...');
  const bgResult = await apiPost('image/remove-bg', { image: gen.image });
  if (!bgResult.image) { console.error('  BiRefNet failed'); continue; }

  const bgB64 = (bgResult.image as string).replace(/^data:image\/\w+;base64,/, '');
  const clean = await chromaCleanMagenta(Buffer.from(bgB64, 'base64'));
  await Bun.write(`${OUT_DIR}/${outName}.png`, clean);
  console.log(`  Final: ${(clean.length / 1024).toFixed(0)}KB\n`);

  // Use first successful result as pose reference for consistency
  if (!firstPoseRef) {
    firstPoseRef = `data:image/png;base64,${rawB64}`;
    console.log('  (Using as pose reference for remaining factions)\n');
  }
}

console.log('\nDone! Check http://localhost:3000/gallery');
