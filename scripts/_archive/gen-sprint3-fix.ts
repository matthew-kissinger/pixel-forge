/**
 * Fix Sprint 3 icons:
 * - rank-cpt (failed on rate limit)
 * - marker-waypoint (redo)
 * - marker-objective (redo)
 */

import sharp from 'sharp';

const SERVER = 'http://localhost:3000';
const OUT_DIR = './war-assets/ui/icons';

const ICON_STYLE = '32-bit pixel art icon, bold white geometric shape, simple clean silhouette, thick pixel outlines, minimal detail, readable at small size, game HUD icon, no text, no labels, no words, no numbers, game asset on solid blue #0000FF background, entire background is flat solid blue #0000FF with no gradients';

const CHEVRON_STYLE = '32-bit pixel art icon, bold gold yellow chevron stripes on dark olive background circle, thick pixel outlines, minimal detail, readable at small size, military rank insignia, no text, no labels, no words, game asset on solid bright green #00FF00 background, entire background is flat solid bright green #00FF00 with no gradients';

const ICONS = [
  // rank-cpt already generated, removed from list
  {
    name: 'marker-waypoint',
    desc: 'white solid diamond shape, simple bold geometric diamond, waypoint navigation marker',
    style: ICON_STYLE,
    useBiRefNet: true,
    cleanType: 'blue' as const,
  },
  {
    name: 'marker-objective',
    desc: 'white solid five-pointed star shape, bold military objective star marker',
    style: ICON_STYLE,
    useBiRefNet: true,
    cleanType: 'blue' as const,
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
    console.log(`    Attempt ${attempt}/${retries} failed (${resp.status})`);
    if (attempt < retries) await new Promise(r => setTimeout(r, 15000));
    else {
      const err = await resp.json().catch(() => ({ error: resp.statusText }));
      throw new Error(`API ${endpoint} failed: ${JSON.stringify(err)}`);
    }
  }
  throw new Error('unreachable');
}

async function chromaCleanBlue(buf: Buffer): Promise<Buffer> {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const pixels = new Uint8Array(data.buffer);
  let cleaned = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
    if (b > 150 && r < 100 && g < 100) { pixels[i + 3] = 0; cleaned++; }
  }
  if (cleaned > 0) console.log(`    Chroma blue: ${cleaned} px`);
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

try {
  const health = await fetch(`${SERVER}/health`);
  if (!health.ok) throw new Error('not ok');
} catch {
  console.error('Server not reachable');
  process.exit(1);
}

console.log('=== Sprint 3 Icon Fixes ===\n');

for (const icon of ICONS) {
  console.log(`--- ${icon.name} ---`);
  const prompt = `${icon.desc}, ${icon.style}`;
  const gen = await apiPost('image/generate', { prompt, aspectRatio: '1:1' });
  if (!gen.image) { console.error('  FAILED'); continue; }

  const rawB64 = (gen.image as string).replace(/^data:image\/\w+;base64,/, '');
  await Bun.write(`${OUT_DIR}/${icon.name}_raw.png`, Buffer.from(rawB64, 'base64'));

  let imgToClean: string;
  if (icon.useBiRefNet) {
    const bgResult = await apiPost('image/remove-bg', { image: gen.image });
    if (!bgResult.image) { console.error('  BiRefNet failed'); continue; }
    imgToClean = (bgResult.image as string).replace(/^data:image\/\w+;base64,/, '');
  } else {
    imgToClean = rawB64;
  }

  const cleanFn = icon.cleanType === 'green' ? chromaCleanGreen : chromaCleanBlue;
  const clean = await cleanFn(Buffer.from(imgToClean, 'base64'));
  await Bun.write(`${OUT_DIR}/${icon.name}.png`, clean);
  console.log(`  Done: ${(clean.length / 1024).toFixed(0)}KB`);
}

console.log('\nDone!');
