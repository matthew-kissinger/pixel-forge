/**
 * Redo faction insignia icons WITHOUT BiRefNet.
 * These are colored emblems - BiRefNet destroys them.
 * Use bright green #00FF00 bg (no icon uses bright green) + simple green chroma key.
 */

import sharp from 'sharp';

const SERVER = 'http://localhost:3000';
const OUT_DIR = './war-assets/ui/icons';

const STYLE = '32-bit pixel art icon, bold clean emblem, thick pixel outlines, minimal detail, readable at small size, game faction icon, no text, no labels, no words, game asset on solid bright green #00FF00 background, entire background is flat solid bright green #00FF00 with no gradients';

const ICONS = [
  { name: 'faction-us', desc: 'white five-pointed star centered on olive drab dark green circle, US Army military insignia emblem' },
  { name: 'faction-nva', desc: 'bright yellow five-pointed star centered on solid red circle, North Vietnamese Army NVA military insignia' },
  { name: 'faction-arvn', desc: 'yellow five-pointed star on a shield shape with red and yellow vertical stripes, South Vietnam ARVN military insignia' },
  { name: 'faction-vc', desc: 'red five-pointed star centered on dark brown circle with thin gold laurel wreath border, Viet Cong guerrilla insignia' },
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

async function chromaCleanGreen(buf: Buffer): Promise<Buffer> {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const pixels = new Uint8Array(data.buffer);
  let cleaned = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
    // Bright green bg: high green, low red and blue
    if (g > 180 && r < 100 && b < 100) {
      pixels[i + 3] = 0;
      cleaned++;
    }
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

console.log('=== Faction Icons (no BiRefNet, green chroma key) ===\n');

for (const icon of ICONS) {
  console.log(`--- ${icon.name} ---`);

  const prompt = `${icon.desc}, ${STYLE}`;
  const gen = await apiPost('image/generate', { prompt, aspectRatio: '1:1' });
  if (!gen.image) { console.error('  FAILED'); continue; }

  const rawB64 = (gen.image as string).replace(/^data:image\/\w+;base64,/, '');
  await Bun.write(`${OUT_DIR}/${icon.name}_raw.png`, Buffer.from(rawB64, 'base64'));

  // Skip BiRefNet - just do green chroma key directly on raw image
  const clean = await chromaCleanGreen(Buffer.from(rawB64, 'base64'));
  await Bun.write(`${OUT_DIR}/${icon.name}.png`, clean);
  console.log(`  Done: ${(clean.length / 1024).toFixed(0)}KB`);
}

console.log('\nDone!');
