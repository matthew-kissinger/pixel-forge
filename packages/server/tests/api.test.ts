import { expect, test, describe, beforeAll, afterAll, mock } from 'bun:test';
import app from '../src/index';

// Mock the AI services to avoid real API calls in tests
mock.module('../src/services/gemini', () => ({
  generateImage: async (prompt: string) => {
    if (prompt.includes('FAIL_GEN')) {
      throw new Error('Generation failed');
    }
    return {
      image: `data:image/png;base64,mockImageDataFor_${prompt.substring(0, 10)}`,
    };
  },
  extractSpritesFromSheet: async (_buffer: Buffer, rows: number, cols: number) => {
    const count = rows * cols;
    return Array.from({ length: count }, (_, index) => Buffer.from(`sprite-${index}`));
  },
}));

mock.module('../src/services/fal', () => ({
  generateModel: async (prompt: string) => ({
    requestId: `mock_request_${Date.now()}`,
  }),
  getModelStatus: (requestId: string) => ({
    status: 'completed',
    progress: 100,
    modelUrl: 'https://example.com/model.glb',
    thumbnailUrl: 'https://example.com/thumb.png',
  }),
  removeBackground: async (image: string) => {
    if (image.includes('FAIL_BG')) {
      throw new Error('Background removal failed');
    }
    return {
      image: `data:image/png;base64,mockRemovedBg`,
    };
  },
}));

mock.module('../src/services/claude', () => ({
  generateKilnCode: async () => ({
    success: true,
    code: 'mock code',
    usage: { inputTokens: 10, outputTokens: 20 },
  }),
  streamKilnCode: async function* () {
    yield { type: 'complete', data: 'mock' };
  },
  compactCode: async () => ({ success: true, code: 'compact code' }),
  refactorCode: async () => ({ success: true, code: 'refactored code' }),
}));

const baseUrl = 'http://localhost:3000';
const samplePngBase64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADUlEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==';

describe('Health Check', () => {
  test('GET /health returns ok status', async () => {
    const res = await app.fetch(new Request(`${baseUrl}/health`));
    expect(res.status).toBe(200);

    const data = await res.json() as any;
    expect(data.status).toBe('ok');
    expect(data.timestamp).toBeDefined();
  });
});

describe('Image API', () => {
  test('POST /api/image/generate requires prompt', async () => {
    const res = await app.fetch(
      new Request(`${baseUrl}/api/image/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
    );
    expect(res.status).toBe(400);
  });

  test('POST /api/image/generate returns image data', async () => {
    const res = await app.fetch(
      new Request(`${baseUrl}/api/image/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: 'test prompt' }),
      })
    );
    expect(res.status).toBe(200);

    const data = await res.json() as any;
    expect(data.image).toBeDefined();
    expect(data.image).toStartWith('data:image/');
  });

  test('POST /api/image/remove-bg requires image', async () => {
    const res = await app.fetch(
      new Request(`${baseUrl}/api/image/remove-bg`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
    );
    expect(res.status).toBe(400);
  });

  test('POST /api/image/remove-bg returns processed image', async () => {
    const res = await app.fetch(
      new Request(`${baseUrl}/api/image/remove-bg`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: 'data:image/png;base64,testData' }),
      })
    );
    expect(res.status).toBe(200);

    const data = await res.json() as any;
    expect(data.image).toBeDefined();
  });

  test('POST /api/image/compress requires image', async () => {
    const res = await app.fetch(
      new Request(`${baseUrl}/api/image/compress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
    );
    expect(res.status).toBe(400);
  });

  test('POST /api/image/compress returns compressed image info', async () => {
    const res = await app.fetch(
      new Request(`${baseUrl}/api/image/compress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: `data:image/png;base64,${samplePngBase64}`,
          format: 'png',
          quality: 80,
        }),
      })
    );
    expect(res.status).toBe(200);

    const data = await res.json() as any;
    expect(data.image).toBeDefined();
    expect(data.originalSize).toBeDefined();
    expect(data.compressedSize).toBeDefined();
    expect(data.format).toBe('png');
  });

  test('POST /api/image/compress handles different formats and quality', async () => {
    const res = await app.fetch(
      new Request(`${baseUrl}/api/image/compress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: `data:image/png;base64,${samplePngBase64}`,
          format: 'webp',
          quality: 50,
        }),
      })
    );
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.format).toBe('webp');
    expect(data.image).toStartWith('data:image/webp');
  });

  test('POST /api/image/compress handles resizing', async () => {
    const res = await app.fetch(
      new Request(`${baseUrl}/api/image/compress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: `data:image/png;base64,${samplePngBase64}`,
          maxWidth: 100,
          maxHeight: 100,
        }),
      })
    );
    expect(res.status).toBe(200);
  });

  test('POST /api/image/compress rejects invalid formats', async () => {
    const res = await app.fetch(
      new Request(`${baseUrl}/api/image/compress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: `data:image/png;base64,${samplePngBase64}`,
          format: 'gif',
        }),
      })
    );
    expect(res.status).toBe(400);
  });

  test('POST /api/image/slice-sheet requires image, rows, cols', async () => {
    const res = await app.fetch(
      new Request(`${baseUrl}/api/image/slice-sheet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
    );
    expect(res.status).toBe(400);
  });

  test('POST /api/image/slice-sheet returns sprites array', async () => {
    const res = await app.fetch(
      new Request(`${baseUrl}/api/image/slice-sheet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: `data:image/png;base64,${samplePngBase64}`,
          rows: 2,
          cols: 2,
        }),
      })
    );
    expect(res.status).toBe(200);

    const data = await res.json() as any;
    expect(Array.isArray(data.sprites)).toBe(true);
    expect(data.sprites.length).toBe(4);
    expect(data.sprites[0]).toStartWith('data:image/');
  });

  test('POST /api/image/generate-smart requires prompt', async () => {
    const res = await app.fetch(
      new Request(`${baseUrl}/api/image/generate-smart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
    );
    expect(res.status).toBe(400);
  });

  test('POST /api/image/generate-smart returns image with background removed', async () => {
    const res = await app.fetch(
      new Request(`${baseUrl}/api/image/generate-smart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: 'smart test' }),
      })
    );
    expect(res.status).toBe(200);

    const data = await res.json() as any;
    expect(data.image).toBeDefined();
    expect(data.image).toBe('data:image/png;base64,mockRemovedBg');
  });

  test('POST /api/image/generate-smart handles background removal failure gracefully', async () => {
    const res = await app.fetch(
      new Request(`${baseUrl}/api/image/generate-smart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: 'FAIL_BG_removal' }),
      })
    );
    expect(res.status).toBe(200);

    const data = await res.json() as any;
    expect(data.image).toBeDefined();
    expect(data.image).toStartWith('data:image/png;base64,mockImageDataFor_FAIL_BG_re');
  });

  test('POST /api/image/generate-smart handles generation failure', async () => {
    const res = await app.fetch(
      new Request(`${baseUrl}/api/image/generate-smart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: 'FAIL_GEN_error' }),
      })
    );
    expect(res.status).toBe(400);
  });

  test('POST /api/image/batch-generate requires subjects', async () => {
    const res = await app.fetch(
      new Request(`${baseUrl}/api/image/batch-generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
    );
    expect(res.status).toBe(400);
  });

  test('POST /api/image/batch-generate returns images array', async () => {
    const res = await app.fetch(
      new Request(`${baseUrl}/api/image/batch-generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjects: ['sprite one', 'sprite two'],
          consistencyPhrase: 'consistent style',
        }),
      })
    );
    expect(res.status).toBe(200);

    const data = await res.json() as any;
    expect(Array.isArray(data.images)).toBe(true);
    expect(data.images.length).toBe(2);
  });

  test('POST /api/image/batch-generate handles presetId', async () => {
    const res = await app.fetch(
      new Request(`${baseUrl}/api/image/batch-generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjects: ['one'],
          presetId: 'enemy-sprite',
        }),
      })
    );
    expect(res.status).toBe(200);
  });

  test('POST /api/image/batch-generate rejects unknown presetId', async () => {
    const res = await app.fetch(
      new Request(`${baseUrl}/api/image/batch-generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjects: ['one'],
          presetId: 'unknown-preset-id',
        }),
      })
    );
    expect(res.status).toBe(400);
  });

  test('POST /api/image/batch-generate rejects empty subjects array', async () => {
    const res = await app.fetch(
      new Request(`${baseUrl}/api/image/batch-generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjects: [],
        }),
      })
    );
    expect(res.status).toBe(400);
  });

  test('POST /api/image/batch-generate handles partial failures', async () => {
    const res = await app.fetch(
      new Request(`${baseUrl}/api/image/batch-generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjects: ['success-one', 'FAIL_GEN_failure'],
        }),
      })
    );
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.images.length).toBe(1);
    expect(data.errors.length).toBe(1);
    expect(data.successCount).toBe(1);
    expect(data.totalCount).toBe(2);
  });
});

describe('Model API', () => {
  test('POST /api/model/generate requires prompt', async () => {
    const res = await app.fetch(
      new Request(`${baseUrl}/api/model/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
    );
    expect(res.status).toBe(400);
  });

  test('POST /api/model/generate returns requestId', async () => {
    const res = await app.fetch(
      new Request(`${baseUrl}/api/model/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: 'test 3d model' }),
      })
    );
    expect(res.status).toBe(200);

    const data = await res.json() as any;
    expect(data.requestId).toBeDefined();
  });

  test('GET /api/model/status/:id returns status', async () => {
    const res = await app.fetch(
      new Request(`${baseUrl}/api/model/status/test_request_123`)
    );
    expect(res.status).toBe(200);

    const data = await res.json() as any;
    expect(data.status).toBeDefined();
  });
});

describe('404 Handler', () => {
  test('Unknown routes return 404', async () => {
    const res = await app.fetch(new Request(`${baseUrl}/unknown/route`));
    expect(res.status).toBe(404);

    const data = await res.json() as any;
    expect(data.error).toBe('Not found');
  });
});

describe('Kiln API', () => {
  test('POST /api/kiln/generate requires prompt', async () => {
    const res = await app.fetch(
      new Request(`${baseUrl}/api/kiln/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
    );
    expect(res.status).toBe(400);
  });

  test('POST /api/kiln/generate returns code', async () => {
    const res = await app.fetch(
      new Request(`${baseUrl}/api/kiln/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: 'test kiln prompt' }),
      })
    );
    expect(res.status).toBe(200);

    const data = await res.json() as any;
    expect(data.success).toBe(true);
    expect(data.code).toBeDefined();
  });

  test('POST /api/kiln/compact requires code', async () => {
    const res = await app.fetch(
      new Request(`${baseUrl}/api/kiln/compact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
    );
    expect(res.status).toBe(400);
  });

  test('POST /api/kiln/compact returns compacted code', async () => {
    const res = await app.fetch(
      new Request(`${baseUrl}/api/kiln/compact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: 'bloated code' }),
      })
    );
    expect(res.status).toBe(200);

    const data = await res.json() as any;
    expect(data.success).toBe(true);
    expect(data.code).toBeDefined();
  });

  test('POST /api/kiln/refactor requires instruction', async () => {
    const res = await app.fetch(
      new Request(`${baseUrl}/api/kiln/refactor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
    );
    expect(res.status).toBe(400);
  });

  test('POST /api/kiln/refactor requires geometry or effect code', async () => {
    const res = await app.fetch(
      new Request(`${baseUrl}/api/kiln/refactor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instruction: 'add details' }),
      })
    );
    expect(res.status).toBe(400);
  });

  test('POST /api/kiln/refactor returns refactored code', async () => {
    const res = await app.fetch(
      new Request(`${baseUrl}/api/kiln/refactor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instruction: 'add details',
          geometryCode: 'const geo = {};',
        }),
      })
    );
    expect(res.status).toBe(200);

    const data = await res.json() as any;
    expect(data.success).toBe(true);
    expect(data.code).toBeDefined();
  });

  test('POST /api/kiln/stream requires prompt', async () => {
    const res = await app.fetch(
      new Request(`${baseUrl}/api/kiln/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
    );
    expect(res.status).toBe(400);
  });

  test('POST /api/kiln/stream returns SSE event stream', async () => {
    const res = await app.fetch(
      new Request(`${baseUrl}/api/kiln/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: 'test streaming prompt' }),
      })
    );

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('text/event-stream');

    // Read the SSE stream
    const text = await res.text();

    // SSE format: event: <type>\ndata: <data>\n\n
    expect(text).toContain('event: complete');
    expect(text).toContain('data: mock');
  });

  test('POST /api/kiln/stream with valid request completes successfully', async () => {
    // Test that a valid streaming request completes without errors
    const res = await app.fetch(
      new Request(`${baseUrl}/api/kiln/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: 'test streaming with options',
          mode: 'glb',
          category: 'character',
        }),
      })
    );

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('text/event-stream');

    const text = await res.text();

    // The mock yields a complete event
    expect(text).toContain('event:');
    expect(text).toContain('data:');
  });
});

describe('Export API', () => {
  const testImage = `data:image/png;base64,${samplePngBase64}`;

  test('POST /api/export/save requires image', async () => {
    const res = await app.fetch(
      new Request(`${baseUrl}/api/export/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: 'test.png' }),
      })
    );
    expect(res.status).toBe(400);
  });

  test('POST /api/export/save requires path', async () => {
    const res = await app.fetch(
      new Request(`${baseUrl}/api/export/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: testImage }),
      })
    );
    expect(res.status).toBe(400);
  });

  test('POST /api/export/save rejects path traversal with ..', async () => {
    const res = await app.fetch(
      new Request(`${baseUrl}/api/export/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: testImage,
          path: '../../../etc/passwd',
        }),
      })
    );
    expect(res.status).toBe(400);

    const data = await res.json() as any;
    expect(data.error).toContain('..');
  });

  test('POST /api/export/save saves file successfully', async () => {
    const res = await app.fetch(
      new Request(`${baseUrl}/api/export/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: testImage,
          path: 'test-output.png',
          format: 'png',
          quality: 90,
        }),
      })
    );
    expect(res.status).toBe(200);

    const data = await res.json() as any;
    expect(data.success).toBe(true);
    expect(data.path).toBeDefined();
    expect(data.size).toBeGreaterThan(0);
  });

  test('POST /api/export/save supports jpeg format', async () => {
    const res = await app.fetch(
      new Request(`${baseUrl}/api/export/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: testImage,
          path: 'test-output.jpg',
          format: 'jpeg',
          quality: 80,
        }),
      })
    );
    expect(res.status).toBe(200);

    const data = await res.json() as any;
    expect(data.success).toBe(true);
  });

  test('POST /api/export/save supports webp format', async () => {
    const res = await app.fetch(
      new Request(`${baseUrl}/api/export/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: testImage,
          path: 'test-output.webp',
          format: 'webp',
          quality: 85,
        }),
      })
    );
    expect(res.status).toBe(200);

    const data = await res.json() as any;
    expect(data.success).toBe(true);
  });

  test('POST /api/export/batch-save requires images array', async () => {
    const res = await app.fetch(
      new Request(`${baseUrl}/api/export/batch-save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
    );
    expect(res.status).toBe(400);
  });

  test('POST /api/export/batch-save rejects empty images array', async () => {
    const res = await app.fetch(
      new Request(`${baseUrl}/api/export/batch-save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: [] }),
      })
    );
    expect(res.status).toBe(400);
  });

  test('POST /api/export/batch-save saves multiple files', async () => {
    const res = await app.fetch(
      new Request(`${baseUrl}/api/export/batch-save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images: [
            { image: testImage, path: 'batch-1.png', format: 'png' },
            { image: testImage, path: 'batch-2.png', format: 'png' },
          ],
        }),
      })
    );
    expect(res.status).toBe(200);

    const data = await res.json() as any;
    expect(data.success).toBe(true);
    expect(Array.isArray(data.results)).toBe(true);
    expect(data.results.length).toBe(2);
    expect(data.successCount).toBe(2);
    expect(data.totalCount).toBe(2);
  });

  test('POST /api/export/batch-save handles partial failures', async () => {
    const res = await app.fetch(
      new Request(`${baseUrl}/api/export/batch-save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images: [
            { image: testImage, path: 'good.png', format: 'png' },
            { image: testImage, path: '../bad.png', format: 'png' }, // Path traversal
          ],
        }),
      })
    );
    expect(res.status).toBe(200);

    const data = await res.json() as any;
    expect(data.success).toBe(true);
    expect(data.results.length).toBe(2);
    expect(data.successCount).toBe(1); // Only first succeeds
    expect(data.results[0].success).toBe(true);
    expect(data.results[1].success).toBe(false);
    expect(data.results[1].error).toBeDefined();
  });
});
