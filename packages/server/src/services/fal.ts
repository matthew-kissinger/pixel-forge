import * as fal from '@fal-ai/serverless-client';
import { randomBytes } from 'crypto';
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

/**
 * Generate a secure random ID
 */
function generateSecureId(): string {
  return randomBytes(16).toString('hex');
}

// Timeout constants
const FAL_3D_TIMEOUT_MS = 120000; // 120 seconds for 3D generation request
const FAL_BG_REMOVE_TIMEOUT_MS = 30000; // 30 seconds for background removal
const FAL_FETCH_TIMEOUT_MS = 30000; // 30 seconds for fetching result images

// Store for tracking 3D model generation requests
interface RequestEntry {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  modelUrl?: string;
  thumbnailUrl?: string;
  error?: string;
  createdAt: number;
}

const requestStore = new Map<string, RequestEntry>();

// TTL for request entries (1 hour)
const REQUEST_TTL_MS = 60 * 60 * 1000;

// Cleanup interval (10 minutes)
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000;

/**
 * Cleanup expired request entries to prevent memory leak
 */
function cleanupExpiredRequests(): void {
  const now = Date.now();
  let cleaned = 0;

  for (const [id, entry] of requestStore.entries()) {
    if (now - entry.createdAt > REQUEST_TTL_MS) {
      requestStore.delete(id);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    logger.debug(`[FAL] Cleaned up ${cleaned} expired request(s)`);
  }
}

// Start cleanup interval
setInterval(cleanupExpiredRequests, CLEANUP_INTERVAL_MS);

export interface GenerateModelResult {
  requestId: string;
}

export interface ModelStatusResult {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  modelUrl?: string;
  thumbnailUrl?: string;
  error?: string;
}

export interface RemoveBgResult {
  image: string; // base64 data URL
}

/**
 * Create timeout-wrapped promise
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, operation: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new ServiceUnavailableError(`${operation} timed out after ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
}

export async function generateModel(prompt: string): Promise<GenerateModelResult> {
  // Input validation
  if (!prompt || prompt.trim().length === 0) {
    throw new BadRequestError('Prompt cannot be empty');
  }
  if (prompt.length > 10000) {
    throw new BadRequestError('Prompt exceeds maximum length of 10000 characters');
  }

  ensureConfigured();
  const requestId = `meshy_${generateSecureId()}`;

  // Store initial status with timestamp
  requestStore.set(requestId, { status: 'pending', createdAt: Date.now() });

  // Start async generation
  (async () => {
    try {
      requestStore.set(requestId, { status: 'processing', progress: 0, createdAt: Date.now() });

      // Use FAL's Meshy text-to-3D model with timeout on initial request
      const result = await withTimeout(
        fal.subscribe('fal-ai/meshy/text-to-3d', {
          input: {
            prompt,
            art_style: 'low-poly', // Good for game assets
            negative_prompt: 'blurry, low quality',
          },
          logs: true,
          onQueueUpdate: (update) => {
            if (update.status === 'IN_PROGRESS') {
              const logs = update.logs || [];
              const lastLog = logs[logs.length - 1];
              if (lastLog?.message?.includes('%')) {
                const match = (lastLog.message as string).match(/(\d+)%/);
                if (match && match[1]) {
                  requestStore.set(requestId, {
                    status: 'processing',
                    progress: parseInt(match[1], 10),
                    createdAt: Date.now(),
                  });
                }
              }
            }
          },
        }) as Promise<{ model_url?: string; thumbnail_url?: string }>,
        FAL_3D_TIMEOUT_MS,
        'FAL 3D model generation'
      );

      requestStore.set(requestId, {
        status: 'completed',
        progress: 100,
        modelUrl: result.model_url,
        thumbnailUrl: result.thumbnail_url,
        createdAt: Date.now(),
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('[FAL] 3D generation failed:', errorMessage);

      // Store error in requestStore so getModelStatus can return it
      requestStore.set(requestId, {
        status: 'failed',
        error: errorMessage,
        createdAt: Date.now(),
      });
    }
  })();

  return { requestId };
}

export function getModelStatus(requestId: string): ModelStatusResult {
  const status = requestStore.get(requestId);
  if (!status) {
    return { status: 'failed', error: 'Request not found' };
  }
  return status;
}

export async function removeBackground(imageBase64: string, backgroundColor?: string): Promise<RemoveBgResult> {
  // Input validation
  if (!imageBase64 || imageBase64.trim().length === 0) {
    throw new BadRequestError('Image data cannot be empty');
  }

  // Extract base64 data without data URL prefix if present
  const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');

  // Validate base64 size (max 10MB)
  const estimatedSize = (base64Data.length * 3) / 4; // Base64 is ~4/3 larger than binary
  if (estimatedSize > 10 * 1024 * 1024) {
    throw new BadRequestError('Image size exceeds maximum of 10MB');
  }

  ensureConfigured();

  try {
    // Use BiRefNet for background removal with timeout
    const result = await withTimeout(
      fal.subscribe('fal-ai/birefnet', {
        input: {
          image_url: `data:image/png;base64,${base64Data}`,
        },
      }) as Promise<{ image?: { url?: string } }>,
      FAL_BG_REMOVE_TIMEOUT_MS,
      'FAL background removal'
    );

    if (!result.image?.url) {
      throw new ServiceUnavailableError('No image in BiRefNet response');
    }

    // Fetch the result image and convert to base64 with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FAL_FETCH_TIMEOUT_MS);

    try {
      const response = await fetch(result.image.url, { signal: controller.signal });

      if (!response.ok) {
        throw new ServiceUnavailableError(`Failed to fetch result image: ${response.statusText}`);
      }

      const buffer = await response.arrayBuffer();
      clearTimeout(timeoutId);

      // Chroma cleanup: remove residual background-colored edge pixels that BiRefNet misses
      const cleaned = await chromaCleanup(Buffer.from(buffer), backgroundColor);
      const resultBase64 = cleaned.toString('base64');

      return {
        image: `data:image/png;base64,${resultBase64}`,
      };
    } catch (fetchError) {
      clearTimeout(timeoutId);

      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        throw new ServiceUnavailableError('Timeout fetching result image from FAL');
      }

      throw fetchError;
    }
  } catch (error) {
    // Re-throw our custom errors
    if (error instanceof BadRequestError || error instanceof ServiceUnavailableError) {
      throw error;
    }

    // Handle FAL API errors
    if (error instanceof Error) {
      const message = error.message.toLowerCase();

      // Rate limit errors
      if (message.includes('quota') || message.includes('rate limit')) {
        throw new ServiceUnavailableError('FAL API rate limit exceeded');
      }

      // Authentication errors
      if (message.includes('api key') || message.includes('auth')) {
        throw new ServiceUnavailableError('FAL API authentication failed');
      }

      // Network errors
      if (message.includes('network') || message.includes('fetch') || message.includes('enotfound')) {
        throw new ServiceUnavailableError('Network error connecting to FAL API');
      }

      // Generic API error
      throw new ServiceUnavailableError(`FAL API error: ${error.message}`);
    }

    throw new ServiceUnavailableError('Unknown error occurred during background removal');
  }
}

/**
 * Remove residual background-colored pixels that BiRefNet misses at edges.
 * Works by making semi-transparent pixels fully transparent if they match
 * the expected background color channel signature.
 */
async function chromaCleanup(imageBuffer: Buffer, backgroundColor?: string): Promise<Buffer> {
  const { data, info } = await sharp(imageBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = new Uint8Array(data.buffer);
  const { width, height } = info;

  for (let i = 0; i < width * height * 4; i += 4) {
    const r = pixels[i]!;
    const g = pixels[i + 1]!;
    const b = pixels[i + 2]!;
    const a = pixels[i + 3]!;

    // Skip fully opaque or fully transparent pixels
    if (a === 255 || a === 0) continue;

    let isBackground = false;

    switch (backgroundColor) {
      case 'magenta':
        // Magenta: high R, low G, high B
        isBackground = r > 150 && g < 100 && b > 150;
        break;
      case 'red':
        // Red: high R, low G, low B
        isBackground = r > 150 && g < 80 && b < 80;
        break;
      case 'blue':
        // Blue: low R, low G, high B
        isBackground = r < 80 && g < 80 && b > 150;
        break;
      case 'green':
        // Green: low R, high G, low B
        isBackground = r < 100 && g > 180 && b < 100;
        break;
      default:
        // Auto-detect: clean magenta (most common) and red
        isBackground = (r > 150 && g < 100 && b > 150) || (r > 180 && g < 60 && b < 60);
        break;
    }

    if (isBackground) {
      pixels[i + 3] = 0; // Make transparent
    }
  }

  return sharp(Buffer.from(pixels.buffer), {
    raw: { width, height, channels: 4 },
  })
    .png()
    .toBuffer();
}
