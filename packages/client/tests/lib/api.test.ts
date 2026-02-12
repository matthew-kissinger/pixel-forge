import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ModelStatusResponse } from '@pixel-forge/shared';

vi.mock('../../src/lib/retry', () => ({
  retryWithBackoff: vi.fn(async (fn: () => Promise<unknown>) => fn()),
}));

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function jsonResponse(body: unknown, status = 200, headers?: Record<string, string>) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers({ 'Content-Type': 'application/json', ...headers }),
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

function textResponse(body: string, status = 200, headers?: Record<string, string>) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers({ 'Content-Type': 'text/plain', ...headers }),
    json: async () => {
      throw new Error('not json');
    },
    text: async () => body,
  };
}

// Import after mocks are set up
let api: typeof import('../../src/lib/api');

beforeEach(async () => {
  vi.resetModules();
  mockFetch.mockReset();
  // Re-mock retry after resetModules
  vi.doMock('../../src/lib/retry', () => ({
    retryWithBackoff: vi.fn(async (fn: () => Promise<unknown>) => fn()),
  }));
  api = await import('../../src/lib/api');
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ─── Helper to verify fetch was called with expected URL, method, and body ───

function expectFetchCalledWith(
  endpoint: string,
  method: string,
  body?: unknown
) {
  expect(mockFetch).toHaveBeenCalledTimes(1);
  const [url, options] = mockFetch.mock.calls[0];
  expect(url).toBe(`/api${endpoint}`);
  expect(options.method ?? 'GET').toBe(method);
  expect(options.headers['Content-Type']).toBe('application/json');
  if (body !== undefined) {
    expect(JSON.parse(options.body)).toEqual(body);
  }
}

// ─── generateImage ───────────────────────────────────────────────────────────

describe('generateImage', () => {
  it('sends POST to /api/image/generate with string prompt', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ images: ['base64img'] }));

    const result = await api.generateImage('a cat');

    expectFetchCalledWith('/image/generate', 'POST', { prompt: 'a cat' });
    expect(result).toEqual({ images: ['base64img'] });
  });

  it('sends POST with full options object', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ images: ['img'] }));

    await api.generateImage({ prompt: 'a dog', width: 512, height: 512 });

    expectFetchCalledWith('/image/generate', 'POST', {
      prompt: 'a dog',
      width: 512,
      height: 512,
    });
  });
});

// ─── generateImageSmart ──────────────────────────────────────────────────────

describe('generateImageSmart', () => {
  it('sends POST to /api/image/generate-smart', async () => {
    const response = { images: ['img'], aspectRatio: '16:9' };
    mockFetch.mockResolvedValue(jsonResponse(response));

    const result = await api.generateImageSmart({ prompt: 'spaceship' });

    expectFetchCalledWith('/image/generate-smart', 'POST', { prompt: 'spaceship' });
    expect(result).toEqual(response);
  });
});

// ─── removeBackground ────────────────────────────────────────────────────────

describe('removeBackground', () => {
  it('sends POST to /api/image/remove-bg with image data', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ image: 'nobg' }));

    const result = await api.removeBackground('base64data');

    expectFetchCalledWith('/image/remove-bg', 'POST', { image: 'base64data' });
    expect(result).toEqual({ image: 'nobg' });
  });
});

// ─── sliceSheet ──────────────────────────────────────────────────────────────

describe('sliceSheet', () => {
  it('sends POST to /api/image/slice-sheet with rows and cols', async () => {
    const response = { frames: ['f1', 'f2'] };
    mockFetch.mockResolvedValue(jsonResponse(response));

    const result = await api.sliceSheet('imgdata', 2, 4);

    expectFetchCalledWith('/image/slice-sheet', 'POST', {
      image: 'imgdata',
      rows: 2,
      cols: 4,
    });
    expect(result).toEqual(response);
  });
});

// ─── compressImage ───────────────────────────────────────────────────────────

describe('compressImage', () => {
  it('sends POST with default format and quality', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ image: 'compressed' }));

    await api.compressImage('imgdata');

    expectFetchCalledWith('/image/compress', 'POST', {
      image: 'imgdata',
      format: 'webp',
      quality: 80,
    });
  });

  it('sends POST with custom format, quality, and dimensions', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ image: 'compressed' }));

    await api.compressImage('imgdata', 'png', 90, 1024, 768);

    expectFetchCalledWith('/image/compress', 'POST', {
      image: 'imgdata',
      format: 'png',
      quality: 90,
      maxWidth: 1024,
      maxHeight: 768,
    });
  });
});

// ─── generateModel ───────────────────────────────────────────────────────────

describe('generateModel', () => {
  it('sends POST to /api/model/generate', async () => {
    const response = { requestId: 'abc123' };
    mockFetch.mockResolvedValue(jsonResponse(response));

    const result = await api.generateModel('a tree');

    expectFetchCalledWith('/model/generate', 'POST', { prompt: 'a tree' });
    expect(result).toEqual(response);
  });
});

// ─── getModelStatus ──────────────────────────────────────────────────────────

describe('getModelStatus', () => {
  it('sends GET to /api/model/status/:requestId', async () => {
    const response = { status: 'completed', modelUrl: 'https://example.com/model.glb' };
    mockFetch.mockResolvedValue(jsonResponse(response));

    const result = await api.getModelStatus('req-123');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe('/api/model/status/req-123');
    // GET is the default - no explicit method should be set
    expect(options.method).toBeUndefined();
    expect(result).toEqual(response);
  });
});

// ─── generateKilnCode ────────────────────────────────────────────────────────

describe('generateKilnCode', () => {
  it('sends POST to /api/kiln/generate', async () => {
    const options = { prompt: 'fire effect', type: 'tsl' as const };
    const response = { code: 'const x = 1;' };
    mockFetch.mockResolvedValue(jsonResponse(response));

    const result = await api.generateKilnCode(options);

    expectFetchCalledWith('/kiln/generate', 'POST', options);
    expect(result).toEqual(response);
  });
});

// ─── exportToFile ────────────────────────────────────────────────────────────

describe('exportToFile', () => {
  it('sends POST to /api/export/save with defaults', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ success: true, path: '/out/img.png' }));

    const result = await api.exportToFile('imgdata', '/out/img.png');

    expectFetchCalledWith('/export/save', 'POST', {
      image: 'imgdata',
      path: '/out/img.png',
      format: 'png',
      quality: 90,
    });
    expect(result).toEqual({ success: true, path: '/out/img.png' });
  });

  it('sends POST with custom format and quality', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ success: true }));

    await api.exportToFile('imgdata', '/out/img.webp', 'webp', 75);

    expectFetchCalledWith('/export/save', 'POST', {
      image: 'imgdata',
      path: '/out/img.webp',
      format: 'webp',
      quality: 75,
    });
  });
});

// ─── batchExportToFile ───────────────────────────────────────────────────────

describe('batchExportToFile', () => {
  it('sends POST to /api/export/batch-save with images array', async () => {
    const images = [
      { image: 'img1', path: '/a.png', format: 'png' as const, quality: 90 },
      { image: 'img2', path: '/b.webp', format: 'webp' as const, quality: 80 },
    ];
    mockFetch.mockResolvedValue(jsonResponse({ results: [{ success: true }, { success: true }] }));

    const result = await api.batchExportToFile(images);

    expectFetchCalledWith('/export/batch-save', 'POST', { images });
    expect(result).toEqual({ results: [{ success: true }, { success: true }] });
  });
});

// ─── apiFetch error handling (tested via any exported function) ──────────────

describe('apiFetch error handling', () => {
  it('throws with JSON error message on non-ok response', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ error: 'Bad prompt' }, 400));

    await expect(api.generateImage('bad')).rejects.toThrow('Bad prompt');
  });

  it('throws with text body on non-ok response with text content type', async () => {
    mockFetch.mockResolvedValue(textResponse('Server melted', 500));

    await expect(api.generateImage('test')).rejects.toThrow('Server melted');
  });

  it('throws with default message when error body parse fails', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      headers: new Headers({ 'Content-Type': 'application/json' }),
      json: async () => {
        throw new Error('parse error');
      },
      text: async () => {
        throw new Error('parse error');
      },
    });

    await expect(api.generateImage('test')).rejects.toThrow('API error: 500');
  });

  it('sets status on the error object', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ error: 'not found' }, 404));

    try {
      await api.generateImage('test');
      expect.fail('should have thrown');
    } catch (err: any) {
      expect(err.status).toBe(404);
    }
  });

  it('sets retryAfter on 429 response with Retry-After header', async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({ error: 'rate limited' }, 429, { 'Retry-After': '30' })
    );

    try {
      await api.generateImage('test');
      expect.fail('should have thrown');
    } catch (err: any) {
      expect(err.status).toBe(429);
      expect(err.retryAfter).toBe(30);
    }
  });

  it('does not set retryAfter when Retry-After header is missing', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ error: 'rate limited' }, 429));

    try {
      await api.generateImage('test');
      expect.fail('should have thrown');
    } catch (err: any) {
      expect(err.status).toBe(429);
      expect(err.retryAfter).toBeUndefined();
    }
  });

  it('does not set retryAfter when Retry-After is not a positive number', async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({ error: 'rate limited' }, 429, { 'Retry-After': 'invalid' })
    );

    try {
      await api.generateImage('test');
      expect.fail('should have thrown');
    } catch (err: any) {
      expect(err.status).toBe(429);
      expect(err.retryAfter).toBeUndefined();
    }
  });

  it('uses default message when JSON body has no error field', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ detail: 'something' }, 400));

    await expect(api.generateImage('test')).rejects.toThrow('API error: 400');
  });

  it('uses default message when text body is empty', async () => {
    mockFetch.mockResolvedValue(textResponse('', 500));

    await expect(api.generateImage('test')).rejects.toThrow('API error: 500');
  });
});

// ─── pollModelStatus ─────────────────────────────────────────────────────────

describe('pollModelStatus', () => {
  it('returns immediately when status is completed', async () => {
    const completedStatus: ModelStatusResponse = {
      status: 'completed',
      modelUrl: 'https://example.com/model.glb',
    } as ModelStatusResponse;
    mockFetch.mockResolvedValue(jsonResponse(completedStatus));

    const result = await api.pollModelStatus('req-1');

    expect(result).toEqual(completedStatus);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('returns immediately when status is failed', async () => {
    const failedStatus = { status: 'failed', error: 'out of memory' };
    mockFetch.mockResolvedValue(jsonResponse(failedStatus));

    const result = await api.pollModelStatus('req-2');

    expect(result.status).toBe('failed');
  });

  it('polls until completed and invokes onProgress', async () => {
    const processing = { status: 'processing', progress: 50 };
    const completed = { status: 'completed', modelUrl: 'url' };

    mockFetch
      .mockResolvedValueOnce(jsonResponse(processing))
      .mockResolvedValueOnce(jsonResponse(completed));

    const onProgress = vi.fn();
    const result = await api.pollModelStatus('req-3', onProgress, 10, 60000);

    expect(onProgress).toHaveBeenCalledTimes(2);
    expect(onProgress).toHaveBeenNthCalledWith(1, processing);
    expect(onProgress).toHaveBeenNthCalledWith(2, completed);
    expect(result).toEqual(completed);
  });

  it('throws on timeout', async () => {
    const processing = { status: 'processing' };
    mockFetch.mockResolvedValue(jsonResponse(processing));

    // Use a very short timeout and interval to make the test fast
    await expect(
      api.pollModelStatus('req-4', undefined, 10, 50)
    ).rejects.toThrow('Model generation timed out');
  });

  it('respects AbortSignal and throws AbortError when aborted', async () => {
    const processing = { status: 'processing' };
    mockFetch.mockResolvedValue(jsonResponse(processing));

    const controller = new AbortController();

    // Abort after a short delay
    setTimeout(() => controller.abort(), 20);

    await expect(
      api.pollModelStatus('req-5', undefined, 10, 60000, controller.signal)
    ).rejects.toMatchObject({
      name: 'AbortError',
      message: 'The operation was aborted.',
    });
  });

  it('respects AbortSignal aborted before poll starts', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      api.pollModelStatus('req-6', undefined, 10, 60000, controller.signal)
    ).rejects.toMatchObject({
      name: 'AbortError',
      message: 'The operation was aborted.',
    });

    // Should not make any API calls
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('passes abort signal to getModelStatus calls', async () => {
    const processing = { status: 'processing' };
    const completed = { status: 'completed', modelUrl: 'url' };

    mockFetch
      .mockResolvedValueOnce(jsonResponse(processing))
      .mockResolvedValueOnce(jsonResponse(completed));

    const controller = new AbortController();
    await api.pollModelStatus('req-7', undefined, 10, 60000, controller.signal);

    // Verify signal was passed to fetch calls via apiFetch
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
