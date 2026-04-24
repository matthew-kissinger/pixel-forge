/**
 * OpenAI image provider (`ImageProvider`).
 *
 * Dual-model internal routing per [docs/gpt-image-2-investigation.md]:
 * - Text-only `generate()`       → `gpt-image-1.5` via `images.generate()`
 * - Multi-ref `editWithRefs()`   → `gpt-image-2` via `images.edit()` (up to 16 refs)
 *
 * Hard rules distilled from the investigation:
 * - NEVER send `background: "transparent"` — gpt-image-2 400s on it; we
 *   generate on solid chroma (magenta/blue) and strip via BiRefNet + chroma
 *   cleanup anyway.
 * - NEVER send `input_fidelity` — gpt-image-2 always high-fidelity.
 * - Timeout 180s (gpt-image-2 runs 100-110s).
 * - On 5xx / timeout with gpt-image-2, fall back to gpt-image-1.5 once.
 * - Response format: base64 (extract `b64_json` into a Buffer).
 *
 * SDK error translation uses the core taxonomy — see `translateError()`.
 */

import OpenAI, {
  APIConnectionError,
  APIConnectionTimeoutError,
  APIUserAbortError,
  AuthenticationError,
  BadRequestError as OpenAIBadRequestError,
  InternalServerError,
  PermissionDeniedError,
  RateLimitError,
  toFile,
} from 'openai';

import { capabilitiesFor, type ProviderCapabilities } from '../capabilities';
import {
  ProviderAuthFailed,
  ProviderCapabilityMismatch,
  ProviderNetworkError,
  ProviderRateLimited,
  ProviderTimeout,
} from '../errors';
import type {
  ImageEditInput,
  ImageGenerateInput,
  ImageGenerateOutput,
} from '../schemas/image';
import type { ImageProvider } from './types';

// =============================================================================
// Constants
// =============================================================================

/**
 * Text-to-image default (`gpt-image-1.5`). Override with env
 * `OPENAI_TEXT_MODEL` for A/B testing.
 */
const MODEL_TEXT = process.env['OPENAI_TEXT_MODEL'] ?? 'gpt-image-1.5';

/**
 * Multi-ref / hero default (`gpt-image-2`). Override with env
 * `OPENAI_HERO_MODEL` (e.g. the dated `gpt-image-2-2026-04-21` snapshot) to
 * pin hero runs without touching pipeline code.
 */
const MODEL_REFS = process.env['OPENAI_HERO_MODEL'] ?? 'gpt-image-2';

const DEFAULT_TIMEOUT_MS = 180_000;
const DEFAULT_SIZE = '1024x1024';

// =============================================================================
// Factory
// =============================================================================

export interface OpenAIProviderOptions {
  /** Override the text-to-image model. Default `gpt-image-1.5`. */
  textModel?: string;
  /** Override the multi-ref (edit) model. Default `gpt-image-2`. */
  refsModel?: string;
  /** Per-call timeout in ms. Default 180_000. */
  timeoutMs?: number;
  /**
   * Disable the `gpt-image-2` → `gpt-image-1.5` fallback on 5xx/timeout.
   * Default false (fallback enabled).
   */
  disableFallback?: boolean;
}

/**
 * Create an OpenAI `ImageProvider`. Resolves the API key from
 * `OPENAI_API_KEY` when not passed. Throws {@link ProviderAuthFailed} at
 * factory-time on a missing key.
 */
export function createOpenAIProvider(
  apiKey?: string,
  opts: OpenAIProviderOptions = {},
): ImageProvider {
  const key = apiKey ?? process.env['OPENAI_API_KEY'];
  if (!key) {
    throw new ProviderAuthFailed({
      provider: 'openai',
      envVar: 'OPENAI_API_KEY',
      message: 'OPENAI_API_KEY is not set.',
    });
  }

  const caps = capabilitiesFor('openai');
  if (!caps) {
    throw new ProviderCapabilityMismatch({
      provider: 'openai',
      requirement: 'image',
      message: 'OpenAI provider capabilities are not registered.',
    });
  }

  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const textModel = opts.textModel ?? MODEL_TEXT;
  const refsModel = opts.refsModel ?? MODEL_REFS;
  const fallbackEnabled = !opts.disableFallback;

  const client = new OpenAI({
    apiKey: key,
    timeout: timeoutMs,
    maxRetries: 0, // we wrap in our own retry at the facade layer
  });

  return {
    id: 'openai',
    capabilities: caps,

    async generate(input: ImageGenerateInput): Promise<ImageGenerateOutput> {
      const model = input.model ?? textModel;
      const start = Date.now();

      const params = buildGenerateParams(model, input);
      try {
        const response = (await client.images.generate(params)) as {
          data?: Array<{ b64_json?: string }> | null;
        };
        return toOutput(response, model, start, caps);
      } catch (err) {
        throw translateError(err);
      }
    },

    async editWithRefs(input: ImageEditInput): Promise<ImageGenerateOutput> {
      const primary = input.model ?? refsModel;
      const start = Date.now();

      // Capability guard
      const cap = caps.models.find((m) => m.id === primary);
      const maxRefs = cap?.maxRefs ?? 16;
      if (input.refs.length > maxRefs) {
        throw new ProviderCapabilityMismatch({
          provider: 'openai',
          requirement: `refs<=${maxRefs}`,
          message: `${primary} accepts at most ${maxRefs} refs; got ${input.refs.length}.`,
        });
      }

      const run = async (modelId: string): Promise<ImageGenerateOutput> => {
        const refs = await Promise.all(
          input.refs.map((buf, i) =>
            toFile(buf, `ref-${i}.png`, { type: 'image/png' }),
          ),
        );
        const params = buildEditParams(modelId, input, refs);
        const response = (await client.images.edit(params)) as {
          data?: Array<{ b64_json?: string }> | null;
        };
        return toOutput(response, modelId, start, caps);
      };

      try {
        return await run(primary);
      } catch (err) {
        if (fallbackEnabled && primary === MODEL_REFS && shouldFallback(err)) {
          // One attempt at gpt-image-1.5
          try {
            const out = await run(MODEL_TEXT);
            out.meta.warnings.push(
              `Primary model ${primary} failed; fell back to ${MODEL_TEXT}.`,
            );
            return out;
          } catch (secondary) {
            throw translateError(secondary);
          }
        }
        throw translateError(err);
      }
    },
  };
}

// =============================================================================
// Parameter builders
// =============================================================================

type ImageGenerateParams = Parameters<OpenAI['images']['generate']>[0];
type ImageEditParams = Parameters<OpenAI['images']['edit']>[0];

function buildGenerateParams(
  model: string,
  input: ImageGenerateInput,
): ImageGenerateParams {
  // Sprite defaults — see docs/gpt-image-2-investigation.md §5.
  const quality = mapQuality(input.quality);
  const sizeTuple = pickSize(input.dimensions);
  const params: Record<string, unknown> = {
    model,
    prompt: input.prompt,
    size: sizeTuple,
    n: 1,
    quality,
    moderation: 'low',
    output_format: 'png',
    background: 'opaque',
  };
  // gpt-image-2 rejects input_fidelity entirely; our zod schema doesn't carry
  // it at all, so no-op in practice. Kept here as a structural reminder.
  if (model === MODEL_REFS) delete params['input_fidelity'];
  return params as unknown as ImageGenerateParams;
}

function buildEditParams(
  model: string,
  input: ImageEditInput,
  refs: Awaited<ReturnType<typeof toFile>>[],
): ImageEditParams {
  const quality = mapQuality(input.quality);
  const sizeTuple = pickSize(input.dimensions);
  const params: Record<string, unknown> = {
    model,
    image: refs,
    prompt: input.prompt,
    size: sizeTuple,
    n: 1,
    quality,
    // background — omit for edit path; gpt-image-2 ignores/400s on some values.
  };
  if (model === MODEL_REFS) delete params['input_fidelity'];
  return params as unknown as ImageEditParams;
}

function mapQuality(
  q: ImageGenerateInput['quality'] | undefined,
): 'high' | 'medium' | 'low' | 'auto' {
  return q ?? 'high';
}

function pickSize(
  dims: ImageGenerateInput['dimensions'] | undefined,
): '1024x1024' | '1536x1024' | '1024x1536' | 'auto' {
  if (!dims) return DEFAULT_SIZE;
  const { width, height } = dims;
  if (width === height) return '1024x1024';
  if (width > height) return '1536x1024';
  return '1024x1536';
}

// =============================================================================
// Response translation
// =============================================================================

function toOutput(
  response: { data?: Array<{ b64_json?: string }> | undefined | null },
  modelId: string,
  startMs: number,
  caps: ProviderCapabilities,
): ImageGenerateOutput {
  const b64 = response.data?.[0]?.b64_json;
  if (!b64) {
    throw new ProviderNetworkError({
      provider: 'openai',
      message: 'OpenAI response contained no b64_json image payload.',
    });
  }
  const image = Buffer.from(b64, 'base64');
  return {
    image,
    provider: 'openai',
    model: modelId,
    meta: {
      latencyMs: Date.now() - startMs,
      costUsd: estimateCost(caps, modelId),
      warnings: [],
    },
  };
}

function estimateCost(
  caps: ProviderCapabilities,
  modelId: string,
): number | undefined {
  return caps.models.find((m) => m.id === modelId)?.pricePerImage;
}

// =============================================================================
// Error translation / fallback policy
// =============================================================================

function shouldFallback(err: unknown): boolean {
  if (err instanceof InternalServerError) return true;
  if (err instanceof APIConnectionTimeoutError) return true;
  if (err instanceof APIConnectionError) return true;
  // Surface timeouts of our own as fall-back-eligible too.
  if (err instanceof ProviderTimeout) return true;
  if (err instanceof ProviderNetworkError) return true;
  return false;
}

function translateError(err: unknown): Error {
  if (
    err instanceof ProviderRateLimited ||
    err instanceof ProviderAuthFailed ||
    err instanceof ProviderTimeout ||
    err instanceof ProviderNetworkError ||
    err instanceof ProviderCapabilityMismatch
  ) {
    return err;
  }

  if (err instanceof RateLimitError) {
    const headers = err.headers as unknown as
      | { get?: (key: string) => string | null }
      | Record<string, string | string[] | undefined>
      | undefined;
    let headerValue: string | undefined;
    if (headers && typeof (headers as { get?: unknown }).get === 'function') {
      const v = (headers as { get: (k: string) => string | null }).get('retry-after');
      headerValue = v ?? undefined;
    } else if (headers) {
      const rec = headers as Record<string, string | string[] | undefined>;
      const raw = rec['retry-after'] ?? rec['Retry-After'];
      headerValue = Array.isArray(raw) ? raw[0] : raw;
    }
    const retryAfterSec = headerValue
      ? Number.parseInt(headerValue, 10)
      : undefined;
    return new ProviderRateLimited({
      provider: 'openai',
      message: err.message,
      ...(retryAfterSec && !Number.isNaN(retryAfterSec)
        ? { retryAfterSec }
        : {}),
      cause: err,
    });
  }

  if (err instanceof AuthenticationError || err instanceof PermissionDeniedError) {
    return new ProviderAuthFailed({
      provider: 'openai',
      envVar: 'OPENAI_API_KEY',
      message: err.message,
      cause: err,
    });
  }

  if (err instanceof APIConnectionTimeoutError || err instanceof APIUserAbortError) {
    return new ProviderTimeout({
      provider: 'openai',
      message: err.message,
      cause: err,
    });
  }

  if (err instanceof APIConnectionError) {
    return new ProviderNetworkError({
      provider: 'openai',
      message: err.message,
      cause: err,
    });
  }

  if (err instanceof InternalServerError) {
    return new ProviderNetworkError({
      provider: 'openai',
      message: err.message,
      cause: err,
    });
  }

  if (err instanceof OpenAIBadRequestError) {
    return new ProviderCapabilityMismatch({
      provider: 'openai',
      requirement: 'valid-request',
      message: err.message,
      cause: err,
    });
  }

  if (!(err instanceof Error)) {
    return new ProviderNetworkError({
      provider: 'openai',
      message: 'Unknown non-Error value thrown by OpenAI SDK.',
      cause: err,
    });
  }

  return new ProviderNetworkError({
    provider: 'openai',
    message: err.message,
    cause: err,
  });
}
