/**
 * Helpers for shaping MCP tool responses.
 *
 * Strategy for binary payloads (images, GLBs):
 *   - DEFAULT: write the bytes to a tmp file and return `{ path, sizeBytes, meta }`.
 *     Agents read the file via their own Read tool — keeps MCP message size
 *     small (no megabyte base64 payloads in protocol traffic).
 *   - When the caller passes `inline: true`, return base64 inside `data` instead.
 *
 * Strategy for errors:
 *   - Catch `PixelForgeError`, surface `code` + `message` + `fixHint` + `retryable`
 *     in `structuredContent`. Set `isError: true` so MCP clients render
 *     prominently. Agents can read `fixHint` and decide what to do next.
 */

import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';

import { isPixelForgeError } from '@pixel-forge/core';

export interface BinaryResultOptions {
  /** When true, return base64 in `data` instead of a tmp path. */
  inline?: boolean;
  /** Override the output path. When unset, a tmp path is generated. */
  outPath?: string;
  /** File extension used when generating a tmp path. Default `.bin`. */
  extension?: string;
}

export interface BinaryResultStructured {
  ok: true;
  path?: string;
  sizeBytes: number;
  data?: string; // base64
  inline: boolean;
}

/**
 * Persist a Buffer either to disk (default) or inline (base64). Always
 * returns the structured payload for `structuredContent`. Caller wraps
 * with `text` content separately.
 */
export function persistBinary(
  buf: Buffer,
  opts: BinaryResultOptions & { extension?: string } = {},
): BinaryResultStructured {
  if (opts.inline) {
    return {
      ok: true,
      sizeBytes: buf.byteLength,
      data: buf.toString('base64'),
      inline: true,
    };
  }
  const path = opts.outPath
    ? resolve(opts.outPath)
    : join(
        mkdtempSync(join(tmpdir(), 'pixelforge-')),
        `${randomUUID()}${opts.extension ?? '.bin'}`,
      );
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, buf);
  return { ok: true, path, sizeBytes: buf.byteLength, inline: false };
}

/**
 * Translate any thrown value into an MCP `CallToolResult`-shaped object.
 * Surfaces `PixelForgeError` taxonomy fields verbatim so agents can act
 * on them without parsing prose.
 */
export function errorToToolResult(err: unknown): {
  content: Array<{ type: 'text'; text: string }>;
  structuredContent: Record<string, unknown>;
  isError: true;
} {
  if (isPixelForgeError(err)) {
    const payload = {
      ok: false,
      code: err.code,
      message: err.message,
      ...(err.fixHint ? { fixHint: err.fixHint } : {}),
      retryable: err.retryable,
    };
    const text =
      `error: ${err.code}: ${err.message}` +
      (err.fixHint ? `\nhint: ${err.fixHint}` : '');
    return {
      content: [{ type: 'text', text }],
      structuredContent: payload,
      isError: true,
    };
  }
  const message = err instanceof Error ? err.message : String(err);
  return {
    content: [{ type: 'text', text: `error: ${message}` }],
    structuredContent: { ok: false, code: 'UNKNOWN_ERROR', message },
    isError: true,
  };
}
