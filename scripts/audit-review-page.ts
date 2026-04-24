/**
 * Build the interactive review HTML for the audit grids.
 *
 * Emits a single HTML file that embeds every 6-view grid PNG from
 * `war-assets/validation/_grids/` and wraps each tile with:
 *   - 6 toggle chips: wrong-axis | floating | stray-plane | proportions |
 *     missing-part | style
 *   - One free-text textarea
 *   - A "Show only flagged" filter in the top bar
 *   - A live flagged / total counter
 *
 * Annotations auto-save to `localStorage` AND POST to the companion server
 * at http://127.0.0.1:7802/annotate (see scripts/review-server.ts). When the
 * server is down the page falls back to localStorage-only and shows an
 * "offline" badge so the reviewer knows changes aren't being persisted to
 * the repo.
 *
 *   bun scripts/audit-review-page.ts                 # just emit HTML
 *   bun scripts/audit-review-page.ts --open          # open in browser
 *   bun scripts/audit-review-page.ts --serve         # run server + open
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
import { join, basename } from 'node:path';
import { spawn } from 'node:child_process';
import { NodeIO } from '@gltf-transform/core';

const GRID_DIR = 'war-assets/validation/_grids';
const GLB_DIR = 'war-assets/validation';
const OUT = join(GRID_DIR, 'review.html');

const CHIPS = [
  'wrong-axis',
  'floating',
  'stray-plane',
  'proportions',
  'missing-part',
  'style',
] as const;

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

interface TileData {
  slug: string;
  title: string;
  glbSize: string;
  b64: string;
  provider: string;
  model: string;
  triangles: number;
  vertices: number;
  meshes: number;
  materials: number;
  warningCount: number;
}

interface ProvenanceLike {
  provider?: string;
  model?: string;
  warnings?: unknown[];
}

function walk(dir: string, suffix: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, ent.name);
    if (ent.isDirectory()) {
      walk(full, suffix, out);
      continue;
    }
    if (ent.name.endsWith(suffix)) out.push(full);
  }
  return out;
}

const provenanceBySlug = new Map<string, ProvenanceLike>();
for (const p of walk('war-assets', '.glb.provenance.json')) {
  const slug = basename(p, '.glb.provenance.json');
  if (slug.startsWith('validation')) continue;
  try {
    const parsed = JSON.parse(readFileSync(p, 'utf-8')) as ProvenanceLike;
    provenanceBySlug.set(slug, parsed);
  } catch {
    // ignore malformed sidecars
  }
}

async function inspectGlbStats(glbPath: string): Promise<{
  triangles: number;
  vertices: number;
  meshes: number;
  materials: number;
}> {
  if (!existsSync(glbPath)) {
    return { triangles: 0, vertices: 0, meshes: 0, materials: 0 };
  }
  try {
    const io = new NodeIO();
    const doc = await io.read(glbPath);
    const root = doc.getRoot();
    let triangles = 0;
    let vertices = 0;
    let meshes = 0;
    for (const mesh of root.listMeshes()) {
      meshes++;
      for (const prim of mesh.listPrimitives()) {
        const idx = prim.getIndices();
        const pos = prim.getAttribute('POSITION');
        if (idx) triangles += Math.floor(idx.getCount() / 3);
        else if (pos) triangles += Math.floor(pos.getCount() / 3);
        if (pos) vertices += pos.getCount();
      }
    }
    const materials = root.listMaterials().length;
    return { triangles, vertices, meshes, materials };
  } catch {
    return { triangles: 0, vertices: 0, meshes: 0, materials: 0 };
  }
}

const tiles: TileData[] = await Promise.all(grids.map(async (file) => {
  const slug = basename(file, '-grid.png');
  const glbPath = join(GLB_DIR, `${slug}.glb`);
  const prov = provenanceBySlug.get(slug) ?? {};
  const stats = await inspectGlbStats(glbPath);
  const warningCount = Array.isArray(prov.warnings) ? prov.warnings.length : 0;
  return {
    slug,
    title: titleCase(slug),
    glbSize: existsSync(glbPath) ? kb(statSync(glbPath).size) : '—',
    b64: readFileSync(join(GRID_DIR, file)).toString('base64'),
    provider: prov.provider ?? 'unknown',
    model: prov.model ?? 'unknown',
    triangles: stats.triangles,
    vertices: stats.vertices,
    meshes: stats.meshes,
    materials: stats.materials,
    warningCount,
  };
}));

const modelAgg = new Map<string, { count: number; tris: number; verts: number }>();
for (const t of tiles) {
  const key = `${t.provider} / ${t.model}`;
  const cur = modelAgg.get(key) ?? { count: 0, tris: 0, verts: 0 };
  cur.count += 1;
  cur.tris += t.triangles;
  cur.verts += t.vertices;
  modelAgg.set(key, cur);
}
const modelRows = Array.from(modelAgg.entries())
  .sort((a, b) => b[1].count - a[1].count)
  .map(([k, v]) => `<tr><td>${k}</td><td>${v.count}</td><td>${v.tris.toLocaleString()}</td><td>${v.verts.toLocaleString()}</td></tr>`)
  .join('\n');

const chipsHtml = CHIPS.map(
  (c) => `<label class="chip"><input type="checkbox" data-chip="${c}"><span>${c}</span></label>`,
).join('');

const sectionsHtml = tiles
  .map(
    (t) => `
  <section id="${t.slug}" data-asset="${t.slug}" data-flagged="0">
    <header>
      <h2>${t.title}</h2>
      <span class="meta">${t.slug}.glb · ${t.glbSize} · ${t.triangles.toLocaleString()} tris · ${t.vertices.toLocaleString()} verts</span>
      <span class="status" data-status></span>
    </header>
    <img loading="lazy" alt="${t.title} 6-view grid" src="data:image/png;base64,${t.b64}">
    <div class="stats">
      <span><b>provider</b> ${t.provider}</span>
      <span><b>model</b> ${t.model}</span>
      <span><b>meshes</b> ${t.meshes}</span>
      <span><b>materials</b> ${t.materials}</span>
      <span><b>warnings</b> ${t.warningCount}</span>
      <span><b>size</b> ${t.glbSize}</span>
    </div>
    <div class="annotate">
      <div class="chips">${chipsHtml}</div>
      <textarea rows="2" placeholder="Notes (optional) — e.g. 'tail rotor should spin on +X, not +Y'" data-note></textarea>
    </div>
  </section>`,
  )
  .join('\n');

const tocHtml = tiles
  .map((t) => `<a href="#${t.slug}" data-toc="${t.slug}">${t.title}</a>`)
  .join('\n  ');

const ts = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Kiln Review — ${tiles.length} GLBs</title>
<style>
  :root {
    color-scheme: dark;
    --bg: #0e0f11;
    --panel: #1a1c20;
    --panel-hi: #23262c;
    --border: #2a2d33;
    --text: #e6e7ea;
    --muted: #9aa0a8;
    --accent: #6ea8fe;
    --flag: #f0a020;
    --ok: #58c27d;
    --err: #e35d5d;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    background: var(--bg);
    color: var(--text);
    font-family: 'Segoe UI', system-ui, sans-serif;
  }
  header.top {
    padding: 16px 32px;
    border-bottom: 1px solid var(--border);
    background: var(--panel);
    position: sticky;
    top: 0;
    z-index: 10;
    display: flex;
    gap: 20px;
    align-items: center;
    flex-wrap: wrap;
  }
  header.top h1 { margin: 0; font-size: 20px; }
  header.top .meta, header.top .conn {
    color: var(--muted);
    font-size: 13px;
    font-family: ui-monospace, monospace;
  }
  header.top .counts { font-size: 13px; font-family: ui-monospace, monospace; }
  header.top .counts b { color: var(--flag); }
  .model-box {
    margin: 16px 32px 0;
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 10px 12px;
  }
  .model-box h3 { margin: 0 0 8px; font-size: 13px; }
  .model-box table { width: 100%; border-collapse: collapse; font-size: 12px; }
  .model-box th, .model-box td {
    border-top: 1px solid var(--border);
    padding: 6px 8px;
    text-align: left;
    font-family: ui-monospace, monospace;
  }
  .model-box th { color: var(--muted); }
  .toggle {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    cursor: pointer;
    user-select: none;
  }
  .toc-btn {
    border: 1px solid var(--border);
    background: var(--panel-hi);
    color: var(--text);
    border-radius: 6px;
    padding: 6px 10px;
    font-size: 12px;
    font-family: ui-monospace, monospace;
    cursor: pointer;
  }
  .toc-btn:hover { border-color: var(--accent); }
  .conn[data-state="ok"] { color: var(--ok); }
  .conn[data-state="off"] { color: var(--err); }
  main { padding: 24px 32px; display: flex; flex-direction: column; gap: 24px; }
  section {
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 8px;
    overflow: hidden;
    scroll-margin-top: 80px;
  }
  section[data-flagged="1"] { border-color: var(--flag); }
  section header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    padding: 12px 20px;
    border-bottom: 1px solid var(--border);
    gap: 14px;
  }
  section h2 { margin: 0; font-size: 17px; font-weight: 600; }
  section .meta { color: var(--muted); font-size: 12px; font-family: ui-monospace, monospace; margin-left: auto; }
  section .status { font-size: 12px; font-family: ui-monospace, monospace; color: var(--muted); }
  section .status[data-state="saved"] { color: var(--ok); }
  section .status[data-state="offline"] { color: var(--flag); }
  section .status[data-state="error"] { color: var(--err); }
  section img { display: block; width: 100%; height: auto; background: #000; }
  .stats {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 4px 10px;
    padding: 8px 20px 10px;
    border-top: 1px solid var(--border);
    background: var(--panel-hi);
    font-size: 12px;
    font-family: ui-monospace, monospace;
  }
  .stats b { color: var(--muted); font-weight: 600; margin-right: 6px; }
  .annotate { padding: 14px 20px 18px; border-top: 1px solid var(--border); background: var(--panel-hi); }
  .chips { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 10px; }
  .chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    border: 1px solid var(--border);
    border-radius: 999px;
    font-size: 12px;
    font-family: ui-monospace, monospace;
    cursor: pointer;
    user-select: none;
    background: var(--bg);
    transition: border-color 0.12s, background 0.12s;
  }
  .chip input { appearance: none; width: 10px; height: 10px; border-radius: 50%; border: 1px solid var(--muted); margin: 0; }
  .chip input:checked { background: var(--flag); border-color: var(--flag); }
  .chip:has(input:checked) { border-color: var(--flag); background: rgba(240,160,32,0.12); }
  textarea {
    width: 100%;
    padding: 8px 10px;
    border-radius: 6px;
    border: 1px solid var(--border);
    background: var(--bg);
    color: var(--text);
    font-family: ui-monospace, monospace;
    font-size: 12.5px;
    resize: vertical;
    min-height: 44px;
  }
  textarea:focus { outline: 1px solid var(--accent); border-color: var(--accent); }
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
    z-index: 5;
    transition: transform 0.16s ease, opacity 0.16s ease;
  }
  nav.toc a { color: var(--text); text-decoration: none; display: block; padding: 2px 0; }
  nav.toc a:hover, nav.toc a.flagged { color: var(--flag); }
  body.toc-collapsed nav.toc {
    transform: translateX(calc(100% + 16px));
    opacity: 0;
    pointer-events: none;
  }
  body.only-flagged section[data-flagged="0"] { display: none; }
  body.only-flagged nav.toc a:not(.flagged) { display: none; }
  @media (max-width: 1100px) { nav.toc { display: none; } }
</style>
</head>
<body>
<header class="top">
  <h1>Kiln Review</h1>
  <span class="meta">${tiles.length} GLBs · generated ${ts}</span>
  <span class="counts"><b data-counter>0</b> flagged / ${tiles.length}</span>
  <label class="toggle"><input type="checkbox" data-only-flagged> Show only flagged</label>
  <button class="toc-btn" data-toggle-toc>Hide sidebar</button>
  <span class="conn" data-conn data-state="off">server: offline</span>
</header>
<section class="model-box">
  <h3>Model + Perf Summary</h3>
  <table>
    <thead><tr><th>Provider / Model</th><th>Assets</th><th>Total Tris</th><th>Total Verts</th></tr></thead>
    <tbody>${modelRows}</tbody>
  </table>
</section>
<nav class="toc">
  ${tocHtml}
</nav>
<main>
${sectionsHtml}
</main>
<script>
  const SERVER = 'http://127.0.0.1:7802';
  const STORAGE_KEY = 'kiln-review-annotations-v1';

  const state = Object.create(null);
  try { Object.assign(state, JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')); } catch {}

  const counterEl = document.querySelector('[data-counter]');
  const connEl = document.querySelector('[data-conn]');
  const onlyFlaggedChk = document.querySelector('[data-only-flagged]');
  const tocToggleBtn = document.querySelector('[data-toggle-toc]');
  const bodyEl = document.body;
  const TOC_KEY = 'kiln-review-toc-collapsed-v1';

  function updateCounter() {
    const flagged = document.querySelectorAll('section[data-flagged="1"]').length;
    counterEl.textContent = String(flagged);
  }

  function updateTocFlagged(slug, isFlagged) {
    const a = document.querySelector('[data-toc="' + slug + '"]');
    if (!a) return;
    a.classList.toggle('flagged', isFlagged);
  }

  function saveLocal() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
  }

  async function pushToServer(slug, payload, statusEl) {
    try {
      const res = await fetch(SERVER + '/annotate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ asset: slug, ...payload, ts: Date.now() }),
      });
      if (res.ok) {
        statusEl.setAttribute('data-state', 'saved');
        statusEl.textContent = 'saved';
        connEl.setAttribute('data-state', 'ok');
        connEl.textContent = 'server: live';
      } else {
        statusEl.setAttribute('data-state', 'error');
        statusEl.textContent = 'server ' + res.status;
      }
    } catch {
      statusEl.setAttribute('data-state', 'offline');
      statusEl.textContent = 'offline (local only)';
      connEl.setAttribute('data-state', 'off');
      connEl.textContent = 'server: offline';
    }
  }

  function readSection(section) {
    const chips = Array.from(section.querySelectorAll('.chip input:checked'))
      .map((el) => el.getAttribute('data-chip'));
    const note = section.querySelector('textarea[data-note]').value.trim();
    return { chips, note };
  }

  function hydrateSection(section) {
    const slug = section.getAttribute('data-asset');
    const entry = state[slug];
    if (!entry) return;
    if (Array.isArray(entry.chips)) {
      for (const c of entry.chips) {
        const input = section.querySelector('.chip input[data-chip="' + c + '"]');
        if (input) input.checked = true;
      }
    }
    if (typeof entry.note === 'string') {
      section.querySelector('textarea[data-note]').value = entry.note;
    }
    const flagged = (entry.chips?.length || 0) > 0 || (entry.note || '').length > 0;
    section.setAttribute('data-flagged', flagged ? '1' : '0');
    updateTocFlagged(slug, flagged);
  }

  function wireSection(section) {
    const slug = section.getAttribute('data-asset');
    const statusEl = section.querySelector('[data-status]');

    let saveTimer = null;
    const commit = () => {
      const payload = readSection(section);
      state[slug] = payload;
      saveLocal();
      const flagged = payload.chips.length > 0 || payload.note.length > 0;
      section.setAttribute('data-flagged', flagged ? '1' : '0');
      updateTocFlagged(slug, flagged);
      updateCounter();
      statusEl.setAttribute('data-state', 'saving');
      statusEl.textContent = 'saving...';
      pushToServer(slug, payload, statusEl);
    };

    const schedule = () => {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(commit, 250);
    };

    for (const chip of section.querySelectorAll('.chip input')) {
      chip.addEventListener('change', schedule);
    }
    section.querySelector('textarea[data-note]').addEventListener('input', schedule);
  }

  async function pullServerState() {
    try {
      const res = await fetch(SERVER + '/issues.json');
      if (!res.ok) throw new Error('not-ok');
      const remote = await res.json();
      connEl.setAttribute('data-state', 'ok');
      connEl.textContent = 'server: live';
      // server wins on startup if it has an entry
      for (const [slug, entry] of Object.entries(remote || {})) {
        state[slug] = entry;
      }
      saveLocal();
    } catch {
      connEl.setAttribute('data-state', 'off');
      connEl.textContent = 'server: offline';
    }
  }

  onlyFlaggedChk.addEventListener('change', () => {
    bodyEl.classList.toggle('only-flagged', onlyFlaggedChk.checked);
  });

  function setTocCollapsed(collapsed) {
    bodyEl.classList.toggle('toc-collapsed', collapsed);
    if (tocToggleBtn) tocToggleBtn.textContent = collapsed ? 'Show sidebar' : 'Hide sidebar';
    try { localStorage.setItem(TOC_KEY, collapsed ? '1' : '0'); } catch {}
  }
  if (tocToggleBtn) {
    let collapsed = false;
    try { collapsed = localStorage.getItem(TOC_KEY) === '1'; } catch {}
    setTocCollapsed(collapsed);
    tocToggleBtn.addEventListener('click', () => setTocCollapsed(!bodyEl.classList.contains('toc-collapsed')));
  }

  (async () => {
    await pullServerState();
    for (const section of document.querySelectorAll('section[data-asset]')) {
      hydrateSection(section);
      wireSection(section);
    }
    updateCounter();
  })();
</script>
</body>
</html>
`;

writeFileSync(OUT, html);
const outBytes = statSync(OUT).size;
console.log(`wrote ${OUT}`);
console.log(`  ${tiles.length} tiles, ${kb(outBytes)}`);

const shouldServe = process.argv.includes('--serve');
const shouldOpen = process.argv.includes('--open') || shouldServe;

if (shouldServe) {
  console.log('starting review server on :7802 (scripts/review-server.ts)');
  const srv = spawn('bun', ['scripts/review-server.ts'], {
    detached: true,
    stdio: 'inherit',
  });
  srv.unref();
}

if (shouldOpen) {
  const target = shouldServe
    ? 'http://127.0.0.1:7802/'
    : join(process.cwd(), OUT);
  const platform = process.platform;
  const cmd =
    platform === 'win32'
      ? ['cmd', ['/c', 'start', '', target]]
      : platform === 'darwin'
        ? ['open', [target]]
        : ['xdg-open', [target]];
  spawn(cmd[0] as string, cmd[1] as string[], {
    detached: true,
    stdio: 'ignore',
  }).unref();
  console.log(`  opening ${target}`);
}
