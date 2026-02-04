/**
 * Export API Routes
 *
 * POST /api/export/save - Save a single image/asset to disk
 * POST /api/export/batch-save - Save multiple images to disk
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import sharp from 'sharp';
import path from 'path';
import { BadRequestError } from '../lib/errors';
import { logger } from '@pixel-forge/shared/logger';
import type {
  ExportToFileOptions,
  ExportToFileResponse,
  BatchExportToFileOptions,
  BatchExportToFileResponse,
} from '@pixel-forge/shared';

const exportRouter = new Hono();

// Default base directory for exports (can be overridden via env var)
const EXPORT_BASE_DIR = process.env.EXPORT_BASE_DIR || '/tmp/pixel-forge-exports';

/**
 * Validates that the resolved path is within the allowed base directory
 * Prevents directory traversal attacks
 */
function validatePath(relativePath: string): string {
  // Reject paths containing .. segments
  if (relativePath.includes('..')) {
    throw new BadRequestError('Invalid path: contains ".." segments');
  }

  // Resolve the full path
  const resolvedPath = path.resolve(EXPORT_BASE_DIR, relativePath);

  // Ensure the resolved path starts with the base directory
  if (!resolvedPath.startsWith(path.resolve(EXPORT_BASE_DIR))) {
    throw new BadRequestError('Invalid path: outside allowed directory');
  }

  return resolvedPath;
}

/**
 * Converts base64 data URL to Buffer
 */
function base64ToBuffer(dataUrl: string): Buffer {
  const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
  return Buffer.from(base64Data, 'base64');
}

const saveSchema = z.object({
  image: z.string().min(1, 'Image data is required'),
  path: z.string().min(1, 'Path is required'),
  format: z.enum(['png', 'jpeg', 'webp']).optional().default('png'),
  quality: z.number().int().min(1).max(100).optional().default(90),
});

const batchSaveSchema = z.object({
  images: z
    .array(
      z.object({
        image: z.string().min(1, 'Image data is required'),
        path: z.string().min(1, 'Path is required'),
        format: z.enum(['png', 'jpeg', 'webp']).optional().default('png'),
        quality: z.number().int().min(1).max(100).optional().default(90),
      })
    )
    .min(1)
    .max(100),
});

/**
 * POST /api/export/save
 *
 * Save a single image/asset to disk.
 *
 * Request body:
 * {
 *   image: string (base64 data URL),
 *   path: string (relative path from EXPORT_BASE_DIR),
 *   format?: 'png' | 'jpeg' | 'webp',
 *   quality?: number (1-100)
 * }
 *
 * Response:
 * {
 *   success: true,
 *   path: string (full path where file was saved),
 *   size: number (file size in bytes)
 * }
 */
exportRouter.post('/save', zValidator('json', saveSchema), async (c) => {
  const { image, path: relativePath, format, quality } = c.req.valid('json') as ExportToFileOptions;

  try {
    // Validate and resolve the path
    const fullPath = validatePath(relativePath);

    // Ensure the directory exists
    const dir = path.dirname(fullPath);
    await Bun.write(path.join(dir, '.gitkeep'), ''); // Creates directory if it doesn't exist

    // Convert base64 to buffer
    const inputBuffer = base64ToBuffer(image);

    // Convert format if needed using sharp
    let outputBuffer: Buffer;
    const sharpPipeline = sharp(inputBuffer);

    switch (format) {
      case 'png':
        outputBuffer = await sharpPipeline.png({ quality }).toBuffer();
        break;
      case 'jpeg':
        outputBuffer = await sharpPipeline.jpeg({ quality }).toBuffer();
        break;
      case 'webp':
        outputBuffer = await sharpPipeline.webp({ quality }).toBuffer();
        break;
      default:
        outputBuffer = inputBuffer;
    }

    // Write to disk
    await Bun.write(fullPath, outputBuffer);
    const size = outputBuffer.length;

    logger.info(`Saved file to: ${fullPath} (${size} bytes)`);

    return c.json<ExportToFileResponse>({
      success: true,
      path: fullPath,
      size,
    });
  } catch (error) {
    logger.error('Export save error:', error);
    throw new BadRequestError(
      error instanceof Error ? error.message : 'Failed to save file'
    );
  }
});

/**
 * POST /api/export/batch-save
 *
 * Save multiple images to disk in parallel.
 *
 * Request body:
 * {
 *   images: Array<{
 *     image: string (base64 data URL),
 *     path: string (relative path),
 *     format?: 'png' | 'jpeg' | 'webp',
 *     quality?: number
 *   }>
 * }
 *
 * Response:
 * {
 *   success: true,
 *   results: Array<{
 *     success: boolean,
 *     path?: string,
 *     size?: number,
 *     error?: string
 *   }>,
 *   successCount: number,
 *   totalCount: number
 * }
 */
exportRouter.post('/batch-save', zValidator('json', batchSaveSchema), async (c) => {
  const { images } = c.req.valid('json') as BatchExportToFileOptions;

  try {
    // Process all images in parallel
    const results = await Promise.allSettled(
      images.map(async ({ image, path: relativePath, format, quality }) => {
        try {
          // Validate and resolve the path
          const fullPath = validatePath(relativePath);

          // Ensure the directory exists
          const dir = path.dirname(fullPath);
          await Bun.write(path.join(dir, '.gitkeep'), '');

          // Convert base64 to buffer
          const inputBuffer = base64ToBuffer(image);

          // Convert format if needed
          let outputBuffer: Buffer;
          const sharpPipeline = sharp(inputBuffer);

          switch (format) {
            case 'png':
              outputBuffer = await sharpPipeline.png({ quality }).toBuffer();
              break;
            case 'jpeg':
              outputBuffer = await sharpPipeline.jpeg({ quality }).toBuffer();
              break;
            case 'webp':
              outputBuffer = await sharpPipeline.webp({ quality }).toBuffer();
              break;
            default:
              outputBuffer = inputBuffer;
          }

          // Write to disk
          await Bun.write(fullPath, outputBuffer);
          const size = outputBuffer.length;

          logger.info(`Batch saved file to: ${fullPath} (${size} bytes)`);

          return {
            success: true,
            path: fullPath,
            size,
          };
        } catch (error) {
          logger.error('Batch save item error:', error);
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to save file',
          };
        }
      })
    );

    // Map results
    const mappedResults = results.map((result) =>
      result.status === 'fulfilled' ? result.value : { success: false, error: result.reason }
    );

    const successCount = mappedResults.filter((r) => r.success).length;

    return c.json<BatchExportToFileResponse>({
      success: true,
      results: mappedResults,
      successCount,
      totalCount: images.length,
    });
  } catch (error) {
    logger.error('Batch save error:', error);
    throw new BadRequestError(
      error instanceof Error ? error.message : 'Batch save failed'
    );
  }
});

export { exportRouter };
