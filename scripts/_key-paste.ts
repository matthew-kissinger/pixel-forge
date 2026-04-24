#!/usr/bin/env bun
/**
 * Local-only single-page helper to paste an API key and persist it.
 *
 * - Binds to http://127.0.0.1:7801 (loopback only).
 * - Writes/updates KEY=VALUE in ~/.config/mk-agent/env (primary source).
 * - Mirrors into repo .env.local so child scripts pick it up without re-sourcing.
 * - Runs a live provider ping after save and shows the result in the page.
 * - Auto-opens the default browser.
 *
 * Usage:
 *   bun scripts/_key-paste.ts                 # defaults to FAL_KEY
 *   bun scripts/_key-paste.ts --key=OPENAI_API_KEY
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { homedir, platform } from 'node:os';
import { spawn } from 'node:child_process';

interface Args {
  key: string;
  port: number;
}

function parseArgs(): Args {
  let key = 'FAL_KEY';
  let port = 7801;
  for (const a of process.argv.slice(2)) {
    if (a.startsWith('--key=')) key = a.slice('--key='.length).trim();
    else if (a.startsWith('--port=')) port = Number(a.slice('--port='.length));
  }
  return { key, port };
}

function openBrowser(url: string): void {
  const p = platform();
  try {
    if (p === 'win32') {
      spawn('cmd', ['/c', 'start', '""', url], { detached: true, stdio: 'ignore' }).unref();
    } else if (p === 'darwin') {
      spawn('open', [url], { detached: true, stdio: 'ignore' }).unref();
    } else {
      spawn('xdg-open', [url], { detached: true, stdio: 'ignore' }).unref();
    }
  } catch {
    /* best-effort */
  }
}

function upsertEnv(path: string, key: string, value: string): void {
  mkdirSync(dirname(path), { recursive: true });
  let existing = '';
  if (existsSync(path)) existing = readFileSync(path, 'utf8');
  const re = new RegExp(`^\\s*${key}\\s*=.*$`, 'm');
  const line = `${key}=${value}`;
  let next: string;
  if (re.test(existing)) {
    next = existing.replace(re, line);
  } else {
    next = existing.length && !existing.endsWith('\n') ? `${existing}\n${line}\n` : `${existing}${line}\n`;
  }
  writeFileSync(path, next, 'utf8');
}

async function ping(key: string, value: string): Promise<{ ok: boolean; detail: string }> {
  try {
    if (key === 'FAL_KEY') {
      const r = await fetch('https://fal.run/fal-ai/fast-sdxl', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Key ${value}` },
        body: JSON.stringify({ prompt: '', num_inference_steps: 1 }),
      });
      const body = (await r.text()).slice(0, 240);
      if (r.status === 401 || r.status === 403) return { ok: false, detail: `AUTH_FAIL ${r.status}: ${body}` };
      if (r.status === 402) return { ok: false, detail: `BALANCE ${r.status}: ${body}` };
      return { ok: true, detail: `reachable ${r.status}: ${body}` };
    }
    if (key === 'OPENAI_API_KEY') {
      const r = await fetch('https://api.openai.com/v1/models', { headers: { authorization: `Bearer ${value}` } });
      return { ok: r.ok, detail: `${r.status} ${(await r.text()).slice(0, 160)}` };
    }
    if (key === 'GEMINI_API_KEY') {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${value}`);
      return { ok: r.ok, detail: `${r.status} ${(await r.text()).slice(0, 160)}` };
    }
    if (key === 'ANTHROPIC_API_KEY') {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': value, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 4, messages: [{ role: 'user', content: 'ping' }] }),
      });
      return { ok: r.ok, detail: `${r.status} ${(await r.text()).slice(0, 160)}` };
    }
    return { ok: true, detail: 'saved (no live probe for this key)' };
  } catch (e) {
    return { ok: false, detail: `ERROR ${(e as Error).message}` };
  }
}

const { key, port } = parseArgs();
const url = `http://127.0.0.1:${port}`;

const PAGE = (keyName: string): string => `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>pixel-forge · paste ${keyName}</title>
<style>
  :root { color-scheme: dark; }
  body { margin:0; font-family: ui-monospace, Menlo, Consolas, monospace; background:#0b0f17; color:#e6edf3; min-height:100vh; display:grid; place-items:center; }
  main { width:min(560px, 92vw); padding:28px 28px 24px; background:#111827; border:1px solid #1f2a3a; border-radius:12px; box-shadow:0 10px 40px rgba(0,0,0,.4); }
  h1 { margin:0 0 4px; font-size:18px; font-weight:600; letter-spacing:.2px; }
  p.sub { margin:0 0 18px; color:#8b9bb0; font-size:12px; }
  label { display:block; font-size:12px; color:#b6c2d1; margin:14px 0 6px; }
  input, select { width:100%; box-sizing:border-box; padding:10px 12px; border-radius:8px; border:1px solid #263347; background:#0b1220; color:#e6edf3; font:inherit; }
  input:focus, select:focus { outline:none; border-color:#3a82f7; }
  .row { display:flex; gap:8px; align-items:center; }
  button { margin-top:16px; padding:10px 14px; background:#2563eb; color:white; border:0; border-radius:8px; font:inherit; cursor:pointer; }
  button:disabled { opacity:.6; cursor:progress; }
  pre { margin-top:14px; padding:12px; background:#0b1220; border:1px solid #1f2a3a; border-radius:8px; font-size:12px; max-height:220px; overflow:auto; white-space:pre-wrap; word-break:break-word; }
  .ok { color:#4ade80; }
  .bad { color:#f87171; }
  .muted { color:#8b9bb0; font-size:11px; margin-top:12px; }
  code { background:#0b1220; padding:1px 4px; border-radius:4px; }
</style>
</head>
<body>
<main>
  <h1>Save API key locally</h1>
  <p class="sub">Writes to <code>~/.config/mk-agent/env</code> and mirrors to <code>.env.local</code>. Never sent anywhere but this loopback server.</p>

  <label for="keySel">Key name</label>
  <select id="keySel">
    <option ${keyName === 'FAL_KEY' ? 'selected' : ''}>FAL_KEY</option>
    <option ${keyName === 'OPENAI_API_KEY' ? 'selected' : ''}>OPENAI_API_KEY</option>
    <option ${keyName === 'GEMINI_API_KEY' ? 'selected' : ''}>GEMINI_API_KEY</option>
    <option ${keyName === 'ANTHROPIC_API_KEY' ? 'selected' : ''}>ANTHROPIC_API_KEY</option>
  </select>

  <label for="val">Value</label>
  <input id="val" type="password" autocomplete="off" spellcheck="false" placeholder="paste key here" />

  <div class="row">
    <button id="go">Save & test</button>
    <label class="muted" style="margin:0 0 0 8px; display:flex; align-items:center; gap:6px;"><input id="reveal" type="checkbox" style="width:auto" /> reveal</label>
  </div>

  <pre id="out" class="muted">waiting…</pre>
  <div class="muted">You can close this tab after a green result.</div>
</main>
<script>
  const val = document.getElementById('val');
  const reveal = document.getElementById('reveal');
  reveal.addEventListener('change', () => { val.type = reveal.checked ? 'text' : 'password'; });
  const go = document.getElementById('go');
  const out = document.getElementById('out');
  go.addEventListener('click', async () => {
    const key = document.getElementById('keySel').value;
    const value = val.value.trim();
    if (!value) { out.textContent = 'paste a value first'; out.className='bad'; return; }
    go.disabled = true; out.textContent = 'saving and pinging…'; out.className='muted';
    try {
      const r = await fetch('/save', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ key, value }) });
      const j = await r.json();
      out.textContent = JSON.stringify(j, null, 2);
      out.className = j.ok ? 'ok' : 'bad';
    } catch (e) { out.textContent = String(e); out.className='bad'; }
    go.disabled = false;
  });
  val.focus();
</script>
</body>
</html>`;

const userEnvPath = join(homedir(), '.config', 'mk-agent', 'env');
const repoEnvPath = join(process.cwd(), '.env.local');

Bun.serve({
  hostname: '127.0.0.1',
  port,
  async fetch(req): Promise<Response> {
    const u = new URL(req.url);
    if (u.pathname === '/' || u.pathname === '') {
      return new Response(PAGE(key), { headers: { 'content-type': 'text/html; charset=utf-8' } });
    }
    if (u.pathname === '/save' && req.method === 'POST') {
      const body = (await req.json()) as { key?: string; value?: string };
      const k = (body.key || '').trim();
      const v = (body.value || '').trim();
      if (!/^[A-Z_][A-Z0-9_]*$/.test(k) || !v) {
        return Response.json({ ok: false, detail: 'invalid key or empty value' }, { status: 400 });
      }
      try {
        upsertEnv(userEnvPath, k, v);
        upsertEnv(repoEnvPath, k, v);
      } catch (e) {
        return Response.json({ ok: false, detail: `write_failed: ${(e as Error).message}` }, { status: 500 });
      }
      const probe = await ping(k, v);
      console.log(`[key-paste] saved ${k} (len=${v.length}) → probe ok=${probe.ok}`);
      return Response.json({
        ok: probe.ok,
        key: k,
        length: v.length,
        wrote: [userEnvPath, repoEnvPath],
        probe: probe.detail,
      });
    }
    return new Response('not found', { status: 404 });
  },
});

console.log(`[key-paste] serving ${url} for ${key}`);
console.log(`[key-paste] writes to ${userEnvPath} and ${repoEnvPath}`);
openBrowser(url);
