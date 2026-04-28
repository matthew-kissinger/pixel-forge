import { image, isPixelForgeError, providers } from '@pixel-forge/core';
import { logger } from '@pixel-forge/shared/logger';

import { BadRequestError, ServiceUnavailableError } from '../lib/errors';

export interface TextureOptions {
  description: string;
  size?: number;
  loraScale?: number;
  steps?: number;
  guidance?: number;
  pixelate?: boolean;
  pixelateTarget?: number;
  paletteColors?: number;
}

export interface TextureResult {
  image: string;
  size: number;
  dimensions: { width: number; height: number };
}

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

  logger.info(`[Texture] Generating: ${description} (${size}x${size})`);

  try {
    const textureProvider = providers.createFalTextureProvider();
    const pipeline = image.pipelines.createTexturePipeline({ textureProvider });
    const result = await pipeline.run({
      description,
      size,
      loraScale,
      steps,
      guidance,
      pixelate,
      pixelateTarget,
      paletteColors,
    });

    return {
      image: `data:image/png;base64,${result.image.toString('base64')}`,
      size: result.image.length,
      dimensions: { width: result.meta.size, height: result.meta.size },
    };
  } catch (error) {
    if (error instanceof BadRequestError || error instanceof ServiceUnavailableError) {
      throw error;
    }
    if (isPixelForgeError(error)) {
      throw new ServiceUnavailableError(`Texture generation failed: ${error.message}`);
    }
    logger.error('[Texture] Generation failed:', error);
    throw new ServiceUnavailableError(
      error instanceof Error
        ? `Texture generation failed: ${error.message}`
        : 'Texture generation failed',
    );
  }
}
