import { retryWithBackoff } from './retry';
import type {
  GenerateImageOptions,
  GenerateImageResponse,
  SmartGenerateResponse,
  GenerateModelResponse,
  ModelStatusResponse,
  RemoveBgResponse,
  SliceSheetResponse,
  CompressImageResponse,
  GenerateKilnCodeOptions,
  GenerateKilnCodeResponse,
  ExportToFileOptions,
  ExportToFileResponse,
  BatchExportToFileResponse,
} from '@pixel-forge/shared';

const API_BASE = '/api';

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

export async function getModelStatus(
  requestId: string,
  signal?: AbortSignal
): Promise<ModelStatusResponse> {
  return apiFetch<ModelStatusResponse>(`/model/status/${requestId}`, { signal });
}

// Helper to poll for model completion
export async function pollModelStatus(
  requestId: string,
  onProgress?: (status: ModelStatusResponse) => void,
  intervalMs = 5000,
  timeoutMs = 300000, // 5 minutes max
  signal?: AbortSignal
): Promise<ModelStatusResponse> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    // Check abort before polling
    if (signal?.aborted) {
      const error = new Error('The operation was aborted.');
      error.name = 'AbortError';
      throw error;
    }

    const status = await getModelStatus(requestId, signal);
    onProgress?.(status);

    if (status.status === 'completed' || status.status === 'failed') {
      return status;
    }

    // Check abort before sleeping
    if (signal?.aborted) {
      const error = new Error('The operation was aborted.');
      error.name = 'AbortError';
      throw error;
    }

    // Sleep with abort support
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(resolve, intervalMs);

      const onAbort = () => {
        clearTimeout(timeout);
        signal?.removeEventListener('abort', onAbort);
        const error = new Error('The operation was aborted.');
        error.name = 'AbortError';
        reject(error);
      };

      if (signal) {
        signal.addEventListener('abort', onAbort, { once: true });
      }
    });
  }

  throw new Error('Model generation timed out');
}

export async function generateKilnCode(
  options: GenerateKilnCodeOptions
): Promise<GenerateKilnCodeResponse> {
  return apiFetch<GenerateKilnCodeResponse>('/kiln/generate', {
    method: 'POST',
    body: JSON.stringify(options),
  });
}

export async function exportToFile(
  image: string,
  path: string,
  format: 'png' | 'jpeg' | 'webp' = 'png',
  quality = 90
): Promise<ExportToFileResponse> {
  return apiFetch<ExportToFileResponse>('/export/save', {
    method: 'POST',
    body: JSON.stringify({ image, path, format, quality }),
  });
}

export async function batchExportToFile(
  images: ExportToFileOptions[]
): Promise<BatchExportToFileResponse> {
  return apiFetch<BatchExportToFileResponse>('/export/batch-save', {
    method: 'POST',
    body: JSON.stringify({ images }),
  });
}
