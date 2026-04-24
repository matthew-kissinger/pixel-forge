#!/usr/bin/env bun
/**
 * Live health check for all configured API keys.
 * Reads ~/.config/mk-agent/env and the repo .env.local, probes each provider
 * with a cheap request, and prints a single-line verdict per provider.
 */
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const envFiles = [
  join(homedir(), '.config/mk-agent/env'),
  '.env.local',
  'packages/server/.env.local',
];
for (const f of envFiles) {
  if (!existsSync(f)) continue;
  for (const line of readFileSync(f, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    const [, k, raw] = m;
    const v = raw!.replace(/^['"]|['"]$/g, '').trim();
    if (!(k! in process.env) && v) process.env[k!] = v;
  }
}

async function anthropic(): Promise<string> {
  const k = process.env.ANTHROPIC_API_KEY;
  if (!k) return 'ANTHROPIC: MISSING';
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': k,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 8,
        messages: [{ role: 'user', content: 'ping' }],
      }),
    });
    const body = await r.text();
    if (r.ok) return `ANTHROPIC: OK (${r.status}, len=${k.length})`;
    return `ANTHROPIC: FAIL ${r.status} ${body.slice(0, 160)}`;
  } catch (e) {
    return `ANTHROPIC: ERROR ${(e as Error).message}`;
  }
}

async function openai(): Promise<string> {
  const k = process.env.OPENAI_API_KEY;
  if (!k) return 'OPENAI: MISSING';
  try {
    const r = await fetch('https://api.openai.com/v1/models', {
      headers: { authorization: `Bearer ${k}` },
    });
    if (!r.ok) {
      const body = await r.text();
      return `OPENAI: FAIL ${r.status} ${body.slice(0, 160)}`;
    }
    const j = (await r.json()) as { data: { id: string }[] };
    const ids = j.data.map((m) => m.id);
    const hasImage = ids.some((i) => i.includes('gpt-image'));
    return `OPENAI: OK (${ids.length} models, has_gpt-image=${hasImage})`;
  } catch (e) {
    return `OPENAI: ERROR ${(e as Error).message}`;
  }
}

async function gemini(): Promise<string> {
  const k = process.env.GEMINI_API_KEY;
  if (!k) return 'GEMINI: MISSING';
  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${k}`,
    );
    if (!r.ok) {
      const body = await r.text();
      return `GEMINI: FAIL ${r.status} ${body.slice(0, 160)}`;
    }
    const j = (await r.json()) as { models: { name: string }[] };
    const names = j.models.map((m) => m.name);
    const hasImagen = names.some((n) => /image/i.test(n));
    return `GEMINI: OK (${names.length} models, image_capable=${hasImagen})`;
  } catch (e) {
    return `GEMINI: ERROR ${(e as Error).message}`;
  }
}

async function fal(): Promise<string> {
  const k = process.env.FAL_KEY;
  if (!k) return 'FAL: MISSING';
  try {
    const r = await fetch('https://fal.run/fal-ai/fast-sdxl', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Key ${k}`,
      },
      body: JSON.stringify({ prompt: '', num_inference_steps: 1 }),
    });
    const body = await r.text();
    if (r.status === 401 || r.status === 403)
      return `FAL: AUTH_FAIL ${r.status} ${body.slice(0, 160)}`;
    if (r.status === 402 || r.status === 429)
      return `FAL: BALANCE/RATE ${r.status} ${body.slice(0, 160)}`;
    return `FAL: reachable ${r.status} ${body.slice(0, 120)}`;
  } catch (e) {
    return `FAL: ERROR ${(e as Error).message}`;
  }
}

const results = await Promise.all([anthropic(), openai(), gemini(), fal()]);
for (const r of results) console.log(r);
