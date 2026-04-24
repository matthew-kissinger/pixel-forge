/**
 * Simple resumable batch runner built on directGenerate.
 * Replaces the `@pixel-forge/core` batch + GLB pipelines for the
 * overnight run (those depend on `@anthropic-ai/claude-agent-sdk`
 * which hangs in this environment).
 */

import { existsSync, writeFileSync } from 'node:fs';
import { writeProvenance, hashContent } from '@pixel-forge/core';
import { directGenerate } from './_direct-generate';

export interface DirectBatchItem {
  slug: string;
  prompt: string;
  /** Final on-disk destination for the GLB buffer. */
  outPath: string;
  /** Optional secondary destination (e.g. war-assets/validation/<x>.glb for audit grids). */
  auditPath?: string;
}

export interface DirectBatchOptions {
  model?: string;
  includeAnimation?: boolean;
  maxRetries?: number;
  label: string;
}

export interface DirectBatchResult {
  fresh: number;
  skipped: number;
  failed: string[];
  totalMs: number;
}

/**
 * Patterns from renderGLB's `inspectSceneStructure` / `inspectGeneratedAnimation`
 * output that we treat as a soft failure — the GLB renders, but we give the
 * model ONE chance to fix the flagged issue before accepting it.
 */
const STRUCTURAL_WARNING_PATTERNS = [
  /^Stray plane /,
  /^Floating parts /,
];

function extractStructuralWarnings(warnings: string[]): string[] {
  return warnings.filter((w) => STRUCTURAL_WARNING_PATTERNS.some((re) => re.test(w)));
}

async function runOne(
  item: DirectBatchItem,
  opts: DirectBatchOptions,
): Promise<'fresh' | 'skipped' | 'failed'> {
  if (existsSync(item.outPath)) return 'skipped';

  const maxRetries = opts.maxRetries ?? 2;
  let attempt = 0;
  let priorError: string | undefined;
  let priorCode: string | undefined;
  let priorWarnings: string[] | undefined;
  let softFailuresUsed = 0;
  while (attempt <= maxRetries) {
    attempt++;
    try {
      const t0 = Date.now();
      const result = await directGenerate(
        {
          prompt: item.prompt,
          mode: 'glb',
          category: 'prop',
          includeAnimation: opts.includeAnimation ?? true,
        },
        { model: opts.model, priorError, priorCode, priorWarnings },
      );
      const structural = extractStructuralWarnings(result.warnings);
      if (structural.length > 0 && softFailuresUsed === 0 && attempt <= maxRetries) {
        // Soft failure: render succeeded but scene is structurally wrong.
        // Feed warnings back once. Accept on second pass regardless to
        // avoid runaway retries.
        softFailuresUsed++;
        priorWarnings = structural;
        priorCode = result.code;
        priorError = undefined;
        console.warn(
          `  [${opts.label}] ${item.slug}: soft-fail on structural warnings, retrying once: ${structural.join(' | ').slice(0, 200)}`,
        );
        continue;
      }
      writeFileSync(item.outPath, result.glb);
      if (item.auditPath) writeFileSync(item.auditPath, result.glb);
      const elapsed = Date.now() - t0;
      const modelUsed =
        opts.model ??
        process.env['KILN_MODEL'] ??
        process.env['PIXEL_FORGE_MODEL'] ??
        'claude-opus-4-7';
      const provenance = {
        pipeline: 'batch-glb' as const,
        provider: 'anthropic',
        model: modelUsed,
        prompt: item.prompt,
        latencyMs: elapsed,
        warnings: result.warnings,
        code: {
          bytes: result.code.length,
          sha1: hashContent(result.code),
        },
        extras: {
          slug: item.slug,
          batch: opts.label,
          attempts: attempt,
          softFailuresUsed,
          structuralWarnings: structural,
          ...(result.meta.tris !== undefined ? { tris: result.meta.tris } : {}),
          ...(result.meta.primitiveUsage
            ? { primitiveUsage: result.meta.primitiveUsage }
            : {}),
        },
      };
      writeProvenance(item.outPath, provenance);
      if (item.auditPath) writeProvenance(item.auditPath, provenance);
      const elapsedStr = (elapsed / 1000).toFixed(1);
      const flags: string[] = [];
      if (priorError) flags.push('self-corrected');
      if (softFailuresUsed > 0 && structural.length === 0) flags.push('structure-fixed');
      if (structural.length > 0) flags.push(`FLAGGED: ${structural.length} structural`);
      const tag = flags.length ? ` (${flags.join(', ')})` : '';
      console.log(
        `  [${opts.label}] ${item.slug}: ${(result.glb.length / 1024).toFixed(1)}KB, ${result.meta.tris} tris, ${elapsedStr}s${tag}`,
      );
      return 'fresh';
    } catch (err) {
      const fullMsg = (err as Error).message;
      const msg = fullMsg.slice(0, 200);
      console.warn(
        `  [${opts.label}] ${item.slug}: attempt ${attempt}/${maxRetries + 1} failed: ${msg}`,
      );
      priorError = fullMsg.slice(0, 800);
      priorCode = (err as Error & { priorCode?: string }).priorCode;
      priorWarnings = undefined;
      if (attempt > maxRetries) {
        return 'failed';
      }
      await new Promise((r) => setTimeout(r, 2_000 * attempt));
    }
  }
  return 'failed';
}

export async function directBatchRun(
  items: DirectBatchItem[],
  opts: DirectBatchOptions,
): Promise<DirectBatchResult> {
  const t0 = Date.now();
  console.log(`=== [${opts.label}] Generating ${items.length} GLBs ===`);

  let fresh = 0;
  let skipped = 0;
  const failed: string[] = [];

  for (const [i, item] of items.entries()) {
    const status = await runOne(item, opts);
    if (status === 'fresh') fresh++;
    else if (status === 'skipped') skipped++;
    else failed.push(item.slug);
    console.log(`  [${i + 1}/${items.length}] ${item.slug}: ${status}`);
  }

  const totalMs = Date.now() - t0;
  console.log(
    `=== [${opts.label}] Done in ${(totalMs / 1000).toFixed(1)}s: fresh=${fresh} skipped=${skipped} failed=${failed.length} ===`,
  );
  if (failed.length) console.log(`  Failed: ${failed.join(', ')}`);

  return { fresh, skipped, failed, totalMs };
}
