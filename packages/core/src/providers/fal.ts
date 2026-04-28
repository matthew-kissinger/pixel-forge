/**
 * FAL providers — texture generation, background removal, and text-to-3D.
 *
 * Wraps `@fal-ai/client@^1.9.5`. `fal.subscribe()` returns `{ data, requestId }`
 * — every call site destructures `.data`.
 *
 * Exported factories:
 * - `createFalTextureProvider()` — FLUX + Seamless LoRA. Default endpoint
 *   `fal-ai/flux-lora` (FLUX 1) because our current Seamless LoRA
 *   (`gokaygokay/Flux-Seamless-Texture-LoRA`) is FLUX-1-trained and FLUX 2
 *   rejects it (422). Flip to `fal-ai/flux-2/lora` via `opts.endpoint` once a
 *   FLUX-2-compatible seamless LoRA is available (see
 *   current FLUX 1-trained seamless LoRA setup).
 * - `createFalBgRemovalProvider()` — BiRefNet v2 background removal
 *   (`fal-ai/birefnet/v2`) with variant selector (light / light-2k / heavy /
 *   matting / portrait / dynamic). Legacy `fal-ai/birefnet` reachable via
 *   `opts.endpoint`.
 * - `createFalBriaBgRemovalProvider()` — Bria RMBG 2.0 fallback
 *   (`fal-ai/bria/background/remove`). Licensed-training-data, enterprise-safe,
 *   and cheaper than BiRefNet. Use when BiRefNet is rate-limited.
 * - `createFalTextTo3dProvider()` — Meshy text-to-3D
 *   (`fal-ai/meshy/text-to-3d`) for the existing server model route.
 *
 * Error translation follows the core taxonomy:
 * - 429 / "quota" / "rate limit" → {@link ProviderRateLimited}
 * - 401 / "api key" / "auth"      → {@link ProviderAuthFailed}
 * - Deadline exceeded             → {@link ProviderTimeout}
 * - Network-class                 → {@link ProviderNetworkError}
 */

import { fal } from '@fal-ai/client';
import sharp from 'sharp';

import { capabilitiesForKind } from '../capabilities';
import {
  ProviderAuthFailed,
  ProviderCapabilityMismatch,
  ProviderNetworkError,
  ProviderRateLimited,
  ProviderTimeout,
  SchemaValidationFailed,
} from '../errors';
import type {
  BgRemovalInput,
  BgRemovalOutput,
  TextTo3DGenerateInput,
  TextTo3DGenerateOutput,
  TextureGenerateInput,
  TextureGenerateOutput,
} from '../schemas/image';
import { TextTo3DGenerateInputSchema, TextTo3DGenerateOutputSchema } from '../schemas/image';
import type {
  BgRemovalProvider,
  TextTo3DGenerateOptions,
  TextTo3DProvider,
  TextTo3DQueueUpdate,
  TextureProvider,
} from './types';

// =============================================================================
// Shared
// =============================================================================

const SEAMLESS_LORA_URL =
  'https://huggingface.co/gokaygokay/Flux-Seamless-Texture-LoRA/resolve/main/seamless_texture.safetensors';

const FLUX_TIMEOUT_MS = 60_000;
const BG_REMOVE_TIMEOUT_MS = 30_000;
const TEXT_TO_3D_TIMEOUT_MS = 180_000;
const FETCH_TIMEOUT_MS = 30_000;

let configured = false;
function ensureConfigured(apiKey?: string): void {
  if (configured) return;
  const key = apiKey ?? process.env['FAL_KEY'];
  if (!key) {
    throw new ProviderAuthFailed({
      provider: 'fal',
      envVar: 'FAL_KEY',
      message: 'FAL_KEY is not set.',
    });
  }
  fal.config({ credentials: key });
  configured = true;
}

// =============================================================================
// Texture provider (FLUX + Seamless LoRA)
// =============================================================================

export interface FalTextureProviderOptions {
  /**
   * Override FLUX endpoint id. Default: `fal-ai/flux-lora` (FLUX 1 LoRA path).
   *
   * FLUX 2 (`fal-ai/flux-2/lora`) rejects our existing FLUX-1-trained
   * seamless LoRA (422 Unprocessable Entity observed 2026-04-24), because
   * FLUX 2 LoRAs use a different architecture. Flip to `fal-ai/flux-2/lora`
   * only after training a FLUX 2 seamless LoRA or passing a compatible
   * `loras` list at call time (not yet exposed on `TextureGenerateInput`).
   */
  endpoint?: string;
  /** Per-call timeout in ms. Default 60_000. */
  timeoutMs?: number;
}

export function createFalTextureProvider(
  apiKey?: string,
  opts: FalTextureProviderOptions = {},
): TextureProvider {
  ensureConfigured(apiKey);

  const caps = capabilitiesForKind('fal', 'texture');
  if (!caps) {
    throw new ProviderCapabilityMismatch({
      provider: 'fal',
      requirement: 'texture',
      message: 'FAL texture capabilities are not registered.',
    });
  }

  const endpoint = opts.endpoint ?? 'fal-ai/flux-lora';
  const timeoutMs = opts.timeoutMs ?? FLUX_TIMEOUT_MS;

  return {
    id: 'fal',
    capabilities: caps,
    async generate(input: TextureGenerateInput): Promise<TextureGenerateOutput> {
      const start = Date.now();

      const size = input.size ?? 512;
      const loraScale = input.loraScale ?? 1.0;
      const steps = input.steps ?? 28;
      const guidance = input.guidance ?? 3.5;
      const pixelate = input.pixelate ?? true;
      const pixelateTarget = input.pixelateTarget ?? 128;
      const paletteColors = input.paletteColors ?? 0;

      const prompt = `smlstxtr, top-down overhead view of ${input.description}, pixel art style with visible individual square pixels, limited color palette, hard crisp edges, no anti-aliasing, no smooth gradients, no blur, seamless texture`;

      let buffer: Buffer;
      try {
        const result = await withTimeout(
          fal.subscribe(endpoint, {
            input: {
              prompt,
              loras: [{ path: SEAMLESS_LORA_URL, scale: loraScale }],
              image_size: { width: size, height: size },
              num_inference_steps: steps,
              guidance_scale: guidance,
              output_format: 'png',
              num_images: 1,
            },
          }) as Promise<{ data: { images?: Array<{ url: string }> } }>,
          timeoutMs,
          'fal',
        );

        const images = result.data.images;
        const firstUrl = images?.[0]?.url;
        if (!images?.length || !firstUrl) {
          throw new ProviderNetworkError({
            provider: 'fal',
            message: 'FLUX response contained no image URL.',
          });
        }

        const response = await fetchWithTimeout(firstUrl, FETCH_TIMEOUT_MS);
        if (!response.ok) {
          throw new ProviderNetworkError({
            provider: 'fal',
            message: `Failed to fetch FLUX result: ${response.statusText}`,
          });
        }
        buffer = Buffer.from(new Uint8Array(await response.arrayBuffer()));
      } catch (err) {
        throw translateError(err);
      }

      // Pixelate path
      if (pixelate && pixelateTarget > 0 && pixelateTarget < size) {
        buffer = await sharp(buffer)
          .resize(pixelateTarget, pixelateTarget, { kernel: sharp.kernel.nearest })
          .resize(size, size, { kernel: sharp.kernel.nearest })
          .png()
          .toBuffer();
      }

      if (paletteColors > 0) {
        buffer = await sharp(buffer)
          .png({ palette: true, colours: paletteColors })
          .toBuffer();
      }

      buffer = await sharp(buffer).png().toBuffer();

      return {
        image: buffer,
        meta: {
          latencyMs: Date.now() - start,
          warnings: [],
        },
      };
    },
  };
}

// =============================================================================
// Background removal (BiRefNet)
// =============================================================================

/**
 * BiRefNet v2 variant ids (mapped to the `model` input field of
 * `fal-ai/birefnet/v2`). Pick per use case:
 * - `light` / `light-2k`: 512–2048px sprites (our default)
 * - `heavy`: hero shots, tight hair/fur
 * - `matting`: soft edges (foliage, smoke)
 * - `portrait`: people
 * - `general-dynamic`: unknown resolution, auto-scales 256–2304
 *
 * These short ids are mapped to the API's human-readable enum values
 * (`General Use (Light)`, etc.) by `BIREFNET_V2_MODEL_MAP` below.
 */
export type BirefnetV2Variant =
  | 'light'
  | 'light-2k'
  | 'heavy'
  | 'matting'
  | 'portrait'
  | 'general-dynamic';

const BIREFNET_V2_MODEL_MAP: Record<BirefnetV2Variant, string> = {
  'light': 'General Use (Light)',
  'light-2k': 'General Use (Light 2K)',
  'heavy': 'General Use (Heavy)',
  'matting': 'Matting',
  'portrait': 'Portrait',
  'general-dynamic': 'General Use (Dynamic)',
};

export interface FalBgRemovalProviderOptions {
  /**
   * Override endpoint id. Default `fal-ai/birefnet/v2`. Set to
   * `fal-ai/birefnet` to fall back to the v1 endpoint.
   */
  endpoint?: string;
  /**
   * BiRefNet v2 variant. Default `general-dynamic`. Ignored by v1 endpoint.
   */
  variant?: BirefnetV2Variant;
  /** Per-call timeout in ms. Default 30_000. */
  timeoutMs?: number;
}

export function createFalBgRemovalProvider(
  apiKey?: string,
  opts: FalBgRemovalProviderOptions = {},
): BgRemovalProvider {
  ensureConfigured(apiKey);

  const caps = capabilitiesForKind('fal', 'bg-removal');
  if (!caps) {
    throw new ProviderCapabilityMismatch({
      provider: 'fal',
      requirement: 'bg-removal',
      message: 'FAL bg-removal capabilities are not registered.',
    });
  }

  const endpoint = opts.endpoint ?? 'fal-ai/birefnet/v2';
  // Default to 'light' — matches the API default and works reliably for
  // sprite-sized assets. 'general-dynamic' requires callers to opt in.
  const variant = opts.variant ?? 'light';
  const timeoutMs = opts.timeoutMs ?? BG_REMOVE_TIMEOUT_MS;

  return {
    id: 'fal',
    capabilities: caps,
    async remove(input: BgRemovalInput): Promise<BgRemovalOutput> {
      const start = Date.now();
      const base64 = input.image.toString('base64');

      try {
        const subscribeInput: Record<string, unknown> = {
          image_url: `data:image/png;base64,${base64}`,
        };
        // Only v2 accepts `model` variant selector, and it takes the
        // human-readable enum (e.g. 'General Use (Light)'), not the
        // short slug we use internally.
        if (endpoint === 'fal-ai/birefnet/v2') {
          subscribeInput['model'] = BIREFNET_V2_MODEL_MAP[variant];
        }

        const result = await withTimeout(
          fal.subscribe(endpoint, {
            input: subscribeInput,
          }) as Promise<{ data: { image?: { url?: string } } }>,
          timeoutMs,
          'fal',
        );

        const url = result.data.image?.url;
        if (!url) {
          throw new ProviderNetworkError({
            provider: 'fal',
            message: 'BiRefNet response contained no image URL.',
          });
        }

        const response = await fetchWithTimeout(url, FETCH_TIMEOUT_MS);
        if (!response.ok) {
          throw new ProviderNetworkError({
            provider: 'fal',
            message: `Failed to fetch BiRefNet result: ${response.statusText}`,
          });
        }

        const raw = Buffer.from(new Uint8Array(await response.arrayBuffer()));
        const cleaned = await chromaCleanup(raw, input.backgroundColor);

        return {
          image: cleaned,
          meta: {
            latencyMs: Date.now() - start,
            warnings: [],
          },
        };
      } catch (err) {
        throw translateError(err);
      }
    },
  };
}

// =============================================================================
// Bria RMBG 2.0 fallback (cheaper, licensed training data)
// =============================================================================

export interface FalBriaBgRemovalProviderOptions {
  /** Override endpoint. Default `fal-ai/bria/background/remove`. */
  endpoint?: string;
  /** Per-call timeout in ms. Default 30_000. */
  timeoutMs?: number;
}

/**
 * Bria RMBG 2.0 background removal — enterprise-safe fallback to BiRefNet.
 * Same contract as `createFalBgRemovalProvider`; emits warnings identifying
 * the provider so the facade can log the fallback path.
 */
export function createFalBriaBgRemovalProvider(
  apiKey?: string,
  opts: FalBriaBgRemovalProviderOptions = {},
): BgRemovalProvider {
  ensureConfigured(apiKey);

  const caps = capabilitiesForKind('fal', 'bg-removal');
  if (!caps) {
    throw new ProviderCapabilityMismatch({
      provider: 'fal',
      requirement: 'bg-removal',
      message: 'FAL bg-removal capabilities are not registered.',
    });
  }

  const endpoint = opts.endpoint ?? 'fal-ai/bria/background/remove';
  const timeoutMs = opts.timeoutMs ?? BG_REMOVE_TIMEOUT_MS;

  return {
    id: 'fal',
    capabilities: caps,
    async remove(input: BgRemovalInput): Promise<BgRemovalOutput> {
      const start = Date.now();
      const base64 = input.image.toString('base64');

      try {
        const result = await withTimeout(
          fal.subscribe(endpoint, {
            input: {
              image_url: `data:image/png;base64,${base64}`,
            },
          }) as Promise<{ data: { image?: { url?: string } } }>,
          timeoutMs,
          'fal',
        );

        const url = result.data.image?.url;
        if (!url) {
          throw new ProviderNetworkError({
            provider: 'fal',
            message: 'Bria response contained no image URL.',
          });
        }

        const response = await fetchWithTimeout(url, FETCH_TIMEOUT_MS);
        if (!response.ok) {
          throw new ProviderNetworkError({
            provider: 'fal',
            message: `Failed to fetch Bria result: ${response.statusText}`,
          });
        }

        const raw = Buffer.from(new Uint8Array(await response.arrayBuffer()));
        const cleaned = await chromaCleanup(raw, input.backgroundColor);

        return {
          image: cleaned,
          meta: {
            latencyMs: Date.now() - start,
            warnings: ['bg-removal via Bria RMBG 2.0 (BiRefNet fallback)'],
          },
        };
      } catch (err) {
        throw translateError(err);
      }
    },
  };
}

// =============================================================================
// Text-to-3D (Meshy)
// =============================================================================

export interface FalTextTo3dProviderOptions {
  /** Override endpoint id. Default `fal-ai/meshy/text-to-3d`. */
  endpoint?: string;
  /** Per-call timeout in ms. Default 180_000. */
  timeoutMs?: number;
}

interface FalTextTo3dResult {
  data?: {
    model_url?: string;
    modelUrl?: string;
    thumbnail_url?: string;
    thumbnailUrl?: string;
    status?: string;
  };
  requestId?: string;
}

interface FalQueueUpdate {
  status?: string;
  logs?: Array<{ message?: string }>;
}

export function createFalTextTo3dProvider(
  apiKey?: string,
  opts: FalTextTo3dProviderOptions = {},
): TextTo3DProvider {
  ensureConfigured(apiKey);

  const caps = capabilitiesForKind('fal', 'model-3d');
  if (!caps) {
    throw new ProviderCapabilityMismatch({
      provider: 'fal',
      requirement: 'model-3d',
      message: 'FAL text-to-3D capabilities are not registered.',
    });
  }

  const endpoint = opts.endpoint ?? 'fal-ai/meshy/text-to-3d';
  const timeoutMs = opts.timeoutMs ?? TEXT_TO_3D_TIMEOUT_MS;

  return {
    id: 'fal',
    capabilities: caps,
    async generate(
      rawInput: TextTo3DGenerateInput,
      callOpts: TextTo3DGenerateOptions = {},
    ): Promise<TextTo3DGenerateOutput> {
      const parsed = TextTo3DGenerateInputSchema.safeParse(rawInput);
      if (!parsed.success) {
        throw new SchemaValidationFailed({
          message: `Invalid text-to-3D input: ${parsed.error.message}`,
          issues: parsed.error.issues.map((issue) => ({
            path: issue.path.filter(
              (p): p is string | number => typeof p === 'string' || typeof p === 'number',
            ),
            message: issue.message,
          })),
        });
      }

      const input = parsed.data;
      const start = Date.now();

      try {
        const result = await withTimeout(
          fal.subscribe(endpoint, {
            input: {
              prompt: input.prompt,
              art_style: input.artStyle,
              negative_prompt: input.negativePrompt,
            },
            logs: true,
            onQueueUpdate: (update: FalQueueUpdate) => {
              callOpts.onQueueUpdate?.(normalizeQueueUpdate(update));
            },
          }) as Promise<FalTextTo3dResult>,
          timeoutMs,
          'fal',
        );

        const data = result.data ?? {};
        const modelUrl = data.model_url ?? data.modelUrl;
        if (!modelUrl) {
          throw new ProviderNetworkError({
            provider: 'fal',
            message: 'Meshy text-to-3D response contained no model URL.',
          });
        }
        const output = {
          modelUrl,
          thumbnailUrl: data.thumbnail_url ?? data.thumbnailUrl,
          meta: {
            latencyMs: Date.now() - start,
            warnings: [],
            model: endpoint,
            ...(result.requestId ? { requestId: result.requestId } : {}),
            ...(data.status ? { rawStatus: data.status } : {}),
          },
        };
        const outputParsed = TextTo3DGenerateOutputSchema.safeParse(output);
        if (!outputParsed.success) {
          throw new SchemaValidationFailed({
            message: `Invalid text-to-3D provider output: ${outputParsed.error.message}`,
            issues: outputParsed.error.issues.map((issue) => ({
              path: issue.path.filter(
                (p): p is string | number => typeof p === 'string' || typeof p === 'number',
              ),
              message: issue.message,
            })),
          });
        }
        return outputParsed.data;
      } catch (err) {
        throw translateError(err);
      }
    },
  };
}

// =============================================================================
// Helpers
// =============================================================================

function normalizeQueueUpdate(update: FalQueueUpdate): TextTo3DQueueUpdate {
  const lastLog = update.logs?.at(-1)?.message;
  const progress = parseProgress(lastLog);
  return {
    ...(update.status ? { status: update.status } : {}),
    ...(lastLog ? { message: lastLog } : {}),
    ...(progress !== undefined ? { progress } : {}),
    ...(update.logs ? { logs: update.logs } : {}),
  };
}

function parseProgress(message: string | undefined): number | undefined {
  if (!message) return undefined;
  const match = message.match(/(\d+)%/);
  if (!match?.[1]) return undefined;
  const parsed = Number.parseInt(match[1], 10);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(100, parsed)) : undefined;
}

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  provider: 'fal',
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

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new ProviderTimeout({
        provider: 'fal',
        timeoutMs,
        message: `Fetch of FAL result exceeded ${timeoutMs}ms.`,
        cause: err,
      });
    }
    throw new ProviderNetworkError({
      provider: 'fal',
      message: err instanceof Error ? err.message : 'fetch failed',
      cause: err,
    });
  } finally {
    clearTimeout(id);
  }
}

/**
 * Remove residual background-colored pixels that BiRefNet misses at edges.
 * Mirrors the server's legacy implementation.
 */
async function chromaCleanup(
  imageBuffer: Buffer,
  backgroundColor: BgRemovalInput['backgroundColor'],
): Promise<Buffer> {
  const pngBuf = await sharp(imageBuffer).png().toBuffer();
  const { data, info } = await sharp(pngBuf)
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = new Uint8Array(data.buffer);
  const { width, height, channels } = info;

  if (channels !== 4) return imageBuffer;

  for (let i = 0; i < width * height * 4; i += 4) {
    const r = pixels[i]!;
    const g = pixels[i + 1]!;
    const b = pixels[i + 2]!;
    const a = pixels[i + 3]!;
    if (a === 255 || a === 0) continue;

    let isBackground = false;
    switch (backgroundColor) {
      case 'magenta':
        isBackground = r > 150 && g < 100 && b > 150;
        break;
      case 'red':
        isBackground = r > 150 && g < 80 && b < 80;
        break;
      case 'blue':
        isBackground = r < 80 && g < 80 && b > 150;
        break;
      case 'green':
        isBackground = r < 100 && g > 180 && b < 100;
        break;
      default:
        isBackground = (r > 150 && g < 100 && b > 150) || (r > 180 && g < 60 && b < 60);
        break;
    }
    if (isBackground) {
      pixels[i + 3] = 0;
    }
  }

  return sharp(Buffer.from(pixels.buffer), {
    raw: { width, height, channels: 4 },
  })
    .png()
    .toBuffer();
}

function translateError(err: unknown): Error {
  if (
    err instanceof ProviderRateLimited ||
    err instanceof ProviderAuthFailed ||
    err instanceof ProviderTimeout ||
    err instanceof ProviderNetworkError ||
    err instanceof ProviderCapabilityMismatch ||
    err instanceof SchemaValidationFailed
  ) {
    return err;
  }

  if (!(err instanceof Error)) {
    return new ProviderNetworkError({
      provider: 'fal',
      message: 'Unknown non-Error value thrown by FAL SDK.',
      cause: err,
    });
  }

  const msg = err.message.toLowerCase();

  if (msg.includes('quota') || msg.includes('rate limit') || msg.includes('429')) {
    return new ProviderRateLimited({
      provider: 'fal',
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
      provider: 'fal',
      envVar: 'FAL_KEY',
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
      provider: 'fal',
      message: err.message,
      cause: err,
    });
  }
  return new ProviderNetworkError({
    provider: 'fal',
    message: err.message,
    cause: err,
  });
}
