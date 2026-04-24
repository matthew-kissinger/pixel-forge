#!/usr/bin/env bun
/**
 * 2D pipeline smoke — stress the pipelines that don't have dedicated
 * gen-* scripts yet: icons + soldier-set + a small hero texture set.
 *
 * Designed to exercise the new rails in one place:
 * - OpenAI `gpt-image-1.5` (icons, text-only)
 * - Gemini `gemini-3.1-flash-image-preview` (soldier T-pose + poses)
 * - FAL `fal-ai/flux-lora` + Seamless LoRA (hero textures)
 * - FAL `fal-ai/birefnet/v2` bg removal (sprite + soldier)
 * - Provenance sidecar on every write
 *
 * Skips items whose output already exists so the overnight shell can
 * re-run this script safely on a partial crash.
 */

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const ICON_DIR = 'war-assets/ui/icons';
const TEXTURE_DIR = 'war-assets/textures';
const SOLDIER_DIR = 'war-assets/soldiers/us-infantry';

mkdirSync(ICON_DIR, { recursive: true });
mkdirSync(TEXTURE_DIR, { recursive: true });
mkdirSync(SOLDIER_DIR, { recursive: true });

const CLI = ['packages/cli/src/index.ts'];

function run(args: string[]): { ok: boolean; durationMs: number } {
  const t0 = Date.now();
  const res = spawnSync('bun', [...CLI, ...args], {
    stdio: 'inherit',
    env: process.env,
  });
  return { ok: res.status === 0, durationMs: Date.now() - t0 };
}

interface Icon {
  name: string;
  prompt: string;
  variant: 'mono' | 'colored';
}

const ICONS: Icon[] = [
  {
    name: 'sword',
    prompt:
      'fantasy longsword with leather-wrapped hilt, centered, clean silhouette, UI icon readable at 64px',
    variant: 'mono',
  },
  {
    name: 'shield',
    prompt:
      'medieval heater shield with iron rim, centered, front-facing, UI icon readable at 64px',
    variant: 'colored',
  },
  {
    name: 'grenade',
    prompt:
      'US M67 fragmentation grenade, olive drab body with yellow ring, centered, UI icon readable at 64px',
    variant: 'colored',
  },
  {
    name: 'ammo-box',
    prompt:
      'rectangular olive drab metal ammo can with stencil, centered, 3-quarter view, UI icon readable at 64px',
    variant: 'colored',
  },
];

interface Texture {
  name: string;
  description: string;
  size: number;
}

const TEXTURES: Texture[] = [
  {
    name: 'jungle-mud',
    description:
      'wet tropical jungle mud with leaf litter, dark brown-green, seamless tile, pixel art',
    size: 512,
  },
  {
    name: 'weathered-planks',
    description:
      'weathered horizontal wooden planks, grey-brown with nail heads, seamless tile, pixel art',
    size: 512,
  },
  {
    name: 'corrugated-metal',
    description:
      'ridged corrugated metal panel, rust streaks on grey steel, seamless tile, pixel art',
    size: 512,
  },
];

let failures: string[] = [];
let completed = 0;
const t0 = Date.now();

console.log('=== smoke 2D: icons ===');
for (const i of ICONS) {
  const out = join(ICON_DIR, `${i.name}.png`);
  if (existsSync(out)) {
    console.log(`  [skip] ${i.name}`);
    continue;
  }
  console.log(`  [gen ] ${i.name} (${i.variant})`);
  const r = run([
    'gen',
    'icon',
    '--prompt', i.prompt,
    '--variant', i.variant,
    '--out', out,
  ]);
  if (!r.ok) failures.push(`icon:${i.name}`);
  else completed++;
}

console.log('=== smoke 2D: hero textures ===');
for (const t of TEXTURES) {
  const out = join(TEXTURE_DIR, `${t.name}.png`);
  if (existsSync(out)) {
    console.log(`  [skip] ${t.name}`);
    continue;
  }
  console.log(`  [gen ] ${t.name}`);
  const r = run([
    'gen',
    'texture',
    '--description', t.description,
    '--size', String(t.size),
    '--out', out,
  ]);
  if (!r.ok) failures.push(`texture:${t.name}`);
  else completed++;
}

console.log('=== smoke 2D: soldier-set (US infantry rifleman, 4 poses) ===');
const soldierTPose = join(SOLDIER_DIR, 'tpose.png');
if (existsSync(soldierTPose)) {
  console.log('  [skip] us-infantry soldier-set already present');
} else {
  const posesPath = join(SOLDIER_DIR, '_poses.json');
  const posesBody = {
    poses: [
      { name: 'idle', prompt: 'standing at ease, rifle held diagonally across chest' },
      { name: 'walk', prompt: 'mid-stride walking forward, rifle held at low ready' },
      { name: 'aim',  prompt: 'aiming rifle through iron sights, stable stance' },
      { name: 'fire', prompt: 'firing rifle, muzzle flash flaring forward, shells ejecting', preserveFlash: true },
    ],
  };
  writeFileSync(posesPath, JSON.stringify(posesBody, null, 2));
  const r = run([
    'gen',
    'soldier-set',
    '--faction', 'us-infantry',
    '--tpose-prompt',
      'US Army infantry rifleman, 1968 Vietnam, olive drab jungle fatigues, boonie hat, M16 rifle held at port-arms, T-pose arms extended horizontally, full body from boots to hat visible, front-facing, 32-bit pixel art character sheet, magenta background',
    '--poses-file', posesPath,
    '--out-dir', SOLDIER_DIR,
  ]);
  if (!r.ok) failures.push('soldier-set:us-infantry');
  else completed++;
}

const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
console.log(`\n=== 2D smoke done in ${elapsed}s ===`);
console.log(`  completed: ${completed}`);
console.log(`  failed:    ${failures.length}`);
if (failures.length > 0) {
  console.log('  failures:', failures.join(', '));
  process.exit(1);
}
