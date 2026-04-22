/**
 * FAL providers — texture generation + background removal.
 *
 * Wraps `@fal-ai/client@^1.9.5` (the replacement for the deprecated
 * `@fal-ai/serverless-client@^0.15.0`). The breaking change vs the old SDK:
 * `fal.subscribe()` now returns `{ data, requestId }` — every call site
 * destructures `.data`.
 *
 * Exported factories:
 * - `createFalTextureProvider()` — FLUX 2 + Seamless LoRA (endpoint
 *   `fal-ai/flux-2/lora`) with optional nearest-neighbor pixelate + palette
 *   quantization pipeline.
 * - `createFalBgRemovalProvider()` — BiRefNet background removal
 *   (`fal-ai/birefnet`) + chroma cleanup pass for residual edges.
 *
 * Error translation follows the core taxonomy:
 * - 429 / "quota" / "rate limit" → {@link ProviderRateLimited}
 * - 401 / "api key" / "auth"      → {@link ProviderAuthFailed}
 * - Deadline exceeded             → {@link ProviderTimeout}
 * - Network-class                 → {@link ProviderNetworkError}
 */

import { fal } from '@fal-ai/client';
import sharp from 'sharp';

import { capabilitiesFor } from '../capabilities';
import {
  ProviderAuthFailed,
  ProviderCapabilityMismatch,
  ProviderNetworkError,
  ProviderRateLimited,
  ProviderTimeout,
} from '../errors';
import type {
  BgRemovalInput,
  BgRemovalOutput,
  TextureGenerateInput,
  TextureGenerateOutput,
} from '../schemas/image';
import type { BgRemovalProvider, TextureProvider } from './types';

// =============================================================================
// Shared
// =============================================================================

const SEAMLESS_LORA_URL =
  'https://huggingface.co/gokaygokay/Flux-Seamless-Texture-LoRA/resolve/main/seamless_texture.safetensors';

const FLUX_TIMEOUT_MS = 60_000;
const BG_REMOVE_TIMEOUT_MS = 30_000;
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
// Texture provider (FLUX 2 + Seamless LoRA)
// =============================================================================

export interface FalTextureProviderOptions {
  /** Override FLUX endpoint id. Default: `fal-ai/flux-2/lora`. */
  endpoint?: string;
  /** Per-call timeout in ms. Default 60_000. */
  timeoutMs?: number;
}

export function createFalTextureProvider(
  apiKey?: string,
  opts: FalTextureProviderOptions = {},
): TextureProvider {
  ensureConfigured(apiKey);

  const caps = capabilitiesFor('fal');
  if (!caps) {
    throw new ProviderCapabilityMismatch({
      provider: 'fal',
      requirement: 'texture',
      message: 'FAL texture capabilities are not registered.',
    });
  }

  const endpoint = opts.endpoint ?? 'fal-ai/flux-2/lora';
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

export interface FalBgRemovalProviderOptions {
  /** Override endpoint. Default `fal-ai/birefnet`. */
  endpoint?: string;
  /** Per-call timeout in ms. Default 30_000. */
  timeoutMs?: number;
}

export function createFalBgRemovalProvider(
  apiKey?: string,
  opts: FalBgRemovalProviderOptions = {},
): BgRemovalProvider {
  ensureConfigured(apiKey);

  const caps = capabilitiesFor('fal');
  if (!caps) {
    throw new ProviderCapabilityMismatch({
      provider: 'fal',
      requirement: 'bg-removal',
      message: 'FAL bg-removal capabilities are not registered.',
    });
  }

  const endpoint = opts.endpoint ?? 'fal-ai/birefnet';
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
// Helpers
// =============================================================================

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
    err instanceof ProviderCapabilityMismatch
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
