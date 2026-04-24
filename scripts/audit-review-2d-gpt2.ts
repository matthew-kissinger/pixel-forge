#!/usr/bin/env bun
/**
 * Build a review page for GPT-Image-2 A/B 2D outputs (vegetation + textures).
 *
 * Output:
 *   war-assets/_review/review-2d-gpt2.html
 *
 * Uses the same annotation backend as GLB review:
 *   GET  /issues.json
 *   POST /annotate
 * via scripts/review-server.ts.
 */

import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

const VEG_DIR = 'war-assets/_review/gpt2-ab/vegetation';
const TEX_DIR = 'war-assets/_review/gpt2-ab/textures';
const OUT = 'war-assets/_review/review-2d-gpt2.html';

const CHIPS = ['style', 'seam', 'readability', 'palette', 'overprocessed', 'keep'] as const;

interface Tile {
  id: string;
  title: string;
  group: 'vegetation' | 'texture';
  file: string;
  size: string;
  b64: string;
}

function kb(n: number): string {
  return `${(n / 1024).toFixed(1)} KB`;
}
function titleCase(s: string): string {
  return s.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

const tiles: Tile[] = [];
for (const [group, dir] of [
  ['vegetation', VEG_DIR],
  ['texture', TEX_DIR],
] as const) {
  if (!existsSync(dir)) continue;
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.png')).sort()) {
    const p = join(dir, f);
    tiles.push({
      id: `ab2d:${group}:${f.replace(/\.png$/i, '')}`,
      title: titleCase(f.replace(/\.png$/i, '')),
      group,
      file: p,
      size: kb(statSync(p).size),
      b64: readFileSync(p).toString('base64'),
    });
  }
}

if (tiles.length === 0) {
  console.error('no gpt2-ab pngs found; run gen-vegetation-gpt2-ab.ts / gen-textures-gpt2-ab.ts first');
  process.exit(1);
}

const chipsHtml = CHIPS.map((c) => `<label class="chip"><input type="checkbox" data-chip="${c}"><span>${c}</span></label>`).join('');
const cards = tiles
  .map((t) => `
<section data-asset="${t.id}" data-flagged="0">
  <header>
    <h2>${t.title}</h2>
    <span class="meta">${t.group} · ${t.size}</span>
    <span class="status" data-status></span>
  </header>
  <img loading="lazy" alt="${t.title}" src="data:image/png;base64,${t.b64}">
  <div class="annotate">
    <div class="chips">${chipsHtml}</div>
    <textarea rows="2" data-note placeholder="Notes (optional)"></textarea>
  </div>
</section>`)
  .join('\n');

const now = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>2D GPT-Image-2 A/B Review</title>
<style>
  :root { color-scheme: dark; --bg:#0e0f11; --panel:#1a1c20; --hi:#23262c; --b:#2a2d33; --t:#e6e7ea; --m:#9aa0a8; --a:#6ea8fe; --f:#f0a020; --ok:#58c27d; --err:#e35d5d; }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--bg); color:var(--t); font-family:'Segoe UI',system-ui,sans-serif; }
  header.top { position:sticky; top:0; z-index:10; display:flex; gap:16px; align-items:center; flex-wrap:wrap; padding:14px 22px; border-bottom:1px solid var(--b); background:var(--panel); }
  h1 { margin:0; font-size:19px; }
  .meta,.conn,.counts { font-size:12px; color:var(--m); font-family:ui-monospace,monospace; }
  .counts b { color:var(--f); }
  .conn[data-state="ok"] { color:var(--ok); } .conn[data-state="off"] { color:var(--err); }
  main { padding:18px 22px; display:grid; grid-template-columns:repeat(auto-fit,minmax(340px,1fr)); gap:16px; }
  section { border:1px solid var(--b); border-radius:8px; overflow:hidden; background:var(--panel); }
  section[data-flagged="1"] { border-color:var(--f); }
  section header { display:flex; align-items:baseline; gap:10px; padding:10px 12px; border-bottom:1px solid var(--b); }
  section h2 { margin:0; font-size:15px; }
  section .meta { margin-left:auto; }
  section .status { font-size:11px; color:var(--m); font-family:ui-monospace,monospace; }
  section .status[data-state="saved"] { color:var(--ok); } section .status[data-state="offline"]{ color:var(--f);} section .status[data-state="error"]{ color:var(--err);}
  section img { width:100%; display:block; image-rendering: pixelated; background:#000; }
  .annotate { padding:10px 12px 12px; border-top:1px solid var(--b); background:var(--hi); }
  .chips { display:flex; flex-wrap:wrap; gap:6px; margin-bottom:8px; }
  .chip { display:inline-flex; align-items:center; gap:6px; border:1px solid var(--b); border-radius:999px; padding:3px 9px; font-size:11px; font-family:ui-monospace,monospace; background:var(--bg); cursor:pointer; }
  .chip input { appearance:none; width:10px; height:10px; border-radius:50%; border:1px solid var(--m); margin:0; }
  .chip input:checked { background:var(--f); border-color:var(--f); }
  .chip:has(input:checked) { border-color:var(--f); background:rgba(240,160,32,.12); }
  textarea { width:100%; border:1px solid var(--b); border-radius:6px; background:var(--bg); color:var(--t); font:12px ui-monospace,monospace; padding:7px 9px; min-height:42px; resize:vertical; }
  textarea:focus { outline:1px solid var(--a); border-color:var(--a); }
</style>
</head>
<body>
<header class="top">
  <h1>2D GPT-Image-2 A/B Review</h1>
  <span class="meta">${tiles.length} PNGs · ${now}</span>
  <span class="counts"><b data-counter>0</b> flagged / ${tiles.length}</span>
  <span class="conn" data-conn data-state="off">server: offline</span>
</header>
<main>${cards}</main>
<script>
  const SERVER='http://127.0.0.1:7802';
  const STORAGE='review-2d-gpt2-v1';
  const state=Object.create(null); try{Object.assign(state,JSON.parse(localStorage.getItem(STORAGE)||'{}'));}catch{}
  const connEl=document.querySelector('[data-conn]'); const counterEl=document.querySelector('[data-counter]');
  function updateCounter(){ counterEl.textContent=String(document.querySelectorAll('section[data-flagged="1"]').length); }
  function saveLocal(){ try{localStorage.setItem(STORAGE, JSON.stringify(state));}catch{} }
  function readSection(sec){ return { chips:[...sec.querySelectorAll('.chip input:checked')].map(x=>x.getAttribute('data-chip')), note:sec.querySelector('[data-note]').value.trim() }; }
  async function push(asset, payload, statusEl){
    try{
      const res=await fetch(SERVER+'/annotate',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({asset,...payload,ts:Date.now()})});
      if(!res.ok) throw new Error('status '+res.status);
      statusEl.setAttribute('data-state','saved'); statusEl.textContent='saved';
      connEl.setAttribute('data-state','ok'); connEl.textContent='server: live';
    }catch{
      statusEl.setAttribute('data-state','offline'); statusEl.textContent='offline (local)';
      connEl.setAttribute('data-state','off'); connEl.textContent='server: offline';
    }
  }
  function wire(sec){
    const asset=sec.getAttribute('data-asset'); const statusEl=sec.querySelector('[data-status]');
    const hydrate = state[asset];
    if(hydrate){
      if(Array.isArray(hydrate.chips)){ for(const c of hydrate.chips){ const el=sec.querySelector('.chip input[data-chip="'+c+'"]'); if(el) el.checked=true; } }
      if(typeof hydrate.note==='string') sec.querySelector('[data-note]').value=hydrate.note;
      const flagged=(hydrate.chips?.length||0)>0 || (hydrate.note||'').length>0; sec.setAttribute('data-flagged', flagged?'1':'0');
    }
    let t=null;
    const schedule=()=>{ clearTimeout(t); t=setTimeout(()=>{ const payload=readSection(sec); state[asset]=payload; saveLocal(); const flagged=payload.chips.length>0||payload.note.length>0; sec.setAttribute('data-flagged', flagged?'1':'0'); updateCounter(); statusEl.textContent='saving...'; push(asset,payload,statusEl); }, 220); };
    sec.querySelectorAll('.chip input').forEach(el=>el.addEventListener('change', schedule));
    sec.querySelector('[data-note]').addEventListener('input', schedule);
  }
  async function pull(){
    try{
      const res=await fetch(SERVER+'/issues.json'); if(!res.ok) throw new Error('not-ok');
      const remote=await res.json();
      for(const [k,v] of Object.entries(remote||{})){ if(String(k).startsWith('ab2d:')) state[k]=v; }
      saveLocal(); connEl.setAttribute('data-state','ok'); connEl.textContent='server: live';
    }catch{}
  }
  (async()=>{ await pull(); document.querySelectorAll('section[data-asset]').forEach(wire); updateCounter(); })();
</script>
</body></html>`;

writeFileSync(OUT, html);
console.log(`wrote ${OUT}`);
console.log(`  ${tiles.length} tiles`);

const shouldServe = process.argv.includes('--serve');
const shouldOpen = process.argv.includes('--open') || shouldServe;

if (shouldServe) {
  const srv = spawn('bun', ['scripts/review-server.ts'], { detached: true, stdio: 'inherit' });
  srv.unref();
}
if (shouldOpen) {
  const target = shouldServe ? 'http://127.0.0.1:7802/review-2d.html' : join(process.cwd(), OUT);
  const platform = process.platform;
  const cmd = platform === 'win32'
    ? ['cmd', ['/c', 'start', '', target]]
    : platform === 'darwin'
      ? ['open', [target]]
      : ['xdg-open', [target]];
  spawn(cmd[0] as string, cmd[1] as string[], { detached: true, stdio: 'ignore' }).unref();
  console.log(`opening ${target}`);
}
