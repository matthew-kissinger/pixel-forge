/**
 * Redo squad command icons with proper aesthetic coherence.
 *
 * Strategy: Simple white geometric symbols on magenta, matching the weapon icon style.
 * All icons use same visual language: bold white shapes, minimal detail, readable at 32x32.
 * Use blue #0000FF background instead of magenta since icons are white - better BiRefNet separation.
 */

import sharp from 'sharp';

const SERVER = 'http://localhost:3000';
const OUT_DIR = './war-assets/ui/icons';

const STYLE = '32-bit pixel art icon, bold white geometric shape, simple clean military symbol, thick pixel outlines, minimal detail, readable at small size, game HUD icon, no text, no labels, no words, no numbers, game asset on solid blue #0000FF background, entire background is flat solid blue #0000FF with no gradients';

const ICONS = [
  { name: 'cmd-follow', desc: 'white forward arrow with small person figure walking behind it, follow command' },
  { name: 'cmd-hold', desc: 'white raised open hand palm facing forward, stop/hold position command' },
  { name: 'cmd-assault', desc: 'white bold chevron arrow pointing right with a lightning bolt, aggressive attack command' },
  { name: 'cmd-defend', desc: 'white shield shape with a cross inside, defensive position command' },
  { name: 'cmd-retreat', desc: 'white backward-pointing arrow curving away, retreat withdrawal command' },
  { name: 'cmd-wedge', desc: 'white V-shape chevron pointing right with three dots in wedge formation behind it, tactical formation' },
  { name: 'cmd-line', desc: 'white horizontal line with three evenly spaced dots along it, line formation command' },
  { name: 'cmd-flank-left', desc: 'white curved arrow sweeping up and to the left in a hook shape, flanking maneuver' },
  { name: 'cmd-flank-right', desc: 'white curved arrow sweeping up and to the right in a hook shape, flanking maneuver' },
  { name: 'cmd-regroup', desc: 'four white arrows pointing inward toward a center circle from four corners, rally regroup command' },
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

async function chromaCleanBlue(buf: Buffer): Promise<Buffer> {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const pixels = new Uint8Array(data.buffer);
  let cleaned = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
    // Blue background: high blue, low red and green
    if (b > 150 && r < 100 && g < 100) {
      pixels[i + 3] = 0;
      cleaned++;
    }
  }
  if (cleaned > 0) console.log(`    Chroma blue: ${cleaned} px`);
  return sharp(Buffer.from(pixels), { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
}

// Check server
try {
  const health = await fetch(`${SERVER}/health`);
  if (!health.ok) throw new Error('not ok');
} catch {
  console.error('Server not reachable. Start with: bun run dev:server');
  process.exit(1);
}

console.log(`=== Generating ${ICONS.length} Command Icons (v2) ===\n`);

for (const icon of ICONS) {
  console.log(`--- ${icon.name} ---`);

  const prompt = `${icon.desc}, ${STYLE}`;

  const gen = await apiPost('image/generate', { prompt, aspectRatio: '1:1' });
  if (!gen.image) { console.error('  FAILED'); continue; }

  const rawB64 = (gen.image as string).replace(/^data:image\/\w+;base64,/, '');
  await Bun.write(`${OUT_DIR}/${icon.name}_raw.png`, Buffer.from(rawB64, 'base64'));

  // BiRefNet bg removal
  const bgResult = await apiPost('image/remove-bg', { image: gen.image });
  if (!bgResult.image) { console.error('  BiRefNet failed'); continue; }

  const bgB64 = (bgResult.image as string).replace(/^data:image\/\w+;base64,/, '');
  const clean = await chromaCleanBlue(Buffer.from(bgB64, 'base64'));
  await Bun.write(`${OUT_DIR}/${icon.name}.png`, clean);
  console.log(`  Done: ${(clean.length / 1024).toFixed(0)}KB`);
}

console.log('\nDone! Check http://localhost:3000/gallery');
