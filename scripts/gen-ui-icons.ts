#!/usr/bin/env bun
/**
 * Generate UI icons (50 across 10 categories) using the icon pipeline.
 * Recipe — variant config (mono / colored), chroma key, prompt suffix,
 * and provider plumbing all live in @pixel-forge/core.
 *
 *   bun scripts/gen-ui-icons.ts sheet           # Generate style reference sheet
 *   bun scripts/gen-ui-icons.ts seed [cat]      # Seed 1 icon per (filtered) category
 *   bun scripts/gen-ui-icons.ts batch [cat]     # Batch remaining with refs
 *   bun scripts/gen-ui-icons.ts run [cat]       # seed + batch
 *   bun scripts/gen-ui-icons.ts list            # Status
 *   bun scripts/gen-ui-icons.ts redo <cat>      # Delete + leave for next run
 */

import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { image, providers } from '@pixel-forge/core';

const OUT_DIR = './war-assets/ui/icons';
const SHEET_PATH = join(OUT_DIR, 'style-sheet.png');

mkdirSync(OUT_DIR, { recursive: true });

// ---------------------------------------------------------------------------
// Style sheet prompt — the heraldic-shield "T-pose" for the icon library.
// Unlike per-icon prompts, this is fed *unstyled* (just the bare prompt).
// ---------------------------------------------------------------------------
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

const REF_PROMPT =
  'Generate this icon matching the exact same visual style as the reference image. Use the same line weight, outline thickness, fill style, and level of detail. ';

// ---------------------------------------------------------------------------
// Icon catalog — same shape the old script used. 10 categories, 50 icons.
// ---------------------------------------------------------------------------
interface IconDef { name: string; desc: string; }
interface Category { id: string; label: string; type: 'mono' | 'colored'; icons: IconDef[]; }

const CATEGORIES: Category[] = [
  { id: 'weapons', label: '1. Weapon Icons (24x24)', type: 'mono', icons: [
    { name: 'icon-rifle',    desc: 'M16 assault rifle facing right, side profile silhouette, barrel pointing right, stock on left, distinctive carry handle bump on top' },
    { name: 'icon-shotgun',  desc: 'pump-action shotgun facing right, side profile silhouette, barrel pointing right, pump grip visible under barrel' },
    { name: 'icon-smg',      desc: 'compact submachine gun facing right, side profile silhouette, barrel pointing right, short with curved magazine below' },
    { name: 'icon-pistol',   desc: 'semi-automatic pistol facing right, side profile silhouette, barrel pointing right, grip angled down' },
    { name: 'icon-lmg',      desc: 'M60 machine gun facing right, side profile silhouette, barrel pointing right, bipod legs folded under, ammo belt hanging' },
    { name: 'icon-launcher', desc: 'M79 grenade launcher facing right, side profile silhouette, barrel pointing right, wide stubby barrel with pistol grip' },
    { name: 'icon-grenade',  desc: 'round fragmentation grenade, circular body with rectangular spoon lever on top and small ring pull' },
    { name: 'icon-mortar',   desc: 'mortar tube angled 45 degrees pointing upper-right, tube sitting on flat rectangular baseplate' },
    { name: 'icon-melee',    desc: 'combat knife pointing right, blade on right side with crossguard and grip on left' },
    { name: 'icon-sandbag',  desc: 'three sandbags stacked in pyramid, two on bottom one on top, lumpy rectangular bags' },
  ]},
  { id: 'heli-weapons', label: '2. Helicopter Weapon Icons (24x24)', type: 'mono', icons: [
    { name: 'icon-minigun',     desc: 'rotary minigun facing right, multi-barrel gatling gun cluster, barrels pointing right' },
    { name: 'icon-rocket-pod',  desc: 'rocket pod facing right, cylindrical tube cluster with multiple round openings visible on right end' },
    { name: 'icon-door-gun',    desc: 'M60 machine gun on pintle mount facing right, gun barrel pointing right on a vertical post mount' },
  ]},
  { id: 'killfeed', label: '3. Kill Feed Icons (16x16)', type: 'mono', icons: [
    { name: 'icon-headshot',   desc: 'human skull front view, round cranium with two eye sockets and jaw, bold chunky recognizable skull shape filling the frame' },
    { name: 'icon-kill-arrow', desc: 'bold right-pointing arrow, thick triangular arrowhead pointing right with short shaft' },
  ]},
  { id: 'instruments', label: '4. HUD Instrument Icons (20x20)', type: 'mono', icons: [
    { name: 'icon-altimeter',      desc: 'altimeter gauge, bold upward-pointing vertical arrow inside a circle, altitude indicator filling the frame' },
    { name: 'icon-airspeed',       desc: 'speedometer, bold right-pointing horizontal arrow inside a circle, speed indicator filling the frame' },
    { name: 'icon-compass-needle', desc: 'compass needle, tall narrow diamond shape pointing straight up, navigation indicator' },
    { name: 'icon-engine-health',  desc: 'gear cog with six teeth around the outside and a checkmark in the center, engine health' },
    { name: 'icon-auto-hover',     desc: 'small helicopter seen from front with horizontal arrows pointing left and right from each side, hover stabilize' },
    { name: 'icon-boost',          desc: 'bold upward-pointing double chevron with flame shapes below, speed boost rocket' },
  ]},
  { id: 'touch', label: '5. Touch Control Icons (32x32)', type: 'mono', icons: [
    { name: 'icon-fire',           desc: 'crosshair reticle, circle with vertical and horizontal cross lines meeting at center dot, targeting sight' },
    { name: 'icon-ads',            desc: 'rifle scope view, thick circle with thin crosshairs inside and small center dot, aim down sights' },
    { name: 'icon-reload',         desc: 'circular arrow, single curved arrow going clockwise forming almost a complete circle with arrowhead, reload symbol' },
    { name: 'icon-jump',           desc: 'bold thick upward-pointing arrow, large triangular arrowhead pointing up, jump action' },
    { name: 'icon-interact',       desc: 'open hand with fingers spread, palm facing viewer, five fingers visible, interaction gesture' },
    { name: 'icon-crouch',         desc: 'person in crouching squat position, side profile facing right, knees bent low' },
    { name: 'icon-menu',           desc: 'three thick horizontal bars stacked vertically with equal gaps between, hamburger menu' },
    { name: 'icon-grenade-throw',  desc: 'round grenade shape with a curved dotted arc line above showing throwing trajectory path' },
  ]},
  { id: 'reticles', label: '6. Crosshair/Reticle Assets (60x60)', type: 'mono', icons: [
    { name: 'reticle-cobra-gun', desc: 'gun targeting pipper, thin circle with four short hash marks at 12 3 6 9 oclock positions and a center dot, helicopter gun crosshair' },
    { name: 'reticle-rocket',    desc: 'rocket targeting reticle, larger thin circle with four short hash marks at 12 3 6 9 oclock positions, wider than gun pipper, rocket pod crosshair' },
  ]},
  { id: 'emblems', label: '7. Faction Emblems (32x32)', type: 'colored', icons: [
    { name: 'emblem-us',   desc: 'white five-pointed star centered on olive drab green circle, US Army insignia' },
    { name: 'emblem-arvn', desc: 'yellow five-pointed star on a shield with red and yellow vertical stripes, ARVN South Vietnam insignia' },
    { name: 'emblem-nva',  desc: 'bright yellow five-pointed star centered on solid red circle, North Vietnamese Army insignia' },
    { name: 'emblem-vc',   desc: 'red five-pointed star on dark green circle with thin laurel wreath border, Viet Cong insignia' },
  ]},
  { id: 'modes', label: '8. Game Mode Icons (24x24)', type: 'mono', icons: [
    { name: 'mode-tdm',       desc: 'two rifles crossed in an X pattern, barrels pointing upper-left and upper-right, stocks at bottom, deathmatch' },
    { name: 'mode-conquest',  desc: 'flag on a pole planted in a small mound, flag waving to the right, territory conquest' },
    { name: 'mode-frontier',  desc: 'helicopter silhouette facing right above a wavy terrain horizon line, open frontier exploration' },
    { name: 'mode-ashau',     desc: 'three mountain peaks with V-shaped valley between them, mountain terrain silhouette' },
  ]},
  { id: 'minimap', label: '9. Minimap/Map Icons (16x16)', type: 'mono', icons: [
    { name: 'map-helipad',      desc: 'solid circle with bold letter H cut out of the center as negative space, helicopter landing pad marker' },
    { name: 'map-firebase',     desc: 'solid pentagon shaped fort, five-sided base shape, military firebase' },
    { name: 'map-village',      desc: 'two solid triangular roof shapes side by side touching at base, village huts from above' },
    { name: 'map-zone-flag',    desc: 'solid flag shape on a thin pole, flag waving right, capture zone marker' },
    { name: 'map-player',       desc: 'solid upward-pointing chevron arrowhead, wide V-shape pointing up, player direction' },
    { name: 'map-squad-member', desc: 'solid diamond shape rotated 45 degrees, small square on point, teammate marker dot' },
  ]},
  { id: 'onboarding', label: '10. Onboarding Hint Icons (48x48)', type: 'mono', icons: [
    { name: 'hint-wasd',     desc: 'WASD keyboard keys in cluster arrangement, W on top row, A S D on bottom row' },
    { name: 'hint-mouse',    desc: 'computer mouse with left button highlighted' },
    { name: 'hint-e-key',    desc: 'single keyboard key cap with letter E' },
    { name: 'hint-swipe',    desc: 'finger with curved motion line showing swipe gesture' },
    { name: 'hint-joystick', desc: 'virtual joystick, outer circle with smaller inner circle offset to one side' },
  ]},
];

// ---------------------------------------------------------------------------
// Pipeline + helpers
// ---------------------------------------------------------------------------
const imageProvider = providers.createGeminiProvider();
const iconPipeline = image.pipelines.createIconPipeline({ imageProvider });

const iconPath = (n: string) => join(OUT_DIR, `${n}.png`);
const rawPath = (n: string) => join(OUT_DIR, `${n}_raw.png`);

function readBuf(p: string): Buffer { return readFileSync(p); }

async function genOne(name: string, prompt: string, type: 'mono' | 'colored', refs?: Buffer[]) {
  if (existsSync(iconPath(name))) { console.log(`  SKIP ${name} (exists)`); return; }
  console.log(`  GEN  ${name}${refs?.length ? ` [${refs.length} ref]` : ''}`);
  const result = await iconPipeline.run({
    prompt,
    variant: type,
    ...(refs && refs.length > 0 ? { refs } : {}),
  });
  writeFileSync(iconPath(name), result.image);
  console.log(`    OK ${(result.image.length / 1024).toFixed(1)}KB`);
}

function buildPrompt(desc: string, withRef: boolean): string {
  return `${withRef ? REF_PROMPT : ''}${desc}`;
}

function resolveCats(filter?: string): Category[] {
  if (!filter) return CATEGORIES;
  const cats = CATEGORIES.filter((c) => c.id === filter);
  if (!cats.length) {
    console.error(`Unknown category: ${filter}. Available: ${CATEGORIES.map((c) => c.id).join(', ')}`);
    process.exit(1);
  }
  return cats;
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------
async function runSheet() {
  if (existsSync(SHEET_PATH)) {
    console.log(`Style sheet exists at ${SHEET_PATH}. Delete to regenerate.`);
    return;
  }
  console.log('Generating style sheet...');
  // Sheet skips the icon pipeline so we keep the magenta background — it's
  // fed back as a reference image to seed icons; preserving the bg gives
  // Gemini a stronger "this is what the canvas looks like" signal.
  const result = await imageProvider.generate({
    prompt: STYLE_SHEET_PROMPT,
    background: 'magenta',
  });
  writeFileSync(SHEET_PATH, result.image);
  console.log(`OK. Review ${SHEET_PATH}, then run "seed".`);
}

async function runSeed(filter?: string) {
  const cats = resolveCats(filter);
  const sheetRef = existsSync(SHEET_PATH) ? readBuf(SHEET_PATH) : undefined;
  if (!sheetRef) console.warn('No style sheet — generating without ref.');

  for (const cat of cats) {
    const seed = cat.icons[0];
    if (!seed) continue;
    console.log(`--- ${cat.label} ---`);
    await genOne(seed.name, buildPrompt(seed.desc, !!sheetRef), cat.type, sheetRef ? [sheetRef] : undefined);
  }
}

async function runBatch(filter?: string) {
  const cats = resolveCats(filter);
  const sheetRef = existsSync(SHEET_PATH) ? readBuf(SHEET_PATH) : undefined;

  for (const cat of cats) {
    const seed = cat.icons[0];
    if (!seed) continue;
    console.log(`\n--- ${cat.label} ---`);

    const seedRef = existsSync(rawPath(seed.name))
      ? readBuf(rawPath(seed.name))
      : existsSync(iconPath(seed.name))
        ? readBuf(iconPath(seed.name))
        : undefined;
    if (!seedRef) {
      console.log(`  No seed for ${cat.id}, run 'seed ${cat.id}' first`);
      continue;
    }

    const refs: Buffer[] = [];
    if (sheetRef) refs.push(sheetRef);
    refs.push(seedRef);

    for (let i = 1; i < cat.icons.length; i++) {
      const icon = cat.icons[i];
      if (!icon) continue;
      await genOne(icon.name, buildPrompt(icon.desc, true), cat.type, refs);
    }
  }
}

async function runFull(filter?: string) {
  await runSeed(filter);
  await runBatch(filter);
}

function runRedo(filter?: string) {
  if (!filter) {
    console.error(`Usage: redo <category>. Available: ${CATEGORIES.map((c) => c.id).join(', ')}`);
    process.exit(1);
  }
  const cat = CATEGORIES.find((c) => c.id === filter);
  if (!cat) { console.error(`Unknown: ${filter}`); process.exit(1); }
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
  console.log(`Style sheet: ${existsSync(SHEET_PATH) ? 'OK' : 'MISSING'}\n`);
  let total = 0; let existing = 0;
  for (const cat of CATEGORIES) {
    console.log(`${cat.label} [${cat.type}]`);
    for (const icon of cat.icons) {
      const exists = existsSync(iconPath(icon.name));
      const tag = icon === cat.icons[0] ? ' [SEED]' : '';
      console.log(`  ${exists ? 'OK' : '--'}  ${icon.name}${tag}`);
      total++; if (exists) existing++;
    }
    console.log();
  }
  console.log(`Total: ${existing}/${total}`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
const [cmd, filter] = process.argv.slice(2);
switch (cmd) {
  case undefined:
  case 'list':  runList(); break;
  case 'sheet': await runSheet(); break;
  case 'seed':  await runSeed(filter); break;
  case 'batch': await runBatch(filter); break;
  case 'run':   await runFull(filter); break;
  case 'redo':  runRedo(filter); break;
  default:
    console.log('Usage: bun scripts/gen-ui-icons.ts {sheet|seed|batch|run|redo|list} [category]');
    console.log('Categories:', CATEGORIES.map((c) => c.id).join(', '));
}
