/**
 * Human-friendly + machine-readable output helpers shared by every command.
 *
 * Every command supports `--json`. When set, the output goes to stdout as
 * a single JSON line so agents can pipe it into `jq`. Otherwise we render
 * a short human-friendly summary.
 *
 * Errors flow through `printError` which always writes to stderr, prints
 * `.fixHint` from `PixelForgeError`, and exits with a non-zero code.
 */

import { isPixelForgeError } from '@pixel-forge/core';

/** Print a value as either machine-readable JSON or a human summary. */
export function printResult(result: unknown, opts: { json?: boolean }): void {
  if (opts.json) {
    process.stdout.write(`${JSON.stringify(result, jsonReplacer)}\n`);
    return;
  }
  if (typeof result === 'string') {
    process.stdout.write(`${result}\n`);
    return;
  }
  process.stdout.write(`${JSON.stringify(result, jsonReplacer, 2)}\n`);
}

/**
 * Replacer that turns Buffer / Uint8Array into a `{ type, byteLength }`
 * stub so `--json` output never accidentally dumps a megabyte of base64
 * into the terminal. Callers that need the bytes should write them to
 * disk first and reference the file path.
 */
function jsonReplacer(_key: string, value: unknown): unknown {
  if (Buffer.isBuffer(value)) {
    return { type: 'Buffer', byteLength: value.byteLength };
  }
  if (value instanceof Uint8Array) {
    return { type: 'Uint8Array', byteLength: value.byteLength };
  }
  return value;
}

/**
 * Print a structured error to stderr and exit non-zero. Always surfaces
 * `.fixHint` when available so agents pick up the next-step suggestion.
 */
export function printError(err: unknown): never {
  if (isPixelForgeError(err)) {
    const payload = {
      ok: false,
      code: err.code,
      message: err.message,
      ...(err.fixHint ? { fixHint: err.fixHint } : {}),
      retryable: err.retryable,
    };
    process.stderr.write(`error: ${err.code}: ${err.message}\n`);
    if (err.fixHint) process.stderr.write(`hint:  ${err.fixHint}\n`);
    process.stderr.write(`json:  ${JSON.stringify(payload)}\n`);
  } else if (err instanceof Error) {
    process.stderr.write(`error: ${err.message}\n`);
  } else {
    process.stderr.write(`error: ${String(err)}\n`);
  }
  process.exit(1);
}

/** Parse a comma-separated list of file paths into an array. Empty -> []. */
export function parseCsvList(input: string | undefined): string[] {
  if (!input) return [];
  return input
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}
