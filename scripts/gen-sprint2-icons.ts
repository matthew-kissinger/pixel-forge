/**
 * Generate Sprint 2 icons:
 * - 8 Equipment icons (11.6)
 * - 9 Vehicle silhouette icons (11.7)
 * - 9 Vehicle top-down minimap icons (11.8)
 * - 4 Faction insignia (11.12)
 * - 1 Compass rose (11.14)
 *
 * All white on blue bg for clean separation.
 */

import sharp from 'sharp';

const SERVER = 'http://localhost:3000';
const OUT_DIR = './war-assets/ui/icons';

const ICON_STYLE = '32-bit pixel art icon, bold white geometric shape, simple clean silhouette, thick pixel outlines, minimal detail, readable at small size, game HUD icon, no text, no labels, no words, no numbers, game asset on solid blue #0000FF background, entire background is flat solid blue #0000FF with no gradients';

// Faction insignia use colored fills, not white - use magenta bg
const INSIGNIA_STYLE = '32-bit pixel art icon, bold clean emblem, thick pixel outlines, minimal detail, readable at small size, game faction icon, no text, no labels, no words, game asset on solid magenta #FF00FF background, entire background is flat solid magenta #FF00FF with no gradients';

const EQUIPMENT_ICONS = [
  { name: 'equip-sandbag', desc: 'white sandbag stack icon, three stacked bags' },
  { name: 'equip-claymore', desc: 'white M18 Claymore mine icon, curved rectangular shape with two prongs on top' },
  { name: 'equip-medkit', desc: 'white first aid medical kit icon, rectangular box with a cross symbol on front' },
  { name: 'equip-binoculars', desc: 'white binoculars icon, two connected circular lenses viewed from front' },
  { name: 'equip-radio', desc: 'white PRC-25 military radio icon, rectangular box with antenna on top and handset' },
  { name: 'equip-ammo', desc: 'white ammo crate icon, small rectangular box with latch, ammunition supply' },
  { name: 'equip-wire', desc: 'white coiled barbed wire icon, spiral loop of razor wire' },
  { name: 'equip-flare', desc: 'white flare gun icon, pistol-shaped with wide muzzle barrel, signal flare launcher' },
];

const VEHICLE_SIDE_ICONS = [
  { name: 'vehicle-huey', desc: 'white UH-1 Huey helicopter silhouette, side profile, landing skids visible' },
  { name: 'vehicle-cobra', desc: 'white AH-1 Cobra attack helicopter silhouette, side profile, narrow body with stub wings' },
  { name: 'vehicle-spooky', desc: 'white AC-47 Spooky gunship silhouette, side profile, twin-engine propeller plane' },
  { name: 'vehicle-phantom', desc: 'white F-4 Phantom jet fighter silhouette, side profile, twin engines and upturned wingtips' },
  { name: 'vehicle-jeep', desc: 'white M151 military jeep silhouette, side profile, open top with gun mount' },
  { name: 'vehicle-apc', desc: 'white M113 APC armored personnel carrier silhouette, side profile, tracked vehicle with cupola' },
  { name: 'vehicle-tank', desc: 'white M48 Patton tank silhouette, side profile, main gun turret and tracks' },
  { name: 'vehicle-sampan', desc: 'white Vietnamese sampan boat silhouette, side profile, flat-bottomed with canopy' },
  { name: 'vehicle-pbr', desc: 'white PBR Mark II patrol boat silhouette, side profile, twin gun mounts' },
];

const VEHICLE_TOPDOWN_ICONS = [
  { name: 'map-huey', desc: 'white UH-1 Huey helicopter seen from directly above, top-down view, rotor disc circle with fuselage cross shape' },
  { name: 'map-cobra', desc: 'white AH-1 Cobra helicopter top-down view, narrow fuselage with stub wings and rotor disc' },
  { name: 'map-spooky', desc: 'white AC-47 twin-engine plane top-down view, wings and twin props visible' },
  { name: 'map-phantom', desc: 'white F-4 Phantom jet top-down view, delta wings and twin tail' },
  { name: 'map-jeep', desc: 'white military jeep top-down view, rectangular outline with four wheels visible' },
  { name: 'map-apc', desc: 'white M113 APC top-down view, rectangular box with tracks on sides' },
  { name: 'map-tank', desc: 'white tank top-down view, rectangular hull with turret circle and gun barrel pointing up' },
  { name: 'map-sampan', desc: 'white sampan boat top-down view, elongated oval shape' },
  { name: 'map-pbr', desc: 'white patrol boat top-down view, boat shape with gun positions fore and aft' },
];

const FACTION_INSIGNIA = [
  { name: 'faction-us', desc: 'white five-pointed star on olive drab green circle, US Army insignia emblem' },
  { name: 'faction-nva', desc: 'bright yellow star on red circle, North Vietnamese Army NVA insignia' },
  { name: 'faction-arvn', desc: 'yellow star on striped shield with red and blue vertical stripes, ARVN South Vietnam insignia' },
  { name: 'faction-vc', desc: 'red star on dark circle with small laurel wreath border, Viet Cong insignia' },
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
    if (b > 150 && r < 100 && g < 100) { pixels[i + 3] = 0; cleaned++; }
  }
  if (cleaned > 0) console.log(`    Chroma blue: ${cleaned} px`);
  return sharp(Buffer.from(pixels), { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
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
  if (cleaned > 0) console.log(`    Chroma magenta: ${cleaned} px`);
  return sharp(Buffer.from(pixels), { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
}

async function generateIcon(name: string, desc: string, style: string, cleanFn: (buf: Buffer) => Promise<Buffer>) {
  console.log(`--- ${name} ---`);
  const prompt = `${desc}, ${style}`;
  const gen = await apiPost('image/generate', { prompt, aspectRatio: '1:1' });
  if (!gen.image) { console.error('  FAILED'); return; }

  const rawB64 = (gen.image as string).replace(/^data:image\/\w+;base64,/, '');
  await Bun.write(`${OUT_DIR}/${name}_raw.png`, Buffer.from(rawB64, 'base64'));

  const bgResult = await apiPost('image/remove-bg', { image: gen.image });
  if (!bgResult.image) { console.error('  BiRefNet failed'); return; }

  const bgB64 = (bgResult.image as string).replace(/^data:image\/\w+;base64,/, '');
  const clean = await cleanFn(Buffer.from(bgB64, 'base64'));
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

// Equipment icons
console.log(`\n=== Equipment Icons (${EQUIPMENT_ICONS.length}) ===\n`);
for (const icon of EQUIPMENT_ICONS) {
  await generateIcon(icon.name, icon.desc, ICON_STYLE, chromaCleanBlue);
}

// Vehicle side silhouettes
console.log(`\n=== Vehicle Side Icons (${VEHICLE_SIDE_ICONS.length}) ===\n`);
for (const icon of VEHICLE_SIDE_ICONS) {
  await generateIcon(icon.name, icon.desc, ICON_STYLE, chromaCleanBlue);
}

// Vehicle top-down minimap
console.log(`\n=== Vehicle Top-Down Icons (${VEHICLE_TOPDOWN_ICONS.length}) ===\n`);
for (const icon of VEHICLE_TOPDOWN_ICONS) {
  await generateIcon(icon.name, icon.desc, ICON_STYLE, chromaCleanBlue);
}

// Faction insignia (colored, magenta bg)
console.log(`\n=== Faction Insignia (${FACTION_INSIGNIA.length}) ===\n`);
for (const icon of FACTION_INSIGNIA) {
  await generateIcon(icon.name, icon.desc, INSIGNIA_STYLE, chromaCleanMagenta);
}

// Compass rose
console.log('\n=== Compass Rose ===\n');
await generateIcon(
  'compass-rose',
  'military compass rose with N S E W cardinal directions marked, tick marks around edge, green-tinted military navigation style, circular compass design',
  ICON_STYLE,
  chromaCleanBlue,
);

console.log('\nDone! Check http://localhost:3000/gallery');
