import * as fal from '@fal-ai/serverless-client';
import sharp from 'sharp';
import { logger } from '@pixel-forge/shared/logger';
import { ServiceUnavailableError, BadRequestError } from '../lib/errors';

let configured = false;

function ensureConfigured() {
  if (!configured) {
    const apiKey = process.env.FAL_KEY;
    if (!apiKey) {
      throw new Error('FAL_KEY environment variable is required');
    }
    fal.config({ credentials: apiKey });
    configured = true;
  }
}

const FLUX_TIMEOUT_MS = 60000; // 60 seconds for FLUX generation

// Seamless Texture LoRA - direct link to safetensors file
const SEAMLESS_LORA_URL =
  'https://huggingface.co/gokaygokay/Flux-Seamless-Texture-LoRA/resolve/main/seamless_texture.safetensors';

export interface TextureOptions {
  /** Texture description (what it looks like) */
  description: string;
  /** Target size in pixels (default 512) */
  size?: number;
  /** LoRA strength 0-2 (default 1.0) */
  loraScale?: number;
  /** Inference steps (default 28) */
  steps?: number;
  /** Guidance scale (default 3.5) */
  guidance?: number;
  /** Whether to pixelate the result via nearest-neighbor downscale (default true) */
  pixelate?: boolean;
  /** Pixel art target resolution before upscale (default 128) */
  pixelateTarget?: number;
  /** Number of colors for palette quantization (default 0 = no quantization) */
  paletteColors?: number;
}

export interface TextureResult {
  /** Final texture as base64 data URL */
  image: string;
  /** Size in bytes */
  size: number;
  /** Width x height */
  dimensions: { width: number; height: number };
}

/**
 * Generate a seamless tileable texture using FLUX + Seamless Texture LoRA.
 *
 * Pipeline:
 * 1. FLUX generates with seamless texture LoRA (ensures tileability)
 * 2. Optional: nearest-neighbor downscale to pixelate + upscale back
 * 3. Optional: palette quantization for limited color look
 */
export async function generateTexture(options: TextureOptions): Promise<TextureResult> {
  const {
    description,
    size = 512,
    loraScale = 1.0,
    steps = 28,
    guidance = 3.5,
    pixelate = true,
    pixelateTarget = 128,
    paletteColors = 0,
  } = options;

  if (!description || description.trim().length === 0) {
    throw new BadRequestError('Texture description cannot be empty');
  }

  ensureConfigured();

  // Build prompt with seamless texture trigger word and pixel art instructions
  const prompt = `smlstxtr, top-down overhead view of ${description}, pixel art style with visible individual square pixels, limited color palette, hard crisp edges, no anti-aliasing, no smooth gradients, no blur, seamless texture`;

  logger.info(`[Texture] Generating: ${description} (${size}x${size})`);

  try {
    const result = await Promise.race([
      fal.subscribe('fal-ai/flux-2/lora', {
        input: {
          prompt,
          loras: [{ path: SEAMLESS_LORA_URL, scale: loraScale }],
          image_size: { width: size, height: size },
          num_inference_steps: steps,
          guidance_scale: guidance,
          output_format: 'png',
          num_images: 1,
        },
      }) as Promise<{ images?: Array<{ url: string }> }>,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new ServiceUnavailableError('FLUX texture generation timed out')), FLUX_TIMEOUT_MS)
      ),
    ]);

    if (!result.images?.length || !result.images[0]?.url) {
      throw new ServiceUnavailableError('No image in FLUX response');
    }

    // Fetch the generated image
    const response = await fetch(result.images[0].url);
    if (!response.ok) {
      throw new ServiceUnavailableError(`Failed to fetch FLUX result: ${response.statusText}`);
    }

    let buffer: Buffer = Buffer.from(new Uint8Array(await response.arrayBuffer()));
    const metadata = await sharp(buffer).metadata();
    logger.info(`[Texture] Raw: ${(buffer.length / 1024).toFixed(0)}KB (${metadata.width}x${metadata.height})`);

    // Pixelate: downscale with nearest-neighbor then upscale back
    if (pixelate && pixelateTarget > 0 && pixelateTarget < size) {
      buffer = await sharp(buffer)
        .resize(pixelateTarget, pixelateTarget, { kernel: sharp.kernel.nearest })
        .resize(size, size, { kernel: sharp.kernel.nearest })
        .png()
        .toBuffer();
      logger.info(`[Texture] Pixelated: ${size} -> ${pixelateTarget} -> ${size}`);
    }

    // Palette quantization
    if (paletteColors > 0) {
      buffer = await sharp(buffer)
        .png({ palette: true, colours: paletteColors })
        .toBuffer();
      logger.info(`[Texture] Quantized to ${paletteColors} colors`);
    }

    // Final PNG output
    buffer = await sharp(buffer).png().toBuffer();

    const base64 = buffer.toString('base64');

    return {
      image: `data:image/png;base64,${base64}`,
      size: buffer.length,
      dimensions: { width: size, height: size },
    };
  } catch (error) {
    if (error instanceof BadRequestError || error instanceof ServiceUnavailableError) {
      throw error;
    }
    logger.error('[Texture] Generation failed:', error);
    throw new ServiceUnavailableError(
      error instanceof Error ? `Texture generation failed: ${error.message}` : 'Texture generation failed'
    );
  }
}
