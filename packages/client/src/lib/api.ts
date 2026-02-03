import { retryWithBackoff } from './retry';

const API_BASE = '/api';

export type ArtStyle = 'pixel-art' | 'painted' | 'vector' | 'anime' | 'realistic' | 'isometric';
export type AspectRatio = '21:9' | '16:9' | '3:2' | '4:3' | '5:4' | '1:1' | '4:5' | '3:4' | '2:3' | '9:16';

export interface GenerateImageOptions {
  prompt: string;
  style?: ArtStyle;
  aspectRatio?: AspectRatio;
  removeBackground?: boolean;
  presetId?: string;
}

export interface GenerateImageResponse {
  image: string; // base64 data URL
}

export interface SmartGenerateResponse {
  image: string; // base64 data URL
  selectedAspectRatio?: AspectRatio;
  metadata?: {
    category?: string;
    estimatedSize?: string;
  };
}

export interface GenerateModelResponse {
  requestId: string;
}

export interface ModelStatusResponse {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  modelUrl?: string;
  thumbnailUrl?: string;
  error?: string;
}

export interface RemoveBgResponse {
  image: string; // base64 data URL
}

export interface SliceSheetResponse {
  sprites: string[]; // base64 data URLs
}

export interface CompressImageResponse {
  image: string; // base64 data URL
  originalSize: number;
  compressedSize: number;
  format: 'png' | 'webp' | 'jpeg';
}

async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  return retryWithBackoff(
    async () => {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });

      if (!response.ok) {
        const contentType = response.headers.get('Content-Type') ?? '';
        let message = `API error: ${response.status}`;

        try {
          if (contentType.includes('application/json')) {
            const errorBody = (await response.json()) as { error?: string };
            message = errorBody.error ?? message;
          } else {
            const errorText = await response.text();
            if (errorText) message = errorText;
          }
        } catch {
          // Keep default message
        }

        const error = new Error(message) as Error & {
          status?: number;
          retryAfter?: number;
        };
        error.status = response.status;

        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After');
          const retryAfterSeconds = retryAfter ? Number.parseInt(retryAfter, 10) : NaN;
          if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
            error.retryAfter = retryAfterSeconds;
          }
        }

        throw error;
      }

      return response.json();
    },
    { signal: options?.signal ?? undefined }
  );
}

export async function generateImage(
  promptOrOptions: string | GenerateImageOptions
): Promise<GenerateImageResponse> {
  const options =
    typeof promptOrOptions === 'string'
      ? { prompt: promptOrOptions }
      : promptOrOptions;

  return apiFetch<GenerateImageResponse>('/image/generate', {
    method: 'POST',
    body: JSON.stringify(options),
  });
}

/**
 * Smart generation with automatic aspect ratio selection
 * Uses a 3-step pipeline: aspect ratio selection -> generation -> optional analysis
 */
export async function generateImageSmart(
  options: GenerateImageOptions
): Promise<SmartGenerateResponse> {
  return apiFetch<SmartGenerateResponse>('/image/generate-smart', {
    method: 'POST',
    body: JSON.stringify(options),
  });
}

export async function removeBackground(imageBase64: string): Promise<RemoveBgResponse> {
  return apiFetch<RemoveBgResponse>('/image/remove-bg', {
    method: 'POST',
    body: JSON.stringify({ image: imageBase64 }),
  });
}

export async function sliceSheet(
  imageBase64: string,
  rows: number,
  cols: number
): Promise<SliceSheetResponse> {
  return apiFetch<SliceSheetResponse>('/image/slice-sheet', {
    method: 'POST',
    body: JSON.stringify({ image: imageBase64, rows, cols }),
  });
}

export async function compressImage(
  image: string,
  format: 'png' | 'webp' | 'jpeg' = 'webp',
  quality = 80,
  maxWidth?: number,
  maxHeight?: number
): Promise<CompressImageResponse> {
  return apiFetch<CompressImageResponse>('/image/compress', {
    method: 'POST',
    body: JSON.stringify({ image, format, quality, maxWidth, maxHeight }),
  });
}

export async function generateModel(prompt: string): Promise<GenerateModelResponse> {
  return apiFetch<GenerateModelResponse>('/model/generate', {
    method: 'POST',
    body: JSON.stringify({ prompt }),
  });
}

export async function getModelStatus(requestId: string): Promise<ModelStatusResponse> {
  return apiFetch<ModelStatusResponse>(`/model/status/${requestId}`);
}

// Helper to poll for model completion
export async function pollModelStatus(
  requestId: string,
  onProgress?: (status: ModelStatusResponse) => void,
  intervalMs = 5000,
  timeoutMs = 300000 // 5 minutes max
): Promise<ModelStatusResponse> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const status = await getModelStatus(requestId);
    onProgress?.(status);

    if (status.status === 'completed' || status.status === 'failed') {
      return status;
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error('Model generation timed out');
}
