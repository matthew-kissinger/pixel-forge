/**
 * Provenance sidecar writer.
 *
 * Every generated asset (`*.png`, `*.webp`, `*.glb`) gets a sibling
 * `<asset>.provenance.json` that records how the file was produced. This is
 * the authoritative breadcrumb trail for:
 * - Agent introspection ("which model made this, on what prompt?")
 * - Reproducibility (seed + model + prompt hash)
 * - Morning review cross-reference (pair with `_review/issues.json` chips)
 *
 * Canonical shape:
 *
 * ```json
 * {
 *   "asset": "vc-forward-charge.png",
 *   "provider": "gemini",
 *   "model": "gemini-3.1-flash-image-preview",
 *   "prompt": "VC soldier, forward charge pose…",
 *   "promptHash": "sha1:d2…",
 *   "refs": [{ "path": "faction-sheet.png", "sha1": "…" }],
 *   "seed": 12345,
 *   "ts": "2026-04-23T11:45:22.143Z",
 *   "pipeline": "sprite",
 *   "latencyMs": 4821,
 *   "costUsd": 0.004,
 *   "warnings": [],
 *   "code": { "bytes": 4219, "sha1": "sha1:…" }
 * }
 * ```
 *
 * Keep the writer pure (no network), synchronous, and tolerant of partial
 * info — CLI scripts will call this right after their `writeFileSync(png)` /
 * `writeFileSync(glb)` step.
 */

import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { basename } from 'node:path';

export interface ProvenanceRefInfo {
  path: string;
  /** sha1 of file contents; use {@link hashContent} */
  sha1?: string;
}

export interface ProvenanceCodeInfo {
  bytes: number;
  sha1: string;
}

export interface ProvenanceInput {
  /** Which pipeline wrote the file (`sprite`, `icon`, `texture`, `glb`, `soldier-set`, `batch-glb`, …). */
  pipeline: string;
  /** Provider id (`gemini`, `openai`, `fal`, `anthropic`). */
  provider: string;
  /** Model id. */
  model: string;
  /** Original user prompt / description. Hashed too for cheap equality checks. */
  prompt?: string;
  refs?: ProvenanceRefInfo[];
  seed?: number;
  latencyMs?: number;
  costUsd?: number;
  warnings?: string[];
  /** For GLB pipelines: metadata about the Kiln source code. */
  code?: ProvenanceCodeInfo;
  /** Arbitrary extras the pipeline wants to record (e.g. `{ birefnetVariant: 'light-2k' }`). */
  extras?: Record<string, unknown>;
}

/** Compute `sha1:…` string for arbitrary content. Buffer or string. */
export function hashContent(content: Buffer | string): string {
  const hex = createHash('sha1').update(content).digest('hex');
  return `sha1:${hex}`;
}

/**
 * Write `<assetPath>.provenance.json` as a sibling to `assetPath`. Does not
 * overwrite the asset itself. Safe to call after a failed write (the sidecar
 * simply documents what was attempted).
 *
 * Returns the sidecar path so callers can log it.
 */
export function writeProvenance(
  assetPath: string,
  info: ProvenanceInput,
): string {
  const sidecar = `${assetPath}.provenance.json`;
  const payload = {
    asset: basename(assetPath),
    provider: info.provider,
    model: info.model,
    pipeline: info.pipeline,
    ts: new Date().toISOString(),
    ...(info.prompt !== undefined
      ? { prompt: info.prompt, promptHash: hashContent(info.prompt) }
      : {}),
    ...(info.refs && info.refs.length > 0 ? { refs: info.refs } : {}),
    ...(info.seed !== undefined ? { seed: info.seed } : {}),
    ...(info.latencyMs !== undefined ? { latencyMs: info.latencyMs } : {}),
    ...(info.costUsd !== undefined ? { costUsd: info.costUsd } : {}),
    ...(info.warnings && info.warnings.length > 0
      ? { warnings: info.warnings }
      : {}),
    ...(info.code ? { code: info.code } : {}),
    ...(info.extras ? { extras: info.extras } : {}),
  };
  writeFileSync(sidecar, JSON.stringify(payload, null, 2));
  return sidecar;
}
