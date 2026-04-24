#!/usr/bin/env bun
/**
 * Live model catalog probe for all four providers.
 *
 * Enumerates currently-available models per provider and emits:
 *   1. `docs/model-catalog-YYYY-MM-DD.md` — human-readable dated snapshot.
 *   2. `packages/core/src/providers/_catalog.generated.json` — machine-
 *      readable catalog `capabilities.ts` can import.
 *
 * Usage: `bun scripts/_model-audit.ts` (or `bun scripts/_model-audit.ts --quiet`).
 *
 * Why dated markdown + generated JSON:
 *  - Markdown is for humans skimming history.
 *  - JSON is the source of truth agents / the router read at runtime.
 *
 * Does NOT assume any key is present — providers without a key are recorded
 * as `{ ok: false, reason: 'no-key' }` so the output stays useful for
 * auditing even with partial credentials.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

// ---------------------------------------------------------------------------
// env-file loader (same behaviour as scripts/_key-health.ts)
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type ModelEntry = {
  id: string;
  kind?: 'text' | 'image' | 'video' | '3d' | 'audio' | 'unknown';
  notes?: string;
};

type ProviderResult =
  | { ok: true; live: true; models: ModelEntry[]; meta?: Record<string, unknown> }
  | { ok: true; live: false; models: ModelEntry[]; reason: string }
  | { ok: false; reason: string };

type CatalogSnapshot = {
  generatedAt: string;
  pixelforgeCommit?: string;
  providers: {
    anthropic: ProviderResult;
    openai: ProviderResult;
    gemini: ProviderResult;
    fal: ProviderResult;
  };
  curated: {
    kiln: { primary: string; fallback: string; notes: string };
    image: Array<{ label: string; provider: string; model: string; notes: string }>;
    bgRemoval: Array<{ label: string; provider: string; model: string; notes: string }>;
    texture: Array<{ label: string; provider: string; model: string; notes: string }>;
    image_to_3d: Array<{ label: string; provider: string; model: string; notes: string }>;
  };
};

// ---------------------------------------------------------------------------
// Probes
// ---------------------------------------------------------------------------
async function probeAnthropic(): Promise<ProviderResult> {
  const k = process.env['ANTHROPIC_API_KEY'];
  if (!k) return { ok: true, live: false, models: [], reason: 'no-key' };
  try {
    const r = await fetch('https://api.anthropic.com/v1/models?limit=200', {
      headers: {
        'x-api-key': k,
        'anthropic-version': '2023-06-01',
      },
    });
    if (!r.ok) {
      return { ok: false, reason: `HTTP ${r.status}: ${(await r.text()).slice(0, 200)}` };
    }
    const body = (await r.json()) as { data: Array<{ id: string; display_name?: string; type?: string }> };
    const models: ModelEntry[] = body.data
      .map((m) => ({ id: m.id, kind: 'text' as const, notes: m.display_name ?? '' }))
      .sort((a, b) => a.id.localeCompare(b.id));
    return { ok: true, live: true, models };
  } catch (e) {
    return { ok: false, reason: (e as Error).message };
  }
}

async function probeOpenAI(): Promise<ProviderResult> {
  const k = process.env['OPENAI_API_KEY'];
  if (!k) return { ok: true, live: false, models: [], reason: 'no-key' };
  try {
    const r = await fetch('https://api.openai.com/v1/models', {
      headers: { authorization: `Bearer ${k}` },
    });
    if (!r.ok) {
      return { ok: false, reason: `HTTP ${r.status}: ${(await r.text()).slice(0, 200)}` };
    }
    const body = (await r.json()) as { data: Array<{ id: string; object?: string }> };
    const keepers = body.data.filter((m) =>
      /^(gpt-image|dall-e|gpt-5|gpt-4\.1|gpt-4o|o3|o4|gpt-6)/i.test(m.id),
    );
    const models: ModelEntry[] = keepers
      .map((m) => ({
        id: m.id,
        kind: /image|dall-e/i.test(m.id) ? ('image' as const) : ('text' as const),
      }))
      .sort((a, b) => a.id.localeCompare(b.id));
    return { ok: true, live: true, models, meta: { totalModels: body.data.length } };
  } catch (e) {
    return { ok: false, reason: (e as Error).message };
  }
}

async function probeGemini(): Promise<ProviderResult> {
  const k = process.env['GEMINI_API_KEY'];
  if (!k) return { ok: true, live: false, models: [], reason: 'no-key' };
  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${k}`,
    );
    if (!r.ok) {
      return { ok: false, reason: `HTTP ${r.status}: ${(await r.text()).slice(0, 200)}` };
    }
    const body = (await r.json()) as {
      models: Array<{ name: string; supportedGenerationMethods?: string[]; description?: string }>;
    };
    const keepers = body.models.filter((m) =>
      /gemini|imagen|nano-banana|image|gemma/i.test(m.name),
    );
    const models: ModelEntry[] = keepers
      .map((m) => {
        const id = m.name.replace(/^models\//, '');
        const kind: ModelEntry['kind'] = /image|imagen|nano-banana/i.test(id)
          ? 'image'
          : 'text';
        return { id, kind, notes: m.description?.slice(0, 120) };
      })
      .sort((a, b) => a.id.localeCompare(b.id));
    return { ok: true, live: true, models, meta: { totalModels: body.models.length } };
  } catch (e) {
    return { ok: false, reason: (e as Error).message };
  }
}

/**
 * FAL has no single `/v1/models` endpoint — models live behind
 * `fal.run/<namespace>/<model>`. We cross-reference the curated list below
 * with the survey in docs/fal-models-2026-04.md (if present) and return
 * that as the "catalog" along with a reachability probe against the
 * lightweight `fast-sdxl` endpoint to confirm the key is live.
 */
async function probeFal(): Promise<ProviderResult> {
  const k = process.env['FAL_KEY'];
  if (!k) return { ok: true, live: false, models: [], reason: 'no-key' };

  const models: ModelEntry[] = [
    { id: 'fal-ai/flux-2/lora', kind: 'image', notes: 'FLUX 2 base + LoRA adapters (texture default)' },
    { id: 'fal-ai/birefnet/v2', kind: 'image', notes: 'BiRefNet v2 — matting / bg removal, variants: light, light-2k, heavy, matting, portrait, dynamic' },
    { id: 'fal-ai/bria/background/remove', kind: 'image', notes: 'Bria bg removal — fallback when BiRefNet flakes' },
    { id: 'fal-ai/recraft/v3/text-to-image', kind: 'image', notes: 'Recraft v3 — crisp illustrations, good for UI sprites' },
    { id: 'fal-ai/hunyuan3d-v3/image-to-3d', kind: '3d', notes: 'Hunyuan3D V3 — image→3D mesh' },
    { id: 'fal-ai/aura-sr', kind: 'image', notes: 'Aura SR — 4x upscale for sprite finishing' },
    { id: 'fal-ai/flux-lora', kind: 'image', notes: 'Legacy FLUX LoRA — keep as safety net; prefer flux-2/lora' },
    { id: 'fal-ai/fast-sdxl', kind: 'image', notes: 'SDXL turbo — cheap liveness probe' },
  ];

  try {
    const r = await fetch('https://fal.run/fal-ai/fast-sdxl', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Key ${k}` },
      body: JSON.stringify({ prompt: '', num_inference_steps: 1 }),
    });
    const reachable = r.status !== 401 && r.status !== 403;
    return {
      ok: true,
      live: reachable,
      models,
      meta: {
        probeStatus: r.status,
        reachable,
        note:
          'FAL exposes no enumerate-all endpoint; this list is curated from docs/fal-models-2026-04.md and maintained by the audit script.',
      },
    };
  } catch (e) {
    return { ok: false, reason: (e as Error).message };
  }
}

// ---------------------------------------------------------------------------
// Curated routing preferences
// ---------------------------------------------------------------------------
const CURATED: CatalogSnapshot['curated'] = {
  kiln: {
    primary: 'claude-opus-4-7',
    fallback: 'claude-sonnet-4-6',
    notes:
      'Opus 4.7 restored once claude-agent-sdk ^0.2.118 landed (adaptive thinking). Fallback via env KILN_MODEL=claude-sonnet-4-6.',
  },
  image: [
    {
      label: 'quality / refs',
      provider: 'openai',
      model: 'gpt-image-2',
      notes: 'Best for ref-image conditioning, faction style sheets, sharp sprites.',
    },
    {
      label: 'quality / text-only',
      provider: 'openai',
      model: 'gpt-image-1.5',
      notes: 'Clean transparent PNGs when we do not need refs.',
    },
    {
      label: 'quality / bulk',
      provider: 'gemini',
      model: 'gemini-3.1-flash-image-preview',
      notes: 'Nano Banana Pro (3.1). Preferred when we need consistent style across 20+ prompts.',
    },
    {
      label: 'cheap / bulk',
      provider: 'gemini',
      model: 'gemini-2.5-flash-image',
      notes: 'Cheaper sibling for high-volume bulk runs where quality ceiling is fine.',
    },
    {
      label: 'illustration fallback',
      provider: 'fal',
      model: 'fal-ai/recraft/v3/text-to-image',
      notes: 'Crisp illustration path when gpt-image / gemini are saturated.',
    },
  ],
  bgRemoval: [
    {
      label: 'default (matting)',
      provider: 'fal',
      model: 'fal-ai/birefnet/v2',
      notes: 'Variants: light | light-2k | heavy | matting | portrait | dynamic.',
    },
    {
      label: 'fallback',
      provider: 'fal',
      model: 'fal-ai/bria/background/remove',
      notes: 'Use when BiRefNet flakes on complex backgrounds.',
    },
  ],
  texture: [
    {
      label: 'default',
      provider: 'fal',
      model: 'fal-ai/flux-2/lora',
      notes: 'Migrated from fal-ai/flux-lora (legacy) per docs/fal-models-2026-04.md §1.',
    },
  ],
  image_to_3d: [
    {
      label: 'default',
      provider: 'fal',
      model: 'fal-ai/hunyuan3d-v3/image-to-3d',
      notes: 'Image→3D mesh; optional pathway for photoreal asset seeds.',
    },
  ],
};

// ---------------------------------------------------------------------------
// Emit
// ---------------------------------------------------------------------------
async function main(): Promise<void> {
  const quiet = process.argv.includes('--quiet');
  const [anthropic, openai, gemini, fal] = await Promise.all([
    probeAnthropic(),
    probeOpenAI(),
    probeGemini(),
    probeFal(),
  ]);

  const snapshot: CatalogSnapshot = {
    generatedAt: new Date().toISOString(),
    providers: { anthropic, openai, gemini, fal },
    curated: CURATED,
  };

  const jsonPath = resolve('packages/core/src/providers/_catalog.generated.json');
  mkdirSync(dirname(jsonPath), { recursive: true });
  writeFileSync(jsonPath, JSON.stringify(snapshot, null, 2) + '\n', 'utf-8');

  const date = snapshot.generatedAt.slice(0, 10);
  const mdPath = resolve(`docs/model-catalog-${date}.md`);
  mkdirSync(dirname(mdPath), { recursive: true });
  writeFileSync(mdPath, renderMarkdown(snapshot), 'utf-8');

  if (!quiet) {
    console.log(`wrote ${jsonPath}`);
    console.log(`wrote ${mdPath}`);
    for (const [name, r] of Object.entries(snapshot.providers) as [string, ProviderResult][]) {
      if (!r.ok) {
        console.log(`  ${name.padEnd(10)} ERROR: ${r.reason}`);
        continue;
      }
      if (!r.live) {
        console.log(`  ${name.padEnd(10)} offline (${r.reason})`);
        continue;
      }
      console.log(`  ${name.padEnd(10)} ${r.models.length} models live`);
    }
  }
}

function renderProviderSection(name: string, r: ProviderResult): string {
  const header = `### ${name}`;
  if (!r.ok) return `${header}\n\n- ERROR: ${r.reason}\n`;
  if (!r.live) return `${header}\n\n- offline (${r.reason})\n`;

  const meta = r.meta
    ? Object.entries(r.meta)
        .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
        .join(' ')
    : '';
  const lines: string[] = [header, ''];
  if (meta) lines.push(`- meta: ${meta}`);
  lines.push(`- ${r.models.length} model(s):`);
  lines.push('');
  lines.push('| id | kind | notes |');
  lines.push('| --- | --- | --- |');
  for (const m of r.models) {
    lines.push(
      `| \`${m.id}\` | ${m.kind ?? '-'} | ${(m.notes ?? '').replace(/\|/g, '\\|')} |`,
    );
  }
  lines.push('');
  return lines.join('\n');
}

function renderMarkdown(s: CatalogSnapshot): string {
  const out: string[] = [];
  out.push(`# Model catalog snapshot — ${s.generatedAt}`);
  out.push('');
  out.push(
    '> Generated by `scripts/_model-audit.ts`. Human reference only; the router reads `packages/core/src/providers/_catalog.generated.json`.',
  );
  out.push('');
  out.push('## Curated routing (hand-tuned)');
  out.push('');
  out.push('### Kiln (code gen)');
  out.push(`- primary: \`${s.curated.kiln.primary}\``);
  out.push(`- fallback: \`${s.curated.kiln.fallback}\``);
  out.push(`- notes: ${s.curated.kiln.notes}`);
  out.push('');
  for (const [group, rows] of [
    ['Image', s.curated.image],
    ['BG removal', s.curated.bgRemoval],
    ['Texture', s.curated.texture],
    ['Image→3D', s.curated.image_to_3d],
  ] as const) {
    out.push(`### ${group}`);
    out.push('');
    out.push('| label | provider | model | notes |');
    out.push('| --- | --- | --- | --- |');
    for (const r of rows) {
      out.push(
        `| ${r.label} | ${r.provider} | \`${r.model}\` | ${r.notes.replace(/\|/g, '\\|')} |`,
      );
    }
    out.push('');
  }

  out.push('## Live probe results');
  out.push('');
  out.push(renderProviderSection('Anthropic', s.providers.anthropic));
  out.push(renderProviderSection('OpenAI', s.providers.openai));
  out.push(renderProviderSection('Gemini', s.providers.gemini));
  out.push(renderProviderSection('FAL', s.providers.fal));
  return out.join('\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
