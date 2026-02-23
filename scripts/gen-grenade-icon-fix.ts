/**
 * Redo grenade icon - use blue bg for better separation since it's a white silhouette.
 */

import sharp from 'sharp';

const SERVER = 'http://localhost:3000';
const OUT_DIR = './war-assets/ui/icons';

const STYLE = '32-bit pixel art icon, bold white geometric shape, simple clean silhouette, thick pixel outlines, minimal detail, readable at small size, game HUD icon, no text, no labels, no words, no numbers, game asset on solid blue #0000FF background, entire background is flat solid blue #0000FF with no gradients';

async function apiPost(endpoint: string, body: Record<string, unknown>) {
  const resp = await fetch(`${SERVER}/api/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!resp.ok) throw new Error(`API ${endpoint} failed (${resp.status})`);
  return resp.json() as Promise<Record<string, unknown>>;
}

async function chromaCleanBlue(buf: Buffer): Promise<Buffer> {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const pixels = new Uint8Array(data.buffer);
  let cleaned = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
    if (b > 150 && r < 100 && g < 100) {
      pixels[i + 3] = 0;
      cleaned++;
    }
  }
  if (cleaned > 0) console.log(`    Chroma blue: ${cleaned} px`);
  return sharp(Buffer.from(pixels), { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
}

try {
  const health = await fetch(`${SERVER}/health`);
  if (!health.ok) throw new Error('not ok');
} catch {
  console.error('Server not reachable');
  process.exit(1);
}

console.log('=== Redoing grenade icon (blue bg) ===\n');

const prompt = `M67 fragmentation hand grenade silhouette, round body with spoon lever and pin ring on top, simple white grenade shape, ${STYLE}`;

const gen = await apiPost('image/generate', { prompt, aspectRatio: '1:1' });
if (!gen.image) { console.error('FAILED'); process.exit(1); }

const rawB64 = (gen.image as string).replace(/^data:image\/\w+;base64,/, '');
await Bun.write(`${OUT_DIR}/weapon-grenade_raw.png`, Buffer.from(rawB64, 'base64'));

const bgResult = await apiPost('image/remove-bg', { image: gen.image });
if (!bgResult.image) { console.error('BiRefNet failed'); process.exit(1); }

const bgB64 = (bgResult.image as string).replace(/^data:image\/\w+;base64,/, '');
const clean = await chromaCleanBlue(Buffer.from(bgB64, 'base64'));
await Bun.write(`${OUT_DIR}/weapon-grenade.png`, clean);
console.log(`  Done: ${(clean.length / 1024).toFixed(0)}KB`);
