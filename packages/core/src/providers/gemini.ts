/**
 * Gemini image provider (`ImageProvider`).
 *
 * Wraps `@google/genai@^1.48.0` to produce 2D sprites on solid-background
 * compositions, used by the sprite / icon / soldier-set pipelines.
 *
 * - Text-only path: `generate({ prompt, ... })` → `models.generateContent(...)`.
 * - Multi-ref path: `editWithRefs({ prompt, refs, ... })` feeds reference
 *   images as `inlineData` parts in the `contents` array.
 *
 * SDK error translation:
 * - 429 / "quota" / "rate limit" → {@link ProviderRateLimited}
 * - 401 / "api key" / "auth"      → {@link ProviderAuthFailed}
 * - Timeouts (our own deadline)   → {@link ProviderTimeout}
 * - Network-class failures        → {@link ProviderNetworkError}
 *
 * Never throws raw `Error`; every path goes through the taxonomy.
 */

import { GoogleGenAI } from '@google/genai';

import { capabilitiesFor, type ProviderCapabilities } from '../capabilities';
import {
  ProviderAuthFailed,
  ProviderNetworkError,
  ProviderRateLimited,
  ProviderTimeout,
  ProviderCapabilityMismatch,
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

const DEFAULT_MODEL = 'gemini-3.1-flash-image-preview';
const DEFAULT_TIMEOUT_MS = 60_000;

// Gemini's `imageConfig.aspectRatio` only accepts this exact whitelist.
// Anything else (including reduced forms like `1024:1024`) returns 400.
const SUPPORTED_ASPECT_RATIOS: ReadonlyArray<readonly [number, number]> = [
  [1, 1], [1, 4], [1, 8], [2, 3], [3, 2], [3, 4], [4, 1], [4, 3],
  [4, 5], [5, 4], [8, 1], [9, 16], [16, 9], [21, 9],
];

function pickGeminiAspectRatio(width: number, height: number): string {
  const target = width / height;
  let best = SUPPORTED_ASPECT_RATIOS[0]!;
  let bestDelta = Math.abs(best[0] / best[1] - target);
  for (const ratio of SUPPORTED_ASPECT_RATIOS) {
    const delta = Math.abs(ratio[0] / ratio[1] - target);
    if (delta < bestDelta) {
      best = ratio;
      bestDelta = delta;
    }
  }
  return `${best[0]}:${best[1]}`;
}

// =============================================================================
// Factory
// =============================================================================

export interface GeminiProviderOptions {
  /** Override the Gemini model id (default `gemini-3.1-flash-image-preview`). */
  model?: string;
  /** Per-call timeout in ms (default 60_000). */
  timeoutMs?: number;
}

/**
 * Create a Gemini `ImageProvider`. Resolves the API key from `GEMINI_API_KEY`
 * if not passed explicitly.
 *
 * Throws {@link ProviderAuthFailed} eagerly when both `apiKey` and
 * `GEMINI_API_KEY` are missing.
 */
export function createGeminiProvider(
  apiKey?: string,
  opts: GeminiProviderOptions = {},
): ImageProvider {
  const key = apiKey ?? process.env['GEMINI_API_KEY'];
  if (!key) {
    throw new ProviderAuthFailed({
      provider: 'gemini',
      envVar: 'GEMINI_API_KEY',
      message: 'GEMINI_API_KEY is not set.',
    });
  }

  const caps = capabilitiesFor('gemini');
  if (!caps) {
    // Should never happen — capabilities.ts registers 'gemini'. Defensive.
    throw new ProviderCapabilityMismatch({
      provider: 'gemini',
      requirement: 'image',
      message: 'Gemini provider capabilities are not registered.',
    });
  }

  const client = new GoogleGenAI({ apiKey: key });
  const model = opts.model ?? DEFAULT_MODEL;
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const runGenerate = async (
    input: ImageGenerateInput | ImageEditInput,
    refs: Buffer[],
  ): Promise<ImageGenerateOutput> => {
    const start = Date.now();

    // Build contents: text-only or multimodal with reference images.
    type Part = { text?: string; inlineData?: { mimeType: string; data: string } };
    let contents: string | Part[];
    if (refs.length > 0) {
      const imageParts: Part[] = refs.map((buf) => ({
        inlineData: { mimeType: 'image/png', data: buf.toString('base64') },
      }));
      contents = [...imageParts, { text: input.prompt }];
    } else {
      contents = input.prompt;
    }

    const imageConfig: Record<string, string> = {};
    if (input.dimensions) {
      // Gemini only accepts a whitelist of simplified aspect ratios (e.g. '1:1',
      // '3:2', '16:9'). Reduce w:h by GCD, then fall back to the closest
      // supported ratio if the reduced form isn't on the whitelist.
      imageConfig['aspectRatio'] = pickGeminiAspectRatio(
        input.dimensions.width,
        input.dimensions.height,
      );
    }

    try {
      const response = await withTimeout(
        client.models.generateContent({
          model: input.model ?? model,
          contents,
          config: {
            responseModalities: ['image', 'text'],
            ...(Object.keys(imageConfig).length > 0 ? { imageConfig } : {}),
          },
        }),
        timeoutMs,
        'gemini',
      );

      const parts = response.candidates?.[0]?.content?.parts;
      if (!parts || parts.length === 0) {
        throw new ProviderNetworkError({
          provider: 'gemini',
          message: 'Gemini returned no candidate content parts.',
        });
      }

      for (const part of parts) {
        if (part.inlineData?.data) {
          const image = Buffer.from(part.inlineData.data, 'base64');
          const usedModel = input.model ?? model;
          return {
            image,
            provider: 'gemini',
            model: usedModel,
            meta: {
              latencyMs: Date.now() - start,
              costUsd: estimateCost(caps, usedModel),
              warnings: [],
            },
          };
        }
      }

      throw new ProviderNetworkError({
        provider: 'gemini',
        message: 'Gemini response contained no image part.',
      });
    } catch (err) {
      throw translateError(err);
    }
  };

  return {
    id: 'gemini',
    capabilities: caps,
    async generate(input) {
      return runGenerate(input, []);
    },
    async editWithRefs(input) {
      // capability enforcement: reject ref counts above the matrix cap.
      const modelId = input.model ?? model;
      const cap = caps.models.find((m) => m.id === modelId) ?? caps.models[0];
      const maxRefs = cap?.maxRefs ?? 0;
      if (input.refs.length > maxRefs) {
        throw new ProviderCapabilityMismatch({
          provider: 'gemini',
          requirement: `refs<=${maxRefs}`,
          suggestedProvider: 'openai',
          message: `Gemini ${modelId} accepts at most ${maxRefs} refs; got ${input.refs.length}.`,
        });
      }
      return runGenerate(input, input.refs);
    },
  };
}

// =============================================================================
// Internals
// =============================================================================

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  provider: 'gemini',
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(
        () =>
          reject(
            new ProviderTimeout({
              provider,
              timeoutMs,
              message: `${provider} call exceeded ${timeoutMs}ms timeout.`,
            }),
          ),
        timeoutMs,
      );
    }),
  ]);
}

function translateError(err: unknown): Error {
  // Already-structured pass-through.
  if (
    err instanceof ProviderRateLimited ||
    err instanceof ProviderAuthFailed ||
    err instanceof ProviderTimeout ||
    err instanceof ProviderNetworkError ||
    err instanceof ProviderCapabilityMismatch
  ) {
    return err;
  }

  if (!(err instanceof Error)) {
    return new ProviderNetworkError({
      provider: 'gemini',
      message: 'Unknown non-Error value thrown by Gemini SDK.',
      cause: err,
    });
  }

  const msg = err.message.toLowerCase();

  if (msg.includes('quota') || msg.includes('rate limit') || msg.includes('429')) {
    return new ProviderRateLimited({
      provider: 'gemini',
      message: err.message,
      cause: err,
    });
  }

  if (
    msg.includes('api key') ||
    msg.includes('unauthorized') ||
    msg.includes('401') ||
    msg.includes('auth')
  ) {
    return new ProviderAuthFailed({
      provider: 'gemini',
      envVar: 'GEMINI_API_KEY',
      message: err.message,
      cause: err,
    });
  }

  if (
    msg.includes('network') ||
    msg.includes('fetch') ||
    msg.includes('enotfound') ||
    msg.includes('socket')
  ) {
    return new ProviderNetworkError({
      provider: 'gemini',
      message: err.message,
      cause: err,
    });
  }

  // Default: network-class; retryable. Keeps agents unstuck.
  return new ProviderNetworkError({
    provider: 'gemini',
    message: err.message,
    cause: err,
  });
}

function estimateCost(
  caps: ProviderCapabilities,
  modelId: string,
): number | undefined {
  const m = caps.models.find((x) => x.id === modelId);
  return m?.pricePerImage;
}
