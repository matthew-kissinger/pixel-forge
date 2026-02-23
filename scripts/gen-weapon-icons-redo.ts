/**
 * Redo weapon silhouette icons - clean pixel art, no text, no labels.
 * Regenerates icons that had text/clutter, keeps clean ones.
 */

import sharp from 'sharp';

const SERVER = 'http://localhost:3000';
const OUT_DIR = './war-assets/ui/icons';

const STYLE_SUFFIX = '32-bit pixel art sprite, high-res pixel art style, detailed with visible pixels, bright saturated colors, black pixel outlines, clean hard edges, no anti-aliasing, no blur, game asset on solid magenta #FF00FF background, entire background is flat solid magenta #FF00FF with no gradients';

// Icons that need redo (had text or clutter)
const icons = [
  { name: 'weapon-ak47', desc: 'AK-47 assault rifle with distinctive curved magazine' },
  { name: 'weapon-shotgun', desc: 'Ithaca 37 pump-action shotgun' },
  { name: 'weapon-m1911', desc: 'M1911 semi-automatic pistol handgun' },
  { name: 'weapon-grenade', desc: 'M67 round fragmentation hand grenade with spoon lever and pin ring' },
];

async function apiPost(endpoint: string, body: Record<string, unknown>) {
  const resp = await fetch(`${SERVER}/api/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!resp.ok) throw new Error(`API ${endpoint} failed (${resp.status})`);
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

console.log(`Redoing ${icons.length} weapon icons...\n`);

for (const icon of icons) {
  console.log(`=== ${icon.name} ===`);

  const prompt = `${icon.desc}, white weapon silhouette on flat background, right-facing side profile view, no text, no labels, no words, no numbers, clean simple weapon shape only, ${STYLE_SUFFIX}`;

  const gen = await apiPost('image/generate', { prompt, aspectRatio: '1:1' });
  if (!gen.image) { console.error('  FAILED'); continue; }

  const rawB64 = (gen.image as string).replace(/^data:image\/\w+;base64,/, '');
  const rawBuf = Buffer.from(rawB64, 'base64');
  await Bun.write(`${OUT_DIR}/${icon.name}_raw.png`, rawBuf);

  const bgResult = await apiPost('image/remove-bg', { image: gen.image });
  if (!bgResult.image) { console.error('  BiRefNet failed'); continue; }

  const bgB64 = (bgResult.image as string).replace(/^data:image\/\w+;base64,/, '');
  const clean = await chromaCleanMagenta(Buffer.from(bgB64, 'base64'));
  await Bun.write(`${OUT_DIR}/${icon.name}.png`, clean);
  console.log(`  Done: ${(clean.length / 1024).toFixed(0)}KB`);
}

console.log('\nDone!');
