import { randomBytes } from 'crypto';

import { isPixelForgeError, providers } from '@pixel-forge/core';
import { logger } from '@pixel-forge/shared/logger';

import { BadRequestError, ServiceUnavailableError } from '../lib/errors';

function generateSecureId(): string {
  return randomBytes(16).toString('hex');
}

const REQUEST_TTL_MS = 60 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000;
const FAL_3D_TIMEOUT_MS = 120_000;

interface RequestEntry {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  modelUrl?: string;
  thumbnailUrl?: string;
  error?: string;
  createdAt: number;
}

const requestStore = new Map<string, RequestEntry>();

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
  image: string;
}

export async function generateModel(prompt: string): Promise<GenerateModelResult> {
  if (!prompt || prompt.trim().length === 0) {
    throw new BadRequestError('Prompt cannot be empty');
  }
  if (prompt.length > 10_000) {
    throw new BadRequestError('Prompt exceeds maximum length of 10000 characters');
  }

  const provider = providers.createFalTextTo3dProvider(undefined, {
    timeoutMs: FAL_3D_TIMEOUT_MS,
  });
  const requestId = `meshy_${generateSecureId()}`;
  requestStore.set(requestId, { status: 'pending', createdAt: Date.now() });

  void (async () => {
    try {
      requestStore.set(requestId, {
        status: 'processing',
        progress: 0,
        createdAt: Date.now(),
      });

      const result = await provider.generate(
        {
          prompt,
          artStyle: 'low-poly',
          negativePrompt: 'blurry, low quality',
        },
        {
          onQueueUpdate: (update) => {
            if (update.progress === undefined) return;
            requestStore.set(requestId, {
              status: 'processing',
              progress: update.progress,
              createdAt: Date.now(),
            });
          },
        },
      );

      requestStore.set(requestId, {
        status: 'completed',
        progress: 100,
        modelUrl: result.modelUrl,
        thumbnailUrl: result.thumbnailUrl,
        createdAt: Date.now(),
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('[FAL] 3D generation failed:', errorMessage);
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

export async function removeBackground(
  imageBase64: string,
  backgroundColor?: string,
): Promise<RemoveBgResult> {
  if (!imageBase64 || imageBase64.trim().length === 0) {
    throw new BadRequestError('Image data cannot be empty');
  }

  const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
  const estimatedSize = (base64Data.length * 3) / 4;
  if (estimatedSize > 10 * 1024 * 1024) {
    throw new BadRequestError('Image size exceeds maximum of 10MB');
  }

  try {
    const provider = providers.createFalBgRemovalProvider();
    const result = await provider.remove({
      image: Buffer.from(base64Data, 'base64'),
      backgroundColor: normalizeBackgroundColor(backgroundColor),
    });
    return {
      image: `data:image/png;base64,${result.image.toString('base64')}`,
    };
  } catch (error) {
    if (error instanceof BadRequestError || error instanceof ServiceUnavailableError) {
      throw error;
    }

    if (isPixelForgeError(error)) {
      if (error.code === 'PROVIDER_AUTH_FAILED') {
        throw new ServiceUnavailableError('FAL API authentication failed');
      }
      if (error.code === 'PROVIDER_RATE_LIMITED') {
        throw new ServiceUnavailableError('FAL API rate limit exceeded');
      }
      if (error.code === 'PROVIDER_TIMEOUT') {
        throw new ServiceUnavailableError(error.message);
      }
      throw new ServiceUnavailableError(`FAL API error: ${error.message}`);
    }

    throw new ServiceUnavailableError(
      error instanceof Error
        ? `FAL API error: ${error.message}`
        : 'Unknown error occurred during background removal',
    );
  }
}

function normalizeBackgroundColor(
  backgroundColor: string | undefined,
): 'red' | 'green' | 'blue' | 'magenta' | undefined {
  if (
    backgroundColor === 'red' ||
    backgroundColor === 'green' ||
    backgroundColor === 'blue' ||
    backgroundColor === 'magenta'
  ) {
    return backgroundColor;
  }
  return undefined;
}
