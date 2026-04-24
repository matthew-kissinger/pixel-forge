#!/usr/bin/env bun
/**
 * Post-overnight finalizer: counts all assets, runs a full audit grid
 * pass, updates MORNING_REVIEW.md with asset counts and grid links.
 */

import { readFileSync, readdirSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const WAR = 'war-assets';
const BACKUP = 'war-assets/_backup-2026-04-23';

interface CategoryStat {
  label: string;
  path: string;
  after: number;
  before: number;
  newOnes: string[];
}

const GLB_CATEGORIES: Array<[string, string]> = [
  ['Aircraft', 'vehicles/aircraft'],
  ['Ground vehicles', 'vehicles/ground'],
  ['Watercraft', 'vehicles/watercraft'],
  ['Weapons', 'weapons'],
  ['Buildings', 'buildings'],
  ['Structures', 'structures'],
  ['Animals', 'animals'],
  ['Props', 'props'],
];

function countGLBs(dir: string): { count: number; names: string[] } {
  if (!existsSync(dir)) return { count: 0, names: [] };
  const names = readdirSync(dir).filter((f) => f.endsWith('.glb'));
  return { count: names.length, names };
}

function countPNGs(dir: string): number {
  if (!existsSync(dir)) return 0;
  return readdirSync(dir)
    .filter((f) => f.endsWith('.png') || f.endsWith('.webp'))
    .filter((f) => !f.includes('_raw')).length;
}

const stats: CategoryStat[] = GLB_CATEGORIES.map(([label, sub]) => {
  const after = countGLBs(join(WAR, sub));
  const before = countGLBs(join(BACKUP, sub));
  const newOnes = after.names.filter((n) => !before.names.includes(n));
  return {
    label,
    path: sub,
    after: after.count,
    before: before.count,
    newOnes,
  };
});

const totalGLB = stats.reduce((a, s) => a + s.after, 0);
const totalBackup = stats.reduce((a, s) => a + s.before, 0);

// 2D counts
const vegCount = countPNGs(join(WAR, 'vegetation'));
const texCount = countPNGs(join(WAR, 'textures'));
const soldierCount = countPNGs(join(WAR, 'soldiers'));
const uiIconCount = existsSync(join(WAR, 'ui/icons'))
  ? readdirSync(join(WAR, 'ui/icons')).filter((f) => f.endsWith('.png')).length
  : 0;

// Audit grids
const gridDir = join(WAR, 'validation/_grids');
const grids = existsSync(gridDir)
  ? readdirSync(gridDir).filter((f) => f.endsWith('.png'))
  : [];

// Build summary
const summaryLines: string[] = [];
summaryLines.push('## Asset counts (run complete)\n');
summaryLines.push(`Total GLBs now: **${totalGLB}** (was ${totalBackup} before the run)\n`);
summaryLines.push('| Category | After | Before | New additions |');
summaryLines.push('|---|---|---|---|');
for (const s of stats) {
  const newList =
    s.newOnes.length > 0
      ? s.newOnes.map((n) => n.replace('.glb', '')).join(', ')
      : '_(none — regen only)_';
  summaryLines.push(`| ${s.label} | ${s.after} | ${s.before} | ${newList} |`);
}
summaryLines.push('');
summaryLines.push('### 2D');
summaryLines.push(`- Vegetation sprites: ${vegCount}`);
summaryLines.push(`- Terrain textures: ${texCount}`);
summaryLines.push(`- Soldier + character sprites: ${soldierCount}`);
summaryLines.push(`- UI icons: ${uiIconCount}`);
summaryLines.push('');
summaryLines.push(`### Audit grids produced: ${grids.length}`);
summaryLines.push('');
summaryLines.push('Sample grids (click to open):');
for (const g of grids.slice(0, 20)) {
  summaryLines.push(`- [${g}](war-assets/validation/_grids/${g})`);
}
if (grids.length > 20) {
  summaryLines.push(`- ... and ${grids.length - 20} more in [war-assets/validation/_grids/](war-assets/validation/_grids/)`);
}

const summaryBlock = summaryLines.join('\n');

// Update MORNING_REVIEW.md
const reviewPath = 'MORNING_REVIEW.md';
if (existsSync(reviewPath)) {
  let content = readFileSync(reviewPath, 'utf8');
  content = content.replace(
    /<!-- AUTO-UPDATED -->[\s\S]*$/,
    `<!-- AUTO-UPDATED -->\n${summaryBlock}\n`,
  );
  writeFileSync(reviewPath, content);
  console.log(`Updated MORNING_REVIEW.md with run summary (${totalGLB} GLBs, ${grids.length} grids).`);
} else {
  console.log('MORNING_REVIEW.md not found — printing summary to stdout');
  console.log(summaryBlock);
}
