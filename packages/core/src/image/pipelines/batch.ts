/**
 * Resumable batch wrapper over any `Pipeline<I, O>`.
 *
 * Distilled from the `existsSync(target)` skip pattern that appears in
 * 10+ scripts (`gen-ui-icons.ts`, `gen-nva-soldiers.ts`, etc.). When
 * Gemini hits rate limits at ~25-30 requests/min, scripts can rerun and
 * pick up where they stopped without regenerating completed assets.
 *
 * Features:
 * - `shouldSkip(input)` checks `getOutputPath(input)` exists.
 * - `run(inputs)` iterates with bounded concurrency (default 1), writes
 *   each result via the injected `fs.writeFile`.
 * - Per-input retry with exponential backoff for retryable errors —
 *   ProviderRateLimited, ProviderTimeout, ProviderNetworkError, or any
 *   `PixelForgeError` with `.retryable === true`.
 * - `onProgress(completed, total)` for live UIs.
 * - Filesystem is injectable for testability — pass `node:fs` defaults
 *   in production.
 *
 * Note on output writing: `fs.writeFile(path, data)` receives a `Buffer`
 * for image/glb pipelines. For pipelines that produce non-buffer output
 * (e.g. text), callers can post-process inside their own pipeline body.
 */

import { existsSync as nodeExistsSync } from 'node:fs';
import { writeFile as nodeWriteFile } from 'node:fs/promises';

import {
  PixelForgeError,
  isPixelForgeError,
} from '../../errors';
import { wrapStep } from './_common';
import type { BatchPipeline, Pipeline } from './types';

// =============================================================================
// Types
// =============================================================================

export interface BatchFs {
  existsSync(path: string): boolean;
  writeFile(path: string, data: Buffer): Promise<void>;
}

const DEFAULT_FS: BatchFs = {
  existsSync: nodeExistsSync,
  writeFile: async (p, d) => {
    await nodeWriteFile(p, d);
  },
};

export interface CreateBatchPipelineOptions<Input, Output> {
  pipeline: Pipeline<Input, Output>;
  /** How to derive the output path for an input — used by skip + write. */
  getOutputPath: (input: Input) => string;
  /**
   * How to extract the buffer to write to disk from the pipeline's output.
   * Defaults to `(o) => (o as { image: Buffer }).image` for image
   * pipelines. Pass an explicit function for `glb` (use `o.glb`) or
   * other shapes.
   */
  getOutputBuffer?: (output: Output) => Buffer;
  /** Injectable filesystem (defaults to node:fs). */
  fs?: BatchFs;
  /** Max concurrent in-flight pipeline runs. Default 1. */
  concurrency?: number;
  /** Callback invoked after each successful or skipped item. */
  onProgress?: (completed: number, total: number) => void;
  /** Max retry attempts on retryable errors. Default 3. */
  maxRetries?: number;
  /** Initial retry delay in ms. Doubles each attempt. Default 1_000. */
  retryDelayMs?: number;
  /**
   * Inject a sleep impl — defaults to `setTimeout`-based. Overridable so
   * tests can run instantly.
   */
  sleep?: (ms: number) => Promise<void>;
}

const DEFAULT_GET_OUTPUT_BUFFER = <Output>(o: Output): Buffer => {
  const maybeImage = (o as unknown as { image?: unknown }).image;
  if (Buffer.isBuffer(maybeImage)) return maybeImage;
  const maybeGlb = (o as unknown as { glb?: unknown }).glb;
  if (Buffer.isBuffer(maybeGlb)) return maybeGlb;
  throw new Error(
    'Batch pipeline could not auto-extract a Buffer; pass `getOutputBuffer` explicitly.'
  );
};

// =============================================================================
// Factory
// =============================================================================

/**
 * Wrap any pipeline in a resumable batch runner.
 *
 * Returns a `BatchPipeline<I, O>` whose `run([inputs])` produces an
 * array of outputs in input order. Skipped items get a placeholder
 * undefined cast so the slot order is preserved — runners that need a
 * dense array should filter on `.run` outputs.
 */
export function createBatchPipeline<Input, Output>(
  opts: CreateBatchPipelineOptions<Input, Output>
): BatchPipeline<Input, Output> {
  const fs = opts.fs ?? DEFAULT_FS;
  const concurrency = Math.max(1, opts.concurrency ?? 1);
  const maxRetries = opts.maxRetries ?? 3;
  const retryDelayMs = opts.retryDelayMs ?? 1_000;
  const getBuffer = opts.getOutputBuffer ?? DEFAULT_GET_OUTPUT_BUFFER;
  const sleep = opts.sleep ?? defaultSleep;

  const inner = opts.pipeline;
  const id = `batch:${inner.id}`;
  const description = `Resumable batch wrapper around '${inner.id}' — skips inputs whose output already exists.`;

  async function shouldSkip(input: Input): Promise<boolean> {
    return fs.existsSync(opts.getOutputPath(input));
  }

  async function processOne(input: Input): Promise<Output | undefined> {
    if (await shouldSkip(input)) return undefined;

    let attempt = 0;
    let delay = retryDelayMs;
    while (true) {
      attempt++;
      try {
        const out = await inner.run(input);
        const buf = getBuffer(out);
        await fs.writeFile(opts.getOutputPath(input), buf);
        return out;
      } catch (err) {
        const retryable = isRetryable(err);
        if (!retryable || attempt >= maxRetries) {
          throw wrapStep(id, 'process', err);
        }
        await sleep(delay);
        delay *= 2;
      }
    }
  }

  async function runAll(inputs: Input[]): Promise<Output[]> {
    const results: Array<Output | undefined> = new Array(inputs.length);
    let completed = 0;
    let cursor = 0;

    async function worker() {
      while (true) {
        const i = cursor++;
        if (i >= inputs.length) return;
        const input = inputs[i] as Input;
        results[i] = await processOne(input);
        completed++;
        opts.onProgress?.(completed, inputs.length);
      }
    }

    const workers: Promise<void>[] = [];
    const n = Math.min(concurrency, inputs.length);
    for (let i = 0; i < n; i++) workers.push(worker());
    await Promise.all(workers);

    // Skipped slots become `undefined` — coerce to Output for the
    // BatchPipeline<I, O> signature. Callers can `.filter(Boolean)` if
    // they want only fresh outputs.
    return results as Output[];
  }

  const batch: BatchPipeline<Input, Output> = {
    id,
    description,
    resumable: true as const,
    shouldSkip,
    run: runAll,
  };
  return batch;
}

// =============================================================================
// Internals
// =============================================================================

function isRetryable(err: unknown): boolean {
  if (isPixelForgeError(err)) return err.retryable;
  if (err instanceof PixelForgeError) return err.retryable;
  // Wrapped pipeline failures: peek at .underlying.retryable.
  const u = (err as { underlying?: unknown }).underlying;
  if (u && isPixelForgeError(u)) return u.retryable;
  return false;
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
