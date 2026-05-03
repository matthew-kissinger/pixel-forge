#!/usr/bin/env bun
/**
 * Build a single-page review HTML comparing all 4 variants per aircraft:
 *   v0 (hand-painted) | gpt-edit | gpt-text | gemini-edit
 *
 * For each aircraft:
 *   - 4 columns showing the texture PNG
 *   - 4 columns showing the audit-grid PNG of the corresponding GLB
 *   - Provenance metadata (model, latency, cost) under each
 *
 * Open via:  bun scripts/audit-review-page.ts (existing review page)  OR
 *            file:// directly:  start war-assets/_review/aircraft-review.html
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const REVIEW_BASE = 'war-assets/_review/aircraft-textures-ab';
const GRID_BASE = 'war-assets/_review/aircraft-textures-ab'; // we'll write grids alongside
const OUT_PATH = 'war-assets/_review/aircraft-review.html';
const SLUGS = ['uh1-huey', 'uh1c-gunship', 'ah1-cobra', 'ac47-spooky', 'f4-phantom', 'a1-skyraider'];
const STRATEGIES = ['v0', 'gpt-edit', 'gpt-text', 'gemini-edit'] as const;

type Strategy = (typeof STRATEGIES)[number];

interface Provenance {
  model?: string;
  latencyMs?: number;
  costUsd?: number;
  prompt?: string;
}

function loadProvenance(strategy: Strategy, slug: string): Provenance | null {
  if (strategy === 'v0') {
    return { model: 'hand-painted', latencyMs: 0 };
  }
  const p = join(REVIEW_BASE, strategy, `${slug}-albedo.png.provenance.json`);
  if (!existsSync(p)) return null;
  return JSON.parse(readFileSync(p, 'utf8')) as Provenance;
}

function texturePath(strategy: Strategy, slug: string): string {
  if (strategy === 'v0') return `../textures/aircraft/${slug}-albedo.png`;
  return `aircraft-textures-ab/${strategy}/${slug}-albedo.png`;
}

function gridPath(strategy: Strategy, slug: string): string {
  return `aircraft-textures-ab/${strategy}/${slug}-grid.png`;
}

function glbExists(strategy: Strategy, slug: string): boolean {
  return existsSync(join(REVIEW_BASE, strategy, `${slug}.glb`));
}

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Aircraft Albedo A/B — review</title>
<style>
  body {
    font-family: ui-monospace, 'SF Mono', Menlo, monospace;
    background: #1a1a1a; color: #e8e8e8;
    margin: 0; padding: 24px;
  }
  h1 { font-size: 1.4rem; margin: 0 0 16px; color: #ffd866; }
  h2 { font-size: 1.1rem; margin: 24px 0 8px; color: #c0c0c0; border-bottom: 1px solid #333; padding-bottom: 4px; }
  .grid {
    display: grid;
    grid-template-columns: 100px repeat(4, 1fr);
    gap: 8px;
    align-items: start;
    margin-bottom: 24px;
  }
  .label-row { display: contents; }
  .label-row > div { padding: 8px; font-size: 0.85rem; }
  .row-head { color: #888; font-style: italic; }
  .strategy-head {
    text-align: center;
    background: #2a2a2a;
    padding: 6px;
    border-radius: 4px;
    color: #ffd866;
    font-weight: bold;
  }
  .cell {
    background: #222;
    border-radius: 4px;
    padding: 8px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
  }
  .cell img {
    max-width: 100%;
    image-rendering: pixelated;
    border-radius: 2px;
  }
  .cell.tex img { width: 256px; height: 256px; }
  .cell.grid-img img { width: 100%; max-width: 320px; }
  .meta {
    font-size: 0.72rem;
    color: #888;
    text-align: center;
    line-height: 1.3;
  }
  .meta .model { color: #66d9ef; }
  .meta .cost { color: #f92672; }
  .missing {
    color: #555;
    font-style: italic;
    text-align: center;
    padding: 40px 0;
  }
  .legend {
    background: #222; padding: 12px; border-radius: 4px;
    margin-bottom: 24px; font-size: 0.85rem; color: #c0c0c0;
  }
  .legend strong { color: #ffd866; }
</style>
</head>
<body>
<h1>Aircraft Albedo A/B — review</h1>
<div class="legend">
  <strong>Strategies compared:</strong><br>
  <strong>v0</strong> — hand-painted procedural (free, baseline layout) ·
  <strong>gpt-edit</strong> — gpt-image-2 multi-ref edit with V0 + style ($0.21/run) ·
  <strong>gpt-text</strong> — gpt-image-1.5 text-only ($0.05/run) ·
  <strong>gemini-edit</strong> — Gemini Nano Banana Pro multi-image ($0.04/run)
</div>
${SLUGS.map((slug) => {
  return `
<h2>${slug}</h2>
<div class="grid">
  <div class="label-row">
    <div class="row-head">strategy</div>
    ${STRATEGIES.map((s) => `<div class="strategy-head">${s}</div>`).join('')}
  </div>
  <div class="label-row">
    <div class="row-head">texture</div>
    ${STRATEGIES.map((s) => {
      const prov = loadProvenance(s, slug);
      const exists =
        s === 'v0'
          ? existsSync(join('war-assets/textures/aircraft', `${slug}-albedo.png`))
          : existsSync(join(REVIEW_BASE, s, `${slug}-albedo.png`));
      if (!exists) return `<div class="cell tex"><div class="missing">— missing —</div></div>`;
      const meta = prov
        ? `<div class="meta"><span class="model">${prov.model ?? '?'}</span> · ${prov.latencyMs ? (prov.latencyMs / 1000).toFixed(1) + 's' : '—'}${prov.costUsd ? ` · <span class="cost">$${prov.costUsd.toFixed(3)}</span>` : ''}</div>`
        : `<div class="meta">no provenance</div>`;
      return `<div class="cell tex"><img src="${texturePath(s, slug)}" alt="${s}/${slug} texture">${meta}</div>`;
    }).join('')}
  </div>
  <div class="label-row">
    <div class="row-head">audit grid</div>
    ${STRATEGIES.map((s) => {
      const has = existsSync(join(GRID_BASE, s, `${slug}-grid.png`));
      const hasGlb = glbExists(s, slug);
      if (!has) {
        return `<div class="cell grid-img"><div class="missing">${hasGlb ? 'grid not rendered' : '— no GLB —'}</div></div>`;
      }
      return `<div class="cell grid-img"><img src="${gridPath(s, slug)}" alt="${s}/${slug} audit"></div>`;
    }).join('')}
  </div>
</div>
`;
}).join('')}
</body>
</html>
`;

writeFileSync(OUT_PATH, html);
console.log(`wrote ${OUT_PATH}`);
console.log(`open with: start ${OUT_PATH}  (or in browser: file://${process.cwd().replace(/\\/g, '/')}/${OUT_PATH})`);
