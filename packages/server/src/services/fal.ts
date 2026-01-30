import * as fal from '@fal-ai/serverless-client';
import { randomBytes } from 'crypto';

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
    console.log(`[FAL] Cleaned up ${cleaned} expired request(s)`);
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

export async function generateModel(prompt: string): Promise<GenerateModelResult> {
  ensureConfigured();
  const requestId = `meshy_${generateSecureId()}`;

  // Store initial status with timestamp
  requestStore.set(requestId, { status: 'pending', createdAt: Date.now() });

  // Start async generation
  (async () => {
    try {
      requestStore.set(requestId, { status: 'processing', progress: 0, createdAt: Date.now() });

      // Use FAL's Meshy text-to-3D model
      const result = await fal.subscribe('fal-ai/meshy/text-to-3d', {
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
      }) as { model_url?: string; thumbnail_url?: string };

      requestStore.set(requestId, {
        status: 'completed',
        progress: 100,
        modelUrl: result.model_url,
        thumbnailUrl: result.thumbnail_url,
        createdAt: Date.now(),
      });
    } catch (error) {
      console.error('3D generation failed:', error);
      requestStore.set(requestId, {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
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

export async function removeBackground(imageBase64: string): Promise<RemoveBgResult> {
  ensureConfigured();
  // Extract base64 data without data URL prefix if present
  const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');

  // Use BiRefNet for background removal
  const result = await fal.subscribe('fal-ai/birefnet', {
    input: {
      image_url: `data:image/png;base64,${base64Data}`,
    },
  }) as { image?: { url?: string } };

  if (!result.image?.url) {
    throw new Error('No image in BiRefNet response');
  }

  // Fetch the result image and convert to base64
  const response = await fetch(result.image.url);
  const buffer = await response.arrayBuffer();
  const resultBase64 = Buffer.from(buffer).toString('base64');

  return {
    image: `data:image/png;base64,${resultBase64}`,
  };
}
