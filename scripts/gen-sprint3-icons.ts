/**
 * Generate Sprint 3 icons:
 * - 8 Map marker icons (11.10)
 * - 5 Air support calldown icons (11.11)
 * - 4 Crosshair/reticle set (11.15)
 * - 8 Rank chevrons (11.13)
 *
 * Map markers + air support + crosshairs: white on blue #0000FF
 * Rank chevrons: gold/yellow on green #00FF00 (no BiRefNet, green chroma key)
 */

import sharp from 'sharp';

const SERVER = 'http://localhost:3000';
const OUT_DIR = './war-assets/ui/icons';

const ICON_STYLE = '32-bit pixel art icon, bold white geometric shape, simple clean silhouette, thick pixel outlines, minimal detail, readable at small size, game HUD icon, no text, no labels, no words, no numbers, game asset on solid blue #0000FF background, entire background is flat solid blue #0000FF with no gradients';

const CHEVRON_STYLE = '32-bit pixel art icon, bold gold yellow chevron stripes on dark olive background circle, thick pixel outlines, minimal detail, readable at small size, military rank insignia, no text, no labels, no words, game asset on solid bright green #00FF00 background, entire background is flat solid bright green #00FF00 with no gradients';

const MAP_MARKERS = [
  { name: 'marker-waypoint', desc: 'white diamond shape waypoint marker, simple geometric diamond outline' },
  { name: 'marker-rally', desc: 'white flag on short pole, rally point marker, simple flag shape' },
  { name: 'marker-lz', desc: 'white circle with letter H inside, landing zone helicopter pad marker' },
  { name: 'marker-objective', desc: 'white five-pointed star, objective marker, bold star shape' },
  { name: 'marker-enemy', desc: 'white downward-pointing triangle with exclamation mark, enemy contact warning marker' },
  { name: 'marker-friendly', desc: 'white rectangle with rounded corners, friendly position marker, NATO unit symbol' },
  { name: 'marker-airsupport', desc: 'white crosshair circle with small wing shapes on sides, air support target designation' },
  { name: 'marker-artillery', desc: 'white crosshair circle with radiating burst lines, artillery target designation' },
];

const AIR_SUPPORT = [
  { name: 'air-insertion', desc: 'white helicopter silhouette with downward arrow below it, helicopter troop insertion icon' },
  { name: 'air-gunrun', desc: 'white helicopter silhouette with three diagonal lines below representing bullets, gunship attack run' },
  { name: 'air-napalm', desc: 'white airplane silhouette with wavy flame trail behind, napalm strike icon' },
  { name: 'air-bombrun', desc: 'white airplane silhouette with three small circles falling below, bombing run icon' },
  { name: 'air-medevac', desc: 'white helicopter silhouette with medical cross symbol on body, medevac evacuation icon' },
];

const CROSSHAIRS = [
  { name: 'reticle-rifle', desc: 'white thin crosshair with small center gap, simple rifle iron sight reticle, four thin lines meeting near center' },
  { name: 'reticle-shotgun', desc: 'white circle outline with small cross in center, shotgun spread reticle, ring and crosshair' },
  { name: 'reticle-sniper', desc: 'white mil-dot sniper scope reticle, thin crosshair lines with small dots along horizontal and vertical lines, scope circle border' },
  { name: 'reticle-machinegun', desc: 'white thick bold crosshair with wider spread, machine gun reticle, thick lines with large center gap' },
];

const RANK_CHEVRONS = [
  { name: 'rank-pfc', desc: 'single gold upward-pointing V chevron stripe on dark olive circle, PFC Private First Class' },
  { name: 'rank-cpl', desc: 'two gold upward-pointing V chevron stripes stacked on dark olive circle, CPL Corporal' },
  { name: 'rank-sgt', desc: 'three gold upward-pointing V chevron stripes stacked on dark olive circle, SGT Sergeant' },
  { name: 'rank-ssg', desc: 'three gold upward-pointing V chevron stripes with one curved rocker bar below on dark olive circle, SSG Staff Sergeant' },
  { name: 'rank-sfc', desc: 'three gold upward-pointing V chevron stripes with two curved rocker bars below on dark olive circle, SFC Sergeant First Class' },
  { name: 'rank-1sg', desc: 'three gold upward-pointing V chevron stripes with three curved rocker bars and diamond in center on dark olive circle, 1SG First Sergeant' },
  { name: 'rank-lt', desc: 'single gold rectangular bar on dark olive circle, LT Lieutenant rank insignia' },
  { name: 'rank-cpt', desc: 'two parallel gold rectangular bars on dark olive circle, CPT Captain rank insignia' },
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
    if (attempt < retries) await new Promise(r => setTimeout(r, 10000));
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

async function generateIcon(
  name: string,
  desc: string,
  style: string,
  useBiRefNet: boolean,
  cleanFn: (buf: Buffer) => Promise<Buffer>,
) {
  console.log(`--- ${name} ---`);
  const prompt = `${desc}, ${style}`;
  const gen = await apiPost('image/generate', { prompt, aspectRatio: '1:1' });
  if (!gen.image) { console.error('  FAILED'); return; }

  const rawB64 = (gen.image as string).replace(/^data:image\/\w+;base64,/, '');
  await Bun.write(`${OUT_DIR}/${name}_raw.png`, Buffer.from(rawB64, 'base64'));

  let imgToClean: string;
  if (useBiRefNet) {
    const bgResult = await apiPost('image/remove-bg', { image: gen.image });
    if (!bgResult.image) { console.error('  BiRefNet failed'); return; }
    imgToClean = (bgResult.image as string).replace(/^data:image\/\w+;base64,/, '');
  } else {
    imgToClean = rawB64;
  }

  const clean = await cleanFn(Buffer.from(imgToClean, 'base64'));
  await Bun.write(`${OUT_DIR}/${name}.png`, clean);
  console.log(`  Done: ${(clean.length / 1024).toFixed(0)}KB`);
}

// Check server
try {
  const health = await fetch(`${SERVER}/health`);
  if (!health.ok) throw new Error('not ok');
} catch {
  console.error('Server not reachable. Start with: bun run dev:server');
  process.exit(1);
}

// Map markers (white on blue, BiRefNet)
console.log(`\n=== Map Marker Icons (${MAP_MARKERS.length}) ===\n`);
for (const icon of MAP_MARKERS) {
  await generateIcon(icon.name, icon.desc, ICON_STYLE, true, chromaCleanBlue);
}

// Air support (white on blue, BiRefNet)
console.log(`\n=== Air Support Icons (${AIR_SUPPORT.length}) ===\n`);
for (const icon of AIR_SUPPORT) {
  await generateIcon(icon.name, icon.desc, ICON_STYLE, true, chromaCleanBlue);
}

// Crosshairs (white on blue, BiRefNet)
console.log(`\n=== Crosshair Reticles (${CROSSHAIRS.length}) ===\n`);
for (const icon of CROSSHAIRS) {
  await generateIcon(icon.name, icon.desc, ICON_STYLE, true, chromaCleanBlue);
}

// Rank chevrons (gold on green, NO BiRefNet, green chroma key)
console.log(`\n=== Rank Chevrons (${RANK_CHEVRONS.length}) ===\n`);
for (const icon of RANK_CHEVRONS) {
  await generateIcon(icon.name, icon.desc, CHEVRON_STYLE, false, chromaCleanGreen);
}

console.log('\nDone! Check http://localhost:3000/gallery');
