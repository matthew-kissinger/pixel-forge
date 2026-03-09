/**
 * Generate UI icons from the UI_ICON_MANIFEST.md using Gemini.
 *
 * Workflow:
 *   1. "sheet" - Generate a style reference sheet (icon "T-pose") showing
 *      6 sample icons in a grid. This locks the visual language: line weight,
 *      fill, outline, shading, color palette.
 *   2. "seed" - Generate 1 seed icon per category using the style sheet as ref.
 *      Review seeds in gallery before proceeding.
 *   3. "batch" - Generate remaining icons using style sheet + category seed as refs.
 *   4. "run" - Full pass (seed + batch, assumes style sheet exists).
 *
 * Usage:
 *   bun scripts/gen-ui-icons.ts sheet             # Generate style reference sheet
 *   bun scripts/gen-ui-icons.ts seed              # Seed all categories
 *   bun scripts/gen-ui-icons.ts seed weapons      # Seed one category
 *   bun scripts/gen-ui-icons.ts batch             # Batch all categories
 *   bun scripts/gen-ui-icons.ts batch weapons     # Batch one category
 *   bun scripts/gen-ui-icons.ts run               # Full run
 *   bun scripts/gen-ui-icons.ts list              # Status
 *   bun scripts/gen-ui-icons.ts redo weapons      # Delete + regenerate
 *
 * All icons skip if output exists (resume after rate limits).
 */

import sharp from 'sharp';
import { existsSync, readFileSync, unlinkSync } from 'fs';
import { mkdirSync } from 'fs';

const SERVER = 'http://localhost:3000';
const OUT_DIR = './war-assets/ui/icons';
const SHEET_PATH = `${OUT_DIR}/style-sheet.png`;
const SHEET_RAW_PATH = `${OUT_DIR}/style-sheet_raw.png`;

mkdirSync(OUT_DIR, { recursive: true });

// ---------------------------------------------------------------------------
// Icon library style definition
// Appended to EVERY prompt for baseline consistency.
// ---------------------------------------------------------------------------

const ICON_LIBRARY_STYLE = [
  // Visual identity
  'pixel art military HUD icon',
  'solid white filled silhouette',
  'completely filled with white',
  'no outlines',
  'no black lines',
  'no internal detail',
  'no shading',
  'flat solid white shape only',
  'hard crisp pixel edges',
  'no anti-aliasing',
  'no gradients',
  'no soft edges',
  'no blur',
  'no drop shadows',
  'no glow effects',
  // Composition
  'centered in frame with padding',
  'single icon only',
  'no background objects',
  'no text',
  'no labels',
  'no words',
  'no numbers',
  // Background - magenta for clean chroma key (no overlap with white icons)
  'on solid flat magenta #FF00FF background',
  'entire background is uniform flat magenta #FF00FF',
  'no background patterns',
  'no background gradients',
].join(', ');

// Emblem variant - colored fills with thick black outline on blue bg.
// Blue bg chosen because no faction emblem contains blue.
// Thick black outline gives BiRefNet a hard edge to cut on.
const EMBLEM_LIBRARY_STYLE = [
  'pixel art military faction emblem icon',
  'bold flat solid colors',
  'thick 3-pixel black outline around the entire outer edge of the emblem',
  'no internal shading or gradients',
  'hard crisp pixel edges',
  'no anti-aliasing',
  'no soft edges',
  'no blur',
  'no drop shadows',
  'no glow effects',
  'centered in frame with padding',
  'single emblem only',
  'no background objects',
  'no text',
  'no labels',
  'no words',
  // Blue bg - no faction colors are blue
  'on solid flat blue #0000FF background',
  'entire background is uniform flat blue #0000FF',
  'no background patterns',
  'no background gradients',
].join(', ');

// Reference prompt - prepended when using style sheet or seed as reference
const REF_PROMPT = 'Generate this icon matching the exact same visual style as the reference image. Use the same line weight, outline thickness, fill style, and level of detail. ';

// ---------------------------------------------------------------------------
// Style sheet prompt - the "T-pose" for the icon library
// ---------------------------------------------------------------------------

// The style sheet is a single complex abstract shape that defines the icon style.
// Solid white filled, no outlines, no internal detail - just a clean white silhouette.
const STYLE_SHEET_PROMPT = [
  'A single complex abstract heraldic shield shape centered on a solid magenta #FF00FF background.',
  'The shield has a pointed bottom and curved top edges with angular notches on the sides.',
  'The entire shape is filled with solid flat white.',
  'No outlines, no black lines, no borders, no strokes.',
  'No internal detail, no internal lines, no shading, no gradients.',
  'Just a pure solid white filled silhouette shape.',
  'Hard crisp pixel edges where the white shape meets the magenta background.',
  'No anti-aliasing, no blur, no glow, no drop shadows.',
  'No text, no labels, no numbers.',
  'Pixel art style with visible individual square pixels.',
  'Entire background is flat uniform solid magenta #FF00FF.',
].join(' ');

// ---------------------------------------------------------------------------
// Icon definitions
// ---------------------------------------------------------------------------

interface IconDef {
  name: string;
  desc: string;
}

interface Category {
  id: string;
  label: string;
  type: 'mono' | 'emblem';
  icons: IconDef[];
}

const CATEGORIES: Category[] = [
  {
    id: 'weapons',
    label: '1. Weapon Icons (24x24)',
    type: 'mono',
    icons: [
      { name: 'icon-rifle', desc: 'M16 assault rifle facing right, side profile silhouette, barrel pointing right, stock on left, distinctive carry handle bump on top' },
      { name: 'icon-shotgun', desc: 'pump-action shotgun facing right, side profile silhouette, barrel pointing right, pump grip visible under barrel' },
      { name: 'icon-smg', desc: 'compact submachine gun facing right, side profile silhouette, barrel pointing right, short with curved magazine below' },
      { name: 'icon-pistol', desc: 'semi-automatic pistol facing right, side profile silhouette, barrel pointing right, grip angled down' },
      { name: 'icon-lmg', desc: 'M60 machine gun facing right, side profile silhouette, barrel pointing right, bipod legs folded under, ammo belt hanging' },
      { name: 'icon-launcher', desc: 'M79 grenade launcher facing right, side profile silhouette, barrel pointing right, wide stubby barrel with pistol grip' },
      { name: 'icon-grenade', desc: 'round fragmentation grenade, circular body with rectangular spoon lever on top and small ring pull' },
      { name: 'icon-mortar', desc: 'mortar tube angled 45 degrees pointing upper-right, tube sitting on flat rectangular baseplate' },
      { name: 'icon-melee', desc: 'combat knife pointing right, blade on right side with crossguard and grip on left' },
      { name: 'icon-sandbag', desc: 'three sandbags stacked in pyramid, two on bottom one on top, lumpy rectangular bags' },
    ],
  },
  {
    id: 'heli-weapons',
    label: '2. Helicopter Weapon Icons (24x24)',
    type: 'mono',
    icons: [
      { name: 'icon-minigun', desc: 'rotary minigun facing right, multi-barrel gatling gun cluster, barrels pointing right' },
      { name: 'icon-rocket-pod', desc: 'rocket pod facing right, cylindrical tube cluster with multiple round openings visible on right end' },
      { name: 'icon-door-gun', desc: 'M60 machine gun on pintle mount facing right, gun barrel pointing right on a vertical post mount' },
    ],
  },
  {
    id: 'killfeed',
    label: '3. Kill Feed Icons (16x16)',
    type: 'mono',
    icons: [
      { name: 'icon-headshot', desc: 'human skull front view, round cranium with two eye sockets and jaw, bold chunky recognizable skull shape filling the frame' },
      { name: 'icon-kill-arrow', desc: 'bold right-pointing arrow, thick triangular arrowhead pointing right with short shaft' },
    ],
  },
  {
    id: 'instruments',
    label: '4. HUD Instrument Icons (20x20)',
    type: 'mono',
    icons: [
      { name: 'icon-altimeter', desc: 'altimeter gauge, bold upward-pointing vertical arrow inside a circle, altitude indicator filling the frame' },
      { name: 'icon-airspeed', desc: 'speedometer, bold right-pointing horizontal arrow inside a circle, speed indicator filling the frame' },
      { name: 'icon-compass-needle', desc: 'compass needle, tall narrow diamond shape pointing straight up, navigation indicator' },
      { name: 'icon-engine-health', desc: 'gear cog with six teeth around the outside and a checkmark in the center, engine health' },
      { name: 'icon-auto-hover', desc: 'small helicopter seen from front with horizontal arrows pointing left and right from each side, hover stabilize' },
      { name: 'icon-boost', desc: 'bold upward-pointing double chevron with flame shapes below, speed boost rocket' },
    ],
  },
  {
    id: 'touch',
    label: '5. Touch Control Icons (32x32)',
    type: 'mono',
    icons: [
      { name: 'icon-fire', desc: 'crosshair reticle, circle with vertical and horizontal cross lines meeting at center dot, targeting sight' },
      { name: 'icon-ads', desc: 'rifle scope view, thick circle with thin crosshairs inside and small center dot, aim down sights' },
      { name: 'icon-reload', desc: 'circular arrow, single curved arrow going clockwise forming almost a complete circle with arrowhead, reload symbol' },
      { name: 'icon-jump', desc: 'bold thick upward-pointing arrow, large triangular arrowhead pointing up, jump action' },
      { name: 'icon-interact', desc: 'open hand with fingers spread, palm facing viewer, five fingers visible, interaction gesture' },
      { name: 'icon-crouch', desc: 'person in crouching squat position, side profile facing right, knees bent low' },
      { name: 'icon-menu', desc: 'three thick horizontal bars stacked vertically with equal gaps between, hamburger menu' },
      { name: 'icon-grenade-throw', desc: 'round grenade shape with a curved dotted arc line above showing throwing trajectory path' },
    ],
  },
  {
    id: 'reticles',
    label: '6. Crosshair/Reticle Assets (60x60)',
    type: 'mono',
    icons: [
      { name: 'reticle-cobra-gun', desc: 'gun targeting pipper, thin circle with four short hash marks at 12 3 6 9 oclock positions and a center dot, helicopter gun crosshair' },
      { name: 'reticle-rocket', desc: 'rocket targeting reticle, larger thin circle with four short hash marks at 12 3 6 9 oclock positions, wider than gun pipper, rocket pod crosshair' },
    ],
  },
  {
    id: 'emblems',
    label: '7. Faction Emblems (32x32)',
    type: 'emblem',
    icons: [
      { name: 'emblem-us', desc: 'white five-pointed star centered on olive drab green circle, US Army insignia' },
      { name: 'emblem-arvn', desc: 'yellow five-pointed star on a shield with red and yellow vertical stripes, ARVN South Vietnam insignia' },
      { name: 'emblem-nva', desc: 'bright yellow five-pointed star centered on solid red circle, North Vietnamese Army insignia' },
      { name: 'emblem-vc', desc: 'red five-pointed star on dark green circle with thin laurel wreath border, Viet Cong insignia' },
    ],
  },
  {
    id: 'modes',
    label: '8. Game Mode Icons (24x24)',
    type: 'mono',
    icons: [
      { name: 'mode-tdm', desc: 'two rifles crossed in an X pattern, barrels pointing upper-left and upper-right, stocks at bottom, deathmatch' },
      { name: 'mode-conquest', desc: 'flag on a pole planted in a small mound, flag waving to the right, territory conquest' },
      { name: 'mode-frontier', desc: 'helicopter silhouette facing right above a wavy terrain horizon line, open frontier exploration' },
      { name: 'mode-ashau', desc: 'three mountain peaks with V-shaped valley between them, mountain terrain silhouette' },
    ],
  },
  {
    id: 'minimap',
    label: '9. Minimap/Map Icons (16x16)',
    type: 'mono',
    icons: [
      { name: 'map-helipad', desc: 'solid circle with bold letter H cut out of the center as negative space, helicopter landing pad marker' },
      { name: 'map-firebase', desc: 'solid pentagon shaped fort, five-sided base shape, military firebase' },
      { name: 'map-village', desc: 'two solid triangular roof shapes side by side touching at base, village huts from above' },
      { name: 'map-zone-flag', desc: 'solid flag shape on a thin pole, flag waving right, capture zone marker' },
      { name: 'map-player', desc: 'solid upward-pointing chevron arrowhead, wide V-shape pointing up, player direction' },
      { name: 'map-squad-member', desc: 'solid diamond shape rotated 45 degrees, small square on point, teammate marker dot' },
    ],
  },
  {
    id: 'onboarding',
    label: '10. Onboarding Hint Icons (48x48)',
    type: 'mono',
    icons: [
      { name: 'hint-wasd', desc: 'WASD keyboard keys in cluster arrangement, W on top row, A S D on bottom row' },
      { name: 'hint-mouse', desc: 'computer mouse with left button highlighted' },
      { name: 'hint-e-key', desc: 'single keyboard key cap with letter E' },
      { name: 'hint-swipe', desc: 'finger with curved motion line showing swipe gesture' },
      { name: 'hint-joystick', desc: 'virtual joystick, outer circle with smaller inner circle offset to one side' },
    ],
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
    // Magenta: high R + high B, low G
    if (r > 140 && b > 140 && g < 110 && Math.abs(r - b) < 70) {
      pixels[i + 3] = 0; cleaned++;
    }
  }
  if (cleaned > 0) console.log(`    Chroma magenta: ${cleaned} px`);
  return sharp(Buffer.from(pixels), { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
}

async function chromaCleanBlue(buf: Buffer): Promise<Buffer> {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const pixels = new Uint8Array(data.buffer);
  let cleaned = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
    // Blue: high B, low R and G
    if (b > 130 && r < 100 && g < 100) {
      pixels[i + 3] = 0; cleaned++;
    }
  }
  if (cleaned > 0) console.log(`    Chroma blue: ${cleaned} px`);
  return sharp(Buffer.from(pixels), { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
}

function loadBase64(path: string): string {
  const buf = readFileSync(path);
  return `data:image/png;base64,${buf.toString('base64')}`;
}

function iconPath(name: string): string { return `${OUT_DIR}/${name}.png`; }
function rawPath(name: string): string { return `${OUT_DIR}/${name}_raw.png`; }
function iconExists(name: string): boolean { return existsSync(iconPath(name)); }

async function sleep(ms: number) { return new Promise(resolve => setTimeout(resolve, ms)); }

/**
 * Generate a single icon. Returns the raw base64 (with bg) for use as reference.
 */
async function generateIcon(
  name: string,
  prompt: string,
  type: 'mono' | 'emblem',
  referenceImages?: string[],
): Promise<string | null> {
  if (iconExists(name)) {
    console.log(`  SKIP ${name} (exists)`);
    if (existsSync(rawPath(name))) return loadBase64(rawPath(name));
    return null;
  }

  const refCount = referenceImages?.length ?? 0;
  console.log(`  GEN  ${name}${refCount > 0 ? ` [${refCount} ref${refCount > 1 ? 's' : ''}]` : ''}`);

  const body: Record<string, unknown> = { prompt, aspectRatio: '1:1' };
  if (referenceImages?.length) {
    body.referenceImages = referenceImages;
  }

  let gen: Record<string, unknown> | undefined;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      gen = await apiPost('image/generate', body);
      break;
    } catch (e) {
      const msg = (e as Error).message;
      if (msg.includes('429') || msg.includes('rate limit') || msg.includes('400')) {
        console.log(`    Rate limited, waiting 15s (attempt ${attempt}/3)...`);
        await sleep(15000);
        if (attempt === 3) { console.error(`    FAILED after 3 retries`); return null; }
      } else {
        console.error(`    ERROR: ${msg}`);
        return null;
      }
    }
  }

  if (!gen?.image) { console.error(`    FAILED: no image`); return null; }

  const imageB64 = gen.image as string;
  const rawB64 = imageB64.replace(/^data:image\/\w+;base64,/, '');
  const rawBuf = Buffer.from(rawB64, 'base64');
  await Bun.write(rawPath(name), rawBuf);

  let clean: Buffer;
  if (type === 'mono') {
    // Direct magenta chroma key on raw image - no BiRefNet.
    // BiRefNet is too aggressive on solid white shapes (eats edges/fill).
    // Magenta bg is clean enough for direct chroma key.
    clean = await chromaCleanMagenta(rawBuf);
  } else {
    // Emblems have colored fills on blue bg - direct blue chroma key.
    // Skip BiRefNet - it's too aggressive and eats into the emblem colors.
    clean = await chromaCleanBlue(rawBuf);
  }

  await Bun.write(iconPath(name), clean);
  console.log(`    OK: ${(clean.length / 1024).toFixed(1)}KB`);

  return imageB64;
}

function buildPrompt(desc: string, type: 'mono' | 'emblem', withRef: boolean): string {
  const style = type === 'emblem' ? EMBLEM_LIBRARY_STYLE : ICON_LIBRARY_STYLE;
  const prefix = withRef ? REF_PROMPT : '';
  return `${prefix}${desc}, ${style}`;
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

function resolveCats(filter?: string): Category[] {
  if (!filter) return CATEGORIES;
  const cats = CATEGORIES.filter(c => c.id === filter);
  if (!cats.length) {
    console.error(`Unknown category: ${filter}`);
    console.log('Available:', CATEGORIES.map(c => c.id).join(', '));
    process.exit(1);
  }
  return cats;
}

/** Generate the icon style reference sheet - the "T-pose" for the whole library. */
async function runSheet() {
  console.log('=== Generating Icon Style Reference Sheet ===\n');

  if (existsSync(SHEET_PATH)) {
    console.log(`Style sheet already exists at ${SHEET_PATH}`);
    console.log('Delete it to regenerate: rm war-assets/ui/icons/style-sheet*.png');
    return;
  }

  const prompt = STYLE_SHEET_PROMPT;
  console.log('  Generating 2x3 grid style sheet...');

  let gen: Record<string, unknown> | undefined;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      gen = await apiPost('image/generate', { prompt, aspectRatio: '1:1' });
      break;
    } catch (e) {
      const msg = (e as Error).message;
      if (msg.includes('429') || msg.includes('rate limit') || msg.includes('400')) {
        console.log(`  Rate limited, waiting 15s (attempt ${attempt}/3)...`);
        await sleep(15000);
        if (attempt === 3) { console.error('  FAILED after 3 retries'); return; }
      } else {
        console.error(`  ERROR: ${msg}`); return;
      }
    }
  }

  if (!gen?.image) { console.error('  FAILED: no image'); return; }

  const rawB64 = (gen.image as string).replace(/^data:image\/\w+;base64,/, '');
  await Bun.write(SHEET_RAW_PATH, Buffer.from(rawB64, 'base64'));
  // Also save the sheet itself (no bg removal - we keep it as-is for reference)
  await Bun.write(SHEET_PATH, Buffer.from(rawB64, 'base64'));
  console.log('  OK! Style sheet saved.');
  console.log(`\n  Review at: ${SHEET_PATH}`);
  console.log('  If you like the style, run: bun scripts/gen-ui-icons.ts seed');
  console.log('  If not, delete and re-run: rm war-assets/ui/icons/style-sheet*.png');
}

/** Generate 1 seed icon per category using style sheet as ref. */
async function runSeed(filter?: string) {
  const cats = resolveCats(filter);

  // Load style sheet as reference
  let sheetRef: string | undefined;
  if (existsSync(SHEET_RAW_PATH)) {
    sheetRef = loadBase64(SHEET_RAW_PATH);
    console.log('Using style sheet as reference.\n');
  } else {
    console.log('WARNING: No style sheet found. Run "sheet" first for best consistency.');
    console.log('Generating without style reference.\n');
  }

  console.log(`=== SEED: ${cats.length} categories ===\n`);

  let ok = 0, fail = 0;
  for (const cat of cats) {
    const seed = cat.icons[0];
    console.log(`--- ${cat.label} ---`);

    const refs = sheetRef ? [sheetRef] : undefined;
    const prompt = buildPrompt(seed.desc, cat.type, !!sheetRef);
    await generateIcon(seed.name, prompt, cat.type, refs);

    if (iconExists(seed.name)) ok++; else fail++;
  }

  console.log(`\nSeeds: ${ok} OK, ${fail} failed`);
  console.log('Review at http://localhost:3000/gallery');
  console.log('Then run: bun scripts/gen-ui-icons.ts batch');
}

/** Generate remaining icons using style sheet + category seed as refs. */
async function runBatch(filter?: string) {
  const cats = resolveCats(filter);

  // Load style sheet
  let sheetRef: string | undefined;
  if (existsSync(SHEET_RAW_PATH)) {
    sheetRef = loadBase64(SHEET_RAW_PATH);
    console.log('Using style sheet as reference.\n');
  }

  const remaining = cats.reduce((n, c) => n + c.icons.length - 1, 0);
  console.log(`=== BATCH: ${remaining} remaining icons ===\n`);

  let ok = 0, fail = 0;
  const missing: string[] = [];

  for (const cat of cats) {
    const seed = cat.icons[0];
    console.log(`\n--- ${cat.label} (${cat.icons.length - 1} remaining) ---`);

    // Load seed raw as secondary ref
    let seedRef: string | undefined;
    if (existsSync(rawPath(seed.name))) {
      seedRef = loadBase64(rawPath(seed.name));
      console.log(`  Seed ref: ${seed.name}`);
    } else if (!iconExists(seed.name)) {
      console.log(`  No seed for ${cat.id} - run 'seed ${cat.id}' first`);
      missing.push(cat.id);
      continue;
    }

    // Build reference array: style sheet + seed (up to 2 refs)
    const refs: string[] = [];
    if (sheetRef) refs.push(sheetRef);
    if (seedRef) refs.push(seedRef);

    for (let i = 1; i < cat.icons.length; i++) {
      const icon = cat.icons[i];
      const prompt = buildPrompt(icon.desc, cat.type, refs.length > 0);
      await generateIcon(icon.name, prompt, cat.type, refs.length > 0 ? refs : undefined);

      if (iconExists(icon.name)) ok++; else fail++;
    }
  }

  console.log(`\nBatch: ${ok} OK, ${fail} failed`);
  if (missing.length) console.log(`Missing seeds: ${missing.join(', ')}`);
  console.log('Review at http://localhost:3000/gallery');
}

/** Full run: seed + batch. */
async function runFull(filter?: string) {
  await runSeed(filter);
  await runBatch(filter);
}

function runRedo(filter?: string) {
  if (!filter) {
    console.error('Usage: bun scripts/gen-ui-icons.ts redo <category>');
    console.log('Categories:', CATEGORIES.map(c => c.id).join(', '));
    process.exit(1);
  }
  const cat = CATEGORIES.find(c => c.id === filter);
  if (!cat) {
    console.error(`Unknown: ${filter}`);
    process.exit(1);
  }
  let n = 0;
  for (const icon of cat.icons) {
    for (const p of [iconPath(icon.name), rawPath(icon.name)]) {
      if (existsSync(p)) { unlinkSync(p); n++; }
    }
  }
  console.log(`Deleted ${n} files for "${cat.id}"`);
}

function runList() {
  console.log('=== UI Icon Status ===\n');
  const hasSheet = existsSync(SHEET_PATH);
  console.log(`Style sheet: ${hasSheet ? 'OK' : 'MISSING (run "sheet" first)'}\n`);

  let total = 0, existing = 0;
  for (const cat of CATEGORIES) {
    console.log(`${cat.label} [${cat.type}]`);
    for (const icon of cat.icons) {
      const exists = iconExists(icon.name);
      const hasRaw = existsSync(rawPath(icon.name));
      const tag = icon === cat.icons[0] ? ' [SEED]' : '';
      const raw = hasRaw ? '' : ' (no raw)';
      console.log(`  ${exists ? 'OK' : '--'}  ${icon.name}${tag}${raw}`);
      total++;
      if (exists) existing++;
    }
    console.log();
  }
  console.log(`Total: ${existing}/${total} icons`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const [cmd, filter] = process.argv.slice(2);

async function checkServer() {
  try {
    const h = await fetch(`${SERVER}/health`);
    if (!h.ok) throw new Error();
  } catch {
    console.error('Server not reachable. Start with: bun run dev:server');
    process.exit(1);
  }
}

if (!cmd || cmd === 'list') {
  runList();
} else if (cmd === 'sheet') {
  await checkServer();
  await runSheet();
} else if (cmd === 'seed') {
  await checkServer();
  await runSeed(filter);
} else if (cmd === 'batch') {
  await checkServer();
  await runBatch(filter);
} else if (cmd === 'run') {
  await checkServer();
  await runFull(filter);
} else if (cmd === 'redo') {
  runRedo(filter);
} else {
  console.log('Usage:');
  console.log('  bun scripts/gen-ui-icons.ts sheet             Generate style reference sheet');
  console.log('  bun scripts/gen-ui-icons.ts seed              Seed 1 icon per category');
  console.log('  bun scripts/gen-ui-icons.ts seed weapons      Seed one category');
  console.log('  bun scripts/gen-ui-icons.ts batch             Batch remaining with refs');
  console.log('  bun scripts/gen-ui-icons.ts batch weapons     Batch one category');
  console.log('  bun scripts/gen-ui-icons.ts run               Full run (seed + batch)');
  console.log('  bun scripts/gen-ui-icons.ts list              Show status');
  console.log('  bun scripts/gen-ui-icons.ts redo weapons      Delete + regenerate');
  console.log('\nCategories:', CATEGORIES.map(c => c.id).join(', '));
}
