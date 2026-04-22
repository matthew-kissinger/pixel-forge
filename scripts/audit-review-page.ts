/**
 * Build a single static HTML review page that embeds every 6-view grid PNG
 * from `war-assets/validation/_grids/` in one scrollable layout. Handy for
 * eyeballing all 12 validation GLBs at once.
 *
 * Run after `bun run audit:glb` has produced the grids:
 *
 *   bun scripts/audit-review-page.ts
 *   bun scripts/audit-review-page.ts --open    # open in default browser
 *
 * Output: war-assets/validation/_grids/review.html
 */

import {
  readdirSync,
  readFileSync,
  writeFileSync,
  existsSync,
  statSync,
} from 'node:fs';
import { join, basename, extname } from 'node:path';
import { spawn } from 'node:child_process';

const GRID_DIR = 'war-assets/validation/_grids';
const GLB_DIR = 'war-assets/validation';
const OUT = join(GRID_DIR, 'review.html');

if (!existsSync(GRID_DIR)) {
  console.error(`no grid dir at ${GRID_DIR} — run \`bun run audit:glb\` first`);
  process.exit(1);
}

const grids = readdirSync(GRID_DIR)
  .filter((f) => f.endsWith('-grid.png'))
  .sort();

if (grids.length === 0) {
  console.error('no grids found — run `bun run audit:glb` first');
  process.exit(1);
}

function titleCase(s: string): string {
  return s.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function kb(bytes: number): string {
  return (bytes / 1024).toFixed(1) + ' KB';
}

const sections = grids
  .map((file) => {
    const name = basename(file, '-grid.png');
    const glbPath = join(GLB_DIR, `${name}.glb`);
    const b64 = readFileSync(join(GRID_DIR, file)).toString('base64');
    const glbSize = existsSync(glbPath) ? kb(statSync(glbPath).size) : '—';
    return `
  <section>
    <header>
      <h2>${titleCase(name)}</h2>
      <span class="meta">${name}.glb · ${glbSize}</span>
    </header>
    <img loading="lazy" alt="${titleCase(name)} 6-view grid" src="data:image/png;base64,${b64}">
  </section>`;
  })
  .join('\n');

const ts = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Kiln Validation Review — ${grids.length} GLBs</title>
<style>
  :root {
    color-scheme: dark;
    --bg: #0e0f11;
    --panel: #1a1c20;
    --border: #2a2d33;
    --text: #e6e7ea;
    --muted: #9aa0a8;
    --accent: #6ea8fe;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    background: var(--bg);
    color: var(--text);
    font-family: 'Segoe UI', system-ui, sans-serif;
  }
  header.top {
    padding: 20px 32px;
    border-bottom: 1px solid var(--border);
    background: var(--panel);
    position: sticky;
    top: 0;
    z-index: 10;
    display: flex;
    gap: 16px;
    align-items: baseline;
    flex-wrap: wrap;
  }
  header.top h1 { margin: 0; font-size: 20px; }
  header.top span { color: var(--muted); font-size: 13px; font-family: ui-monospace, monospace; }
  main { padding: 24px 32px; display: flex; flex-direction: column; gap: 28px; }
  section {
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 8px;
    overflow: hidden;
  }
  section header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    padding: 12px 20px;
    border-bottom: 1px solid var(--border);
  }
  section h2 { margin: 0; font-size: 17px; font-weight: 600; }
  section .meta { color: var(--muted); font-size: 12px; font-family: ui-monospace, monospace; }
  section img { display: block; width: 100%; height: auto; }
  nav.toc {
    position: fixed;
    top: 80px;
    right: 24px;
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 12px 16px;
    font-size: 13px;
    max-height: calc(100vh - 120px);
    overflow-y: auto;
  }
  nav.toc a { color: var(--text); text-decoration: none; display: block; padding: 2px 0; }
  nav.toc a:hover { color: var(--accent); }
  @media (max-width: 1100px) { nav.toc { display: none; } }
</style>
</head>
<body>
<header class="top">
  <h1>Kiln Validation Review</h1>
  <span>${grids.length} GLBs · generated ${ts}</span>
  <span>Front · Right · Back · Left · Top · 3-4 — strict back-face culling</span>
</header>
<nav class="toc">
  ${grids.map((f) => { const n = basename(f, '-grid.png'); return `<a href="#${n}">${titleCase(n)}</a>`; }).join('\n  ')}
</nav>
<main>
${sections
  .split('<section>')
  .map((chunk, i) => (i === 0 ? chunk : `<section id="${basename(grids[i - 1]!, '-grid.png')}">${chunk}`))
  .join('')}
</main>
</body>
</html>
`;

writeFileSync(OUT, html);
const outBytes = statSync(OUT).size;
console.log(`wrote ${OUT}`);
console.log(`  ${grids.length} grids, ${kb(outBytes)}`);

if (process.argv.includes('--open')) {
  const full = join(process.cwd(), OUT);
  const platform = process.platform;
  const cmd =
    platform === 'win32'
      ? ['cmd', ['/c', 'start', '', full]]
      : platform === 'darwin'
        ? ['open', [full]]
        : ['xdg-open', [full]];
  spawn(cmd[0] as string, cmd[1] as string[], { detached: true, stdio: 'ignore' }).unref();
  console.log(`  opening in default browser...`);
}
