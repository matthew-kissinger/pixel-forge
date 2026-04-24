/**
 * Build a dedicated grouped 2D review page (sprites, textures, icons, NPCs).
 *
 * Sources:
 * - war-assets/vegetation/*.png
 * - war-assets/textures/*.png
 * - war-assets/ui/icons/*.png
 * - war-assets/soldiers/(nested)/.png
 *
 * Output:
 * - war-assets/_review/review-2d.html
 *
 * Includes model/provider stats derived from adjacent provenance sidecars
 * (`<asset>.provenance.json`) plus per-asset metadata cards.
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

type GroupId = 'npc' | 'vegetation' | 'textures' | 'ui-icons' | 'other-2d';

const ROOT = resolve(process.cwd());
const ASSET_ROOT = join(ROOT, 'war-assets');
const OUT = join(ASSET_ROOT, '_review', 'review-2d.html');
const SERVER = 'http://127.0.0.1:7802';

const CHIPS = ['style', 'silhouette', 'edges', 'palette', 'readability', 'keep'] as const;

interface ProvenanceLike {
  provider?: string;
  model?: string;
  latencyMs?: number;
  costUsd?: number;
  warnings?: unknown[];
}

interface Tile {
  id: string;
  relPath: string;
  name: string;
  group: GroupId;
  groupLabel: string;
  bytes: number;
  b64: string;
  provider: string;
  model: string;
  latencyMs?: number;
  costUsd?: number;
  warningCount: number;
}

function titleCase(raw: string): string {
  return raw.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function kb(n: number): string {
  return `${(n / 1024).toFixed(1)} KB`;
}

function groupFor(relPath: string): { id: GroupId; label: string } {
  const p = relPath.replace(/\\/g, '/');
  if (p.startsWith('soldiers/')) return { id: 'npc', label: 'NPC / Soldiers' };
  if (p.startsWith('vegetation/')) return { id: 'vegetation', label: 'Vegetation Sprites' };
  if (p.startsWith('textures/')) return { id: 'textures', label: 'Textures' };
  if (p.startsWith('ui/icons/')) return { id: 'ui-icons', label: 'UI Icons' };
  return { id: 'other-2d', label: 'Other 2D' };
}

function walkPngs(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  const stack = [dir];
  while (stack.length > 0) {
    const current = stack.pop()!;
    for (const ent of readdirSync(current, { withFileTypes: true })) {
      const full = join(current, ent.name);
      if (ent.isDirectory()) {
        stack.push(full);
        continue;
      }
      const lower = ent.name.toLowerCase();
      if (lower.endsWith('.png') || lower.endsWith('.webp')) {
        if (lower.endsWith('.provenance.json')) continue;
        out.push(full);
      }
    }
  }
  return out.sort((a, b) => a.localeCompare(b));
}

function readProvenance(assetPath: string): ProvenanceLike {
  const p = `${assetPath}.provenance.json`;
  if (!existsSync(p)) return {};
  try {
    return JSON.parse(readFileSync(p, 'utf-8')) as ProvenanceLike;
  } catch {
    return {};
  }
}

const files = [
  ...walkPngs(join(ASSET_ROOT, 'vegetation')),
  ...walkPngs(join(ASSET_ROOT, 'textures')),
  ...walkPngs(join(ASSET_ROOT, 'ui', 'icons')),
  ...walkPngs(join(ASSET_ROOT, 'soldiers')),
];

if (files.length === 0) {
  console.error('no 2D assets found under vegetation/textures/ui/icons/soldiers');
  process.exit(1);
}

const tiles: Tile[] = files.map((abs) => {
  const rel = relative(ASSET_ROOT, abs).replace(/\\/g, '/');
  const stat = statSync(abs);
  const prov = readProvenance(abs);
  const grp = groupFor(rel);
  const name = abs.split(/[/\\]/).pop()!.replace(/\.(png|webp)$/i, '');
  return {
    id: `2d:${rel}`,
    relPath: rel,
    name,
    group: grp.id,
    groupLabel: grp.label,
    bytes: stat.size,
    b64: readFileSync(abs).toString('base64'),
    provider: prov.provider ?? 'unknown',
    model: prov.model ?? 'unknown',
    latencyMs: prov.latencyMs,
    costUsd: prov.costUsd,
    warningCount: Array.isArray(prov.warnings) ? prov.warnings.length : 0,
  };
});

type ModelAgg = { count: number; totalLatencyMs: number; totalCostUsd: number; withLatency: number; withCost: number };
const modelAgg = new Map<string, ModelAgg>();
for (const t of tiles) {
  const k = `${t.provider} / ${t.model}`;
  const cur = modelAgg.get(k) ?? { count: 0, totalLatencyMs: 0, totalCostUsd: 0, withLatency: 0, withCost: 0 };
  cur.count += 1;
  if (t.latencyMs !== undefined) {
    cur.totalLatencyMs += t.latencyMs;
    cur.withLatency += 1;
  }
  if (t.costUsd !== undefined) {
    cur.totalCostUsd += t.costUsd;
    cur.withCost += 1;
  }
  modelAgg.set(k, cur);
}

const modelRows = Array.from(modelAgg.entries())
  .sort((a, b) => b[1].count - a[1].count)
  .map(([k, v]) => {
    const avgLatency = v.withLatency > 0 ? `${(v.totalLatencyMs / v.withLatency / 1000).toFixed(1)}s` : '—';
    const totalCost = v.withCost > 0 ? `$${v.totalCostUsd.toFixed(3)}` : '—';
    return `<tr><td>${k}</td><td>${v.count}</td><td>${avgLatency}</td><td>${totalCost}</td></tr>`;
  })
  .join('\n');

const chipsHtml = CHIPS.map(
  (c) => `<label class="chip"><input type="checkbox" data-chip="${c}"><span>${c}</span></label>`,
).join('');

const grouped = new Map<GroupId, Tile[]>();
for (const t of tiles) {
  const arr = grouped.get(t.group) ?? [];
  arr.push(t);
  grouped.set(t.group, arr);
}

const groupOrder: GroupId[] = ['npc', 'vegetation', 'textures', 'ui-icons', 'other-2d'];
const groupSections = groupOrder
  .map((gid) => {
    const arr = grouped.get(gid);
    if (!arr || arr.length === 0) return '';
    const label = arr[0].groupLabel;
    const cards = arr
      .map((t) => {
        const ext = t.relPath.toLowerCase().endsWith('.webp') ? 'webp' : 'png';
        const latency = t.latencyMs !== undefined ? `${(t.latencyMs / 1000).toFixed(1)}s` : '—';
        const cost = t.costUsd !== undefined ? `$${t.costUsd.toFixed(3)}` : '—';
        return `
<article id="${t.id.replace(/[^a-zA-Z0-9:_-]/g, '_')}" class="tile" data-asset="${t.id}" data-flagged="0">
  <header>
    <h3>${titleCase(t.name)}</h3>
    <span class="meta">${t.relPath}</span>
    <span class="status" data-status></span>
  </header>
  <img loading="lazy" alt="${t.name}" src="data:image/${ext};base64,${t.b64}">
  <div class="stats">
    <span><b>provider</b> ${t.provider}</span>
    <span><b>model</b> ${t.model}</span>
    <span><b>size</b> ${kb(t.bytes)}</span>
    <span><b>latency</b> ${latency}</span>
    <span><b>cost</b> ${cost}</span>
    <span><b>warnings</b> ${t.warningCount}</span>
  </div>
  <div class="annotate">
    <div class="chips">${chipsHtml}</div>
    <textarea rows="2" data-note placeholder="Notes (optional)"></textarea>
  </div>
</article>`;
      })
      .join('\n');
    return `<section class="group"><h2>${label} <small>(${arr.length})</small></h2><div class="grid">${cards}</div></section>`;
  })
  .join('\n');

const ts = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>2D Asset Review</title>
<style>
  :root { color-scheme: dark; --bg:#0e0f11; --panel:#1a1c20; --hi:#23262c; --b:#2a2d33; --t:#e6e7ea; --m:#9aa0a8; --a:#6ea8fe; --f:#f0a020; --ok:#58c27d; --err:#e35d5d; }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--bg); color:var(--t); font-family:'Segoe UI',system-ui,sans-serif; }
  header.top { position:sticky; top:0; z-index:20; display:flex; gap:16px; align-items:center; flex-wrap:wrap; padding:14px 22px; border-bottom:1px solid var(--b); background:var(--panel); }
  h1 { margin:0; font-size:20px; }
  .meta,.conn,.counts { font-size:12px; color:var(--m); font-family:ui-monospace,monospace; }
  .counts b { color:var(--f); }
  .conn[data-state="ok"] { color:var(--ok); } .conn[data-state="off"] { color:var(--err); }
  .toggle { display:flex; gap:6px; align-items:center; font-size:12px; cursor:pointer; }
  main { padding:18px 22px; }
  .model-box { background:var(--panel); border:1px solid var(--b); border-radius:8px; padding:10px 12px; margin-bottom:16px; }
  .model-box h2 { margin:0 0 8px; font-size:14px; }
  table { width:100%; border-collapse:collapse; font-size:12px; }
  th,td { border-top:1px solid var(--b); padding:6px 8px; text-align:left; }
  th { color:var(--m); font-weight:600; }
  section.group { margin:0 0 18px; }
  section.group h2 { margin:0 0 10px; font-size:17px; }
  section.group h2 small { color:var(--m); font-size:12px; font-family:ui-monospace,monospace; }
  .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(320px,1fr)); gap:12px; }
  .tile { border:1px solid var(--b); border-radius:8px; overflow:hidden; background:var(--panel); }
  .tile[data-flagged="1"] { border-color:var(--f); }
  .tile header { display:flex; gap:8px; align-items:baseline; border-bottom:1px solid var(--b); padding:8px 10px; }
  .tile h3 { margin:0; font-size:14px; }
  .tile .meta { margin-left:auto; font-size:11px; }
  .tile .status { font-size:11px; color:var(--m); font-family:ui-monospace,monospace; }
  .tile .status[data-state="saved"] { color:var(--ok); } .tile .status[data-state="offline"]{ color:var(--f);} .tile .status[data-state="error"]{ color:var(--err);}
  .tile img { width:100%; display:block; image-rendering:pixelated; background:#000; max-height:320px; object-fit:contain; }
  .stats { display:grid; grid-template-columns:1fr 1fr; gap:4px 8px; font:11px ui-monospace,monospace; padding:8px 10px; border-top:1px solid var(--b); background:var(--hi); }
  .stats b { color:var(--m); font-weight:600; margin-right:6px; }
  .annotate { padding:8px 10px 10px; border-top:1px solid var(--b); background:var(--hi); }
  .chips { display:flex; flex-wrap:wrap; gap:6px; margin-bottom:8px; }
  .chip { display:inline-flex; align-items:center; gap:6px; border:1px solid var(--b); border-radius:999px; padding:3px 8px; font-size:11px; font-family:ui-monospace,monospace; background:var(--bg); cursor:pointer; }
  .chip input { appearance:none; width:10px; height:10px; border-radius:50%; border:1px solid var(--m); margin:0; }
  .chip input:checked { background:var(--f); border-color:var(--f); }
  .chip:has(input:checked) { border-color:var(--f); background:rgba(240,160,32,.12); }
  textarea { width:100%; border:1px solid var(--b); border-radius:6px; background:var(--bg); color:var(--t); font:12px ui-monospace,monospace; padding:6px 8px; min-height:42px; resize:vertical; }
  textarea:focus { outline:1px solid var(--a); border-color:var(--a); }
  body.only-flagged .tile[data-flagged="0"] { display:none; }
</style>
</head>
<body>
<header class="top">
  <h1>2D Asset Review</h1>
  <span class="meta">${tiles.length} assets · generated ${ts}</span>
  <span class="counts"><b data-counter>0</b> flagged / ${tiles.length}</span>
  <label class="toggle"><input type="checkbox" data-only-flagged> Show only flagged</label>
  <span class="conn" data-conn data-state="off">server: offline</span>
</header>
<main>
  <section class="model-box">
    <h2>Model Stats (from provenance)</h2>
    <table>
      <thead><tr><th>Provider / Model</th><th>Assets</th><th>Avg Latency</th><th>Total Cost</th></tr></thead>
      <tbody>${modelRows}</tbody>
    </table>
  </section>
  ${groupSections}
</main>
<script>
  const SERVER = '${SERVER}';
  const STORAGE = 'asset-review-2d-v1';
  const state = Object.create(null);
  try { Object.assign(state, JSON.parse(localStorage.getItem(STORAGE) || '{}')); } catch {}
  const counterEl = document.querySelector('[data-counter]');
  const connEl = document.querySelector('[data-conn]');
  const onlyFlaggedChk = document.querySelector('[data-only-flagged]');
  const bodyEl = document.body;

  function updateCounter() {
    counterEl.textContent = String(document.querySelectorAll('.tile[data-flagged="1"]').length);
  }
  function saveLocal() {
    try { localStorage.setItem(STORAGE, JSON.stringify(state)); } catch {}
  }
  function readTile(tile) {
    const chips = Array.from(tile.querySelectorAll('.chip input:checked')).map((el) => el.getAttribute('data-chip'));
    const note = tile.querySelector('textarea[data-note]').value.trim();
    return { chips, note };
  }
  async function push(asset, payload, statusEl) {
    try {
      const res = await fetch(SERVER + '/annotate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ asset, ...payload, ts: Date.now() }),
      });
      if (!res.ok) throw new Error('status ' + res.status);
      statusEl.setAttribute('data-state', 'saved');
      statusEl.textContent = 'saved';
      connEl.setAttribute('data-state', 'ok');
      connEl.textContent = 'server: live';
    } catch {
      statusEl.setAttribute('data-state', 'offline');
      statusEl.textContent = 'offline (local)';
      connEl.setAttribute('data-state', 'off');
      connEl.textContent = 'server: offline';
    }
  }
  function hydrateTile(tile) {
    const asset = tile.getAttribute('data-asset');
    const entry = state[asset];
    if (!entry) return;
    if (Array.isArray(entry.chips)) {
      for (const c of entry.chips) {
        const input = tile.querySelector('.chip input[data-chip="' + c + '"]');
        if (input) input.checked = true;
      }
    }
    if (typeof entry.note === 'string') {
      tile.querySelector('textarea[data-note]').value = entry.note;
    }
    const flagged = (entry.chips?.length || 0) > 0 || (entry.note || '').length > 0;
    tile.setAttribute('data-flagged', flagged ? '1' : '0');
  }
  function wireTile(tile) {
    const asset = tile.getAttribute('data-asset');
    const statusEl = tile.querySelector('[data-status]');
    let timer = null;
    const commit = () => {
      const payload = readTile(tile);
      state[asset] = payload;
      saveLocal();
      const flagged = payload.chips.length > 0 || payload.note.length > 0;
      tile.setAttribute('data-flagged', flagged ? '1' : '0');
      updateCounter();
      statusEl.textContent = 'saving...';
      push(asset, payload, statusEl);
    };
    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(commit, 220);
    };
    tile.querySelectorAll('.chip input').forEach((el) => el.addEventListener('change', schedule));
    tile.querySelector('textarea[data-note]').addEventListener('input', schedule);
  }
  async function pullServerState() {
    try {
      const res = await fetch(SERVER + '/issues.json');
      if (!res.ok) throw new Error('not-ok');
      const remote = await res.json();
      for (const [k, v] of Object.entries(remote || {})) {
        if (String(k).startsWith('2d:')) state[k] = v;
      }
      saveLocal();
      connEl.setAttribute('data-state', 'ok');
      connEl.textContent = 'server: live';
    } catch {
      connEl.setAttribute('data-state', 'off');
      connEl.textContent = 'server: offline';
    }
  }
  onlyFlaggedChk.addEventListener('change', () => {
    bodyEl.classList.toggle('only-flagged', onlyFlaggedChk.checked);
  });
  (async () => {
    await pullServerState();
    document.querySelectorAll('.tile[data-asset]').forEach((tile) => {
      hydrateTile(tile);
      wireTile(tile);
    });
    updateCounter();
  })();
</script>
</body>
</html>`;

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, html, 'utf-8');
console.log(`wrote ${relative(ROOT, OUT)}`);
console.log(`  ${tiles.length} tiles`);
