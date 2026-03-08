import { Hono, type Context } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import sharp from 'sharp';
import { buildPresetPrompt, getPresetById } from '@pixel-forge/shared/presets';
import { generateImage, extractSpritesFromSheet } from '../services/gemini';
import { removeBackground } from '../services/fal';
import { generateTexture } from '../services/texture';
import { BadRequestError, TooManyRequestsError } from '../lib/errors';
import { logger } from '@pixel-forge/shared/logger';
import type {
  GenerateImageOptions,
  GenerateImageResponse,
  SmartGenerateResponse,
  BatchGenerateRequest,
  BatchGenerateResponse,
  RemoveBgResponse,
  CompressImageResponse,
  SliceSheetResponse,
  GenerateTextureResponse,
} from '@pixel-forge/shared';

const imageRouter = new Hono();

function handleTooManyRequests(c: Context, error: unknown) {
  if (!(error instanceof TooManyRequestsError)) return undefined;
  if (typeof error.retryAfter === 'number' && Number.isFinite(error.retryAfter)) {
    c.header('Retry-After', String(error.retryAfter));
  }
  return c.json({ error: error.message, code: error.statusCode }, 429);
}

// Art styles supported
const artStyles = [
  'pixel-art',
  'painted',
  'vector',
  'anime',
  'realistic',
  'isometric',
] as const;

// Aspect ratios supported by Gemini
const aspectRatios = [
  '1:1',
  '2:3',
  '3:2',
  '3:4',
  '4:3',
  '4:5',
  '5:4',
  '9:16',
  '16:9',
  '21:9',
] as const;

// Image sizes supported by Gemini (uppercase K required)
const imageSizes = ['1K', '2K', '4K'] as const;

const generateSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required').max(2000),
  style: z.enum(artStyles).optional(),
  aspectRatio: z.enum(aspectRatios).optional(),
  imageSize: z.enum(imageSizes).optional(),
  removeBackground: z.boolean().optional(),
  presetId: z.string().optional(),
  referenceImage: z.string().optional(),
  referenceImages: z.array(z.string()).max(6).optional(),
});

const removeBgSchema = z.object({
  image: z.string().min(1, 'Image data is required'),
  backgroundColor: z.enum(['red', 'green', 'blue', 'magenta']).optional(),
});

const compressSchema = z.object({
  image: z.string().min(1, 'Image data is required'),
  format: z.enum(['png', 'webp', 'jpeg']).optional().default('webp'),
  quality: z.number().int().min(1).max(100).optional().default(80),
  maxWidth: z.number().int().min(1).max(8192).optional(),
  maxHeight: z.number().int().min(1).max(8192).optional(),
});

const sliceSheetSchema = z.object({
  image: z.string().min(1, 'Image data is required'),
  rows: z.number().int().min(1).max(50),
  cols: z.number().int().min(1).max(50),
});

const batchGenerateSchema = z.object({
  subjects: z.array(z.string().min(1)).min(1).max(50),
  presetId: z.string().optional(),
  consistencyPhrase: z.string().optional(),
  seed: z.number().int().optional(),
});

imageRouter.post(
  '/generate',
  zValidator('json', generateSchema),
  async (c) => {
    const { prompt, aspectRatio, imageSize, removeBackground: shouldRemoveBg, presetId, referenceImage, referenceImages } = c.req.valid('json') as GenerateImageOptions;

    try {
      const preset = presetId ? getPresetById(presetId) : undefined;

      if (presetId && !preset) {
        throw new BadRequestError(`Unknown preset: ${presetId}`);
      }

      const finalPrompt = preset ? buildPresetPrompt(preset, prompt) : prompt;

      // Generate the image with the prompt and Gemini imageConfig
      // Merge legacy single referenceImage into the array
      const allRefs = referenceImages ?? (referenceImage ? [referenceImage] : undefined);
      const result = await generateImage(finalPrompt, {
        referenceImages: allRefs,
        aspectRatio,
        imageSize,
      });

      // Optionally remove background
      const shouldRemoveBgFinal = shouldRemoveBg ?? preset?.autoRemoveBg ?? false;
      if (shouldRemoveBgFinal && result.image) {
        try {
          const bgColor = preset?.background;
          const bgResult = await removeBackground(result.image!, bgColor);
          return c.json<GenerateImageResponse>({ image: bgResult.image });
        } catch (bgError) {
          logger.warn('Background removal failed, returning original:', bgError);
          return c.json<GenerateImageResponse>({ image: result.image });
        }
      }

      return c.json<GenerateImageResponse>({ image: result.image });
    } catch (error) {
      const rateLimitResponse = handleTooManyRequests(c, error);
      if (rateLimitResponse) return rateLimitResponse;
      logger.error('Image generation error:', error);
      throw new BadRequestError(
        error instanceof Error ? error.message : 'Image generation failed'
      );
    }
  }
);

imageRouter.post(
  '/remove-bg',
  zValidator('json', removeBgSchema),
  async (c) => {
    const { image, backgroundColor } = c.req.valid('json');

    try {
      const result = await removeBackground(image, backgroundColor);
      return c.json<RemoveBgResponse>(result);
    } catch (error) {
      const rateLimitResponse = handleTooManyRequests(c, error);
      if (rateLimitResponse) return rateLimitResponse;
      logger.error('Background removal error:', error);
      throw new BadRequestError(
        error instanceof Error ? error.message : 'Background removal failed'
      );
    }
  }
);

imageRouter.post(
  '/compress',
  zValidator('json', compressSchema),
  async (c) => {
    const { image, format, quality, maxWidth, maxHeight } = c.req.valid('json');

    try {
      const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
      const inputBuffer = Buffer.from(base64Data, 'base64');
      const originalSize = inputBuffer.length;

      let pipeline = sharp(inputBuffer);

      if (maxWidth || maxHeight) {
        pipeline = pipeline.resize({
          width: maxWidth,
          height: maxHeight,
          fit: 'inside',
          withoutEnlargement: true,
        });
      }

      switch (format) {
        case 'png':
          pipeline = pipeline.png({ quality });
          break;
        case 'jpeg':
          pipeline = pipeline.jpeg({ quality });
          break;
        case 'webp':
          pipeline = pipeline.webp({ quality });
          break;
      }

      const outputBuffer = await pipeline.toBuffer();
      const compressedSize = outputBuffer.length;
      const base64Output = outputBuffer.toString('base64');

      return c.json<CompressImageResponse>({
        image: `data:image/${format};base64,${base64Output}`,
        originalSize,
        compressedSize,
        format: format as 'png' | 'webp' | 'jpeg',
      });
    } catch (error) {
      const rateLimitResponse = handleTooManyRequests(c, error);
      if (rateLimitResponse) return rateLimitResponse;
      logger.error('Compress error:', error);
      throw new BadRequestError(
        error instanceof Error ? error.message : 'Compression failed'
      );
    }
  }
);

imageRouter.post(
  '/slice-sheet',
  zValidator('json', sliceSheetSchema),
  async (c) => {
    const { image, rows, cols } = c.req.valid('json');

    try {
      // Extract base64 data without data URL prefix if present
      const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
      const sheetBuffer = Buffer.from(base64Data, 'base64');

      const sprites = await extractSpritesFromSheet(sheetBuffer, rows, cols);

      // Convert buffers to base64 data URLs
      const spriteDataUrls = sprites.map((buffer) => {
        const base64 = buffer.toString('base64');
        return `data:image/png;base64,${base64}`;
      });

      return c.json<SliceSheetResponse>({ sprites: spriteDataUrls });
    } catch (error) {
      const rateLimitResponse = handleTooManyRequests(c, error);
      if (rateLimitResponse) return rateLimitResponse;
      logger.error('Slice sheet error:', error);
      throw new BadRequestError(
        error instanceof Error ? error.message : 'Slice sheet failed'
      );
    }
  }
);

// Smart generation with automatic aspect ratio selection
// This endpoint generates an image and removes background
const smartGenerateSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required').max(2000),
  style: z.enum(artStyles).optional(),
});

imageRouter.post(
  '/generate-smart',
  zValidator('json', smartGenerateSchema),
  async (c) => {
    const { prompt } = c.req.valid('json');

    try {
      // Generate the image
      const result = await generateImage(prompt);

      // Remove background for game assets
      let finalImage = result.image;
      try {
        const bgResult = await removeBackground(result.image!);
        finalImage = bgResult.image;
      } catch (bgError) {
        logger.warn('Background removal failed, using original:', bgError);
      }

      return c.json<SmartGenerateResponse>({
        image: finalImage,
      });
    } catch (error) {
      const rateLimitResponse = handleTooManyRequests(c, error);
      if (rateLimitResponse) return rateLimitResponse;
      logger.error('Smart generation error:', error);
      throw new BadRequestError(
        error instanceof Error ? error.message : 'Smart generation failed'
      );
    }
  }
);

imageRouter.post(
  '/batch-generate',
  bodyLimit({ maxSize: 1 * 1024 * 1024 }), // 1MB for text prompts
  zValidator('json', batchGenerateSchema),
  async (c) => {
    const { subjects, presetId, consistencyPhrase } = c.req.valid('json') as BatchGenerateRequest;

    try {
      const preset = presetId ? getPresetById(presetId) : undefined;

      if (presetId && !preset) {
        throw new BadRequestError(`Unknown preset: ${presetId}`);
      }

      const images: string[] = [];
      const errors: string[] = [];

      // Generate each subject with consistent settings
      for (const [i, subject] of subjects.entries()) {
        if (!subject) continue;

        try {
          // Build prompt with consistency
          let prompt = subject;

          if (consistencyPhrase) {
            prompt = `${consistencyPhrase}. ${prompt}`;
          }

          const finalPrompt = preset ? buildPresetPrompt(preset, prompt) : prompt;

          const result = await generateImage(finalPrompt);

          // Apply background removal if needed
          const shouldRemoveBg = preset?.autoRemoveBg ?? false;
          if (shouldRemoveBg && result.image) {
            try {
              const bgResult = await removeBackground(result.image);
              images.push(bgResult.image);
            } catch (bgError) {
              logger.warn(`Background removal failed for subject ${i + 1}:`, bgError);
              images.push(result.image);
            }
          } else {
            images.push(result.image);
          }
        } catch (error) {
          if (error instanceof TooManyRequestsError) {
            throw error;
          }
          const errorMsg = error instanceof Error ? error.message : 'Generation failed';
          logger.error(`Failed to generate subject ${i + 1} (${subject}):`, errorMsg);
          errors.push(`Subject ${i + 1}: ${errorMsg}`);
          // Continue with remaining subjects
        }
      }

      if (images.length === 0) {
        throw new BadRequestError('All batch generations failed');
      }

      return c.json<BatchGenerateResponse>({
        images,
        errors: errors.length > 0 ? errors : undefined,
        successCount: images.length,
        totalCount: subjects.length,
      });
    } catch (error) {
      const rateLimitResponse = handleTooManyRequests(c, error);
      if (rateLimitResponse) return rateLimitResponse;
      logger.error('Batch generation error:', error);
      throw new BadRequestError(
        error instanceof Error ? error.message : 'Batch generation failed'
      );
    }
  }
);

// Tileable texture generation via FLUX + Seamless Texture LoRA
const generateTextureSchema = z.object({
  description: z.string().min(1, 'Texture description is required').max(1000),
  size: z.number().int().min(64).max(1024).optional().default(512),
  loraScale: z.number().min(0).max(2).optional().default(1.0),
  steps: z.number().int().min(4).max(50).optional().default(28),
  guidance: z.number().min(0).max(20).optional().default(3.5),
  pixelate: z.boolean().optional().default(true),
  pixelateTarget: z.number().int().min(32).max(512).optional().default(128),
  paletteColors: z.number().int().min(0).max(256).optional().default(0),
});

imageRouter.post(
  '/generate-texture',
  zValidator('json', generateTextureSchema),
  async (c) => {
    const options = c.req.valid('json');

    try {
      const result = await generateTexture(options);
      return c.json<GenerateTextureResponse>(result);
    } catch (error) {
      const rateLimitResponse = handleTooManyRequests(c, error);
      if (rateLimitResponse) return rateLimitResponse;
      logger.error('Texture generation error:', error);
      throw new BadRequestError(
        error instanceof Error ? error.message : 'Texture generation failed'
      );
    }
  }
);

export { imageRouter };
