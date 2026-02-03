import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import sharp from 'sharp';
import { buildPresetPrompt, getPresetById } from '@pixel-forge/shared/presets';
import { generateImage, extractSpritesFromSheet } from '../services/gemini';
import { removeBackground } from '../services/fal';
import { BadRequestError } from '../lib/errors';

const imageRouter = new Hono();

// Art styles supported
const artStyles = [
  'pixel-art',
  'painted',
  'vector',
  'anime',
  'realistic',
  'isometric',
] as const;

// Aspect ratios supported
const aspectRatios = [
  '21:9',
  '16:9',
  '3:2',
  '4:3',
  '5:4',
  '1:1',
  '4:5',
  '3:4',
  '2:3',
  '9:16',
] as const;

const generateSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required').max(2000),
  style: z.enum(artStyles).optional(),
  aspectRatio: z.enum(aspectRatios).optional(),
  removeBackground: z.boolean().optional(),
  presetId: z.string().optional(),
});

const removeBgSchema = z.object({
  image: z.string().min(1, 'Image data is required'),
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
    const { prompt, removeBackground: shouldRemoveBg, presetId } = c.req.valid('json');

    try {
      const preset = presetId ? getPresetById(presetId) : undefined;

      if (presetId && !preset) {
        throw new BadRequestError(`Unknown preset: ${presetId}`);
      }

      const finalPrompt = preset ? buildPresetPrompt(preset, prompt) : prompt;

      // Generate the image with the prompt (style is already in the prompt from client)
      const result = await generateImage(finalPrompt);

      // Optionally remove background
      const shouldRemoveBgFinal = shouldRemoveBg ?? preset?.autoRemoveBg ?? false;
      if (shouldRemoveBgFinal && result.image) {
        try {
          const bgResult = await removeBackground(result.image);
          return c.json({ image: bgResult.image });
        } catch (bgError) {
          console.warn('Background removal failed, returning original:', bgError);
          return c.json(result);
        }
      }

      return c.json(result);
    } catch (error) {
      console.error('Image generation error:', error);
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
    const { image } = c.req.valid('json');

    try {
      const result = await removeBackground(image);
      return c.json(result);
    } catch (error) {
      console.error('Background removal error:', error);
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

      return c.json({
        image: `data:image/${format};base64,${base64Output}`,
        originalSize,
        compressedSize,
        format,
      });
    } catch (error) {
      console.error('Compress error:', error);
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

      return c.json({ sprites: spriteDataUrls });
    } catch (error) {
      console.error('Slice sheet error:', error);
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
        const bgResult = await removeBackground(result.image);
        finalImage = bgResult.image;
      } catch (bgError) {
        console.warn('Background removal failed, using original:', bgError);
      }

      return c.json({
        image: finalImage,
      });
    } catch (error) {
      console.error('Smart generation error:', error);
      throw new BadRequestError(
        error instanceof Error ? error.message : 'Smart generation failed'
      );
    }
  }
);

imageRouter.post(
  '/batch-generate',
  zValidator('json', batchGenerateSchema),
  async (c) => {
    const { subjects, presetId, consistencyPhrase, seed } = c.req.valid('json');

    try {
      const preset = presetId ? getPresetById(presetId) : undefined;

      if (presetId && !preset) {
        throw new BadRequestError(`Unknown preset: ${presetId}`);
      }

      const images: string[] = [];
      const errors: string[] = [];

      // Generate each subject with consistent settings
      for (let i = 0; i < subjects.length; i++) {
        const subject = subjects[i];

        try {
          // Build prompt with consistency
          let prompt = subject;

          if (consistencyPhrase) {
            prompt = `${consistencyPhrase}. ${prompt}`;
          }

          const finalPrompt = preset ? buildPresetPrompt(preset, prompt) : prompt;

          // Add seed variation if provided (seed + index for variation)
          // Note: Gemini doesn't directly support seeds, but we can add it to metadata
          // For now, we'll generate without seed support and rely on consistency phrase

          const result = await generateImage(finalPrompt);

          // Apply background removal if needed
          const shouldRemoveBg = preset?.autoRemoveBg ?? false;
          if (shouldRemoveBg && result.image) {
            try {
              const bgResult = await removeBackground(result.image);
              images.push(bgResult.image);
            } catch (bgError) {
              console.warn(`Background removal failed for subject ${i + 1}:`, bgError);
              images.push(result.image);
            }
          } else {
            images.push(result.image);
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Generation failed';
          console.error(`Failed to generate subject ${i + 1} (${subject}):`, errorMsg);
          errors.push(`Subject ${i + 1}: ${errorMsg}`);
          // Continue with remaining subjects
        }
      }

      if (images.length === 0) {
        throw new BadRequestError('All batch generations failed');
      }

      return c.json({
        images,
        errors: errors.length > 0 ? errors : undefined,
        successCount: images.length,
        totalCount: subjects.length,
      });
    } catch (error) {
      console.error('Batch generation error:', error);
      throw new BadRequestError(
        error instanceof Error ? error.message : 'Batch generation failed'
      );
    }
  }
);

export { imageRouter };
